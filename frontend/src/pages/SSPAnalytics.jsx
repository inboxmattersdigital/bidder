import { useEffect, useState } from "react";
import { 
  BarChart3, TrendingUp, Clock, DollarSign, Zap, Server,
  RefreshCw, ChevronRight, Activity, Award
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { getSSPAnalyticsOverview, getSSPAnalyticsDetails } from "../lib/api";

export default function SSPAnalytics() {
  const [overview, setOverview] = useState(null);
  const [selectedSSP, setSelectedSSP] = useState(null);
  const [sspDetails, setSSPDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await getSSPAnalyticsOverview();
      setOverview(res.data);
    } catch (error) {
      toast.error("Failed to load SSP analytics");
    } finally {
      setLoading(false);
    }
  };

  const fetchSSPDetails = async (sspId) => {
    try {
      setSelectedSSP(sspId);
      const res = await getSSPAnalyticsDetails(sspId);
      setSSPDetails(res.data);
    } catch (error) {
      toast.error("Failed to load SSP details");
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[#64748B]">Loading SSP analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="ssp-analytics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">SSP Performance Analytics</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Monitor and analyze SSP performance metrics
          </p>
        </div>
        <Button 
          onClick={fetchOverview}
          className="bg-[#3B82F6] hover:bg-[#60A5FA]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="surface-primary border-panel">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#3B82F6]/20">
                <Server className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Total SSPs</p>
                <p className="text-xl font-bold text-[#F8FAFC]">{overview.overview.total_ssps}</p>
                <p className="text-xs text-[#10B981]">{overview.overview.active_ssps} active</p>
              </div>
            </CardContent>
          </Card>
          <Card className="surface-primary border-panel">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#10B981]/20">
                <Zap className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Total Requests</p>
                <p className="text-xl font-bold text-[#F8FAFC]">{overview.overview.total_requests?.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="surface-primary border-panel">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#F59E0B]/20">
                <TrendingUp className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Overall Win Rate</p>
                <p className="text-xl font-bold text-[#F8FAFC]">{overview.overview.overall_win_rate}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="surface-primary border-panel">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#8B5CF6]/20">
                <DollarSign className="w-5 h-5 text-[#8B5CF6]" />
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Total Spend</p>
                <p className="text-xl font-bold text-[#F8FAFC]">${overview.overview.total_spend?.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* SSP Rankings */}
        <div className="col-span-2 space-y-4">
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#3B82F6]" />
                SSP Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2D3B55]">
                      <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">SSP</th>
                      <th className="text-right py-2 px-3 text-xs text-[#64748B] font-medium">Requests</th>
                      <th className="text-right py-2 px-3 text-xs text-[#64748B] font-medium">Bids</th>
                      <th className="text-right py-2 px-3 text-xs text-[#64748B] font-medium">Win Rate</th>
                      <th className="text-right py-2 px-3 text-xs text-[#64748B] font-medium">Spend</th>
                      <th className="text-right py-2 px-3 text-xs text-[#64748B] font-medium">Avg Latency</th>
                      <th className="text-center py-2 px-3 text-xs text-[#64748B] font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview?.ssp_rankings?.map((ssp, idx) => (
                      <tr 
                        key={ssp.id} 
                        className={`border-b border-[#2D3B55]/30 cursor-pointer hover:bg-[#151F32] ${
                          selectedSSP === ssp.id ? "bg-[#3B82F6]/10" : ""
                        }`}
                        onClick={() => fetchSSPDetails(ssp.id)}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {idx < 3 && (
                              <Badge className={`w-5 h-5 flex items-center justify-center p-0 ${
                                idx === 0 ? "bg-[#F59E0B]/20 text-[#F59E0B]" :
                                idx === 1 ? "bg-[#94A3B8]/20 text-[#94A3B8]" :
                                "bg-[#CD7F32]/20 text-[#CD7F32]"
                              }`}>
                                {idx + 1}
                              </Badge>
                            )}
                            <span className="text-sm text-[#F8FAFC]">{ssp.name}</span>
                            <Badge 
                              variant="outline" 
                              className={ssp.status === "active" 
                                ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 text-[9px]" 
                                : "bg-[#64748B]/10 text-[#64748B] border-[#64748B]/30 text-[9px]"
                              }
                            >
                              {ssp.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-sm font-mono text-[#F8FAFC]">
                          {ssp.requests?.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-sm font-mono text-[#3B82F6]">
                          {ssp.bids?.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`text-sm font-mono ${
                            ssp.win_rate >= 30 ? "text-[#10B981]" :
                            ssp.win_rate >= 15 ? "text-[#F59E0B]" :
                            "text-[#EF4444]"
                          }`}>
                            {ssp.win_rate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-sm font-mono text-[#F8FAFC]">
                          ${ssp.spend?.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right text-sm font-mono text-[#94A3B8]">
                          {ssp.avg_response_time_ms?.toFixed(0) || 0}ms
                        </td>
                        <td className="py-3 px-3 text-center">
                          <ChevronRight className="w-4 h-4 text-[#64748B]" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers & Details */}
        <div className="space-y-4">
          {/* Top Performers */}
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#F59E0B]" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-[#64748B] mb-2">By Win Rate</p>
                {overview?.top_performers?.by_win_rate?.slice(0, 3).map((ssp, idx) => (
                  <div key={ssp.id} className="flex items-center justify-between py-1">
                    <span className="text-sm text-[#F8FAFC]">{ssp.name}</span>
                    <span className="text-sm font-mono text-[#10B981]">{ssp.win_rate}%</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-[#64748B] mb-2">By Spend</p>
                {overview?.top_performers?.by_spend?.slice(0, 3).map((ssp, idx) => (
                  <div key={ssp.id} className="flex items-center justify-between py-1">
                    <span className="text-sm text-[#F8FAFC]">{ssp.name}</span>
                    <span className="text-sm font-mono text-[#8B5CF6]">${ssp.spend?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected SSP Details */}
          {sspDetails && (
            <Card className="surface-primary border-panel border-[#3B82F6]/30">
              <CardHeader>
                <CardTitle className="text-base text-[#F8FAFC]">{sspDetails.ssp?.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 surface-secondary rounded">
                    <p className="text-[10px] text-[#64748B] uppercase">Bid Rate</p>
                    <p className="text-lg font-bold text-[#3B82F6]">{sspDetails.metrics?.bid_rate}%</p>
                  </div>
                  <div className="p-2 surface-secondary rounded">
                    <p className="text-[10px] text-[#64748B] uppercase">Win Rate</p>
                    <p className="text-lg font-bold text-[#10B981]">{sspDetails.metrics?.win_rate}%</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-[#64748B] mb-2">Response Time</p>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#94A3B8]">Avg: {sspDetails.response_time_stats?.avg}ms</span>
                    <span className="text-[#64748B]">Max: {sspDetails.response_time_stats?.max}ms</span>
                  </div>
                  <Progress 
                    value={Math.min((sspDetails.response_time_stats?.avg / 100) * 100, 100)} 
                    className="h-1"
                  />
                </div>

                {sspDetails.campaign_distribution?.length > 0 && (
                  <div>
                    <p className="text-xs text-[#64748B] mb-2">Campaign Distribution</p>
                    {sspDetails.campaign_distribution.slice(0, 3).map((camp, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1">
                        <span className="text-xs text-[#F8FAFC] truncate max-w-[120px]">{camp.name}</span>
                        <span className="text-xs font-mono text-[#94A3B8]">{camp.bids} bids</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
