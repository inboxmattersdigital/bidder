import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { createCreative } from "../lib/api";

export default function CreativeForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState("banner");
  
  const [form, setForm] = useState({
    name: "",
    adomain: "",
    iurl: "",
    cat: "",
    // Banner fields
    banner_width: 300,
    banner_height: 250,
    banner_mimes: "image/jpeg, image/png, image/gif",
    banner_markup: "",
    // Video fields
    video_duration: 15,
    video_width: 1920,
    video_height: 1080,
    video_mimes: "video/mp4, video/webm",
    video_protocols: "2, 3, 5, 6",
    video_vast_xml: "",
    video_vast_url: "",
    // Native fields
    native_title: "",
    native_description: "",
    native_icon_url: "",
    native_image_url: "",
    native_cta_text: "Learn More",
    native_click_url: ""
  });

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const parseList = (value) => {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  };

  const parseIntList = (value) => {
    return value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name) {
      toast.error("Creative name is required");
      return;
    }
    
    const payload = {
      name: form.name,
      type: type,
      adomain: parseList(form.adomain),
      iurl: form.iurl || null,
      cat: parseList(form.cat)
    };
    
    if (type === "banner") {
      if (!form.banner_markup) {
        toast.error("Banner ad markup is required");
        return;
      }
      payload.banner_data = {
        width: parseInt(form.banner_width),
        height: parseInt(form.banner_height),
        mimes: parseList(form.banner_mimes),
        ad_markup: form.banner_markup
      };
    } else if (type === "video") {
      if (!form.video_vast_xml && !form.video_vast_url) {
        toast.error("VAST XML or VAST URL is required for video");
        return;
      }
      payload.video_data = {
        duration: parseInt(form.video_duration),
        width: parseInt(form.video_width),
        height: parseInt(form.video_height),
        mimes: parseList(form.video_mimes),
        protocols: parseIntList(form.video_protocols),
        vast_xml: form.video_vast_xml || null,
        vast_url: form.video_vast_url || null
      };
    } else if (type === "native") {
      if (!form.native_title || !form.native_click_url) {
        toast.error("Native title and click URL are required");
        return;
      }
      payload.native_data = {
        title: form.native_title,
        description: form.native_description,
        icon_url: form.native_icon_url || null,
        image_url: form.native_image_url || null,
        cta_text: form.native_cta_text,
        click_url: form.native_click_url
      };
    }
    
    try {
      setSaving(true);
      await createCreative(payload);
      toast.success("Creative created");
      navigate("/creatives");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create creative");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6" data-testid="creative-form-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate("/creatives")}
          className="text-[#94A3B8] hover:text-[#F8FAFC]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Create Creative</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Add a new banner, video, or native creative</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="surface-primary border-panel">
          <CardHeader>
            <CardTitle className="text-lg text-[#F8FAFC]">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Creative Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="My Creative"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] input-glow"
                  data-testid="creative-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Creative Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]" data-testid="creative-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="surface-primary border-panel">
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="native">Native</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Advertiser Domains</Label>
                <Input
                  value={form.adomain}
                  onChange={(e) => updateField('adomain', e.target.value)}
                  placeholder="example.com, advertiser.com"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">IAB Categories</Label>
                <Input
                  value={form.cat}
                  onChange={(e) => updateField('cat', e.target.value)}
                  placeholder="IAB1, IAB3, IAB19"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Sample Image URL</Label>
              <Input
                value={form.iurl}
                onChange={(e) => updateField('iurl', e.target.value)}
                placeholder="https://example.com/sample.jpg"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Banner Fields */}
        {type === "banner" && (
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-lg text-[#F8FAFC]">Banner Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Width (px) *</Label>
                  <Input
                    type="number"
                    value={form.banner_width}
                    onChange={(e) => updateField('banner_width', e.target.value)}
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Height (px) *</Label>
                  <Input
                    type="number"
                    value={form.banner_height}
                    onChange={(e) => updateField('banner_height', e.target.value)}
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">MIME Types</Label>
                  <Input
                    value={form.banner_mimes}
                    onChange={(e) => updateField('banner_mimes', e.target.value)}
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Ad Markup (HTML/JS) *</Label>
                <Textarea
                  value={form.banner_markup}
                  onChange={(e) => updateField('banner_markup', e.target.value)}
                  placeholder="<div>Your ad HTML here...</div>"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono h-32"
                  data-testid="banner-markup-input"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Video Fields */}
        {type === "video" && (
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-lg text-[#F8FAFC]">Video Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Duration (sec) *</Label>
                  <Input
                    type="number"
                    value={form.video_duration}
                    onChange={(e) => updateField('video_duration', e.target.value)}
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Width (px)</Label>
                  <Input
                    type="number"
                    value={form.video_width}
                    onChange={(e) => updateField('video_width', e.target.value)}
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Height (px)</Label>
                  <Input
                    type="number"
                    value={form.video_height}
                    onChange={(e) => updateField('video_height', e.target.value)}
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Protocols</Label>
                  <Input
                    value={form.video_protocols}
                    onChange={(e) => updateField('video_protocols', e.target.value)}
                    placeholder="2, 3, 5, 6"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">MIME Types</Label>
                <Input
                  value={form.video_mimes}
                  onChange={(e) => updateField('video_mimes', e.target.value)}
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">VAST URL</Label>
                <Input
                  value={form.video_vast_url}
                  onChange={(e) => updateField('video_vast_url', e.target.value)}
                  placeholder="https://example.com/vast.xml"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">VAST XML</Label>
                <Textarea
                  value={form.video_vast_xml}
                  onChange={(e) => updateField('video_vast_xml', e.target.value)}
                  placeholder='<?xml version="1.0"?><VAST version="3.0">...</VAST>'
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono h-32"
                  data-testid="vast-xml-input"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Native Fields */}
        {type === "native" && (
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-lg text-[#F8FAFC]">Native Ad Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Title *</Label>
                  <Input
                    value={form.native_title}
                    onChange={(e) => updateField('native_title', e.target.value)}
                    placeholder="Ad Title"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                    data-testid="native-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">CTA Text</Label>
                  <Input
                    value={form.native_cta_text}
                    onChange={(e) => updateField('native_cta_text', e.target.value)}
                    placeholder="Learn More"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Description</Label>
                <Textarea
                  value={form.native_description}
                  onChange={(e) => updateField('native_description', e.target.value)}
                  placeholder="Ad description..."
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] h-20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Click URL *</Label>
                <Input
                  value={form.native_click_url}
                  onChange={(e) => updateField('native_click_url', e.target.value)}
                  placeholder="https://example.com/landing"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  data-testid="native-click-url-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Icon URL</Label>
                  <Input
                    value={form.native_icon_url}
                    onChange={(e) => updateField('native_icon_url', e.target.value)}
                    placeholder="https://example.com/icon.png"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Main Image URL</Label>
                  <Input
                    value={form.native_image_url}
                    onChange={(e) => updateField('native_image_url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button 
            type="button"
            variant="outline"
            onClick={() => navigate("/creatives")}
            className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151F32]"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={saving}
            className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white btn-press shadow-[0_0_10px_rgba(59,130,246,0.3)]"
            data-testid="save-creative-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Creating..." : "Create Creative"}
          </Button>
        </div>
      </form>
    </div>
  );
}
