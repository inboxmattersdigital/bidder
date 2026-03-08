import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Check, Save, Megaphone, Target, DollarSign, Image, Settings, 
  ChevronRight, Loader2, Users, Clock, Shield, BarChart3, Globe, 
  Smartphone, Monitor, Tv, Radio, MapPin, Calendar, Lightbulb, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Slider } from "../components/ui/slider";
import { Checkbox } from "../components/ui/checkbox";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../components/ui/select";
import { toast } from "sonner";
import { 
  createCampaign, updateCampaign, getCampaign, getCreatives,
  getReferenceData, getMediaPlanForecast, recommendCampaignStrategy
} from "../lib/api";

// ==================== CONSTANTS ====================

const STEPS = [
  { id: 1, key: "overview", title: "Campaign overview", icon: Megaphone },
  { id: 2, key: "budget", title: "Budget & bidding", icon: DollarSign },
  { id: 3, key: "targeting", title: "Targeting", icon: Target },
  { id: 4, key: "audience", title: "Audience", icon: Users },
  { id: 5, key: "creatives", title: "Creatives", icon: Image },
  { id: 6, key: "schedule", title: "Schedule & pacing", icon: Clock },
  { id: 7, key: "safety", title: "Brand safety", icon: Shield },
  { id: 8, key: "measurement", title: "Measurement", icon: BarChart3 },
];

const CAMPAIGN_GOALS = [
  { value: "brand_awareness", label: "Brand Awareness", desc: "Increase visibility" },
  { value: "reach", label: "Reach", desc: "Maximize unique users" },
  { value: "traffic", label: "Traffic", desc: "Drive website visits" },
  { value: "engagement", label: "Engagement", desc: "Increase interactions" },
  { value: "app_installs", label: "App Installs", desc: "Drive app downloads" },
  { value: "video_views", label: "Video Views", desc: "Maximize video consumption" },
  { value: "lead_generation", label: "Lead Generation", desc: "Collect leads" },
  { value: "conversions", label: "Conversions", desc: "Drive purchases/actions" },
];

const KPI_TYPES = [
  { value: "cpm", label: "CPM", desc: "Cost per 1,000 impressions" },
  { value: "cpc", label: "CPC", desc: "Cost per click" },
  { value: "cpa", label: "CPA", desc: "Cost per acquisition" },
  { value: "cpv", label: "CPV", desc: "Cost per view" },
  { value: "vcpm", label: "vCPM", desc: "Viewable CPM" },
  { value: "roas", label: "ROAS", desc: "Return on ad spend" },
];

const BIDDING_STRATEGIES = [
  { value: "manual_cpm", label: "Manual CPM", desc: "Set your own CPM bid" },
  { value: "manual_cpc", label: "Manual CPC", desc: "Set your own CPC bid" },
  { value: "target_cpa", label: "Target CPA", desc: "Optimize for conversions" },
  { value: "target_roas", label: "Target ROAS", desc: "Optimize for return" },
  { value: "maximize_conversions", label: "Maximize Conversions", desc: "Auto-optimize for conversions" },
  { value: "maximize_clicks", label: "Maximize Clicks", desc: "Auto-optimize for clicks" },
];

const INVENTORY_SOURCES = [
  { value: "open_exchange", label: "Open Exchange", icon: Globe, desc: "Programmatic open market" },
  { value: "pmp", label: "Private Marketplace", icon: Shield, desc: "Curated deals" },
  { value: "pg", label: "Programmatic Guaranteed", icon: Check, desc: "Reserved inventory" },
  { value: "youtube", label: "YouTube", icon: Tv, desc: "Video ads on YouTube" },
  { value: "gdn", label: "Google Display Network", icon: Monitor, desc: "Display across Google" },
  { value: "ctv", label: "Connected TV", icon: Tv, desc: "Streaming TV ads" },
  { value: "audio", label: "Audio", icon: Radio, desc: "Podcast & streaming audio" },
];

const ENVIRONMENTS = [
  { value: "web", label: "Web", icon: Monitor },
  { value: "app", label: "Mobile App", icon: Smartphone },
  { value: "ctv", label: "Connected TV", icon: Tv },
  { value: "dooh", label: "Digital Out-of-Home", icon: MapPin },
];

const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const GENDERS = ["male", "female", "unknown"];
const INCOME_SEGMENTS = ["low", "medium", "high", "affluent"];
const LANGUAGES = [
  { code: "en", name: "English" }, { code: "es", name: "Spanish" },
  { code: "fr", name: "French" }, { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" }, { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" }, { code: "ko", name: "Korean" },
  { code: "hi", name: "Hindi" }, { code: "ar", name: "Arabic" },
];

const BRAND_SAFETY_LEVELS = [
  { value: "standard", label: "Standard", desc: "Basic brand safety" },
  { value: "strict", label: "Strict", desc: "Enhanced protection" },
  { value: "custom", label: "Custom", desc: "Define your own rules" },
];

const COUNTRIES = [
  { code: "USA", name: "United States" }, { code: "CAN", name: "Canada" },
  { code: "GBR", name: "United Kingdom" }, { code: "DEU", name: "Germany" },
  { code: "FRA", name: "France" }, { code: "AUS", name: "Australia" },
  { code: "JPN", name: "Japan" }, { code: "IND", name: "India" },
  { code: "BRA", name: "Brazil" }, { code: "MEX", name: "Mexico" },
  { code: "ESP", name: "Spain" }, { code: "ITA", name: "Italy" },
  { code: "NLD", name: "Netherlands" }, { code: "CHN", name: "China" },
  { code: "KOR", name: "South Korea" }, { code: "SGP", name: "Singapore" },
];

const DEVICE_TYPES = [
  { id: 1, name: "Mobile/Tablet" }, { id: 2, name: "Desktop" },
  { id: 3, name: "Connected TV" }, { id: 4, name: "Phone" },
  { id: 5, name: "Tablet" }, { id: 7, name: "Set Top Box" },
];

const OS_LIST = ["Android", "iOS", "Windows", "macOS", "Linux", "Chrome OS", "tvOS", "Roku", "Fire OS"];
const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge", "Samsung Internet", "Opera"];
const CONNECTION_TYPES = ["wifi", "4g", "5g", "3g", "ethernet"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ATTRIBUTION_MODELS = [
  { value: "last_touch", label: "Last Touch", desc: "Credit last interaction" },
  { value: "first_touch", label: "First Touch", desc: "Credit first interaction" },
  { value: "linear", label: "Linear", desc: "Equal credit to all" },
  { value: "time_decay", label: "Time Decay", desc: "More credit to recent" },
  { value: "position_based", label: "Position Based", desc: "40/20/40 split" },
];

// ==================== MAIN COMPONENT ====================

export default function CampaignWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  // Check if we're creating from media plan
  const fromMediaPlan = location.state?.fromMediaPlan;
  const planData = location.state?.planData;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatives, setCreatives] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [strategyRec, setStrategyRec] = useState(null);
  const [showPlanBanner, setShowPlanBanner] = useState(fromMediaPlan);
  
  // ==================== FORM STATE ====================
  const [form, setForm] = useState({
    // Campaign Overview
    name: "",
    business_product: "",
    description: "",
    primary_goal: "brand_awareness",
    kpi_type: "cpm",
    kpi_target: 5.0,
    target_audience_description: "",
    
    // Budget & Bidding
    bidding_strategy: "manual_cpm",
    bid_price: 2.0,
    bid_floor: 0.5,
    currency: "USD",
    daily_budget: 100,
    total_budget: 3000,
    pacing_type: "even",
    
    // Inventory
    inventory_sources: ["open_exchange"],
    environments: ["web", "app"],
    
    // Geographic Targeting
    geo_countries: [],
    geo_cities: [],
    geo_regions: [],
    lat_long_targeting: false,
    lat_long_points: [],
    radius_km: 10,
    
    // Device Targeting
    device_types: [],
    os_list: [],
    browsers: [],
    carriers: [],
    connection_types: [],
    
    // Demographics
    age_ranges: [],
    genders: [],
    income_segments: [],
    languages: [],
    
    // Contextual Targeting
    contextual_keywords: [],
    contextual_categories: [],
    keyword_match_type: "broad",
    
    // Placement & Viewability
    ad_positions: [],
    viewability_threshold: 50,
    exclude_non_viewable: false,
    
    // Time Targeting
    time_targeting_enabled: false,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    hours_of_day: Array.from({ length: 24 }, (_, i) => i),
    timezone: "UTC",
    
    // Brand Safety
    brand_safety_level: "standard",
    blocked_categories: [],
    blocked_keywords: [],
    blocked_domains: [],
    exclude_ugc: false,
    exclude_live_streaming: false,
    
    // Audience
    first_party_audiences: [],
    third_party_audiences: [],
    lookalike_enabled: false,
    lookalike_expansion: 3,
    audience_exclusions: [],
    
    // Creatives
    creative_id: "",
    creative_ids: [],
    
    // Schedule
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    
    // Frequency
    frequency_cap_enabled: false,
    frequency_cap_count: 5,
    frequency_cap_period: "day",
    
    // Advanced
    priority: 5,
    bid_shading_enabled: false,
    ml_prediction_enabled: false,
    spo_enabled: false,
    
    // Measurement
    conversion_tracking_enabled: false,
    conversion_pixel_id: "",
    attribution_model: "last_touch",
    click_through_window: 30,
    view_through_window: 1,
  });

  // ==================== EFFECTS ====================
  
  useEffect(() => {
    loadInitialData();
  }, [id]);

  // Apply media plan data if coming from planner
  useEffect(() => {
    if (fromMediaPlan && planData && !isEdit) {
      setForm(prev => ({
        ...prev,
        // Budget
        total_budget: planData.total_budget || prev.total_budget,
        daily_budget: planData.daily_budget || prev.daily_budget,
        
        // Goal & Strategy
        primary_goal: planData.primary_goal || prev.primary_goal,
        kpi_type: planData.kpi_type || prev.kpi_type,
        bidding_strategy: planData.bidding_strategy || prev.bidding_strategy,
        pacing_type: planData.pacing_type || prev.pacing_type,
        
        // Frequency Cap
        frequency_cap_enabled: planData.frequency_cap_enabled ?? prev.frequency_cap_enabled,
        frequency_cap_count: planData.frequency_cap_count || prev.frequency_cap_count,
        frequency_cap_period: planData.frequency_cap_period || prev.frequency_cap_period,
        
        // Inventory Sources
        inventory_sources: planData.inventory_sources || prev.inventory_sources,
      }));
      
      // Set forecast from plan data
      if (planData.forecast) {
        setForecast({
          estimated_impressions: planData.forecast.impressions,
          estimated_reach: planData.forecast.reach,
          estimated_clicks: planData.forecast.clicks,
          estimated_cpm: planData.forecast.cpm,
          confidence_level: planData.forecast.confidence
        });
      }
      
      // Mark budget step as potentially complete
      setCompletedSteps(prev => new Set([...prev, 2]));
      
      toast.success("Media plan settings applied!");
    }
  }, [fromMediaPlan, planData, isEdit]);

  useEffect(() => {
    // Generate forecast when budget/targeting changes
    if (form.total_budget > 0 && form.primary_goal) {
      generateForecast();
    }
  }, [form.total_budget, form.daily_budget, form.primary_goal, form.inventory_sources]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const creativesRes = await getCreatives();
      setCreatives(creativesRes.data || []);
      
      if (id) {
        const campaignRes = await getCampaign(id);
        const c = campaignRes.data;
        
        setForm(prev => ({
          ...prev,
          name: c.name || "",
          business_product: c.business_product || "",
          description: c.description || "",
          primary_goal: c.primary_goal || "brand_awareness",
          kpi_type: c.kpi_type || "cpm",
          bid_price: c.bid_price || 2.0,
          bid_floor: c.bid_floor || 0.5,
          currency: c.currency || "USD",
          daily_budget: c.budget?.daily_budget || 100,
          total_budget: c.budget?.total_budget || 3000,
          pacing_type: c.budget?.pacing_type || "even",
          inventory_sources: c.inventory_sources || ["open_exchange"],
          environments: c.environments || ["web", "app"],
          geo_countries: c.targeting?.geo?.countries || [],
          device_types: c.targeting?.device?.device_types || [],
          os_list: c.targeting?.device?.os_list || [],
          creative_id: c.creative_id || "",
          start_date: c.start_date?.split('T')[0] || "",
          end_date: c.end_date?.split('T')[0] || "",
          frequency_cap_enabled: c.frequency_cap?.enabled || false,
          frequency_cap_count: c.frequency_cap?.max_impressions || 5,
          frequency_cap_period: c.frequency_cap?.period || "day",
          priority: c.priority || 5,
          bid_shading_enabled: c.bid_shading?.enabled || false,
          ml_prediction_enabled: c.ml_prediction?.enabled || false,
          // Demographics
          age_ranges: c.targeting?.demographics?.age_ranges || [],
          genders: c.targeting?.demographics?.genders || [],
          income_segments: c.targeting?.demographics?.income_segments || [],
          languages: c.targeting?.demographics?.languages || [],
          // Brand Safety
          brand_safety_level: c.targeting?.brand_safety?.level || "standard",
          blocked_categories: c.targeting?.brand_safety?.blocked_categories || [],
          // Time targeting
          time_targeting_enabled: c.targeting?.time?.enabled || false,
          days_of_week: c.targeting?.time?.days_of_week || [0,1,2,3,4,5,6],
          hours_of_day: c.targeting?.time?.hours_of_day || Array.from({length: 24}, (_,i) => i),
        }));
        
        setCompletedSteps(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const generateForecast = async () => {
    try {
      const durationDays = form.end_date && form.start_date
        ? Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24))
        : 30;
      
      const res = await getMediaPlanForecast({
        budget: form.total_budget || form.daily_budget * durationDays,
        duration_days: durationDays,
        goal: form.primary_goal,
        inventory_sources: form.inventory_sources,
        creative_types: form.creative_id ? ["display"] : ["display"],
        targeting: {
          geo: { countries: form.geo_countries },
          device: { device_types: form.device_types },
          demographics: { age_ranges: form.age_ranges, genders: form.genders }
        }
      });
      setForecast(res.data);
    } catch (err) {
      // Silent fail for forecast
    }
  };

  const getStrategyRecommendation = async () => {
    try {
      const durationDays = form.end_date && form.start_date
        ? Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24))
        : 30;
      
      const res = await recommendCampaignStrategy(
        form.primary_goal, 
        form.total_budget || form.daily_budget * durationDays,
        durationDays,
        ["display"]
      );
      setStrategyRec(res.data);
      toast.success("Strategy recommendation loaded");
    } catch (err) {
      toast.error("Failed to get recommendations");
    }
  };

  // ==================== HANDLERS ====================

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, item) => {
    setForm(prev => {
      const arr = prev[field] || [];
      const exists = arr.includes(item);
      return {
        ...prev,
        [field]: exists ? arr.filter(i => i !== item) : [...arr, item]
      };
    });
  };

  const isStepValid = (stepId) => {
    switch (stepId) {
      case 1: return form.name.trim().length > 0 && form.primary_goal;
      case 2: return form.bid_price > 0 && form.daily_budget > 0;
      case 3: return true; // Targeting is optional
      case 4: return true; // Audience is optional
      case 5: return form.creative_id || form.creative_ids.length > 0;
      case 6: return form.start_date;
      case 7: return true; // Brand safety has defaults
      case 8: return true; // Measurement is optional
      default: return true;
    }
  };

  const handleStepClick = (stepId) => {
    if (stepId <= currentStep || completedSteps.has(stepId - 1) || stepId === currentStep + 1) {
      setCurrentStep(stepId);
    }
  };

  const handleContinue = () => {
    if (isStepValid(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast.error("Please complete required fields");
    }
  };

  const handleSave = async (isDraft = false) => {
    if (!form.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    
    const selectedCreative = form.creative_id || (form.creative_ids.length > 0 ? form.creative_ids[0] : null);
    if (!selectedCreative && !isDraft) {
      toast.error("Please select a creative");
      return;
    }

    setSaving(true);
    try {
      const campaignData = {
        name: form.name,
        bid_price: form.bid_price,
        bid_floor: form.bid_floor,
        currency: form.currency,
        priority: form.priority,
        placements: [],
        creative_id: selectedCreative || "",
        budget: {
          daily_budget: form.daily_budget,
          total_budget: form.total_budget,
          pacing_type: form.pacing_type,
        },
        bid_shading: { enabled: form.bid_shading_enabled },
        frequency_cap: {
          enabled: form.frequency_cap_enabled,
          max_impressions: form.frequency_cap_count,
          period: form.frequency_cap_period,
        },
        spo: { enabled: form.spo_enabled },
        ml_prediction: { enabled: form.ml_prediction_enabled },
        targeting: {
          geo: { countries: form.geo_countries, cities: form.geo_cities, regions: form.geo_regions },
          device: { device_types: form.device_types, os_list: form.os_list },
          demographics: {
            age_ranges: form.age_ranges,
            genders: form.genders,
            income_segments: form.income_segments,
            languages: form.languages,
          },
          brand_safety: {
            level: form.brand_safety_level,
            blocked_categories: form.blocked_categories,
            blocked_keywords: form.blocked_keywords,
            blocked_domains: form.blocked_domains,
            exclude_ugc: form.exclude_ugc,
            exclude_live_streaming: form.exclude_live_streaming,
          },
          contextual: {
            keywords: form.contextual_keywords,
            contextual_categories: form.contextual_categories,
            keyword_match_type: form.keyword_match_type,
          },
          placement: {
            ad_positions: form.ad_positions,
            viewability_threshold: form.viewability_threshold,
            exclude_non_viewable: form.exclude_non_viewable,
          },
          time: {
            enabled: form.time_targeting_enabled,
            timezone: form.timezone,
            days_of_week: form.days_of_week,
            hours_of_day: form.hours_of_day,
          },
          technical: {
            browsers: form.browsers,
            connection_speeds: form.connection_types,
          },
        },
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        // Extended fields
        business_product: form.business_product,
        description: form.description,
        primary_goal: form.primary_goal,
        kpi_type: form.kpi_type,
        kpi_target: form.kpi_target,
        target_audience_description: form.target_audience_description,
        bidding_strategy: form.bidding_strategy,
        inventory_sources: form.inventory_sources,
        environments: form.environments,
      };

      if (isEdit) {
        await updateCampaign(id, campaignData);
        toast.success("Campaign updated successfully");
      } else {
        await createCampaign(campaignData);
        toast.success(isDraft ? "Campaign saved as draft" : "Campaign created successfully");
      }
      navigate("/campaigns");
    } catch (error) {
      const errorMsg = error.response?.data?.detail;
      if (typeof errorMsg === 'object' && errorMsg !== null) {
        toast.error(`Validation error: ${JSON.stringify(errorMsg)}`);
      } else {
        toast.error(errorMsg || "Failed to save campaign");
      }
    } finally {
      setSaving(false);
    }
  };

  // ==================== RENDER STEPS ====================

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderOverviewStep();
      case 2: return renderBudgetStep();
      case 3: return renderTargetingStep();
      case 4: return renderAudienceStep();
      case 5: return renderCreativesStep();
      case 6: return renderScheduleStep();
      case 7: return renderBrandSafetyStep();
      case 8: return renderMeasurementStep();
      default: return null;
    }
  };

  // Step 1: Campaign Overview
  const renderOverviewStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Campaign Overview</h2>
        <p className="text-sm text-[#64748B]">Define your campaign goals and target audience</p>
      </div>

      {/* Campaign Name */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Campaign Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Enter campaign name"
          className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          data-testid="campaign-name-input"
        />
      </div>

      {/* Business/Product */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Business / Product</Label>
        <Input
          value={form.business_product}
          onChange={(e) => updateField("business_product", e.target.value)}
          placeholder="Describe your product or service"
          className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
        />
      </div>

      {/* Primary Goal */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Primary Goal *</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CAMPAIGN_GOALS.map((goal) => (
            <div
              key={goal.value}
              onClick={() => updateField("primary_goal", goal.value)}
              className={`p-3 rounded-lg cursor-pointer border transition-all ${
                form.primary_goal === goal.value
                  ? "bg-[#3B82F6]/20 border-[#3B82F6]"
                  : "surface-secondary border-[#2D3B55] hover:border-[#3B82F6]/50"
              }`}
            >
              <p className="text-sm font-medium text-[#F8FAFC]">{goal.label}</p>
              <p className="text-xs text-[#64748B] mt-1">{goal.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Key Performance Indicator</Label>
          <Select value={form.kpi_type} onValueChange={(v) => updateField("kpi_type", v)}>
            <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="surface-primary border-[#2D3B55]">
              {KPI_TYPES.map((kpi) => (
                <SelectItem key={kpi.value} value={kpi.value} className="text-[#F8FAFC]">
                  {kpi.label} - {kpi.desc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Target {form.kpi_type.toUpperCase()}</Label>
          <Input
            type="number"
            step="0.01"
            value={form.kpi_target}
            onChange={(e) => updateField("kpi_target", parseFloat(e.target.value) || 0)}
            className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          />
        </div>
      </div>

      {/* Target Audience Description */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Target Audience Description</Label>
        <Textarea
          value={form.target_audience_description}
          onChange={(e) => updateField("target_audience_description", e.target.value)}
          placeholder="Describe your ideal customer (e.g., 'Tech-savvy millennials interested in sustainable products')"
          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] min-h-[80px]"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Campaign Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Internal notes about this campaign"
          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] min-h-[60px]"
        />
      </div>

      {/* Get Recommendations Button */}
      <Button
        variant="outline"
        onClick={getStrategyRecommendation}
        className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10"
      >
        <Lightbulb className="w-4 h-4 mr-2" />
        Get Strategy Recommendations
      </Button>

      {/* Strategy Recommendations */}
      {strategyRec && (
        <Card className="surface-secondary border-[#3B82F6]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#3B82F6]">Recommended Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Bidding Strategy:</span>
              <span className="text-[#F8FAFC]">{strategyRec.strategy?.bidding_strategy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Frequency Cap:</span>
              <span className="text-[#F8FAFC]">{strategyRec.strategy?.frequency_cap}/{strategyRec.strategy?.frequency_period}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Priority Inventory:</span>
              <span className="text-[#F8FAFC]">{strategyRec.strategy?.priority_inventory?.slice(0,2).join(", ")}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Step 2: Budget & Bidding
  const renderBudgetStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Budget & Bidding</h2>
        <p className="text-sm text-[#64748B]">Set your budget, bidding strategy, and inventory sources</p>
      </div>

      {/* Budget */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Currency</Label>
          <Select value={form.currency} onValueChange={(v) => updateField("currency", v)}>
            <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="surface-primary border-[#2D3B55]">
              {["USD", "EUR", "GBP", "CAD", "AUD", "JPY"].map((c) => (
                <SelectItem key={c} value={c} className="text-[#F8FAFC]">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Daily Budget *</Label>
          <Input
            type="number"
            value={form.daily_budget}
            onChange={(e) => updateField("daily_budget", parseFloat(e.target.value) || 0)}
            className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Total Budget</Label>
          <Input
            type="number"
            value={form.total_budget}
            onChange={(e) => updateField("total_budget", parseFloat(e.target.value) || 0)}
            className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          />
        </div>
      </div>

      {/* Bidding Strategy */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Bidding Strategy</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {BIDDING_STRATEGIES.map((strategy) => (
            <div
              key={strategy.value}
              onClick={() => updateField("bidding_strategy", strategy.value)}
              className={`p-3 rounded-lg cursor-pointer border transition-all ${
                form.bidding_strategy === strategy.value
                  ? "bg-[#10B981]/20 border-[#10B981]"
                  : "surface-secondary border-[#2D3B55] hover:border-[#10B981]/50"
              }`}
            >
              <p className="text-sm font-medium text-[#F8FAFC]">{strategy.label}</p>
              <p className="text-xs text-[#64748B] mt-1">{strategy.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bid Price */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Bid Price ({form.currency}) *</Label>
          <Input
            type="number"
            step="0.01"
            value={form.bid_price}
            onChange={(e) => updateField("bid_price", parseFloat(e.target.value) || 0)}
            className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Bid Floor</Label>
          <Input
            type="number"
            step="0.01"
            value={form.bid_floor}
            onChange={(e) => updateField("bid_floor", parseFloat(e.target.value) || 0)}
            className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          />
        </div>
      </div>

      {/* Pacing */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Budget Pacing</Label>
        <div className="flex gap-4">
          {[
            { value: "even", label: "Even", desc: "Spread evenly throughout the day" },
            { value: "accelerated", label: "Accelerated", desc: "Spend budget as fast as possible" },
            { value: "front_loaded", label: "Front-loaded", desc: "Spend more early in campaign" },
          ].map((pacing) => (
            <div
              key={pacing.value}
              onClick={() => updateField("pacing_type", pacing.value)}
              className={`flex-1 p-3 rounded-lg cursor-pointer border transition-all ${
                form.pacing_type === pacing.value
                  ? "bg-[#8B5CF6]/20 border-[#8B5CF6]"
                  : "surface-secondary border-[#2D3B55] hover:border-[#8B5CF6]/50"
              }`}
            >
              <p className="text-sm font-medium text-[#F8FAFC]">{pacing.label}</p>
              <p className="text-xs text-[#64748B] mt-1">{pacing.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory Sources */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Inventory Sources</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {INVENTORY_SOURCES.map((source) => {
            const Icon = source.icon;
            const isSelected = form.inventory_sources.includes(source.value);
            return (
              <div
                key={source.value}
                onClick={() => toggleArrayItem("inventory_sources", source.value)}
                className={`p-3 rounded-lg cursor-pointer border transition-all ${
                  isSelected
                    ? "bg-[#F59E0B]/20 border-[#F59E0B]"
                    : "surface-secondary border-[#2D3B55] hover:border-[#F59E0B]/50"
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${isSelected ? "text-[#F59E0B]" : "text-[#64748B]"}`} />
                <p className="text-sm font-medium text-[#F8FAFC]">{source.label}</p>
                <p className="text-xs text-[#64748B] mt-1">{source.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Environments */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Environments</Label>
        <div className="flex gap-3">
          {ENVIRONMENTS.map((env) => {
            const Icon = env.icon;
            const isSelected = form.environments.includes(env.value);
            return (
              <div
                key={env.value}
                onClick={() => toggleArrayItem("environments", env.value)}
                className={`flex-1 p-3 rounded-lg cursor-pointer border transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-[#3B82F6]/20 border-[#3B82F6]"
                    : "surface-secondary border-[#2D3B55] hover:border-[#3B82F6]/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-[#3B82F6]" : "text-[#64748B]"}`} />
                <span className="text-sm text-[#F8FAFC]">{env.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forecast Preview */}
      {forecast && (
        <Card className="surface-secondary border-[#10B981]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#10B981]">Performance Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[#64748B]">Est. Impressions</p>
                <p className="text-lg font-bold text-[#F8FAFC]">{forecast.estimated_impressions?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Est. Reach</p>
                <p className="text-lg font-bold text-[#F8FAFC]">{forecast.estimated_reach?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Est. Clicks</p>
                <p className="text-lg font-bold text-[#F8FAFC]">{forecast.estimated_clicks?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Est. CPM</p>
                <p className="text-lg font-bold text-[#F8FAFC]">${forecast.estimated_cpm?.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#64748B]">Confidence</span>
                <span className="text-[#10B981]">{forecast.confidence_level}%</span>
              </div>
              <Progress value={forecast.confidence_level} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Step 3: Targeting
  const renderTargetingStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Targeting</h2>
        <p className="text-sm text-[#64748B]">Define geographic, device, and technical targeting</p>
      </div>

      <Tabs defaultValue="geo" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-[#0A0F1C]">
          <TabsTrigger value="geo" className="data-[state=active]:bg-[#3B82F6]">Geography</TabsTrigger>
          <TabsTrigger value="device" className="data-[state=active]:bg-[#3B82F6]">Device</TabsTrigger>
          <TabsTrigger value="contextual" className="data-[state=active]:bg-[#3B82F6]">Contextual</TabsTrigger>
          <TabsTrigger value="technical" className="data-[state=active]:bg-[#3B82F6]">Technical</TabsTrigger>
        </TabsList>

        {/* Geographic Targeting */}
        <TabsContent value="geo" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Countries</Label>
            <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2 surface-secondary rounded-lg">
              {COUNTRIES.map((country) => (
                <div
                  key={country.code}
                  onClick={() => toggleArrayItem("geo_countries", country.code)}
                  className={`px-3 py-2 rounded cursor-pointer text-sm transition-all ${
                    form.geo_countries.includes(country.code)
                      ? "bg-[#3B82F6] text-white"
                      : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                  }`}
                >
                  {country.name}
                </div>
              ))}
            </div>
            {form.geo_countries.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.geo_countries.map((code) => (
                  <Badge key={code} variant="secondary" className="bg-[#3B82F6]/20 text-[#3B82F6]">
                    {COUNTRIES.find(c => c.code === code)?.name || code}
                    <button onClick={() => toggleArrayItem("geo_countries", code)} className="ml-2">×</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Radius Targeting */}
          <div className="flex items-center gap-4 p-4 surface-secondary rounded-lg">
            <Switch
              checked={form.lat_long_targeting}
              onCheckedChange={(v) => updateField("lat_long_targeting", v)}
            />
            <div>
              <p className="text-sm text-[#F8FAFC]">Radius-based targeting</p>
              <p className="text-xs text-[#64748B]">Target users within a specific distance from coordinates</p>
            </div>
            {form.lat_long_targeting && (
              <div className="ml-auto flex items-center gap-2">
                <Input
                  type="number"
                  value={form.radius_km}
                  onChange={(e) => updateField("radius_km", parseInt(e.target.value) || 10)}
                  className="w-20 surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                />
                <span className="text-sm text-[#94A3B8]">km radius</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Device Targeting */}
        <TabsContent value="device" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Device Types</Label>
            <div className="flex flex-wrap gap-2">
              {DEVICE_TYPES.map((device) => (
                <Badge
                  key={device.id}
                  onClick={() => toggleArrayItem("device_types", device.id)}
                  className={`cursor-pointer ${
                    form.device_types.includes(device.id)
                      ? "bg-[#3B82F6] text-white"
                      : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                  }`}
                >
                  {device.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Operating Systems</Label>
            <div className="flex flex-wrap gap-2">
              {OS_LIST.map((os) => (
                <Badge
                  key={os}
                  onClick={() => toggleArrayItem("os_list", os)}
                  className={`cursor-pointer ${
                    form.os_list.includes(os)
                      ? "bg-[#10B981] text-white"
                      : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                  }`}
                >
                  {os}
                </Badge>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Contextual Targeting */}
        <TabsContent value="contextual" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Keywords</Label>
            <Textarea
              placeholder="Enter keywords (one per line)"
              value={form.contextual_keywords.join("\n")}
              onChange={(e) => updateField("contextual_keywords", e.target.value.split("\n").filter(k => k.trim()))}
              className="surface-secondary border-[#2D3B55] text-[#F8FAFC] min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Keyword Match Type</Label>
            <Select value={form.keyword_match_type} onValueChange={(v) => updateField("keyword_match_type", v)}>
              <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="surface-primary border-[#2D3B55]">
                <SelectItem value="broad" className="text-[#F8FAFC]">Broad Match</SelectItem>
                <SelectItem value="phrase" className="text-[#F8FAFC]">Phrase Match</SelectItem>
                <SelectItem value="exact" className="text-[#F8FAFC]">Exact Match</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        {/* Technical Targeting */}
        <TabsContent value="technical" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Browsers</Label>
            <div className="flex flex-wrap gap-2">
              {BROWSERS.map((browser) => (
                <Badge
                  key={browser}
                  onClick={() => toggleArrayItem("browsers", browser)}
                  className={`cursor-pointer ${
                    form.browsers.includes(browser)
                      ? "bg-[#8B5CF6] text-white"
                      : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                  }`}
                >
                  {browser}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Connection Types</Label>
            <div className="flex flex-wrap gap-2">
              {CONNECTION_TYPES.map((conn) => (
                <Badge
                  key={conn}
                  onClick={() => toggleArrayItem("connection_types", conn)}
                  className={`cursor-pointer ${
                    form.connection_types.includes(conn)
                      ? "bg-[#F59E0B] text-white"
                      : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                  }`}
                >
                  {conn.toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>

          {/* Viewability */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Viewability Threshold: {form.viewability_threshold}%</Label>
            <Slider
              value={[form.viewability_threshold]}
              onValueChange={([v]) => updateField("viewability_threshold", v)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                checked={form.exclude_non_viewable}
                onCheckedChange={(v) => updateField("exclude_non_viewable", v)}
              />
              <span className="text-sm text-[#94A3B8]">Exclude non-viewable inventory</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Step 4: Audience
  const renderAudienceStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Audience</h2>
        <p className="text-sm text-[#64748B]">Define demographic and audience targeting</p>
      </div>

      {/* Demographics */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">Demographics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Age Ranges */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Age Ranges</Label>
            <div className="flex flex-wrap gap-2">
              {AGE_RANGES.map((age) => (
                <Badge
                  key={age}
                  onClick={() => toggleArrayItem("age_ranges", age)}
                  className={`cursor-pointer ${
                    form.age_ranges.includes(age)
                      ? "bg-[#3B82F6] text-white"
                      : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                  }`}
                >
                  {age}
                </Badge>
              ))}
            </div>
          </div>

          {/* Genders */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Genders</Label>
            <div className="flex gap-3">
              {GENDERS.map((gender) => (
                <div
                  key={gender}
                  onClick={() => toggleArrayItem("genders", gender)}
                  className={`flex-1 p-3 rounded-lg cursor-pointer border text-center ${
                    form.genders.includes(gender)
                      ? "bg-[#10B981]/20 border-[#10B981]"
                      : "surface-secondary border-[#2D3B55] hover:border-[#10B981]/50"
                  }`}
                >
                  <span className="text-sm text-[#F8FAFC] capitalize">{gender}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Income Segments */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Income Segments</Label>
            <div className="flex flex-wrap gap-2">
              {INCOME_SEGMENTS.map((segment) => (
                <Badge
                  key={segment}
                  onClick={() => toggleArrayItem("income_segments", segment)}
                  className={`cursor-pointer capitalize ${
                    form.income_segments.includes(segment)
                      ? "bg-[#8B5CF6] text-white"
                      : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                  }`}
                >
                  {segment}
                </Badge>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Languages</Label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <Badge
                  key={lang.code}
                  onClick={() => toggleArrayItem("languages", lang.code)}
                  className={`cursor-pointer ${
                    form.languages.includes(lang.code)
                      ? "bg-[#F59E0B] text-white"
                      : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                  }`}
                >
                  {lang.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lookalike Modeling */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">Lookalike Modeling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Switch
              checked={form.lookalike_enabled}
              onCheckedChange={(v) => updateField("lookalike_enabled", v)}
            />
            <div className="flex-1">
              <p className="text-sm text-[#F8FAFC]">Enable Lookalike Audiences</p>
              <p className="text-xs text-[#64748B]">Find users similar to your converters</p>
            </div>
            {form.lookalike_enabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#94A3B8]">Expansion:</span>
                <Slider
                  value={[form.lookalike_expansion]}
                  onValueChange={([v]) => updateField("lookalike_expansion", v)}
                  min={1}
                  max={10}
                  step={1}
                  className="w-24"
                />
                <span className="text-sm text-[#F8FAFC] w-6">{form.lookalike_expansion}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Step 5: Creatives
  const renderCreativesStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Creatives</h2>
        <p className="text-sm text-[#64748B]">Select creatives for your campaign</p>
      </div>

      {creatives.length === 0 ? (
        <Card className="surface-secondary border-panel">
          <CardContent className="py-8 text-center">
            <Image className="w-12 h-12 mx-auto text-[#64748B] mb-4" />
            <p className="text-[#94A3B8]">No creatives available</p>
            <Button
              variant="outline"
              className="mt-4 border-[#3B82F6] text-[#3B82F6]"
              onClick={() => navigate("/editor")}
            >
              Create Creative
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {creatives.map((creative) => {
            const isSelected = form.creative_id === creative.id || form.creative_ids.includes(creative.id);
            return (
              <div
                key={creative.id}
                onClick={() => updateField("creative_id", creative.id)}
                className={`p-4 rounded-lg cursor-pointer border transition-all ${
                  isSelected
                    ? "bg-[#3B82F6]/20 border-[#3B82F6]"
                    : "surface-secondary border-[#2D3B55] hover:border-[#3B82F6]/50"
                }`}
                data-testid={`creative-${creative.id}`}
              >
                {creative.preview_url ? (
                  <img 
                    src={creative.preview_url} 
                    alt={creative.name}
                    className="w-full h-24 object-cover rounded mb-2"
                  />
                ) : (
                  <div className="w-full h-24 bg-[#1E293B] rounded mb-2 flex items-center justify-center">
                    <Image className="w-8 h-8 text-[#64748B]" />
                  </div>
                )}
                <p className="text-sm text-[#F8FAFC] truncate">{creative.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="text-[10px] bg-[#3B82F6]/20 text-[#3B82F6]">{creative.type}</Badge>
                  {creative.format && (
                    <Badge className="text-[10px] bg-[#10B981]/20 text-[#10B981]">{creative.format}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creative Best Practices */}
      <Card className="surface-secondary border-[#F59E0B]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#F59E0B] flex items-center gap-2">
            <Lightbulb className="w-4 h-4" /> Creative Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#94A3B8] space-y-1">
          <p>• Use multiple ad sizes (300x250, 728x90, 320x50) for maximum reach</p>
          <p>• Test 3-4 creative variations and optimize after 1000 impressions each</p>
          <p>• Include clear call-to-action in all creatives</p>
          <p>• For video: 15s or 30s formats work best; ensure sound-off compatibility</p>
        </CardContent>
      </Card>
    </div>
  );

  // Step 6: Schedule & Pacing
  const renderScheduleStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Schedule & Pacing</h2>
        <p className="text-sm text-[#64748B]">Set flight dates, frequency caps, and dayparting</p>
      </div>

      {/* Flight Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Start Date *</Label>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) => updateField("start_date", e.target.value)}
            className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">End Date</Label>
          <Input
            type="date"
            value={form.end_date}
            onChange={(e) => updateField("end_date", e.target.value)}
            min={form.start_date}
            className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          />
        </div>
      </div>

      {/* Frequency Capping */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-[#F8FAFC]">Frequency Capping</CardTitle>
            <Switch
              checked={form.frequency_cap_enabled}
              onCheckedChange={(v) => updateField("frequency_cap_enabled", v)}
            />
          </div>
        </CardHeader>
        {form.frequency_cap_enabled && (
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-[#94A3B8]">Max Impressions</Label>
                <Input
                  type="number"
                  value={form.frequency_cap_count}
                  onChange={(e) => updateField("frequency_cap_count", parseInt(e.target.value) || 1)}
                  min={1}
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-[#94A3B8]">Per</Label>
                <Select 
                  value={form.frequency_cap_period} 
                  onValueChange={(v) => updateField("frequency_cap_period", v)}
                >
                  <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="surface-primary border-[#2D3B55]">
                    <SelectItem value="hour" className="text-[#F8FAFC]">Hour</SelectItem>
                    <SelectItem value="day" className="text-[#F8FAFC]">Day</SelectItem>
                    <SelectItem value="week" className="text-[#F8FAFC]">Week</SelectItem>
                    <SelectItem value="month" className="text-[#F8FAFC]">Month</SelectItem>
                    <SelectItem value="lifetime" className="text-[#F8FAFC]">Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Dayparting */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-[#F8FAFC]">Dayparting</CardTitle>
            <Switch
              checked={form.time_targeting_enabled}
              onCheckedChange={(v) => updateField("time_targeting_enabled", v)}
            />
          </div>
          <CardDescription className="text-[#64748B]">
            Target specific days and hours
          </CardDescription>
        </CardHeader>
        {form.time_targeting_enabled && (
          <CardContent className="space-y-4">
            {/* Days */}
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Days of Week</Label>
              <div className="flex gap-2">
                {DAYS.map((day, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleArrayItem("days_of_week", idx)}
                    className={`w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center text-sm ${
                      form.days_of_week.includes(idx)
                        ? "bg-[#3B82F6] text-white"
                        : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Hours Grid */}
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Hours of Day</Label>
              <div className="grid grid-cols-12 gap-1">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    onClick={() => toggleArrayItem("hours_of_day", hour)}
                    className={`p-1 rounded text-center text-xs cursor-pointer ${
                      form.hours_of_day.includes(hour)
                        ? "bg-[#10B981] text-white"
                        : "bg-[#1E293B] text-[#64748B] hover:bg-[#2D3B55]"
                    }`}
                  >
                    {hour}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );

  // Step 7: Brand Safety
  const renderBrandSafetyStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Brand Safety</h2>
        <p className="text-sm text-[#64748B]">Configure brand safety and content controls</p>
      </div>

      {/* Brand Safety Level */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Brand Safety Level</Label>
        <div className="grid grid-cols-3 gap-4">
          {BRAND_SAFETY_LEVELS.map((level) => (
            <div
              key={level.value}
              onClick={() => updateField("brand_safety_level", level.value)}
              className={`p-4 rounded-lg cursor-pointer border transition-all ${
                form.brand_safety_level === level.value
                  ? "bg-[#10B981]/20 border-[#10B981]"
                  : "surface-secondary border-[#2D3B55] hover:border-[#10B981]/50"
              }`}
            >
              <Shield className={`w-6 h-6 mb-2 ${
                form.brand_safety_level === level.value ? "text-[#10B981]" : "text-[#64748B]"
              }`} />
              <p className="text-sm font-medium text-[#F8FAFC]">{level.label}</p>
              <p className="text-xs text-[#64748B] mt-1">{level.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content Exclusions */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">Content Exclusions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={form.exclude_ugc}
              onCheckedChange={(v) => updateField("exclude_ugc", v)}
            />
            <div>
              <p className="text-sm text-[#F8FAFC]">Exclude User-Generated Content</p>
              <p className="text-xs text-[#64748B]">Avoid unvetted UGC platforms</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Checkbox
              checked={form.exclude_live_streaming}
              onCheckedChange={(v) => updateField("exclude_live_streaming", v)}
            />
            <div>
              <p className="text-sm text-[#F8FAFC]">Exclude Live Streaming</p>
              <p className="text-xs text-[#64748B]">Avoid live/unmoderated content</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocked Keywords */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Blocked Keywords</Label>
        <Textarea
          placeholder="Enter keywords to block (one per line)"
          value={form.blocked_keywords.join("\n")}
          onChange={(e) => updateField("blocked_keywords", e.target.value.split("\n").filter(k => k.trim()))}
          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] min-h-[80px]"
        />
      </div>

      {/* Blocked Domains */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Blocked Domains</Label>
        <Textarea
          placeholder="Enter domains to block (one per line)"
          value={form.blocked_domains.join("\n")}
          onChange={(e) => updateField("blocked_domains", e.target.value.split("\n").filter(d => d.trim()))}
          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] min-h-[80px]"
        />
      </div>
    </div>
  );

  // Step 8: Measurement
  const renderMeasurementStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Measurement & Optimization</h2>
        <p className="text-sm text-[#64748B]">Configure conversion tracking and attribution</p>
      </div>

      {/* Conversion Tracking */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-[#F8FAFC]">Conversion Tracking</CardTitle>
            <Switch
              checked={form.conversion_tracking_enabled}
              onCheckedChange={(v) => updateField("conversion_tracking_enabled", v)}
            />
          </div>
        </CardHeader>
        {form.conversion_tracking_enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Conversion Pixel ID</Label>
              <Input
                value={form.conversion_pixel_id}
                onChange={(e) => updateField("conversion_pixel_id", e.target.value)}
                placeholder="Enter your pixel ID"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Click-through Window (days)</Label>
                <Input
                  type="number"
                  value={form.click_through_window}
                  onChange={(e) => updateField("click_through_window", parseInt(e.target.value) || 30)}
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">View-through Window (days)</Label>
                <Input
                  type="number"
                  value={form.view_through_window}
                  onChange={(e) => updateField("view_through_window", parseInt(e.target.value) || 1)}
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Attribution Model */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Attribution Model</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ATTRIBUTION_MODELS.map((model) => (
            <div
              key={model.value}
              onClick={() => updateField("attribution_model", model.value)}
              className={`p-3 rounded-lg cursor-pointer border transition-all ${
                form.attribution_model === model.value
                  ? "bg-[#8B5CF6]/20 border-[#8B5CF6]"
                  : "surface-secondary border-[#2D3B55] hover:border-[#8B5CF6]/50"
              }`}
            >
              <p className="text-sm font-medium text-[#F8FAFC]">{model.label}</p>
              <p className="text-xs text-[#64748B] mt-1">{model.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">Advanced Optimization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#F8FAFC]">Bid Shading</p>
              <p className="text-xs text-[#64748B]">Automatically adjust bids based on win rate</p>
            </div>
            <Switch
              checked={form.bid_shading_enabled}
              onCheckedChange={(v) => updateField("bid_shading_enabled", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#F8FAFC]">ML-Based Prediction</p>
              <p className="text-xs text-[#64748B]">Use machine learning for bid optimization</p>
            </div>
            <Switch
              checked={form.ml_prediction_enabled}
              onCheckedChange={(v) => updateField("ml_prediction_enabled", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#F8FAFC]">Supply Path Optimization</p>
              <p className="text-xs text-[#64748B]">Optimize inventory supply paths</p>
            </div>
            <Switch
              checked={form.spo_enabled}
              onCheckedChange={(v) => updateField("spo_enabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Priority */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Campaign Priority: {form.priority}</Label>
        <Slider
          value={[form.priority]}
          onValueChange={([v]) => updateField("priority", v)}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <p className="text-xs text-[#64748B]">Higher priority campaigns are preferred in auctions</p>
      </div>
    </div>
  );

  // ==================== MAIN RENDER ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]" data-testid="campaign-wizard">
      {/* Sidebar */}
      <div className="w-72 surface-primary border-r border-[#2D3B55] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#2D3B55]">
          <Button
            variant="ghost"
            onClick={() => navigate("/campaigns")}
            className="text-[#94A3B8] hover:text-[#F8FAFC] mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to campaigns
          </Button>
          <h1 className="text-lg font-semibold text-[#F8FAFC]">
            {isEdit ? "Edit campaign" : "New campaign"}
          </h1>
        </div>

        {/* Steps */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = completedSteps.has(step.id);
              const isAccessible = step.id <= currentStep || completedSteps.has(step.id - 1) || step.id === currentStep + 1;

              return (
                <div
                  key={step.id}
                  onClick={() => isAccessible && handleStepClick(step.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-[#3B82F6]/20 border border-[#3B82F6]"
                      : isCompleted
                      ? "bg-[#10B981]/10 cursor-pointer hover:bg-[#10B981]/20"
                      : isAccessible
                      ? "cursor-pointer hover:bg-[#1E293B]"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive
                      ? "bg-[#3B82F6] text-white"
                      : isCompleted
                      ? "bg-[#10B981] text-white"
                      : "bg-[#2D3B55] text-[#64748B]"
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-sm ${
                    isActive ? "text-[#F8FAFC] font-medium" : "text-[#94A3B8]"
                  }`}>
                    {step.title}
                  </span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto text-[#3B82F6]" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[#2D3B55] space-y-2">
          <Button
            variant="outline"
            className="w-full border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC]"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save as draft
          </Button>
          <Button
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB]"
            onClick={() => handleSave(false)}
            disabled={saving}
            data-testid="create-campaign-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isEdit ? "Update campaign" : "Create campaign"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Media Plan Banner */}
          {showPlanBanner && planData && (
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-[#10B981]/20 to-[#3B82F6]/20 border border-[#10B981]/30">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#10B981]/20">
                    <Sparkles className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#F8FAFC]">
                      Created from Media Plan
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Settings pre-filled based on your media plan recommendations
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] text-xs">
                        Budget: ${planData.total_budget?.toLocaleString()}
                      </Badge>
                      <Badge className="bg-[#10B981]/20 text-[#10B981] text-xs">
                        {planData.bidding_strategy?.replace(/_/g, ' ')}
                      </Badge>
                      {planData.forecast?.impressions && (
                        <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] text-xs">
                          Est. {(planData.forecast.impressions / 1000000).toFixed(1)}M impressions
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlanBanner(false)}
                  className="text-[#64748B] hover:text-[#F8FAFC] -mt-1 -mr-1"
                >
                  ×
                </Button>
              </div>
            </div>
          )}
          
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-[#2D3B55]">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="border-[#2D3B55] text-[#94A3B8]"
            >
              Previous
            </Button>
            <Button
              onClick={handleContinue}
              disabled={currentStep === STEPS.length}
              className="bg-[#3B82F6] hover:bg-[#2563EB]"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
