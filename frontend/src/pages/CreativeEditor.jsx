import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Save, Upload, Image, Video, FileText, Trash2,
  Eye, Palette, Type, Link, Maximize2, X, Check, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";
import { createCreative, uploadImage } from "../lib/api";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Standard banner sizes
const BANNER_SIZES = [
  { label: "Medium Rectangle", w: 300, h: 250 },
  { label: "Leaderboard", w: 728, h: 90 },
  { label: "Wide Skyscraper", w: 160, h: 600 },
  { label: "Half Page", w: 300, h: 600 },
  { label: "Large Rectangle", w: 336, h: 280 },
  { label: "Billboard", w: 970, h: 250 },
  { label: "Mobile Banner", w: 320, h: 50 },
  { label: "Mobile Large", w: 320, h: 100 },
  { label: "Square", w: 250, h: 250 },
];

// Creative templates
const TEMPLATES = [
  { 
    id: "simple-image", 
    name: "Simple Image Ad",
    description: "Single image with click-through",
    type: "banner"
  },
  { 
    id: "cta-banner", 
    name: "CTA Banner",
    description: "Image with call-to-action button",
    type: "banner"
  },
  { 
    id: "native-article", 
    name: "Native Article",
    description: "Native ad format for content feeds",
    type: "native"
  },
  { 
    id: "video-preroll", 
    name: "Video Pre-Roll",
    description: "Standard video ad format",
    type: "video"
  },
];

export default function CreativeEditor() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const [creativeType, setCreativeType] = useState("banner");
  const [selectedSize, setSelectedSize] = useState(BANNER_SIZES[0]);
  const [uploadedImages, setUploadedImages] = useState([]);
  
  const [form, setForm] = useState({
    name: "",
    adomain: "",
    clickUrl: "",
    cat: "",
    // Banner
    imageUrl: "",
    ctaText: "Learn More",
    ctaColor: "#3B82F6",
    backgroundColor: "#FFFFFF",
    // Native
    nativeTitle: "",
    nativeDescription: "",
    nativeIconUrl: "",
    nativeImageUrl: "",
    // Video
    vastUrl: "",
    videoDuration: 15,
  });

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const res = await uploadImage(file);
      const imageData = res.data;
      setUploadedImages(prev => [...prev, imageData]);
      
      // Auto-set to form based on creative type
      if (creativeType === "banner") {
        updateField("imageUrl", imageData.url);
      } else if (creativeType === "native") {
        if (!form.nativeImageUrl) {
          updateField("nativeImageUrl", imageData.url);
        } else if (!form.nativeIconUrl) {
          updateField("nativeIconUrl", imageData.url);
        }
      }
      
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const generateBannerMarkup = () => {
    const { imageUrl, clickUrl, ctaText, ctaColor, backgroundColor } = form;
    
    if (!imageUrl) return "";
    
    return `<a href="${clickUrl || '#'}" target="_blank" style="display:block;width:${selectedSize.w}px;height:${selectedSize.h}px;background:${backgroundColor};text-decoration:none;position:relative;">
  <img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;" />
  ${ctaText ? `<div style="position:absolute;bottom:10px;right:10px;background:${ctaColor};color:white;padding:8px 16px;border-radius:4px;font-family:sans-serif;font-size:14px;">${ctaText}</div>` : ''}
</a>`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name) {
      toast.error("Creative name is required");
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        type: creativeType,
        adomain: form.adomain.split(',').map(s => s.trim()).filter(Boolean),
        iurl: form.imageUrl || form.nativeImageUrl || null,
        cat: form.cat.split(',').map(s => s.trim()).filter(Boolean)
      };
      
      if (creativeType === "banner") {
        payload.banner_data = {
          width: selectedSize.w,
          height: selectedSize.h,
          mimes: ["image/jpeg", "image/png", "image/gif"],
          adm: generateBannerMarkup()
        };
      } else if (creativeType === "native") {
        payload.native_data = {
          title: form.nativeTitle,
          desc: form.nativeDescription,
          icon_url: form.nativeIconUrl,
          main_image_url: form.nativeImageUrl,
          cta_text: form.ctaText,
          click_url: form.clickUrl
        };
      } else if (creativeType === "video") {
        payload.video_data = {
          duration: form.videoDuration,
          width: 1920,
          height: 1080,
          mimes: ["video/mp4"],
          protocols: [2, 3, 5, 6],
          vast_url: form.vastUrl
        };
      }
      
      await createCreative(payload);
      toast.success("Creative created successfully");
      navigate("/creatives");
    } catch (error) {
      toast.error("Failed to create creative");
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = () => {
    if (creativeType === "banner") {
      return (
        <div 
          style={{ 
            width: selectedSize.w, 
            height: selectedSize.h,
            background: form.backgroundColor,
            position: "relative",
            overflow: "hidden"
          }}
          className="border border-[#2D3B55] rounded"
        >
          {form.imageUrl ? (
            <>
              <img 
                src={form.imageUrl} 
                alt="Preview" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {form.ctaText && (
                <div 
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    background: form.ctaColor,
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: 4,
                    fontSize: 14
                  }}
                >
                  {form.ctaText}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-[#64748B]">
              <Image className="w-8 h-8" />
            </div>
          )}
        </div>
      );
    }
    
    if (creativeType === "native") {
      return (
        <div className="w-[320px] p-4 bg-white rounded border border-[#2D3B55]">
          <div className="flex items-start gap-3">
            {form.nativeIconUrl && (
              <img src={form.nativeIconUrl} alt="Icon" className="w-12 h-12 rounded" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{form.nativeTitle || "Ad Title"}</p>
              <p className="text-xs text-gray-500">Sponsored</p>
            </div>
          </div>
          {form.nativeImageUrl && (
            <img src={form.nativeImageUrl} alt="Main" className="w-full h-40 object-cover mt-3 rounded" />
          )}
          <p className="text-sm text-gray-700 mt-2">{form.nativeDescription || "Ad description..."}</p>
          <button 
            className="mt-3 w-full py-2 rounded text-white text-sm"
            style={{ background: form.ctaColor }}
          >
            {form.ctaText}
          </button>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="p-6 space-y-6" data-testid="creative-editor">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/creatives")}
            className="text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#F8FAFC]">Advanced Creative Editor</h1>
            <p className="text-sm text-[#94A3B8]">Create rich ad creatives with templates and image upload</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowPreview(true)}
            className="border-[#2D3B55] text-[#94A3B8]"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={saving}
            className="bg-[#10B981] hover:bg-[#10B981]/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Creative"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="col-span-2 space-y-6">
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
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="My Creative"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Creative Type</Label>
                  <Select value={creativeType} onValueChange={setCreativeType}>
                    <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="surface-primary border-[#2D3B55]">
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="native">Native</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Advertiser Domain</Label>
                  <Input
                    value={form.adomain}
                    onChange={(e) => updateField("adomain", e.target.value)}
                    placeholder="example.com"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Click URL</Label>
                  <Input
                    value={form.clickUrl}
                    onChange={(e) => updateField("clickUrl", e.target.value)}
                    placeholder="https://..."
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Type-specific settings */}
          {creativeType === "banner" && (
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Banner Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Banner Size</Label>
                  <Select 
                    value={`${selectedSize.w}x${selectedSize.h}`}
                    onValueChange={(v) => {
                      const [w, h] = v.split('x').map(Number);
                      setSelectedSize({ w, h, label: BANNER_SIZES.find(s => s.w === w && s.h === h)?.label || 'Custom' });
                    }}
                  >
                    <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="surface-primary border-[#2D3B55]">
                      {BANNER_SIZES.map(size => (
                        <SelectItem key={`${size.w}x${size.h}`} value={`${size.w}x${size.h}`}>
                          {size.label} ({size.w}x{size.h})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Image URL (or upload below)</Label>
                  <Input
                    value={form.imageUrl}
                    onChange={(e) => updateField("imageUrl", e.target.value)}
                    placeholder="https://..."
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">CTA Text</Label>
                    <Input
                      value={form.ctaText}
                      onChange={(e) => updateField("ctaText", e.target.value)}
                      placeholder="Learn More"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">CTA Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={form.ctaColor}
                        onChange={(e) => updateField("ctaColor", e.target.value)}
                        className="w-12 h-10 p-1 surface-secondary border-[#2D3B55]"
                      />
                      <Input
                        value={form.ctaColor}
                        onChange={(e) => updateField("ctaColor", e.target.value)}
                        className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Background</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={form.backgroundColor}
                        onChange={(e) => updateField("backgroundColor", e.target.value)}
                        className="w-12 h-10 p-1 surface-secondary border-[#2D3B55]"
                      />
                      <Input
                        value={form.backgroundColor}
                        onChange={(e) => updateField("backgroundColor", e.target.value)}
                        className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {creativeType === "native" && (
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Native Ad Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Title *</Label>
                  <Input
                    value={form.nativeTitle}
                    onChange={(e) => updateField("nativeTitle", e.target.value)}
                    placeholder="Ad headline"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Description</Label>
                  <Textarea
                    value={form.nativeDescription}
                    onChange={(e) => updateField("nativeDescription", e.target.value)}
                    placeholder="Ad description..."
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Icon URL</Label>
                    <Input
                      value={form.nativeIconUrl}
                      onChange={(e) => updateField("nativeIconUrl", e.target.value)}
                      placeholder="https://..."
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Main Image URL</Label>
                    <Input
                      value={form.nativeImageUrl}
                      onChange={(e) => updateField("nativeImageUrl", e.target.value)}
                      placeholder="https://..."
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {creativeType === "video" && (
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Video Ad Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">VAST URL *</Label>
                  <Input
                    value={form.vastUrl}
                    onChange={(e) => updateField("vastUrl", e.target.value)}
                    placeholder="https://..."
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={form.videoDuration}
                    onChange={(e) => updateField("videoDuration", parseInt(e.target.value))}
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Image Upload */}
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#3B82F6]" />
                Image Upload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-dashed border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </>
                )}
              </Button>
              
              {uploadedImages.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-[#64748B]">Uploaded Images</p>
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 surface-secondary rounded">
                      <img src={img.url} alt="" className="w-10 h-10 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#F8FAFC] truncate">{img.filename}</p>
                        <p className="text-[10px] text-[#64748B]">{(img.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          if (creativeType === "banner") {
                            updateField("imageUrl", img.url);
                          } else {
                            updateField("nativeImageUrl", img.url);
                          }
                          toast.success("Image applied");
                        }}
                        className="text-[#10B981] p-1 h-auto"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#F59E0B]" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center overflow-auto max-h-[400px] p-2 surface-secondary rounded">
                {renderPreview()}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-[#64748B]">
                  {creativeType === "banner" ? `${selectedSize.w}x${selectedSize.h}` : creativeType}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPreview(true)}
                  className="text-[#3B82F6] p-1 h-auto"
                >
                  <Maximize2 className="w-3 h-3 mr-1" />
                  Expand
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Templates */}
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#8B5CF6]" />
                Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {TEMPLATES.filter(t => t.type === creativeType).map(template => (
                  <div 
                    key={template.id}
                    className="p-2 surface-secondary rounded cursor-pointer hover:bg-[#1E293B] transition-colors"
                    onClick={() => toast.info(`Template "${template.name}" selected`)}
                  >
                    <p className="text-sm text-[#F8FAFC]">{template.name}</p>
                    <p className="text-xs text-[#64748B]">{template.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="surface-primary border-panel max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">Creative Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-8 surface-secondary rounded">
            {renderPreview()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
