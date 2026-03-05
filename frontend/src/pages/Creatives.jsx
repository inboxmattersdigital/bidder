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
  X
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
  const renderPreview = () => {
    switch (creative.type) {
      case "banner":
        if (creative.banner_data?.image_url) {
          return (
            <div className="flex items-center justify-center p-4 surface-secondary rounded">
              <img 
                src={creative.banner_data.image_url} 
                alt={creative.name}
                className="max-w-full max-h-[400px] object-contain rounded"
              />
            </div>
          );
        } else if (creative.banner_data?.ad_markup) {
          return (
            <div className="p-4 surface-secondary rounded">
              <p className="text-xs text-[#64748B] mb-2">HTML Markup Preview:</p>
              <pre className="text-xs text-[#94A3B8] font-mono overflow-auto max-h-[300px] p-2 bg-[#020408] rounded">
                {creative.banner_data.ad_markup.substring(0, 500)}...
              </pre>
            </div>
          );
        }
        break;
      case "video":
        if (creative.video_data?.video_url) {
          return (
            <div className="flex items-center justify-center p-4 surface-secondary rounded">
              <video 
                src={creative.video_data.video_url} 
                controls 
                className="max-w-full max-h-[400px] rounded"
              />
            </div>
          );
        } else if (creative.video_data?.vast_url) {
          return (
            <div className="p-4 surface-secondary rounded space-y-3">
              <p className="text-xs text-[#64748B]">VAST URL:</p>
              <code className="text-xs text-[#3B82F6] font-mono block break-all bg-[#020408] p-2 rounded">
                {creative.video_data.vast_url}
              </code>
              <a 
                href={creative.video_data.vast_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-[#3B82F6] hover:underline"
              >
                Open VAST URL in new tab →
              </a>
            </div>
          );
        } else if (creative.video_data?.vast_xml) {
          return (
            <div className="p-4 surface-secondary rounded">
              <p className="text-xs text-[#64748B] mb-2">VAST XML Preview:</p>
              <pre className="text-xs text-[#94A3B8] font-mono overflow-auto max-h-[300px] p-2 bg-[#020408] rounded">
                {creative.video_data.vast_xml.substring(0, 1000)}...
              </pre>
            </div>
          );
        }
        break;
      case "native":
        if (creative.native_data) {
          return (
            <div className="p-4 surface-secondary rounded space-y-3">
              {creative.native_data.image_url && (
                <img 
                  src={creative.native_data.image_url} 
                  alt={creative.native_data.title}
                  className="w-full max-h-[200px] object-cover rounded"
                />
              )}
              <div className="flex items-start gap-3">
                {creative.native_data.icon_url && (
                  <img 
                    src={creative.native_data.icon_url} 
                    alt="icon"
                    className="w-12 h-12 rounded"
                  />
                )}
                <div>
                  <h4 className="text-sm font-semibold text-[#F8FAFC]">{creative.native_data.title}</h4>
                  <p className="text-xs text-[#94A3B8]">{creative.native_data.description}</p>
                  {creative.native_data.sponsored_by && (
                    <p className="text-[10px] text-[#64748B] mt-1">Sponsored by: {creative.native_data.sponsored_by}</p>
                  )}
                </div>
              </div>
              <Button size="sm" className="w-full bg-[#3B82F6]">{creative.native_data.cta_text}</Button>
            </div>
          );
        }
        break;
      case "audio":
        if (creative.audio_data?.audio_url) {
          return (
            <div className="p-4 surface-secondary rounded">
              <audio src={creative.audio_data.audio_url} controls className="w-full" />
            </div>
          );
        } else if (creative.audio_data?.vast_url) {
          return (
            <div className="p-4 surface-secondary rounded space-y-3">
              <p className="text-xs text-[#64748B]">Audio VAST URL:</p>
              <code className="text-xs text-[#8B5CF6] font-mono block break-all bg-[#020408] p-2 rounded">
                {creative.audio_data.vast_url}
              </code>
            </div>
          );
        }
        break;
      default:
        break;
    }
    
    if (creative.js_tag) {
      return (
        <div className="p-4 surface-secondary rounded">
          <p className="text-xs text-[#64748B] mb-2">JavaScript Tag:</p>
          <pre className="text-xs text-[#94A3B8] font-mono overflow-auto max-h-[300px] p-2 bg-[#020408] rounded">
            {creative.js_tag.substring(0, 500)}...
          </pre>
        </div>
      );
    }
    
    return (
      <div className="p-8 text-center text-[#64748B]">
        <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No preview available for this creative</p>
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="surface-primary border-panel max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#F8FAFC] flex items-center gap-3">
            <CreativeTypeIcon type={creative.type} />
            {creative.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CreativeTypeBadge type={creative.type} />
            {creative.format && <CreativeFormatBadge format={creative.format} />}
          </div>
          {renderPreview()}
          <div className="grid grid-cols-2 gap-4 text-xs">
            {creative.adomain?.length > 0 && (
              <div>
                <span className="text-[#64748B]">Domains: </span>
                <span className="text-[#94A3B8] font-mono">{creative.adomain.join(', ')}</span>
              </div>
            )}
            {creative.cat?.length > 0 && (
              <div>
                <span className="text-[#64748B]">Categories: </span>
                <span className="text-[#94A3B8] font-mono">{creative.cat.join(', ')}</span>
              </div>
            )}
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

      {/* Creatives Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#64748B]">Loading creatives...</div>
        </div>
      ) : creatives.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="creatives-grid">
          {creatives.map((creative) => (
            <Card 
              key={creative.id} 
              className="surface-primary border-panel card-hover"
              data-testid={`creative-${creative.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm surface-secondary flex items-center justify-center text-[#3B82F6]">
                      <CreativeTypeIcon type={creative.type} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#F8FAFC]">{creative.name}</h3>
                      <p className="text-xs text-[#64748B] font-mono">{getCreativeDimensions(creative)}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-[#64748B] hover:text-[#F8FAFC]">
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
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#64748B]">Type</span>
                    <div className="flex items-center gap-1">
                      <CreativeTypeBadge type={creative.type} />
                      {creative.format && <CreativeFormatBadge format={creative.format} />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#64748B]">Status</span>
                    <span className="text-xs text-[#10B981]">{creative.status}</span>
                  </div>
                  {creative.adomain?.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#64748B]">Domain</span>
                      <span className="text-xs text-[#94A3B8] font-mono">{creative.adomain[0]}</span>
                    </div>
                  )}
                  {creative.cat?.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#64748B]">Categories</span>
                      <span className="text-xs text-[#94A3B8] font-mono">{creative.cat.slice(0, 2).join(', ')}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-[#2D3B55] flex items-center justify-between">
                  <p className="text-[10px] text-[#64748B] font-mono truncate">ID: {creative.id}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setPreviewCreative(creative)}
                    className="text-[#3B82F6] hover:text-[#60A5FA] text-xs h-6 px-2"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
