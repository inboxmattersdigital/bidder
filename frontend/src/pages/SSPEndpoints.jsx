import { useEffect, useState } from "react";
import { 
  Plus, 
  Trash2, 
  Copy,
  Server,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
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
  getSSPEndpoints, 
  createSSPEndpoint, 
  deleteSSPEndpoint, 
  updateSSPStatus 
} from "../lib/api";

export default function SSPEndpoints() {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    ortb_version: "2.5"
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const fetchEndpoints = async () => {
    try {
      setLoading(true);
      const response = await getSSPEndpoints();
      setEndpoints(response.data);
    } catch (error) {
      toast.error("Failed to load SSP endpoints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const handleCreate = async () => {
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    
    try {
      await createSSPEndpoint(form);
      toast.success("SSP endpoint created");
      setShowCreate(false);
      setForm({ name: "", description: "", ortb_version: "2.5" });
      fetchEndpoints();
    } catch (error) {
      toast.error("Failed to create SSP endpoint");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSSPEndpoint(deleteId);
      toast.success("SSP endpoint deleted");
      setDeleteId(null);
      fetchEndpoints();
    } catch (error) {
      toast.error("Failed to delete SSP endpoint");
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await updateSSPStatus(id, newStatus);
      toast.success(`Endpoint ${newStatus}`);
      fetchEndpoints();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const formatNumber = (num) => num?.toLocaleString() || '0';

  return (
    <div className="p-6" data-testid="ssp-endpoints-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">SSP Endpoints</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Manage Supply-Side Platform integrations and bid endpoints</p>
        </div>
        <Button 
          onClick={() => setShowCreate(true)}
          className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white btn-press shadow-[0_0_10px_rgba(59,130,246,0.3)]"
          data-testid="create-ssp-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add SSP Endpoint
        </Button>
      </div>

      {/* Bid Endpoint Info */}
      <Card className="surface-primary border-panel mb-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-sm bg-[#3B82F6]/20 flex items-center justify-center">
              <Server className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[#F8FAFC] mb-1">Bid Request Endpoint</h3>
              <p className="text-xs text-[#94A3B8] mb-2">Send OpenRTB 2.5/2.6 bid requests to:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-[#020408] px-3 py-1.5 rounded text-[#3B82F6]">
                  POST {BACKEND_URL}/api/bid
                </code>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${BACKEND_URL}/api/bid`);
                    toast.success("Endpoint URL copied");
                  }}
                  className="text-[#64748B] hover:text-[#F8FAFC] p-1 h-auto"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-[#64748B] mt-2">
                <span className="text-[#10B981] font-semibold">No authentication required.</span> Optionally include <code className="text-[#10B981]">X-OpenRTB-Version: 2.6</code> for explicit version handling.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#64748B]">Loading endpoints...</div>
        </div>
      ) : endpoints.length === 0 ? (
        <Card className="surface-primary border-panel">
          <CardContent className="empty-state py-16">
            <Server className="empty-state-icon" />
            <h3 className="text-lg font-medium text-[#F8FAFC] mb-2">No SSP endpoints</h3>
            <p className="text-sm text-[#94A3B8] mb-4">Create an endpoint to start tracking SSP traffic</p>
            <Button 
              onClick={() => setShowCreate(true)}
              className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add SSP Endpoint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="ssp-endpoints-list">
          {endpoints.map((endpoint) => (
            <Card 
              key={endpoint.id} 
              className="surface-primary border-panel card-hover"
              data-testid={`ssp-endpoint-${endpoint.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-[#F8FAFC]">{endpoint.name}</h3>
                      <Badge 
                        variant="outline"
                        className={endpoint.status === "active" 
                          ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30" 
                          : "bg-[#64748B]/20 text-[#64748B] border-[#64748B]/30"
                        }
                      >
                        <span className={`status-dot ${endpoint.status === "active" ? 'status-active' : 'status-draft'} mr-1.5`}></span>
                        {endpoint.status}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className="bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/30"
                      >
                        ORTB {endpoint.ortb_version || "2.5"}
                      </Badge>
                    </div>
                    
                    {endpoint.description && (
                      <p className="text-xs text-[#64748B] mb-3">{endpoint.description}</p>
                    )}
                    
                    {/* Unique Endpoint URL with Token */}
                    <div className="flex items-center gap-2 mb-3 p-2 bg-[#020408] rounded">
                      <code className="text-xs font-mono text-[#10B981] flex-1">
                        POST {BACKEND_URL}/api/bid/{endpoint.endpoint_token || endpoint.id.substring(0, 16)}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`${BACKEND_URL}/api/bid/${endpoint.endpoint_token || endpoint.id.substring(0, 16)}`);
                          toast.success("Endpoint URL copied");
                        }}
                        className="text-[#64748B] hover:text-[#F8FAFC] p-1 h-auto"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mt-2 pt-2 border-t border-[#2D3B55]">
                      <div>
                        <p className="text-[10px] text-[#64748B] uppercase">Requests</p>
                        <p className="text-sm font-mono text-[#F8FAFC]">{formatNumber(endpoint.total_requests)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#64748B] uppercase">Bids</p>
                        <p className="text-sm font-mono text-[#3B82F6]">{formatNumber(endpoint.total_bids)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#64748B] uppercase">Wins</p>
                        <p className="text-sm font-mono text-[#10B981]">{formatNumber(endpoint.total_wins)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#64748B] uppercase">Spend</p>
                        <p className="text-sm font-mono text-[#F8FAFC]">${endpoint.total_spend?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleStatusToggle(endpoint.id, endpoint.status)}
                      className={endpoint.status === "active" 
                        ? "text-[#F59E0B] hover:bg-[#F59E0B]/10"
                        : "text-[#10B981] hover:bg-[#10B981]/10"
                      }
                    >
                      {endpoint.status === "active" ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setDeleteId(endpoint.id)}
                      className="text-[#EF4444] hover:bg-[#EF4444]/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="surface-primary border-panel">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">Add SSP Endpoint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="SSP Partner Name"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC] input-glow"
                data-testid="ssp-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC] input-glow"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">OpenRTB Version</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ortb_version"
                    value="2.5"
                    checked={form.ortb_version === "2.5"}
                    onChange={(e) => setForm(prev => ({ ...prev, ortb_version: e.target.value }))}
                    className="accent-[#3B82F6]"
                  />
                  <span className="text-[#F8FAFC]">OpenRTB 2.5</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ortb_version"
                    value="2.6"
                    checked={form.ortb_version === "2.6"}
                    onChange={(e) => setForm(prev => ({ ...prev, ortb_version: e.target.value }))}
                    className="accent-[#3B82F6]"
                  />
                  <span className="text-[#F8FAFC]">OpenRTB 2.6</span>
                </label>
              </div>
              <p className="text-xs text-[#64748B]">Select the protocol version the SSP will use</p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowCreate(false)}
              className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151F32]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white"
              data-testid="confirm-create-ssp-btn"
            >
              Create Endpoint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="surface-primary border-panel">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F8FAFC]">Delete SSP Endpoint</AlertDialogTitle>
            <AlertDialogDescription className="text-[#94A3B8]">
              Are you sure? This will remove this SSP endpoint and all its tracking data.
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
