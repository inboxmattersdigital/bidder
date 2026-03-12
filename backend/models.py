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



# ==================== CAMPAIGN GOAL & KPI ENUMS ====================

class CampaignGoal(str, Enum):
    BRAND_AWARENESS = "brand_awareness"
    REACH = "reach"
    TRAFFIC = "traffic"
    ENGAGEMENT = "engagement"
    APP_INSTALLS = "app_installs"
    VIDEO_VIEWS = "video_views"
    LEAD_GENERATION = "lead_generation"
    CONVERSIONS = "conversions"
    CATALOG_SALES = "catalog_sales"
    STORE_VISITS = "store_visits"


class KPIType(str, Enum):
    CPM = "cpm"
    CPC = "cpc"
    CPA = "cpa"
    CPV = "cpv"
    VCPM = "vcpm"
    CTR = "ctr"
    VTR = "vtr"
    ROAS = "roas"


class BiddingStrategy(str, Enum):
    MANUAL_CPM = "manual_cpm"
    MANUAL_CPC = "manual_cpc"
    TARGET_CPA = "target_cpa"
    TARGET_ROAS = "target_roas"
    MAXIMIZE_CONVERSIONS = "maximize_conversions"
    MAXIMIZE_CLICKS = "maximize_clicks"
    MAXIMIZE_IMPRESSIONS = "maximize_impressions"


class InventorySource(str, Enum):
    OPEN_EXCHANGE = "open_exchange"
    PRIVATE_MARKETPLACE = "pmp"
    PROGRAMMATIC_GUARANTEED = "pg"
    YOUTUBE = "youtube"
    GOOGLE_DISPLAY = "gdn"
    CONNECTED_TV = "ctv"
    AUDIO = "audio"


class Environment(str, Enum):
    WEB = "web"
    APP = "app"
    CTV = "ctv"
    DOOH = "dooh"


class BrandSafetyLevel(str, Enum):
    STANDARD = "standard"
    STRICT = "strict"
    CUSTOM = "custom"


class IOStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class LineItemType(str, Enum):
    PROSPECTING = "prospecting"
    RETARGETING = "retargeting"
    CONTEXTUAL = "contextual"
    AUDIENCE = "audience"
    CONQUEST = "conquest"
    LOOKALIKE = "lookalike"


class AttributionModel(str, Enum):
    LAST_TOUCH = "last_touch"
    FIRST_TOUCH = "first_touch"
    LINEAR = "linear"
    TIME_DECAY = "time_decay"
    POSITION_BASED = "position_based"
    DATA_DRIVEN = "data_driven"



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


class DemographicTargeting(BaseModel):
    """Demographics targeting for advanced audience reach"""
    model_config = ConfigDict(extra="ignore")
    
    age_ranges: List[str] = Field(default_factory=list, description="Age ranges: 18-24, 25-34, 35-44, 45-54, 55-64, 65+")
    genders: List[str] = Field(default_factory=list, description="male, female, unknown")
    income_segments: List[str] = Field(default_factory=list, description="low, medium, high, affluent")
    languages: List[str] = Field(default_factory=list, description="ISO 639-1 language codes")
    education_levels: List[str] = Field(default_factory=list)
    parental_status: List[str] = Field(default_factory=list, description="parent, not_parent")
    marital_status: List[str] = Field(default_factory=list)


class BrandSafetyConfig(BaseModel):
    """Brand safety and content control settings"""
    model_config = ConfigDict(extra="ignore")
    
    level: str = Field(default="standard", description="standard, strict, custom")
    blocked_categories: List[str] = Field(default_factory=list, description="IAB categories to block")
    blocked_keywords: List[str] = Field(default_factory=list)
    blocked_domains: List[str] = Field(default_factory=list)
    blocked_apps: List[str] = Field(default_factory=list)
    allowed_content_ratings: List[str] = Field(default_factory=lambda: ["G", "PG", "PG-13"])
    exclude_unrated_content: bool = Field(default=False)
    exclude_ugc: bool = Field(default=False)
    exclude_live_streaming: bool = Field(default=False)


class ContextualTargeting(BaseModel):
    """Contextual targeting configuration"""
    model_config = ConfigDict(extra="ignore")
    
    keywords: List[str] = Field(default_factory=list)
    keyword_match_type: str = Field(default="broad", description="broad, phrase, exact")
    contextual_categories: List[str] = Field(default_factory=list)
    sentiment: List[str] = Field(default_factory=list, description="positive, neutral, negative")
    exclude_keywords: List[str] = Field(default_factory=list)


class PlacementViewability(BaseModel):
    """Ad placement and viewability settings"""
    model_config = ConfigDict(extra="ignore")
    
    ad_positions: List[str] = Field(default_factory=list, description="above_fold, below_fold, sidebar, etc.")
    viewability_threshold: int = Field(default=50, description="Minimum viewability percentage")
    viewability_vendor: str = Field(default="any", description="moat, ias, doubleverify, any")
    video_viewability_threshold: int = Field(default=50)
    exclude_non_viewable: bool = Field(default=False)


class TimeTargeting(BaseModel):
    """Day and time-based targeting (dayparting)"""
    model_config = ConfigDict(extra="ignore")
    
    enabled: bool = Field(default=False)
    timezone: str = Field(default="UTC")
    days_of_week: List[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6], description="0=Monday to 6=Sunday")
    hours_of_day: List[int] = Field(default_factory=lambda: list(range(24)), description="0-23")
    # Advanced: hourly multipliers for bid adjustments
    hourly_bid_multipliers: Dict[str, float] = Field(default_factory=dict)


class TechnicalTargeting(BaseModel):
    """Browser, carrier, and connection targeting"""
    model_config = ConfigDict(extra="ignore")
    
    browsers: List[str] = Field(default_factory=list, description="chrome, safari, firefox, edge, etc.")
    browser_versions: Dict[str, str] = Field(default_factory=dict, description="min versions")
    connection_speeds: List[str] = Field(default_factory=list, description="2g, 3g, 4g, 5g, wifi, ethernet")
    min_bandwidth_kbps: Optional[int] = None
    exclude_vpn: bool = Field(default=False)
    exclude_datacenter_ips: bool = Field(default=True)


class CampaignTargeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    geo: GeoTargeting = Field(default_factory=GeoTargeting)
    device: DeviceTargeting = Field(default_factory=DeviceTargeting)
    inventory: InventoryTargeting = Field(default_factory=InventoryTargeting)
    video: VideoTargeting = Field(default_factory=VideoTargeting)
    content: ContentTargeting = Field(default_factory=ContentTargeting)
    privacy: PrivacySettings = Field(default_factory=PrivacySettings)
    # New advanced targeting
    demographics: DemographicTargeting = Field(default_factory=DemographicTargeting)
    brand_safety: BrandSafetyConfig = Field(default_factory=BrandSafetyConfig)
    contextual: ContextualTargeting = Field(default_factory=ContextualTargeting)
    placement: PlacementViewability = Field(default_factory=PlacementViewability)
    time: TimeTargeting = Field(default_factory=TimeTargeting)
    technical: TechnicalTargeting = Field(default_factory=TechnicalTargeting)


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


# ==================== CAMPAIGN OVERVIEW (Enhanced) ====================

class CampaignOverview(BaseModel):
    """Extended campaign overview for DSP planning"""
    model_config = ConfigDict(extra="ignore")
    
    business_product: str = Field(default="", description="Product or service being advertised")
    primary_goal: str = Field(default="brand_awareness", description="Campaign primary goal")
    kpi_type: str = Field(default="cpm", description="Primary KPI type")
    kpi_target: float = Field(default=0.0, description="Target KPI value")
    target_audience_description: str = Field(default="", description="Description of ideal customer")
    bidding_strategy: str = Field(default="manual_cpm")
    inventory_sources: List[str] = Field(default_factory=list)
    environments: List[str] = Field(default_factory=lambda: ["web", "app"])


# ==================== INSERTION ORDER MODELS ====================

class InsertionOrder(BaseModel):
    """Insertion Order for campaign structuring"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    advertiser_id: str = Field(default="")
    campaign_id: Optional[str] = None
    status: str = Field(default="draft")
    
    # Budget
    total_budget: float = Field(default=0.0)
    spent_budget: float = Field(default=0.0)
    currency: str = Field(default="USD")
    
    # Flight dates
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Structure
    structure_type: str = Field(default="audience", description="audience, tactic, goal")
    
    # Targeting exclusions at IO level
    excluded_domains: List[str] = Field(default_factory=list)
    excluded_apps: List[str] = Field(default_factory=list)
    excluded_categories: List[str] = Field(default_factory=list)
    excluded_audiences: List[str] = Field(default_factory=list)
    
    # Performance
    impressions: int = Field(default=0)
    clicks: int = Field(default=0)
    conversions: int = Field(default=0)
    
    # Line items
    line_item_ids: List[str] = Field(default_factory=list)
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class IOCreate(BaseModel):
    name: str
    advertiser_id: str = ""
    campaign_id: Optional[str] = None
    total_budget: float = 0.0
    currency: str = "USD"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    structure_type: str = "audience"


# ==================== LINE ITEM MODELS ====================

class LineItem(BaseModel):
    """Line Item within an Insertion Order"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    io_id: str  # Parent Insertion Order
    campaign_id: Optional[str] = None
    status: str = Field(default="draft")
    
    # Type
    line_item_type: str = Field(default="prospecting", description="prospecting, retargeting, contextual, audience")
    
    # Budget
    budget: float = Field(default=0.0)
    spent: float = Field(default=0.0)
    
    # Bidding
    bid_strategy: str = Field(default="manual_cpm")
    bid_price: float = Field(default=1.0)
    bid_cap: Optional[float] = None
    
    # Inventory
    inventory_source: str = Field(default="open_exchange")
    deal_ids: List[str] = Field(default_factory=list)
    
    # Targeting (can override IO settings)
    device_targeting: List[str] = Field(default_factory=list)
    environment_targeting: List[str] = Field(default_factory=list)
    geo_targeting: List[str] = Field(default_factory=list)
    
    # Dayparting
    daypart_enabled: bool = Field(default=False)
    daypart_hours: List[int] = Field(default_factory=list)
    daypart_days: List[int] = Field(default_factory=list)
    
    # Audience
    audience_ids: List[str] = Field(default_factory=list)
    exclude_audience_ids: List[str] = Field(default_factory=list)
    
    # Creative
    creative_ids: List[str] = Field(default_factory=list)
    
    # Performance
    impressions: int = Field(default=0)
    clicks: int = Field(default=0)
    conversions: int = Field(default=0)
    
    # Frequency
    frequency_cap: int = Field(default=0)
    frequency_period: str = Field(default="day")
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LineItemCreate(BaseModel):
    name: str
    io_id: str
    campaign_id: Optional[str] = None
    line_item_type: str = "prospecting"
    budget: float = 0.0
    bid_strategy: str = "manual_cpm"
    bid_price: float = 1.0
    inventory_source: str = "open_exchange"


# ==================== MEDIA PLANNER MODELS ====================

class MediaPlanForecast(BaseModel):
    """Media planning forecast results"""
    model_config = ConfigDict(extra="ignore")
    
    estimated_impressions: int = Field(default=0)
    estimated_reach: int = Field(default=0)
    estimated_clicks: int = Field(default=0)
    estimated_conversions: int = Field(default=0)
    estimated_cpm: float = Field(default=0.0)
    estimated_cpc: float = Field(default=0.0)
    estimated_cpa: float = Field(default=0.0)
    estimated_ctr: float = Field(default=0.0)
    estimated_cvr: float = Field(default=0.0)
    confidence_level: float = Field(default=0.0, description="Forecast confidence 0-100")
    
    # Budget recommendations
    recommended_daily_budget: float = Field(default=0.0)
    recommended_total_budget: float = Field(default=0.0)
    
    # Inventory availability
    available_inventory: int = Field(default=0)
    inventory_match_rate: float = Field(default=0.0)
    
    # Audience reach
    total_addressable_audience: int = Field(default=0)
    estimated_frequency: float = Field(default=0.0)


class MediaPlanRequest(BaseModel):
    """Request for media plan forecast"""
    budget: float
    duration_days: int = 30
    goal: str = "brand_awareness"
    kpi_type: str = "cpm"
    targeting: Optional[Dict[str, Any]] = None
    inventory_sources: List[str] = Field(default_factory=lambda: ["open_exchange"])
    creative_types: List[str] = Field(default_factory=lambda: ["banner"])


# ==================== AUDIENCE MODELS (Enhanced) ====================

class FirstPartyAudience(BaseModel):
    """First-party audience data"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str = Field(default="customer_list", description="customer_list, site_visitors, app_users, crm")
    size: int = Field(default=0)
    source: str = Field(default="upload")
    match_rate: float = Field(default=0.0)
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ThirdPartyAudience(BaseModel):
    """Third-party audience segment"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    provider: str = Field(default="", description="Oracle, Experian, LiveRamp, etc.")
    category: str = Field(default="")
    size: int = Field(default=0)
    cpm_cost: float = Field(default=0.0)


class LookalikeConfig(BaseModel):
    """Lookalike audience configuration"""
    model_config = ConfigDict(extra="ignore")
    
    source_audience_id: str
    expansion_level: int = Field(default=3, ge=1, le=10, description="1=most similar, 10=broadest")
    estimated_size: int = Field(default=0)


# ==================== ATTRIBUTION MODELS (Enhanced) ====================

class AttributionEvent(BaseModel):
    """Attribution tracking event"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    campaign_id: str
    line_item_id: Optional[str] = None
    creative_id: Optional[str] = None
    event_type: str = Field(description="impression, click, conversion, view_through")
    event_value: float = Field(default=0.0)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Attribution metadata
    channel: str = Field(default="display")
    device: str = Field(default="")
    geo: str = Field(default="")
    
    # Conversion details
    conversion_type: Optional[str] = None
    conversion_window_hours: int = Field(default=24)


class AttributionPath(BaseModel):
    """User attribution path/journey"""
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    touchpoints: List[Dict[str, Any]] = Field(default_factory=list)
    conversion_value: float = Field(default=0.0)
    conversion_timestamp: Optional[datetime] = None
    path_length: int = Field(default=0)
    time_to_conversion_hours: float = Field(default=0.0)


# ==================== MEASUREMENT & REPORTING MODELS ====================

class ConversionConfig(BaseModel):
    """Conversion tracking configuration"""
    model_config = ConfigDict(extra="ignore")
    
    enabled: bool = Field(default=False)
    pixel_id: str = Field(default="")
    conversion_window_days: int = Field(default=30)
    view_through_window_hours: int = Field(default=24)
    click_through_window_days: int = Field(default=30)
    attribution_model: str = Field(default="last_touch")
    count_type: str = Field(default="all", description="all, unique")


class PerformanceProjection(BaseModel):
    """Campaign performance projection"""
    model_config = ConfigDict(extra="ignore")
    
    # Impressions
    min_impressions: int = Field(default=0)
    max_impressions: int = Field(default=0)
    expected_impressions: int = Field(default=0)
    
    # Clicks
    min_clicks: int = Field(default=0)
    max_clicks: int = Field(default=0)
    expected_clicks: int = Field(default=0)
    
    # Conversions
    min_conversions: int = Field(default=0)
    max_conversions: int = Field(default=0)
    expected_conversions: int = Field(default=0)
    
    # Costs
    expected_cpm_range: List[float] = Field(default_factory=lambda: [0.0, 0.0])
    expected_cpc_range: List[float] = Field(default_factory=lambda: [0.0, 0.0])
    expected_cpa_range: List[float] = Field(default_factory=lambda: [0.0, 0.0])
    
    # Industry benchmarks
    industry_avg_ctr: float = Field(default=0.0)
    industry_avg_cvr: float = Field(default=0.0)
    industry_avg_cpm: float = Field(default=0.0)


# ==================== INDUSTRY BENCHMARKS ====================

INDUSTRY_BENCHMARKS = {
    "display": {
        "ctr": 0.35,
        "cvr": 0.77,
        "cpm_range": [1.0, 5.0],
        "cpc_range": [0.50, 2.00],
        "viewability": 52.0
    },
    "video": {
        "ctr": 0.44,
        "cvr": 0.90,
        "cpm_range": [5.0, 25.0],
        "cpc_range": [0.75, 3.00],
        "vtr": 68.0,
        "viewability": 66.0
    },
    "native": {
        "ctr": 0.80,
        "cvr": 1.20,
        "cpm_range": [3.0, 12.0],
        "cpc_range": [0.40, 1.50],
        "viewability": 70.0
    },
    "ctv": {
        "ctr": 0.10,
        "cvr": 0.30,
        "cpm_range": [15.0, 45.0],
        "cpc_range": [5.00, 15.00],
        "vtr": 95.0
    },
    "audio": {
        "ctr": 0.15,
        "cvr": 0.25,
        "cpm_range": [8.0, 20.0],
        "listen_through_rate": 90.0
    }
}




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
    bid_id: Optional[str] = None  # The actual bid ID returned in the response (for nurl/burl callbacks)
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
