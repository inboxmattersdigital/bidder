import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, Play, Pause, Trash2, Edit, MoreVertical, Target, DollarSign,
  Copy, CheckSquare, Square, ArrowUpDown, ArrowUp, ArrowDown, 
  ChevronDown, Filter, X
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { 
  getCampaigns, deleteCampaign, activateCampaign, pauseCampaign,
  duplicateCampaign, bulkActivateCampaigns, bulkPauseCampaigns, bulkDeleteCampaigns
} from "../lib/api";

// Status Badge Component
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

// Sortable Column Header Component
function SortableHeader({ label, sortKey, currentSort, onSort }) {
  const isActive = currentSort.key === sortKey;
  const isAsc = currentSort.direction === "asc";
  
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#F8FAFC] transition-colors group"
    >
      {label}
      <span className="opacity-50 group-hover:opacity-100">
        {isActive ? (
          isAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3" />
        )}
      </span>
    </button>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [sort, setSort] = useState({ key: "created_at", direction: "desc" });

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

  // Sorted campaigns
  const sortedCampaigns = useMemo(() => {
    const sorted = [...campaigns].sort((a, b) => {
      let aVal, bVal;
      
      switch (sort.key) {
        case "name":
          aVal = a.name?.toLowerCase() || "";
          bVal = b.name?.toLowerCase() || "";
          break;
        case "status":
          aVal = a.status || "";
          bVal = b.status || "";
          break;
        case "bid_price":
          aVal = a.bid_price || 0;
          bVal = b.bid_price || 0;
          break;
        case "daily_budget":
          aVal = a.budget?.daily_budget || 0;
          bVal = b.budget?.daily_budget || 0;
          break;
        case "bids":
          aVal = a.bids || 0;
          bVal = b.bids || 0;
          break;
        case "wins":
          aVal = a.wins || 0;
          bVal = b.wins || 0;
          break;
        case "created_at":
        default:
          aVal = new Date(a.created_at || 0).getTime();
          bVal = new Date(b.created_at || 0).getTime();
          break;
      }
      
      if (typeof aVal === "string") {
        return sort.direction === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
    });
    
    return sorted;
  }, [campaigns, sort]);

  const handleSort = (key) => {
    setSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  // Selection handlers
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === campaigns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(campaigns.map(c => c.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Single campaign actions
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

  const handleDuplicate = async (id) => {
    try {
      const response = await duplicateCampaign(id);
      toast.success(`Campaign duplicated: ${response.data.name}`);
      fetchCampaigns();
    } catch (error) {
      toast.error("Failed to duplicate campaign");
    }
  };

  // Bulk actions
  const handleBulkActivate = async () => {
    try {
      const ids = Array.from(selectedIds);
      await bulkActivateCampaigns(ids);
      toast.success(`${ids.length} campaigns activated`);
      clearSelection();
      fetchCampaigns();
    } catch (error) {
      toast.error("Failed to activate campaigns");
    }
  };

  const handleBulkPause = async () => {
    try {
      const ids = Array.from(selectedIds);
      await bulkPauseCampaigns(ids);
      toast.success(`${ids.length} campaigns paused`);
      clearSelection();
      fetchCampaigns();
    } catch (error) {
      toast.error("Failed to pause campaigns");
    }
  };

  const handleBulkDelete = async () => {
    try {
      const ids = Array.from(selectedIds);
      await bulkDeleteCampaigns(ids);
      toast.success(`${ids.length} campaigns deleted`);
      clearSelection();
      setShowBulkDelete(false);
      fetchCampaigns();
    } catch (error) {
      toast.error("Failed to delete campaigns");
    }
  };

  const formatCurrency = (num) => `$${num?.toFixed(2) || '0.00'}`;
  const formatNumber = (num) => num?.toLocaleString() || '0';

  const isAllSelected = campaigns.length > 0 && selectedIds.size === campaigns.length;
  const isSomeSelected = selectedIds.size > 0;

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

      {/* Bulk Actions Bar */}
      {isSomeSelected && (
        <div className="mb-4 p-3 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-[#3B82F6]" />
            <span className="text-sm text-[#F8FAFC]">
              {selectedIds.size} campaign{selectedIds.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkActivate}
              className="border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10"
            >
              <Play className="w-3 h-3 mr-1" />
              Activate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkPause}
              className="border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10"
            >
              <Pause className="w-3 h-3 mr-1" />
              Pause
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBulkDelete(true)}
              className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearSelection}
              className="text-[#64748B] hover:text-[#F8FAFC]"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}

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
        <div className="space-y-2" data-testid="campaigns-list">
          {/* Table Header */}
          <div className="px-4 py-2 flex items-center gap-4 text-xs text-[#64748B]">
            <div className="w-8">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={toggleSelectAll}
                className="border-[#2D3B55] data-[state=checked]:bg-[#3B82F6] data-[state=checked]:border-[#3B82F6]"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <SortableHeader label="Name" sortKey="name" currentSort={sort} onSort={handleSort} />
            </div>
            <div className="w-24">
              <SortableHeader label="Status" sortKey="status" currentSort={sort} onSort={handleSort} />
            </div>
            <div className="w-24 text-right">
              <SortableHeader label="Bid Price" sortKey="bid_price" currentSort={sort} onSort={handleSort} />
            </div>
            <div className="w-28 text-right">
              <SortableHeader label="Daily Budget" sortKey="daily_budget" currentSort={sort} onSort={handleSort} />
            </div>
            <div className="w-20 text-right">
              <SortableHeader label="Bids" sortKey="bids" currentSort={sort} onSort={handleSort} />
            </div>
            <div className="w-20 text-right">
              <SortableHeader label="Wins" sortKey="wins" currentSort={sort} onSort={handleSort} />
            </div>
            <div className="w-32 text-right">Actions</div>
          </div>

          {/* Campaign Rows */}
          {sortedCampaigns.map((campaign) => (
            <Card 
              key={campaign.id} 
              className={`surface-primary border-panel card-hover transition-all ${
                selectedIds.has(campaign.id) ? 'ring-1 ring-[#3B82F6] bg-[#3B82F6]/5' : ''
              }`}
              data-testid={`campaign-${campaign.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <div className="w-8">
                    <Checkbox
                      checked={selectedIds.has(campaign.id)}
                      onCheckedChange={() => toggleSelect(campaign.id)}
                      className="border-[#2D3B55] data-[state=checked]:bg-[#3B82F6] data-[state=checked]:border-[#3B82F6]"
                    />
                  </div>
                  
                  {/* Name & ID */}
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-sm font-semibold text-[#F8FAFC]">{campaign.name}</h3>
                    <p className="text-xs text-[#64748B] mt-0.5 font-mono truncate">ID: {campaign.id}</p>
                  </div>
                  
                  {/* Status */}
                  <div className="w-24">
                    <StatusBadge status={campaign.status} />
                  </div>
                  
                  {/* Bid Price */}
                  <div className="w-24 text-right">
                    <p className="text-sm font-mono text-[#3B82F6]">{formatCurrency(campaign.bid_price)}</p>
                  </div>
                  
                  {/* Daily Budget */}
                  <div className="w-28 text-right">
                    <p className="text-sm font-mono text-[#F8FAFC]">{formatCurrency(campaign.budget?.daily_budget)}</p>
                  </div>
                  
                  {/* Bids */}
                  <div className="w-20 text-right">
                    <p className="text-sm font-mono text-[#F8FAFC]">{formatNumber(campaign.bids)}</p>
                  </div>
                  
                  {/* Wins */}
                  <div className="w-20 text-right">
                    <p className="text-sm font-mono text-[#10B981]">{formatNumber(campaign.wins)}</p>
                  </div>
                  
                  {/* Actions */}
                  <div className="w-32 flex items-center justify-end gap-1">
                    {campaign.status === "active" ? (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handlePause(campaign.id)}
                        className="h-8 w-8 p-0 text-[#F59E0B] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10"
                        title="Pause"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    ) : campaign.status !== "completed" && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleActivate(campaign.id)}
                        className="h-8 w-8 p-0 text-[#10B981] hover:text-[#10B981] hover:bg-[#10B981]/10"
                        title="Activate"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 text-[#64748B] hover:text-[#F8FAFC]"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end"
                        className="surface-primary border-panel w-40"
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
                          onClick={() => handleDuplicate(campaign.id)}
                          className="cursor-pointer"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[#2D3B55]" />
                        <DropdownMenuItem 
                          onClick={() => setDeleteId(campaign.id)}
                          className="text-[#EF4444] focus:text-[#EF4444] cursor-pointer"
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

      {/* Delete Confirmation Dialog (Single) */}
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

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent className="surface-primary border-panel">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F8FAFC]">Delete {selectedIds.size} Campaigns</AlertDialogTitle>
            <AlertDialogDescription className="text-[#94A3B8]">
              Are you sure you want to delete {selectedIds.size} campaign{selectedIds.size > 1 ? 's' : ''}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151F32]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-[#EF4444] hover:bg-[#EF4444]/90 text-white"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
