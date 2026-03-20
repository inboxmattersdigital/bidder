import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, Save, Upload, Image, Video, 
  Eye, Palette, Maximize2, Check, RefreshCw, Play, Film, Music,
  Code, MonitorPlay, Plus, Trash2, ToggleLeft, ToggleRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from "sonner";
import { createCreative, updateCreative, getCreatives, uploadImage, uploadVideo, uploadAudio } from "../lib/api";

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

// VAST versions
const VAST_VERSIONS = [
  { value: "2.0", label: "VAST 2.0" },
  { value: "3.0", label: "VAST 3.0" },
  { value: "4.0", label: "VAST 4.0" },
  { value: "4.1", label: "VAST 4.1" },
  { value: "4.2", label: "VAST 4.2 (Latest)" },
];

// Creative templates
const TEMPLATES = [
  { id: "simple-image", name: "Simple Image Ad", description: "Single image with click-through", type: "banner" },
  { id: "cta-banner", name: "CTA Banner", description: "Image with call-to-action button", type: "banner" },
  { id: "native-article", name: "Native Article", description: "Native ad format for content feeds", type: "native" },
  { id: "video-preroll", name: "Video Pre-Roll", description: "Standard video ad format", type: "video" },
];

export default function CreativeEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const companionInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [creativeType, setCreativeType] = useState("banner");
  const [selectedSize, setSelectedSize] = useState(BANNER_SIZES[0]);
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [customWidth, setCustomWidth] = useState(300);
  const [customHeight, setCustomHeight] = useState(250);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [uploadedAudio, setUploadedAudio] = useState(null);
  
  // Video source type: 'vast' or 'upload'
  const [videoSourceType, setVideoSourceType] = useState("vast");
  // Audio source type: 'vast' or 'upload'
  const [audioSourceType, setAudioSourceType] = useState("vast");
  
  // Impression Pixels
  const [impressionPixels, setImpressionPixels] = useState([]);
  
  const [form, setForm] = useState({
    name: "",
    clickUrl: "",
    cat: "",
    adomain: "", // Advertiser domains (comma-separated)
    // Banner
    imageUrl: "",
    backgroundColor: "#FFFFFF",
    // Native
    nativeTitle: "",
    nativeDescription: "",
    nativeIconUrl: "",
    nativeImageUrl: "",
    nativeCtaText: "Learn More",
    nativeClickUrl: "",
    nativeCtaColor: "#3B82F6",
    // Video
    vastUrl: "",
    vastVersion: "4.2",
    videoDuration: 15,
    videoUrl: "",
    videoWidth: 1920,
    videoHeight: 1080,
    // Audio
    audioVastUrl: "",
    audioVastXml: "",
    audioUrl: "",
    audioDuration: 30,
    audioMimes: "audio/mpeg, audio/mp3, audio/ogg",
    companionBannerUrl: "",
    companionWidth: 300,
    companionHeight: 250,
    // JS Tag
    jsTagContent: "",
    jsTagUrl: "",
    jsTagWidth: 300,
    jsTagHeight: 250,
    jsTagVendor: "",
    jsTagType: "script",
    jsTagIsSecure: true,
  });

  // Load creative data for edit mode
  useEffect(() => {
    if (isEdit && id) {
      loadCreative();
    }
  }, [id, isEdit]);

  const loadCreative = async () => {
    setLoading(true);
    try {
      const response = await getCreatives();
      const creative = response.data?.find(c => c.id === id);
      
      if (creative) {
        setCreativeType(creative.type || "banner");
        
        // Extract click URL from ad_markup if present (for banner)
        let extractedClickUrl = "";
        if (creative.banner_data?.ad_markup) {
          const hrefMatch = creative.banner_data.ad_markup.match(/href="([^"]+)"/);
          if (hrefMatch) extractedClickUrl = hrefMatch[1];
        }
        
        setForm(prev => ({
          ...prev,
          name: creative.name || "",
          clickUrl: creative.click_url || extractedClickUrl || "",
          cat: (creative.cat || []).join(", "),
          adomain: (creative.adomain || []).join(", "),
          // Banner
          imageUrl: creative.banner_data?.image_url || creative.iurl || "",
          backgroundColor: "#FFFFFF",
          // Native
          nativeTitle: creative.native_data?.title || "",
          nativeDescription: creative.native_data?.desc || creative.native_data?.description || "",
          nativeIconUrl: creative.native_data?.icon_url || "",
          nativeImageUrl: creative.native_data?.main_image_url || creative.native_data?.image_url || "",
          nativeCtaText: creative.native_data?.cta_text || "Learn More",
          nativeClickUrl: creative.native_data?.click_url || "",
          // Video
          vastUrl: creative.video_data?.vast_url || "",
          vastVersion: creative.video_data?.vast_version || "4.2",
          videoDuration: creative.video_data?.duration || 15,
          videoUrl: creative.video_data?.video_url || "",
          videoWidth: creative.video_data?.width || 1920,
          videoHeight: creative.video_data?.height || 1080,
          // Audio
          audioVastUrl: creative.audio_data?.vast_url || "",
          audioVastXml: creative.audio_data?.vast_xml || "",
          audioUrl: creative.audio_data?.audio_url || "",
          audioDuration: creative.audio_data?.duration || 30,
          audioMimes: creative.audio_data?.mimes?.join(", ") || "audio/mpeg, audio/mp3, audio/ogg",
          companionBannerUrl: creative.audio_data?.companion_banner_url || "",
          companionWidth: creative.audio_data?.companion_width || 300,
          companionHeight: creative.audio_data?.companion_height || 250,
          // JS Tag
          jsTagContent: creative.js_tag_data?.tag_content || creative.js_tag || "",
          jsTagUrl: creative.js_tag_data?.tag_url || "",
          jsTagWidth: creative.js_tag_data?.width || 300,
          jsTagHeight: creative.js_tag_data?.height || 250,
          jsTagVendor: creative.js_tag_data?.vendor || "",
          jsTagType: creative.js_tag_data?.tag_type || "script",
          jsTagIsSecure: creative.js_tag_data?.is_secure !== false,
        }));
        
        // Set banner size
        if (creative.banner_data?.width && creative.banner_data?.height) {
          const w = creative.banner_data.width;
          const h = creative.banner_data.height;
          const standardSize = BANNER_SIZES.find(s => s.w === w && s.h === h);
          if (standardSize) {
            setSelectedSize(standardSize);
          } else {
            setUseCustomSize(true);
            setCustomWidth(w);
            setCustomHeight(h);
          }
        }
        
        // Set video/audio source type
        if (creative.video_data?.video_url) setVideoSourceType("upload");
        if (creative.audio_data?.audio_url) setAudioSourceType("upload");
        
        // Load impression pixels
        if (creative.impression_pixels) setImpressionPixels(creative.impression_pixels);
      }
    } catch (error) {
      toast.error("Failed to load creative");
    } finally {
      setLoading(false);
    }
  };

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

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate video file
    if (!file.type.startsWith('video/')) {
      toast.error("Please select a valid video file");
      return;
    }
    
    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video file too large. Max 100MB allowed.");
      return;
    }
    
    setUploading(true);
    toast.info("Uploading video to server...");
    
    try {
      // Create blob URL for immediate preview and duration detection
      const tempBlobUrl = URL.createObjectURL(file);
      
      // Auto-detect video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration);
        updateField("videoDuration", duration);
        URL.revokeObjectURL(tempBlobUrl);
      };
      video.src = tempBlobUrl;
      
      // Upload to server
      const response = await uploadVideo(file);
      const serverUrl = response.data.url;
      
      setUploadedVideo({
        name: file.name,
        size: file.size,
        type: file.type,
        url: serverUrl
      });
      updateField("videoUrl", serverUrl);
      toast.success(`Video uploaded successfully`);
    } catch (error) {
      console.error("Video upload error:", error);
      toast.error("Failed to upload video: " + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate audio file
    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/aac"];
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('audio/')) {
      toast.error("Please select a valid audio file (MP3, OGG, WAV, AAC)");
      return;
    }
    
    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Audio file too large. Max 50MB allowed.");
      return;
    }
    
    setUploading(true);
    toast.info("Uploading audio to server...");
    
    try {
      // Create blob URL for immediate duration detection
      const tempBlobUrl = URL.createObjectURL(file);
      
      // Auto-detect audio duration
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        const duration = Math.round(audio.duration);
        updateField("audioDuration", duration);
        URL.revokeObjectURL(tempBlobUrl);
      };
      audio.src = tempBlobUrl;
      
      // Upload to server
      const response = await uploadAudio(file);
      const serverUrl = response.data.url;
      
      setUploadedAudio({
        name: file.name,
        size: file.size,
        type: file.type,
        url: serverUrl
      });
      updateField("audioUrl", serverUrl);
      toast.success(`Audio uploaded successfully`);
    } catch (error) {
      console.error("Audio upload error:", error);
      toast.error("Failed to upload audio: " + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  // Handle companion banner upload for audio ads - auto-detect dimensions
  const handleCompanionUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error("Please select a valid image file");
      return;
    }
    
    setUploading(true);
    toast.info("Uploading companion banner...");
    
    try {
      // Create blob URL for immediate dimension detection
      const tempBlobUrl = URL.createObjectURL(file);
      
      // Auto-detect image dimensions
      const img = document.createElement('img');
      img.onload = () => {
        updateField("companionWidth", img.naturalWidth);
        updateField("companionHeight", img.naturalHeight);
        URL.revokeObjectURL(tempBlobUrl);
      };
      img.src = tempBlobUrl;
      
      // Upload to server
      const response = await uploadImage(file);
      const serverUrl = response.data.url;
      
      updateField("companionBannerUrl", serverUrl);
      toast.success(`Companion banner uploaded (${img.naturalWidth || 'auto'}x${img.naturalHeight || 'auto'})`);
    } catch (error) {
      console.error("Companion banner upload error:", error);
      toast.error("Failed to upload companion banner: " + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  // Auto-detect dimensions when companion banner URL changes
  const detectCompanionDimensions = (url) => {
    if (!url) return;
    
    const img = document.createElement('img');
    img.onload = () => {
      updateField("companionWidth", img.naturalWidth);
      updateField("companionHeight", img.naturalHeight);
      toast.success(`Dimensions detected: ${img.naturalWidth}x${img.naturalHeight}`);
    };
    img.onerror = () => {
      // Silent fail for URL detection - user can manually set dimensions
    };
    img.src = url;
  };

  const generateBannerMarkup = () => {
    const { imageUrl, clickUrl, backgroundColor } = form;
    if (!imageUrl) return "";
    
    return `<a href="${clickUrl || '#'}" target="_blank" style="display:block;width:${selectedSize.w}px;height:${selectedSize.h}px;background:${backgroundColor};text-decoration:none;">
  <img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;" />
</a>`;
  };

  // Impression Pixel Management
  const addImpressionPixel = () => {
    const newPixel = {
      id: crypto.randomUUID(),
      name: "",
      url: "",
      event: "impression",
      enabled: true
    };
    setImpressionPixels(prev => [...prev, newPixel]);
  };

  const updateImpressionPixel = (id, field, value) => {
    setImpressionPixels(prev => prev.map(pixel => 
      pixel.id === id ? { ...pixel, [field]: value } : pixel
    ));
  };

  const removeImpressionPixel = (id) => {
    setImpressionPixels(prev => prev.filter(pixel => pixel.id !== id));
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
        iurl: form.imageUrl || form.nativeImageUrl || null,
        cat: form.cat.split(',').map(s => s.trim()).filter(Boolean),
        adomain: form.adomain.split(',').map(s => s.trim()).filter(Boolean),
        click_url: form.clickUrl || null,
        impression_pixels: impressionPixels.filter(pixel => pixel.name && pixel.url)
      };
      
      if (creativeType === "banner") {
        payload.banner_data = {
          width: useCustomSize ? customWidth : selectedSize.w,
          height: useCustomSize ? customHeight : selectedSize.h,
          mimes: ["image/jpeg", "image/png", "image/gif"],
          ad_markup: generateBannerMarkup(),
          image_url: form.imageUrl || null
        };
      } else if (creativeType === "native") {
        payload.native_data = {
          title: form.nativeTitle,
          description: form.nativeDescription,
          desc: form.nativeDescription,
          icon_url: form.nativeIconUrl,
          main_image_url: form.nativeImageUrl,
          image_url: form.nativeImageUrl,
          cta_text: form.nativeCtaText || "Learn More",
          click_url: form.nativeClickUrl || form.clickUrl
        };
      } else if (creativeType === "video") {
        payload.video_data = {
          duration: parseInt(form.videoDuration) || 15,
          width: parseInt(form.videoWidth) || 1920,
          height: parseInt(form.videoHeight) || 1080,
          mimes: ["video/mp4", "video/webm"],
          protocols: [2, 3, 5, 6],
          vast_url: videoSourceType === "vast" ? form.vastUrl : null,
          vast_version: videoSourceType === "vast" ? form.vastVersion : null,
          video_url: videoSourceType === "upload" ? form.videoUrl : null,
          source_type: videoSourceType
        };
      } else if (creativeType === "audio") {
        payload.audio_data = {
          duration: parseInt(form.audioDuration) || 30,
          mimes: form.audioMimes.split(',').map(s => s.trim()).filter(Boolean),
          vast_url: audioSourceType === "vast" ? form.audioVastUrl : null,
          vast_xml: audioSourceType === "vast" && form.audioVastXml ? form.audioVastXml : null,
          audio_url: audioSourceType === "upload" ? form.audioUrl : null,
          companion_banner_url: form.companionBannerUrl || null,
          companion_width: form.companionBannerUrl ? parseInt(form.companionWidth) : null,
          companion_height: form.companionBannerUrl ? parseInt(form.companionHeight) : null
        };
      } else if (creativeType === "js_tag") {
        payload.js_tag_data = {
          tag_content: form.jsTagContent || "",
          tag_url: form.jsTagUrl || null,
          width: parseInt(form.jsTagWidth) || null,
          height: parseInt(form.jsTagHeight) || null,
          vendor: form.jsTagVendor || null,
          tag_type: form.jsTagType || "script",
          is_secure: form.jsTagIsSecure
        };
      }
      
      if (isEdit) {
        await updateCreative(id, payload);
        toast.success("Creative updated successfully");
      } else {
        await createCreative(payload);
        toast.success("Creative created successfully");
      }
      navigate("/creatives");
    } catch (error) {
      toast.error(isEdit ? "Failed to update creative" : "Failed to create creative");
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
            overflow: "hidden"
          }}
          className="border border-[#2D3B55] rounded"
        >
          {form.imageUrl ? (
            <img 
              src={form.imageUrl} 
              alt="Preview" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
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
          <a 
            href={form.nativeClickUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 w-full py-2 rounded text-white text-sm text-center cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: form.nativeCtaColor }}
            onClick={(e) => !form.nativeClickUrl && e.preventDefault()}
          >
            {form.nativeCtaText || "Learn More"}
          </a>
        </div>
      );
    }
    
    if (creativeType === "video") {
      return (
        <div className="w-full max-w-[480px] aspect-video bg-[#000] rounded border border-[#2D3B55] overflow-hidden">
          {videoSourceType === "upload" && form.videoUrl ? (
            <video 
              src={form.videoUrl} 
              controls 
              className="w-full h-full object-contain"
              poster=""
            >
              Your browser does not support the video tag.
            </video>
          ) : videoSourceType === "vast" && form.vastUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
              <Film className="w-16 h-16 text-[#3B82F6] mb-4" />
              <p className="text-[#F8FAFC] font-medium">VAST Tag Preview</p>
              <Badge className="mt-2 bg-[#3B82F6]/20 text-[#3B82F6]">
                VAST {form.vastVersion}
              </Badge>
              <p className="text-xs text-[#64748B] mt-3 break-all max-w-full">
                {form.vastUrl.length > 60 ? form.vastUrl.substring(0, 60) + "..." : form.vastUrl}
              </p>
              <p className="text-xs text-[#94A3B8] mt-2">Duration: {form.videoDuration}s</p>
              <Button
                size="sm"
                className="mt-4 bg-[#10B981] hover:bg-[#10B981]/90"
                onClick={() => window.open(form.vastUrl, '_blank')}
              >
                <Play className="w-3 h-3 mr-1" />
                Test VAST Tag
              </Button>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#64748B]">
              <Video className="w-12 h-12" />
            </div>
          )}
        </div>
      );
    }
    
    if (creativeType === "audio") {
      const previewWidth = parseInt(form.companionWidth) || 300;
      const previewHeight = parseInt(form.companionHeight) || 250;
      
      return (
        <div className="w-full max-w-[400px] space-y-4">
          {/* Companion Banner Preview - Shown First */}
          {form.companionBannerUrl && (
            <div 
              className="rounded-lg border border-[#2D3B55] overflow-hidden bg-[#0F172A]"
              style={{ 
                width: Math.min(previewWidth, 380), 
                height: Math.min(previewHeight, 300),
                margin: '0 auto'
              }}
            >
              <img 
                src={form.companionBannerUrl} 
                alt="Companion Banner" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain' 
                }}
              />
            </div>
          )}
          
          {/* Audio Player Section - Below Banner */}
          <div className="p-4 bg-gradient-to-br from-[#EC4899]/10 to-[#8B5CF6]/10 rounded-lg border border-[#2D3B55]">
            {audioSourceType === "upload" && form.audioUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#EC4899]/20 flex items-center justify-center shrink-0">
                    <Music className="w-6 h-6 text-[#EC4899]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#F8FAFC] font-medium">Audio Preview</p>
                    <p className="text-xs text-[#94A3B8]">Duration: {form.audioDuration}s</p>
                  </div>
                </div>
                <audio src={form.audioUrl} controls className="w-full" />
              </div>
            ) : audioSourceType === "vast" && (form.audioVastUrl || form.audioVastXml) ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#EC4899]/20 flex items-center justify-center shrink-0">
                    <Music className="w-6 h-6 text-[#EC4899]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#F8FAFC] font-medium">Audio VAST Tag</p>
                    <Badge className="mt-1 bg-[#EC4899]/20 text-[#EC4899]">
                      {form.audioDuration}s Audio
                    </Badge>
                  </div>
                </div>
                {form.audioVastUrl && (
                  <>
                    <p className="text-xs text-[#64748B] break-all">
                      {form.audioVastUrl.length > 50 ? form.audioVastUrl.substring(0, 50) + "..." : form.audioVastUrl}
                    </p>
                    <Button
                      size="sm"
                      className="w-full bg-[#EC4899] hover:bg-[#EC4899]/90"
                      onClick={() => window.open(form.audioVastUrl, '_blank')}
                    >
                      Test VAST Tag
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-[#64748B]">
                <Music className="w-10 h-10 mb-2" />
                <p className="text-sm">Configure audio settings</p>
              </div>
            )}
          </div>
          
          {/* Size info display */}
          {form.companionBannerUrl && (
            <p className="text-xs text-center text-[#64748B]">
              Banner: {previewWidth}x{previewHeight}px
            </p>
          )}
        </div>
      );
    }
    
    if (creativeType === "js_tag") {
      // Generate HTML for live preview iframe
      const livePreviewHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { 
              width: 100%; 
              height: 100%; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              background: #f5f5f5;
              overflow: hidden;
            }
            .ad-container {
              width: ${form.jsTagWidth || 300}px;
              height: ${form.jsTagHeight || 250}px;
              position: relative;
              background: #fff;
              border: 1px solid #ddd;
              overflow: hidden;
            }
          </style>
        </head>
        <body>
          <div class="ad-container">
            ${form.jsTagContent || ''}
          </div>
        </body>
        </html>
      `;
      
      return (
        <div className="w-full max-w-[450px] space-y-4">
          {/* Header Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 flex items-center justify-center shrink-0">
                <Code className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-sm text-[#F8FAFC] font-medium">Third Party JS Tag</p>
                <div className="flex items-center gap-2 mt-1">
                  {form.jsTagVendor && (
                    <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] text-xs">
                      {form.jsTagVendor}
                    </Badge>
                  )}
                  <Badge className="bg-[#64748B]/20 text-[#94A3B8] text-xs">
                    {form.jsTagType}
                  </Badge>
                  {form.jsTagIsSecure && (
                    <Badge className="bg-[#10B981]/20 text-[#10B981] text-xs">
                      HTTPS
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Badge className="bg-[#3B82F6]/20 text-[#3B82F6]">
              {form.jsTagWidth || 300}x{form.jsTagHeight || 250}
            </Badge>
          </div>

          {/* Live Preview Area */}
          {form.jsTagContent ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#64748B]">Live Ad Preview</p>
                <Badge className="bg-[#10B981]/20 text-[#10B981] text-xs animate-pulse">LIVE</Badge>
              </div>
              <div 
                className="rounded-lg border-2 border-dashed border-[#3B82F6]/30 bg-[#0A0F1C] p-4 flex items-center justify-center"
                style={{ minHeight: Math.min((form.jsTagHeight || 250) + 40, 350) }}
              >
                <div className="bg-white rounded shadow-lg overflow-hidden">
                  <iframe
                    srcDoc={livePreviewHtml}
                    title="JS Tag Live Preview"
                    style={{ 
                      width: Math.min(form.jsTagWidth || 300, 380), 
                      height: Math.min(form.jsTagHeight || 250, 280),
                      border: 'none',
                      display: 'block'
                    }}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#475569] text-center">
                Note: Some third-party tags may not render in preview due to security restrictions
              </p>
              
              {/* Tag Code Preview (Collapsed) */}
              <details className="mt-2">
                <summary className="text-xs text-[#64748B] cursor-pointer hover:text-[#94A3B8]">
                  View Tag Code
                </summary>
                <div className="mt-2 p-3 bg-[#0F172A] rounded border border-[#2D3B55] overflow-hidden">
                  <pre className="text-xs text-[#94A3B8] whitespace-pre-wrap break-all max-h-32 overflow-y-auto font-mono">
                    {form.jsTagContent.length > 300 ? form.jsTagContent.substring(0, 300) + "..." : form.jsTagContent}
                  </pre>
                </div>
              </details>
            </div>
          ) : form.jsTagUrl ? (
            <div className="p-6 bg-gradient-to-br from-[#F59E0B]/10 to-[#EF4444]/10 rounded-lg border border-[#2D3B55]">
              <p className="text-xs text-[#64748B] mb-2">Tag URL:</p>
              <p className="text-xs text-[#3B82F6] break-all mb-3">{form.jsTagUrl}</p>
              <Button
                size="sm"
                className="w-full bg-[#F59E0B] hover:bg-[#F59E0B]/90"
                onClick={() => window.open(form.jsTagUrl, '_blank')}
              >
                Open Tag URL
              </Button>
            </div>
          ) : (
            <div className="p-8 bg-gradient-to-br from-[#F59E0B]/5 to-[#EF4444]/5 rounded-lg border border-dashed border-[#2D3B55] text-center">
              <Code className="w-12 h-12 text-[#64748B] mx-auto mb-3 opacity-50" />
              <p className="text-sm text-[#64748B]">No tag content configured</p>
              <p className="text-xs text-[#475569] mt-1">Add tag code to see live preview</p>
            </div>
          )}
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
            <h1 className="text-2xl font-bold text-[#F8FAFC]">
              {isEdit ? "Edit Creative" : "Advanced Creative Editor"}
            </h1>
            <p className="text-sm text-[#94A3B8]">
              {isEdit ? "Update your creative settings" : "Create rich ad creatives with templates and uploads"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowPreview(true)}
            className="border-[#2D3B55] text-[#94A3B8] hover:bg-[#1E293B]"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={saving || loading}
            className="bg-[#10B981] hover:bg-[#10B981]/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : isEdit ? "Update Creative" : "Save Creative"}
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
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Creative Type</Label>
                  <Select value={creativeType} onValueChange={setCreativeType}>
                    <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="surface-primary border-[#2D3B55] dark:bg-[#0F172A] dark:border-[#334155]">
                      <SelectItem value="banner" className="text-[#F8FAFC]">Banner</SelectItem>
                      <SelectItem value="native" className="text-[#F8FAFC]">Native</SelectItem>
                      <SelectItem value="video" className="text-[#F8FAFC]">Video</SelectItem>
                      <SelectItem value="audio" className="text-[#F8FAFC]">Audio</SelectItem>
                      <SelectItem value="js_tag" className="text-[#F8FAFC]">Third Party JS Tag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Click URL</Label>
                <Input
                  value={form.clickUrl}
                  onChange={(e) => updateField("clickUrl", e.target.value)}
                  placeholder="https://..."
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Advertiser Domains (ADM)</Label>
                <Input
                  value={form.adomain}
                  onChange={(e) => updateField("adomain", e.target.value)}
                  placeholder="example.com, brand.com"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                />
                <p className="text-xs text-[#64748B]">Comma-separated list of advertiser domains. Passed in bid response as 'adomain'.</p>
              </div>
            </CardContent>
          </Card>

          {/* Banner Settings */}
          {creativeType === "banner" && (
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Banner Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Banner Size</Label>
                  <div className="flex items-center gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useCustomSize}
                        onChange={(e) => setUseCustomSize(e.target.checked)}
                        className="w-4 h-4 rounded border-[#2D3B55] bg-[#0F172A] text-[#3B82F6]"
                      />
                      <span className="text-sm text-[#94A3B8]">Use Custom Size</span>
                    </label>
                  </div>
                  
                  {!useCustomSize ? (
                    <Select 
                      value={`${selectedSize.w}x${selectedSize.h}`}
                      onValueChange={(v) => {
                        const [w, h] = v.split('x').map(Number);
                        setSelectedSize({ w, h, label: BANNER_SIZES.find(s => s.w === w && s.h === h)?.label || 'Custom' });
                      }}
                    >
                      <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="surface-primary border-[#2D3B55] dark:bg-[#0F172A] dark:border-[#334155]">
                        {BANNER_SIZES.map(size => (
                          <SelectItem key={`${size.w}x${size.h}`} value={`${size.w}x${size.h}`} className="text-[#F8FAFC]">
                            {size.label} ({size.w}x{size.h})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-[#64748B]">Width (px)</Label>
                        <Input
                          type="number"
                          value={customWidth}
                          onChange={(e) => {
                            const w = parseInt(e.target.value) || 300;
                            setCustomWidth(w);
                            setSelectedSize({ w, h: customHeight, label: 'Custom' });
                          }}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#64748B]">Height (px)</Label>
                        <Input
                          type="number"
                          value={customHeight}
                          onChange={(e) => {
                            const h = parseInt(e.target.value) || 250;
                            setCustomHeight(h);
                            setSelectedSize({ w: customWidth, h, label: 'Custom' });
                          }}
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Image URL (or upload below)</Label>
                  <Input
                    value={form.imageUrl}
                    onChange={(e) => updateField("imageUrl", e.target.value)}
                    placeholder="https://..."
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Background Color</Label>
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
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Native Settings */}
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
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Description</Label>
                  <Textarea
                    value={form.nativeDescription}
                    onChange={(e) => updateField("nativeDescription", e.target.value)}
                    placeholder="Ad description..."
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Icon URL</Label>
                    <Input
                      value={form.nativeIconUrl}
                      onChange={(e) => updateField("nativeIconUrl", e.target.value)}
                      placeholder="https://..."
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Main Image URL</Label>
                    <Input
                      value={form.nativeImageUrl}
                      onChange={(e) => updateField("nativeImageUrl", e.target.value)}
                      placeholder="https://..."
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                    />
                  </div>
                </div>
                {/* CTA Button Settings */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#2D3B55]">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Button Text</Label>
                    <Input
                      value={form.nativeCtaText}
                      onChange={(e) => updateField("nativeCtaText", e.target.value)}
                      placeholder="Learn More"
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Button Click URL *</Label>
                    <Input
                      value={form.nativeClickUrl}
                      onChange={(e) => updateField("nativeClickUrl", e.target.value)}
                      placeholder="https://..."
                      className="surface-secondary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Settings */}
          {creativeType === "video" && (
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Video Ad Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Video Source Type Selection */}
                <div className="space-y-3">
                  <Label className="text-[#94A3B8]">Video Source Type</Label>
                  <RadioGroup 
                    value={videoSourceType} 
                    onValueChange={setVideoSourceType}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value="vast" 
                        id="vast"
                        className="border-[#3B82F6] text-[#3B82F6]"
                      />
                      <Label htmlFor="vast" className="text-[#F8FAFC] cursor-pointer">VAST Tag</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value="upload" 
                        id="upload"
                        className="border-[#3B82F6] text-[#3B82F6]"
                      />
                      <Label htmlFor="upload" className="text-[#F8FAFC] cursor-pointer">RAW Video Upload</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* VAST Tag Options */}
                {videoSourceType === "vast" && (
                  <div className="space-y-4 p-4 surface-secondary rounded-lg border border-[#2D3B55]">
                    <div className="flex items-center gap-2 mb-2">
                      <Film className="w-5 h-5 text-[#3B82F6]" />
                      <span className="text-sm font-medium text-[#F8FAFC]">VAST Tag Configuration</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[#94A3B8]">VAST Tag URL *</Label>
                      <Input
                        value={form.vastUrl}
                        onChange={(e) => updateField("vastUrl", e.target.value)}
                        placeholder="https://ad-server.com/vast.xml"
                        className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">VAST Version</Label>
                        <Select value={form.vastVersion} onValueChange={(v) => updateField("vastVersion", v)}>
                          <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="surface-primary border-[#2D3B55] dark:bg-[#0F172A] dark:border-[#334155]">
                            {VAST_VERSIONS.map(v => (
                              <SelectItem key={v.value} value={v.value} className="text-[#F8FAFC]">
                                {v.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Duration (seconds)</Label>
                        <Input
                          type="number"
                          value={form.videoDuration}
                          onChange={(e) => updateField("videoDuration", parseInt(e.target.value))}
                          className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* RAW Video Upload Options */}
                {videoSourceType === "upload" && (
                  <div className="space-y-4 p-4 surface-secondary rounded-lg border border-[#2D3B55]">
                    <div className="flex items-center gap-2 mb-2">
                      <Video className="w-5 h-5 text-[#10B981]" />
                      <span className="text-sm font-medium text-[#F8FAFC]">Video Upload</span>
                    </div>
                    
                    <input
                      type="file"
                      ref={videoInputRef}
                      onChange={handleVideoUpload}
                      accept="video/*"
                      className="hidden"
                    />
                    
                    <Button 
                      variant="outline"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full border-dashed border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10"
                    >
                      {uploading ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" /> Upload Video File</>
                      )}
                    </Button>
                    
                    {uploadedVideo && (
                      <div className="p-3 surface-primary rounded border border-[#10B981]/30">
                        <div className="flex items-center gap-2">
                          <Video className="w-5 h-5 text-[#10B981]" />
                          <div>
                            <p className="text-sm text-[#F8FAFC]">{uploadedVideo.name}</p>
                            <p className="text-xs text-[#64748B]">{(uploadedVideo.size / (1024*1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Duration (sec)</Label>
                        <Input
                          type="number"
                          value={form.videoDuration}
                          onChange={(e) => updateField("videoDuration", parseInt(e.target.value))}
                          className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Width</Label>
                        <Input
                          type="number"
                          value={form.videoWidth}
                          onChange={(e) => updateField("videoWidth", parseInt(e.target.value))}
                          className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Height</Label>
                        <Input
                          type="number"
                          value={form.videoHeight}
                          onChange={(e) => updateField("videoHeight", parseInt(e.target.value))}
                          className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Audio Settings */}
          {creativeType === "audio" && (
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#EC4899]" />
                  Audio Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Audio Source Type</Label>
                  <RadioGroup 
                    value={audioSourceType} 
                    onValueChange={setAudioSourceType}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value="vast" 
                        id="audio-vast"
                        className="border-[#EC4899] text-[#EC4899]"
                      />
                      <Label htmlFor="audio-vast" className="text-[#F8FAFC] cursor-pointer">Audio VAST Tag</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value="upload" 
                        id="audio-upload"
                        className="border-[#EC4899] text-[#EC4899]"
                      />
                      <Label htmlFor="audio-upload" className="text-[#F8FAFC] cursor-pointer">Upload Audio</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Audio VAST Options */}
                {audioSourceType === "vast" && (
                  <div className="space-y-4 p-4 surface-secondary rounded-lg border border-[#2D3B55]">
                    <div className="flex items-center gap-2 mb-2">
                      <Music className="w-5 h-5 text-[#EC4899]" />
                      <span className="text-sm font-medium text-[#F8FAFC]">Audio VAST Configuration</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[#94A3B8]">Audio VAST URL</Label>
                      <Input
                        value={form.audioVastUrl}
                        onChange={(e) => updateField("audioVastUrl", e.target.value)}
                        placeholder="https://ad-server.com/audio-vast.xml"
                        className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[#94A3B8]">Or Paste VAST XML</Label>
                      <Textarea
                        value={form.audioVastXml}
                        onChange={(e) => updateField("audioVastXml", e.target.value)}
                        placeholder='<?xml version="1.0"?><VAST version="3.0">...</VAST>'
                        className="surface-primary border-[#2D3B55] text-[#F8FAFC] font-mono h-24 dark:bg-[#0F172A] dark:border-[#334155]"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">Duration (seconds)</Label>
                        <Input
                          type="number"
                          value={form.audioDuration}
                          onChange={(e) => updateField("audioDuration", parseInt(e.target.value) || 0)}
                          placeholder="30"
                          className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#94A3B8]">MIME Types</Label>
                        <Input
                          value={form.audioMimes}
                          onChange={(e) => updateField("audioMimes", e.target.value)}
                          className="surface-primary border-[#2D3B55] text-[#F8FAFC] font-mono text-xs dark:bg-[#0F172A] dark:border-[#334155]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio Upload Options */}
                {audioSourceType === "upload" && (
                  <div className="space-y-4 p-4 surface-secondary rounded-lg border border-[#2D3B55]">
                    <div className="flex items-center gap-2 mb-2">
                      <Music className="w-5 h-5 text-[#EC4899]" />
                      <span className="text-sm font-medium text-[#F8FAFC]">Audio Upload</span>
                    </div>
                    
                    <input
                      type="file"
                      ref={audioInputRef}
                      onChange={handleAudioUpload}
                      accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/aac"
                      className="hidden"
                    />
                    
                    <Button 
                      variant="outline"
                      onClick={() => audioInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full border-dashed border-[#EC4899] text-[#EC4899] hover:bg-[#EC4899]/10"
                    >
                      {uploading ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" /> Upload Audio File</>
                      )}
                    </Button>
                    
                    {uploadedAudio && (
                      <div className="p-3 surface-primary rounded border border-[#EC4899]/30">
                        <div className="flex items-center gap-2">
                          <Music className="w-5 h-5 text-[#EC4899]" />
                          <div>
                            <p className="text-sm text-[#F8FAFC]">{uploadedAudio.name}</p>
                            <p className="text-xs text-[#64748B]">{(uploadedAudio.size / (1024*1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label className="text-[#94A3B8]">Duration (seconds) <span className="text-xs text-[#64748B]">- Auto-detected on upload</span></Label>
                      <Input
                        type="number"
                        value={form.audioDuration}
                        onChange={(e) => updateField("audioDuration", parseInt(e.target.value) || 0)}
                        placeholder="30"
                        className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                      />
                    </div>
                  </div>
                )}

                {/* Companion Banner */}
                <div className="space-y-3 pt-4 border-t border-[#2D3B55]">
                  <Label className="text-[#94A3B8]">Companion Banner (Optional)</Label>
                  
                  {/* Companion Banner Upload */}
                  <input
                    type="file"
                    ref={companionInputRef}
                    onChange={handleCompanionUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <Button 
                    variant="outline"
                    onClick={() => companionInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full border-dashed border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10"
                  >
                    {uploading ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Upload Companion Banner</>
                    )}
                  </Button>
                  
                  <div className="space-y-1">
                    <Label className="text-xs text-[#64748B]">Or Enter Banner URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.companionBannerUrl}
                        onChange={(e) => updateField("companionBannerUrl", e.target.value)}
                        placeholder="https://..."
                        className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => detectCompanionDimensions(form.companionBannerUrl)}
                        disabled={!form.companionBannerUrl}
                        className="border-[#2D3B55] text-[#94A3B8] hover:bg-[#1E293B] shrink-0"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-[#64748B]">Click refresh to auto-detect dimensions from URL</p>
                  </div>
                  
                  {/* Size Adjustment */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-[#64748B]">Width (px)</Label>
                      <Input
                        type="number"
                        value={form.companionWidth}
                        onChange={(e) => updateField("companionWidth", parseInt(e.target.value) || 300)}
                        className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[#64748B]">Height (px)</Label>
                      <Input
                        type="number"
                        value={form.companionHeight}
                        onChange={(e) => updateField("companionHeight", parseInt(e.target.value) || 250)}
                        className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[#64748B]">Dimensions auto-detected on upload. Adjust as needed.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* JS Tag Settings */}
          {creativeType === "js_tag" && (
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
                  <Code className="w-5 h-5 text-[#F59E0B]" />
                  Third Party JS Tag Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 p-4 surface-secondary rounded-lg border border-[#2D3B55]">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="w-5 h-5 text-[#F59E0B]" />
                    <span className="text-sm font-medium text-[#F8FAFC]">Tag Configuration</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#94A3B8]">Vendor Name</Label>
                      <Input
                        value={form.jsTagVendor}
                        onChange={(e) => updateField("jsTagVendor", e.target.value)}
                        placeholder="e.g., Google, Criteo, TTD"
                        className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#94A3B8]">Tag Type</Label>
                      <Select value={form.jsTagType} onValueChange={(v) => updateField("jsTagType", v)}>
                        <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="surface-primary border-[#2D3B55] dark:bg-[#0F172A] dark:border-[#334155]">
                          <SelectItem value="script" className="text-[#F8FAFC]">Script Tag</SelectItem>
                          <SelectItem value="iframe" className="text-[#F8FAFC]">iFrame Tag</SelectItem>
                          <SelectItem value="document.write" className="text-[#F8FAFC]">Document.write</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Tag URL (Optional)</Label>
                    <Input
                      value={form.jsTagUrl}
                      onChange={(e) => updateField("jsTagUrl", e.target.value)}
                      placeholder="https://ads.example.com/tag.js"
                      className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                    />
                    <p className="text-xs text-[#64748B]">External URL to the JavaScript file</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Tag Content / Code *</Label>
                    <Textarea
                      value={form.jsTagContent}
                      onChange={(e) => updateField("jsTagContent", e.target.value)}
                      placeholder={'<script src="https://ads.example.com/tag.js"></script>\nor inline JavaScript code...'}
                      className="surface-primary border-[#2D3B55] text-[#F8FAFC] font-mono text-xs h-40 dark:bg-[#0F172A] dark:border-[#334155]"
                    />
                    <p className="text-xs text-[#64748B]">Paste the complete tag code provided by the third party</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#2D3B55]">
                    <div className="space-y-2">
                      <Label className="text-[#94A3B8]">Container Width (px)</Label>
                      <Input
                        type="number"
                        value={form.jsTagWidth}
                        onChange={(e) => updateField("jsTagWidth", parseInt(e.target.value) || 300)}
                        className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#94A3B8]">Container Height (px)</Label>
                      <Input
                        type="number"
                        value={form.jsTagHeight}
                        onChange={(e) => updateField("jsTagHeight", parseInt(e.target.value) || 250)}
                        className="surface-primary border-[#2D3B55] text-[#F8FAFC] dark:bg-[#0F172A] dark:border-[#334155]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#94A3B8]">HTTPS Secure</Label>
                      <div className="flex items-center h-10">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.jsTagIsSecure}
                            onChange={(e) => updateField("jsTagIsSecure", e.target.checked)}
                            className="w-4 h-4 rounded border-[#2D3B55] bg-[#0F172A] text-[#10B981]"
                          />
                          <span className="text-sm text-[#94A3B8]">Tag is HTTPS compatible</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Impression Pixels */}
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-lg text-[#F8FAFC]">Impression Pixels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#94A3B8]">Add 1x1 tracking pixels for impression counting</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={addImpressionPixel}
                    className="border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Pixel
                  </Button>
                </div>

                {impressionPixels.length === 0 ? (
                  <div className="p-6 surface-secondary rounded-lg border border-dashed border-[#2D3B55] text-center">
                    <MonitorPlay className="w-8 h-8 mx-auto text-[#64748B] mb-2" />
                    <p className="text-sm text-[#64748B]">No impression pixels added</p>
                    <p className="text-xs text-[#475569] mt-1">Click "Add Pixel" to add tracking pixels</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {impressionPixels.map((pixel, index) => (
                      <div key={pixel.id} className="p-4 surface-secondary rounded-lg border border-[#2D3B55]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-[#64748B]">Pixel #{index + 1}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateImpressionPixel(pixel.id, 'enabled', !pixel.enabled)}
                              className="text-[#94A3B8] hover:text-[#F8FAFC]"
                            >
                              {pixel.enabled ? (
                                <ToggleRight className="w-5 h-5 text-[#10B981]" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-[#64748B]" />
                              )}
                            </button>
                            <button
                              onClick={() => removeImpressionPixel(pixel.id)}
                              className="text-[#EF4444] hover:text-[#EF4444]/80"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-[#64748B]">Pixel Name *</Label>
                            <Input
                              value={pixel.name}
                              onChange={(e) => updateImpressionPixel(pixel.id, 'name', e.target.value)}
                              placeholder="e.g., DCM Impression"
                              className="surface-primary border-[#2D3B55] text-[#F8FAFC] text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-[#64748B]">Fire On Event</Label>
                            <Select 
                              value={pixel.event} 
                              onValueChange={(v) => updateImpressionPixel(pixel.id, 'event', v)}
                            >
                              <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC] text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="surface-primary border-[#2D3B55]">
                                <SelectItem value="impression" className="text-[#F8FAFC]">Impression</SelectItem>
                                <SelectItem value="viewable" className="text-[#F8FAFC]">Viewable</SelectItem>
                                <SelectItem value="click" className="text-[#F8FAFC]">Click</SelectItem>
                                <SelectItem value="complete" className="text-[#F8FAFC]">Complete</SelectItem>
                                <SelectItem value="firstQuartile" className="text-[#F8FAFC]">First Quartile (25%)</SelectItem>
                                <SelectItem value="midpoint" className="text-[#F8FAFC]">Midpoint (50%)</SelectItem>
                                <SelectItem value="thirdQuartile" className="text-[#F8FAFC]">Third Quartile (75%)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-[#64748B]">Pixel URL *</Label>
                          <Input
                            value={pixel.url}
                            onChange={(e) => updateImpressionPixel(pixel.id, 'url', e.target.value)}
                            placeholder="https://tracking.example.com/pixel?id=xxx"
                            className="surface-primary border-[#2D3B55] text-[#F8FAFC] font-mono text-xs"
                          />
                          <p className="text-xs text-[#475569]">1x1 pixel URL that fires on the selected event</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Image Upload */}
          {creativeType !== "video" && creativeType !== "audio" && creativeType !== "js_tag" && (
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
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Upload Image</>
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
          )}

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
