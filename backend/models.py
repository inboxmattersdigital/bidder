"""
OpenRTB Bidder - Pydantic Models
Comprehensive data models for Campaign Manager and OpenRTB protocol
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ==================== ENUMS ====================

class CampaignStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    DRAFT = "draft"
    COMPLETED = "completed"


class CreativeType(str, Enum):
    BANNER = "banner"
    VIDEO = "video"
    NATIVE = "native"


class DeviceType(int, Enum):
    MOBILE_TABLET = 1
    PERSONAL_COMPUTER = 2
    CONNECTED_TV = 3
    PHONE = 4
    TABLET = 5
    CONNECTED_DEVICE = 6
    SET_TOP_BOX = 7


class ConnectionType(int, Enum):
    UNKNOWN = 0
    ETHERNET = 1
    WIFI = 2
    CELLULAR_UNKNOWN = 3
    CELLULAR_2G = 4
    CELLULAR_3G = 5
    CELLULAR_4G = 6
    CELLULAR_5G = 7


class VideoPlacement(int, Enum):
    IN_STREAM = 1
    IN_BANNER = 2
    IN_ARTICLE = 3
    IN_FEED = 4
    INTERSTITIAL = 5


class VideoPlcmt(int, Enum):
    INSTREAM = 1
    ACCOMPANYING = 2
    INTERSTITIAL = 3
    NO_CONTENT = 4


# ==================== TARGETING MODELS ====================

class GeoTargeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    countries: List[str] = Field(default_factory=list, description="ISO 3166-1 alpha-3 country codes")
    regions: List[str] = Field(default_factory=list)
    cities: List[str] = Field(default_factory=list)
    lat_lon_radius: Optional[Dict[str, float]] = Field(default=None, description="{'lat': x, 'lon': y, 'radius_km': z}")


class DeviceTargeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    device_types: List[int] = Field(default_factory=list)
    makes: List[str] = Field(default_factory=list)
    models: List[str] = Field(default_factory=list)
    os_list: List[str] = Field(default_factory=list)
    os_versions: List[str] = Field(default_factory=list)
    connection_types: List[int] = Field(default_factory=list)


class InventoryTargeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    domain_whitelist: List[str] = Field(default_factory=list)
    domain_blacklist: List[str] = Field(default_factory=list)
    bundle_whitelist: List[str] = Field(default_factory=list)
    bundle_blacklist: List[str] = Field(default_factory=list)
    publisher_ids: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list, description="IAB categories")


class VideoTargeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    placements: List[int] = Field(default_factory=list, description="Video placement types (OpenRTB 2.5)")
    plcmts: List[int] = Field(default_factory=list, description="Video plcmt types (OpenRTB 2.6)")
    min_duration: Optional[int] = Field(default=None)
    max_duration: Optional[int] = Field(default=None)
    protocols: List[int] = Field(default_factory=list)
    mimes: List[str] = Field(default_factory=list)
    pod_positions: List[int] = Field(default_factory=list, description="Target specific slotinpod positions")


class ContentTargeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    categories: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    content_ratings: List[str] = Field(default_factory=list)


class PrivacySettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    gdpr_required: bool = Field(default=False)
    gdpr_consent_required: bool = Field(default=False)
    ccpa_allowed: bool = Field(default=True)
    coppa_allowed: bool = Field(default=False)


class CampaignTargeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    geo: GeoTargeting = Field(default_factory=GeoTargeting)
    device: DeviceTargeting = Field(default_factory=DeviceTargeting)
    inventory: InventoryTargeting = Field(default_factory=InventoryTargeting)
    video: VideoTargeting = Field(default_factory=VideoTargeting)
    content: ContentTargeting = Field(default_factory=ContentTargeting)
    privacy: PrivacySettings = Field(default_factory=PrivacySettings)


# ==================== CREATIVE MODELS ====================

class BannerCreative(BaseModel):
    width: int
    height: int
    mimes: List[str] = Field(default=["image/jpeg", "image/png", "image/gif"])
    ad_markup: str = Field(description="HTML/JS ad markup")


class VideoCreative(BaseModel):
    duration: int = Field(description="Duration in seconds")
    width: int
    height: int
    mimes: List[str] = Field(default=["video/mp4", "video/webm"])
    protocols: List[int] = Field(default=[2, 3, 5, 6])
    vast_url: Optional[str] = None
    vast_xml: Optional[str] = None


class NativeCreative(BaseModel):
    title: str
    description: str
    icon_url: Optional[str] = None
    image_url: Optional[str] = None
    cta_text: str = "Learn More"
    click_url: str


class Creative(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: CreativeType
    status: str = Field(default="active")
    adomain: List[str] = Field(default_factory=list, description="Advertiser domains")
    iurl: Optional[str] = Field(default=None, description="Sample image URL")
    crid: Optional[str] = Field(default=None, description="Creative ID for buyers")
    cat: List[str] = Field(default_factory=list, description="IAB content categories")
    attr: List[int] = Field(default_factory=list, description="Creative attributes")
    
    # Type-specific data
    banner_data: Optional[BannerCreative] = None
    video_data: Optional[VideoCreative] = None
    native_data: Optional[NativeCreative] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== CAMPAIGN MODELS ====================

class BudgetConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    daily_budget: float = Field(default=0.0)
    total_budget: float = Field(default=0.0)
    daily_spend: float = Field(default=0.0)
    total_spend: float = Field(default=0.0)


class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    status: CampaignStatus = Field(default=CampaignStatus.DRAFT)
    
    # Bidding config
    bid_price: float = Field(description="CPM bid price in USD")
    bid_floor: float = Field(default=0.0, description="Minimum floor to bid on")
    priority: int = Field(default=1, ge=1, le=10)
    
    # Budget
    budget: BudgetConfig = Field(default_factory=BudgetConfig)
    
    # Creative
    creative_id: str
    
    # Targeting
    targeting: CampaignTargeting = Field(default_factory=CampaignTargeting)
    
    # Schedule
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Stats
    impressions: int = Field(default=0)
    clicks: int = Field(default=0)
    wins: int = Field(default=0)
    bids: int = Field(default=0)


# ==================== SSP & API KEY MODELS ====================

class SSPEndpoint(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    api_key: str = Field(default_factory=lambda: f"ssp_{uuid.uuid4().hex}")
    description: Optional[str] = None
    status: str = Field(default="active")
    
    # Stats
    total_requests: int = Field(default=0)
    total_bids: int = Field(default=0)
    total_wins: int = Field(default=0)
    total_spend: float = Field(default=0.0)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== BID LOG MODELS ====================

class BidLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    ssp_id: Optional[str] = None
    openrtb_version: str = Field(default="2.5")
    
    # Request summary
    request_summary: Dict[str, Any] = Field(default_factory=dict)
    
    # Response
    bid_made: bool = Field(default=False)
    bid_price: Optional[float] = None
    campaign_id: Optional[str] = None
    creative_id: Optional[str] = None
    
    # Matching info
    matched_campaigns: List[str] = Field(default_factory=list)
    rejection_reasons: List[str] = Field(default_factory=list)
    
    # Performance
    processing_time_ms: float = Field(default=0.0)
    
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== REQUEST/RESPONSE MODELS ====================

class CampaignCreate(BaseModel):
    name: str
    bid_price: float
    bid_floor: float = 0.0
    priority: int = 1
    creative_id: str
    budget: BudgetConfig = Field(default_factory=BudgetConfig)
    targeting: CampaignTargeting = Field(default_factory=CampaignTargeting)
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[CampaignStatus] = None
    bid_price: Optional[float] = None
    bid_floor: Optional[float] = None
    priority: Optional[int] = None
    creative_id: Optional[str] = None
    budget: Optional[BudgetConfig] = None
    targeting: Optional[CampaignTargeting] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class CreativeCreate(BaseModel):
    name: str
    type: CreativeType
    adomain: List[str] = Field(default_factory=list)
    iurl: Optional[str] = None
    cat: List[str] = Field(default_factory=list)
    banner_data: Optional[BannerCreative] = None
    video_data: Optional[VideoCreative] = None
    native_data: Optional[NativeCreative] = None


class SSPEndpointCreate(BaseModel):
    name: str
    description: Optional[str] = None


class DashboardStats(BaseModel):
    total_campaigns: int = 0
    active_campaigns: int = 0
    total_creatives: int = 0
    total_impressions: int = 0
    total_clicks: int = 0
    total_spend: float = 0.0
    total_bids: int = 0
    total_wins: int = 0
    win_rate: float = 0.0
    avg_cpm: float = 0.0


# ==================== OpenRTB 2.5/2.6 Migration Matrix ====================

OPENRTB_MIGRATION_MATRIX = {
    "video.placement": {
        "2.5_field": "imp.video.placement",
        "2.6_field": "imp.video.plcmt",
        "mapping": {
            1: 1,  # In-Stream -> Instream
            2: 2,  # In-Banner -> Accompanying Content
            3: 2,  # In-Article -> Accompanying Content
            4: 2,  # In-Feed -> Accompanying Content
            5: 3,  # Interstitial/Floating -> Interstitial
        },
        "reverse_mapping": {
            1: 1,  # Instream -> In-Stream
            2: 4,  # Accompanying -> In-Feed (default)
            3: 5,  # Interstitial -> Interstitial/Floating
            4: 5,  # No-Content -> Interstitial/Floating
        }
    },
    "user.consent": {
        "2.5_field": "user.ext.consent",
        "2.6_field": "user.consent"
    },
    "user.eids": {
        "2.5_field": "user.ext.eids",
        "2.6_field": "user.eids"
    },
    "regs.gdpr": {
        "2.5_field": "regs.ext.gdpr",
        "2.6_field": "regs.gdpr"
    },
    "regs.us_privacy": {
        "2.5_field": "regs.ext.us_privacy",
        "2.6_field": "regs.us_privacy"
    },
    "source.schain": {
        "2.5_field": "source.ext.schain",
        "2.6_field": "source.schain"
    },
    "imp.rwdd": {
        "2.5_field": "imp.ext.rwdd",
        "2.6_field": "imp.rwdd"
    },
    "bid.mtype": {
        "2.5_field": "bid.ext.prebid.type",
        "2.6_field": "bid.mtype",
        "mapping": {
            "banner": 1,
            "video": 2,
            "audio": 3,
            "native": 4
        }
    }
}
