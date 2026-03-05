import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Trash2, 
  Image, 
  Video, 
  FileText,
  MoreVertical
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
import { toast } from "sonner";
import { getCreatives, deleteCreative } from "../lib/api";

function CreativeTypeIcon({ type }) {
  const icons = {
    banner: Image,
    video: Video,
    native: FileText
  };
  const Icon = icons[type] || FileText;
  return <Icon className="w-5 h-5" />;
}

function CreativeTypeBadge({ type }) {
  const colors = {
    banner: "bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30",
    video: "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30",
    native: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30"
  };
  
  return (
    <Badge variant="outline" className={`${colors[type]} font-medium uppercase text-[10px] tracking-wider`}>
      {type}
    </Badge>
  );
}

export default function Creatives() {
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

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
                    <CreativeTypeBadge type={creative.type} />
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
                
                <div className="mt-3 pt-3 border-t border-[#2D3B55]">
                  <p className="text-[10px] text-[#64748B] font-mono truncate">ID: {creative.id}</p>
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
    </div>
  );
}
