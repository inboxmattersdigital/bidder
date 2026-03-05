import { useEffect, useState } from "react";
import { 
  GitBranch, Users, TrendingUp, DollarSign, Target,
  RefreshCw, ChevronRight, Search, Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import { getAttributionAnalysis, getUserJourney } from "../lib/api";

export default function Attribution() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState("last_touch");
  const [userId, setUserId] = useState("");
  const [userJourney, setUserJourney] = useState(null);

  useEffect(() => {
    fetchAnalysis();
  }, [model]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const res = await getAttributionAnalysis(model);
      setAnalysis(res.data);
    } catch (error) {
      toast.error("Failed to load attribution analysis");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserJourney = async () => {
    if (!userId.trim()) {
      toast.error("Enter a user ID");
      return;
    }
    try {
      const res = await getUserJourney(userId);
      setUserJourney(res.data);
    } catch (error) {
      toast.error("Failed to load user journey");
    }
  };

  const modelDescriptions = {
    first_touch: "100% credit to the first campaign touchpoint",
    last_touch: "100% credit to the last campaign before conversion",
    linear: "Equal credit distributed across all touchpoints",
    time_decay: "More credit to recent touchpoints (exponential decay)"
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[#64748B]">Loading attribution analysis...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="attribution-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Cross-Campaign Attribution</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Analyze campaign contribution to conversions
          </p>
        </div>
        <Button 
          onClick={fetchAnalysis}
          className="bg-[#3B82F6] hover:bg-[#60A5FA]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Model Selection */}
      <Card className="surface-primary border-panel">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm text-[#94A3B8] mb-2 block">Attribution Model</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-[200px] surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="surface-primary border-[#2D3B55]">
                  <SelectItem value="first_touch">First Touch</SelectItem>
                  <SelectItem value="last_touch">Last Touch</SelectItem>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="time_decay">Time Decay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#64748B]">{modelDescriptions[model]}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3B82F6]/20">
              <GitBranch className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Attribution Model</p>
              <p className="text-lg font-bold text-[#F8FAFC] capitalize">{model.replace("_", " ")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#10B981]/20">
              <Target className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Total Conversions</p>
              <p className="text-xl font-bold text-[#10B981]">{analysis?.total_conversions?.toFixed(0) || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#8B5CF6]/20">
              <DollarSign className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Total Value</p>
              <p className="text-xl font-bold text-[#8B5CF6]">${analysis?.total_value?.toFixed(2) || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <TrendingUp className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Campaigns</p>
              <p className="text-xl font-bold text-[#F8FAFC]">{analysis?.attribution?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attribution Results */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-lg text-[#F8FAFC]">Campaign Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis?.attribution?.length > 0 ? (
                <div className="space-y-3">
                  {analysis.attribution.map((campaign, idx) => (
                    <div key={campaign.campaign_id} className="p-3 surface-secondary rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] w-6 h-6 flex items-center justify-center p-0">
                            {idx + 1}
                          </Badge>
                          <span className="text-sm font-medium text-[#F8FAFC]">{campaign.campaign_name}</span>
                        </div>
                        <Badge variant="outline" className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30">
                          {campaign.attribution_share}% share
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                          <p className="text-[10px] text-[#64748B] uppercase">Conversions</p>
                          <p className="text-sm font-mono text-[#F8FAFC]">{campaign.attributed_conversions?.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#64748B] uppercase">Value</p>
                          <p className="text-sm font-mono text-[#10B981]">${campaign.attributed_value?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#64748B] uppercase">Share</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-[#2D3B55] rounded-full h-2">
                              <div 
                                className="bg-[#3B82F6] h-2 rounded-full"
                                style={{ width: `${campaign.attribution_share}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GitBranch className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
                  <p className="text-[#F8FAFC]">No attribution data available</p>
                  <p className="text-sm text-[#64748B]">Track conversion events to see attribution</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Journey Lookup */}
        <div className="space-y-4">
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#F59E0B]" />
                User Journey
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user ID"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC] flex-1"
                />
                <Button 
                  onClick={fetchUserJourney}
                  className="bg-[#3B82F6] hover:bg-[#60A5FA]"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              
              {userJourney && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B]">Campaigns touched:</span>
                    <span className="text-[#F8FAFC] font-medium">{userJourney.campaigns_touched}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B]">Total events:</span>
                    <span className="text-[#F8FAFC] font-medium">{userJourney.total_events}</span>
                  </div>
                  
                  {userJourney.journey?.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p className="text-xs text-[#64748B]">Journey Timeline</p>
                      {userJourney.journey.map((event, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 surface-secondary rounded">
                          <div className={`w-2 h-2 rounded-full ${
                            event.event_type === "conversion" ? "bg-[#10B981]" :
                            event.event_type === "click" ? "bg-[#3B82F6]" :
                            "bg-[#64748B]"
                          }`} />
                          <div className="flex-1">
                            <p className="text-xs text-[#F8FAFC]">{event.campaign_name}</p>
                            <p className="text-[10px] text-[#64748B]">{event.event_type}</p>
                          </div>
                          <ChevronRight className="w-3 h-3 text-[#64748B]" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* First/Last Touch Info */}
          {userJourney?.first_touch && (
            <Card className="surface-primary border-panel border-[#10B981]/30">
              <CardContent className="p-4">
                <p className="text-xs text-[#64748B] mb-2">First Touch</p>
                <p className="text-sm text-[#F8FAFC]">{userJourney.first_touch.campaign_name}</p>
                <p className="text-xs text-[#10B981] mt-1">{userJourney.first_touch.event_type}</p>
              </CardContent>
            </Card>
          )}
          {userJourney?.last_touch && (
            <Card className="surface-primary border-panel border-[#3B82F6]/30">
              <CardContent className="p-4">
                <p className="text-xs text-[#64748B] mb-2">Last Touch</p>
                <p className="text-sm text-[#F8FAFC]">{userJourney.last_touch.campaign_name}</p>
                <p className="text-xs text-[#3B82F6] mt-1">{userJourney.last_touch.event_type}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
