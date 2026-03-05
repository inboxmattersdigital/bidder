import { useEffect, useState } from "react";
import { 
  FlaskConical, Plus, Play, Pause, Trophy, BarChart2,
  ChevronRight, RefreshCw, Users, TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { toast } from "sonner";
import { getCampaigns, getABTests, createABTest, getABTest, updateABTestStatus } from "../lib/api";

export default function ABTesting() {
  const [tests, setTests] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  
  const [form, setForm] = useState({
    name: "",
    campaign_ids: [],
    traffic_split: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [testsRes, campaignsRes] = await Promise.all([
        getABTests(),
        getCampaigns()
      ]);
      setTests(testsRes.data.tests || []);
      setCampaigns(campaignsRes.data || []);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name || form.campaign_ids.length < 2) {
      toast.error("Name and at least 2 campaigns required");
      return;
    }
    
    try {
      // Default to equal split
      const split = form.traffic_split.length === form.campaign_ids.length 
        ? form.traffic_split 
        : form.campaign_ids.map(() => 100 / form.campaign_ids.length);
      
      await createABTest(form.name, form.campaign_ids, split);
      toast.success("A/B test created");
      setShowCreate(false);
      setForm({ name: "", campaign_ids: [], traffic_split: [] });
      fetchData();
    } catch (error) {
      toast.error("Failed to create test");
    }
  };

  const handleStatusChange = async (testId, status) => {
    try {
      await updateABTestStatus(testId, status);
      toast.success(`Test ${status}`);
      fetchData();
      if (selectedTest?.id === testId) {
        viewTestDetails(testId);
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const viewTestDetails = async (testId) => {
    try {
      const res = await getABTest(testId);
      setSelectedTest(res.data);
    } catch (error) {
      toast.error("Failed to load test details");
    }
  };

  const toggleCampaign = (id) => {
    if (form.campaign_ids.includes(id)) {
      setForm(prev => ({
        ...prev,
        campaign_ids: prev.campaign_ids.filter(x => x !== id),
        traffic_split: []
      }));
    } else if (form.campaign_ids.length < 4) {
      setForm(prev => ({
        ...prev,
        campaign_ids: [...prev.campaign_ids, id],
        traffic_split: []
      }));
    } else {
      toast.error("Maximum 4 campaigns per test");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30";
      case "paused": return "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30";
      case "completed": return "bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30";
      default: return "bg-[#64748B]/20 text-[#64748B] border-[#64748B]/30";
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[#64748B]">Loading A/B tests...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="ab-testing-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">A/B Testing</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Split test campaigns to find the best performer
          </p>
        </div>
        <Button 
          onClick={() => setShowCreate(true)}
          className="bg-[#8B5CF6] hover:bg-[#A78BFA]"
          data-testid="create-test-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create A/B Test
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#8B5CF6]/20">
              <FlaskConical className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Total Tests</p>
              <p className="text-xl font-bold text-[#F8FAFC]">{tests.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#10B981]/20">
              <Play className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Active</p>
              <p className="text-xl font-bold text-[#10B981]">
                {tests.filter(t => t.status === "active").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3B82F6]/20">
              <Trophy className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Completed</p>
              <p className="text-xl font-bold text-[#3B82F6]">
                {tests.filter(t => t.status === "completed").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <Users className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Campaigns in Tests</p>
              <p className="text-xl font-bold text-[#F8FAFC]">
                {tests.reduce((sum, t) => sum + (t.campaign_ids?.length || 0), 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tests List */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#F8FAFC]">Tests</h2>
          {tests.length === 0 ? (
            <Card className="surface-primary border-panel">
              <CardContent className="p-8 text-center">
                <FlaskConical className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
                <p className="text-[#F8FAFC] font-medium">No A/B tests yet</p>
                <p className="text-sm text-[#64748B]">Create your first test to compare campaigns</p>
              </CardContent>
            </Card>
          ) : (
            tests.map(test => (
              <Card 
                key={test.id} 
                className={`surface-primary border-panel cursor-pointer transition-all hover:border-[#3B82F6]/50 ${
                  selectedTest?.id === test.id ? "border-[#3B82F6]" : ""
                }`}
                onClick={() => viewTestDetails(test.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-[#8B5CF6]" />
                      <h3 className="font-medium text-[#F8FAFC]">{test.name}</h3>
                    </div>
                    <Badge variant="outline" className={getStatusColor(test.status)}>
                      {test.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[#64748B]">
                      {test.campaign_names?.join(" vs ")}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      Traffic: {test.traffic_split?.map(t => `${t}%`).join(" / ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {test.status === "active" ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(test.id, "paused"); }}
                        className="border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10"
                      >
                        <Pause className="w-3 h-3 mr-1" />
                        Pause
                      </Button>
                    ) : test.status === "paused" ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(test.id, "active"); }}
                        className="border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Resume
                      </Button>
                    ) : null}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); handleStatusChange(test.id, "completed"); }}
                      className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10"
                    >
                      <Trophy className="w-3 h-3 mr-1" />
                      Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Test Details */}
        <div>
          <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Test Details</h2>
          {selectedTest ? (
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">{selectedTest.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Traffic Split */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#94A3B8]">Traffic Split</p>
                  {selectedTest.campaign_names?.map((name, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#F8FAFC]">{name}</span>
                        <span className="text-[#94A3B8]">{selectedTest.traffic_split?.[idx]}%</span>
                      </div>
                      <Progress value={selectedTest.traffic_split?.[idx]} className="h-2" />
                    </div>
                  ))}
                </div>

                {/* Performance Stats */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#94A3B8]">Performance</p>
                  <div className="space-y-2">
                    {Object.entries(selectedTest.stats || {}).map(([cid, stats], idx) => (
                      <div 
                        key={cid} 
                        className={`p-3 rounded ${
                          selectedTest.winner === cid 
                            ? "bg-[#10B981]/10 border border-[#10B981]/30" 
                            : "surface-secondary"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-[#F8FAFC]">
                            {selectedTest.campaign_names?.[idx]}
                          </span>
                          {selectedTest.winner === cid && (
                            <Badge className="bg-[#10B981]/20 text-[#10B981]">
                              <Trophy className="w-3 h-3 mr-1" />
                              Leader
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-[#64748B]">Bids: </span>
                            <span className="text-[#F8FAFC] font-mono">{stats.bids || 0}</span>
                          </div>
                          <div>
                            <span className="text-[#64748B]">Wins: </span>
                            <span className="text-[#10B981] font-mono">{stats.wins || 0}</span>
                          </div>
                          <div>
                            <span className="text-[#64748B]">Win Rate: </span>
                            <span className="text-[#3B82F6] font-mono">{stats.win_rate || 0}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="surface-primary border-panel">
              <CardContent className="p-8 text-center">
                <BarChart2 className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
                <p className="text-[#64748B]">Select a test to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="surface-primary border-panel max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">Create A/B Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Test Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Q1 Banner Test"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Select Campaigns (2-4)</Label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {campaigns.map(c => (
                  <div 
                    key={c.id}
                    onClick={() => toggleCampaign(c.id)}
                    className={`p-2 rounded border cursor-pointer ${
                      form.campaign_ids.includes(c.id)
                        ? "border-[#8B5CF6] bg-[#8B5CF6]/10"
                        : "border-[#2D3B55] hover:border-[#8B5CF6]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#F8FAFC]">{c.name}</span>
                      <Checkbox checked={form.campaign_ids.includes(c.id)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-[#64748B]">
              Traffic will be split equally between selected campaigns by default.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-[#2D3B55]">
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-[#8B5CF6] hover:bg-[#A78BFA]">
              Create Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
