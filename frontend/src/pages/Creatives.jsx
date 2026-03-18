import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Trash2, 
  Image, 
  Video, 
  FileText,
  MoreVertical,
  Music,
  Code,
  Link as LinkIcon,
  Eye,
  X,
  Play,
  Monitor,
  Smartphone,
  Film,
  Layers,
  Volume2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";
import { getCreatives, deleteCreative } from "../lib/api";

// Video format categories
const VIDEO_FORMATS = {
  preroll_15: { label: "Pre-roll 15s", duration: 15 },
  preroll_30: { label: "Pre-roll 30s", duration: 30 },
  midroll: { label: "Mid-roll", duration: null },
  postroll: { label: "Post-roll", duration: null },
  outstream: { label: "Outstream", duration: null },
  interactive: { label: "Interactive", duration: null },
};

function CreativeTypeIcon({ type }) {
  const icons = {
    banner: Image,
    video: Video,
    native: FileText,
    audio: Music
  };
  const Icon = icons[type] || FileText;
  return <Icon className="w-5 h-5" />;
}

function CreativeTypeBadge({ type }) {
  const colors = {
    banner: "bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30",
    video: "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30",
    native: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30",
    audio: "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/30"
  };
  
  return (
    <Badge variant="outline" className={`${colors[type]} font-medium uppercase text-[10px] tracking-wider`}>
      {type}
    </Badge>
  );
}

function CreativeFormatBadge({ format }) {
  const labels = {
    raw_banner: "Raw Banner",
    raw_video: "Raw Video",
    vast_url: "VAST URL",
    vast_xml: "VAST XML",
    js_tag: "JS Tag",
    native_json: "Native JSON",
    audio_vast: "Audio VAST"
  };
  
  const icons = {
    raw_banner: Image,
    raw_video: Video,
    vast_url: LinkIcon,
    vast_xml: Code,
    js_tag: Code,
    native_json: FileText,
    audio_vast: Music
  };
  
  const Icon = icons[format] || Code;
  
  return (
    <Badge variant="outline" className="bg-[#64748B]/20 text-[#94A3B8] border-[#64748B]/30 text-[9px]">
      <Icon className="w-3 h-3 mr-1" />
      {labels[format] || format}
    </Badge>
  );
}

function CreativePreview({ creative, onClose }) {
  const [iframeKey, setIframeKey] = useState(0);
  
  const renderPreview = () => {
    switch (creative.type) {
      case "banner":
        const width = creative.banner_data?.width || 300;
        const height = creative.banner_data?.height || 250;
        
        if (creative.banner_data?.image_url) {
          return (
            <div className="flex flex-col items-center gap-4">
              {/* Live Preview */}
              <div className="p-4 surface-secondary rounded-lg">
                <p className="text-xs text-[#64748B] mb-3 text-center">Live Preview ({width}x{height})</p>
                <div 
                  className="border border-[#2D3B55] rounded overflow-hidden bg-white mx-auto"
                  style={{ width: Math.min(width, 600), height: Math.min(height, 400) }}
                >
                  <img 
                    src={creative.banner_data.image_url} 
                    alt={creative.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </div>
              {/* Size Badge */}
              <Badge className="bg-[#3B82F6]/20 text-[#3B82F6]">{width} x {height} px</Badge>
            </div>
          );
        } else if (creative.banner_data?.ad_markup) {
          // Render HTML markup in iframe for proper preview
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { margin: 0; padding: 0; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
                * { box-sizing: border-box; }
              </style>
            </head>
            <body>
              ${creative.banner_data.ad_markup.replace(/\${CLICK_URL}/g, '#')}
            </body>
            </html>
          `;
          return (
            <div className="flex flex-col items-center gap-4">
              {/* Live Preview in iframe */}
              <div className="p-4 surface-secondary rounded-lg">
                <p className="text-xs text-[#64748B] mb-3 text-center">Live Preview ({width}x{height})</p>
                <div 
                  className="border border-[#2D3B55] rounded overflow-hidden bg-white mx-auto"
                  style={{ width: Math.min(width, 600), height: Math.min(height, 400) }}
                >
                  <iframe
                    key={iframeKey}
                    srcDoc={htmlContent}
                    title="Banner Preview"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
              {/* Size Badge */}
              <Badge className="bg-[#3B82F6]/20 text-[#3B82F6]">{width} x {height} px</Badge>
              {/* HTML Code */}
              <div className="w-full">
                <p className="text-xs text-[#64748B] mb-2">HTML Markup:</p>
                <pre className="text-xs text-[#94A3B8] font-mono overflow-auto max-h-[150px] p-3 bg-[#020408] rounded border border-[#2D3B55]">
                  {creative.banner_data.ad_markup}
                </pre>
              </div>
            </div>
          );
        }
        break;
      case "video":
        const videoWidth = creative.video_data?.width || 640;
        const videoHeight = creative.video_data?.height || 360;
        const duration = creative.video_data?.duration || 15;
        
        if (creative.video_data?.video_url) {
          return (
            <div className="flex flex-col items-center gap-4">
              {/* Video Preview */}
              <div className="p-4 surface-secondary rounded-lg w-full max-w-2xl">
                <p className="text-xs text-[#64748B] mb-3 text-center">Video Preview ({videoWidth}x{videoHeight}, {duration}s)</p>
                <video 
                  src={creative.video_data.video_url} 
                  controls 
                  className="w-full rounded border border-[#2D3B55]"
                  style={{ maxHeight: 400 }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-[#10B981]/20 text-[#10B981]">{videoWidth}x{videoHeight}</Badge>
                <Badge className="bg-[#F59E0B]/20 text-[#F59E0B]">{duration}s</Badge>
              </div>
            </div>
          );
        } else if (creative.video_data?.vast_url) {
          return (
            <div className="flex flex-col items-center gap-4">
              {/* VAST URL Preview */}
              <div className="p-4 surface-secondary rounded-lg w-full">
                <p className="text-xs text-[#64748B] mb-3">VAST Tag URL ({duration}s video)</p>
                <div className="p-3 bg-[#020408] rounded border border-[#2D3B55]">
                  <code className="text-xs text-[#3B82F6] font-mono break-all">
                    {creative.video_data.vast_url}
                  </code>
                </div>
                <div className="mt-3 flex gap-2">
                  <a 
                    href={creative.video_data.vast_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-[#3B82F6] hover:underline"
                  >
                    Open VAST in new tab →
                  </a>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-[#10B981]/20 text-[#10B981]">{videoWidth}x{videoHeight}</Badge>
                <Badge className="bg-[#F59E0B]/20 text-[#F59E0B]">{duration}s</Badge>
                <Badge className="bg-[#8B5CF6]/20 text-[#8B5CF6]">VAST</Badge>
              </div>
            </div>
          );
        } else if (creative.video_data?.vast_xml) {
          return (
            <div className="flex flex-col items-center gap-4">
              {/* VAST XML Preview */}
              <div className="p-4 surface-secondary rounded-lg w-full">
                <p className="text-xs text-[#64748B] mb-3">VAST XML ({duration}s video)</p>
                <pre className="text-xs text-[#94A3B8] font-mono overflow-auto max-h-[250px] p-3 bg-[#020408] rounded border border-[#2D3B55]">
                  {creative.video_data.vast_xml}
                </pre>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-[#10B981]/20 text-[#10B981]">{videoWidth}x{videoHeight}</Badge>
                <Badge className="bg-[#F59E0B]/20 text-[#F59E0B]">{duration}s</Badge>
                <Badge className="bg-[#8B5CF6]/20 text-[#8B5CF6]">VAST XML</Badge>
              </div>
            </div>
          );
        }
        break;
      case "native":
        if (creative.native_data) {
          const nd = creative.native_data;
          return (
            <div className="flex flex-col items-center gap-4">
              {/* Native Ad Preview - Card Style */}
              <div className="p-4 surface-secondary rounded-lg">
                <p className="text-xs text-[#64748B] mb-3 text-center">Native Ad Preview</p>
                <div className="w-[350px] bg-white rounded-lg shadow-lg overflow-hidden border">
                  {nd.image_url && (
                    <img 
                      src={nd.image_url} 
                      alt={nd.title}
                      className="w-full h-[180px] object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {nd.icon_url && (
                        <img 
                          src={nd.icon_url} 
                          alt="icon"
                          className="w-10 h-10 rounded-lg border"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">{nd.title}</h4>
                        {nd.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{nd.description}</p>
                        )}
                        {nd.sponsored_by && (
                          <p className="text-[10px] text-gray-400 mt-1">Sponsored by {nd.sponsored_by}</p>
                        )}
                      </div>
                    </div>
                    <button className="mt-3 w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
                      {nd.cta_text || "Learn More"}
                    </button>
                  </div>
                </div>
              </div>
              <Badge className="bg-[#F59E0B]/20 text-[#F59E0B]">Native Ad</Badge>
            </div>
          );
        }
        break;
      case "audio":
        if (creative.audio_data?.audio_url) {
          return (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 surface-secondary rounded-lg w-full max-w-md">
                <p className="text-xs text-[#64748B] mb-3 text-center">Audio Preview ({creative.audio_data?.duration || 30}s)</p>
                <audio 
                  src={creative.audio_data.audio_url} 
                  controls 
                  className="w-full"
                />
              </div>
              <Badge className="bg-[#8B5CF6]/20 text-[#8B5CF6]">Audio Ad</Badge>
            </div>
          );
        }
        break;
      default:
        break;
    }
    
    return (
      <div className="text-center p-8 text-[#64748B]">
        <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No preview available for this creative</p>
        <p className="text-xs mt-1">Creative type: {creative.type}</p>
        <p className="text-xs mt-1 text-[#F59E0B]">Missing: {
          creative.type === 'banner' ? 
            (!creative.banner_data?.image_url && !creative.banner_data?.ad_markup ? 'image_url or ad_markup' : 'creative data') :
          creative.type === 'video' ?
            (!creative.video_data?.video_url && !creative.video_data?.vast_tag ? 'video_url or vast_tag' : 'video data') :
          creative.type === 'native' ?
            (!creative.native_data ? 'native data' : 'native content') :
          'creative content'
        }</p>
      </div>
    );
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="surface-primary border-panel max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#F8FAFC] flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Preview: {creative.name}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {renderPreview()}
        </div>
        {/* Creative Info */}
        <div className="mt-4 pt-4 border-t border-[#2D3B55]">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[#64748B]">Type:</span>
              <span className="text-[#F8FAFC] ml-2 capitalize">{creative.type}</span>
            </div>
            <div>
              <span className="text-[#64748B]">Format:</span>
              <span className="text-[#F8FAFC] ml-2">{creative.format || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[#64748B]">ID:</span>
              <span className="text-[#3B82F6] ml-2 font-mono">{creative.id?.substring(0, 8)}...</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Creatives() {
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [previewCreative, setPreviewCreative] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const fetchCreatives = async () => {
    try {
      setLoading(true);
      const response = await getCreatives();
      setCreatives(response.data);
    } catch (error) {
      toast.error("Failed to load creatives");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreatives();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCreative(deleteId);
      toast.success("Creative deleted");
      setDeleteId(null);
      fetchCreatives();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete creative");
    }
  };

  const getCreativeDimensions = (creative) => {
    if (creative.type === "banner" && creative.banner_data) {
      return `${creative.banner_data.width}x${creative.banner_data.height}`;
    }
    if (creative.type === "video" && creative.video_data) {
      return `${creative.video_data.width}x${creative.video_data.height} • ${creative.video_data.duration}s`;
    }
    return "-";
  };

  // Filter creatives by type
  const filterCreatives = (type) => {
    if (type === "all") return creatives;
    if (type === "display") return creatives.filter(c => c.type === "banner");
    if (type === "video") return creatives.filter(c => c.type === "video");
    if (type === "native") return creatives.filter(c => c.type === "native");
    if (type === "audio") return creatives.filter(c => c.type === "audio");
    if (type === "jstag") return creatives.filter(c => c.format === "js_tag");
    return creatives;
  };

  // Categorize video creatives by duration
  const categorizeVideoByFormat = (creative) => {
    if (creative.type !== "video") return null;
    const duration = creative.video_data?.duration;
    if (duration === 15) return "preroll_15";
    if (duration === 30) return "preroll_30";
    if (duration > 30 && duration <= 60) return "midroll";
    if (creative.video_data?.video_format === "outstream") return "outstream";
    if (creative.video_data?.video_format === "interactive") return "interactive";
    return "midroll";
  };

  // Count by type
  const counts = {
    all: creatives.length,
    display: creatives.filter(c => c.type === "banner").length,
    video: creatives.filter(c => c.type === "video").length,
    native: creatives.filter(c => c.type === "native").length,
    audio: creatives.filter(c => c.type === "audio").length,
    jstag: creatives.filter(c => c.format === "js_tag").length,
  };

  // Render creative card with proper preview
  const renderCreativeCard = (creative) => (
    <Card 
      key={creative.id} 
      className="surface-primary border-panel card-hover group"
      data-testid={`creative-${creative.id}`}
    >
      <CardContent className="p-0">
        {/* Preview Area */}
        <div 
          className="relative aspect-video surface-secondary rounded-t-lg overflow-hidden cursor-pointer"
          onClick={() => setPreviewCreative(creative)}
        >
          {creative.type === "banner" && creative.banner_data?.image_url && (
            <img 
              src={creative.banner_data.image_url} 
              alt={creative.name}
              className="w-full h-full object-contain bg-gray-900"
            />
          )}
          {creative.type === "banner" && creative.banner_data?.ad_markup && !creative.banner_data?.image_url && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Code className="w-8 h-8 text-[#3B82F6] mx-auto mb-2" />
                <p className="text-xs text-[#64748B]">HTML Banner</p>
              </div>
            </div>
          )}
          {creative.type === "video" && (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0A0F1C] to-[#151F32]">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#10B981]/20 flex items-center justify-center mx-auto mb-2 group-hover:bg-[#10B981]/30 transition-colors">
                  <Play className="w-6 h-6 text-[#10B981] ml-1" />
                </div>
                <p className="text-xs text-[#10B981] font-medium">{creative.video_data?.duration || 0}s</p>
              </div>
            </div>
          )}
          {creative.type === "native" && creative.native_data && (
            <div className="w-full h-full p-3 bg-white flex items-center gap-3">
              {creative.native_data.icon_url && (
                <img src={creative.native_data.icon_url} alt="" className="w-10 h-10 rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{creative.native_data.title}</p>
                <p className="text-xs text-gray-500 truncate">{creative.native_data.description}</p>
              </div>
            </div>
          )}
          {creative.format === "js_tag" && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Code className="w-8 h-8 text-[#8B5CF6] mx-auto mb-2" />
                <p className="text-xs text-[#64748B]">JavaScript Tag</p>
              </div>
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white">
              <Eye className="w-4 h-4 mr-1" /> Preview
            </Button>
          </div>
          {/* Size badge */}
          {(creative.type === "banner" || creative.type === "video") && (
            <Badge className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px]">
              {getCreativeDimensions(creative)}
            </Badge>
          )}
        </div>

        {/* Info Area */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-[#F8FAFC] truncate">{creative.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <CreativeTypeBadge type={creative.type} />
                {creative.format && <CreativeFormatBadge format={creative.format} />}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-[#64748B] hover:text-[#F8FAFC] -mr-2">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="surface-primary border-panel">
                <DropdownMenuItem 
                  onClick={() => setPreviewCreative(creative)}
                  className="text-[#94A3B8] focus:text-[#F8FAFC]"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setDeleteId(creative.id)}
                  className="text-[#EF4444] focus:text-[#EF4444]"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <p className="text-[10px] text-[#64748B] font-mono truncate">ID: {creative.id}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6" data-testid="creatives-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Creatives</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Manage ad creatives for your campaigns</p>
        </div>
        <div className="flex gap-2">
          <Link to="/creatives/editor">
            <Button 
              variant="outline"
              className="border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
              data-testid="advanced-editor-btn"
            >
              <Code className="w-4 h-4 mr-2" />
              Advanced Editor
            </Button>
          </Link>
          <Link to="/creatives/new">
            <Button 
              className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white btn-press shadow-[0_0_10px_rgba(59,130,246,0.3)]"
              data-testid="create-creative-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Creative
            </Button>
          </Link>
        </div>
      </div>

      {/* Format Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-[#0A0F1C] mb-6 p-1 h-auto">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white px-4 py-2"
          >
            <Layers className="w-4 h-4 mr-2" />
            All ({counts.all})
          </TabsTrigger>
          <TabsTrigger 
            value="display" 
            className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white px-4 py-2"
          >
            <Monitor className="w-4 h-4 mr-2" />
            Display ({counts.display})
          </TabsTrigger>
          <TabsTrigger 
            value="video" 
            className="data-[state=active]:bg-[#10B981] data-[state=active]:text-white px-4 py-2"
          >
            <Film className="w-4 h-4 mr-2" />
            Video ({counts.video})
          </TabsTrigger>
          <TabsTrigger 
            value="native" 
            className="data-[state=active]:bg-[#F59E0B] data-[state=active]:text-white px-4 py-2"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            Native ({counts.native})
          </TabsTrigger>
          <TabsTrigger 
            value="audio" 
            className="data-[state=active]:bg-[#EC4899] data-[state=active]:text-white px-4 py-2"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Audio ({counts.audio})
          </TabsTrigger>
          <TabsTrigger 
            value="jstag" 
            className="data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white px-4 py-2"
          >
            <Code className="w-4 h-4 mr-2" />
            JS Tags ({counts.jstag})
          </TabsTrigger>
        </TabsList>

        {/* All Creatives */}
        <TabsContent value="all" className="mt-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-[#64748B]">Loading creatives...</div>
            </div>
          ) : filterCreatives("all").length === 0 ? (
            <Card className="surface-primary border-panel">
              <CardContent className="empty-state py-16">
                <Image className="empty-state-icon" />
                <h3 className="text-lg font-medium text-[#F8FAFC] mb-2">No creatives yet</h3>
                <p className="text-sm text-[#94A3B8] mb-4">Create creatives to use in your campaigns</p>
                <Link to="/creatives/new">
                  <Button className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Creative
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="creatives-grid">
              {filterCreatives("all").map(renderCreativeCard)}
            </div>
          )}
        </TabsContent>

        {/* Display Creatives */}
        <TabsContent value="display" className="mt-0">
          {filterCreatives("display").length === 0 ? (
            <Card className="surface-primary border-panel">
              <CardContent className="empty-state py-16">
                <Monitor className="empty-state-icon text-[#3B82F6]" />
                <h3 className="text-lg font-medium text-[#F8FAFC] mb-2">No display creatives</h3>
                <p className="text-sm text-[#94A3B8] mb-4">Create banner ads for display campaigns</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterCreatives("display").map(renderCreativeCard)}
            </div>
          )}
        </TabsContent>

        {/* Video Creatives */}
        <TabsContent value="video" className="mt-0 space-y-6">
          {filterCreatives("video").length === 0 ? (
            <Card className="surface-primary border-panel">
              <CardContent className="empty-state py-16">
                <Film className="empty-state-icon text-[#10B981]" />
                <h3 className="text-lg font-medium text-[#F8FAFC] mb-2">No video creatives</h3>
                <p className="text-sm text-[#94A3B8] mb-4">Create video ads for video campaigns</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Pre-roll 15s */}
              {filterCreatives("video").filter(c => c.video_data?.duration === 15).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-[#F8FAFC] mb-3 flex items-center gap-2">
                    <Play className="w-4 h-4 text-[#10B981]" />
                    Pre-roll 15s
                    <Badge className="bg-[#10B981]/20 text-[#10B981] ml-2">
                      {filterCreatives("video").filter(c => c.video_data?.duration === 15).length}
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filterCreatives("video").filter(c => c.video_data?.duration === 15).map(renderCreativeCard)}
                  </div>
                </div>
              )}

              {/* Pre-roll 30s */}
              {filterCreatives("video").filter(c => c.video_data?.duration === 30).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-[#F8FAFC] mb-3 flex items-center gap-2">
                    <Play className="w-4 h-4 text-[#10B981]" />
                    Pre-roll 30s
                    <Badge className="bg-[#10B981]/20 text-[#10B981] ml-2">
                      {filterCreatives("video").filter(c => c.video_data?.duration === 30).length}
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filterCreatives("video").filter(c => c.video_data?.duration === 30).map(renderCreativeCard)}
                  </div>
                </div>
              )}

              {/* Mid-roll / Other */}
              {filterCreatives("video").filter(c => c.video_data?.duration && c.video_data.duration !== 15 && c.video_data.duration !== 30).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-[#F8FAFC] mb-3 flex items-center gap-2">
                    <Play className="w-4 h-4 text-[#F59E0B]" />
                    Mid-roll / Other
                    <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] ml-2">
                      {filterCreatives("video").filter(c => c.video_data?.duration && c.video_data.duration !== 15 && c.video_data.duration !== 30).length}
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filterCreatives("video").filter(c => c.video_data?.duration && c.video_data.duration !== 15 && c.video_data.duration !== 30).map(renderCreativeCard)}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Native Creatives */}
        <TabsContent value="native" className="mt-0">
          {filterCreatives("native").length === 0 ? (
            <Card className="surface-primary border-panel">
              <CardContent className="empty-state py-16">
                <Smartphone className="empty-state-icon text-[#F59E0B]" />
                <h3 className="text-lg font-medium text-[#F8FAFC] mb-2">No native creatives</h3>
                <p className="text-sm text-[#94A3B8] mb-4">Create native ads that blend with content</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterCreatives("native").map(renderCreativeCard)}
            </div>
          )}
        </TabsContent>

        {/* Audio Creatives */}
        <TabsContent value="audio" className="mt-0">
          {filterCreatives("audio").length === 0 ? (
            <Card className="surface-primary border-panel">
              <CardContent className="empty-state py-16">
                <Volume2 className="empty-state-icon text-[#EC4899]" />
                <h3 className="text-lg font-medium text-[#F8FAFC] mb-2">No audio creatives</h3>
                <p className="text-sm text-[#94A3B8] mb-4">Create audio ads for streaming and podcast platforms</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterCreatives("audio").map(renderCreativeCard)}
            </div>
          )}
        </TabsContent>

        {/* JS Tags */}
        <TabsContent value="jstag" className="mt-0">
          {filterCreatives("jstag").length === 0 ? (
            <Card className="surface-primary border-panel">
              <CardContent className="empty-state py-16">
                <Code className="empty-state-icon text-[#8B5CF6]" />
                <h3 className="text-lg font-medium text-[#F8FAFC] mb-2">No JS tag creatives</h3>
                <p className="text-sm text-[#94A3B8] mb-4">Create JavaScript tag based creatives</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterCreatives("jstag").map(renderCreativeCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="surface-primary border-panel">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F8FAFC]">Delete Creative</AlertDialogTitle>
            <AlertDialogDescription className="text-[#94A3B8]">
              Are you sure you want to delete this creative? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151F32]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-[#EF4444] hover:bg-[#EF4444]/90 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      {previewCreative && (
        <CreativePreview 
          creative={previewCreative} 
          onClose={() => setPreviewCreative(null)} 
        />
      )}
    </div>
  );
}
