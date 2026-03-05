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
    AUDIO = "audio"


class CreativeFormat(str, Enum):
    RAW_BANNER = "raw_banner"
    RAW_VIDEO = "raw_video"
    VAST_URL = "vast_url"
    VAST_XML = "vast_xml"
    JS_TAG = "js_tag"
    NATIVE_JSON = "native_json"
    AUDIO_VAST = "audio_vast"


class ORTBVersion(str, Enum):
    V2_5 = "2.5"
    V2_6 = "2.6"


class AdPlacement(str, Enum):
    IN_APP = "in_app"
    IN_STREAM = "in_stream"
    IN_STREAM_NON_SKIP = "in_stream_non_skip"
    IN_BANNER = "in_banner"
    IN_ARTICLE = "in_article"
    IN_FEED = "in_feed"
    INTERSTITIAL = "interstitial"
    SIDE_BANNER = "side_banner"
    ABOVE_FOLD = "above_fold"
    BELOW_FOLD = "below_fold"
    STICKY = "sticky"
    FLOATING = "floating"
    REWARDED = "rewarded"


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
    latitude: Optional[float] = Field(default=None, description="Target latitude")
    longitude: Optional[float] = Field(default=None, description="Target longitude")
    radius_km: Optional[float] = Field(default=None, description="Radius in kilometers")


class DeviceTargeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    device_types: List[int] = Field(default_factory=list)
    makes: List[str] = Field(default_factory=list)
    models: List[str] = Field(default_factory=list)
    os_list: List[str] = Field(default_factory=list)
    os_versions: List[str] = Field(default_factory=list)
    connection_types: List[int] = Field(default_factory=list)
    carriers: List[str] = Field(default_factory=list, description="Mobile carrier/operator names")
    carrier_mccs: List[str] = Field(default_factory=list, description="Mobile Country Codes")
    carrier_mncs: List[str] = Field(default_factory=list, description="Mobile Network Codes")


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
    ad_markup: str = Field(default="", description="HTML/JS ad markup")
    image_url: Optional[str] = Field(default=None, description="Direct image URL for raw banner")


class VideoCreative(BaseModel):
    duration: int = Field(default=30, description="Duration in seconds")
    width: int = Field(default=1920)
    height: int = Field(default=1080)
    mimes: List[str] = Field(default=["video/mp4", "video/webm"])
    protocols: List[int] = Field(default=[2, 3, 5, 6])
    vast_url: Optional[str] = None
    vast_xml: Optional[str] = None
    video_url: Optional[str] = Field(default=None, description="Direct video URL for raw video")
    skip_offset: Optional[int] = Field(default=None, description="Skip button appears after X seconds")
    bitrate: Optional[int] = Field(default=None, description="Video bitrate in Kbps")


class AudioCreative(BaseModel):
    duration: int = Field(default=30, description="Duration in seconds")
    mimes: List[str] = Field(default=["audio/mp3", "audio/mpeg", "audio/ogg"])
    protocols: List[int] = Field(default=[2, 3, 5, 6])
    vast_url: Optional[str] = None
    vast_xml: Optional[str] = None
    audio_url: Optional[str] = Field(default=None, description="Direct audio URL")
    bitrate: Optional[int] = Field(default=None, description="Audio bitrate in Kbps")


class NativeCreative(BaseModel):
    title: str = Field(default="")
    description: str = Field(default="")
    icon_url: Optional[str] = None
    image_url: Optional[str] = None
    cta_text: str = "Learn More"
    click_url: str = Field(default="")
    sponsored_by: Optional[str] = None


class Creative(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: CreativeType
    format: CreativeFormat = Field(default=CreativeFormat.RAW_BANNER, description="Creative format/delivery method")
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
    audio_data: Optional[AudioCreative] = None
    
    # JS Tag specific
    js_tag: Optional[str] = Field(default=None, description="JavaScript tag for ad serving")
    
    # Preview URL (auto-generated for VAST, computed for others)
    preview_url: Optional[str] = Field(default=None, description="Preview URL for the creative")
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== CAMPAIGN MODELS ====================

class BudgetConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    daily_budget: float = Field(default=0.0)
    total_budget: float = Field(default=0.0)
    daily_spend: float = Field(default=0.0)
    total_spend: float = Field(default=0.0)
    
    # Pacing configuration
    pacing_type: str = Field(default="even", description="even, asap, or custom")
    hourly_budget: float = Field(default=0.0, description="Auto-calculated for even pacing")
    current_hour_spend: float = Field(default=0.0)
    last_hour_reset: Optional[str] = None


class BidShadingConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    enabled: bool = Field(default=False)
    min_shade_factor: float = Field(default=0.5, description="Minimum bid reduction (50%)")
    max_shade_factor: float = Field(default=0.95, description="Maximum bid (95% of original)")
    target_win_rate: float = Field(default=0.3, description="Target 30% win rate")
    learning_rate: float = Field(default=0.1, description="How fast to adjust shading")
    current_shade_factor: float = Field(default=0.85, description="Current shading multiplier")


class FrequencyCapConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    enabled: bool = Field(default=False)
    max_impressions_per_user: int = Field(default=3, description="Max impressions per user per time window")
    time_window_hours: int = Field(default=24, description="Time window in hours")
    max_impressions_per_day: int = Field(default=5, description="Max impressions per user per day")
    max_impressions_total: int = Field(default=10, description="Max total impressions per user for campaign")


class SPOConfig(BaseModel):
    """Supply Path Optimization configuration"""
    model_config = ConfigDict(extra="ignore")
    
    enabled: bool = Field(default=False)
    preferred_ssp_ids: List[str] = Field(default_factory=list, description="Preferred SSP IDs for direct paths")
    blocked_ssp_ids: List[str] = Field(default_factory=list, description="Blocked SSP IDs")
    max_hops: int = Field(default=3, description="Maximum supply chain hops allowed")
    require_authorized_sellers: bool = Field(default=True, description="Require valid sellers.json")
    bid_adjustment_factor: float = Field(default=1.0, description="Bid multiplier for preferred paths")


class MLPredictionConfig(BaseModel):
    """ML-based bid prediction configuration"""
    model_config = ConfigDict(extra="ignore")
    
    enabled: bool = Field(default=False)
    use_historical_data: bool = Field(default=True)
    prediction_weight: float = Field(default=0.5, description="Weight given to ML prediction vs base bid")
    min_data_points: int = Field(default=100, description="Minimum data points needed for prediction")
    feature_weights: Dict[str, float] = Field(default_factory=lambda: {
        "device_type": 0.15,
        "geo_country": 0.15,
        "app_category": 0.10,
        "time_of_day": 0.10,
        "day_of_week": 0.10,
        "bid_floor": 0.20,
        "historical_win_rate": 0.20
    })


class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    status: CampaignStatus = Field(default=CampaignStatus.DRAFT)
    
    # Bidding config
    bid_price: float = Field(description="CPM bid price")
    bid_floor: float = Field(default=0.0, description="Minimum floor to bid on")
    currency: str = Field(default="USD", description="Campaign currency (USD, EUR, GBP, etc.)")
    priority: int = Field(default=1, ge=1, le=10)
    
    # Ad Placement targeting
    placements: List[str] = Field(default_factory=list, description="Ad placement types (in_app, in_stream, etc.)")
    
    # Budget
    budget: BudgetConfig = Field(default_factory=BudgetConfig)
    
    # Bid Shading
    bid_shading: BidShadingConfig = Field(default_factory=BidShadingConfig)
    
    # Frequency Capping
    frequency_cap: FrequencyCapConfig = Field(default_factory=FrequencyCapConfig)
    
    # Supply Path Optimization
    spo: SPOConfig = Field(default_factory=SPOConfig)
    
    # ML Prediction
    ml_prediction: MLPredictionConfig = Field(default_factory=MLPredictionConfig)
    
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
    
    # Win rate tracking for bid shading
    recent_win_rate: float = Field(default=0.0)
    avg_win_price: float = Field(default=0.0)
    
    # ML model data
    ml_model_data: Dict[str, Any] = Field(default_factory=dict)


# ==================== SSP & API KEY MODELS ====================

class SSPEndpoint(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    endpoint_token: str = Field(default_factory=lambda: uuid.uuid4().hex[:16])  # Unique token for bid URL
    description: Optional[str] = None
    status: str = Field(default="active")
    ortb_version: str = Field(default="2.5", description="OpenRTB version (2.5 or 2.6)")
    
    # Stats
    total_requests: int = Field(default=0)
    total_bids: int = Field(default=0)
    total_wins: int = Field(default=0)
    total_spend: float = Field(default=0.0)
    
    # Performance metrics
    avg_response_time_ms: float = Field(default=0.0)
    win_rate: float = Field(default=0.0)
    avg_bid_price: float = Field(default=0.0)
    last_request_at: Optional[datetime] = None
    
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
    shaded_price: Optional[float] = None  # Actual bid price after shading
    campaign_id: Optional[str] = None
    creative_id: Optional[str] = None
    
    # Win notification tracking
    nurl: Optional[str] = None
    burl: Optional[str] = None
    win_notified: bool = Field(default=False)
    win_price: Optional[float] = None
    billing_notified: bool = Field(default=False)
    
    # Matching info
    matched_campaigns: List[str] = Field(default_factory=list)
    rejection_reasons: List[str] = Field(default_factory=list)
    
    # Performance
    processing_time_ms: float = Field(default=0.0)
    
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== USER FREQUENCY TRACKING ====================

class UserFrequency(BaseModel):
    """Track user impression frequency for frequency capping"""
    model_config = ConfigDict(extra="ignore")
    
    user_id: str  # IFA, cookie ID, or device ID
    campaign_id: str
    impression_count: int = Field(default=0)
    last_impression: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    hourly_impressions: Dict[str, int] = Field(default_factory=dict)  # hour -> count


# ==================== ML PREDICTION DATA ====================

class BidPredictionFeatures(BaseModel):
    """Features for ML bid prediction"""
    device_type: Optional[int] = None
    geo_country: Optional[str] = None
    geo_region: Optional[str] = None
    app_bundle: Optional[str] = None
    app_category: Optional[str] = None
    time_of_day: Optional[int] = None
    day_of_week: Optional[int] = None
    bid_floor: Optional[float] = None
    video_placement: Optional[int] = None
    connection_type: Optional[int] = None


class MLModelStats(BaseModel):
    """Statistics for ML model training"""
    model_config = ConfigDict(extra="ignore")
    
    campaign_id: str
    feature_key: str  # e.g., "device_type:4" or "geo_country:USA"
    total_bids: int = Field(default=0)
    total_wins: int = Field(default=0)
    win_rate: float = Field(default=0.0)
    avg_win_price: float = Field(default=0.0)
    avg_bid_price: float = Field(default=0.0)
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== REQUEST/RESPONSE MODELS ====================

class CampaignCreate(BaseModel):
    name: str
    bid_price: float
    bid_floor: float = 0.0
    currency: str = "USD"
    priority: int = 1
    placements: List[str] = Field(default_factory=list)
    creative_id: str
    budget: BudgetConfig = Field(default_factory=BudgetConfig)
    bid_shading: BidShadingConfig = Field(default_factory=BidShadingConfig)
    frequency_cap: FrequencyCapConfig = Field(default_factory=FrequencyCapConfig)
    spo: SPOConfig = Field(default_factory=SPOConfig)
    ml_prediction: MLPredictionConfig = Field(default_factory=MLPredictionConfig)
    targeting: CampaignTargeting = Field(default_factory=CampaignTargeting)
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[CampaignStatus] = None
    bid_price: Optional[float] = None
    bid_floor: Optional[float] = None
    currency: Optional[str] = None
    priority: Optional[int] = None
    placements: Optional[List[str]] = None
    creative_id: Optional[str] = None
    budget: Optional[BudgetConfig] = None
    bid_shading: Optional[BidShadingConfig] = None
    frequency_cap: Optional[FrequencyCapConfig] = None
    spo: Optional[SPOConfig] = None
    ml_prediction: Optional[MLPredictionConfig] = None
    targeting: Optional[CampaignTargeting] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class CreativeCreate(BaseModel):
    name: str
    type: CreativeType
    format: CreativeFormat = Field(default=CreativeFormat.RAW_BANNER)
    adomain: List[str] = Field(default_factory=list)
    iurl: Optional[str] = None
    cat: List[str] = Field(default_factory=list)
    banner_data: Optional[BannerCreative] = None
    video_data: Optional[VideoCreative] = None
    native_data: Optional[NativeCreative] = None
    audio_data: Optional[AudioCreative] = None
    js_tag: Optional[str] = None


class SSPEndpointCreate(BaseModel):
    name: str
    description: Optional[str] = None
    ortb_version: str = Field(default="2.5", description="OpenRTB version (2.5 or 2.6)")


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


# ==================== REPORTING MODELS ====================

class CampaignReport(BaseModel):
    campaign_id: str
    campaign_name: str
    date: str
    impressions: int = 0
    clicks: int = 0
    bids: int = 0
    wins: int = 0
    spend: float = 0.0
    ctr: float = 0.0
    win_rate: float = 0.0
    avg_cpm: float = 0.0
    avg_bid_price: float = 0.0
    avg_win_price: float = 0.0


class ReportSummary(BaseModel):
    start_date: str
    end_date: str
    total_impressions: int = 0
    total_clicks: int = 0
    total_bids: int = 0
    total_wins: int = 0
    total_spend: float = 0.0
    avg_ctr: float = 0.0
    avg_win_rate: float = 0.0
    avg_cpm: float = 0.0
    daily_data: List[Dict[str, Any]] = Field(default_factory=list)
    campaign_breakdown: List[CampaignReport] = Field(default_factory=list)


class WinNotification(BaseModel):
    bid_id: str
    imp_id: str
    price: float  # Clearing price
    seat: Optional[str] = None
    adid: Optional[str] = None


class BillingNotification(BaseModel):
    bid_id: str
    price: float
    timestamp: Optional[str] = None


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
