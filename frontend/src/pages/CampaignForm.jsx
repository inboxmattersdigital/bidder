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
    priority: 5,
    creative_id: "",
    budget: {
      daily_budget: 0,
      total_budget: 0,
      daily_spend: 0,
      total_spend: 0
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
          <TabsList className="surface-secondary border-panel">
            <TabsTrigger value="basic" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="budget" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              Budget
            </TabsTrigger>
            <TabsTrigger value="geo" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
              Geo Targeting
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
                
                <div className="grid grid-cols-3 gap-4">
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
