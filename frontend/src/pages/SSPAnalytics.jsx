import { useEffect, useState } from "react";
import { 
  BarChart3, TrendingUp, Clock, DollarSign, Zap, Server,
  RefreshCw, ChevronRight, Activity, Award, ArrowUpRight,
  ArrowDownRight, Minus, AlertCircle, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { getSSPAnalyticsOverview, getSSPAnalyticsDetails, regenerateEndpointToken } from "../lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function SSPAnalytics() {
  const [overview, setOverview] = useState(null);
  const [selectedSSP, setSelectedSSP] = useState(null);
  const [sspDetails, setSSPDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await getSSPAnalyticsOverview();
      setOverview(res.data);
      
      // Auto-select first SSP if exists
      if (res.data?.ssp_rankings?.length > 0 && !selectedSSP) {
        fetchSSPDetails(res.data.ssp_rankings[0].id);
      }
    } catch (error) {
      toast.error("Failed to load SSP analytics");
    } finally {
      setLoading(false);
    }
  };

  const fetchSSPDetails = async (sspId) => {
    try {
      setSelectedSSP(sspId);
      setDetailsLoading(true);
      const res = await getSSPAnalyticsDetails(sspId);
      setSSPDetails(res.data);
    } catch (error) {
      toast.error("Failed to load SSP details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRegenerateToken = async (sspId) => {
    try {
      await regenerateEndpointToken(sspId);
      toast.success("Endpoint token regenerated");
      fetchSSPDetails(sspId);
    } catch (error) {
      toast.error("Failed to regenerate token");
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toLocaleString() || "0";
  };

  const getStatusIcon = (status) => {
    if (status === "active") return <CheckCircle2 className="w-4 h-4 text-[#10B981]" />;
    return <AlertCircle className="w-4 h-4 text-[#64748B]" />;
  };

  const getTrendIcon = (value, threshold = 0) => {
    if (value > threshold) return <ArrowUpRight className="w-4 h-4 text-[#10B981]" />;
    if (value < threshold) return <ArrowDownRight className="w-4 h-4 text-[#EF4444]" />;
    return <Minus className="w-4 h-4 text-[#64748B]" />;
  };

  // Prepare chart data
  const bidRateChartData = overview?.ssp_rankings?.map(ssp => ({
    name: ssp.name,
    bidRate: ssp.bid_rate,
    winRate: ssp.win_rate,
    requests: ssp.requests
  })) || [];

  const pieChartData = overview?.ssp_rankings?.map(ssp => ({
    name: ssp.name,
    value: ssp.requests
  })) || [];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6] mx-auto mb-4"></div>
          <div className="text-[#64748B]">Loading SSP analytics...</div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!overview?.ssp_rankings?.length) {
    return (
      <div className="p-6 space-y-6" data-testid="ssp-analytics-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#F8FAFC]">SSP Performance Analytics</h1>
            <p className="text-sm text-[#94A3B8] mt-1">Monitor and analyze SSP performance metrics</p>
          </div>
        </div>
        
        <Card className="surface-primary border-panel">
          <CardContent className="py-16 text-center">
            <Server className="w-16 h-16 mx-auto text-[#64748B] mb-4" />
            <h3 className="text-xl font-semibold text-[#F8FAFC] mb-2">No SSP Endpoints</h3>
            <p className="text-[#94A3B8] max-w-md mx-auto mb-4">
              Create SSP endpoints to start receiving bid requests and tracking performance metrics.
            </p>
            <Button 
              onClick={() => window.location.href = '/ssp-endpoints'}
              className="bg-[#3B82F6] hover:bg-[#2563EB]"
            >
              Manage SSP Endpoints
            </Button>
          </CardContent>
        </Card>
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
          data-testid="refresh-btn"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#3B82F6]/20">
                <Server className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Total SSPs</p>
                <p className="text-2xl font-bold text-[#F8FAFC]">{overview.overview.total_ssps}</p>
                <p className="text-xs text-[#10B981]">{overview.overview.active_ssps} active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#10B981]/20">
                <Zap className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Total Requests</p>
                <p className="text-2xl font-bold text-[#F8FAFC]">{formatNumber(overview.overview.total_requests)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#8B5CF6]/20">
                <BarChart3 className="w-5 h-5 text-[#8B5CF6]" />
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Bid Rate</p>
                <p className="text-2xl font-bold text-[#F8FAFC]">{overview.overview.overall_bid_rate?.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#F59E0B]/20">
                <TrendingUp className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Win Rate</p>
                <p className="text-2xl font-bold text-[#F8FAFC]">{overview.overview.overall_win_rate?.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#EC4899]/20">
                <DollarSign className="w-5 h-5 text-[#EC4899]" />
              </div>
              <div>
                <p className="text-xs text-[#64748B]">Total Spend</p>
                <p className="text-2xl font-bold text-[#F8FAFC]">${overview.overview.total_spend?.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Bid Rate Comparison */}
        <Card className="col-span-2 surface-primary border-panel">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#3B82F6]" />
              SSP Performance Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bidRateChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={{ stroke: '#1E293B' }} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={{ stroke: '#1E293B' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0A0F1C', 
                      border: '1px solid #2D3B55',
                      borderRadius: '8px',
                      color: '#F8FAFC'
                    }}
                    formatter={(value, name) => {
                      const label = name === 'bidRate' ? 'Bid Rate' : 'Win Rate';
                      return [`${value.toFixed(2)}%`, label];
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value) => <span className="text-[#94A3B8]">{value === 'bidRate' ? 'Bid Rate' : 'Win Rate'}</span>}
                  />
                  <Bar dataKey="bidRate" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="winRate" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Request Distribution Pie */}
        <Card className="surface-primary border-panel">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#8B5CF6]" />
              Request Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0A0F1C', 
                      border: '1px solid #2D3B55',
                      borderRadius: '8px',
                      color: '#F8FAFC'
                    }}
                    formatter={(value) => [`${value} requests`, 'Requests']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* SSP Table */}
        <div className="col-span-2">
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
                <Server className="w-5 h-5 text-[#3B82F6]" />
                SSP Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2D3B55]">
                      <th className="text-left py-3 px-3 text-xs text-[#64748B] font-medium">SSP</th>
                      <th className="text-right py-3 px-3 text-xs text-[#64748B] font-medium">Requests</th>
                      <th className="text-right py-3 px-3 text-xs text-[#64748B] font-medium">Bids</th>
                      <th className="text-right py-3 px-3 text-xs text-[#64748B] font-medium">Bid Rate</th>
                      <th className="text-right py-3 px-3 text-xs text-[#64748B] font-medium">Win Rate</th>
                      <th className="text-right py-3 px-3 text-xs text-[#64748B] font-medium">Latency</th>
                      <th className="text-center py-3 px-3 text-xs text-[#64748B] font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview?.ssp_rankings?.map((ssp, idx) => (
                      <tr 
                        key={ssp.id} 
                        data-testid={`ssp-row-${ssp.id}`}
                        className={`border-b border-[#2D3B55]/30 cursor-pointer transition-colors hover:bg-[#151F32] ${
                          selectedSSP === ssp.id ? "bg-[#3B82F6]/10" : ""
                        }`}
                        onClick={() => fetchSSPDetails(ssp.id)}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {idx < 3 && (
                              <Badge className={`w-6 h-6 flex items-center justify-center p-0 text-xs ${
                                idx === 0 ? "bg-[#F59E0B]/20 text-[#F59E0B]" :
                                idx === 1 ? "bg-[#94A3B8]/20 text-[#94A3B8]" :
                                "bg-[#CD7F32]/20 text-[#CD7F32]"
                              }`}>
                                {idx + 1}
                              </Badge>
                            )}
                            <div>
                              <span className="text-sm font-medium text-[#F8FAFC]">{ssp.name}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                {getStatusIcon(ssp.status)}
                                <span className="text-[10px] text-[#64748B]">{ssp.status}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="text-sm font-mono text-[#F8FAFC]">{formatNumber(ssp.requests)}</span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="text-sm font-mono text-[#3B82F6]">{formatNumber(ssp.bids)}</span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-sm font-mono text-[#F8FAFC]">{ssp.bid_rate?.toFixed(1)}%</span>
                            {getTrendIcon(ssp.bid_rate, 5)}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`text-sm font-mono ${
                            ssp.win_rate >= 30 ? "text-[#10B981]" :
                            ssp.win_rate >= 15 ? "text-[#F59E0B]" :
                            "text-[#64748B]"
                          }`}>
                            {ssp.win_rate?.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`text-sm font-mono ${
                            (ssp.avg_response_time_ms || 0) < 50 ? "text-[#10B981]" :
                            (ssp.avg_response_time_ms || 0) < 100 ? "text-[#F59E0B]" :
                            "text-[#EF4444]"
                          }`}>
                            {(ssp.avg_response_time_ms || 0).toFixed(0)}ms
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <ChevronRight className={`w-4 h-4 transition-colors ${
                            selectedSSP === ssp.id ? "text-[#3B82F6]" : "text-[#64748B]"
                          }`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SSP Details Panel */}
        <div className="space-y-4">
          {/* Top Performers */}
          <Card className="surface-primary border-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#F59E0B]" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="requests" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-8 bg-[#0A0F1C]">
                  <TabsTrigger value="requests" className="text-xs data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">Requests</TabsTrigger>
                  <TabsTrigger value="winrate" className="text-xs data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">Win Rate</TabsTrigger>
                  <TabsTrigger value="spend" className="text-xs data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">Spend</TabsTrigger>
                </TabsList>
                <TabsContent value="requests" className="mt-3">
                  {overview?.top_performers?.by_requests?.slice(0, 3).map((ssp, idx) => (
                    <div key={ssp.id} className="flex items-center justify-between py-2 border-b border-[#2D3B55]/30 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#64748B] w-4">{idx + 1}.</span>
                        <span className="text-sm text-[#F8FAFC]">{ssp.name}</span>
                      </div>
                      <span className="text-sm font-mono text-[#3B82F6]">{formatNumber(ssp.requests)}</span>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="winrate" className="mt-3">
                  {overview?.top_performers?.by_win_rate?.slice(0, 3).map((ssp, idx) => (
                    <div key={ssp.id} className="flex items-center justify-between py-2 border-b border-[#2D3B55]/30 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#64748B] w-4">{idx + 1}.</span>
                        <span className="text-sm text-[#F8FAFC]">{ssp.name}</span>
                      </div>
                      <span className="text-sm font-mono text-[#10B981]">{ssp.win_rate?.toFixed(1)}%</span>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="spend" className="mt-3">
                  {overview?.top_performers?.by_spend?.slice(0, 3).map((ssp, idx) => (
                    <div key={ssp.id} className="flex items-center justify-between py-2 border-b border-[#2D3B55]/30 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#64748B] w-4">{idx + 1}.</span>
                        <span className="text-sm text-[#F8FAFC]">{ssp.name}</span>
                      </div>
                      <span className="text-sm font-mono text-[#8B5CF6]">${ssp.spend?.toFixed(2)}</span>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Selected SSP Details */}
          {detailsLoading ? (
            <Card className="surface-primary border-panel border-[#3B82F6]/30">
              <CardContent className="py-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3B82F6] mx-auto"></div>
                <p className="text-sm text-[#64748B] mt-2">Loading details...</p>
              </CardContent>
            </Card>
          ) : sspDetails && (
            <Card className="surface-primary border-panel border-[#3B82F6]/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-[#F8FAFC]">{sspDetails.ssp?.name}</CardTitle>
                  {getStatusIcon(sspDetails.ssp?.status)}
                </div>
                <p className="text-xs text-[#64748B] mt-1 font-mono">
                  Token: {sspDetails.ssp?.endpoint_token?.slice(0, 8)}...
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 surface-secondary rounded-lg">
                    <p className="text-[10px] text-[#64748B] uppercase tracking-wider">Bid Rate</p>
                    <p className="text-xl font-bold text-[#3B82F6]">{sspDetails.metrics?.bid_rate?.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 surface-secondary rounded-lg">
                    <p className="text-[10px] text-[#64748B] uppercase tracking-wider">Win Rate</p>
                    <p className="text-xl font-bold text-[#10B981]">{sspDetails.metrics?.win_rate?.toFixed(1)}%</p>
                  </div>
                </div>
                
                {/* Response Time */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-[#64748B] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Response Time
                    </p>
                    <span className="text-xs font-mono text-[#94A3B8]">
                      avg {sspDetails.response_time_stats?.avg?.toFixed(0) || 0}ms
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((sspDetails.response_time_stats?.avg || 0) / 2, 100)} 
                    className="h-2"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-[#64748B]">
                      min: {sspDetails.response_time_stats?.min || 0}ms
                    </span>
                    <span className="text-[10px] text-[#64748B]">
                      max: {sspDetails.response_time_stats?.max || 0}ms
                    </span>
                  </div>
                </div>

                {/* Hourly Distribution */}
                {sspDetails.hourly_distribution?.length > 0 && (
                  <div>
                    <p className="text-xs text-[#64748B] mb-2">Hourly Activity</p>
                    <div className="h-[80px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sspDetails.hourly_distribution}>
                          <defs>
                            <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area 
                            type="monotone" 
                            dataKey="requests" 
                            stroke="#3B82F6" 
                            fill="url(#colorRequests)"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#0A0F1C', 
                              border: '1px solid #2D3B55',
                              borderRadius: '8px',
                              color: '#F8FAFC',
                              fontSize: '12px'
                            }}
                            formatter={(value) => [`${value} requests`, 'Hour']}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Campaign Distribution */}
                {sspDetails.campaign_distribution?.length > 0 && (
                  <div>
                    <p className="text-xs text-[#64748B] mb-2">Top Campaigns</p>
                    {sspDetails.campaign_distribution.slice(0, 3).map((camp, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 border-b border-[#2D3B55]/30 last:border-0">
                        <span className="text-xs text-[#F8FAFC] truncate max-w-[140px]">{camp.name}</span>
                        <span className="text-xs font-mono text-[#94A3B8]">{camp.bids} bids</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-[#2D3B55]">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]"
                    onClick={() => handleRegenerateToken(sspDetails.ssp?.id)}
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Regenerate Token
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
