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
    CampaignTargeting, BudgetConfig, BidShadingConfig,
    CampaignReport, ReportSummary,
    WinNotification, BillingNotification,
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
    Requires valid API key authentication
    """
    start_time = time.time()
    
    # Verify API key - required for authenticated requests
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
            # Invalid key - reject the request
            logger.warning(f"Invalid API key received: {x_api_key[:10]}...")
            raise HTTPException(status_code=401, detail="Invalid API key")
    else:
        # No API key provided - reject the request
        raise HTTPException(status_code=401, detail="API key required. Include X-API-Key header")
    
    try:
        bid_request = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse bid request: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    # Build headers dict for version detection
    headers = {}
    if x_openrtb_version:
        headers["x-openrtb-version"] = x_openrtb_version
    
    # Get base URL for nurl/burl callbacks
    nurl_base = os.environ.get('NURL_BASE_URL', request.base_url.scheme + "://" + request.headers.get('host', ''))
    
    # Process bid request
    try:
        response, log_data = await bidding_engine.process_bid_request(
            bid_request,
            headers=headers,
            ssp_id=ssp_id,
            nurl_base=nurl_base
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


# ==================== WIN/BILLING NOTIFICATIONS ====================

@api_router.post("/notify/win/{bid_id}")
async def win_notification(bid_id: str, price: float = 0.0):
    """
    Handle win notification (nurl callback)
    Called by SSP when our bid wins the auction
    """
    # Find the bid log
    bid_log = await db.bid_logs.find_one({"id": bid_id}, {"_id": 0})
    if not bid_log:
        # Try finding by request_id as fallback
        bid_log = await db.bid_logs.find_one(
            {"request_id": bid_id, "bid_made": True},
            {"_id": 0}
        )
    
    if not bid_log:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    if bid_log.get("win_notified"):
        return {"status": "already_notified", "bid_id": bid_id}
    
    campaign_id = bid_log.get("campaign_id")
    ssp_id = bid_log.get("ssp_id")
    bid_price = bid_log.get("shaded_price") or bid_log.get("bid_price", 0)
    
    # Use clearing price if provided, otherwise use bid price
    win_price = price if price > 0 else bid_price
    
    # Update bid log
    await db.bid_logs.update_one(
        {"id": bid_log["id"]},
        {"$set": {
            "win_notified": True,
            "win_price": win_price
        }}
    )
    
    # Update campaign stats
    if campaign_id:
        # Calculate spend (CPM / 1000 = cost per impression)
        impression_cost = win_price / 1000
        
        await db.campaigns.update_one(
            {"id": campaign_id},
            {
                "$inc": {
                    "wins": 1,
                    "impressions": 1,
                    "budget.daily_spend": impression_cost,
                    "budget.total_spend": impression_cost
                }
            }
        )
        
        # Update win rate and avg win price for bid shading
        campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
        if campaign:
            total_bids = campaign.get("bids", 1)
            total_wins = campaign.get("wins", 0)
            new_win_rate = total_wins / max(total_bids, 1)
            
            # Calculate moving average win price
            old_avg = campaign.get("avg_win_price", 0)
            new_avg = (old_avg * (total_wins - 1) + win_price) / total_wins if total_wins > 0 else win_price
            
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$set": {
                    "recent_win_rate": new_win_rate,
                    "avg_win_price": new_avg
                }}
            )
            
            # Adjust bid shading based on win rate
            await adjust_bid_shading(campaign_id, new_win_rate, campaign.get("bid_shading", {}))
    
    # Update SSP stats
    if ssp_id:
        impression_cost = win_price / 1000
        await db.ssp_endpoints.update_one(
            {"id": ssp_id},
            {"$inc": {"total_wins": 1, "total_spend": impression_cost}}
        )
    
    logger.info(f"Win notification processed: bid_id={bid_id}, price={win_price}")
    
    return {
        "status": "success",
        "bid_id": bid_id,
        "win_price": win_price,
        "campaign_id": campaign_id
    }


@api_router.post("/notify/billing/{bid_id}")
async def billing_notification(bid_id: str, price: float = 0.0):
    """
    Handle billing notification (burl callback)
    Called by SSP when the impression is billable
    """
    bid_log = await db.bid_logs.find_one({"id": bid_id}, {"_id": 0})
    if not bid_log:
        bid_log = await db.bid_logs.find_one(
            {"request_id": bid_id, "bid_made": True},
            {"_id": 0}
        )
    
    if not bid_log:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    if bid_log.get("billing_notified"):
        return {"status": "already_notified", "bid_id": bid_id}
    
    await db.bid_logs.update_one(
        {"id": bid_log["id"]},
        {"$set": {"billing_notified": True}}
    )
    
    logger.info(f"Billing notification processed: bid_id={bid_id}")
    
    return {"status": "success", "bid_id": bid_id}


async def adjust_bid_shading(campaign_id: str, current_win_rate: float, shading_config: dict):
    """Adjust bid shading factor based on win rate"""
    if not shading_config.get("enabled", False):
        return
    
    target_win_rate = shading_config.get("target_win_rate", 0.3)
    learning_rate = shading_config.get("learning_rate", 0.1)
    current_factor = shading_config.get("current_shade_factor", 0.85)
    min_factor = shading_config.get("min_shade_factor", 0.5)
    max_factor = shading_config.get("max_shade_factor", 0.95)
    
    # If win rate is too high, reduce bids (lower factor)
    # If win rate is too low, increase bids (higher factor)
    rate_diff = current_win_rate - target_win_rate
    adjustment = -rate_diff * learning_rate  # Negative because higher win rate means we can bid lower
    
    new_factor = current_factor + adjustment
    new_factor = max(min_factor, min(max_factor, new_factor))
    
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"bid_shading.current_shade_factor": new_factor}}
    )


# ==================== BUDGET PACING ====================

@api_router.post("/campaigns/{campaign_id}/reset-daily-spend")
async def reset_daily_spend(campaign_id: str):
    """Reset daily spend for a campaign (typically called at midnight)"""
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {
            "budget.daily_spend": 0,
            "budget.current_hour_spend": 0,
            "budget.last_hour_reset": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"status": "reset", "campaign_id": campaign_id}


@api_router.post("/pacing/reset-all")
async def reset_all_daily_spend():
    """Reset daily spend for all campaigns"""
    result = await db.campaigns.update_many(
        {},
        {"$set": {
            "budget.daily_spend": 0,
            "budget.current_hour_spend": 0,
            "budget.last_hour_reset": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"status": "reset", "campaigns_updated": result.modified_count}


@api_router.get("/pacing/status")
async def get_pacing_status():
    """Get pacing status for all active campaigns"""
    campaigns = await db.campaigns.find(
        {"status": "active"},
        {"_id": 0, "id": 1, "name": 1, "budget": 1, "bid_shading": 1}
    ).to_list(1000)
    
    now = datetime.now(timezone.utc)
    current_hour = now.hour
    hours_remaining = 24 - current_hour
    
    status = []
    for c in campaigns:
        budget = c.get("budget", {})
        daily_budget = budget.get("daily_budget", 0)
        daily_spend = budget.get("daily_spend", 0)
        
        if daily_budget > 0:
            pacing_percentage = (daily_spend / daily_budget) * 100
            ideal_percentage = (current_hour / 24) * 100
            pacing_status = "on_track"
            
            if pacing_percentage > ideal_percentage + 10:
                pacing_status = "overpacing"
            elif pacing_percentage < ideal_percentage - 10:
                pacing_status = "underpacing"
        else:
            pacing_percentage = 0
            ideal_percentage = 0
            pacing_status = "unlimited"
        
        status.append({
            "campaign_id": c["id"],
            "campaign_name": c["name"],
            "daily_budget": daily_budget,
            "daily_spend": daily_spend,
            "pacing_percentage": round(pacing_percentage, 1),
            "ideal_percentage": round(ideal_percentage, 1),
            "pacing_status": pacing_status,
            "hours_remaining": hours_remaining,
            "bid_shading_enabled": c.get("bid_shading", {}).get("enabled", False),
            "current_shade_factor": c.get("bid_shading", {}).get("current_shade_factor", 1.0)
        })
    
    return {"current_hour": current_hour, "campaigns": status}


# ==================== REPORTING ====================

@api_router.get("/reports/campaign/{campaign_id}")
async def get_campaign_report(
    campaign_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get performance report for a specific campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Default to last 7 days
    if not end_date:
        end_dt = datetime.now(timezone.utc)
        end_date = end_dt.strftime("%Y-%m-%d")
    else:
        end_dt = datetime.fromisoformat(end_date)
    
    if not start_date:
        start_dt = end_dt - timedelta(days=7)
        start_date = start_dt.strftime("%Y-%m-%d")
    else:
        start_dt = datetime.fromisoformat(start_date)
    
    # Aggregate bid logs by date
    pipeline = [
        {
            "$match": {
                "campaign_id": campaign_id,
                "timestamp": {
                    "$gte": start_dt.isoformat(),
                    "$lte": (end_dt + timedelta(days=1)).isoformat()
                }
            }
        },
        {
            "$group": {
                "_id": {"$substr": ["$timestamp", 0, 10]},
                "bids": {"$sum": 1},
                "wins": {"$sum": {"$cond": ["$win_notified", 1, 0]}},
                "total_bid_price": {"$sum": {"$ifNull": ["$shaded_price", "$bid_price"]}},
                "total_win_price": {"$sum": {"$ifNull": ["$win_price", 0]}}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    daily_data = await db.bid_logs.aggregate(pipeline).to_list(100)
    
    # Calculate totals
    total_bids = sum(d["bids"] for d in daily_data)
    total_wins = sum(d["wins"] for d in daily_data)
    total_bid_value = sum(d["total_bid_price"] for d in daily_data)
    total_win_value = sum(d["total_win_price"] for d in daily_data)
    
    # Get impressions and clicks from campaign
    impressions = campaign.get("impressions", 0)
    clicks = campaign.get("clicks", 0)
    spend = campaign.get("budget", {}).get("total_spend", 0)
    
    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.get("name"),
        "start_date": start_date,
        "end_date": end_date,
        "summary": {
            "impressions": impressions,
            "clicks": clicks,
            "bids": total_bids,
            "wins": total_wins,
            "spend": spend,
            "ctr": (clicks / impressions * 100) if impressions > 0 else 0,
            "win_rate": (total_wins / total_bids * 100) if total_bids > 0 else 0,
            "avg_cpm": (spend / impressions * 1000) if impressions > 0 else 0,
            "avg_bid_price": (total_bid_value / total_bids) if total_bids > 0 else 0,
            "avg_win_price": (total_win_value / total_wins) if total_wins > 0 else 0
        },
        "daily_data": [
            {
                "date": d["_id"],
                "bids": d["bids"],
                "wins": d["wins"],
                "win_rate": (d["wins"] / d["bids"] * 100) if d["bids"] > 0 else 0,
                "avg_bid_price": (d["total_bid_price"] / d["bids"]) if d["bids"] > 0 else 0,
                "avg_win_price": (d["total_win_price"] / d["wins"]) if d["wins"] > 0 else 0
            }
            for d in daily_data
        ],
        "bid_shading": {
            "enabled": campaign.get("bid_shading", {}).get("enabled", False),
            "current_factor": campaign.get("bid_shading", {}).get("current_shade_factor", 1.0),
            "target_win_rate": campaign.get("bid_shading", {}).get("target_win_rate", 0.3),
            "actual_win_rate": campaign.get("recent_win_rate", 0)
        }
    }


@api_router.get("/reports/summary")
async def get_report_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get overall performance report summary"""
    # Default to last 7 days
    if not end_date:
        end_dt = datetime.now(timezone.utc)
        end_date = end_dt.strftime("%Y-%m-%d")
    else:
        end_dt = datetime.fromisoformat(end_date)
    
    if not start_date:
        start_dt = end_dt - timedelta(days=7)
        start_date = start_dt.strftime("%Y-%m-%d")
    else:
        start_dt = datetime.fromisoformat(start_date)
    
    # Aggregate across all campaigns
    pipeline = [
        {
            "$match": {
                "timestamp": {
                    "$gte": start_dt.isoformat(),
                    "$lte": (end_dt + timedelta(days=1)).isoformat()
                }
            }
        },
        {
            "$group": {
                "_id": {"$substr": ["$timestamp", 0, 10]},
                "total_bids": {"$sum": {"$cond": ["$bid_made", 1, 0]}},
                "no_bids": {"$sum": {"$cond": ["$bid_made", 0, 1]}},
                "wins": {"$sum": {"$cond": ["$win_notified", 1, 0]}},
                "total_spend": {"$sum": {"$ifNull": ["$win_price", 0]}}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    daily_data = await db.bid_logs.aggregate(pipeline).to_list(100)
    
    # Get campaign totals
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(1000)
    
    total_impressions = sum(c.get("impressions", 0) for c in campaigns)
    total_clicks = sum(c.get("clicks", 0) for c in campaigns)
    total_spend = sum(c.get("budget", {}).get("total_spend", 0) for c in campaigns)
    
    total_bids = sum(d["total_bids"] for d in daily_data)
    total_wins = sum(d["wins"] for d in daily_data)
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "summary": {
            "total_impressions": total_impressions,
            "total_clicks": total_clicks,
            "total_bids": total_bids,
            "total_wins": total_wins,
            "total_spend": total_spend,
            "ctr": (total_clicks / total_impressions * 100) if total_impressions > 0 else 0,
            "win_rate": (total_wins / total_bids * 100) if total_bids > 0 else 0,
            "avg_cpm": (total_spend / total_impressions * 1000) if total_impressions > 0 else 0
        },
        "daily_data": [
            {
                "date": d["_id"],
                "bids": d["total_bids"],
                "no_bids": d["no_bids"],
                "wins": d["wins"],
                "spend": d["total_spend"] / 1000,  # Convert from CPM
                "win_rate": (d["wins"] / d["total_bids"] * 100) if d["total_bids"] > 0 else 0
            }
            for d in daily_data
        ],
        "campaigns": len(campaigns),
        "active_campaigns": len([c for c in campaigns if c.get("status") == "active"])
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
