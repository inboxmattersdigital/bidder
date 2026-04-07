import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, Save, Upload, CheckCircle, XCircle, AlertCircle, 
  Play, FileVideo, Link, Code, Loader2, RefreshCw, Music
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

// Audio formats for reference
const AUDIO_FORMATS = {
  audio_15: { label: "15s Audio", duration: 15 },
  audio_30: { label: "30s Audio", duration: 30 },
  audio_60: { label: "60s Audio", duration: 60 },
};

export default function CreativeForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const audioFileInputRef = useRef(null);
  const nativeImageInputRef = useRef(null);
  const nativeIconInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  
  // Initialize type from URL param or default to "banner"
  const initialType = searchParams.get("type") || "banner";
  const [type, setType] = useState(initialType);
  const [videoSource, setVideoSource] = useState("vast_url");
  const [audioSource, setAudioSource] = useState("audio_vast_url");
  
  // Video upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState("");
  
  // Audio upload state
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploadProgress, setAudioUploadProgress] = useState(0);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState("");
  
  // Native image upload state
  const [nativeImageUploading, setNativeImageUploading] = useState(false);
  const [nativeIconUploading, setNativeIconUploading] = useState(false);
  
  // VAST validation state
  const [validating, setValidating] = useState(false);
  const [vastValidation, setVastValidation] = useState(null);
  const [audioVastValidation, setAudioVastValidation] = useState(null);
  
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
    native_click_url: "",
    native_sponsored_by: "",
    native_rating: "",
    native_price: "",
    // Audio fields
    audio_duration: 30,
    audio_mimes: "audio/mpeg, audio/mp3, audio/ogg",
    audio_url: "",
    audio_vast_url: "",
    audio_vast_xml: "",
    audio_companion_banner_url: "",
    audio_companion_width: 300,
    audio_companion_height: 250
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
    } finally {
      setUploading(false);
    }
  };

  // Audio upload handler
  const handleAudioUpload = async (file) => {
    if (!file) return;
    
    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/aac"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid audio format. Allowed: MP3, OGG, WAV, AAC");
      return;
    }
    
    setAudioUploading(true);
    setAudioUploadProgress(0);
    
    try {
      // Use same upload endpoint, backend handles audio files too
      const response = await uploadVideo(file);
      setUploadedAudioUrl(response.data.url);
      updateField("audio_url", response.data.url);
      toast.success("Audio uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload audio");
    } finally {
      setAudioUploading(false);
    }
  };

  // Native image upload handler
  const handleNativeImageUpload = async (file, fieldName) => {
    if (!file) return;
    
    const isIcon = fieldName === "native_icon_url";
    isIcon ? setNativeIconUploading(true) : setNativeImageUploading(true);
    
    try {
      const response = await uploadVideo(file); // Reuse upload endpoint
      updateField(fieldName, response.data.url);
      toast.success(`${isIcon ? 'Icon' : 'Image'} uploaded successfully`);
    } catch (error) {
      toast.error(`Failed to upload ${isIcon ? 'icon' : 'image'}`);
    } finally {
      isIcon ? setNativeIconUploading(false) : setNativeImageUploading(false);
    }
  };

  // Audio VAST validation handler
  const handleValidateAudioVast = async () => {
    const vastUrl = form.audio_vast_url;
    const vastXml = form.audio_vast_xml;
    
    if (!vastUrl && !vastXml) {
      toast.error("Enter an Audio VAST URL or XML to validate");
      return;
    }
    
    setValidating(true);
    setAudioVastValidation(null);
    
    try {
      const response = await validateVast(vastUrl || null, vastXml || null);
      setAudioVastValidation(response.data);
      
      if (response.data.valid) {
        toast.success("Audio VAST tag is valid");
        if (response.data.duration) {
          const durationMatch = response.data.duration.match(/(\d+):(\d+):(\d+)/);
          if (durationMatch) {
            const seconds = parseInt(durationMatch[1]) * 3600 + 
                          parseInt(durationMatch[2]) * 60 + 
                          parseInt(durationMatch[3]);
            updateField("audio_duration", seconds);
          }
        }
      } else {
        toast.error("Audio VAST validation failed");
      }
    } catch (error) {
      toast.error("Failed to validate Audio VAST");
      setAudioVastValidation({ valid: false, errors: ["Validation request failed"] });
    } finally {
      setValidating(false);
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
        click_url: form.native_click_url,
        sponsored_by: form.native_sponsored_by || null,
        rating: form.native_rating ? parseFloat(form.native_rating) : null,
        price: form.native_price || null
      };
    } else if (type === "audio") {
      if (!form.audio_vast_xml && !form.audio_vast_url && !form.audio_url) {
        toast.error("Audio VAST XML, VAST URL, or uploaded audio file is required");
        return;
      }
      payload.audio_data = {
        duration: parseInt(form.audio_duration),
        mimes: parseList(form.audio_mimes),
        audio_url: form.audio_url || null,
        vast_url: form.audio_vast_url || null,
        vast_xml: form.audio_vast_xml || null,
        companion_banner_url: form.audio_companion_banner_url || null,
        companion_width: form.audio_companion_banner_url ? parseInt(form.audio_companion_width) : null,
        companion_height: form.audio_companion_banner_url ? parseInt(form.audio_companion_height) : null
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

  const renderVastValidationResult = (validation = vastValidation) => {
    if (!validation) return null;
    
    return (
      <div className={`mt-4 p-4 rounded-lg border ${
        validation.valid 
          ? 'bg-[#10B981]/10 border-[#10B981]/30' 
          : 'bg-[#EF4444]/10 border-[#EF4444]/30'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          {validation.valid ? (
            <CheckCircle className="w-5 h-5 text-[#10B981]" />
          ) : (
            <XCircle className="w-5 h-5 text-[#EF4444]" />
          )}
          <span className={`font-medium ${validation.valid ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {validation.valid ? 'VAST Valid' : 'VAST Invalid'}
          </span>
          {validation.vast_version && (
            <Badge className="bg-[#3B82F6]/20 text-[#3B82F6]">
              VAST {validation.vast_version}
            </Badge>
          )}
          {validation.is_wrapper && (
            <Badge className="bg-[#F59E0B]/20 text-[#F59E0B]">Wrapper</Badge>
          )}
        </div>
        
        {/* Errors */}
        {validation.errors?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-[#EF4444] mb-1">Errors:</p>
            <ul className="text-xs text-[#EF4444] list-disc list-inside space-y-0.5">
              {validation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Warnings */}
        {validation.warnings?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-[#F59E0B] mb-1">Warnings:</p>
            <ul className="text-xs text-[#F59E0B] list-disc list-inside space-y-0.5">
              {validation.warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Details */}
        {validation.valid && (
          <div className="grid grid-cols-3 gap-4 text-xs">
            {validation.ad_title && (
              <div>
                <span className="text-slate-500">Ad Title:</span>
                <p className="text-slate-900">{validation.ad_title}</p>
              </div>
            )}
            {validation.duration && (
              <div>
                <span className="text-slate-500">Duration:</span>
                <p className="text-slate-900">{validation.duration}</p>
              </div>
            )}
            {validation.media_files?.length > 0 && (
              <div>
                <span className="text-slate-500">Media Files:</span>
                <p className="text-slate-900">{validation.media_files.length} file(s)</p>
              </div>
            )}
            {validation.click_through && (
              <div className="col-span-3">
                <span className="text-slate-500">Click URL:</span>
                <p className="text-[#3B82F6] truncate">{validation.click_through}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Media Files Details */}
        {validation.media_files?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-2">Media Files:</p>
            <div className="space-y-2">
              {validation.media_files.slice(0, 3).map((mf, i) => (
                <div key={i} className="text-xs p-2 bg-slate-50 rounded">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-slate-200 text-slate-600">{mf.type}</Badge>
                    {mf.width && mf.height && (
                      <span className="text-slate-500">{mf.width}x{mf.height}</span>
                    )}
                    {mf.bitrate && (
                      <span className="text-slate-500">{mf.bitrate}kbps</span>
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
          className="text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Creative</h1>
          <p className="text-sm text-slate-600 mt-1">Add a new banner, video, or native creative</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="surface-primary border-panel">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">Creative Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="My Creative"
                  className="surface-secondary border-slate-200 text-slate-900 input-glow"
                  data-testid="creative-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Creative Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="surface-secondary border-slate-200 text-slate-900" data-testid="creative-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="surface-primary border-panel">
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="native">Native</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">Advertiser Domains</Label>
                <Input
                  value={form.adomain}
                  onChange={(e) => updateField('adomain', e.target.value)}
                  placeholder="example.com, brand.com"
                  className="surface-secondary border-slate-200 text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">IAB Categories</Label>
                <Input
                  value={form.cat}
                  onChange={(e) => updateField('cat', e.target.value)}
                  placeholder="IAB1, IAB2-1"
                  className="surface-secondary border-slate-200 text-slate-900"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-600">Preview Image URL</Label>
              <Input
                value={form.iurl}
                onChange={(e) => updateField('iurl', e.target.value)}
                placeholder="https://example.com/preview.jpg"
                className="surface-secondary border-slate-200 text-slate-900"
              />
            </div>
          </CardContent>
        </Card>

        {/* Banner Fields */}
        {type === "banner" && (
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Banner Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600">Width (px)</Label>
                  <Input
                    type="number"
                    value={form.banner_width}
                    onChange={(e) => updateField('banner_width', e.target.value)}
                    className="surface-secondary border-slate-200 text-slate-900 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">Height (px)</Label>
                  <Input
                    type="number"
                    value={form.banner_height}
                    onChange={(e) => updateField('banner_height', e.target.value)}
                    className="surface-secondary border-slate-200 text-slate-900 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">MIME Types</Label>
                  <Input
                    value={form.banner_mimes}
                    onChange={(e) => updateField('banner_mimes', e.target.value)}
                    className="surface-secondary border-slate-200 text-slate-900 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Ad Markup (HTML) *</Label>
                <Textarea
                  value={form.banner_markup}
                  onChange={(e) => updateField('banner_markup', e.target.value)}
                  placeholder='<a href="${CLICK_URL}"><img src="..." /></a>'
                  className="surface-secondary border-slate-200 text-slate-900 font-mono h-32"
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
              <CardTitle className="text-lg text-slate-900">Video Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600">Duration (sec)</Label>
                  <Input
                    type="number"
                    value={form.video_duration}
                    onChange={(e) => updateField('video_duration', e.target.value)}
                    className="surface-secondary border-slate-200 text-slate-900 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">Width (px)</Label>
                  <Input
                    type="number"
                    value={form.video_width}
                    onChange={(e) => updateField('video_width', e.target.value)}
                    className="surface-secondary border-slate-200 text-slate-900 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">Height (px)</Label>
                  <Input
                    type="number"
                    value={form.video_height}
                    onChange={(e) => updateField('video_height', e.target.value)}
                    className="surface-secondary border-slate-200 text-slate-900 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">Protocols</Label>
                  <Input
                    value={form.video_protocols}
                    onChange={(e) => updateField('video_protocols', e.target.value)}
                    placeholder="2, 3, 5, 6"
                    className="surface-secondary border-slate-200 text-slate-900 font-mono"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-600">MIME Types</Label>
                <Input
                  value={form.video_mimes}
                  onChange={(e) => updateField('video_mimes', e.target.value)}
                  className="surface-secondary border-slate-200 text-slate-900 font-mono"
                />
              </div>

              {/* Video Source Tabs */}
              <div className="pt-4">
                <Label className="text-slate-600 mb-3 block">Video Source *</Label>
                <Tabs value={videoSource} onValueChange={setVideoSource}>
                  <TabsList className="surface-secondary border-slate-200 mb-4">
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
                          className="surface-secondary border-slate-200 text-slate-900 font-mono flex-1"
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
                        className="surface-secondary border-slate-200 text-slate-900 font-mono h-48"
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
                          className={`border-2 border-dashed border-slate-200 rounded-lg p-8 text-center 
                            ${uploading ? 'opacity-50' : 'hover:border-[#3B82F6] cursor-pointer'} transition-colors`}
                        >
                          {uploading ? (
                            <div className="space-y-3">
                              <Loader2 className="w-10 h-10 mx-auto text-[#3B82F6] animate-spin" />
                              <p className="text-sm text-slate-900">Uploading video...</p>
                              <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                              <p className="text-xs text-slate-500">{uploadProgress}% complete</p>
                            </div>
                          ) : (
                            <>
                              <FileVideo className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                              <p className="text-sm text-slate-900 mb-1">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-xs text-slate-500">
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
                              <p className="text-sm font-medium text-slate-900">Video uploaded</p>
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
                              className="text-slate-500 hover:text-slate-900"
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
              <CardTitle className="text-lg text-slate-900">Native Ad Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600">Title *</Label>
                  <Input
                    value={form.native_title}
                    onChange={(e) => updateField('native_title', e.target.value)}
                    placeholder="Ad Title"
                    className="surface-secondary border-slate-200 text-slate-900"
                    data-testid="native-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">CTA Text</Label>
                  <Input
                    value={form.native_cta_text}
                    onChange={(e) => updateField('native_cta_text', e.target.value)}
                    placeholder="Learn More"
                    className="surface-secondary border-slate-200 text-slate-900"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Description</Label>
                <Textarea
                  value={form.native_description}
                  onChange={(e) => updateField('native_description', e.target.value)}
                  placeholder="Ad description text"
                  className="surface-secondary border-slate-200 text-slate-900 h-20"
                />
              </div>
              
              {/* Native Image Assets */}
              <div className="grid grid-cols-2 gap-4">
                {/* Icon Upload */}
                <div className="space-y-2">
                  <Label className="text-slate-600">Icon (80x80 recommended)</Label>
                  <input
                    ref={nativeIconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleNativeImageUpload(e.target.files?.[0], 'native_icon_url')}
                  />
                  {form.native_icon_url ? (
                    <div className="flex items-center gap-3 p-3 surface-secondary rounded-lg">
                      <img src={form.native_icon_url} alt="Icon" className="w-12 h-12 rounded object-cover" />
                      <div className="flex-1">
                        <p className="text-xs text-[#10B981]">Icon uploaded</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => updateField('native_icon_url', '')}
                        className="text-slate-500"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={form.native_icon_url}
                        onChange={(e) => updateField('native_icon_url', e.target.value)}
                        placeholder="https://example.com/icon.png"
                        className="surface-secondary border-slate-200 text-slate-900 flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => nativeIconInputRef.current?.click()}
                        disabled={nativeIconUploading}
                        className="bg-[#3B82F6]"
                      >
                        {nativeIconUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Main Image Upload */}
                <div className="space-y-2">
                  <Label className="text-slate-600">Main Image (1200x627 recommended)</Label>
                  <input
                    ref={nativeImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleNativeImageUpload(e.target.files?.[0], 'native_image_url')}
                  />
                  {form.native_image_url ? (
                    <div className="flex items-center gap-3 p-3 surface-secondary rounded-lg">
                      <img src={form.native_image_url} alt="Main" className="w-16 h-10 rounded object-cover" />
                      <div className="flex-1">
                        <p className="text-xs text-[#10B981]">Image uploaded</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => updateField('native_image_url', '')}
                        className="text-slate-500"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={form.native_image_url}
                        onChange={(e) => updateField('native_image_url', e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="surface-secondary border-slate-200 text-slate-900 flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => nativeImageInputRef.current?.click()}
                        disabled={nativeImageUploading}
                        className="bg-[#3B82F6]"
                      >
                        {nativeImageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Additional Native Fields */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600">Sponsored By</Label>
                  <Input
                    value={form.native_sponsored_by}
                    onChange={(e) => updateField('native_sponsored_by', e.target.value)}
                    placeholder="Brand Name"
                    className="surface-secondary border-slate-200 text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">Rating (1-5)</Label>
                  <Input
                    type="number"
                    value={form.native_rating}
                    onChange={(e) => updateField('native_rating', e.target.value)}
                    placeholder="4.5"
                    min="1"
                    max="5"
                    step="0.1"
                    className="surface-secondary border-slate-200 text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">Price</Label>
                  <Input
                    value={form.native_price}
                    onChange={(e) => updateField('native_price', e.target.value)}
                    placeholder="$9.99"
                    className="surface-secondary border-slate-200 text-slate-900"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-600">Click URL *</Label>
                <Input
                  value={form.native_click_url}
                  onChange={(e) => updateField('native_click_url', e.target.value)}
                  placeholder="https://example.com/landing"
                  className="surface-secondary border-slate-200 text-slate-900"
                  data-testid="native-click-url-input"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audio Fields */}
        {type === "audio" && (
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Audio Ad Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600">Duration (sec)</Label>
                  <Select 
                    value={form.audio_duration.toString()} 
                    onValueChange={(v) => updateField('audio_duration', parseInt(v))}
                  >
                    <SelectTrigger className="surface-secondary border-slate-200 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="surface-primary border-panel">
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">60 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">MIME Types</Label>
                  <Input
                    value={form.audio_mimes}
                    onChange={(e) => updateField('audio_mimes', e.target.value)}
                    className="surface-secondary border-slate-200 text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Audio Source Tabs */}
              <div className="pt-4">
                <Label className="text-slate-600 mb-3 block">Audio Source *</Label>
                <Tabs value={audioSource} onValueChange={setAudioSource}>
                  <TabsList className="surface-secondary border-slate-200 mb-4">
                    <TabsTrigger value="audio_vast_url" className="data-[state=active]:bg-[#8B5CF6]">
                      <Link className="w-4 h-4 mr-2" />
                      Audio VAST URL
                    </TabsTrigger>
                    <TabsTrigger value="audio_vast_xml" className="data-[state=active]:bg-[#8B5CF6]">
                      <Code className="w-4 h-4 mr-2" />
                      Audio VAST XML
                    </TabsTrigger>
                    <TabsTrigger value="audio_upload" className="data-[state=active]:bg-[#8B5CF6]">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Audio
                    </TabsTrigger>
                  </TabsList>

                  {/* Audio VAST URL Tab */}
                  <TabsContent value="audio_vast_url">
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={form.audio_vast_url}
                          onChange={(e) => updateField('audio_vast_url', e.target.value)}
                          placeholder="https://example.com/audio-vast.xml"
                          className="surface-secondary border-slate-200 text-slate-900 font-mono flex-1"
                          data-testid="audio-vast-url-input"
                        />
                        <Button
                          type="button"
                          onClick={handleValidateAudioVast}
                          disabled={validating || !form.audio_vast_url}
                          className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
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
                      {renderVastValidationResult(audioVastValidation)}
                    </div>
                  </TabsContent>

                  {/* Audio VAST XML Tab */}
                  <TabsContent value="audio_vast_xml">
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleValidateAudioVast}
                          disabled={validating || !form.audio_vast_xml}
                          className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
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
                        value={form.audio_vast_xml}
                        onChange={(e) => updateField('audio_vast_xml', e.target.value)}
                        placeholder='<?xml version="1.0"?><VAST version="3.0">...</VAST>'
                        className="surface-secondary border-slate-200 text-slate-900 font-mono h-48"
                        data-testid="audio-vast-xml-input"
                      />
                      {renderVastValidationResult(audioVastValidation)}
                    </div>
                  </TabsContent>

                  {/* Audio Upload Tab */}
                  <TabsContent value="audio_upload">
                    <div className="space-y-4">
                      <input
                        ref={audioFileInputRef}
                        type="file"
                        accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/aac"
                        className="hidden"
                        onChange={(e) => handleAudioUpload(e.target.files?.[0])}
                      />
                      
                      {!uploadedAudioUrl ? (
                        <div 
                          onClick={() => !audioUploading && audioFileInputRef.current?.click()}
                          className={`border-2 border-dashed border-slate-200 rounded-lg p-8 text-center 
                            ${audioUploading ? 'opacity-50' : 'hover:border-[#8B5CF6] cursor-pointer'} transition-colors`}
                        >
                          {audioUploading ? (
                            <div className="space-y-3">
                              <Loader2 className="w-10 h-10 mx-auto text-[#8B5CF6] animate-spin" />
                              <p className="text-sm text-slate-900">Uploading audio...</p>
                              <Progress value={audioUploadProgress} className="max-w-xs mx-auto" />
                            </div>
                          ) : (
                            <>
                              <Music className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                              <p className="text-sm text-slate-900 mb-1">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-xs text-slate-500">
                                MP3, OGG, WAV, or AAC up to 50MB
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-4 surface-secondary rounded-lg">
                            <CheckCircle className="w-8 h-8 text-[#10B981]" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">Audio uploaded</p>
                              <p className="text-xs text-[#8B5CF6] truncate">{uploadedAudioUrl}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUploadedAudioUrl("");
                                updateField("audio_url", "");
                              }}
                              className="text-slate-500 hover:text-slate-900"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Replace
                            </Button>
                          </div>
                          
                          {/* Audio Preview */}
                          <div className="p-4 surface-secondary rounded-lg">
                            <audio 
                              src={uploadedAudioUrl} 
                              controls 
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Companion Banner (Optional) */}
              <div className="pt-4 border-t border-slate-200">
                <Label className="text-slate-600 mb-3 block">Companion Banner (Optional)</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label className="text-slate-500 text-xs">Width (px)</Label>
                    <Input
                      type="number"
                      value={form.audio_companion_width}
                      onChange={(e) => updateField('audio_companion_width', e.target.value)}
                      className="surface-secondary border-slate-200 text-slate-900 font-mono"
                    />
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label className="text-slate-500 text-xs">Height (px)</Label>
                    <Input
                      type="number"
                      value={form.audio_companion_height}
                      onChange={(e) => updateField('audio_companion_height', e.target.value)}
                      className="surface-secondary border-slate-200 text-slate-900 font-mono"
                    />
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label className="text-slate-500 text-xs">Banner URL</Label>
                    <Input
                      value={form.audio_companion_banner_url}
                      onChange={(e) => updateField('audio_companion_banner_url', e.target.value)}
                      placeholder="https://..."
                      className="surface-secondary border-slate-200 text-slate-900"
                    />
                  </div>
                </div>
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
            className="border-slate-200 text-slate-600 hover:text-slate-900"
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
