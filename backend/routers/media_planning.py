"""
Media Planning, Insertion Orders, and Line Items endpoints
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from models import (
    InsertionOrder, IOCreate, LineItem, LineItemCreate,
    MediaPlanRequest, MediaPlanForecast, PerformanceProjection,
    INDUSTRY_BENCHMARKS
)
from routers.shared import db

router = APIRouter(tags=["Media Planning"])


# ==================== INDUSTRY BENCHMARKS DATA ====================

INVENTORY_ESTIMATES = {
    "open_exchange": {"daily_impressions": 50000000000, "avg_cpm": 2.50},
    "pmp": {"daily_impressions": 5000000000, "avg_cpm": 8.00},
    "pg": {"daily_impressions": 1000000000, "avg_cpm": 15.00},
    "youtube": {"daily_impressions": 10000000000, "avg_cpm": 12.00},
    "gdn": {"daily_impressions": 30000000000, "avg_cpm": 3.00},
    "ctv": {"daily_impressions": 2000000000, "avg_cpm": 25.00},
    "audio": {"daily_impressions": 1500000000, "avg_cpm": 10.00},
}

GEO_POPULATION = {
    "USA": 330000000, "GBR": 67000000, "CAN": 38000000, "AUS": 26000000,
    "DEU": 83000000, "FRA": 67000000, "JPN": 125000000, "BRA": 214000000,
    "IND": 1400000000, "CHN": 1400000000, "MEX": 130000000, "ESP": 47000000,
}


# ==================== MEDIA PLANNER ====================

@router.post("/media-planner/forecast", response_model=MediaPlanForecast)
async def generate_media_plan_forecast(request: MediaPlanRequest):
    """Generate media plan forecast based on targeting and budget"""
    
    # Calculate base inventory
    total_daily_inventory = 0
    weighted_cpm = 0
    
    for source in request.inventory_sources:
        if source in INVENTORY_ESTIMATES:
            inv = INVENTORY_ESTIMATES[source]
            total_daily_inventory += inv["daily_impressions"]
            weighted_cpm += inv["avg_cpm"]
    
    if request.inventory_sources:
        weighted_cpm /= len(request.inventory_sources)
    else:
        weighted_cpm = 2.50
    
    # Apply targeting filters (reduce available inventory)
    targeting_multiplier = 1.0
    audience_size = 0
    
    if request.targeting:
        # Geo targeting reduces inventory
        geo = request.targeting.get("geo", {})
        countries = geo.get("countries", [])
        if countries:
            country_pop = sum(GEO_POPULATION.get(c, 10000000) for c in countries)
            world_pop = 8000000000
            targeting_multiplier *= min(country_pop / world_pop * 5, 1.0)  # Boost for targeting
            audience_size = int(country_pop * 0.6)  # 60% internet penetration estimate
        
        # Device targeting
        devices = request.targeting.get("device", {}).get("device_types", [])
        if devices:
            targeting_multiplier *= 0.4 + (len(devices) * 0.15)
        
        # Demographics further refine
        demographics = request.targeting.get("demographics", {})
        if demographics.get("age_ranges"):
            targeting_multiplier *= 0.3 + (len(demographics["age_ranges"]) * 0.1)
        if demographics.get("genders"):
            targeting_multiplier *= 0.5 if len(demographics["genders"]) == 1 else 1.0
    
    # Calculate available inventory
    available_daily = int(total_daily_inventory * targeting_multiplier / 1000)  # Realistic share
    available_total = available_daily * request.duration_days
    
    # Calculate what budget can buy
    estimated_cpm = weighted_cpm * (1.0 + (targeting_multiplier * 0.2))  # More targeted = more expensive
    impressions_affordable = int((request.budget / estimated_cpm) * 1000)
    estimated_impressions = min(impressions_affordable, available_total)
    
    # Get benchmarks for creative type
    creative_type = request.creative_types[0] if request.creative_types else "display"
    benchmarks = INDUSTRY_BENCHMARKS.get(creative_type, INDUSTRY_BENCHMARKS["display"])
    
    # Calculate metrics
    estimated_ctr = benchmarks["ctr"] / 100
    estimated_cvr = benchmarks["cvr"] / 100
    estimated_clicks = int(estimated_impressions * estimated_ctr)
    estimated_conversions = int(estimated_clicks * estimated_cvr)
    
    # Calculate costs
    estimated_cpc = (request.budget / estimated_clicks) if estimated_clicks > 0 else 0
    estimated_cpa = (request.budget / estimated_conversions) if estimated_conversions > 0 else 0
    
    # Reach estimation (unique users)
    avg_frequency = 3.5
    estimated_reach = int(estimated_impressions / avg_frequency)
    
    # Confidence based on data availability
    confidence = 70.0
    if request.budget > 10000:
        confidence += 10
    if request.duration_days > 14:
        confidence += 10
    if len(request.inventory_sources) > 1:
        confidence += 5
    confidence = min(confidence, 95.0)
    
    # Budget recommendations
    optimal_daily = (estimated_impressions / request.duration_days) * estimated_cpm / 1000
    
    return MediaPlanForecast(
        estimated_impressions=estimated_impressions,
        estimated_reach=estimated_reach,
        estimated_clicks=estimated_clicks,
        estimated_conversions=estimated_conversions,
        estimated_cpm=round(estimated_cpm, 2),
        estimated_cpc=round(estimated_cpc, 2),
        estimated_cpa=round(estimated_cpa, 2),
        estimated_ctr=round(estimated_ctr * 100, 2),
        estimated_cvr=round(estimated_cvr * 100, 2),
        confidence_level=round(confidence, 1),
        recommended_daily_budget=round(optimal_daily, 2),
        recommended_total_budget=round(optimal_daily * request.duration_days, 2),
        available_inventory=available_total,
        inventory_match_rate=round((estimated_impressions / max(available_total, 1)) * 100, 1),
        total_addressable_audience=audience_size or 50000000,
        estimated_frequency=round(avg_frequency, 1)
    )


@router.get("/media-planner/benchmarks")
async def get_industry_benchmarks():
    """Get industry benchmarks for different ad formats"""
    return {
        "benchmarks": INDUSTRY_BENCHMARKS,
        "inventory_estimates": INVENTORY_ESTIMATES
    }


@router.post("/media-planner/projections")
async def get_performance_projections(
    budget: float,
    duration_days: int = 30,
    creative_type: str = "display",
    goal: str = "brand_awareness"
):
    """Get performance projections with ranges based on industry benchmarks"""
    
    benchmarks = INDUSTRY_BENCHMARKS.get(creative_type, INDUSTRY_BENCHMARKS["display"])
    
    # Calculate ranges
    cpm_low, cpm_high = benchmarks.get("cpm_range", [2.0, 5.0])
    cpc_low, cpc_high = benchmarks.get("cpc_range", [0.50, 2.00])
    
    avg_cpm = (cpm_low + cpm_high) / 2
    impressions_low = int((budget / cpm_high) * 1000)
    impressions_high = int((budget / cpm_low) * 1000)
    impressions_expected = int((budget / avg_cpm) * 1000)
    
    ctr = benchmarks.get("ctr", 0.35) / 100
    cvr = benchmarks.get("cvr", 0.77) / 100
    
    clicks_low = int(impressions_low * ctr * 0.8)
    clicks_high = int(impressions_high * ctr * 1.2)
    clicks_expected = int(impressions_expected * ctr)
    
    conversions_low = int(clicks_low * cvr * 0.7)
    conversions_high = int(clicks_high * cvr * 1.3)
    conversions_expected = int(clicks_expected * cvr)
    
    # CPA calculation
    cpa_low = budget / max(conversions_high, 1)
    cpa_high = budget / max(conversions_low, 1)
    
    return PerformanceProjection(
        min_impressions=impressions_low,
        max_impressions=impressions_high,
        expected_impressions=impressions_expected,
        min_clicks=clicks_low,
        max_clicks=clicks_high,
        expected_clicks=clicks_expected,
        min_conversions=conversions_low,
        max_conversions=conversions_high,
        expected_conversions=conversions_expected,
        expected_cpm_range=[cpm_low, cpm_high],
        expected_cpc_range=[cpc_low, cpc_high],
        expected_cpa_range=[round(cpa_low, 2), round(cpa_high, 2)],
        industry_avg_ctr=benchmarks.get("ctr", 0.35),
        industry_avg_cvr=benchmarks.get("cvr", 0.77),
        industry_avg_cpm=avg_cpm
    )


@router.post("/media-planner/recommend-strategy")
async def recommend_campaign_strategy(
    goal: str,
    budget: float,
    duration_days: int = 30,
    creative_types: List[str] = None
):
    """Recommend bidding strategy, frequency caps, and pacing based on goal"""
    
    creative_types = creative_types or ["display"]
    
    strategies = {
        "brand_awareness": {
            "bidding_strategy": "manual_cpm",
            "recommended_bid_type": "CPM",
            "frequency_cap": 5,
            "frequency_period": "day",
            "pacing": "even",
            "priority_inventory": ["youtube", "ctv", "pmp"],
            "recommended_viewability": 70,
            "notes": "Focus on reach and viewability for brand awareness campaigns"
        },
        "reach": {
            "bidding_strategy": "maximize_impressions",
            "recommended_bid_type": "CPM",
            "frequency_cap": 3,
            "frequency_period": "day",
            "pacing": "even",
            "priority_inventory": ["open_exchange", "gdn"],
            "recommended_viewability": 50,
            "notes": "Optimize for unique reach with controlled frequency"
        },
        "traffic": {
            "bidding_strategy": "maximize_clicks",
            "recommended_bid_type": "CPC",
            "frequency_cap": 7,
            "frequency_period": "day",
            "pacing": "even",
            "priority_inventory": ["open_exchange", "gdn", "native"],
            "notes": "Focus on click-through rate and landing page optimization"
        },
        "conversions": {
            "bidding_strategy": "target_cpa",
            "recommended_bid_type": "CPA",
            "frequency_cap": 10,
            "frequency_period": "day",
            "pacing": "accelerated",
            "priority_inventory": ["pmp", "pg"],
            "notes": "Use conversion optimization with proper tracking setup"
        },
        "app_installs": {
            "bidding_strategy": "target_cpa",
            "recommended_bid_type": "CPI",
            "frequency_cap": 5,
            "frequency_period": "day",
            "pacing": "even",
            "priority_inventory": ["open_exchange"],
            "notes": "Target mobile inventory with app install tracking"
        },
        "video_views": {
            "bidding_strategy": "manual_cpm",
            "recommended_bid_type": "CPV",
            "frequency_cap": 3,
            "frequency_period": "week",
            "pacing": "even",
            "priority_inventory": ["youtube", "ctv", "pmp"],
            "notes": "Focus on video completion rate and viewability"
        }
    }
    
    strategy = strategies.get(goal, strategies["brand_awareness"])
    
    # Calculate budget allocation
    daily_budget = budget / duration_days
    
    # Line item recommendations based on goal
    line_item_recs = []
    
    if goal in ["conversions", "app_installs"]:
        line_item_recs = [
            {"type": "retargeting", "budget_share": 40, "description": "Target past visitors/users"},
            {"type": "prospecting", "budget_share": 35, "description": "Reach new audiences"},
            {"type": "lookalike", "budget_share": 25, "description": "Similar to converters"}
        ]
    elif goal in ["brand_awareness", "reach"]:
        line_item_recs = [
            {"type": "prospecting", "budget_share": 60, "description": "Broad awareness reach"},
            {"type": "contextual", "budget_share": 25, "description": "Contextually relevant placements"},
            {"type": "audience", "budget_share": 15, "description": "Interest-based targeting"}
        ]
    else:
        line_item_recs = [
            {"type": "prospecting", "budget_share": 50, "description": "New user acquisition"},
            {"type": "retargeting", "budget_share": 30, "description": "Re-engage visitors"},
            {"type": "contextual", "budget_share": 20, "description": "Content alignment"}
        ]
    
    return {
        "goal": goal,
        "strategy": strategy,
        "budget_allocation": {
            "total_budget": budget,
            "daily_budget": round(daily_budget, 2),
            "recommended_reserve": round(budget * 0.1, 2)  # 10% reserve
        },
        "line_item_recommendations": line_item_recs,
        "optimization_checkpoints": [
            {"day": 3, "action": "Review initial performance, adjust bids if CTR < benchmark"},
            {"day": 7, "action": "Analyze top performers, reallocate budget"},
            {"day": 14, "action": "Mid-flight optimization, pause underperformers"},
            {"day": max(21, duration_days - 7), "action": "Final push optimization"}
        ],
        "creative_recommendations": {
            "formats": creative_types,
            "sizes": ["300x250", "728x90", "320x50", "160x600"] if "display" in creative_types else [],
            "video_formats": ["6s", "15s", "30s"] if "video" in creative_types else [],
            "ab_test_plan": "Run 3-4 creative variants, optimize after 1000 impressions each"
        }
    }


# ==================== INSERTION ORDERS ====================

@router.get("/insertion-orders", response_model=List[InsertionOrder])
async def get_insertion_orders(campaign_id: Optional[str] = None):
    """Get all insertion orders, optionally filtered by campaign"""
    query = {}
    if campaign_id:
        query["campaign_id"] = campaign_id
    
    ios = await db.insertion_orders.find(query, {"_id": 0}).to_list(100)
    return ios


@router.get("/insertion-orders/{io_id}", response_model=InsertionOrder)
async def get_insertion_order(io_id: str):
    """Get a single insertion order"""
    io = await db.insertion_orders.find_one({"id": io_id}, {"_id": 0})
    if not io:
        raise HTTPException(status_code=404, detail="Insertion order not found")
    return io


@router.post("/insertion-orders", response_model=InsertionOrder)
async def create_insertion_order(data: IOCreate):
    """Create a new insertion order"""
    io = InsertionOrder(
        name=data.name,
        advertiser_id=data.advertiser_id,
        campaign_id=data.campaign_id,
        total_budget=data.total_budget,
        currency=data.currency,
        structure_type=data.structure_type
    )
    
    if data.start_date:
        io.start_date = datetime.fromisoformat(data.start_date)
    if data.end_date:
        io.end_date = datetime.fromisoformat(data.end_date)
    
    doc = io.model_dump()
    for field in ["created_at", "updated_at", "start_date", "end_date"]:
        if doc.get(field):
            doc[field] = doc[field].isoformat() if doc[field] else None
    
    await db.insertion_orders.insert_one(doc)
    return io


@router.put("/insertion-orders/{io_id}")
async def update_insertion_order(io_id: str, updates: dict):
    """Update an insertion order"""
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.insertion_orders.update_one(
        {"id": io_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Insertion order not found")
    
    return {"status": "updated"}


@router.delete("/insertion-orders/{io_id}")
async def delete_insertion_order(io_id: str):
    """Delete an insertion order and its line items"""
    # Delete associated line items first
    await db.line_items.delete_many({"io_id": io_id})
    
    result = await db.insertion_orders.delete_one({"id": io_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Insertion order not found")
    
    return {"status": "deleted"}


# ==================== LINE ITEMS ====================

@router.get("/line-items", response_model=List[LineItem])
async def get_line_items(io_id: Optional[str] = None):
    """Get all line items, optionally filtered by IO"""
    query = {}
    if io_id:
        query["io_id"] = io_id
    
    items = await db.line_items.find(query, {"_id": 0}).to_list(100)
    return items


@router.get("/line-items/{item_id}", response_model=LineItem)
async def get_line_item(item_id: str):
    """Get a single line item"""
    item = await db.line_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Line item not found")
    return item


@router.post("/line-items", response_model=LineItem)
async def create_line_item(data: LineItemCreate):
    """Create a new line item"""
    # Verify IO exists
    io = await db.insertion_orders.find_one({"id": data.io_id}, {"_id": 0})
    if not io:
        raise HTTPException(status_code=404, detail="Insertion order not found")
    
    item = LineItem(
        name=data.name,
        io_id=data.io_id,
        campaign_id=data.campaign_id,
        line_item_type=data.line_item_type,
        budget=data.budget,
        bid_strategy=data.bid_strategy,
        bid_price=data.bid_price,
        inventory_source=data.inventory_source
    )
    
    doc = item.model_dump()
    for field in ["created_at", "updated_at"]:
        if doc.get(field):
            doc[field] = doc[field].isoformat()
    
    await db.line_items.insert_one(doc)
    
    # Update IO with line item reference
    await db.insertion_orders.update_one(
        {"id": data.io_id},
        {"$push": {"line_item_ids": item.id}}
    )
    
    return item


@router.put("/line-items/{item_id}")
async def update_line_item(item_id: str, updates: dict):
    """Update a line item"""
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.line_items.update_one(
        {"id": item_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Line item not found")
    
    return {"status": "updated"}


@router.delete("/line-items/{item_id}")
async def delete_line_item(item_id: str):
    """Delete a line item"""
    item = await db.line_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Line item not found")
    
    # Remove from IO
    await db.insertion_orders.update_one(
        {"id": item["io_id"]},
        {"$pull": {"line_item_ids": item_id}}
    )
    
    await db.line_items.delete_one({"id": item_id})
    return {"status": "deleted"}


@router.post("/line-items/recommend")
async def recommend_line_items(
    goal: str,
    budget: float,
    audience_type: str = "prospecting"
):
    """Get recommended line item setup based on campaign goal"""
    
    recommendations = []
    
    if goal in ["conversions", "app_installs"]:
        recommendations = [
            {
                "type": "retargeting",
                "name": "Site Retargeting",
                "budget_allocation": 0.35,
                "inventory_source": "pmp",
                "bid_strategy": "target_cpa",
                "frequency_cap": 10,
                "description": "Re-engage users who visited but didn't convert"
            },
            {
                "type": "prospecting",
                "name": "Prospecting - High Intent",
                "budget_allocation": 0.30,
                "inventory_source": "open_exchange",
                "bid_strategy": "target_cpa",
                "frequency_cap": 5,
                "description": "Reach new users with purchase intent signals"
            },
            {
                "type": "lookalike",
                "name": "Lookalike Audiences",
                "budget_allocation": 0.20,
                "inventory_source": "open_exchange",
                "bid_strategy": "maximize_conversions",
                "frequency_cap": 5,
                "description": "Users similar to your converters"
            },
            {
                "type": "contextual",
                "name": "Contextual Targeting",
                "budget_allocation": 0.15,
                "inventory_source": "open_exchange",
                "bid_strategy": "manual_cpm",
                "frequency_cap": 7,
                "description": "Content-aligned placements"
            }
        ]
    elif goal == "brand_awareness":
        recommendations = [
            {
                "type": "prospecting",
                "name": "Broad Awareness",
                "budget_allocation": 0.50,
                "inventory_source": "youtube",
                "bid_strategy": "manual_cpm",
                "frequency_cap": 3,
                "description": "Maximum reach with video"
            },
            {
                "type": "contextual",
                "name": "Premium Contextual",
                "budget_allocation": 0.30,
                "inventory_source": "pmp",
                "bid_strategy": "manual_cpm",
                "frequency_cap": 5,
                "description": "Brand-safe premium placements"
            },
            {
                "type": "audience",
                "name": "Interest Targeting",
                "budget_allocation": 0.20,
                "inventory_source": "gdn",
                "bid_strategy": "manual_cpm",
                "frequency_cap": 5,
                "description": "Reach users by interests"
            }
        ]
    else:
        recommendations = [
            {
                "type": "prospecting",
                "name": "New User Acquisition",
                "budget_allocation": 0.40,
                "inventory_source": "open_exchange",
                "bid_strategy": "maximize_clicks",
                "frequency_cap": 5,
                "description": "Reach new potential customers"
            },
            {
                "type": "retargeting",
                "name": "Retargeting",
                "budget_allocation": 0.35,
                "inventory_source": "open_exchange",
                "bid_strategy": "maximize_clicks",
                "frequency_cap": 7,
                "description": "Re-engage site visitors"
            },
            {
                "type": "contextual",
                "name": "Contextual",
                "budget_allocation": 0.25,
                "inventory_source": "open_exchange",
                "bid_strategy": "manual_cpm",
                "frequency_cap": 5,
                "description": "Contextually relevant placements"
            }
        ]
    
    # Add budget amounts
    for rec in recommendations:
        rec["budget"] = round(budget * rec["budget_allocation"], 2)
    
    return {
        "goal": goal,
        "total_budget": budget,
        "recommendations": recommendations,
        "inventory_sources": {
            "youtube": {"type": "Video", "avg_cpm": 12.00, "best_for": "Brand awareness, video views"},
            "gdn": {"type": "Display", "avg_cpm": 3.00, "best_for": "Reach, traffic"},
            "pmp": {"type": "Premium", "avg_cpm": 8.00, "best_for": "Brand safety, quality"},
            "open_exchange": {"type": "Programmatic", "avg_cpm": 2.50, "best_for": "Scale, efficiency"},
            "pg": {"type": "Guaranteed", "avg_cpm": 15.00, "best_for": "Premium placements"}
        }
    }
