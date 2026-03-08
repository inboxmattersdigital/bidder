import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, Check, Save, Megaphone, Target, 
  DollarSign, Image, Settings, ChevronRight, Loader2
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../components/ui/select";
import { toast } from "sonner";
import { 
  createCampaign, 
  updateCampaign, 
  getCampaign, 
  getCreatives,
  getReferenceData 
} from "../lib/api";

const STEPS = [
  { id: 1, key: "basics", title: "Campaign basics", icon: Megaphone },
  { id: 2, key: "budget", title: "Budget & bidding", icon: DollarSign },
  { id: 3, key: "targeting", title: "Targeting", icon: Target },
  { id: 4, key: "creatives", title: "Creatives", icon: Image },
  { id: 5, key: "settings", title: "Additional settings", icon: Settings },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR", "BRL", "MXN"];

const COUNTRIES = [
  { code: "USA", name: "United States" },
  { code: "CAN", name: "Canada" },
  { code: "GBR", name: "United Kingdom" },
  { code: "DEU", name: "Germany" },
  { code: "FRA", name: "France" },
  { code: "AUS", name: "Australia" },
  { code: "JPN", name: "Japan" },
  { code: "IND", name: "India" },
  { code: "BRA", name: "Brazil" },
  { code: "MEX", name: "Mexico" },
  { code: "ESP", name: "Spain" },
  { code: "ITA", name: "Italy" },
  { code: "NLD", name: "Netherlands" },
  { code: "CHN", name: "China" },
  { code: "KOR", name: "South Korea" },
  { code: "SGP", name: "Singapore" },
  { code: "HKG", name: "Hong Kong" },
  { code: "TWN", name: "Taiwan" },
  { code: "THA", name: "Thailand" },
  { code: "IDN", name: "Indonesia" },
  { code: "MYS", name: "Malaysia" },
  { code: "PHL", name: "Philippines" },
  { code: "VNM", name: "Vietnam" },
  { code: "NZL", name: "New Zealand" },
  { code: "ZAF", name: "South Africa" },
  { code: "ARE", name: "United Arab Emirates" },
  { code: "SAU", name: "Saudi Arabia" },
  { code: "ISR", name: "Israel" },
  { code: "TUR", name: "Turkey" },
  { code: "RUS", name: "Russia" },
  { code: "POL", name: "Poland" },
  { code: "SWE", name: "Sweden" },
  { code: "NOR", name: "Norway" },
  { code: "DNK", name: "Denmark" },
  { code: "FIN", name: "Finland" },
  { code: "CHE", name: "Switzerland" },
  { code: "AUT", name: "Austria" },
  { code: "BEL", name: "Belgium" },
  { code: "PRT", name: "Portugal" },
  { code: "IRL", name: "Ireland" },
  { code: "ARG", name: "Argentina" },
  { code: "CHL", name: "Chile" },
  { code: "COL", name: "Colombia" },
  { code: "PER", name: "Peru" },
  { code: "EGY", name: "Egypt" },
  { code: "NGA", name: "Nigeria" },
  { code: "KEN", name: "Kenya" },
  { code: "PAK", name: "Pakistan" },
  { code: "BGD", name: "Bangladesh" }
];

const DEVICE_TYPES = [
  { id: 1, name: "Mobile/Tablet" },
  { id: 2, name: "Desktop" },
  { id: 3, name: "Connected TV" },
  { id: 4, name: "Phone" },
  { id: 5, name: "Tablet" },
  { id: 7, name: "Set Top Box" }
];

const OS_LIST = ["Android", "iOS", "Windows", "macOS", "Linux", "Chrome OS"];

export default function CampaignWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatives, setCreatives] = useState([]);
  
  const [form, setForm] = useState({
    // Basics
    name: "",
    description: "",
    advertiser: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    
    // Budget
    bid_price: 1.0,
    currency: "USD",
    daily_budget: 100,
    total_budget: 0,
    pacing_type: "even",
    
    // Targeting
    geo_countries: [],
    device_types: [],
    os_list: [],
    
    // Creatives
    creative_ids: [],
    
    // Settings
    priority: 1,
    frequency_cap_enabled: false,
    frequency_cap_count: 3,
    frequency_cap_period: "day",
    bid_shading_enabled: false,
    ml_prediction_enabled: false,
  });

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const creativesRes = await getCreatives();
      setCreatives(creativesRes.data || []);
      
      if (id) {
        const campaignRes = await getCampaign(id);
        const campaign = campaignRes.data;
        
        setForm({
          name: campaign.name || "",
          description: campaign.description || "",
          advertiser: campaign.advertiser || "",
          start_date: campaign.start_date?.split('T')[0] || "",
          end_date: campaign.end_date?.split('T')[0] || "",
          bid_price: campaign.bid_price || 1.0,
          currency: campaign.currency || "USD",
          daily_budget: campaign.budget?.daily_budget || 100,
          total_budget: campaign.budget?.total_budget || 0,
          pacing_type: campaign.budget?.pacing_type || "even",
          geo_countries: campaign.targeting?.geo?.countries || [],
          device_types: campaign.targeting?.device?.device_types || [],
          os_list: campaign.targeting?.device?.os_list || [],
          creative_ids: campaign.creative_ids || [],
          priority: campaign.priority || 1,
          frequency_cap_enabled: campaign.frequency_cap?.enabled || false,
          frequency_cap_count: campaign.frequency_cap?.max_impressions || 3,
          frequency_cap_period: campaign.frequency_cap?.period || "day",
          bid_shading_enabled: campaign.bid_shading?.enabled || false,
          ml_prediction_enabled: campaign.ml_prediction?.enabled || false,
        });
        
        // Mark all steps as completed for edit
        setCompletedSteps(new Set([1, 2, 3, 4, 5]));
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

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

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return form.name.trim() !== "";
      case 2:
        return form.bid_price > 0 && form.daily_budget > 0;
      case 3:
        return true; // Targeting is optional
      case 4:
        return form.creative_ids.length > 0;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const goToStep = (step) => {
    // Mark current step as completed if valid
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
    }
    setCurrentStep(step);
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) {
      if (currentStep === 1) toast.error("Campaign name is required");
      if (currentStep === 4) toast.error("Select at least one creative");
      return;
    }
    
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handleSubmit = async (status = "draft") => {
    if (!form.name) {
      toast.error("Campaign name is required");
      setCurrentStep(1);
      return;
    }
    
    if (form.creative_ids.length === 0) {
      toast.error("Select at least one creative");
      setCurrentStep(4);
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        advertiser: form.advertiser,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        status: status,
        bid_price: parseFloat(form.bid_price),
        currency: form.currency,
        priority: parseInt(form.priority),
        creative_id: form.creative_ids[0],  // Backend expects single creative_id
        budget: {
          daily_budget: parseFloat(form.daily_budget) || 0,
          total_budget: parseFloat(form.total_budget) || 0,
          daily_spend: 0,
          total_spend: 0,
          pacing_type: form.pacing_type
        },
        targeting: {
          geo: { countries: form.geo_countries, regions: [], cities: [] },
          device: { 
            device_types: form.device_types, 
            os_list: form.os_list,
            makes: [], models: [], connection_types: [], carriers: []
          },
          inventory: {
            domain_whitelist: [], domain_blacklist: [],
            bundle_whitelist: [], bundle_blacklist: [],
            publisher_ids: [], categories: []
          },
          video: {},
          content: {},
          privacy: { gdpr_required: false, ccpa_allowed: true, coppa_allowed: false }
        },
        frequency_cap: {
          enabled: form.frequency_cap_enabled,
          max_impressions: parseInt(form.frequency_cap_count),
          period: form.frequency_cap_period
        },
        bid_shading: { enabled: form.bid_shading_enabled, min_reduction: 0.1, max_reduction: 0.3 },
        ml_prediction: { enabled: form.ml_prediction_enabled, model_type: "heuristic" }
      };
      
      if (isEdit) {
        await updateCampaign(id, payload);
        toast.success("Campaign updated");
      } else {
        await createCampaign(payload);
        toast.success("Campaign created");
      }
      
      navigate("/campaigns");
    } catch (error) {
      // Handle Pydantic validation errors (array of objects)
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        const messages = detail.map(err => `${err.loc?.join('.') || 'Field'}: ${err.msg}`).join(', ');
        toast.error(messages || "Validation failed");
      } else {
        toast.error(detail || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" data-testid="campaign-wizard">
      {/* Left Sidebar - Step Navigation (DV360 Style) */}
      <div className="w-72 bg-[#0A0F1C] border-r border-[#1E293B] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#1E293B]">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/campaigns")}
            className="text-[#94A3B8] hover:text-[#F8FAFC] -ml-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to campaigns
          </Button>
          <h1 className="text-xl font-semibold text-[#F8FAFC]">
            {isEdit ? "Edit campaign" : "New campaign"}
          </h1>
        </div>

        {/* Step List */}
        <nav className="flex-1 py-4">
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isCompleted = completedSteps.has(step.id);
            const Icon = step.icon;
            
            return (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                  isActive 
                    ? "bg-[#1E3A5F] border-l-2 border-[#3B82F6]" 
                    : "hover:bg-[#111827] border-l-2 border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted 
                    ? "bg-[#10B981] text-white" 
                    : isActive 
                      ? "bg-[#3B82F6] text-white" 
                      : "bg-[#1E293B] text-[#64748B]"
                }`}>
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    isActive ? "text-[#F8FAFC]" : "text-[#94A3B8]"
                  }`}>
                    {step.title}
                  </p>
                </div>
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-[#3B82F6]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1E293B] space-y-2">
          <Button
            onClick={() => handleSubmit("draft")}
            variant="outline"
            disabled={saving}
            className="w-full border-[#2D3B55] text-[#94A3B8] hover:bg-[#1E293B]"
          >
            Save as draft
          </Button>
          <Button
            onClick={() => handleSubmit("active")}
            disabled={saving}
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isEdit ? "Update campaign" : "Create campaign"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-[#050A14] overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          {/* Step 1: Campaign Basics */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#F8FAFC]">Campaign basics</h2>
                <p className="text-[#64748B] mt-1">Set up the basic details for your campaign</p>
              </div>

              <Card className="surface-primary border-[#1E293B]">
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[#F8FAFC]">Campaign name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Enter campaign name"
                      className="bg-[#0A0F1C] border-[#2D3B55] text-[#F8FAFC] h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#F8FAFC]">Advertiser</Label>
                    <Input
                      value={form.advertiser}
                      onChange={(e) => updateField("advertiser", e.target.value)}
                      placeholder="Advertiser or brand name"
                      className="bg-[#0A0F1C] border-[#2D3B55] text-[#F8FAFC] h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#F8FAFC]">Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      placeholder="Add a description for internal reference"
                      className="bg-[#0A0F1C] border-[#2D3B55] text-[#F8FAFC] min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#F8FAFC]">Start date</Label>
                      <Input
                        type="date"
                        value={form.start_date}
                        onChange={(e) => updateField("start_date", e.target.value)}
                        className="bg-[#0A0F1C] border-[#2D3B55] text-[#F8FAFC] h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#F8FAFC]">End date</Label>
                      <Input
                        type="date"
                        value={form.end_date}
                        onChange={(e) => updateField("end_date", e.target.value)}
                        className="bg-[#0A0F1C] border-[#2D3B55] text-[#F8FAFC] h-11"
                      />
                      <p className="text-xs text-[#64748B]">Leave empty for no end date</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={nextStep} className="bg-[#3B82F6] hover:bg-[#2563EB]">
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Budget & Bidding */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#F8FAFC]">Budget & bidding</h2>
                <p className="text-[#64748B] mt-1">Set your budget and bidding strategy</p>
              </div>

              <Card className="surface-primary border-[#1E293B]">
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#F8FAFC]">Bid price (CPM)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={form.bid_price}
                          onChange={(e) => updateField("bid_price", e.target.value)}
                          className="bg-[#0A0F1C] border-[#2D3B55] text-[#F8FAFC] h-11 pl-7"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#F8FAFC]">Currency</Label>
                      <Select value={form.currency} onValueChange={(v) => updateField("currency", v)}>
                        <SelectTrigger className="bg-[#0A0F1C] border-[#2D3B55] text-[#F8FAFC] h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A0F1C] border-[#2D3B55]">
                          {CURRENCIES.map(c => (
                            <SelectItem key={c} value={c} className="text-[#F8FAFC]">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#F8FAFC]">Daily budget</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]">$</span>
                        <Input
                          type="number"
                          value={form.daily_budget}
                          onChange={(e) => updateField("daily_budget", e.target.value)}
                          className="bg-[#0A0F1C] border-[#2D3B55] text-[#F8FAFC] h-11 pl-7"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#F8FAFC]">Total budget</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]">$</span>
                        <Input
                          type="number"
                          value={form.total_budget}
                          onChange={(e) => updateField("total_budget", e.target.value)}
                          placeholder="No limit"
                          className="bg-[#0A0F1C] border-[#2D3B55] text-[#F8FAFC] h-11 pl-7"
                        />
                      </div>
                      <p className="text-xs text-[#64748B]">0 = unlimited</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#F8FAFC]">Pacing</Label>
                    <Select value={form.pacing_type} onValueChange={(v) => updateField("pacing_type", v)}>
                      <SelectTrigger className="bg-[#0A0F1C] border-[#2D3B55] text-[#F8FAFC] h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0F1C] border-[#2D3B55]">
                        <SelectItem value="even" className="text-[#F8FAFC]">Even - Spread budget evenly</SelectItem>
                        <SelectItem value="asap" className="text-[#F8FAFC]">ASAP - Spend as fast as possible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="border-[#2D3B55] text-[#94A3B8]">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={nextStep} className="bg-[#3B82F6] hover:bg-[#2563EB]">
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Targeting */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#F8FAFC]">Targeting</h2>
                <p className="text-[#64748B] mt-1">Define who should see your ads</p>
              </div>

              <Card className="surface-primary border-[#1E293B]">
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[#F8FAFC]">Geographic targeting</Label>
                    <Select
                      value=""
                      onValueChange={(country) => {
                        if (!form.geo_countries.includes(country)) {
                          updateField("geo_countries", [...form.geo_countries, country]);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-[#0A0F1C] border-[#2D3B55] text-[#F8FAFC] h-11">
                        <SelectValue placeholder="Add countries..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0F1C] border-[#2D3B55] max-h-[300px]">
                        {COUNTRIES.filter(c => !form.geo_countries.includes(c.code)).map(country => (
                          <SelectItem key={country.code} value={country.code} className="text-[#F8FAFC]">
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {form.geo_countries.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {form.geo_countries.map(code => {
                          const country = COUNTRIES.find(c => c.code === code);
                          return (
                            <Badge
                              key={code}
                              className="bg-[#1E3A5F] text-[#60A5FA] border-0 cursor-pointer hover:bg-[#EF4444]/20 hover:text-[#EF4444]"
                              onClick={() => updateField("geo_countries", form.geo_countries.filter(c => c !== code))}
                            >
                              {country?.name || code} ×
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-[#64748B]">No countries selected - will target all countries</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[#F8FAFC]">Device types</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {DEVICE_TYPES.map(device => (
                        <button
                          key={device.id}
                          onClick={() => toggleArrayItem("device_types", device.id)}
                          className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                            form.device_types.includes(device.id)
                              ? "bg-[#1E3A5F] border-[#3B82F6] text-[#60A5FA]"
                              : "bg-[#0A0F1C] border-[#2D3B55] text-[#94A3B8] hover:border-[#3B82F6]/50"
                          }`}
                        >
                          {device.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[#F8FAFC]">Operating systems</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {OS_LIST.map(os => (
                        <button
                          key={os}
                          onClick={() => toggleArrayItem("os_list", os)}
                          className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                            form.os_list.includes(os)
                              ? "bg-[#1E3A5F] border-[#3B82F6] text-[#60A5FA]"
                              : "bg-[#0A0F1C] border-[#2D3B55] text-[#94A3B8] hover:border-[#3B82F6]/50"
                          }`}
                        >
                          {os}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)} className="border-[#2D3B55] text-[#94A3B8]">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={nextStep} className="bg-[#3B82F6] hover:bg-[#2563EB]">
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Creatives */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#F8FAFC]">Creatives</h2>
                <p className="text-[#64748B] mt-1">Select the ads to run with this campaign</p>
              </div>

              <Card className="surface-primary border-[#1E293B]">
                <CardContent className="p-6">
                  {creatives.length === 0 ? (
                    <div className="text-center py-12">
                      <Image className="w-12 h-12 mx-auto text-[#64748B] mb-4" />
                      <p className="text-[#F8FAFC] font-medium">No creatives available</p>
                      <p className="text-sm text-[#64748B] mt-1">Create a creative first</p>
                      <Button 
                        variant="outline"
                        onClick={() => navigate("/creatives/editor")}
                        className="mt-4 border-[#3B82F6] text-[#3B82F6]"
                      >
                        Create creative
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {creatives.map(creative => (
                        <div
                          key={creative.id}
                          onClick={() => toggleArrayItem("creative_ids", creative.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors flex items-center justify-between ${
                            form.creative_ids.includes(creative.id)
                              ? "bg-[#1E3A5F] border-[#3B82F6]"
                              : "bg-[#0A0F1C] border-[#2D3B55] hover:border-[#3B82F6]/50"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded flex items-center justify-center ${
                              form.creative_ids.includes(creative.id)
                                ? "bg-[#3B82F6]"
                                : "bg-[#1E293B]"
                            }`}>
                              <Image className={`w-5 h-5 ${
                                form.creative_ids.includes(creative.id)
                                  ? "text-white"
                                  : "text-[#64748B]"
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium text-[#F8FAFC]">{creative.name}</p>
                              <p className="text-sm text-[#64748B]">{creative.type}</p>
                            </div>
                          </div>
                          {form.creative_ids.includes(creative.id) && (
                            <div className="w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)} className="border-[#2D3B55] text-[#94A3B8]">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={nextStep} className="bg-[#3B82F6] hover:bg-[#2563EB]">
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Additional Settings */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#F8FAFC]">Additional settings</h2>
                <p className="text-[#64748B] mt-1">Configure advanced campaign options</p>
              </div>

              <Card className="surface-primary border-[#1E293B]">
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[#F8FAFC]">Priority (1-10)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={form.priority}
                      onChange={(e) => updateField("priority", e.target.value)}
                      className="bg-[#0A0F1C] border-[#2D3B55] text-[#F8FAFC] h-11 w-24"
                    />
                    <p className="text-xs text-[#64748B]">Higher priority campaigns are served first</p>
                  </div>

                  <div className="space-y-4 p-4 bg-[#0A0F1C] rounded-lg border border-[#2D3B55]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#F8FAFC]">Frequency capping</p>
                        <p className="text-sm text-[#64748B]">Limit how often a user sees your ads</p>
                      </div>
                      <Switch
                        checked={form.frequency_cap_enabled}
                        onCheckedChange={(v) => updateField("frequency_cap_enabled", v)}
                      />
                    </div>
                    {form.frequency_cap_enabled && (
                      <div className="flex items-center gap-3 pt-2">
                        <Input
                          type="number"
                          value={form.frequency_cap_count}
                          onChange={(e) => updateField("frequency_cap_count", e.target.value)}
                          className="w-20 bg-[#050A14] border-[#2D3B55] text-[#F8FAFC] h-10"
                        />
                        <span className="text-[#94A3B8]">impressions per</span>
                        <Select value={form.frequency_cap_period} onValueChange={(v) => updateField("frequency_cap_period", v)}>
                          <SelectTrigger className="w-28 bg-[#050A14] border-[#2D3B55] text-[#F8FAFC] h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0A0F1C] border-[#2D3B55]">
                            <SelectItem value="hour" className="text-[#F8FAFC]">hour</SelectItem>
                            <SelectItem value="day" className="text-[#F8FAFC]">day</SelectItem>
                            <SelectItem value="week" className="text-[#F8FAFC]">week</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#0A0F1C] rounded-lg border border-[#2D3B55]">
                    <div>
                      <p className="font-medium text-[#F8FAFC]">Bid shading</p>
                      <p className="text-sm text-[#64748B]">Automatically optimize bid prices</p>
                    </div>
                    <Switch
                      checked={form.bid_shading_enabled}
                      onCheckedChange={(v) => updateField("bid_shading_enabled", v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#0A0F1C] rounded-lg border border-[#2D3B55]">
                    <div>
                      <p className="font-medium text-[#F8FAFC]">ML-powered bidding</p>
                      <p className="text-sm text-[#64748B]">Use machine learning to optimize bids</p>
                    </div>
                    <Switch
                      checked={form.ml_prediction_enabled}
                      onCheckedChange={(v) => updateField("ml_prediction_enabled", v)}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(4)} className="border-[#2D3B55] text-[#94A3B8]">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleSubmit("draft")}
                    disabled={saving}
                    className="border-[#2D3B55] text-[#94A3B8]"
                  >
                    Save as draft
                  </Button>
                  <Button
                    onClick={() => handleSubmit("active")}
                    disabled={saving}
                    className="bg-[#10B981] hover:bg-[#059669]"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {isEdit ? "Update campaign" : "Create campaign"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
