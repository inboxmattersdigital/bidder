"""
OpenRTB 2.5/2.6 Bidder with Campaign Manager
High-performance DSP for programmatic advertising
"""
from fastapi import FastAPI, APIRouter, HTTPException, Header, Request, Depends, Response, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Set
import uuid
from datetime import datetime, timezone, timedelta
import time
import shutil
import base64
import asyncio
import json

from models import (
    Campaign, CampaignCreate, CampaignUpdate, CampaignStatus,
    Creative, CreativeCreate, CreativeType,
    SSPEndpoint, SSPEndpointCreate,
    BidLog, DashboardStats,
    CampaignTargeting, BudgetConfig, BidShadingConfig,
    FrequencyCapConfig, SPOConfig, MLPredictionConfig,
    CampaignReport, ReportSummary,
    WinNotification, BillingNotification,
    UserFrequency, MLModelStats, BidPredictionFeatures,
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


# ==================== WEBSOCKET CONNECTION MANAGER ====================

class ConnectionManager:
    """Manages WebSocket connections for real-time bid stream"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
        
        message_json = json.dumps(message)
        disconnected = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message_json)
            except Exception:
                disconnected.add(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.active_connections.discard(conn)

ws_manager = ConnectionManager()


# ==================== REFERENCE DATA ====================

IAB_CATEGORIES = {
    "IAB1": "Arts & Entertainment",
    "IAB1-1": "Books & Literature",
    "IAB1-2": "Celebrity Fan/Gossip",
    "IAB1-3": "Fine Art",
    "IAB1-4": "Humor",
    "IAB1-5": "Movies",
    "IAB1-6": "Music",
    "IAB1-7": "Television",
    "IAB2": "Automotive",
    "IAB2-1": "Auto Parts",
    "IAB2-2": "Auto Repair",
    "IAB2-3": "Buying/Selling Cars",
    "IAB2-4": "Car Culture",
    "IAB2-5": "Certified Pre-Owned",
    "IAB2-6": "Convertible",
    "IAB2-7": "Coupe",
    "IAB2-8": "Crossover",
    "IAB3": "Business",
    "IAB3-1": "Advertising",
    "IAB3-2": "Agriculture",
    "IAB3-3": "Biotech/Biomedical",
    "IAB3-4": "Business Software",
    "IAB3-5": "Construction",
    "IAB4": "Careers",
    "IAB4-1": "Career Planning",
    "IAB4-2": "College",
    "IAB4-3": "Financial Aid",
    "IAB4-4": "Job Fairs",
    "IAB4-5": "Job Search",
    "IAB5": "Education",
    "IAB5-1": "7-12 Education",
    "IAB5-2": "Adult Education",
    "IAB5-3": "Art History",
    "IAB6": "Family & Parenting",
    "IAB6-1": "Adoption",
    "IAB6-2": "Babies & Toddlers",
    "IAB6-3": "Daycare/Pre School",
    "IAB7": "Health & Fitness",
    "IAB7-1": "Exercise",
    "IAB7-2": "ADD",
    "IAB7-3": "AIDS/HIV",
    "IAB8": "Food & Drink",
    "IAB8-1": "American Cuisine",
    "IAB8-2": "Barbecues & Grilling",
    "IAB8-3": "Cajun/Creole",
    "IAB9": "Hobbies & Interests",
    "IAB9-1": "Art/Technology",
    "IAB9-2": "Arts & Crafts",
    "IAB9-3": "Beadwork",
    "IAB10": "Home & Garden",
    "IAB10-1": "Appliances",
    "IAB10-2": "Entertaining",
    "IAB10-3": "Environmental Safety",
    "IAB11": "Law, Government & Politics",
    "IAB11-1": "Immigration",
    "IAB11-2": "Legal Issues",
    "IAB11-3": "U.S. Government Resources",
    "IAB12": "News",
    "IAB12-1": "International News",
    "IAB12-2": "National News",
    "IAB12-3": "Local News",
    "IAB13": "Personal Finance",
    "IAB13-1": "Beginning Investing",
    "IAB13-2": "Credit/Debt & Loans",
    "IAB13-3": "Financial News",
    "IAB14": "Society",
    "IAB14-1": "Dating",
    "IAB14-2": "Divorce Support",
    "IAB14-3": "Gay Life",
    "IAB15": "Science",
    "IAB15-1": "Astrology",
    "IAB15-2": "Biology",
    "IAB15-3": "Chemistry",
    "IAB16": "Pets",
    "IAB16-1": "Aquariums",
    "IAB16-2": "Birds",
    "IAB16-3": "Cats",
    "IAB17": "Sports",
    "IAB17-1": "Auto Racing",
    "IAB17-2": "Baseball",
    "IAB17-3": "Bicycling",
    "IAB18": "Style & Fashion",
    "IAB18-1": "Beauty",
    "IAB18-2": "Body Art",
    "IAB18-3": "Fashion",
    "IAB19": "Technology & Computing",
    "IAB19-1": "3-D Graphics",
    "IAB19-2": "Animation",
    "IAB19-3": "Antivirus Software",
    "IAB20": "Travel",
    "IAB20-1": "Adventure Travel",
    "IAB20-2": "Africa",
    "IAB20-3": "Air Travel",
    "IAB21": "Real Estate",
    "IAB21-1": "Apartments",
    "IAB21-2": "Architects",
    "IAB21-3": "Buying/Selling Homes",
    "IAB22": "Shopping",
    "IAB22-1": "Contests & Freebies",
    "IAB22-2": "Couponing",
    "IAB22-3": "Comparison",
    "IAB23": "Religion & Spirituality",
    "IAB23-1": "Alternative Religions",
    "IAB23-2": "Atheism/Agnosticism",
    "IAB23-3": "Buddhism",
    "IAB24": "Uncategorized",
    "IAB25": "Non-Standard Content",
    "IAB26": "Illegal Content"
}

VIDEO_PLACEMENTS = {
    1: "In-Stream (Pre/Mid/Post-roll)",
    2: "In-Banner",
    3: "In-Article",
    4: "In-Feed",
    5: "Interstitial/Slider/Floating"
}

VIDEO_PLCMT = {
    1: "In-Stream (Sound On)",
    2: "Accompanying Content",
    3: "Interstitial",
    4: "No Content/Standalone"
}

VIDEO_PROTOCOLS = {
    1: "VAST 1.0",
    2: "VAST 2.0",
    3: "VAST 3.0",
    4: "VAST 1.0 Wrapper",
    5: "VAST 2.0 Wrapper",
    6: "VAST 3.0 Wrapper",
    7: "VAST 4.0",
    8: "VAST 4.0 Wrapper",
    9: "DAAST 1.0",
    10: "DAAST 1.0 Wrapper",
    11: "VAST 4.1",
    12: "VAST 4.1 Wrapper",
    13: "VAST 4.2",
    14: "VAST 4.2 Wrapper"
}

VIDEO_MIMES = [
    {"value": "video/mp4", "label": "MP4 (video/mp4)"},
    {"value": "video/webm", "label": "WebM (video/webm)"},
    {"value": "video/ogg", "label": "OGG (video/ogg)"},
    {"value": "video/x-flv", "label": "FLV (video/x-flv)"},
    {"value": "video/3gpp", "label": "3GPP (video/3gpp)"},
    {"value": "application/javascript", "label": "VPAID JS"},
    {"value": "application/x-shockwave-flash", "label": "SWF Flash"}
]

POD_POSITIONS = {
    1: "First Position",
    2: "Last Position",
    3: "First or Last",
    4: "First and Last",
    0: "Any Position"
}

AD_PLACEMENTS = [
    {"value": "in_app", "label": "In-App"},
    {"value": "in_stream", "label": "In-Stream"},
    {"value": "in_stream_non_skip", "label": "In-Stream (Non-Skippable)"},
    {"value": "in_banner", "label": "In-Banner"},
    {"value": "in_article", "label": "In-Article"},
    {"value": "in_feed", "label": "In-Feed"},
    {"value": "interstitial", "label": "Interstitial"},
    {"value": "side_banner", "label": "Side Banner"},
    {"value": "above_fold", "label": "Above Fold"},
    {"value": "below_fold", "label": "Below Fold"},
    {"value": "sticky", "label": "Sticky"},
    {"value": "floating", "label": "Floating"},
    {"value": "rewarded", "label": "Rewarded"}
]

DEVICE_TYPES = {
    1: "Mobile/Tablet",
    2: "Personal Computer",
    3: "Connected TV",
    4: "Phone",
    5: "Tablet",
    6: "Connected Device",
    7: "Set Top Box"
}

CONNECTION_TYPES = {
    0: "Unknown",
    1: "Ethernet",
    2: "WiFi",
    3: "Cellular (Unknown)",
    4: "Cellular 2G",
    5: "Cellular 3G",
    6: "Cellular 4G",
    7: "Cellular 5G"
}

# Carriers by country
CARRIERS_BY_COUNTRY = {
    "USA": [
        {"name": "Verizon", "mcc": "311", "mnc": "480"},
        {"name": "AT&T", "mcc": "310", "mnc": "410"},
        {"name": "T-Mobile", "mcc": "310", "mnc": "260"},
        {"name": "Sprint", "mcc": "312", "mnc": "530"},
        {"name": "US Cellular", "mcc": "311", "mnc": "580"}
    ],
    "GBR": [
        {"name": "EE", "mcc": "234", "mnc": "30"},
        {"name": "O2 UK", "mcc": "234", "mnc": "10"},
        {"name": "Vodafone UK", "mcc": "234", "mnc": "15"},
        {"name": "Three UK", "mcc": "234", "mnc": "20"}
    ],
    "DEU": [
        {"name": "Telekom", "mcc": "262", "mnc": "01"},
        {"name": "Vodafone DE", "mcc": "262", "mnc": "02"},
        {"name": "O2 Germany", "mcc": "262", "mnc": "07"}
    ],
    "FRA": [
        {"name": "Orange France", "mcc": "208", "mnc": "01"},
        {"name": "SFR", "mcc": "208", "mnc": "10"},
        {"name": "Bouygues", "mcc": "208", "mnc": "20"},
        {"name": "Free Mobile", "mcc": "208", "mnc": "15"}
    ],
    "IND": [
        {"name": "Jio", "mcc": "405", "mnc": "857"},
        {"name": "Airtel", "mcc": "404", "mnc": "10"},
        {"name": "Vodafone Idea", "mcc": "404", "mnc": "20"},
        {"name": "BSNL", "mcc": "404", "mnc": "72"}
    ],
    "BRA": [
        {"name": "Claro", "mcc": "724", "mnc": "05"},
        {"name": "Vivo", "mcc": "724", "mnc": "06"},
        {"name": "TIM", "mcc": "724", "mnc": "04"},
        {"name": "Oi", "mcc": "724", "mnc": "31"}
    ],
    "JPN": [
        {"name": "NTT Docomo", "mcc": "440", "mnc": "10"},
        {"name": "au (KDDI)", "mcc": "440", "mnc": "50"},
        {"name": "SoftBank", "mcc": "440", "mnc": "20"},
        {"name": "Rakuten", "mcc": "440", "mnc": "11"}
    ],
    "CAN": [
        {"name": "Rogers", "mcc": "302", "mnc": "720"},
        {"name": "Bell", "mcc": "302", "mnc": "610"},
        {"name": "Telus", "mcc": "302", "mnc": "220"},
        {"name": "Freedom", "mcc": "302", "mnc": "490"}
    ],
    "AUS": [
        {"name": "Telstra", "mcc": "505", "mnc": "01"},
        {"name": "Optus", "mcc": "505", "mnc": "02"},
        {"name": "Vodafone AU", "mcc": "505", "mnc": "03"}
    ]
}


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


# ==================== REFERENCE DATA ENDPOINTS ====================

@api_router.get("/reference/iab-categories")
async def get_iab_categories():
    """Get IAB content categories with names"""
    return {"categories": [{"code": k, "name": v} for k, v in IAB_CATEGORIES.items()]}


@api_router.get("/reference/video-placements")
async def get_video_placements():
    """Get OpenRTB 2.5 video placement types"""
    return {"placements": [{"id": k, "name": v} for k, v in VIDEO_PLACEMENTS.items()]}


@api_router.get("/reference/video-plcmt")
async def get_video_plcmt():
    """Get OpenRTB 2.6 video plcmt types"""
    return {"plcmt": [{"id": k, "name": v} for k, v in VIDEO_PLCMT.items()]}


@api_router.get("/reference/video-protocols")
async def get_video_protocols():
    """Get video protocols (VAST versions)"""
    return {"protocols": [{"id": k, "name": v} for k, v in VIDEO_PROTOCOLS.items()]}


@api_router.get("/reference/video-mimes")
async def get_video_mimes():
    """Get supported video MIME types"""
    return {"mimes": VIDEO_MIMES}


@api_router.get("/reference/pod-positions")
async def get_pod_positions():
    """Get ad pod position options"""
    return {"positions": [{"id": k, "name": v} for k, v in POD_POSITIONS.items()]}


@api_router.get("/reference/ad-placements")
async def get_ad_placements():
    """Get ad placement types"""
    return {"placements": AD_PLACEMENTS}


@api_router.get("/reference/device-types")
async def get_device_types():
    """Get device type options"""
    return {"device_types": [{"id": k, "name": v} for k, v in DEVICE_TYPES.items()]}


@api_router.get("/reference/connection-types")
async def get_connection_types():
    """Get connection type options"""
    return {"connection_types": [{"id": k, "name": v} for k, v in CONNECTION_TYPES.items()]}


@api_router.get("/reference/carriers/{country_code}")
async def get_carriers_by_country(country_code: str):
    """Get mobile carriers for a specific country"""
    country_code = country_code.upper()
    carriers = CARRIERS_BY_COUNTRY.get(country_code, [])
    return {"country": country_code, "carriers": carriers}


@api_router.get("/reference/carriers")
async def get_all_carriers():
    """Get all mobile carriers by country"""
    return {"carriers_by_country": CARRIERS_BY_COUNTRY}


@api_router.get("/reference/all")
async def get_all_reference_data():
    """Get all reference data in one call"""
    return {
        "iab_categories": IAB_CATEGORIES,
        "video_placements": VIDEO_PLACEMENTS,
        "video_plcmt": VIDEO_PLCMT,
        "video_protocols": VIDEO_PROTOCOLS,
        "video_mimes": VIDEO_MIMES,
        "pod_positions": POD_POSITIONS,
        "ad_placements": AD_PLACEMENTS,
        "device_types": DEVICE_TYPES,
        "connection_types": CONNECTION_TYPES,
        "carriers_by_country": CARRIERS_BY_COUNTRY
    }


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
        currency=input.currency,
        priority=input.priority,
        placements=input.placements,
        creative_id=input.creative_id,
        budget=input.budget,
        bid_shading=input.bid_shading,
        frequency_cap=input.frequency_cap,
        spo=input.spo,
        ml_prediction=input.ml_prediction,
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
    nested_fields = ["budget", "targeting", "bid_shading", "frequency_cap", "spo", "ml_prediction"]
    for field in nested_fields:
        if field in update_data and update_data[field]:
            update_data[field] = update_data[field].model_dump() if hasattr(update_data[field], 'model_dump') else update_data[field]
    
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
        format=input.format,
        adomain=input.adomain,
        iurl=input.iurl,
        cat=input.cat,
        banner_data=input.banner_data,
        video_data=input.video_data,
        native_data=input.native_data,
        audio_data=input.audio_data,
        js_tag=input.js_tag
    )
    
    # Generate preview URL based on creative type
    if creative.type == CreativeType.BANNER:
        if creative.banner_data and creative.banner_data.image_url:
            creative.preview_url = creative.banner_data.image_url
        elif creative.iurl:
            creative.preview_url = creative.iurl
    elif creative.type == CreativeType.VIDEO:
        if creative.video_data:
            if creative.video_data.vast_url:
                creative.preview_url = creative.video_data.vast_url
            elif creative.video_data.video_url:
                creative.preview_url = creative.video_data.video_url
    
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
        description=input.description,
        ortb_version=input.ortb_version
    )
    
    doc = endpoint.model_dump()
    for field in ["created_at", "updated_at"]:
        if doc.get(field):
            doc[field] = doc[field].isoformat()
    
    await db.ssp_endpoints.insert_one(doc)
    return endpoint


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


# ==================== SSP PERFORMANCE ANALYTICS ====================

@api_router.get("/ssp-analytics/overview")
async def get_ssp_analytics_overview():
    """Get SSP performance analytics overview"""
    endpoints = await db.ssp_endpoints.find({}, {"_id": 0}).to_list(100)
    
    total_requests = sum(e.get("total_requests", 0) for e in endpoints)
    total_bids = sum(e.get("total_bids", 0) for e in endpoints)
    total_wins = sum(e.get("total_wins", 0) for e in endpoints)
    total_spend = sum(e.get("total_spend", 0) for e in endpoints)
    
    # Calculate overall metrics
    overall_bid_rate = (total_bids / total_requests * 100) if total_requests > 0 else 0
    overall_win_rate = (total_wins / total_bids * 100) if total_bids > 0 else 0
    
    # SSP rankings
    ssp_rankings = []
    for e in endpoints:
        requests = e.get("total_requests", 0)
        bids = e.get("total_bids", 0)
        wins = e.get("total_wins", 0)
        spend = e.get("total_spend", 0)
        
        ssp_rankings.append({
            "id": e.get("id"),
            "name": e.get("name"),
            "status": e.get("status"),
            "requests": requests,
            "bids": bids,
            "wins": wins,
            "spend": spend,
            "bid_rate": round((bids / requests * 100) if requests > 0 else 0, 2),
            "win_rate": round((wins / bids * 100) if bids > 0 else 0, 2),
            "avg_response_time_ms": e.get("avg_response_time_ms", 0),
            "last_request_at": e.get("last_request_at")
        })
    
    # Sort by requests (highest first)
    ssp_rankings.sort(key=lambda x: x["requests"], reverse=True)
    
    return {
        "overview": {
            "total_ssps": len(endpoints),
            "active_ssps": len([e for e in endpoints if e.get("status") == "active"]),
            "total_requests": total_requests,
            "total_bids": total_bids,
            "total_wins": total_wins,
            "total_spend": round(total_spend, 2),
            "overall_bid_rate": round(overall_bid_rate, 2),
            "overall_win_rate": round(overall_win_rate, 2)
        },
        "ssp_rankings": ssp_rankings,
        "top_performers": {
            "by_requests": ssp_rankings[:3] if ssp_rankings else [],
            "by_win_rate": sorted([s for s in ssp_rankings if s["bids"] > 0], key=lambda x: x["win_rate"], reverse=True)[:3],
            "by_spend": sorted(ssp_rankings, key=lambda x: x["spend"], reverse=True)[:3]
        }
    }


@api_router.get("/ssp-analytics/{ssp_id}/details")
async def get_ssp_analytics_details(ssp_id: str):
    """Get detailed analytics for a specific SSP"""
    endpoint = await db.ssp_endpoints.find_one({"id": ssp_id}, {"_id": 0})
    if not endpoint:
        raise HTTPException(status_code=404, detail="SSP endpoint not found")
    
    # Get recent bid logs for this SSP
    recent_logs = await db.bid_logs.find(
        {"ssp_id": ssp_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(100).to_list(100)
    
    # Calculate hourly distribution
    hourly_dist = {}
    for log in recent_logs:
        try:
            ts = log.get("timestamp")
            if isinstance(ts, str):
                hour = datetime.fromisoformat(ts.replace("Z", "+00:00")).hour
            else:
                hour = ts.hour
            hourly_dist[hour] = hourly_dist.get(hour, 0) + 1
        except:
            pass
    
    # Response time distribution
    response_times = [log.get("response_time_ms", 0) for log in recent_logs if log.get("response_time_ms")]
    
    # Campaign distribution
    campaign_dist = {}
    for log in recent_logs:
        if log.get("bid_made") and log.get("campaign_id"):
            cid = log.get("campaign_id")
            cname = log.get("campaign_name", "Unknown")
            if cid not in campaign_dist:
                campaign_dist[cid] = {"name": cname, "bids": 0, "wins": 0}
            campaign_dist[cid]["bids"] += 1
            if log.get("win_notified"):
                campaign_dist[cid]["wins"] += 1
    
    return {
        "ssp": {
            "id": endpoint.get("id"),
            "name": endpoint.get("name"),
            "status": endpoint.get("status"),
            "endpoint_token": endpoint.get("endpoint_token"),
            "ortb_version": endpoint.get("ortb_version")
        },
        "metrics": {
            "total_requests": endpoint.get("total_requests", 0),
            "total_bids": endpoint.get("total_bids", 0),
            "total_wins": endpoint.get("total_wins", 0),
            "total_spend": endpoint.get("total_spend", 0),
            "avg_response_time_ms": endpoint.get("avg_response_time_ms", 0),
            "bid_rate": round((endpoint.get("total_bids", 0) / endpoint.get("total_requests", 1)) * 100, 2),
            "win_rate": round((endpoint.get("total_wins", 0) / max(endpoint.get("total_bids", 1), 1)) * 100, 2)
        },
        "hourly_distribution": [{"hour": h, "requests": c} for h, c in sorted(hourly_dist.items())],
        "campaign_distribution": list(campaign_dist.values()),
        "response_time_stats": {
            "avg": round(sum(response_times) / len(response_times), 2) if response_times else 0,
            "min": min(response_times) if response_times else 0,
            "max": max(response_times) if response_times else 0
        },
        "recent_activity": recent_logs[:10]
    }


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

async def _process_bid_request_internal(
    request: Request,
    x_openrtb_version: str = None,
    ssp_id: str = None
):
    """
    Internal bid request processor - shared logic for all bid endpoints
    """
    start_time = time.time()
    
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
    
    # Save bid log with SSP info
    log_data["ssp_id"] = ssp_id
    log = BidLog(**log_data)
    log_doc = log.model_dump()
    log_doc["timestamp"] = log_doc["timestamp"].isoformat()
    await db.bid_logs.insert_one(log_doc)
    
    # Update SSP stats
    if ssp_id:
        await db.ssp_endpoints.update_one(
            {"id": ssp_id},
            {"$inc": {"total_requests": 1}}
        )
        if log_data.get("bid_made"):
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
    
    # Add to real-time bid stream
    global recent_bids
    stream_entry = {
        "id": log_data.get("id"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "bid_made": log_data.get("bid_made", False),
        "campaign_name": log_data.get("campaign_name"),
        "bid_price": log_data.get("bid_price"),
        "ssp_id": ssp_id,
        "device_type": bid_request.get("device", {}).get("devicetype"),
        "geo_country": bid_request.get("device", {}).get("geo", {}).get("country"),
        "domain": bid_request.get("site", {}).get("domain") or bid_request.get("app", {}).get("bundle")
    }
    recent_bids.append(stream_entry)
    if len(recent_bids) > MAX_RECENT_BIDS:
        recent_bids = recent_bids[-MAX_RECENT_BIDS:]
    
    # Broadcast to WebSocket clients
    asyncio.create_task(broadcast_new_bid(stream_entry))
    
    # Return no-bid (204) or bid response (200)
    if not log_data.get("bid_made"):
        return Response(status_code=204)
    
    return JSONResponse(content=response, status_code=200)


@bid_router.post("/{endpoint_token}")
async def handle_bid_request_by_token(
    request: Request,
    endpoint_token: str,
    x_openrtb_version: str = Header(None)
):
    """
    Handle OpenRTB bid requests for a specific SSP by unique token
    URL: /api/bid/{endpoint_token} (e.g., /api/bid/a1b2c3d4e5f6g7h8)
    No authentication required - SSP identified by unique token
    """
    import time as time_module
    start_time = time_module.time()
    
    # Look up SSP by endpoint_token
    endpoint = await db.ssp_endpoints.find_one(
        {"endpoint_token": endpoint_token},
        {"_id": 0}
    )
    
    if not endpoint:
        raise HTTPException(status_code=404, detail=f"SSP endpoint not found")
    
    if endpoint.get("status") != "active":
        raise HTTPException(status_code=403, detail="SSP endpoint is inactive")
    
    # Process the bid request
    response = await _process_bid_request_internal(request, x_openrtb_version, endpoint.get("id"))
    
    # Update performance metrics
    response_time_ms = (time_module.time() - start_time) * 1000
    await db.ssp_endpoints.update_one(
        {"id": endpoint.get("id")},
        {
            "$set": {"last_request_at": datetime.now(timezone.utc).isoformat()},
            "$inc": {"total_requests": 1}
        }
    )
    
    # Update avg response time (rolling average)
    current_avg = endpoint.get("avg_response_time_ms", 0)
    total_reqs = endpoint.get("total_requests", 0) + 1
    new_avg = ((current_avg * (total_reqs - 1)) + response_time_ms) / total_reqs
    await db.ssp_endpoints.update_one(
        {"id": endpoint.get("id")},
        {"$set": {"avg_response_time_ms": round(new_avg, 2)}}
    )
    
    return response


@bid_router.post("")
@bid_router.post("/")
async def handle_bid_request(
    request: Request,
    x_openrtb_version: str = Header(None)
):
    """
    Handle OpenRTB bid requests from SSPs (generic endpoint)
    Supports both OpenRTB 2.5 and 2.6
    No authentication required - open endpoint for SSPs
    Note: For SSP-specific tracking, use /api/bid/{ssp_name} instead
    """
    return await _process_bid_request_internal(request, x_openrtb_version, None)


# Legacy compatibility - kept for reference but logic moved to internal function
async def _legacy_bid_handler():
    pass  # Removed - all logic in _process_bid_request_internal


@api_router.get("/ssp-endpoints/{endpoint_id}/endpoint-url")
async def get_ssp_endpoint_url(endpoint_id: str, request: Request):
    """Get the unique bid endpoint URL for an SSP"""
    endpoint = await db.ssp_endpoints.find_one({"id": endpoint_id}, {"_id": 0})
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    
    base_url = os.environ.get('REACT_APP_BACKEND_URL', str(request.base_url).rstrip('/'))
    
    return {
        "endpoint_url": f"{base_url}/api/bid/{endpoint.get('endpoint_token')}",
        "generic_url": f"{base_url}/api/bid",
        "endpoint_token": endpoint.get("endpoint_token"),
        "ortb_version": endpoint.get("ortb_version", "2.5")
    }


@api_router.post("/ssp-endpoints/{endpoint_id}/regenerate-token")
async def regenerate_endpoint_token(endpoint_id: str):
    """Regenerate the unique endpoint token for an SSP"""
    new_token = uuid.uuid4().hex[:16]
    
    result = await db.ssp_endpoints.update_one(
        {"id": endpoint_id},
        {"$set": {"endpoint_token": new_token, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    
    return {"endpoint_token": new_token}


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


# ==================== REPORT EXPORTS ====================

@api_router.get("/reports/export/csv")
async def export_report_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    campaign_id: Optional[str] = None
):
    """Export report data as CSV"""
    import csv
    import io
    
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
    
    # Build query
    query = {
        "timestamp": {
            "$gte": start_dt.isoformat(),
            "$lte": (end_dt + timedelta(days=1)).isoformat()
        }
    }
    if campaign_id:
        query["campaign_id"] = campaign_id
    
    # Get bid logs
    logs = await db.bid_logs.find(
        query,
        {"_id": 0, "id": 1, "request_id": 1, "timestamp": 1, "bid_made": 1, 
         "bid_price": 1, "shaded_price": 1, "win_notified": 1, "win_price": 1,
         "campaign_id": 1, "openrtb_version": 1, "processing_time_ms": 1}
    ).sort("timestamp", -1).to_list(10000)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "id", "request_id", "timestamp", "bid_made", "bid_price", 
        "shaded_price", "win_notified", "win_price", "campaign_id", 
        "openrtb_version", "processing_time_ms"
    ])
    writer.writeheader()
    for log in logs:
        writer.writerow(log)
    
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=report_{start_date}_{end_date}.csv"
        }
    )


@api_router.get("/reports/export/json")
async def export_report_json(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    campaign_id: Optional[str] = None
):
    """Export report data as JSON"""
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
    
    # Get summary
    summary_data = await get_report_summary(start_date, end_date)
    
    # Get campaigns
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(1000)
    
    export_data = {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "date_range": {
            "start": start_date,
            "end": end_date
        },
        "summary": summary_data,
        "campaigns": [
            {
                "id": c["id"],
                "name": c["name"],
                "status": c["status"],
                "bid_price": c["bid_price"],
                "impressions": c.get("impressions", 0),
                "clicks": c.get("clicks", 0),
                "wins": c.get("wins", 0),
                "bids": c.get("bids", 0),
                "spend": c.get("budget", {}).get("total_spend", 0),
                "win_rate": c.get("recent_win_rate", 0),
                "avg_win_price": c.get("avg_win_price", 0)
            }
            for c in campaigns
        ]
    }
    
    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f"attachment; filename=report_{start_date}_{end_date}.json"
        }
    )


# ==================== FREQUENCY CAPPING ====================

@api_router.get("/frequency/{campaign_id}/{user_id}")
async def get_user_frequency(campaign_id: str, user_id: str):
    """Get impression frequency for a user on a campaign"""
    freq = await db.user_frequencies.find_one(
        {"campaign_id": campaign_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not freq:
        return {"campaign_id": campaign_id, "user_id": user_id, "impression_count": 0}
    
    return freq


@api_router.post("/frequency/record")
async def record_impression(campaign_id: str, user_id: str):
    """Record an impression for frequency capping"""
    now = datetime.now(timezone.utc)
    hour_key = now.strftime("%Y-%m-%d-%H")
    
    result = await db.user_frequencies.update_one(
        {"campaign_id": campaign_id, "user_id": user_id},
        {
            "$inc": {"impression_count": 1, f"hourly_impressions.{hour_key}": 1},
            "$set": {"last_impression": now.isoformat()}
        },
        upsert=True
    )
    
    return {"status": "recorded", "campaign_id": campaign_id, "user_id": user_id}


@api_router.delete("/frequency/reset/{campaign_id}")
async def reset_campaign_frequency(campaign_id: str):
    """Reset all frequency data for a campaign"""
    result = await db.user_frequencies.delete_many({"campaign_id": campaign_id})
    return {"status": "reset", "deleted_count": result.deleted_count}


# ==================== ML PREDICTION ====================

@api_router.get("/ml/stats/{campaign_id}")
async def get_ml_stats(campaign_id: str):
    """Get ML model statistics for a campaign"""
    stats = await db.ml_model_stats.find(
        {"campaign_id": campaign_id},
        {"_id": 0}
    ).to_list(1000)
    
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    
    return {
        "campaign_id": campaign_id,
        "ml_enabled": campaign.get("ml_prediction", {}).get("enabled", False) if campaign else False,
        "feature_stats": stats,
        "total_data_points": sum(s.get("total_bids", 0) for s in stats)
    }


@api_router.post("/ml/train/{campaign_id}")
async def train_ml_model(campaign_id: str):
    """Train/update ML model from historical data"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get historical bid logs for this campaign
    logs = await db.bid_logs.find(
        {"campaign_id": campaign_id, "bid_made": True},
        {"_id": 0}
    ).to_list(10000)
    
    if len(logs) < 100:
        return {
            "status": "insufficient_data",
            "data_points": len(logs),
            "required": 100
        }
    
    # Aggregate stats by feature
    feature_stats = {}
    
    for log in logs:
        summary = log.get("request_summary", {})
        
        # Device type feature
        device_type = summary.get("device_type")
        if device_type:
            key = f"device_type:{device_type}"
            if key not in feature_stats:
                feature_stats[key] = {"bids": 0, "wins": 0, "total_price": 0, "total_win_price": 0}
            feature_stats[key]["bids"] += 1
            feature_stats[key]["total_price"] += log.get("shaded_price") or log.get("bid_price", 0)
            if log.get("win_notified"):
                feature_stats[key]["wins"] += 1
                feature_stats[key]["total_win_price"] += log.get("win_price", 0)
        
        # Geo country feature
        country = summary.get("country")
        if country:
            key = f"geo_country:{country}"
            if key not in feature_stats:
                feature_stats[key] = {"bids": 0, "wins": 0, "total_price": 0, "total_win_price": 0}
            feature_stats[key]["bids"] += 1
            feature_stats[key]["total_price"] += log.get("shaded_price") or log.get("bid_price", 0)
            if log.get("win_notified"):
                feature_stats[key]["wins"] += 1
                feature_stats[key]["total_win_price"] += log.get("win_price", 0)
        
        # OS feature
        os_name = summary.get("os")
        if os_name:
            key = f"os:{os_name}"
            if key not in feature_stats:
                feature_stats[key] = {"bids": 0, "wins": 0, "total_price": 0, "total_win_price": 0}
            feature_stats[key]["bids"] += 1
            feature_stats[key]["total_price"] += log.get("shaded_price") or log.get("bid_price", 0)
            if log.get("win_notified"):
                feature_stats[key]["wins"] += 1
                feature_stats[key]["total_win_price"] += log.get("win_price", 0)
    
    # Save to database
    now = datetime.now(timezone.utc)
    for key, stats in feature_stats.items():
        win_rate = stats["wins"] / stats["bids"] if stats["bids"] > 0 else 0
        avg_bid = stats["total_price"] / stats["bids"] if stats["bids"] > 0 else 0
        avg_win = stats["total_win_price"] / stats["wins"] if stats["wins"] > 0 else 0
        
        await db.ml_model_stats.update_one(
            {"campaign_id": campaign_id, "feature_key": key},
            {"$set": {
                "total_bids": stats["bids"],
                "total_wins": stats["wins"],
                "win_rate": win_rate,
                "avg_bid_price": avg_bid,
                "avg_win_price": avg_win,
                "last_updated": now.isoformat()
            }},
            upsert=True
        )
    
    return {
        "status": "trained",
        "campaign_id": campaign_id,
        "data_points": len(logs),
        "features_trained": len(feature_stats)
    }


@api_router.post("/ml/predict")
async def predict_bid_price(campaign_id: str, features: BidPredictionFeatures):
    """Predict optimal bid price based on features"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    base_price = campaign.get("bid_price", 1.0)
    ml_config = campaign.get("ml_prediction", {})
    
    if not ml_config.get("enabled"):
        return {
            "campaign_id": campaign_id,
            "predicted_price": base_price,
            "adjustment_factor": 1.0,
            "ml_enabled": False
        }
    
    # Get feature stats
    adjustments = []
    feature_weights = ml_config.get("feature_weights", {})
    
    # Check device type
    if features.device_type:
        stats = await db.ml_model_stats.find_one(
            {"campaign_id": campaign_id, "feature_key": f"device_type:{features.device_type}"},
            {"_id": 0}
        )
        if stats and stats.get("total_bids", 0) >= 10:
            win_rate = stats.get("win_rate", 0.3)
            target_rate = ml_config.get("target_win_rate", 0.3)
            # Adjust based on win rate vs target
            adjustment = 1.0 + (target_rate - win_rate) * feature_weights.get("device_type", 0.15)
            adjustments.append(adjustment)
    
    # Check geo country
    if features.geo_country:
        stats = await db.ml_model_stats.find_one(
            {"campaign_id": campaign_id, "feature_key": f"geo_country:{features.geo_country}"},
            {"_id": 0}
        )
        if stats and stats.get("total_bids", 0) >= 10:
            win_rate = stats.get("win_rate", 0.3)
            target_rate = ml_config.get("target_win_rate", 0.3)
            adjustment = 1.0 + (target_rate - win_rate) * feature_weights.get("geo_country", 0.15)
            adjustments.append(adjustment)
    
    # Bid floor consideration
    if features.bid_floor:
        if features.bid_floor > base_price * 0.9:
            # Need to bid higher for high floor
            adjustments.append(1.1)
    
    # Calculate final adjustment
    if adjustments:
        avg_adjustment = sum(adjustments) / len(adjustments)
        # Blend with base using prediction weight
        weight = ml_config.get("prediction_weight", 0.5)
        final_adjustment = 1.0 * (1 - weight) + avg_adjustment * weight
    else:
        final_adjustment = 1.0
    
    # Clamp to reasonable range
    final_adjustment = max(0.5, min(1.5, final_adjustment))
    predicted_price = base_price * final_adjustment
    
    return {
        "campaign_id": campaign_id,
        "base_price": base_price,
        "predicted_price": round(predicted_price, 4),
        "adjustment_factor": round(final_adjustment, 4),
        "adjustments_applied": len(adjustments),
        "ml_enabled": True
    }


# ==================== AUTOMATED BID OPTIMIZATION ====================

@api_router.get("/bid-optimization/status")
async def get_bid_optimization_status():
    """Get status of automated bid optimization for all campaigns"""
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(1000)
    
    optimization_status = []
    for campaign in campaigns:
        opt_config = campaign.get("bid_optimization", {})
        budget = campaign.get("budget", {})
        
        optimization_status.append({
            "campaign_id": campaign["id"],
            "campaign_name": campaign["name"],
            "status": campaign.get("status"),
            "bid_price": campaign.get("bid_price", 0),
            "optimization_enabled": opt_config.get("enabled", False),
            "target_win_rate": opt_config.get("target_win_rate", 30),
            "current_win_rate": round((campaign.get("wins", 0) / max(campaign.get("bids", 1), 1)) * 100, 2),
            "auto_adjust": opt_config.get("auto_adjust", False),
            "last_adjustment": opt_config.get("last_adjustment"),
            "adjustment_history": opt_config.get("history", [])[-5:]  # Last 5 adjustments
        })
    
    return {
        "total_campaigns": len(campaigns),
        "optimization_enabled_count": len([c for c in optimization_status if c["optimization_enabled"]]),
        "campaigns": optimization_status
    }


@api_router.post("/bid-optimization/{campaign_id}/enable")
async def enable_bid_optimization(campaign_id: str, target_win_rate: float = 30.0, auto_adjust: bool = True):
    """Enable automated bid optimization for a campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    opt_config = {
        "enabled": True,
        "target_win_rate": target_win_rate,
        "auto_adjust": auto_adjust,
        "min_bid_price": campaign.get("bid_price", 1.0) * 0.5,  # Floor at 50% of base
        "max_bid_price": campaign.get("bid_price", 1.0) * 2.0,  # Ceiling at 200% of base
        "adjustment_step": 0.05,  # 5% adjustment per iteration
        "evaluation_window_hours": 24,
        "min_bids_for_adjustment": 100,
        "history": [],
        "last_adjustment": None
    }
    
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"bid_optimization": opt_config}}
    )
    
    return {"status": "enabled", "config": opt_config}


@api_router.post("/bid-optimization/{campaign_id}/disable")
async def disable_bid_optimization(campaign_id: str):
    """Disable automated bid optimization for a campaign"""
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"bid_optimization.enabled": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"status": "disabled"}


@api_router.post("/bid-optimization/{campaign_id}/run")
async def run_bid_optimization(campaign_id: str):
    """Manually trigger bid optimization for a campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    opt_config = campaign.get("bid_optimization", {})
    if not opt_config.get("enabled"):
        raise HTTPException(status_code=400, detail="Bid optimization not enabled for this campaign")
    
    current_bid = campaign.get("bid_price", 1.0)
    bids = campaign.get("bids", 0)
    wins = campaign.get("wins", 0)
    current_win_rate = (wins / bids * 100) if bids > 0 else 0
    target_win_rate = opt_config.get("target_win_rate", 30)
    
    # Check if enough data
    if bids < opt_config.get("min_bids_for_adjustment", 100):
        return {
            "status": "skipped",
            "reason": f"Not enough bids ({bids}) for adjustment. Need at least {opt_config.get('min_bids_for_adjustment', 100)}",
            "current_bid": current_bid,
            "current_win_rate": round(current_win_rate, 2)
        }
    
    # Calculate adjustment
    adjustment_step = opt_config.get("adjustment_step", 0.05)
    min_bid = opt_config.get("min_bid_price", current_bid * 0.5)
    max_bid = opt_config.get("max_bid_price", current_bid * 2.0)
    
    new_bid = current_bid
    adjustment_reason = ""
    
    if current_win_rate < target_win_rate - 5:  # Below target by 5%+
        # Increase bid to win more
        new_bid = min(current_bid * (1 + adjustment_step), max_bid)
        adjustment_reason = f"Win rate ({current_win_rate:.1f}%) below target ({target_win_rate}%), increasing bid"
    elif current_win_rate > target_win_rate + 10:  # Above target by 10%+
        # Decrease bid to save budget
        new_bid = max(current_bid * (1 - adjustment_step), min_bid)
        adjustment_reason = f"Win rate ({current_win_rate:.1f}%) above target ({target_win_rate}%), decreasing bid to optimize cost"
    else:
        return {
            "status": "no_change",
            "reason": f"Win rate ({current_win_rate:.1f}%) within acceptable range of target ({target_win_rate}%)",
            "current_bid": current_bid,
            "current_win_rate": round(current_win_rate, 2)
        }
    
    # Record adjustment
    adjustment_record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "old_bid": current_bid,
        "new_bid": round(new_bid, 4),
        "win_rate_at_change": round(current_win_rate, 2),
        "target_win_rate": target_win_rate,
        "reason": adjustment_reason
    }
    
    # Apply if auto_adjust is enabled
    if opt_config.get("auto_adjust"):
        await db.campaigns.update_one(
            {"id": campaign_id},
            {
                "$set": {
                    "bid_price": round(new_bid, 4),
                    "bid_optimization.last_adjustment": datetime.now(timezone.utc).isoformat()
                },
                "$push": {"bid_optimization.history": adjustment_record}
            }
        )
        
        return {
            "status": "adjusted",
            "old_bid": current_bid,
            "new_bid": round(new_bid, 4),
            "adjustment_percent": round((new_bid - current_bid) / current_bid * 100, 2),
            "reason": adjustment_reason,
            "current_win_rate": round(current_win_rate, 2),
            "target_win_rate": target_win_rate
        }
    else:
        # Just recommend, don't apply
        return {
            "status": "recommendation",
            "current_bid": current_bid,
            "recommended_bid": round(new_bid, 4),
            "reason": adjustment_reason,
            "note": "Auto-adjust is disabled. Enable to apply automatically."
        }


@api_router.get("/bid-optimization/{campaign_id}/history")
async def get_optimization_history(campaign_id: str):
    """Get bid optimization history for a campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    opt_config = campaign.get("bid_optimization", {})
    
    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.get("name"),
        "current_bid": campaign.get("bid_price"),
        "optimization_enabled": opt_config.get("enabled", False),
        "target_win_rate": opt_config.get("target_win_rate"),
        "history": opt_config.get("history", [])
    }


# ==================== SPO (Supply Path Optimization) ====================

@api_router.get("/spo/analyze/{campaign_id}")
async def analyze_supply_paths(campaign_id: str):
    """Analyze supply paths for a campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get bid logs with schain data
    logs = await db.bid_logs.find(
        {"campaign_id": campaign_id, "bid_made": True},
        {"_id": 0, "request_summary": 1, "win_notified": 1, "win_price": 1, "shaded_price": 1, "bid_price": 1}
    ).to_list(5000)
    
    # Analyze by SSP/supply path
    path_stats = {}
    
    for log in logs:
        summary = log.get("request_summary", {})
        # Use bundle or domain as path identifier
        path_key = summary.get("bundle") or summary.get("domain") or "unknown"
        
        if path_key not in path_stats:
            path_stats[path_key] = {
                "bids": 0,
                "wins": 0,
                "total_bid_price": 0,
                "total_win_price": 0
            }
        
        path_stats[path_key]["bids"] += 1
        path_stats[path_key]["total_bid_price"] += log.get("shaded_price") or log.get("bid_price", 0)
        
        if log.get("win_notified"):
            path_stats[path_key]["wins"] += 1
            path_stats[path_key]["total_win_price"] += log.get("win_price", 0)
    
    # Calculate metrics
    paths = []
    for path_key, stats in path_stats.items():
        win_rate = stats["wins"] / stats["bids"] if stats["bids"] > 0 else 0
        avg_bid = stats["total_bid_price"] / stats["bids"] if stats["bids"] > 0 else 0
        avg_win = stats["total_win_price"] / stats["wins"] if stats["wins"] > 0 else 0
        efficiency = win_rate / avg_bid if avg_bid > 0 else 0
        
        paths.append({
            "path": path_key,
            "bids": stats["bids"],
            "wins": stats["wins"],
            "win_rate": round(win_rate * 100, 2),
            "avg_bid_price": round(avg_bid, 2),
            "avg_win_price": round(avg_win, 2),
            "efficiency_score": round(efficiency * 100, 2)
        })
    
    # Sort by efficiency
    paths.sort(key=lambda x: x["efficiency_score"], reverse=True)
    
    spo_config = campaign.get("spo", {})
    
    return {
        "campaign_id": campaign_id,
        "spo_enabled": spo_config.get("enabled", False),
        "total_paths_analyzed": len(paths),
        "recommended_paths": paths[:10],  # Top 10 by efficiency
        "underperforming_paths": [p for p in paths if p["win_rate"] < 10][-10:],  # Bottom performers
        "paths": paths
    }


# ==================== CROSS-CAMPAIGN ATTRIBUTION ====================

@api_router.post("/attribution/track")
async def track_attribution_event(
    user_id: str,
    campaign_id: str,
    event_type: str,  # impression, click, conversion
    event_value: float = 0.0
):
    """Track an attribution event for cross-campaign analysis"""
    event = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "campaign_id": campaign_id,
        "event_type": event_type,
        "event_value": event_value,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.attribution_events.insert_one(event)
    
    return {"status": "tracked", "event_id": event["id"]}


@api_router.get("/attribution/user/{user_id}")
async def get_user_journey(user_id: str):
    """Get the complete attribution journey for a user"""
    events = await db.attribution_events.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    if not events:
        return {"user_id": user_id, "journey": [], "campaigns_touched": []}
    
    # Build journey
    campaigns_touched = list(set(e["campaign_id"] for e in events))
    
    # Get campaign names
    campaign_names = {}
    for cid in campaigns_touched:
        campaign = await db.campaigns.find_one({"id": cid}, {"_id": 0, "name": 1})
        if campaign:
            campaign_names[cid] = campaign.get("name", "Unknown")
    
    journey = []
    for event in events:
        journey.append({
            "campaign_id": event["campaign_id"],
            "campaign_name": campaign_names.get(event["campaign_id"], "Unknown"),
            "event_type": event["event_type"],
            "event_value": event.get("event_value", 0),
            "timestamp": event["timestamp"]
        })
    
    return {
        "user_id": user_id,
        "campaigns_touched": len(campaigns_touched),
        "total_events": len(events),
        "journey": journey,
        "first_touch": journey[0] if journey else None,
        "last_touch": journey[-1] if journey else None
    }


@api_router.get("/attribution/analysis")
async def get_attribution_analysis(model: str = "last_touch"):
    """
    Get cross-campaign attribution analysis
    Models: first_touch, last_touch, linear, time_decay
    """
    # Get all conversion events
    conversions = await db.attribution_events.find(
        {"event_type": "conversion"},
        {"_id": 0}
    ).to_list(10000)
    
    if not conversions:
        return {
            "model": model,
            "total_conversions": 0,
            "attribution": [],
            "message": "No conversion data available"
        }
    
    # Group by user to build journeys
    user_journeys = {}
    all_events = await db.attribution_events.find({}, {"_id": 0}).sort("timestamp", 1).to_list(100000)
    
    for event in all_events:
        uid = event["user_id"]
        if uid not in user_journeys:
            user_journeys[uid] = []
        user_journeys[uid].append(event)
    
    # Calculate attribution based on model
    campaign_attribution = {}
    
    for uid, journey in user_journeys.items():
        conversions_in_journey = [e for e in journey if e["event_type"] == "conversion"]
        if not conversions_in_journey:
            continue
        
        touchpoints = [e for e in journey if e["event_type"] in ["impression", "click"]]
        if not touchpoints:
            continue
        
        total_conversion_value = sum(c.get("event_value", 1) for c in conversions_in_journey)
        
        if model == "first_touch":
            # 100% credit to first touchpoint
            cid = touchpoints[0]["campaign_id"]
            if cid not in campaign_attribution:
                campaign_attribution[cid] = {"conversions": 0, "value": 0, "impressions": 0, "clicks": 0}
            campaign_attribution[cid]["conversions"] += len(conversions_in_journey)
            campaign_attribution[cid]["value"] += total_conversion_value
            
        elif model == "last_touch":
            # 100% credit to last touchpoint before conversion
            cid = touchpoints[-1]["campaign_id"]
            if cid not in campaign_attribution:
                campaign_attribution[cid] = {"conversions": 0, "value": 0, "impressions": 0, "clicks": 0}
            campaign_attribution[cid]["conversions"] += len(conversions_in_journey)
            campaign_attribution[cid]["value"] += total_conversion_value
            
        elif model == "linear":
            # Equal credit to all touchpoints
            credit_per_touch = total_conversion_value / len(touchpoints)
            for tp in touchpoints:
                cid = tp["campaign_id"]
                if cid not in campaign_attribution:
                    campaign_attribution[cid] = {"conversions": 0, "value": 0, "impressions": 0, "clicks": 0}
                campaign_attribution[cid]["conversions"] += len(conversions_in_journey) / len(touchpoints)
                campaign_attribution[cid]["value"] += credit_per_touch
                
        elif model == "time_decay":
            # More credit to recent touchpoints (exponential decay)
            decay_factor = 0.7  # 30% decay per step back
            total_weight = sum(decay_factor ** i for i in range(len(touchpoints)))
            
            for idx, tp in enumerate(reversed(touchpoints)):
                weight = (decay_factor ** idx) / total_weight
                cid = tp["campaign_id"]
                if cid not in campaign_attribution:
                    campaign_attribution[cid] = {"conversions": 0, "value": 0, "impressions": 0, "clicks": 0}
                campaign_attribution[cid]["conversions"] += len(conversions_in_journey) * weight
                campaign_attribution[cid]["value"] += total_conversion_value * weight
    
    # Get campaign names and build results
    results = []
    for cid, stats in campaign_attribution.items():
        campaign = await db.campaigns.find_one({"id": cid}, {"_id": 0, "name": 1})
        results.append({
            "campaign_id": cid,
            "campaign_name": campaign.get("name", "Unknown") if campaign else "Unknown",
            "attributed_conversions": round(stats["conversions"], 2),
            "attributed_value": round(stats["value"], 2),
            "attribution_share": 0  # Will calculate below
        })
    
    # Calculate attribution share
    total_conversions = sum(r["attributed_conversions"] for r in results)
    for r in results:
        r["attribution_share"] = round((r["attributed_conversions"] / total_conversions * 100) if total_conversions > 0 else 0, 2)
    
    # Sort by attributed value
    results.sort(key=lambda x: x["attributed_value"], reverse=True)
    
    return {
        "model": model,
        "total_conversions": total_conversions,
        "total_value": sum(r["attributed_value"] for r in results),
        "attribution": results,
        "available_models": ["first_touch", "last_touch", "linear", "time_decay"]
    }


# ==================== CAMPAIGN PERFORMANCE INSIGHTS ====================

@api_router.get("/insights/campaigns")
async def get_campaign_insights():
    """
    Analyze all campaigns and provide actionable insights
    Returns health scores, issues, and recommendations
    """
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(1000)
    
    insights = []
    overall_health = {"healthy": 0, "warning": 0, "critical": 0}
    
    for campaign in campaigns:
        campaign_insight = {
            "campaign_id": campaign["id"],
            "campaign_name": campaign["name"],
            "status": campaign.get("status", "draft"),
            "health_score": 100,
            "health_status": "healthy",
            "issues": [],
            "recommendations": [],
            "metrics": {}
        }
        
        # Calculate metrics
        bids = campaign.get("bids", 0)
        wins = campaign.get("wins", 0)
        impressions = campaign.get("impressions", 0)
        clicks = campaign.get("clicks", 0)
        budget = campaign.get("budget", {})
        daily_budget = budget.get("daily_budget", 0)
        daily_spend = budget.get("daily_spend", 0)
        total_budget = budget.get("total_budget", 0)
        total_spend = budget.get("total_spend", 0)
        
        win_rate = (wins / bids * 100) if bids > 0 else 0
        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        budget_utilization = (daily_spend / daily_budget * 100) if daily_budget > 0 else 0
        
        campaign_insight["metrics"] = {
            "bids": bids,
            "wins": wins,
            "win_rate": round(win_rate, 2),
            "impressions": impressions,
            "clicks": clicks,
            "ctr": round(ctr, 2),
            "daily_spend": daily_spend,
            "daily_budget": daily_budget,
            "budget_utilization": round(budget_utilization, 2)
        }
        
        # Win Rate Analysis
        if bids >= 10:  # Only analyze if enough data
            if win_rate < 5:
                campaign_insight["issues"].append({
                    "type": "critical",
                    "category": "win_rate",
                    "message": f"Very low win rate ({win_rate:.1f}%)",
                    "impact": "Campaign is not competitive"
                })
                campaign_insight["recommendations"].append({
                    "action": "increase_bid",
                    "message": f"Increase bid price by 20-30% (current: ${campaign.get('bid_price', 0):.2f})",
                    "priority": "high"
                })
                campaign_insight["health_score"] -= 40
            elif win_rate < 15:
                campaign_insight["issues"].append({
                    "type": "warning",
                    "category": "win_rate",
                    "message": f"Low win rate ({win_rate:.1f}%)",
                    "impact": "May miss valuable impressions"
                })
                campaign_insight["recommendations"].append({
                    "action": "increase_bid",
                    "message": f"Consider increasing bid by 10-15%",
                    "priority": "medium"
                })
                campaign_insight["health_score"] -= 20
            elif win_rate > 70:
                campaign_insight["issues"].append({
                    "type": "info",
                    "category": "win_rate",
                    "message": f"Very high win rate ({win_rate:.1f}%)",
                    "impact": "May be overbidding"
                })
                campaign_insight["recommendations"].append({
                    "action": "enable_shading",
                    "message": "Enable bid shading to reduce costs while maintaining wins",
                    "priority": "medium"
                })
        
        # Budget Pacing Analysis
        if daily_budget > 0:
            current_hour = datetime.now(timezone.utc).hour
            ideal_utilization = (current_hour / 24) * 100
            
            if budget_utilization > ideal_utilization + 20:
                campaign_insight["issues"].append({
                    "type": "warning",
                    "category": "pacing",
                    "message": f"Overpacing ({budget_utilization:.0f}% spent, ideal: {ideal_utilization:.0f}%)",
                    "impact": "Budget may exhaust early"
                })
                campaign_insight["recommendations"].append({
                    "action": "reduce_bid",
                    "message": "Reduce bid price or enable even pacing",
                    "priority": "high"
                })
                campaign_insight["health_score"] -= 15
            elif budget_utilization < ideal_utilization - 30 and current_hour > 6:
                campaign_insight["issues"].append({
                    "type": "warning",
                    "category": "pacing",
                    "message": f"Underpacing ({budget_utilization:.0f}% spent, ideal: {ideal_utilization:.0f}%)",
                    "impact": "Not capturing available inventory"
                })
                campaign_insight["recommendations"].append({
                    "action": "increase_bid",
                    "message": "Increase bid or expand targeting to spend budget",
                    "priority": "medium"
                })
                campaign_insight["health_score"] -= 10
        
        # Total Budget Check
        if total_budget > 0:
            total_utilization = (total_spend / total_budget) * 100
            if total_utilization >= 90:
                campaign_insight["issues"].append({
                    "type": "critical",
                    "category": "budget",
                    "message": f"Budget nearly exhausted ({total_utilization:.0f}%)",
                    "impact": "Campaign will stop soon"
                })
                campaign_insight["recommendations"].append({
                    "action": "increase_budget",
                    "message": "Increase total budget to continue campaign",
                    "priority": "high"
                })
                campaign_insight["health_score"] -= 30
        
        # Frequency Cap Analysis
        freq_cap = campaign.get("frequency_cap", {})
        if freq_cap.get("enabled"):
            # Check if hitting caps frequently
            freq_count = await db.user_frequencies.count_documents({
                "campaign_id": campaign["id"],
                "impression_count": {"$gte": freq_cap.get("max_impressions_total", 10)}
            })
            if freq_count > 100:
                campaign_insight["issues"].append({
                    "type": "info",
                    "category": "frequency",
                    "message": f"{freq_count} users have hit frequency cap",
                    "impact": "May be limiting reach"
                })
                campaign_insight["recommendations"].append({
                    "action": "expand_targeting",
                    "message": "Expand geo or device targeting to reach more users",
                    "priority": "low"
                })
        
        # Bid Shading Analysis
        bid_shading = campaign.get("bid_shading", {})
        if not bid_shading.get("enabled") and win_rate > 50 and bids > 50:
            campaign_insight["recommendations"].append({
                "action": "enable_shading",
                "message": "High win rate detected - enable bid shading to save 15-30% on costs",
                "priority": "medium"
            })
        
        # ML Prediction Analysis
        ml_config = campaign.get("ml_prediction", {})
        if not ml_config.get("enabled") and bids >= 100:
            campaign_insight["recommendations"].append({
                "action": "enable_ml",
                "message": "Enough data available - enable ML prediction for smarter bidding",
                "priority": "low"
            })
        
        # SPO Analysis
        spo_config = campaign.get("spo", {})
        if not spo_config.get("enabled") and bids >= 200:
            campaign_insight["recommendations"].append({
                "action": "enable_spo",
                "message": "Consider enabling SPO to optimize supply paths",
                "priority": "low"
            })
        
        # Determine health status
        if campaign_insight["health_score"] >= 80:
            campaign_insight["health_status"] = "healthy"
            overall_health["healthy"] += 1
        elif campaign_insight["health_score"] >= 50:
            campaign_insight["health_status"] = "warning"
            overall_health["warning"] += 1
        else:
            campaign_insight["health_status"] = "critical"
            overall_health["critical"] += 1
        
        campaign_insight["health_score"] = max(0, campaign_insight["health_score"])
        insights.append(campaign_insight)
    
    # Sort by health score (worst first)
    insights.sort(key=lambda x: x["health_score"])
    
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "overall_health": overall_health,
        "total_campaigns": len(campaigns),
        "campaigns_needing_attention": len([i for i in insights if i["health_status"] != "healthy"]),
        "insights": insights
    }


@api_router.get("/insights/campaign/{campaign_id}")
async def get_single_campaign_insight(campaign_id: str):
    """Get detailed insights for a single campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get all insights and filter
    all_insights = await get_campaign_insights()
    for insight in all_insights["insights"]:
        if insight["campaign_id"] == campaign_id:
            # Add additional detailed data
            insight["bid_history"] = await get_bid_history(campaign_id)
            insight["ml_stats"] = await get_ml_summary(campaign_id)
            return insight
    
    raise HTTPException(status_code=404, detail="Insight not found")


async def get_bid_history(campaign_id: str) -> list:
    """Get recent bid history for trend analysis"""
    pipeline = [
        {"$match": {"campaign_id": campaign_id}},
        {"$sort": {"timestamp": -1}},
        {"$limit": 100},
        {"$group": {
            "_id": {"$substr": ["$timestamp", 0, 13]},  # Group by hour
            "bids": {"$sum": 1},
            "wins": {"$sum": {"$cond": ["$win_notified", 1, 0]}},
            "avg_price": {"$avg": {"$ifNull": ["$shaded_price", "$bid_price"]}}
        }},
        {"$sort": {"_id": -1}},
        {"$limit": 24}
    ]
    history = await db.bid_logs.aggregate(pipeline).to_list(24)
    return [{"hour": h["_id"], "bids": h["bids"], "wins": h["wins"], "avg_price": round(h["avg_price"] or 0, 2)} for h in history]


async def get_ml_summary(campaign_id: str) -> dict:
    """Get ML model summary"""
    stats = await db.ml_model_stats.find(
        {"campaign_id": campaign_id},
        {"_id": 0}
    ).to_list(100)
    
    if not stats:
        return {"trained": False, "features": 0}
    
    return {
        "trained": True,
        "features": len(stats),
        "total_data_points": sum(s.get("total_bids", 0) for s in stats),
        "top_features": sorted(stats, key=lambda x: x.get("total_bids", 0), reverse=True)[:5]
    }


@api_router.post("/insights/apply-recommendation/{campaign_id}")
async def apply_recommendation(campaign_id: str, action: str):
    """Apply a recommendation to a campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    update_data = {}
    message = ""
    
    if action == "increase_bid":
        new_price = campaign.get("bid_price", 1.0) * 1.15
        update_data["bid_price"] = round(new_price, 2)
        message = f"Bid price increased to ${new_price:.2f}"
    
    elif action == "reduce_bid":
        new_price = campaign.get("bid_price", 1.0) * 0.85
        update_data["bid_price"] = round(new_price, 2)
        message = f"Bid price reduced to ${new_price:.2f}"
    
    elif action == "enable_shading":
        update_data["bid_shading"] = {
            "enabled": True,
            "min_shade_factor": 0.5,
            "max_shade_factor": 0.95,
            "target_win_rate": 0.3,
            "learning_rate": 0.1,
            "current_shade_factor": 0.85
        }
        message = "Bid shading enabled with default settings"
    
    elif action == "enable_ml":
        update_data["ml_prediction"] = {
            "enabled": True,
            "use_historical_data": True,
            "prediction_weight": 0.5,
            "min_data_points": 100
        }
        message = "ML prediction enabled"
    
    elif action == "enable_spo":
        update_data["spo"] = {
            "enabled": True,
            "preferred_ssp_ids": [],
            "blocked_ssp_ids": [],
            "max_hops": 3,
            "require_authorized_sellers": True,
            "bid_adjustment_factor": 1.0
        }
        message = "Supply Path Optimization enabled"
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": update_data}
    )
    
    return {"status": "applied", "action": action, "message": message}


# ==================== ML MODEL MANAGEMENT ====================

@api_router.get("/ml/models")
async def get_all_ml_models():
    """Get list of all ML models across campaigns"""
    campaigns = await db.campaigns.find(
        {"ml_prediction.enabled": True},
        {"_id": 0, "id": 1, "name": 1, "ml_prediction": 1, "ml_model_data": 1}
    ).to_list(1000)
    
    models = []
    for c in campaigns:
        stats = await db.ml_model_stats.find(
            {"campaign_id": c["id"]},
            {"_id": 0}
        ).to_list(100)
        
        total_data = sum(s.get("total_bids", 0) for s in stats)
        avg_win_rate = sum(s.get("win_rate", 0) for s in stats) / len(stats) if stats else 0
        
        models.append({
            "campaign_id": c["id"],
            "campaign_name": c["name"],
            "ml_enabled": c.get("ml_prediction", {}).get("enabled", False),
            "prediction_weight": c.get("ml_prediction", {}).get("prediction_weight", 0.5),
            "features_count": len(stats),
            "total_data_points": total_data,
            "avg_win_rate": round(avg_win_rate * 100, 2),
            "status": "trained" if total_data >= 100 else "insufficient_data",
            "last_trained": stats[0].get("last_updated") if stats else None
        })
    
    return {"models": models, "total": len(models)}


@api_router.get("/ml/model/{campaign_id}/details")
async def get_ml_model_details(campaign_id: str):
    """Get detailed ML model info for a campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    stats = await db.ml_model_stats.find(
        {"campaign_id": campaign_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Group by feature type
    feature_groups = {}
    for s in stats:
        key = s["feature_key"]
        feature_type = key.split(":")[0]
        if feature_type not in feature_groups:
            feature_groups[feature_type] = []
        feature_groups[feature_type].append({
            "value": key.split(":")[1] if ":" in key else key,
            "bids": s.get("total_bids", 0),
            "wins": s.get("total_wins", 0),
            "win_rate": round(s.get("win_rate", 0) * 100, 2),
            "avg_bid_price": round(s.get("avg_bid_price", 0), 2),
            "avg_win_price": round(s.get("avg_win_price", 0), 2)
        })
    
    # Sort each group by bids
    for ft in feature_groups:
        feature_groups[ft].sort(key=lambda x: x["bids"], reverse=True)
    
    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.get("name"),
        "ml_config": campaign.get("ml_prediction", {}),
        "total_features": len(stats),
        "total_data_points": sum(s.get("total_bids", 0) for s in stats),
        "feature_groups": feature_groups,
        "performance_summary": {
            "best_performing": sorted(stats, key=lambda x: x.get("win_rate", 0), reverse=True)[:5],
            "worst_performing": sorted(stats, key=lambda x: x.get("win_rate", 0))[:5]
        }
    }


# ==================== MULTI-CURRENCY SUPPORT ====================

CURRENCY_RATES = {
    "USD": 1.0,
    "EUR": 0.92,
    "GBP": 0.79,
    "CAD": 1.36,
    "AUD": 1.53,
    "JPY": 149.50
}

CURRENCY_SYMBOLS = {
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "CAD": "C$",
    "AUD": "A$",
    "JPY": "¥"
}


@api_router.get("/currencies")
async def get_supported_currencies():
    """Get list of supported currencies with conversion rates"""
    return {
        "base_currency": "USD",
        "currencies": [
            {"code": code, "symbol": CURRENCY_SYMBOLS.get(code, code), "rate": rate}
            for code, rate in CURRENCY_RATES.items()
        ]
    }


@api_router.get("/currency/convert")
async def convert_currency(amount: float, from_currency: str = "USD", to_currency: str = "USD"):
    """Convert amount between currencies"""
    if from_currency not in CURRENCY_RATES or to_currency not in CURRENCY_RATES:
        raise HTTPException(status_code=400, detail="Unsupported currency")
    
    # Convert to USD first, then to target
    usd_amount = amount / CURRENCY_RATES[from_currency]
    converted = usd_amount * CURRENCY_RATES[to_currency]
    
    return {
        "original": {"amount": amount, "currency": from_currency},
        "converted": {"amount": round(converted, 2), "currency": to_currency},
        "rate": CURRENCY_RATES[to_currency] / CURRENCY_RATES[from_currency]
    }


# ==================== CAMPAIGN COMPARISON ====================

class CampaignCompareRequest(BaseModel):
    campaign_ids: List[str]

@api_router.post("/campaigns/compare")
async def compare_campaigns(request: CampaignCompareRequest):
    """Compare 2-3 campaigns side by side"""
    campaign_ids = request.campaign_ids
    if len(campaign_ids) < 2 or len(campaign_ids) > 3:
        raise HTTPException(status_code=400, detail="Select 2-3 campaigns to compare")
    
    campaigns = []
    for cid in campaign_ids:
        campaign = await db.campaigns.find_one({"id": cid}, {"_id": 0})
        if campaign:
            campaigns.append(campaign)
    
    if len(campaigns) < 2:
        raise HTTPException(status_code=404, detail="One or more campaigns not found")
    
    # Calculate comparison metrics
    comparison = {
        "campaigns": campaigns,
        "metrics_comparison": {},
        "targeting_differences": {},
        "recommendations": []
    }
    
    # Compare key metrics
    metrics = ["bids", "wins", "impressions", "clicks", "bid_price"]
    for metric in metrics:
        values = [c.get(metric, 0) for c in campaigns]
        comparison["metrics_comparison"][metric] = {
            "values": values,
            "best": campaign_ids[values.index(max(values))] if max(values) > 0 else None,
            "diff_pct": round((max(values) - min(values)) / max(values) * 100, 2) if max(values) > 0 else 0
        }
    
    # Calculate win rates
    win_rates = []
    for c in campaigns:
        bids = c.get("bids", 0)
        wins = c.get("wins", 0)
        win_rates.append(round(wins / bids * 100, 2) if bids > 0 else 0)
    comparison["metrics_comparison"]["win_rate"] = {
        "values": win_rates,
        "best": campaign_ids[win_rates.index(max(win_rates))] if max(win_rates) > 0 else None
    }
    
    # Compare targeting
    targeting_fields = ["geo.countries", "device.device_types", "inventory.categories"]
    for field in targeting_fields:
        parts = field.split(".")
        values = []
        for c in campaigns:
            val = c.get("targeting", {})
            for p in parts:
                val = val.get(p, []) if isinstance(val, dict) else []
            values.append(set(val) if isinstance(val, list) else set())
        
        # Find common and unique targeting
        common = set.intersection(*values) if values else set()
        unique = [v - common for v in values]
        comparison["targeting_differences"][field] = {
            "common": list(common),
            "unique": [list(u) for u in unique]
        }
    
    # Generate recommendations
    if comparison["metrics_comparison"]["win_rate"]["values"]:
        best_idx = win_rates.index(max(win_rates))
        worst_idx = win_rates.index(min(win_rates))
        if best_idx != worst_idx:
            comparison["recommendations"].append({
                "type": "win_rate",
                "message": f"Consider adopting targeting from '{campaigns[best_idx]['name']}' for '{campaigns[worst_idx]['name']}'"
            })
    
    return comparison


# ==================== A/B TESTING ====================

class ABTestCreate(BaseModel):
    """Model for A/B test creation"""
    name: str
    campaign_ids: List[str]
    traffic_split: Optional[List[float]] = None

@api_router.post("/ab-tests")
async def create_ab_test(data: ABTestCreate):
    """Create an A/B test between campaigns"""
    name = data.name
    campaign_ids = data.campaign_ids
    traffic_split = data.traffic_split
    
    if len(campaign_ids) < 2 or len(campaign_ids) > 4:
        raise HTTPException(status_code=400, detail="Select 2-4 campaigns for A/B test")
    
    if traffic_split is None:
        traffic_split = [100 / len(campaign_ids)] * len(campaign_ids)
    
    if len(traffic_split) != len(campaign_ids) or abs(sum(traffic_split) - 100) > 0.1:
        raise HTTPException(status_code=400, detail="Traffic split must add up to 100%")
    
    # Verify campaigns exist
    campaigns = []
    for cid in campaign_ids:
        campaign = await db.campaigns.find_one({"id": cid}, {"_id": 0, "id": 1, "name": 1})
        if not campaign:
            raise HTTPException(status_code=404, detail=f"Campaign {cid} not found")
        campaigns.append(campaign)
    
    ab_test = {
        "id": str(uuid.uuid4()),
        "name": name,
        "status": "active",
        "campaign_ids": campaign_ids,
        "campaign_names": [c["name"] for c in campaigns],
        "traffic_split": traffic_split,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "stats": {cid: {"impressions": 0, "clicks": 0, "conversions": 0} for cid in campaign_ids}
    }
    
    await db.ab_tests.insert_one(ab_test)
    if "_id" in ab_test:
        del ab_test["_id"]
    
    return ab_test


@api_router.get("/ab-tests")
async def get_ab_tests():
    """Get all A/B tests"""
    tests = await db.ab_tests.find({}, {"_id": 0}).to_list(100)
    return {"tests": tests}


@api_router.get("/ab-tests/{test_id}")
async def get_ab_test(test_id: str):
    """Get A/B test details with performance data"""
    test = await db.ab_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="A/B test not found")
    
    # Calculate performance metrics for each variant
    for cid in test["campaign_ids"]:
        campaign = await db.campaigns.find_one({"id": cid}, {"_id": 0})
        if campaign:
            bids = campaign.get("bids", 0)
            wins = campaign.get("wins", 0)
            test["stats"][cid]["bids"] = bids
            test["stats"][cid]["wins"] = wins
            test["stats"][cid]["win_rate"] = round(wins / bids * 100, 2) if bids > 0 else 0
    
    # Determine winner
    winner = None
    best_metric = 0
    for cid, stats in test["stats"].items():
        if stats.get("win_rate", 0) > best_metric:
            best_metric = stats["win_rate"]
            winner = cid
    test["winner"] = winner
    
    return test


@api_router.put("/ab-tests/{test_id}/status")
async def update_ab_test_status(test_id: str, status: str):
    """Update A/B test status"""
    if status not in ["active", "paused", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.ab_tests.update_one(
        {"id": test_id},
        {"$set": {"status": status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="A/B test not found")
    
    return {"status": status}


# ==================== FRAUD DETECTION ====================

FRAUD_PATTERNS = {
    "bot_user_agents": ["bot", "crawler", "spider", "scraper", "headless"],
    "suspicious_ips": [],
    "high_frequency_threshold": 100,  # requests per minute
    "invalid_geo_patterns": ["XX", "ZZ"]
}

@api_router.get("/fraud/stats")
async def get_fraud_stats():
    """Get fraud detection statistics"""
    total_bids = await db.bid_logs.count_documents({})
    flagged_bids = await db.bid_logs.count_documents({"fraud_flags": {"$exists": True, "$ne": []}})
    
    # Get fraud by type
    pipeline = [
        {"$match": {"fraud_flags": {"$exists": True, "$ne": []}}},
        {"$unwind": "$fraud_flags"},
        {"$group": {"_id": "$fraud_flags", "count": {"$sum": 1}}}
    ]
    fraud_by_type = await db.bid_logs.aggregate(pipeline).to_list(20)
    
    return {
        "total_bids": total_bids,
        "flagged_bids": flagged_bids,
        "fraud_rate": round(flagged_bids / total_bids * 100, 2) if total_bids > 0 else 0,
        "fraud_by_type": {f["_id"]: f["count"] for f in fraud_by_type},
        "patterns": FRAUD_PATTERNS
    }


@api_router.post("/fraud/check")
async def check_fraud(request_data: dict):
    """Check a bid request for fraud indicators"""
    flags = []
    score = 0
    
    # Check user agent
    ua = request_data.get("device", {}).get("ua", "").lower()
    for pattern in FRAUD_PATTERNS["bot_user_agents"]:
        if pattern in ua:
            flags.append("bot_user_agent")
            score += 30
            break
    
    # Check for missing required fields
    if not request_data.get("device", {}).get("ip"):
        flags.append("missing_ip")
        score += 20
    
    if not request_data.get("device", {}).get("ua"):
        flags.append("missing_user_agent")
        score += 15
    
    # Check geo validity
    geo = request_data.get("device", {}).get("geo", {})
    if geo.get("country") in FRAUD_PATTERNS["invalid_geo_patterns"]:
        flags.append("invalid_geo")
        score += 25
    
    # Check for suspicious patterns
    if request_data.get("device", {}).get("js") == 0:
        flags.append("javascript_disabled")
        score += 10
    
    return {
        "is_fraudulent": score >= 50,
        "fraud_score": min(score, 100),
        "flags": flags,
        "recommendation": "block" if score >= 50 else "allow"
    }


@api_router.put("/fraud/patterns")
async def update_fraud_patterns(patterns: dict):
    """Update fraud detection patterns"""
    global FRAUD_PATTERNS
    FRAUD_PATTERNS.update(patterns)
    return {"status": "updated", "patterns": FRAUD_PATTERNS}


# ==================== VIEWABILITY PREDICTION ====================

@api_router.get("/viewability/stats")
async def get_viewability_stats():
    """Get viewability statistics"""
    # Get viewability data from bid logs
    pipeline = [
        {"$match": {"viewability_score": {"$exists": True}}},
        {"$group": {
            "_id": None,
            "avg_score": {"$avg": "$viewability_score"},
            "total": {"$sum": 1},
            "high_viewability": {"$sum": {"$cond": [{"$gte": ["$viewability_score", 70]}, 1, 0]}},
            "low_viewability": {"$sum": {"$cond": [{"$lt": ["$viewability_score", 50]}, 1, 0]}}
        }}
    ]
    
    result = await db.bid_logs.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {"avg_score": 0, "total": 0, "high_viewability": 0, "low_viewability": 0}
    
    return {
        "average_viewability": round(stats.get("avg_score", 0), 2),
        "total_measured": stats.get("total", 0),
        "high_viewability_count": stats.get("high_viewability", 0),
        "low_viewability_count": stats.get("low_viewability", 0),
        "benchmark": 65  # Industry benchmark
    }


@api_router.post("/viewability/predict")
async def predict_viewability(request_data: dict):
    """Predict viewability score for a bid request"""
    score = 50  # Base score
    factors = []
    
    # Device type impact
    device_type = request_data.get("device", {}).get("devicetype", 2)
    if device_type in [4, 5]:  # Phone, Tablet
        score += 10
        factors.append({"factor": "mobile_device", "impact": "+10"})
    elif device_type == 3:  # CTV
        score += 15
        factors.append({"factor": "ctv_device", "impact": "+15"})
    
    # Position impact
    imp = request_data.get("imp", [{}])[0]
    if imp.get("instl") == 1:  # Interstitial
        score += 20
        factors.append({"factor": "interstitial", "impact": "+20"})
    
    # Banner size impact
    banner = imp.get("banner", {})
    if banner:
        w, h = banner.get("w", 0), banner.get("h", 0)
        if w >= 300 and h >= 250:
            score += 5
            factors.append({"factor": "large_banner", "impact": "+5"})
        if w == 320 and h == 480:  # Full screen mobile
            score += 10
            factors.append({"factor": "fullscreen_mobile", "impact": "+10"})
    
    # Video viewability
    video = imp.get("video", {})
    if video:
        if video.get("placement") == 1:  # In-stream
            score += 15
            factors.append({"factor": "instream_video", "impact": "+15"})
        if video.get("skip") == 0:  # Non-skippable
            score += 10
            factors.append({"factor": "non_skippable", "impact": "+10"})
    
    return {
        "predicted_score": min(score, 100),
        "confidence": 0.75,
        "factors": factors,
        "recommendation": "high_value" if score >= 70 else "standard" if score >= 50 else "low_value"
    }


# ==================== CUSTOM AUDIENCE SEGMENTS ====================

@api_router.get("/audiences")
async def get_audiences():
    """Get all audience segments"""
    audiences = await db.audiences.find({}, {"_id": 0}).to_list(100)
    return {"audiences": audiences}


@api_router.post("/audiences")
async def create_audience(
    name: str,
    description: str = "",
    rules: dict = None
):
    """Create a custom audience segment"""
    audience = {
        "id": str(uuid.uuid4()),
        "name": name,
        "description": description,
        "rules": rules or {},
        "size": 0,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.audiences.insert_one(audience)
    if "_id" in audience:
        del audience["_id"]
    
    return audience


@api_router.get("/audiences/{audience_id}")
async def get_audience(audience_id: str):
    """Get audience segment details"""
    audience = await db.audiences.find_one({"id": audience_id}, {"_id": 0})
    if not audience:
        raise HTTPException(status_code=404, detail="Audience not found")
    return audience


@api_router.put("/audiences/{audience_id}")
async def update_audience(audience_id: str, name: str = None, rules: dict = None):
    """Update audience segment"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if name:
        update_data["name"] = name
    if rules:
        update_data["rules"] = rules
    
    result = await db.audiences.update_one(
        {"id": audience_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Audience not found")
    
    return await get_audience(audience_id)


@api_router.delete("/audiences/{audience_id}")
async def delete_audience(audience_id: str):
    """Delete audience segment"""
    result = await db.audiences.delete_one({"id": audience_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Audience not found")
    return {"status": "deleted"}


# ==================== CREATIVE VALIDATION ====================

@api_router.post("/creatives/validate")
async def validate_creative(creative_data: dict):
    """Validate creative content and return issues"""
    issues = []
    warnings = []
    
    creative_type = creative_data.get("type", "banner")
    
    if creative_type == "banner":
        banner = creative_data.get("banner_data", {})
        w, h = banner.get("width", 0), banner.get("height", 0)
        
        # Check dimensions
        valid_sizes = [(300, 250), (728, 90), (160, 600), (320, 50), (300, 600), (970, 250)]
        if (w, h) not in valid_sizes:
            warnings.append({"field": "dimensions", "message": f"{w}x{h} is not a standard IAB size"})
        
        # Check markup
        markup = banner.get("ad_markup", "")
        if markup:
            if "<script" in markup.lower() and "https://" not in markup:
                issues.append({"field": "ad_markup", "message": "Scripts should use HTTPS"})
            if len(markup) > 100000:
                issues.append({"field": "ad_markup", "message": "Markup too large (>100KB)"})
    
    elif creative_type == "video":
        video = creative_data.get("video_data", {})
        duration = video.get("duration", 0)
        
        if duration > 60:
            warnings.append({"field": "duration", "message": "Video longer than 60s may have low completion"})
        
        if not video.get("vast_url") and not video.get("vast_xml") and not video.get("video_url"):
            issues.append({"field": "video_data", "message": "No video source provided"})
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "warnings": warnings,
        "score": 100 - (len(issues) * 30) - (len(warnings) * 10)
    }


# ==================== REAL-TIME BID STREAM ====================

# Store recent bids in memory for real-time display
recent_bids = []
MAX_RECENT_BIDS = 100

@api_router.get("/bid-stream")
async def get_bid_stream(limit: int = 20):
    """Get recent bid activity for real-time dashboard"""
    return {
        "bids": recent_bids[-limit:],
        "total_in_memory": len(recent_bids)
    }


@app.websocket("/api/ws/bid-stream")
async def websocket_bid_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time bid stream"""
    await ws_manager.connect(websocket)
    
    try:
        # Send initial batch of recent bids
        await websocket.send_text(json.dumps({
            "type": "initial",
            "bids": recent_bids[-20:],
            "total": len(recent_bids)
        }))
        
        # Keep connection alive and listen for ping/pong
        while True:
            try:
                # Wait for messages (ping/pong or subscription changes)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                msg = json.loads(data)
                
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                elif msg.get("type") == "get_recent":
                    limit = msg.get("limit", 20)
                    await websocket.send_text(json.dumps({
                        "type": "recent",
                        "bids": recent_bids[-limit:],
                        "total": len(recent_bids)
                    }))
            except asyncio.TimeoutError:
                # Send heartbeat
                await websocket.send_text(json.dumps({"type": "heartbeat"}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)


async def broadcast_new_bid(bid_data: dict):
    """Broadcast a new bid to all connected WebSocket clients"""
    await ws_manager.broadcast({
        "type": "new_bid",
        "bid": bid_data
    })


# ==================== FILE UPLOAD ====================

# Create uploads directory
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image file for creative assets"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {allowed_types}")
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    # Save file
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Get base URL for the file
    base_url = os.environ.get('REACT_APP_BACKEND_URL', '')
    file_url = f"{base_url}/api/uploads/{filename}"
    
    return {
        "filename": filename,
        "url": file_url,
        "content_type": file.content_type,
        "size": filepath.stat().st_size
    }


@api_router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Serve uploaded files"""
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine content type
    ext = filename.split('.')[-1].lower()
    content_types = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "webp": "image/webp"
    }
    content_type = content_types.get(ext, "application/octet-stream")
    
    return FileResponse(filepath, media_type=content_type)


@api_router.delete("/uploads/{filename}")
async def delete_uploaded_file(filename: str):
    """Delete an uploaded file"""
    filepath = UPLOAD_DIR / filename
    if filepath.exists():
        filepath.unlink()
    return {"status": "deleted"}


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
