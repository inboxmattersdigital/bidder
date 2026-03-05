import { useEffect, useState } from "react";
import { 
  Users, Plus, Trash2, RefreshCw, Settings, Target,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
import { getAudiences, createAudience, deleteAudience } from "../lib/api";

export default function Audiences() {
  const [audiences, setAudiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    rules: {
      geo_countries: [],
      device_types: [],
      min_frequency: 1,
      categories: []
    }
  });

  useEffect(() => {
    fetchAudiences();
  }, []);

  const fetchAudiences = async () => {
    try {
      setLoading(true);
      const res = await getAudiences();
      setAudiences(res.data.audiences || []);
    } catch (error) {
      toast.error("Failed to load audiences");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    
    try {
      await createAudience(form.name, form.description, form.rules);
      toast.success("Audience created");
      setShowCreate(false);
      setForm({ name: "", description: "", rules: { geo_countries: [], device_types: [], min_frequency: 1, categories: [] }});
      fetchAudiences();
    } catch (error) {
      toast.error("Failed to create audience");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAudience(deleteId);
      toast.success("Audience deleted");
      setDeleteId(null);
      fetchAudiences();
    } catch (error) {
      toast.error("Failed to delete audience");
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[#64748B]">Loading audiences...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="audiences-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Audience Segments</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Create and manage custom audience segments for targeting
          </p>
        </div>
        <Button 
          onClick={() => setShowCreate(true)}
          className="bg-[#10B981] hover:bg-[#34D399]"
          data-testid="create-audience-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Audience
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#10B981]/20">
              <Users className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Total Audiences</p>
              <p className="text-xl font-bold text-[#F8FAFC]">{audiences.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3B82F6]/20">
              <Target className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Active Segments</p>
              <p className="text-xl font-bold text-[#3B82F6]">
                {audiences.filter(a => a.status === "active").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <Settings className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Total Reach</p>
              <p className="text-xl font-bold text-[#F8FAFC]">
                {audiences.reduce((sum, a) => sum + (a.size || 0), 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audiences Grid */}
      <div className="grid grid-cols-3 gap-4">
        {audiences.length === 0 ? (
          <Card className="surface-primary border-panel col-span-3">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
              <p className="text-[#F8FAFC] font-medium">No audience segments yet</p>
              <p className="text-sm text-[#64748B]">Create your first audience to start targeting</p>
            </CardContent>
          </Card>
        ) : (
          audiences.map(audience => (
            <Card key={audience.id} className="surface-primary border-panel">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#10B981]" />
                    <h3 className="font-medium text-[#F8FAFC]">{audience.name}</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setDeleteId(audience.id)}
                    className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                {audience.description && (
                  <p className="text-xs text-[#94A3B8] mb-3">{audience.description}</p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B]">Status</span>
                    <Badge variant="outline" className={
                      audience.status === "active" 
                        ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30"
                        : "bg-[#64748B]/20 text-[#64748B] border-[#64748B]/30"
                    }>
                      {audience.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B]">Estimated Size</span>
                    <span className="text-[#F8FAFC] font-mono">{(audience.size || 0).toLocaleString()}</span>
                  </div>
                </div>
                
                {audience.rules && Object.keys(audience.rules).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#2D3B55]">
                    <p className="text-xs text-[#64748B] mb-2">Rules</p>
                    <div className="flex flex-wrap gap-1">
                      {audience.rules.geo_countries?.length > 0 && (
                        <Badge variant="outline" className="text-[9px] text-[#3B82F6] border-[#3B82F6]/30">
                          {audience.rules.geo_countries.length} countries
                        </Badge>
                      )}
                      {audience.rules.device_types?.length > 0 && (
                        <Badge variant="outline" className="text-[9px] text-[#F59E0B] border-[#F59E0B]/30">
                          {audience.rules.device_types.length} device types
                        </Badge>
                      )}
                      {audience.rules.categories?.length > 0 && (
                        <Badge variant="outline" className="text-[9px] text-[#10B981] border-[#10B981]/30">
                          {audience.rules.categories.length} categories
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="surface-primary border-panel max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">Create Audience Segment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., High-Value Mobile Users"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this audience segment"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Target Countries (comma-separated)</Label>
              <Input
                value={form.rules.geo_countries.join(", ")}
                onChange={(e) => setForm(prev => ({ 
                  ...prev, 
                  rules: { 
                    ...prev.rules, 
                    geo_countries: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                  }
                }))}
                placeholder="USA, GBR, CAN"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">IAB Categories (comma-separated)</Label>
              <Input
                value={form.rules.categories.join(", ")}
                onChange={(e) => setForm(prev => ({ 
                  ...prev, 
                  rules: { 
                    ...prev.rules, 
                    categories: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                  }
                }))}
                placeholder="IAB1, IAB9, IAB17"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC] font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-[#2D3B55]">
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-[#10B981] hover:bg-[#34D399]">
              Create Audience
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="surface-primary border-panel">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F8FAFC]">Delete Audience</AlertDialogTitle>
            <AlertDialogDescription className="text-[#94A3B8]">
              Are you sure you want to delete this audience segment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2D3B55] text-[#94A3B8]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#EF4444] hover:bg-[#F87171]">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
