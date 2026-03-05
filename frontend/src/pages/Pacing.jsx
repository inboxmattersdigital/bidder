import { useEffect, useState } from "react";
import { 
  Gauge, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  RotateCcw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
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
import { getPacingStatus, resetAllDailySpend, resetDailySpend } from "../lib/api";

function PacingStatusBadge({ status }) {
  const config = {
    on_track: { color: "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30", icon: CheckCircle, label: "On Track" },
    overpacing: { color: "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30", icon: TrendingUp, label: "Overpacing" },
    underpacing: { color: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30", icon: TrendingDown, label: "Underpacing" },
    unlimited: { color: "bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30", icon: Gauge, label: "Unlimited" }
  };
  
  const { color, icon: Icon, label } = config[status] || config.unlimited;
  
  return (
    <Badge variant="outline" className={`${color} font-medium`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

function CampaignPacingCard({ campaign, onReset }) {
  const progress = campaign.daily_budget > 0 
    ? (campaign.daily_spend / campaign.daily_budget) * 100 
    : 0;
  
  const progressColor = 
    campaign.pacing_status === "overpacing" ? "bg-[#EF4444]" :
    campaign.pacing_status === "underpacing" ? "bg-[#F59E0B]" :
    "bg-[#10B981]";
  
  return (
    <Card className="surface-primary border-panel card-hover" data-testid={`pacing-${campaign.campaign_id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#F8FAFC]">{campaign.campaign_name}</h3>
            <p className="text-xs text-[#64748B] font-mono mt-1">
              {campaign.hours_remaining}h remaining today
            </p>
          </div>
          <PacingStatusBadge status={campaign.pacing_status} />
        </div>
        
        {/* Budget Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-[#64748B]">Daily Budget Progress</span>
            <span className="text-[#F8FAFC] font-mono">
              ${campaign.daily_spend?.toFixed(2)} / ${campaign.daily_budget?.toFixed(2)}
            </span>
          </div>
          <div className="h-2 bg-[#151F32] rounded-full overflow-hidden">
            <div 
              className={`h-full ${progressColor} transition-all duration-300`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#64748B]">
            <span>Actual: {campaign.pacing_percentage?.toFixed(1)}%</span>
            <span>Ideal: {campaign.ideal_percentage?.toFixed(1)}%</span>
          </div>
        </div>
        
        {/* Bid Shading Info */}
        <div className="pt-3 border-t border-[#2D3B55] flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#64748B] uppercase">Bid Shading</p>
            {campaign.bid_shading_enabled ? (
              <p className="text-sm font-mono text-[#3B82F6]">
                {(campaign.current_shade_factor * 100).toFixed(0)}% of bid
              </p>
            ) : (
              <p className="text-sm text-[#64748B]">Disabled</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReset(campaign.campaign_id)}
            className="text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#151F32]"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Pacing() {
  const [loading, setLoading] = useState(true);
  const [pacingData, setPacingData] = useState(null);
  const [showResetAll, setShowResetAll] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getPacingStatus();
      setPacingData(response.data);
    } catch (error) {
      toast.error("Failed to load pacing status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleResetCampaign = async (campaignId) => {
    try {
      await resetDailySpend(campaignId);
      toast.success("Daily spend reset");
      fetchData();
    } catch (error) {
      toast.error("Failed to reset spend");
    }
  };

  const handleResetAll = async () => {
    try {
      await resetAllDailySpend();
      toast.success("All daily spends reset");
      setShowResetAll(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to reset all spends");
    }
  };

  const campaigns = pacingData?.campaigns || [];
  const overpacing = campaigns.filter(c => c.pacing_status === "overpacing");
  const underpacing = campaigns.filter(c => c.pacing_status === "underpacing");
  const onTrack = campaigns.filter(c => c.pacing_status === "on_track" || c.pacing_status === "unlimited");

  return (
    <div className="p-6" data-testid="pacing-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Budget Pacing</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Monitor and control campaign spend distribution
            {pacingData && (
              <span className="ml-2 text-[#64748B]">
                Current hour: {pacingData.current_hour}:00 UTC
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={fetchData}
            className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151F32]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => setShowResetAll(true)}
            className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white btn-press"
            data-testid="reset-all-btn"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All Daily
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#64748B]">Loading pacing status...</div>
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="surface-primary border-panel">
          <CardContent className="empty-state py-16">
            <Gauge className="empty-state-icon" />
            <h3 className="text-lg font-medium text-[#F8FAFC] mb-2">No active campaigns</h3>
            <p className="text-sm text-[#94A3B8]">Activate campaigns to monitor their pacing</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="surface-primary border-panel">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-[#10B981]/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#10B981]">{onTrack.length}</p>
                    <p className="text-xs text-[#64748B]">On Track / Unlimited</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="surface-primary border-panel">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-[#EF4444]/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#EF4444]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#EF4444]">{overpacing.length}</p>
                    <p className="text-xs text-[#64748B]">Overpacing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="surface-primary border-panel">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-[#F59E0B]/20 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-[#F59E0B]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#F59E0B]">{underpacing.length}</p>
                    <p className="text-xs text-[#64748B]">Underpacing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overpacing Alert */}
          {overpacing.length > 0 && (
            <Card className="surface-primary border-[#EF4444]/30 mb-6">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#EF4444] mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-[#EF4444]">Overpacing Alert</h4>
                    <p className="text-xs text-[#94A3B8] mt-1">
                      {overpacing.length} campaign(s) are spending faster than the daily budget allows. 
                      Consider pausing or reducing bid prices.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {overpacing.map(c => (
                        <Badge key={c.campaign_id} variant="outline" className="bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30">
                          {c.campaign_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaign Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map(campaign => (
              <CampaignPacingCard 
                key={campaign.campaign_id} 
                campaign={campaign}
                onReset={handleResetCampaign}
              />
            ))}
          </div>
        </>
      )}

      {/* Reset All Confirmation */}
      <AlertDialog open={showResetAll} onOpenChange={setShowResetAll}>
        <AlertDialogContent className="surface-primary border-panel">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F8FAFC]">Reset All Daily Spend</AlertDialogTitle>
            <AlertDialogDescription className="text-[#94A3B8]">
              This will reset the daily spend counter for all campaigns. Use this at the start of a new day or for testing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151F32]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetAll}
              className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white"
            >
              Reset All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
