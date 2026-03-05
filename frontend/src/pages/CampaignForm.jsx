import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import { getCampaign, getCreatives, createCampaign, updateCampaign } from "../lib/api";

export default function CampaignForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatives, setCreatives] = useState([]);
  
  const [form, setForm] = useState({
    name: "",
    bid_price: 1.0,
    bid_floor: 0.0,
    currency: "USD",
    priority: 5,
    creative_id: "",
    budget: {
      daily_budget: 0,
      total_budget: 0,
      daily_spend: 0,
      total_spend: 0,
      pacing_type: "even"
    },
    bid_shading: {
      enabled: false,
      min_shade_factor: 0.5,
      max_shade_factor: 0.95,
      target_win_rate: 0.3,
      learning_rate: 0.1,
      current_shade_factor: 0.85
    },
    frequency_cap: {
      enabled: false,
      max_impressions_per_user: 3,
      time_window_hours: 24,
      max_impressions_per_day: 5,
      max_impressions_total: 10
    },
    spo: {
      enabled: false,
      preferred_ssp_ids: [],
      blocked_ssp_ids: [],
      max_hops: 3,
      require_authorized_sellers: true,
      bid_adjustment_factor: 1.0
    },
    ml_prediction: {
      enabled: false,
      use_historical_data: true,
      prediction_weight: 0.5,
      min_data_points: 100
    },
    targeting: {
      geo: { countries: [], regions: [], cities: [] },
      device: { device_types: [], makes: [], models: [], os_list: [], connection_types: [] },
      inventory: { domain_whitelist: [], domain_blacklist: [], bundle_whitelist: [], bundle_blacklist: [], publisher_ids: [], categories: [] },
      video: { placements: [], plcmts: [], min_duration: null, max_duration: null, protocols: [], mimes: [], pod_positions: [] },
      content: { categories: [], keywords: [] },
      privacy: { gdpr_required: false, gdpr_consent_required: false, ccpa_allowed: true, coppa_allowed: false }
    }
  });

  const currencies = [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const creativesRes = await getCreatives();
        setCreatives(creativesRes.data);
        
        if (isEdit) {
          const campaignRes = await getCampaign(id);
          setForm(campaignRes.data);
        }
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name) {
      toast.error("Campaign name is required");
      return;
    }
    if (!form.creative_id) {
      toast.error("Please select a creative");
      return;
    }
    
    try {
      setSaving(true);
      if (isEdit) {
        await updateCampaign(id, form);
        toast.success("Campaign updated");
      } else {
        await createCampaign(form);
        toast.success("Campaign created");
      }
      navigate("/campaigns");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (path, value) => {
    setForm(prev => {
      const newForm = { ...prev };
      const parts = path.split('.');
      let obj = newForm;
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      return newForm;
    });
  };

  const parseList = (value) => {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  };

  const parseIntList = (value) => {
    return value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[#64748B]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="campaign-form-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate("/campaigns")}
          className="text-[#94A3B8] hover:text-[#F8FAFC]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">
            {isEdit ? "Edit Campaign" : "Create Campaign"}
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {isEdit ? "Update campaign settings and targeting" : "Configure your new advertising campaign"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="surface-secondary border-panel flex-wrap">
            <TabsTrigger value="basic" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              Basic
            </TabsTrigger>
            <TabsTrigger value="budget" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              Budget
            </TabsTrigger>
            <TabsTrigger value="shading" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              Shading
            </TabsTrigger>
            <TabsTrigger value="freqcap" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              Freq Cap
            </TabsTrigger>
            <TabsTrigger value="spo" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              SPO
            </TabsTrigger>
            <TabsTrigger value="ml" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              ML
            </TabsTrigger>
            <TabsTrigger value="geo" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              Geo
            </TabsTrigger>
            <TabsTrigger value="device" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              Device
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              Inventory
            </TabsTrigger>
            <TabsTrigger value="video" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              Video
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              Privacy
            </TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Campaign Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="My Campaign"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] input-glow"
                      data-testid="campaign-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Creative *</Label>
                    <Select 
                      value={form.creative_id} 
                      onValueChange={(v) => updateField('creative_id', v)}
                    >
                      <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]" data-testid="creative-select">
                        <SelectValue placeholder="Select creative" />
                      </SelectTrigger>
                      <SelectContent className="surface-primary border-panel">
                        {creatives.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Bid Price (CPM) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.bid_price}
                      onChange={(e) => updateField('bid_price', parseFloat(e.target.value))}
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                      data-testid="bid-price-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Bid Floor (Min)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.bid_floor}
                      onChange={(e) => updateField('bid_floor', parseFloat(e.target.value))}
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Currency</Label>
                    <Select 
                      value={form.currency || "USD"} 
                      onValueChange={(v) => updateField('currency', v)}
                    >
                      <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]" data-testid="currency-select">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent className="surface-primary border-panel">
                        {currencies.map(c => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.symbol} {c.code} - {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Priority (1-10)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={form.priority}
                      onChange={(e) => updateField('priority', parseInt(e.target.value))}
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Budget Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Daily Budget ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.budget.daily_budget}
                      onChange={(e) => updateField('budget.daily_budget', parseFloat(e.target.value) || 0)}
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                      data-testid="daily-budget-input"
                    />
                    <p className="text-xs text-[#64748B]">Set to 0 for unlimited daily spend</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Total Budget ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.budget.total_budget}
                      onChange={(e) => updateField('budget.total_budget', parseFloat(e.target.value) || 0)}
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                    <p className="text-xs text-[#64748B]">Set to 0 for unlimited total spend</p>
                  </div>
                </div>
                
                {isEdit && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#2D3B55]">
                    <div className="space-y-1">
                      <Label className="text-[#64748B] text-xs">Daily Spend (Current)</Label>
                      <p className="text-lg font-mono text-[#3B82F6]">${form.budget.daily_spend?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[#64748B] text-xs">Total Spend (Lifetime)</Label>
                      <p className="text-lg font-mono text-[#10B981]">${form.budget.total_spend?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bid Shading Tab */}
          <TabsContent value="shading">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Bid Shading Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 surface-secondary rounded border border-[#2D3B55]">
                  <p className="text-sm text-[#94A3B8] mb-3">
                    Bid shading automatically adjusts your bid prices to optimize win rate and reduce costs. 
                    The algorithm learns from win/loss data to find the optimal bid level.
                  </p>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-[#2D3B55]">
                  <div>
                    <Label className="text-[#F8FAFC]">Enable Bid Shading</Label>
                    <p className="text-xs text-[#64748B]">Automatically optimize bid prices</p>
                  </div>
                  <Switch
                    checked={form.bid_shading?.enabled || false}
                    onCheckedChange={(v) => updateField('bid_shading.enabled', v)}
                  />
                </div>
                
                {form.bid_shading?.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Target Win Rate</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.1"
                          max="0.9"
                          value={form.bid_shading?.target_win_rate || 0.3}
                          onChange={(e) => updateField('bid_shading.target_win_rate', parseFloat(e.target.value))}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                        />
                        <p className="text-xs text-[#64748B]">0.3 = 30% target win rate</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Learning Rate</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="0.5"
                          value={form.bid_shading?.learning_rate || 0.1}
                          onChange={(e) => updateField('bid_shading.learning_rate', parseFloat(e.target.value))}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                        />
                        <p className="text-xs text-[#64748B]">How fast to adjust (0.1 = 10%)</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Min Shade Factor</Label>
                        <Input
                          type="number"
                          step="0.05"
                          min="0.3"
                          max="0.9"
                          value={form.bid_shading?.min_shade_factor || 0.5}
                          onChange={(e) => updateField('bid_shading.min_shade_factor', parseFloat(e.target.value))}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                        />
                        <p className="text-xs text-[#64748B]">0.5 = min 50% of bid</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Max Shade Factor</Label>
                        <Input
                          type="number"
                          step="0.05"
                          min="0.5"
                          max="1.0"
                          value={form.bid_shading?.max_shade_factor || 0.95}
                          onChange={(e) => updateField('bid_shading.max_shade_factor', parseFloat(e.target.value))}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                        />
                        <p className="text-xs text-[#64748B]">0.95 = max 95% of bid</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Current Factor</Label>
                        <Input
                          type="number"
                          step="0.05"
                          value={form.bid_shading?.current_shade_factor || 0.85}
                          onChange={(e) => updateField('bid_shading.current_shade_factor', parseFloat(e.target.value))}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                        />
                        <p className="text-xs text-[#64748B]">Starting shade factor</p>
                      </div>
                    </div>
                    
                    <div className="p-3 surface-secondary rounded border border-[#3B82F6]/30">
                      <p className="text-xs text-[#3B82F6]">
                        With current settings: A $3.00 bid will be shaded to ${(3.00 * (form.bid_shading?.current_shade_factor || 0.85)).toFixed(2)}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geo Targeting Tab */}
          <TabsContent value="geo">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Geographic Targeting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Countries (ISO 3166-1 alpha-3)</Label>
                  <Input
                    value={form.targeting.geo.countries?.join(', ') || ''}
                    onChange={(e) => updateField('targeting.geo.countries', parseList(e.target.value))}
                    placeholder="USA, CAN, GBR"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                  <p className="text-xs text-[#64748B]">Leave empty to target all countries</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Regions</Label>
                  <Input
                    value={form.targeting.geo.regions?.join(', ') || ''}
                    onChange={(e) => updateField('targeting.geo.regions', parseList(e.target.value))}
                    placeholder="CA, NY, TX"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Cities</Label>
                  <Input
                    value={form.targeting.geo.cities?.join(', ') || ''}
                    onChange={(e) => updateField('targeting.geo.cities', parseList(e.target.value))}
                    placeholder="Los Angeles, New York, Chicago"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Device Tab */}
          <TabsContent value="device">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Device Targeting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Device Types</Label>
                  <Input
                    value={form.targeting.device.device_types?.join(', ') || ''}
                    onChange={(e) => updateField('targeting.device.device_types', parseIntList(e.target.value))}
                    placeholder="1, 4, 5 (1=Mobile/Tablet, 3=CTV, 4=Phone, 5=Tablet)"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                  <p className="text-xs text-[#64748B]">1=Mobile/Tablet, 2=PC, 3=CTV, 4=Phone, 5=Tablet, 6=Connected Device, 7=Set Top Box</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Makes (Manufacturers)</Label>
                    <Input
                      value={form.targeting.device.makes?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.device.makes', parseList(e.target.value))}
                      placeholder="Apple, Samsung, OPPO"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Models</Label>
                    <Input
                      value={form.targeting.device.models?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.device.models', parseList(e.target.value))}
                      placeholder="iPhone 15, Galaxy S24"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Operating Systems</Label>
                    <Input
                      value={form.targeting.device.os_list?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.device.os_list', parseList(e.target.value))}
                      placeholder="Android, iOS"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Connection Types</Label>
                    <Input
                      value={form.targeting.device.connection_types?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.device.connection_types', parseIntList(e.target.value))}
                      placeholder="2, 6 (2=WiFi, 6=4G)"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                    <p className="text-xs text-[#64748B]">1=Ethernet, 2=WiFi, 3-7=Cellular</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Inventory Targeting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Domain Whitelist</Label>
                    <Input
                      value={form.targeting.inventory.domain_whitelist?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.inventory.domain_whitelist', parseList(e.target.value))}
                      placeholder="cnn.com, nytimes.com"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Domain Blacklist</Label>
                    <Input
                      value={form.targeting.inventory.domain_blacklist?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.inventory.domain_blacklist', parseList(e.target.value))}
                      placeholder="spam-site.com"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">App Bundle Whitelist</Label>
                    <Input
                      value={form.targeting.inventory.bundle_whitelist?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.inventory.bundle_whitelist', parseList(e.target.value))}
                      placeholder="com.spotify.music"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">App Bundle Blacklist</Label>
                    <Input
                      value={form.targeting.inventory.bundle_blacklist?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.inventory.bundle_blacklist', parseList(e.target.value))}
                      placeholder="com.bad.app"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Publisher IDs</Label>
                    <Input
                      value={form.targeting.inventory.publisher_ids?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.inventory.publisher_ids', parseList(e.target.value))}
                      placeholder="pub_12345"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">IAB Categories</Label>
                    <Input
                      value={form.targeting.inventory.categories?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.inventory.categories', parseList(e.target.value))}
                      placeholder="IAB1, IAB3, IAB19"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Tab */}
          <TabsContent value="video">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Video Targeting (OpenRTB 2.5/2.6)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Placements (2.5)</Label>
                    <Input
                      value={form.targeting.video.placements?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.video.placements', parseIntList(e.target.value))}
                      placeholder="1, 5 (1=In-Stream, 5=Interstitial)"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                    <p className="text-xs text-[#64748B]">1=In-Stream, 2=In-Banner, 3=In-Article, 4=In-Feed, 5=Interstitial</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Plcmts (2.6)</Label>
                    <Input
                      value={form.targeting.video.plcmts?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.video.plcmts', parseIntList(e.target.value))}
                      placeholder="1, 3 (1=Instream, 3=Interstitial)"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                    <p className="text-xs text-[#64748B]">1=Instream, 2=Accompanying, 3=Interstitial, 4=No-Content</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Min Duration (sec)</Label>
                    <Input
                      type="number"
                      value={form.targeting.video.min_duration || ''}
                      onChange={(e) => updateField('targeting.video.min_duration', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="5"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Max Duration (sec)</Label>
                    <Input
                      type="number"
                      value={form.targeting.video.max_duration || ''}
                      onChange={(e) => updateField('targeting.video.max_duration', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="30"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Protocols</Label>
                    <Input
                      value={form.targeting.video.protocols?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.video.protocols', parseIntList(e.target.value))}
                      placeholder="2, 3, 5, 6"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                    <p className="text-xs text-[#64748B]">2=VAST 2.0, 3=VAST 3.0, 5=VAST 2.0 Wrapper, 6=VAST 3.0 Wrapper</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">MIME Types</Label>
                    <Input
                      value={form.targeting.video.mimes?.join(', ') || ''}
                      onChange={(e) => updateField('targeting.video.mimes', parseList(e.target.value))}
                      placeholder="video/mp4, video/webm"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Pod Positions (2.6 slotinpod)</Label>
                  <Input
                    value={form.targeting.video.pod_positions?.join(', ') || ''}
                    onChange={(e) => updateField('targeting.video.pod_positions', parseIntList(e.target.value))}
                    placeholder="0, 1, -1 (0=any, 1=first, -1=last)"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                  <p className="text-xs text-[#64748B]">For ad pod targeting: 0=any, 1=first, -1=last, 2+=specific position</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Frequency Cap Tab */}
          <TabsContent value="freqcap">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Frequency Capping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 surface-secondary rounded border border-[#2D3B55]">
                  <p className="text-sm text-[#94A3B8] mb-3">
                    Limit how many times a single user sees your ads to avoid ad fatigue and improve campaign effectiveness.
                  </p>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-[#2D3B55]">
                  <div>
                    <Label className="text-[#F8FAFC]">Enable Frequency Capping</Label>
                    <p className="text-xs text-[#64748B]">Limit impressions per user</p>
                  </div>
                  <Switch
                    checked={form.frequency_cap?.enabled || false}
                    onCheckedChange={(v) => updateField('frequency_cap.enabled', v)}
                    data-testid="freq-cap-toggle"
                  />
                </div>
                
                {form.frequency_cap?.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Max Impressions Per User</Label>
                        <Input
                          type="number"
                          min="1"
                          value={form.frequency_cap?.max_impressions_per_user || 3}
                          onChange={(e) => updateField('frequency_cap.max_impressions_per_user', parseInt(e.target.value))}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                          data-testid="freq-cap-max-per-user"
                        />
                        <p className="text-xs text-[#64748B]">Per time window</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Time Window (hours)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="168"
                          value={form.frequency_cap?.time_window_hours || 24}
                          onChange={(e) => updateField('frequency_cap.time_window_hours', parseInt(e.target.value))}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                        />
                        <p className="text-xs text-[#64748B]">24h = daily cap</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Max Impressions Per Day</Label>
                        <Input
                          type="number"
                          min="1"
                          value={form.frequency_cap?.max_impressions_per_day || 5}
                          onChange={(e) => updateField('frequency_cap.max_impressions_per_day', parseInt(e.target.value))}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                        />
                        <p className="text-xs text-[#64748B]">Hard daily limit per user</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Max Total Impressions</Label>
                        <Input
                          type="number"
                          min="1"
                          value={form.frequency_cap?.max_impressions_total || 10}
                          onChange={(e) => updateField('frequency_cap.max_impressions_total', parseInt(e.target.value))}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                        />
                        <p className="text-xs text-[#64748B]">Lifetime cap per user</p>
                      </div>
                    </div>
                    
                    <div className="p-3 surface-secondary rounded border border-[#10B981]/30">
                      <p className="text-xs text-[#10B981]">
                        With current settings: Each user will see max {form.frequency_cap?.max_impressions_per_day || 5} impressions per day, 
                        and {form.frequency_cap?.max_impressions_total || 10} total for this campaign.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SPO Tab */}
          <TabsContent value="spo">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Supply Path Optimization (SPO)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 surface-secondary rounded border border-[#2D3B55]">
                  <p className="text-sm text-[#94A3B8] mb-3">
                    Optimize supply paths to reduce costs and improve transparency. Filter by SSP quality and supply chain length.
                  </p>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-[#2D3B55]">
                  <div>
                    <Label className="text-[#F8FAFC]">Enable Supply Path Optimization</Label>
                    <p className="text-xs text-[#64748B]">Filter and prioritize supply paths</p>
                  </div>
                  <Switch
                    checked={form.spo?.enabled || false}
                    onCheckedChange={(v) => updateField('spo.enabled', v)}
                    data-testid="spo-toggle"
                  />
                </div>
                
                {form.spo?.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[#94A3B8]">Preferred SSP IDs</Label>
                      <Input
                        value={form.spo?.preferred_ssp_ids?.join(', ') || ''}
                        onChange={(e) => updateField('spo.preferred_ssp_ids', parseList(e.target.value))}
                        placeholder="ssp1.com, ssp2.com"
                        className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                        data-testid="spo-preferred-ssps"
                      />
                      <p className="text-xs text-[#64748B]">Prioritize traffic from these SSPs</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[#94A3B8]">Blocked SSP IDs</Label>
                      <Input
                        value={form.spo?.blocked_ssp_ids?.join(', ') || ''}
                        onChange={(e) => updateField('spo.blocked_ssp_ids', parseList(e.target.value))}
                        placeholder="bad-ssp.com, low-quality.com"
                        className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                        data-testid="spo-blocked-ssps"
                      />
                      <p className="text-xs text-[#64748B]">Never bid on traffic from these SSPs</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Max Supply Chain Hops</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={form.spo?.max_hops || 3}
                          onChange={(e) => updateField('spo.max_hops', parseInt(e.target.value))}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                        />
                        <p className="text-xs text-[#64748B]">Reject paths with more intermediaries</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Bid Adjustment Factor</Label>
                        <Input
                          type="number"
                          step="0.05"
                          min="0.5"
                          max="1.5"
                          value={form.spo?.bid_adjustment_factor || 1.0}
                          onChange={(e) => updateField('spo.bid_adjustment_factor', parseFloat(e.target.value))}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                        />
                        <p className="text-xs text-[#64748B]">Multiplier for preferred paths</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-t border-[#2D3B55]">
                      <div>
                        <Label className="text-[#F8FAFC]">Require Authorized Sellers</Label>
                        <p className="text-xs text-[#64748B]">Only bid on inventory with valid sellers.json</p>
                      </div>
                      <Switch
                        checked={form.spo?.require_authorized_sellers ?? true}
                        onCheckedChange={(v) => updateField('spo.require_authorized_sellers', v)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ML Prediction Tab */}
          <TabsContent value="ml">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">ML-Based Bid Prediction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 surface-secondary rounded border border-[#2D3B55]">
                  <p className="text-sm text-[#94A3B8] mb-3">
                    Use heuristic-based prediction to automatically adjust bid prices based on historical win/loss patterns.
                    The model learns which device types, geos, and contexts perform best for your campaign.
                  </p>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-[#2D3B55]">
                  <div>
                    <Label className="text-[#F8FAFC]">Enable ML Prediction</Label>
                    <p className="text-xs text-[#64748B]">Auto-adjust bids based on performance data</p>
                  </div>
                  <Switch
                    checked={form.ml_prediction?.enabled || false}
                    onCheckedChange={(v) => updateField('ml_prediction.enabled', v)}
                    data-testid="ml-toggle"
                  />
                </div>
                
                {form.ml_prediction?.enabled && (
                  <>
                    <div className="flex items-center justify-between py-3 border-b border-[#2D3B55]">
                      <div>
                        <Label className="text-[#F8FAFC]">Use Historical Data</Label>
                        <p className="text-xs text-[#64748B]">Learn from past bid outcomes</p>
                      </div>
                      <Switch
                        checked={form.ml_prediction?.use_historical_data ?? true}
                        onCheckedChange={(v) => updateField('ml_prediction.use_historical_data', v)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Prediction Weight</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={form.ml_prediction?.prediction_weight || 0.5}
                          onChange={(e) => updateField('ml_prediction.prediction_weight', parseFloat(e.target.value))}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                          data-testid="ml-prediction-weight"
                        />
                        <p className="text-xs text-[#64748B]">0.5 = 50% ML, 50% base price</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Min Data Points</Label>
                        <Input
                          type="number"
                          min="10"
                          value={form.ml_prediction?.min_data_points || 100}
                          onChange={(e) => updateField('ml_prediction.min_data_points', parseInt(e.target.value))}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                        />
                        <p className="text-xs text-[#64748B]">Required before ML kicks in</p>
                      </div>
                    </div>
                    
                    <div className="p-3 surface-secondary rounded border border-[#8B5CF6]/30">
                      <p className="text-xs text-[#8B5CF6]">
                        ML adjusts bids using device type ({(form.ml_prediction?.feature_weights?.device_type || 0.15) * 100}% weight), 
                        geo ({(form.ml_prediction?.feature_weights?.geo_country || 0.15) * 100}% weight), and 
                        bid floor ({(form.ml_prediction?.feature_weights?.bid_floor || 0.20) * 100}% weight) signals.
                      </p>
                    </div>
                    
                    <div className="p-3 bg-[#1E293B] rounded border border-[#3B82F6]/30">
                      <p className="text-xs text-[#94A3B8]">
                        <span className="text-[#3B82F6] font-medium">Tip:</span> After 100+ bids, go to Reports → SPO Analysis to train the ML model 
                        using the <code className="bg-[#0F172A] px-1 rounded">Train Model</code> button.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy">
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Privacy & Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-[#2D3B55]">
                  <div>
                    <Label className="text-[#F8FAFC]">GDPR Required</Label>
                    <p className="text-xs text-[#64748B]">Only bid on GDPR-compliant inventory</p>
                  </div>
                  <Switch
                    checked={form.targeting.privacy.gdpr_required}
                    onCheckedChange={(v) => updateField('targeting.privacy.gdpr_required', v)}
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#2D3B55]">
                  <div>
                    <Label className="text-[#F8FAFC]">GDPR Consent Required</Label>
                    <p className="text-xs text-[#64748B]">Require valid user consent string</p>
                  </div>
                  <Switch
                    checked={form.targeting.privacy.gdpr_consent_required}
                    onCheckedChange={(v) => updateField('targeting.privacy.gdpr_consent_required', v)}
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#2D3B55]">
                  <div>
                    <Label className="text-[#F8FAFC]">CCPA Allowed</Label>
                    <p className="text-xs text-[#64748B]">Allow bidding on CCPA inventory</p>
                  </div>
                  <Switch
                    checked={form.targeting.privacy.ccpa_allowed}
                    onCheckedChange={(v) => updateField('targeting.privacy.ccpa_allowed', v)}
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label className="text-[#F8FAFC]">COPPA Allowed</Label>
                    <p className="text-xs text-[#64748B]">Allow bidding on child-directed inventory</p>
                  </div>
                  <Switch
                    checked={form.targeting.privacy.coppa_allowed}
                    onCheckedChange={(v) => updateField('targeting.privacy.coppa_allowed', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end gap-3">
          <Button 
            type="button"
            variant="outline"
            onClick={() => navigate("/campaigns")}
            className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151F32]"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={saving}
            className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white btn-press shadow-[0_0_10px_rgba(59,130,246,0.3)]"
            data-testid="save-campaign-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : (isEdit ? "Update Campaign" : "Create Campaign")}
          </Button>
        </div>
      </form>
    </div>
  );
}
