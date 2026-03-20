import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { 
  createCampaign, updateCampaign, getCampaign, getCreatives,
  getMediaPlanForecast, recommendCampaignStrategy
} from "../../../lib/api";
import { INITIAL_FORM_STATE } from "../constants";

export function useWizardForm({ id, isEdit, fromMediaPlan, planData }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatives, setCreatives] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [strategyRec, setStrategyRec] = useState(null);
  const [showPlanBanner, setShowPlanBanner] = useState(fromMediaPlan);
  const [form, setForm] = useState(INITIAL_FORM_STATE);

  // Update a single form field
  const updateField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Update multiple form fields
  const updateFields = useCallback((updates) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  // Load initial data (creatives and campaign if editing)
  const loadInitialData = useCallback(async () => {
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
          kpi_target: c.kpi_target || 0,
          bid_price: c.bid_price || 2.0,
          bid_floor: c.bid_floor || 0.5,
          currency: c.currency || "USD",
          daily_budget: c.budget?.daily_budget || 100,
          total_budget: c.budget?.total_budget || 3000,
          pacing_type: c.budget?.pacing_type || "even",
          inventory_sources: c.inventory_sources || ["open_exchange"],
          environments: c.environments || ["web", "app"],
          geo_countries: c.targeting?.geo?.countries || [],
          geo_states: c.targeting?.geo?.states || [],
          geo_cities: c.targeting?.geo?.cities || [],
          geo_countries_exclude: c.targeting?.geo?.countries_exclude || [],
          geo_states_exclude: c.targeting?.geo?.states_exclude || [],
          geo_cities_exclude: c.targeting?.geo?.cities_exclude || [],
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
  }, [id]);

  // Apply media plan data
  useEffect(() => {
    if (fromMediaPlan && planData && !isEdit) {
      setForm(prev => ({
        ...prev,
        total_budget: planData.total_budget || prev.total_budget,
        daily_budget: planData.daily_budget || prev.daily_budget,
        primary_goal: planData.primary_goal || prev.primary_goal,
        kpi_type: planData.kpi_type || prev.kpi_type,
        bidding_strategy: planData.bidding_strategy || prev.bidding_strategy,
        pacing_type: planData.pacing_type || prev.pacing_type,
        frequency_cap_enabled: planData.frequency_cap_enabled ?? prev.frequency_cap_enabled,
        frequency_cap_count: planData.frequency_cap_count || prev.frequency_cap_count,
        frequency_cap_period: planData.frequency_cap_period || prev.frequency_cap_period,
        inventory_sources: planData.inventory_sources || prev.inventory_sources,
      }));
      
      if (planData.forecast) {
        setForecast({
          estimated_impressions: planData.forecast.impressions,
          estimated_reach: planData.forecast.reach,
          estimated_clicks: planData.forecast.clicks,
          estimated_cpm: planData.forecast.cpm,
          confidence_level: planData.forecast.confidence
        });
      }
      
      setCompletedSteps(prev => new Set([...prev, 2]));
      toast.success("Media plan settings applied!");
    }
  }, [fromMediaPlan, planData, isEdit]);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Generate forecast when budget/targeting changes
  const generateForecast = useCallback(async () => {
    try {
      const res = await getMediaPlanForecast({
        budget: form.total_budget,
        duration_days: 30,
        goal: form.primary_goal,
        creative_type: "display",
        target_geo: form.geo_countries,
      });
      setForecast(res.data);
    } catch (error) {
      console.error("Forecast error:", error);
    }
  }, [form.total_budget, form.primary_goal, form.geo_countries]);

  useEffect(() => {
    if (form.total_budget > 0 && form.primary_goal) {
      generateForecast();
    }
  }, [form.total_budget, form.daily_budget, form.primary_goal, form.inventory_sources, generateForecast]);

  // Get strategy recommendations
  const getStrategyRecommendations = useCallback(async () => {
    try {
      const res = await recommendCampaignStrategy({
        goal: form.primary_goal,
        budget: form.total_budget,
        duration_days: 30,
      });
      setStrategyRec(res.data);
      toast.success("Strategy recommendations loaded");
    } catch (error) {
      toast.error("Failed to get recommendations");
    }
  }, [form.primary_goal, form.total_budget]);

  // Validate current step
  const validateStep = useCallback((step) => {
    switch (step) {
      case 1: return form.name.trim().length > 0 && form.primary_goal;
      case 2: return form.bid_price > 0 && form.daily_budget > 0;
      case 3: return true; // Targeting is optional
      case 4: return true; // Audience is optional
      case 5: return form.creative_id || form.creative_ids.length > 0;
      case 6: return form.start_date;
      case 7: return true; // Brand safety has defaults
      case 8: return true; // Measurement is optional
      default: return false;
    }
  }, [form]);

  // Handle continue/next step
  const handleContinue = useCallback(() => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => Math.min(prev + 1, 8));
    } else {
      toast.error("Please complete required fields");
    }
  }, [currentStep, validateStep]);

  // Handle step click
  const handleStepClick = useCallback((stepId) => {
    if (stepId <= currentStep || completedSteps.has(stepId - 1) || stepId === currentStep + 1) {
      setCurrentStep(stepId);
    }
  }, [currentStep, completedSteps]);

  // Build campaign payload
  const buildCampaignPayload = useCallback(() => {
    const selectedCreative = form.creative_id || (form.creative_ids.length > 0 ? form.creative_ids[0] : "");
    
    return {
      name: form.name,
      bid_price: parseFloat(form.bid_price) || 2.0,
      bid_floor: form.bid_floor,
      bid_pricing_type: form.bid_pricing_type,
      currency: form.currency,
      priority: form.priority,
      placements: [],
      creative_id: selectedCreative,
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
        type: form.frequency_cap_type,
        daily_cap: form.frequency_cap_daily,
        lifetime_cap: form.frequency_cap_lifetime,
      },
      spo: { enabled: form.spo_enabled },
      ml_prediction: { enabled: form.ml_prediction_enabled },
      targeting: {
        geo: { 
          countries: form.geo_countries, 
          countries_exclude: form.geo_countries_exclude,
          states: form.geo_states,
          states_exclude: form.geo_states_exclude,
          cities: form.geo_cities, 
          cities_exclude: form.geo_cities_exclude,
          pincodes: form.geo_pincodes,
          pincodes_exclude: form.geo_pincodes_exclude,
          regions: form.geo_regions,
          regions_exclude: form.geo_regions_exclude,
          lat_long_targeting: form.lat_long_targeting,
          lat_long_points: form.lat_long_points,
          latitude: form.geo_latitude ? parseFloat(form.geo_latitude) : null,
          longitude: form.geo_longitude ? parseFloat(form.geo_longitude) : null,
          radius_km: form.radius_km,
        },
        device: { 
          device_types: form.device_types, 
          os_list: form.os_list,
          os_versions: form.os_versions,
        },
        telecom: { operators: form.telecom_operators },
        demographics: {
          age_ranges: form.age_ranges,
          genders: form.genders,
          income_segments: form.income_segments,
          parental_status: form.parental_status,
          languages: form.languages,
          languages_exclude: form.languages_exclude,
        },
        audiences: {
          affinity_segments: form.affinity_segments,
          in_market_segments: form.in_market_segments,
          first_party_audiences: form.first_party_audiences,
          third_party_audiences: form.third_party_audiences,
          lookalike_enabled: form.lookalike_enabled,
          lookalike_expansion: form.lookalike_expansion,
          audience_exclusions: form.audience_exclusions,
        },
        inventory: {
          domain_allowlist: form.domain_allowlist,
          domain_blocklist: form.domain_blocklist,
          app_allowlist: form.app_allowlist,
          app_blocklist: form.app_blocklist,
        },
        supply: {
          sources_include: form.supply_sources_include,
          sources_exclude: form.supply_sources_exclude,
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
          display_include: form.ad_placements_display_include,
          display_exclude: form.ad_placements_display_exclude,
          incontent_include: form.ad_placements_incontent_include,
          incontent_exclude: form.ad_placements_incontent_exclude,
          native_include: form.ad_placements_native_include,
          native_exclude: form.ad_placements_native_exclude,
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
          browsers_include: form.browsers_include,
          browsers_exclude: form.browsers_exclude,
          connection_speeds: form.connection_types,
        },
      },
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      iab_categories: form.iab_categories,
      description: form.description,
      primary_goal: form.primary_goal,
      bidding_strategy: form.bidding_strategy,
      kpi_type: form.kpi_type,
      kpi_target: form.kpi_target,
      inventory_sources: form.inventory_sources,
      environments: form.environments,
    };
  }, [form]);

  // Handle save
  const handleSave = useCallback(async (asDraft = false) => {
    const selectedCreative = form.creative_id || (form.creative_ids.length > 0 ? form.creative_ids[0] : "");
    
    if (!selectedCreative) {
      toast.error("Please select a creative");
      return null;
    }

    setSaving(true);
    try {
      const campaignData = buildCampaignPayload();

      let response;
      if (isEdit) {
        response = await updateCampaign(id, campaignData);
        toast.success("Campaign updated successfully");
      } else {
        response = await createCampaign(campaignData);
        toast.success("Campaign created successfully");
      }
      return response;
    } catch (error) {
      toast.error("Validation error: " + (error.response?.data?.detail || "Failed to save campaign"));
      return null;
    } finally {
      setSaving(false);
    }
  }, [form, isEdit, id, buildCampaignPayload]);

  return {
    // State
    form,
    currentStep,
    completedSteps,
    loading,
    saving,
    creatives,
    forecast,
    strategyRec,
    showPlanBanner,
    
    // Setters
    setCurrentStep,
    setShowPlanBanner,
    
    // Actions
    updateField,
    updateFields,
    handleContinue,
    handleStepClick,
    handleSave,
    validateStep,
    getStrategyRecommendations,
  };
}
