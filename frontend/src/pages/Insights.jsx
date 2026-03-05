import { useEffect, useState } from "react";
import { 
  AlertTriangle, CheckCircle, AlertCircle, TrendingUp, TrendingDown,
  Zap, Brain, Shield, DollarSign, Target, RefreshCw, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { getCampaignInsights, applyRecommendation } from "../lib/api";

export default function Insights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState({});

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await getCampaignInsights();
      setInsights(res.data);
    } catch (error) {
      toast.error("Failed to load insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleApplyRecommendation = async (campaignId, action) => {
    try {
      setApplying(prev => ({ ...prev, [`${campaignId}-${action}`]: true }));
      const res = await applyRecommendation(campaignId, action);
      toast.success(res.data.message);
      fetchInsights();
    } catch (error) {
      toast.error("Failed to apply recommendation");
    } finally {
      setApplying(prev => ({ ...prev, [`${campaignId}-${action}`]: false }));
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-5 h-5 text-[#10B981]" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />;
      case "critical":
        return <AlertCircle className="w-5 h-5 text-[#EF4444]" />;
      default:
        return null;
    }
  };

  const getHealthColor = (status) => {
    switch (status) {
      case "healthy": return "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30";
      case "warning": return "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30";
      case "critical": return "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30";
      default: return "";
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "increase_bid":
      case "reduce_bid":
        return <DollarSign className="w-4 h-4" />;
      case "enable_shading":
        return <TrendingDown className="w-4 h-4" />;
      case "enable_ml":
        return <Brain className="w-4 h-4" />;
      case "enable_spo":
        return <Shield className="w-4 h-4" />;
      case "expand_targeting":
        return <Target className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[#64748B]">Analyzing campaigns...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="insights-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Campaign Insights</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            AI-powered analysis and recommendations for your campaigns
          </p>
        </div>
        <Button 
          onClick={fetchInsights}
          className="bg-[#3B82F6] hover:bg-[#60A5FA]"
          data-testid="refresh-insights-btn"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Health Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3B82F6]/20">
              <Target className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Total Campaigns</p>
              <p className="text-xl font-bold text-[#F8FAFC]">{insights?.total_campaigns || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#10B981]/20">
              <CheckCircle className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Healthy</p>
              <p className="text-xl font-bold text-[#10B981]">{insights?.overall_health?.healthy || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Warning</p>
              <p className="text-xl font-bold text-[#F59E0B]">{insights?.overall_health?.warning || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#EF4444]/20">
              <AlertCircle className="w-5 h-5 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Critical</p>
              <p className="text-xl font-bold text-[#EF4444]">{insights?.overall_health?.critical || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Insights List */}
      <div className="space-y-4">
        {insights?.insights?.map((insight) => (
          <Card 
            key={insight.campaign_id} 
            className={`surface-primary border-panel ${insight.health_status === "critical" ? "border-[#EF4444]/50" : ""}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getHealthIcon(insight.health_status)}
                  <div>
                    <CardTitle className="text-lg text-[#F8FAFC]">{insight.campaign_name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getHealthColor(insight.health_status)}>
                        {insight.health_status.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-[#64748B] border-[#2D3B55]">
                        Score: {insight.health_score}/100
                      </Badge>
                      <Badge variant="outline" className="text-[#64748B] border-[#2D3B55]">
                        {insight.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="text-[#F8FAFC] font-mono">{insight.metrics.win_rate}% win rate</p>
                  <p className="text-[#64748B]">{insight.metrics.bids} bids / {insight.metrics.wins} wins</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metrics Row */}
              <div className="grid grid-cols-5 gap-3">
                <div className="surface-secondary p-3 rounded">
                  <p className="text-xs text-[#64748B]">Impressions</p>
                  <p className="text-lg font-mono text-[#F8FAFC]">{insight.metrics.impressions.toLocaleString()}</p>
                </div>
                <div className="surface-secondary p-3 rounded">
                  <p className="text-xs text-[#64748B]">Clicks</p>
                  <p className="text-lg font-mono text-[#F8FAFC]">{insight.metrics.clicks.toLocaleString()}</p>
                </div>
                <div className="surface-secondary p-3 rounded">
                  <p className="text-xs text-[#64748B]">CTR</p>
                  <p className="text-lg font-mono text-[#F8FAFC]">{insight.metrics.ctr}%</p>
                </div>
                <div className="surface-secondary p-3 rounded">
                  <p className="text-xs text-[#64748B]">Daily Spend</p>
                  <p className="text-lg font-mono text-[#10B981]">${insight.metrics.daily_spend.toFixed(2)}</p>
                </div>
                <div className="surface-secondary p-3 rounded">
                  <p className="text-xs text-[#64748B]">Budget Used</p>
                  <p className="text-lg font-mono text-[#F8FAFC]">{insight.metrics.budget_utilization}%</p>
                </div>
              </div>

              {/* Issues */}
              {insight.issues.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#F8FAFC]">Issues Detected</p>
                  <div className="space-y-1">
                    {insight.issues.map((issue, idx) => (
                      <div 
                        key={idx} 
                        className={`p-2 rounded text-sm flex items-start gap-2 ${
                          issue.type === "critical" ? "bg-[#EF4444]/10 text-[#EF4444]" :
                          issue.type === "warning" ? "bg-[#F59E0B]/10 text-[#F59E0B]" :
                          "bg-[#3B82F6]/10 text-[#3B82F6]"
                        }`}
                      >
                        {issue.type === "critical" ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                         issue.type === "warning" ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                         <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        <div>
                          <p>{issue.message}</p>
                          <p className="text-xs opacity-70">{issue.impact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {insight.recommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#F8FAFC]">Recommendations</p>
                  <div className="flex flex-wrap gap-2">
                    {insight.recommendations.map((rec, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleApplyRecommendation(insight.campaign_id, rec.action)}
                        disabled={applying[`${insight.campaign_id}-${rec.action}`]}
                        className={`border-[#2D3B55] hover:bg-[#151F32] ${
                          rec.priority === "high" ? "text-[#EF4444] hover:text-[#EF4444]" :
                          rec.priority === "medium" ? "text-[#F59E0B] hover:text-[#F59E0B]" :
                          "text-[#94A3B8]"
                        }`}
                        data-testid={`apply-${rec.action}-btn`}
                      >
                        {getActionIcon(rec.action)}
                        <span className="ml-2">{rec.message}</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {insight.issues.length === 0 && insight.recommendations.length === 0 && (
                <div className="p-4 surface-secondary rounded text-center">
                  <CheckCircle className="w-8 h-8 text-[#10B981] mx-auto mb-2" />
                  <p className="text-[#10B981] font-medium">Campaign is performing well!</p>
                  <p className="text-sm text-[#64748B]">No issues or recommendations at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {insights?.insights?.length === 0 && (
          <Card className="surface-primary border-panel">
            <CardContent className="p-8 text-center">
              <Target className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
              <p className="text-[#F8FAFC] font-medium">No campaigns to analyze</p>
              <p className="text-sm text-[#64748B]">Create some campaigns to see insights and recommendations.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
