import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit,
  MoreVertical,
  Target,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
import { getCampaigns, deleteCampaign, activateCampaign, pauseCampaign } from "../lib/api";

function StatusBadge({ status }) {
  const variants = {
    active: "badge-success",
    paused: "badge-warning", 
    draft: "badge-neutral",
    completed: "badge-info",
    error: "badge-error"
  };
  
  return (
    <Badge 
      variant="outline" 
      className={`${variants[status] || variants.draft} font-medium uppercase text-[10px] tracking-wider px-2 py-0.5`}
    >
      <span className={`status-dot status-${status} mr-1.5`}></span>
      {status}
    </Badge>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await getCampaigns();
      setCampaigns(response.data);
    } catch (error) {
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleActivate = async (id) => {
    try {
      await activateCampaign(id);
      toast.success("Campaign activated");
      fetchCampaigns();
    } catch (error) {
      toast.error("Failed to activate campaign");
    }
  };

  const handlePause = async (id) => {
    try {
      await pauseCampaign(id);
      toast.success("Campaign paused");
      fetchCampaigns();
    } catch (error) {
      toast.error("Failed to pause campaign");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCampaign(deleteId);
      toast.success("Campaign deleted");
      setDeleteId(null);
      fetchCampaigns();
    } catch (error) {
      toast.error("Failed to delete campaign");
    }
  };

  const formatCurrency = (num) => `$${num?.toFixed(2) || '0.00'}`;
  const formatNumber = (num) => num?.toLocaleString() || '0';

  return (
    <div className="p-6" data-testid="campaigns-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Campaigns</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Manage your advertising campaigns</p>
        </div>
        <Link to="/campaigns/new">
          <Button 
            className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white btn-press shadow-[0_0_10px_rgba(59,130,246,0.3)]"
            data-testid="create-campaign-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#64748B]">Loading campaigns...</div>
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="surface-primary border-panel">
          <CardContent className="empty-state py-16">
            <Target className="empty-state-icon" />
            <h3 className="text-lg font-medium text-[#F8FAFC] mb-2">No campaigns yet</h3>
            <p className="text-sm text-[#94A3B8] mb-4">Create your first campaign to start bidding</p>
            <Link to="/campaigns/new">
              <Button className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="campaigns-list">
          {campaigns.map((campaign) => (
            <Card 
              key={campaign.id} 
              className="surface-primary border-panel card-hover"
              data-testid={`campaign-${campaign.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-[#F8FAFC]">{campaign.name}</h3>
                        <StatusBadge status={campaign.status} />
                      </div>
                      <p className="text-xs text-[#64748B] mt-1 font-mono">ID: {campaign.id}</p>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-8">
                      <div>
                        <p className="text-xs text-[#64748B]">Bid Price</p>
                        <p className="text-sm font-mono text-[#3B82F6]">{formatCurrency(campaign.bid_price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748B]">Daily Budget</p>
                        <p className="text-sm font-mono text-[#F8FAFC]">{formatCurrency(campaign.budget?.daily_budget)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748B]">Bids</p>
                        <p className="text-sm font-mono text-[#F8FAFC]">{formatNumber(campaign.bids)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748B]">Wins</p>
                        <p className="text-sm font-mono text-[#10B981]">{formatNumber(campaign.wins)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {campaign.status === "active" ? (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handlePause(campaign.id)}
                        className="text-[#F59E0B] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10"
                        data-testid={`pause-campaign-${campaign.id}`}
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    ) : campaign.status !== "completed" && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleActivate(campaign.id)}
                        className="text-[#10B981] hover:text-[#10B981] hover:bg-[#10B981]/10"
                        data-testid={`activate-campaign-${campaign.id}`}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-[#64748B] hover:text-[#F8FAFC]"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end"
                        className="surface-primary border-panel"
                      >
                        <DropdownMenuItem asChild>
                          <Link 
                            to={`/campaigns/${campaign.id}/edit`}
                            className="flex items-center cursor-pointer"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteId(campaign.id)}
                          className="text-[#EF4444] focus:text-[#EF4444]"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="surface-primary border-panel">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F8FAFC]">Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription className="text-[#94A3B8]">
              Are you sure you want to delete this campaign? This action cannot be undone.
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
