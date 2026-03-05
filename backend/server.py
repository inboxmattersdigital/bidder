"""
OpenRTB 2.5/2.6 Bidder with Campaign Manager
High-performance DSP for programmatic advertising
"""
from fastapi import FastAPI, APIRouter, HTTPException, Header, Request, Depends, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import time

from models import (
    Campaign, CampaignCreate, CampaignUpdate, CampaignStatus,
    Creative, CreativeCreate, CreativeType,
    SSPEndpoint, SSPEndpointCreate,
    BidLog, DashboardStats,
    CampaignTargeting, BudgetConfig,
    OPENRTB_MIGRATION_MATRIX
)
from openrtb_handler import OpenRTBParser, OpenRTBResponseBuilder, BiddingEngine

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="OpenRTB Bidder", version="1.0.0")

# Create routers
api_router = APIRouter(prefix="/api")
bid_router = APIRouter(prefix="/api/bid")

# Initialize bidding engine
bidding_engine = BiddingEngine(db)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== AUTH HELPERS ====================

async def verify_api_key(x_api_key: str = Header(None)) -> Optional[Dict[str, Any]]:
    """Verify SSP API key and return endpoint info"""
    if not x_api_key:
        return None
    
    endpoint = await db.ssp_endpoints.find_one(
        {"api_key": x_api_key, "status": "active"},
        {"_id": 0}
    )
    return endpoint


async def require_api_key(x_api_key: str = Header(...)) -> Dict[str, Any]:
    """Require valid SSP API key"""
    endpoint = await verify_api_key(x_api_key)
    if not endpoint:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return endpoint


# ==================== DASHBOARD ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "OpenRTB Bidder API", "version": "1.0.0"}


@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    # Count campaigns
    total_campaigns = await db.campaigns.count_documents({})
    active_campaigns = await db.campaigns.count_documents({"status": "active"})
    
    # Count creatives
    total_creatives = await db.creatives.count_documents({})
    
    # Aggregate campaign stats
    pipeline = [
        {"$group": {
            "_id": None,
            "total_impressions": {"$sum": "$impressions"},
            "total_clicks": {"$sum": "$clicks"},
            "total_wins": {"$sum": "$wins"},
            "total_bids": {"$sum": "$bids"},
            "total_spend": {"$sum": "$budget.total_spend"}
        }}
    ]
    
    agg_result = await db.campaigns.aggregate(pipeline).to_list(1)
    
    stats = DashboardStats(
        total_campaigns=total_campaigns,
        active_campaigns=active_campaigns,
        total_creatives=total_creatives
    )
    
    if agg_result:
        result = agg_result[0]
        stats.total_impressions = result.get("total_impressions", 0)
        stats.total_clicks = result.get("total_clicks", 0)
        stats.total_wins = result.get("total_wins", 0)
        stats.total_bids = result.get("total_bids", 0)
        stats.total_spend = result.get("total_spend", 0.0)
        
        if stats.total_bids > 0:
            stats.win_rate = (stats.total_wins / stats.total_bids) * 100
        if stats.total_impressions > 0:
            stats.avg_cpm = (stats.total_spend / stats.total_impressions) * 1000
    
    return stats


@api_router.get("/dashboard/chart-data")
async def get_chart_data():
    """Get chart data for the last 7 days"""
    # Generate sample data for now - in production, aggregate from bid logs
    today = datetime.now(timezone.utc)
    data = []
    
    for i in range(7):
        date = today - timedelta(days=6-i)
        
        # Get bid logs for this day
        start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        
        logs = await db.bid_logs.find({
            "timestamp": {"$gte": start.isoformat(), "$lt": end.isoformat()}
        }).to_list(10000)
        
        bids = len([l for l in logs if l.get("bid_made")])
        wins = len([l for l in logs if l.get("bid_made")])  # Simplified - wins = bids for demo
        spend = sum([l.get("bid_price", 0) for l in logs if l.get("bid_made")]) / 1000  # CPM to actual
        
        data.append({
            "date": date.strftime("%b %d"),
            "bids": bids or (50 + i * 10),  # Demo data if no real data
            "wins": wins or (30 + i * 5),
            "spend": round(spend or (100 + i * 20), 2)
        })
    
    return data


# ==================== CAMPAIGN ENDPOINTS ====================

@api_router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns(status: Optional[str] = None):
    """Get all campaigns"""
    query = {}
    if status:
        query["status"] = status
    
    campaigns = await db.campaigns.find(query, {"_id": 0}).to_list(1000)
    
    # Parse datetime strings
    for campaign in campaigns:
        for field in ["created_at", "updated_at", "start_date", "end_date"]:
            if campaign.get(field) and isinstance(campaign[field], str):
                try:
                    campaign[field] = datetime.fromisoformat(campaign[field].replace('Z', '+00:00'))
                except:
                    pass
    
    return campaigns


@api_router.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str):
    """Get a single campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@api_router.post("/campaigns", response_model=Campaign)
async def create_campaign(input: CampaignCreate):
    """Create a new campaign"""
    # Verify creative exists
    creative = await db.creatives.find_one({"id": input.creative_id}, {"_id": 0})
    if not creative:
        raise HTTPException(status_code=400, detail="Creative not found")
    
    campaign = Campaign(
        name=input.name,
        bid_price=input.bid_price,
        bid_floor=input.bid_floor,
        priority=input.priority,
        creative_id=input.creative_id,
        budget=input.budget,
        targeting=input.targeting,
        status=CampaignStatus.DRAFT
    )
    
    if input.start_date:
        campaign.start_date = datetime.fromisoformat(input.start_date)
    if input.end_date:
        campaign.end_date = datetime.fromisoformat(input.end_date)
    
    doc = campaign.model_dump()
    # Serialize datetimes
    for field in ["created_at", "updated_at", "start_date", "end_date"]:
        if doc.get(field):
            doc[field] = doc[field].isoformat()
    
    await db.campaigns.insert_one(doc)
    return campaign


@api_router.put("/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign(campaign_id: str, input: CampaignUpdate):
    """Update a campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    update_data = input.model_dump(exclude_unset=True)
    
    if "creative_id" in update_data:
        creative = await db.creatives.find_one({"id": update_data["creative_id"]}, {"_id": 0})
        if not creative:
            raise HTTPException(status_code=400, detail="Creative not found")
    
    # Handle datetime fields
    for field in ["start_date", "end_date"]:
        if field in update_data and update_data[field]:
            try:
                update_data[field] = datetime.fromisoformat(update_data[field]).isoformat()
            except:
                pass
    
    # Handle nested objects
    if "budget" in update_data and update_data["budget"]:
        update_data["budget"] = update_data["budget"].model_dump() if hasattr(update_data["budget"], 'model_dump') else update_data["budget"]
    if "targeting" in update_data and update_data["targeting"]:
        update_data["targeting"] = update_data["targeting"].model_dump() if hasattr(update_data["targeting"], 'model_dump') else update_data["targeting"]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": update_data}
    )
    
    updated = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return updated


@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    """Delete a campaign"""
    result = await db.campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "deleted"}


@api_router.post("/campaigns/{campaign_id}/activate")
async def activate_campaign(campaign_id: str):
    """Activate a campaign"""
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "active"}


@api_router.post("/campaigns/{campaign_id}/pause")
async def pause_campaign(campaign_id: str):
    """Pause a campaign"""
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": "paused", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "paused"}


# ==================== CREATIVE ENDPOINTS ====================

@api_router.get("/creatives", response_model=List[Creative])
async def get_creatives(type: Optional[str] = None):
    """Get all creatives"""
    query = {}
    if type:
        query["type"] = type
    
    creatives = await db.creatives.find(query, {"_id": 0}).to_list(1000)
    return creatives


@api_router.get("/creatives/{creative_id}", response_model=Creative)
async def get_creative(creative_id: str):
    """Get a single creative"""
    creative = await db.creatives.find_one({"id": creative_id}, {"_id": 0})
    if not creative:
        raise HTTPException(status_code=404, detail="Creative not found")
    return creative


@api_router.post("/creatives", response_model=Creative)
async def create_creative(input: CreativeCreate):
    """Create a new creative"""
    creative = Creative(
        name=input.name,
        type=input.type,
        adomain=input.adomain,
        iurl=input.iurl,
        cat=input.cat,
        banner_data=input.banner_data,
        video_data=input.video_data,
        native_data=input.native_data
    )
    
    doc = creative.model_dump()
    for field in ["created_at", "updated_at"]:
        if doc.get(field):
            doc[field] = doc[field].isoformat()
    
    await db.creatives.insert_one(doc)
    return creative


@api_router.delete("/creatives/{creative_id}")
async def delete_creative(creative_id: str):
    """Delete a creative"""
    # Check if used by campaigns
    campaign = await db.campaigns.find_one({"creative_id": creative_id})
    if campaign:
        raise HTTPException(status_code=400, detail="Creative is used by a campaign")
    
    result = await db.creatives.delete_one({"id": creative_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Creative not found")
    return {"status": "deleted"}


# ==================== SSP ENDPOINT MANAGEMENT ====================

@api_router.get("/ssp-endpoints", response_model=List[SSPEndpoint])
async def get_ssp_endpoints():
    """Get all SSP endpoints"""
    endpoints = await db.ssp_endpoints.find({}, {"_id": 0}).to_list(100)
    return endpoints


@api_router.post("/ssp-endpoints", response_model=SSPEndpoint)
async def create_ssp_endpoint(input: SSPEndpointCreate):
    """Create a new SSP endpoint"""
    endpoint = SSPEndpoint(
        name=input.name,
        description=input.description
    )
    
    doc = endpoint.model_dump()
    for field in ["created_at", "updated_at"]:
        if doc.get(field):
            doc[field] = doc[field].isoformat()
    
    await db.ssp_endpoints.insert_one(doc)
    return endpoint


@api_router.post("/ssp-endpoints/{endpoint_id}/regenerate-key")
async def regenerate_api_key(endpoint_id: str):
    """Regenerate API key for an SSP endpoint"""
    new_key = f"ssp_{uuid.uuid4().hex}"
    
    result = await db.ssp_endpoints.update_one(
        {"id": endpoint_id},
        {"$set": {"api_key": new_key, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    
    return {"api_key": new_key}


@api_router.delete("/ssp-endpoints/{endpoint_id}")
async def delete_ssp_endpoint(endpoint_id: str):
    """Delete an SSP endpoint"""
    result = await db.ssp_endpoints.delete_one({"id": endpoint_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    return {"status": "deleted"}


@api_router.put("/ssp-endpoints/{endpoint_id}/status")
async def update_ssp_status(endpoint_id: str, status: str):
    """Update SSP endpoint status"""
    if status not in ["active", "inactive"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.ssp_endpoints.update_one(
        {"id": endpoint_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    
    return {"status": status}


# ==================== BID LOGS ====================

@api_router.get("/bid-logs")
async def get_bid_logs(limit: int = 50, offset: int = 0):
    """Get bid logs with pagination"""
    logs = await db.bid_logs.find(
        {},
        {"_id": 0}
    ).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)
    
    total = await db.bid_logs.count_documents({})
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@api_router.get("/bid-logs/{log_id}")
async def get_bid_log(log_id: str):
    """Get a single bid log"""
    log = await db.bid_logs.find_one({"id": log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Bid log not found")
    return log


# ==================== OpenRTB BID ENDPOINT ====================

@bid_router.post("")
@bid_router.post("/")
async def handle_bid_request(
    request: Request,
    x_api_key: str = Header(None),
    x_openrtb_version: str = Header(None)
):
    """
    Handle OpenRTB bid requests from SSPs
    Supports both OpenRTB 2.5 and 2.6
    """
    start_time = time.time()
    
    # Verify API key if provided
    ssp_id = None
    if x_api_key:
        endpoint = await verify_api_key(x_api_key)
        if endpoint:
            ssp_id = endpoint["id"]
            # Update request count
            await db.ssp_endpoints.update_one(
                {"id": ssp_id},
                {"$inc": {"total_requests": 1}}
            )
        else:
            # Invalid key - still process but log it
            logger.warning(f"Invalid API key received: {x_api_key[:10]}...")
    
    try:
        bid_request = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse bid request: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    # Build headers dict for version detection
    headers = {}
    if x_openrtb_version:
        headers["x-openrtb-version"] = x_openrtb_version
    
    # Process bid request
    try:
        response, log_data = await bidding_engine.process_bid_request(
            bid_request,
            headers=headers,
            ssp_id=ssp_id
        )
    except Exception as e:
        logger.error(f"Bid processing error: {e}")
        raise HTTPException(status_code=500, detail="Bid processing failed")
    
    # Save bid log
    log = BidLog(**log_data)
    log_doc = log.model_dump()
    log_doc["timestamp"] = log_doc["timestamp"].isoformat()
    await db.bid_logs.insert_one(log_doc)
    
    # Update SSP stats if bid was made
    if log_data.get("bid_made") and ssp_id:
        await db.ssp_endpoints.update_one(
            {"id": ssp_id},
            {"$inc": {"total_bids": 1}}
        )
    
    # Update campaign stats if bid was made
    if log_data.get("bid_made") and log_data.get("campaign_id"):
        await db.campaigns.update_one(
            {"id": log_data["campaign_id"]},
            {"$inc": {"bids": 1}}
        )
    
    # Return no-bid (204) or bid response (200)
    if not log_data.get("bid_made"):
        return Response(status_code=204)
    
    return JSONResponse(content=response, status_code=200)


# ==================== MIGRATION MATRIX ====================

@api_router.get("/migration-matrix")
async def get_migration_matrix():
    """Get OpenRTB 2.5 to 2.6 field migration matrix"""
    return OPENRTB_MIGRATION_MATRIX


# ==================== SAMPLE DATA ====================

@api_router.post("/seed-data")
async def seed_sample_data():
    """Seed sample data for testing"""
    # Check if data already exists
    existing = await db.campaigns.count_documents({})
    if existing > 0:
        return {"message": "Data already exists", "campaigns": existing}
    
    # Create sample creatives
    creatives = [
        {
            "id": str(uuid.uuid4()),
            "name": "Tech Banner 300x250",
            "type": "banner",
            "status": "active",
            "adomain": ["techcorp.com"],
            "cat": ["IAB19"],
            "banner_data": {
                "width": 300,
                "height": 250,
                "mimes": ["image/jpeg", "image/png"],
                "ad_markup": "<div style='width:300px;height:250px;background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;font-family:sans-serif;'><span>TechCorp Ad</span></div>"
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Video Pre-roll 15s",
            "type": "video",
            "status": "active",
            "adomain": ["automaker.com"],
            "cat": ["IAB3"],
            "video_data": {
                "duration": 15,
                "width": 1920,
                "height": 1080,
                "mimes": ["video/mp4", "video/webm"],
                "protocols": [2, 3, 5, 6],
                "vast_xml": '<?xml version="1.0"?><VAST version="3.0"><Ad id="sample"><InLine><AdTitle>Auto Ad</AdTitle><Creatives></Creatives></InLine></Ad></VAST>'
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Mobile Video 320x480",
            "type": "video",
            "status": "active",
            "adomain": ["gameapp.com"],
            "cat": ["IAB9"],
            "video_data": {
                "duration": 30,
                "width": 320,
                "height": 480,
                "mimes": ["video/mp4", "video/webm"],
                "protocols": [2, 3, 5, 6, 7, 8],
                "vast_xml": '<?xml version="1.0"?><VAST version="3.0"><Ad id="game"><InLine><AdTitle>Game Ad</AdTitle><Creatives></Creatives></InLine></Ad></VAST>'
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for creative in creatives:
        await db.creatives.insert_one(creative)
    
    # Create sample campaigns
    campaigns = [
        {
            "id": str(uuid.uuid4()),
            "name": "Tech Display Campaign",
            "status": "active",
            "bid_price": 2.50,
            "bid_floor": 0.10,
            "priority": 5,
            "creative_id": creatives[0]["id"],
            "budget": {
                "daily_budget": 1000.0,
                "total_budget": 10000.0,
                "daily_spend": 0.0,
                "total_spend": 0.0
            },
            "targeting": {
                "geo": {"countries": [], "regions": [], "cities": []},
                "device": {"device_types": [], "makes": [], "models": [], "os_list": [], "connection_types": []},
                "inventory": {"domain_whitelist": [], "domain_blacklist": [], "bundle_whitelist": [], "bundle_blacklist": [], "publisher_ids": [], "categories": []},
                "video": {"placements": [], "plcmts": [], "protocols": [], "mimes": []},
                "content": {"categories": [], "keywords": []},
                "privacy": {"gdpr_required": False, "gdpr_consent_required": False, "ccpa_allowed": True, "coppa_allowed": False}
            },
            "impressions": 0,
            "clicks": 0,
            "wins": 0,
            "bids": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Auto Video Campaign",
            "status": "active",
            "bid_price": 5.00,
            "bid_floor": 0.50,
            "priority": 8,
            "creative_id": creatives[1]["id"],
            "budget": {
                "daily_budget": 5000.0,
                "total_budget": 50000.0,
                "daily_spend": 0.0,
                "total_spend": 0.0
            },
            "targeting": {
                "geo": {"countries": ["USA", "CAN"], "regions": [], "cities": []},
                "device": {"device_types": [3, 7], "makes": [], "models": [], "os_list": [], "connection_types": []},
                "inventory": {"domain_whitelist": [], "domain_blacklist": [], "bundle_whitelist": [], "bundle_blacklist": [], "publisher_ids": [], "categories": ["IAB3"]},
                "video": {"placements": [1], "plcmts": [1], "min_duration": 5, "max_duration": 30, "protocols": [2, 3, 5, 6], "mimes": ["video/mp4"]},
                "content": {"categories": [], "keywords": []},
                "privacy": {"gdpr_required": False, "gdpr_consent_required": False, "ccpa_allowed": True, "coppa_allowed": False}
            },
            "impressions": 0,
            "clicks": 0,
            "wins": 0,
            "bids": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Mobile Gaming Campaign",
            "status": "active",
            "bid_price": 3.00,
            "bid_floor": 0.10,
            "priority": 6,
            "creative_id": creatives[2]["id"],
            "budget": {
                "daily_budget": 2000.0,
                "total_budget": 20000.0,
                "daily_spend": 0.0,
                "total_spend": 0.0
            },
            "targeting": {
                "geo": {"countries": [], "regions": [], "cities": []},
                "device": {"device_types": [4, 5], "makes": [], "models": [], "os_list": ["Android", "iOS"], "connection_types": []},
                "inventory": {"domain_whitelist": [], "domain_blacklist": [], "bundle_whitelist": [], "bundle_blacklist": [], "publisher_ids": [], "categories": []},
                "video": {"placements": [5], "plcmts": [3], "min_duration": 15, "max_duration": 60, "protocols": [2, 3, 5, 6, 7, 8], "mimes": ["video/mp4", "video/webm"]},
                "content": {"categories": [], "keywords": []},
                "privacy": {"gdpr_required": False, "gdpr_consent_required": False, "ccpa_allowed": True, "coppa_allowed": False}
            },
            "impressions": 0,
            "clicks": 0,
            "wins": 0,
            "bids": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for campaign in campaigns:
        await db.campaigns.insert_one(campaign)
    
    # Create sample SSP endpoint
    ssp = {
        "id": str(uuid.uuid4()),
        "name": "Demo SSP",
        "api_key": f"ssp_{uuid.uuid4().hex}",
        "description": "Demo SSP endpoint for testing",
        "status": "active",
        "total_requests": 0,
        "total_bids": 0,
        "total_wins": 0,
        "total_spend": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ssp_endpoints.insert_one(ssp)
    
    return {
        "message": "Sample data created",
        "creatives": len(creatives),
        "campaigns": len(campaigns),
        "ssp_endpoints": 1
    }


# Include routers
app.include_router(api_router)
app.include_router(bid_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
