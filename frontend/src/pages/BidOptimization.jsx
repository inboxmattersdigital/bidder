import { useEffect, useState } from "react";
import { 
  TrendingUp, Play, Pause, Settings, History, Target,
  RefreshCw, Zap, DollarSign, AlertTriangle, CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Progress } from "../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { toast } from "sonner";
import { 
  getBidOptimizationStatus, 
  enableBidOptimization, 
  disableBidOptimization,
  runBidOptimization,
  getBidOptimizationHistory
} from "../lib/api";

export default function BidOptimization() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    targetWinRate: 30,
    autoAdjust: true
  });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await getBidOptimizationStatus();
      setStatus(res.data);
    } catch (error) {
      toast.error("Failed to load optimization status");
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (campaignId) => {
    try {
      await enableBidOptimization(campaignId, configForm.targetWinRate, configForm.autoAdjust);
      toast.success("Bid optimization enabled");
      setShowConfig(false);
      setSelectedCampaign(null);
      fetchStatus();
    } catch (error) {
      toast.error("Failed to enable optimization");
    }
  };

  const handleDisable = async (campaignId) => {
    try {
      await disableBidOptimization(campaignId);
      toast.success("Bid optimization disabled");
      fetchStatus();
    } catch (error) {
      toast.error("Failed to disable optimization");
    }
  };

  const handleRunOptimization = async (campaignId) => {
    try {
      const res = await runBidOptimization(campaignId);
      if (res.data.status === "adjusted") {
        toast.success(`Bid adjusted: $${res.data.old_bid} → $${res.data.new_bid}`);
      } else if (res.data.status === "no_change") {
        toast.info(res.data.reason);
      } else if (res.data.status === "skipped") {
        toast.warning(res.data.reason);
      } else {
        toast.info(`Recommendation: $${res.data.recommended_bid}`);
      }
      fetchStatus();
    } catch (error) {
      toast.error("Failed to run optimization");
    }
  };

  const fetchHistory = async (campaignId) => {
    try {
      const res = await getBidOptimizationHistory(campaignId);
      setHistory(res.data.history || []);
      setSelectedCampaign(campaignId);
    } catch (error) {
      toast.error("Failed to load history");
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[#64748B]">Loading optimization status...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="bid-optimization-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Automated Bid Optimization</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Auto-adjust bid prices based on win rate targets
          </p>
        </div>
        <Button 
          onClick={fetchStatus}
          className="bg-[#3B82F6] hover:bg-[#60A5FA]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3B82F6]/20">
              <Target className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Total Campaigns</p>
              <p className="text-xl font-bold text-[#F8FAFC]">{status?.total_campaigns}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#10B981]/20">
              <Zap className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Optimization Enabled</p>
              <p className="text-xl font-bold text-[#10B981]">{status?.optimization_enabled_count}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <TrendingUp className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Below Target</p>
              <p className="text-xl font-bold text-[#F59E0B]">
                {status?.campaigns?.filter(c => c.optimization_enabled && c.current_win_rate < c.target_win_rate - 5).length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#8B5CF6]/20">
              <CheckCircle className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">On Target</p>
              <p className="text-xl font-bold text-[#8B5CF6]">
                {status?.campaigns?.filter(c => c.optimization_enabled && Math.abs(c.current_win_rate - c.target_win_rate) <= 5).length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <Card className="surface-primary border-panel">
        <CardHeader>
          <CardTitle className="text-lg text-[#F8FAFC]">Campaign Optimization Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2D3B55]">
                  <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">Campaign</th>
                  <th className="text-center py-2 px-3 text-xs text-[#64748B] font-medium">Status</th>
                  <th className="text-right py-2 px-3 text-xs text-[#64748B] font-medium">Current Bid</th>
                  <th className="text-right py-2 px-3 text-xs text-[#64748B] font-medium">Win Rate</th>
                  <th className="text-right py-2 px-3 text-xs text-[#64748B] font-medium">Target</th>
                  <th className="text-center py-2 px-3 text-xs text-[#64748B] font-medium">Auto-Adjust</th>
                  <th className="text-center py-2 px-3 text-xs text-[#64748B] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {status?.campaigns?.map((campaign) => {
                  const winRateDiff = campaign.current_win_rate - campaign.target_win_rate;
                  const isOnTarget = Math.abs(winRateDiff) <= 5;
                  const isBelowTarget = winRateDiff < -5;
                  
                  return (
                    <tr key={campaign.campaign_id} className="border-b border-[#2D3B55]/30">
                      <td className="py-3 px-3">
                        <div>
                          <p className="text-sm text-[#F8FAFC]">{campaign.campaign_name}</p>
                          <Badge 
                            variant="outline" 
                            className={campaign.status === "active" 
                              ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 text-[9px] mt-1" 
                              : "bg-[#64748B]/10 text-[#64748B] border-[#64748B]/30 text-[9px] mt-1"
                            }
                          >
                            {campaign.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge 
                          variant="outline"
                          className={campaign.optimization_enabled 
                            ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30" 
                            : "bg-[#64748B]/20 text-[#64748B] border-[#64748B]/30"
                          }
                        >
                          {campaign.optimization_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-mono text-[#F8FAFC]">
                          ${campaign.bid_price?.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`text-sm font-mono ${
                          isOnTarget ? "text-[#10B981]" :
                          isBelowTarget ? "text-[#EF4444]" :
                          "text-[#F59E0B]"
                        }`}>
                          {campaign.current_win_rate}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-mono text-[#94A3B8]">
                          {campaign.target_win_rate || 30}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {campaign.optimization_enabled ? (
                          campaign.auto_adjust ? (
                            <Badge className="bg-[#10B981]/20 text-[#10B981]">Auto</Badge>
                          ) : (
                            <Badge className="bg-[#F59E0B]/20 text-[#F59E0B]">Manual</Badge>
                          )
                        ) : (
                          <span className="text-[#64748B]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          {campaign.optimization_enabled ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleRunOptimization(campaign.campaign_id)}
                                className="text-[#3B82F6] hover:bg-[#3B82F6]/10 p-1 h-auto"
                                title="Run Optimization"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => fetchHistory(campaign.campaign_id)}
                                className="text-[#94A3B8] hover:bg-[#94A3B8]/10 p-1 h-auto"
                                title="View History"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDisable(campaign.campaign_id)}
                                className="text-[#EF4444] hover:bg-[#EF4444]/10 p-1 h-auto"
                                title="Disable"
                              >
                                <Pause className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedCampaign(campaign.campaign_id);
                                setShowConfig(true);
                              }}
                              className="text-[#10B981] border-[#10B981] hover:bg-[#10B981]/10"
                            >
                              Enable
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* History Panel */}
      {selectedCampaign && history.length > 0 && (
        <Card className="surface-primary border-panel border-[#3B82F6]/30">
          <CardHeader>
            <CardTitle className="text-lg text-[#F8FAFC]">Optimization History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((entry, idx) => (
                <div key={idx} className="p-3 surface-secondary rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#64748B]">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <Badge className={entry.new_bid > entry.old_bid 
                      ? "bg-[#10B981]/20 text-[#10B981]" 
                      : "bg-[#EF4444]/20 text-[#EF4444]"
                    }>
                      {entry.new_bid > entry.old_bid ? "↑" : "↓"} 
                      {Math.abs(((entry.new_bid - entry.old_bid) / entry.old_bid) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-[#94A3B8]">${entry.old_bid?.toFixed(2)}</span>
                    <span className="text-[#64748B]">→</span>
                    <span className="text-[#F8FAFC] font-medium">${entry.new_bid?.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">{entry.reason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enable Configuration Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="surface-primary border-panel">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">Configure Bid Optimization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Target Win Rate (%)</Label>
              <Input
                type="number"
                min={5}
                max={80}
                value={configForm.targetWinRate}
                onChange={(e) => setConfigForm(prev => ({ ...prev, targetWinRate: parseInt(e.target.value) }))}
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
              />
              <p className="text-xs text-[#64748B]">Bid prices will be adjusted to achieve this win rate</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[#F8FAFC]">Auto-Adjust</Label>
                <p className="text-xs text-[#64748B]">Automatically apply bid changes</p>
              </div>
              <Switch
                checked={configForm.autoAdjust}
                onCheckedChange={(checked) => setConfigForm(prev => ({ ...prev, autoAdjust: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfig(false)} className="border-[#2D3B55]">
              Cancel
            </Button>
            <Button 
              onClick={() => handleEnable(selectedCampaign)}
              className="bg-[#10B981] hover:bg-[#10B981]/90"
            >
              Enable Optimization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
