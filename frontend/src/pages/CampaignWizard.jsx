import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, ArrowRight, Check, Save, Megaphone, Target, 
  DollarSign, Image, Settings, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
  { id: 1, title: "Basic Info", icon: Megaphone, description: "Campaign name, dates, and budget" },
  { id: 2, title: "Targeting", icon: Target, description: "Geo, device, and inventory targeting" },
  { id: 3, title: "Creatives", icon: Image, description: "Select ad creatives" },
  { id: 4, title: "Advanced", icon: Settings, description: "Optimization and pacing" },
  { id: 5, title: "Review", icon: Check, description: "Review and launch" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

export default function CampaignWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatives, setCreatives] = useState([]);
  const [referenceData, setReferenceData] = useState({});
  
  const [form, setForm] = useState({
    // Basic Info
    name: "",
    description: "",
    advertiser: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    status: "draft",
    
    // Budget
    bid_price: 1.0,
    currency: "USD",
    daily_budget: 100,
    total_budget: 0,
    
    // Targeting
    geo_countries: [],
    device_types: [],
    os_list: [],
    domain_whitelist: [],
    domain_blacklist: [],
    
    // Creatives
    creative_ids: [],
    
    // Advanced
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
      // Load creatives
      const creativesRes = await getCreatives();
      setCreatives(creativesRes.data || []);
      
      // Load reference data
      const refRes = await getReferenceData();
      setReferenceData(refRes.data || {});
      
      // Load campaign if editing
      if (id) {
        const campaignRes = await getCampaign(id);
        const campaign = campaignRes.data;
        
        setForm({
          name: campaign.name || "",
          description: campaign.description || "",
          advertiser: campaign.advertiser || "",
          start_date: campaign.start_date?.split('T')[0] || "",
          end_date: campaign.end_date?.split('T')[0] || "",
          status: campaign.status || "draft",
          bid_price: campaign.bid_price || 1.0,
          currency: campaign.currency || "USD",
          daily_budget: campaign.budget?.daily_budget || 100,
          total_budget: campaign.budget?.total_budget || 0,
          geo_countries: campaign.targeting?.geo?.countries || [],
          device_types: campaign.targeting?.device?.device_types || [],
          os_list: campaign.targeting?.device?.os_list || [],
          domain_whitelist: campaign.targeting?.inventory?.domain_whitelist || [],
          domain_blacklist: campaign.targeting?.inventory?.domain_blacklist || [],
          creative_ids: campaign.creative_ids || [],
          priority: campaign.priority || 1,
          frequency_cap_enabled: campaign.frequency_cap?.enabled || false,
          frequency_cap_count: campaign.frequency_cap?.max_impressions || 3,
          frequency_cap_period: campaign.frequency_cap?.period || "day",
          bid_shading_enabled: campaign.bid_shading?.enabled || false,
          ml_prediction_enabled: campaign.ml_prediction?.enabled || false,
        });
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

  const nextStep = () => {
    if (currentStep === 1 && !form.name) {
      toast.error("Campaign name is required");
      return;
    }
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (status = "draft") => {
    if (!form.name) {
      toast.error("Campaign name is required");
      return;
    }
    
    setSaving(true);
    try {
      // Use first creative_id for the API (backend expects single creative_id)
      const selectedCreativeId = form.creative_ids.length > 0 ? form.creative_ids[0] : null;
      
      if (!selectedCreativeId) {
        toast.error("Please select at least one creative");
        setSaving(false);
        return;
      }
      
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
        creative_id: selectedCreativeId,
        budget: {
          daily_budget: parseFloat(form.daily_budget) || 0,
          total_budget: parseFloat(form.total_budget) || 0,
          daily_spend: 0,
          total_spend: 0,
          pacing_type: "even"
        },
        targeting: {
          geo: {
            countries: form.geo_countries,
            regions: [],
            cities: []
          },
          device: {
            device_types: form.device_types,
            os_list: form.os_list,
            makes: [],
            models: [],
            connection_types: [],
            carriers: []
          },
          inventory: {
            domain_whitelist: form.domain_whitelist,
            domain_blacklist: form.domain_blacklist,
            bundle_whitelist: [],
            bundle_blacklist: [],
            publisher_ids: [],
            categories: []
          },
          video: {},
          content: {},
          privacy: {
            gdpr_required: false,
            ccpa_allowed: true,
            coppa_allowed: false
          }
        },
        frequency_cap: {
          enabled: form.frequency_cap_enabled,
          max_impressions: parseInt(form.frequency_cap_count),
          period: form.frequency_cap_period
        },
        bid_shading: {
          enabled: form.bid_shading_enabled,
          min_reduction: 0.1,
          max_reduction: 0.3
        },
        ml_prediction: {
          enabled: form.ml_prediction_enabled,
          model_type: "heuristic"
        }
      };
      
      if (isEdit) {
        await updateCampaign(id, payload);
        toast.success("Campaign updated successfully");
      } else {
        await createCampaign(payload);
        toast.success("Campaign created successfully");
      }
      
      navigate("/campaigns");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[#64748B]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="campaign-wizard">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/campaigns")}
          className="text-[#94A3B8] hover:text-[#F8FAFC]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">
            {isEdit ? "Edit Campaign" : "Create Campaign"}
          </h1>
          <p className="text-sm text-[#94A3B8]">Step {currentStep} of 5</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <div 
              className={`flex items-center gap-2 cursor-pointer ${
                step.id === currentStep 
                  ? "text-[#3B82F6]" 
                  : step.id < currentStep 
                    ? "text-[#10B981]" 
                    : "text-[#64748B]"
              }`}
              onClick={() => setCurrentStep(step.id)}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step.id === currentStep 
                  ? "bg-[#3B82F6] text-white" 
                  : step.id < currentStep 
                    ? "bg-[#10B981] text-white" 
                    : "bg-[#2D3B55] text-[#64748B]"
              }`}>
                {step.id < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
              </div>
              <span className="hidden md:block text-sm font-medium">{step.title}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 mx-2 text-[#64748B]" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="surface-primary border-panel">
        <CardHeader>
          <CardTitle className="text-lg text-[#F8FAFC]">
            {STEPS[currentStep - 1].title}
          </CardTitle>
          <p className="text-sm text-[#64748B]">{STEPS[currentStep - 1].description}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Campaign Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="My Campaign"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Advertiser</Label>
                  <Input
                    value={form.advertiser}
                    onChange={(e) => updateField("advertiser", e.target.value)}
                    placeholder="Brand name"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Campaign description..."
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Start Date</Label>
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
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Bid Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.bid_price}
                    onChange={(e) => updateField("bid_price", e.target.value)}
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => updateField("currency", v)}>
                    <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="surface-primary border-[#2D3B55]">
                      {CURRENCIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Daily Budget</Label>
                  <Input
                    type="number"
                    value={form.daily_budget}
                    onChange={(e) => updateField("daily_budget", e.target.value)}
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Total Budget</Label>
                  <Input
                    type="number"
                    value={form.total_budget}
                    onChange={(e) => updateField("total_budget", e.target.value)}
                    placeholder="0 = unlimited"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Targeting */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[#94A3B8]">Target Countries</Label>
                <div className="flex flex-wrap gap-2">
                  {["USA", "CAN", "GBR", "DEU", "FRA", "AUS", "JPN", "IND", "BRA"].map(country => (
                    <Badge
                      key={country}
                      variant="outline"
                      className={`cursor-pointer ${
                        form.geo_countries.includes(country)
                          ? "bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]"
                          : "text-[#94A3B8] border-[#2D3B55]"
                      }`}
                      onClick={() => toggleArrayItem("geo_countries", country)}
                    >
                      {country}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-[#64748B]">Leave empty to target all countries</p>
              </div>
              
              <div className="space-y-3">
                <Label className="text-[#94A3B8]">Device Types</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 1, name: "Mobile" },
                    { id: 2, name: "PC" },
                    { id: 3, name: "Connected TV" },
                    { id: 4, name: "Phone" },
                    { id: 5, name: "Tablet" },
                    { id: 7, name: "Set Top Box" }
                  ].map(device => (
                    <Badge
                      key={device.id}
                      variant="outline"
                      className={`cursor-pointer ${
                        form.device_types.includes(device.id)
                          ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]"
                          : "text-[#94A3B8] border-[#2D3B55]"
                      }`}
                      onClick={() => toggleArrayItem("device_types", device.id)}
                    >
                      {device.name}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-[#94A3B8]">Operating Systems</Label>
                <div className="flex flex-wrap gap-2">
                  {["Android", "iOS", "Windows", "macOS", "Linux"].map(os => (
                    <Badge
                      key={os}
                      variant="outline"
                      className={`cursor-pointer ${
                        form.os_list.includes(os)
                          ? "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]"
                          : "text-[#94A3B8] border-[#2D3B55]"
                      }`}
                      onClick={() => toggleArrayItem("os_list", os)}
                    >
                      {os}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Creatives */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <Label className="text-[#94A3B8]">Select Creatives</Label>
              {creatives.length === 0 ? (
                <div className="text-center py-8 text-[#64748B]">
                  <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No creatives available</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate("/creatives/new")}
                    className="text-[#3B82F6]"
                  >
                    Create a creative first
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {creatives.map(creative => (
                    <div
                      key={creative.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        form.creative_ids.includes(creative.id)
                          ? "border-[#3B82F6] bg-[#3B82F6]/10"
                          : "border-[#2D3B55] surface-secondary hover:border-[#64748B]"
                      }`}
                      onClick={() => toggleArrayItem("creative_ids", creative.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#F8FAFC]">{creative.name}</p>
                          <p className="text-xs text-[#64748B]">{creative.type}</p>
                        </div>
                        {form.creative_ids.includes(creative.id) && (
                          <Check className="w-5 h-5 text-[#3B82F6]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Advanced */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Priority (1-10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.priority}
                  onChange={(e) => updateField("priority", e.target.value)}
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] w-24"
                />
              </div>
              
              <div className="space-y-4 p-4 surface-secondary rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#F8FAFC]">Frequency Capping</p>
                    <p className="text-xs text-[#64748B]">Limit impressions per user</p>
                  </div>
                  <Switch
                    checked={form.frequency_cap_enabled}
                    onCheckedChange={(v) => updateField("frequency_cap_enabled", v)}
                  />
                </div>
                {form.frequency_cap_enabled && (
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      type="number"
                      value={form.frequency_cap_count}
                      onChange={(e) => updateField("frequency_cap_count", e.target.value)}
                      className="w-20 surface-primary border-[#2D3B55] text-[#F8FAFC]"
                    />
                    <span className="text-[#94A3B8]">impressions per</span>
                    <Select 
                      value={form.frequency_cap_period} 
                      onValueChange={(v) => updateField("frequency_cap_period", v)}
                    >
                      <SelectTrigger className="w-24 surface-primary border-[#2D3B55] text-[#F8FAFC]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="surface-primary border-[#2D3B55]">
                        <SelectItem value="hour">Hour</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between p-4 surface-secondary rounded-lg">
                <div>
                  <p className="text-sm text-[#F8FAFC]">Bid Shading</p>
                  <p className="text-xs text-[#64748B]">Auto-optimize bid prices</p>
                </div>
                <Switch
                  checked={form.bid_shading_enabled}
                  onCheckedChange={(v) => updateField("bid_shading_enabled", v)}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 surface-secondary rounded-lg">
                <div>
                  <p className="text-sm text-[#F8FAFC]">ML Prediction</p>
                  <p className="text-xs text-[#64748B]">Use ML model for bid adjustments</p>
                </div>
                <Switch
                  checked={form.ml_prediction_enabled}
                  onCheckedChange={(v) => updateField("ml_prediction_enabled", v)}
                />
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[#64748B]">Basic Info</h3>
                  <div className="p-3 surface-secondary rounded">
                    <p className="text-sm text-[#F8FAFC]">{form.name}</p>
                    <p className="text-xs text-[#64748B]">{form.advertiser || "No advertiser"}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[#64748B]">Budget</h3>
                  <div className="p-3 surface-secondary rounded">
                    <p className="text-sm text-[#F8FAFC]">
                      ${form.bid_price} per bid • {form.currency}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Daily: ${form.daily_budget} • Total: {form.total_budget > 0 ? `$${form.total_budget}` : "Unlimited"}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[#64748B]">Targeting</h3>
                  <div className="p-3 surface-secondary rounded">
                    <p className="text-xs text-[#94A3B8]">
                      Countries: {form.geo_countries.length > 0 ? form.geo_countries.join(", ") : "All"}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      Devices: {form.device_types.length > 0 ? form.device_types.join(", ") : "All"}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[#64748B]">Creatives</h3>
                  <div className="p-3 surface-secondary rounded">
                    <p className="text-sm text-[#F8FAFC]">
                      {form.creative_ids.length} creative(s) selected
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-4 bg-[#F59E0B]/10 rounded-lg border border-[#F59E0B]/30">
                <Settings className="w-5 h-5 text-[#F59E0B]" />
                <div>
                  <p className="text-sm text-[#F8FAFC]">
                    {form.frequency_cap_enabled && "Frequency Capping • "}
                    {form.bid_shading_enabled && "Bid Shading • "}
                    {form.ml_prediction_enabled && "ML Prediction"}
                    {!form.frequency_cap_enabled && !form.bid_shading_enabled && !form.ml_prediction_enabled && "No advanced features enabled"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="border-[#2D3B55] text-[#94A3B8]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex gap-2">
          {currentStep === 5 ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleSubmit("draft")}
                disabled={saving}
                className="border-[#2D3B55] text-[#94A3B8]"
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSubmit("active")}
                disabled={saving}
                className="bg-[#10B981] hover:bg-[#10B981]/90"
              >
                <Check className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Launch Campaign"}
              </Button>
            </>
          ) : (
            <Button
              onClick={nextStep}
              className="bg-[#3B82F6] hover:bg-[#60A5FA]"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
