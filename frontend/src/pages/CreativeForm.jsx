import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Save, Upload, CheckCircle, XCircle, AlertCircle, 
  Play, FileVideo, Link, Code, Loader2, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { createCreative, uploadVideo, uploadVideoChunk, validateVast } from "../lib/api";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export default function CreativeForm() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState("banner");
  const [videoSource, setVideoSource] = useState("vast_url");
  
  // Video upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState("");
  
  // VAST validation state
  const [validating, setValidating] = useState(false);
  const [vastValidation, setVastValidation] = useState(null);
  
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
    video_url: "",
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
    // Reset validation when VAST changes
    if (field === "video_vast_url" || field === "video_vast_xml") {
      setVastValidation(null);
    }
  };

  const parseList = (value) => {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  };

  const parseIntList = (value) => {
    return value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  };

  // Video upload handler
  const handleVideoUpload = async (file) => {
    if (!file) return;
    
    const allowedTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid video format. Allowed: MP4, WebM, OGG");
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      if (file.size <= CHUNK_SIZE) {
        // Small file - single upload
        const response = await uploadVideo(file);
        setUploadedVideoUrl(response.data.url);
        updateField("video_url", response.data.url);
        toast.success("Video uploaded successfully");
      } else {
        // Large file - chunked upload
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const uploadId = Date.now().toString(36);
        
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
          
          const response = await uploadVideoChunk(chunk, i, totalChunks, uploadId, file.name);
          setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
          
          if (response.data.status === "complete") {
            setUploadedVideoUrl(response.data.url);
            updateField("video_url", response.data.url);
            toast.success("Video uploaded successfully");
          }
        }
      }
    } catch (error) {
      toast.error("Failed to upload video");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // VAST validation handler
  const handleValidateVast = async () => {
    const vastUrl = form.video_vast_url;
    const vastXml = form.video_vast_xml;
    
    if (!vastUrl && !vastXml) {
      toast.error("Enter a VAST URL or VAST XML to validate");
      return;
    }
    
    setValidating(true);
    setVastValidation(null);
    
    try {
      const response = await validateVast(vastUrl || null, vastXml || null);
      setVastValidation(response.data);
      
      if (response.data.valid) {
        toast.success("VAST tag is valid");
        // Auto-fill duration if available
        if (response.data.duration) {
          const durationMatch = response.data.duration.match(/(\d+):(\d+):(\d+)/);
          if (durationMatch) {
            const seconds = parseInt(durationMatch[1]) * 3600 + 
                          parseInt(durationMatch[2]) * 60 + 
                          parseInt(durationMatch[3]);
            updateField("video_duration", seconds);
          }
        }
      } else {
        toast.error("VAST validation failed");
      }
    } catch (error) {
      toast.error("Failed to validate VAST");
      setVastValidation({ valid: false, errors: ["Validation request failed"] });
    } finally {
      setValidating(false);
    }
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
      if (!form.video_vast_xml && !form.video_vast_url && !form.video_url) {
        toast.error("VAST XML, VAST URL, or uploaded video is required");
        return;
      }
      payload.video_data = {
        duration: parseInt(form.video_duration),
        width: parseInt(form.video_width),
        height: parseInt(form.video_height),
        mimes: parseList(form.video_mimes),
        protocols: parseIntList(form.video_protocols),
        vast_xml: form.video_vast_xml || null,
        vast_url: form.video_vast_url || null,
        video_url: form.video_url || null
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

  const renderVastValidationResult = () => {
    if (!vastValidation) return null;
    
    return (
      <div className={`mt-4 p-4 rounded-lg border ${
        vastValidation.valid 
          ? 'bg-[#10B981]/10 border-[#10B981]/30' 
          : 'bg-[#EF4444]/10 border-[#EF4444]/30'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          {vastValidation.valid ? (
            <CheckCircle className="w-5 h-5 text-[#10B981]" />
          ) : (
            <XCircle className="w-5 h-5 text-[#EF4444]" />
          )}
          <span className={`font-medium ${vastValidation.valid ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {vastValidation.valid ? 'VAST Valid' : 'VAST Invalid'}
          </span>
          {vastValidation.vast_version && (
            <Badge className="bg-[#3B82F6]/20 text-[#3B82F6]">
              VAST {vastValidation.vast_version}
            </Badge>
          )}
          {vastValidation.is_wrapper && (
            <Badge className="bg-[#F59E0B]/20 text-[#F59E0B]">Wrapper</Badge>
          )}
        </div>
        
        {/* Errors */}
        {vastValidation.errors?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-[#EF4444] mb-1">Errors:</p>
            <ul className="text-xs text-[#EF4444] list-disc list-inside space-y-0.5">
              {vastValidation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Warnings */}
        {vastValidation.warnings?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-[#F59E0B] mb-1">Warnings:</p>
            <ul className="text-xs text-[#F59E0B] list-disc list-inside space-y-0.5">
              {vastValidation.warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Details */}
        {vastValidation.valid && (
          <div className="grid grid-cols-3 gap-4 text-xs">
            {vastValidation.ad_title && (
              <div>
                <span className="text-[#64748B]">Ad Title:</span>
                <p className="text-[#F8FAFC]">{vastValidation.ad_title}</p>
              </div>
            )}
            {vastValidation.duration && (
              <div>
                <span className="text-[#64748B]">Duration:</span>
                <p className="text-[#F8FAFC]">{vastValidation.duration}</p>
              </div>
            )}
            {vastValidation.media_files?.length > 0 && (
              <div>
                <span className="text-[#64748B]">Media Files:</span>
                <p className="text-[#F8FAFC]">{vastValidation.media_files.length} file(s)</p>
              </div>
            )}
            {vastValidation.click_through && (
              <div className="col-span-3">
                <span className="text-[#64748B]">Click URL:</span>
                <p className="text-[#3B82F6] truncate">{vastValidation.click_through}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Media Files Details */}
        {vastValidation.media_files?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#2D3B55]">
            <p className="text-xs font-medium text-[#94A3B8] mb-2">Media Files:</p>
            <div className="space-y-2">
              {vastValidation.media_files.slice(0, 3).map((mf, i) => (
                <div key={i} className="text-xs p-2 bg-[#0A0F1C] rounded">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-[#2D3B55] text-[#94A3B8]">{mf.type}</Badge>
                    {mf.width && mf.height && (
                      <span className="text-[#64748B]">{mf.width}x{mf.height}</span>
                    )}
                    {mf.bitrate && (
                      <span className="text-[#64748B]">{mf.bitrate}kbps</span>
                    )}
                  </div>
                  {mf.url && (
                    <p className="text-[#3B82F6] truncate mt-1">{mf.url}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
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
                  placeholder="example.com, brand.com"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">IAB Categories</Label>
                <Input
                  value={form.cat}
                  onChange={(e) => updateField('cat', e.target.value)}
                  placeholder="IAB1, IAB2-1"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Preview Image URL</Label>
              <Input
                value={form.iurl}
                onChange={(e) => updateField('iurl', e.target.value)}
                placeholder="https://example.com/preview.jpg"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
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
                  <Label className="text-[#94A3B8]">Width (px)</Label>
                  <Input
                    type="number"
                    value={form.banner_width}
                    onChange={(e) => updateField('banner_width', e.target.value)}
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Height (px)</Label>
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
                <Label className="text-[#94A3B8]">Ad Markup (HTML) *</Label>
                <Textarea
                  value={form.banner_markup}
                  onChange={(e) => updateField('banner_markup', e.target.value)}
                  placeholder='<a href="${CLICK_URL}"><img src="..." /></a>'
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
                  <Label className="text-[#94A3B8]">Duration (sec)</Label>
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

              {/* Video Source Tabs */}
              <div className="pt-4">
                <Label className="text-[#94A3B8] mb-3 block">Video Source *</Label>
                <Tabs value={videoSource} onValueChange={setVideoSource}>
                  <TabsList className="surface-secondary border-[#2D3B55] mb-4">
                    <TabsTrigger value="vast_url" className="data-[state=active]:bg-[#3B82F6]">
                      <Link className="w-4 h-4 mr-2" />
                      VAST URL
                    </TabsTrigger>
                    <TabsTrigger value="vast_xml" className="data-[state=active]:bg-[#3B82F6]">
                      <Code className="w-4 h-4 mr-2" />
                      VAST XML
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="data-[state=active]:bg-[#3B82F6]">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Video
                    </TabsTrigger>
                  </TabsList>

                  {/* VAST URL Tab */}
                  <TabsContent value="vast_url">
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={form.video_vast_url}
                          onChange={(e) => updateField('video_vast_url', e.target.value)}
                          placeholder="https://example.com/vast.xml"
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono flex-1"
                          data-testid="vast-url-input"
                        />
                        <Button
                          type="button"
                          onClick={handleValidateVast}
                          disabled={validating || !form.video_vast_url}
                          className="bg-[#3B82F6] hover:bg-[#2563EB]"
                        >
                          {validating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Validate
                            </>
                          )}
                        </Button>
                      </div>
                      {renderVastValidationResult()}
                    </div>
                  </TabsContent>

                  {/* VAST XML Tab */}
                  <TabsContent value="vast_xml">
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleValidateVast}
                          disabled={validating || !form.video_vast_xml}
                          className="bg-[#3B82F6] hover:bg-[#2563EB]"
                        >
                          {validating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Validate VAST
                            </>
                          )}
                        </Button>
                      </div>
                      <Textarea
                        value={form.video_vast_xml}
                        onChange={(e) => updateField('video_vast_xml', e.target.value)}
                        placeholder='<?xml version="1.0"?><VAST version="3.0">...</VAST>'
                        className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono h-48"
                        data-testid="vast-xml-input"
                      />
                      {renderVastValidationResult()}
                    </div>
                  </TabsContent>

                  {/* Upload Tab */}
                  <TabsContent value="upload">
                    <div className="space-y-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/ogg"
                        className="hidden"
                        onChange={(e) => handleVideoUpload(e.target.files?.[0])}
                      />
                      
                      {!uploadedVideoUrl ? (
                        <div 
                          onClick={() => !uploading && fileInputRef.current?.click()}
                          className={`border-2 border-dashed border-[#2D3B55] rounded-lg p-8 text-center 
                            ${uploading ? 'opacity-50' : 'hover:border-[#3B82F6] cursor-pointer'} transition-colors`}
                        >
                          {uploading ? (
                            <div className="space-y-3">
                              <Loader2 className="w-10 h-10 mx-auto text-[#3B82F6] animate-spin" />
                              <p className="text-sm text-[#F8FAFC]">Uploading video...</p>
                              <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                              <p className="text-xs text-[#64748B]">{uploadProgress}% complete</p>
                            </div>
                          ) : (
                            <>
                              <FileVideo className="w-12 h-12 mx-auto text-[#64748B] mb-3" />
                              <p className="text-sm text-[#F8FAFC] mb-1">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-xs text-[#64748B]">
                                MP4, WebM, or OGG up to 100MB
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-4 surface-secondary rounded-lg">
                            <CheckCircle className="w-8 h-8 text-[#10B981]" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[#F8FAFC]">Video uploaded</p>
                              <p className="text-xs text-[#3B82F6] truncate">{uploadedVideoUrl}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUploadedVideoUrl("");
                                updateField("video_url", "");
                              }}
                              className="text-[#64748B] hover:text-[#F8FAFC]"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Replace
                            </Button>
                          </div>
                          
                          {/* Video Preview */}
                          <div className="rounded-lg overflow-hidden bg-black aspect-video max-w-md">
                            <video 
                              src={uploadedVideoUrl} 
                              controls 
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
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
                  placeholder="Ad description text"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Icon URL</Label>
                  <Input
                    value={form.native_icon_url}
                    onChange={(e) => updateField('native_icon_url', e.target.value)}
                    placeholder="https://example.com/icon.png"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Main Image URL</Label>
                  <Input
                    value={form.native_image_url}
                    onChange={(e) => updateField('native_image_url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Click URL *</Label>
                <Input
                  value={form.native_click_url}
                  onChange={(e) => updateField('native_click_url', e.target.value)}
                  placeholder="https://example.com/landing"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  data-testid="native-click-url-input"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/creatives")}
            className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white"
            data-testid="save-creative-btn"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Creative
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
