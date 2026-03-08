import { useState, useEffect } from "react";
import { 
  GitBranch, Users, TrendingUp, Target, RefreshCw, ArrowRight,
  BarChart3, PieChart, Filter, Download, Eye, MousePointer, ShoppingCart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../components/ui/select";
import { toast } from "sonner";
import { getAttributionAnalysis, getUserJourney, getCampaigns } from "../lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, Sankey, Layer, Rectangle
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

const ATTRIBUTION_MODELS = [
  { value: "last_touch", label: "Last Touch", desc: "100% credit to last touchpoint" },
  { value: "first_touch", label: "First Touch", desc: "100% credit to first touchpoint" },
  { value: "linear", label: "Linear", desc: "Equal credit to all touchpoints" },
  { value: "time_decay", label: "Time Decay", desc: "More credit to recent touchpoints" },
];

export default function Attribution() {
  const [loading, setLoading] = useState(false);
  const [attributionData, setAttributionData] = useState(null);
  const [selectedModel, setSelectedModel] = useState("last_touch");
  const [campaigns, setCampaigns] = useState([]);
  const [userJourney, setUserJourney] = useState(null);
  const [searchUserId, setSearchUserId] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedModel) {
      loadAttributionData();
    }
  }, [selectedModel]);

  const loadInitialData = async () => {
    try {
      const campaignsRes = await getCampaigns();
      setCampaigns(campaignsRes.data || []);
    } catch (err) {
      toast.error("Failed to load campaigns");
    }
  };

  const loadAttributionData = async () => {
    setLoading(true);
    try {
      const res = await getAttributionAnalysis(selectedModel);
      setAttributionData(res.data);
    } catch (err) {
      toast.error("Failed to load attribution data");
    } finally {
      setLoading(false);
    }
  };

  const searchUserJourney = async () => {
    if (!searchUserId.trim()) {
      toast.error("Enter a user ID");
      return;
    }
    try {
      const res = await getUserJourney(searchUserId.trim());
      setUserJourney(res.data);
      if (res.data.journey?.length === 0) {
        toast.info("No journey data found for this user");
      }
    } catch (err) {
      toast.error("Failed to load user journey");
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toLocaleString() || "0";
  };

  // Prepare chart data
  const attributionChartData = attributionData?.attribution?.map((item, idx) => ({
    name: item.campaign_name?.length > 15 ? item.campaign_name.slice(0, 15) + "..." : item.campaign_name,
    conversions: item.attributed_conversions,
    value: item.attributed_value,
    share: item.attribution_share,
    fill: COLORS[idx % COLORS.length]
  })) || [];

  const pieData = attributionData?.attribution?.map((item, idx) => ({
    name: item.campaign_name,
    value: item.attributed_conversions,
    fill: COLORS[idx % COLORS.length]
  })) || [];

  const getEventIcon = (type) => {
    switch (type) {
      case "impression": return <Eye className="w-4 h-4" />;
      case "click": return <MousePointer className="w-4 h-4" />;
      case "conversion": return <ShoppingCart className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case "impression": return "#3B82F6";
      case "click": return "#F59E0B";
      case "conversion": return "#10B981";
      default: return "#64748B";
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="attribution-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Cross-Campaign Attribution</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Analyze user journeys and attribute conversions across campaigns
          </p>
        </div>
        <Button 
          onClick={loadAttributionData}
          className="bg-[#3B82F6] hover:bg-[#2563EB]"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Attribution Model Selector */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-[#F8FAFC]">Attribution Model</CardTitle>
          <CardDescription className="text-[#64748B]">
            Select how conversion credit is distributed across touchpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {ATTRIBUTION_MODELS.map((model) => (
              <div
                key={model.value}
                onClick={() => setSelectedModel(model.value)}
                className={`p-4 rounded-lg cursor-pointer border transition-all ${
                  selectedModel === model.value
                    ? "bg-[#3B82F6]/20 border-[#3B82F6]"
                    : "surface-secondary border-[#2D3B55] hover:border-[#3B82F6]/50"
                }`}
              >
                <p className="text-sm font-medium text-[#F8FAFC]">{model.label}</p>
                <p className="text-xs text-[#64748B] mt-1">{model.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      {attributionData && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="surface-primary border-panel">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-[#3B82F6]" />
                <span className="text-xs text-[#64748B]">Total Conversions</span>
              </div>
              <p className="text-2xl font-bold text-[#F8FAFC]">
                {formatNumber(attributionData.total_conversions)}
              </p>
            </CardContent>
          </Card>
          <Card className="surface-primary border-panel">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-[#10B981]" />
                <span className="text-xs text-[#64748B]">Total Value</span>
              </div>
              <p className="text-2xl font-bold text-[#F8FAFC]">
                ${formatNumber(attributionData.total_value)}
              </p>
            </CardContent>
          </Card>
          <Card className="surface-primary border-panel">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-xs text-[#64748B]">Campaigns</span>
              </div>
              <p className="text-2xl font-bold text-[#F8FAFC]">
                {attributionData.attribution?.length || 0}
              </p>
            </CardContent>
          </Card>
          <Card className="surface-primary border-panel">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <GitBranch className="w-4 h-4 text-[#8B5CF6]" />
                <span className="text-xs text-[#64748B]">Model</span>
              </div>
              <p className="text-2xl font-bold text-[#F8FAFC] capitalize">
                {selectedModel.replace(/_/g, ' ')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Attribution Bar Chart */}
        <Card className="col-span-2 surface-primary border-panel">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#3B82F6]" />
              Attributed Conversions by Campaign
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {attributionChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attributionChartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#94A3B8', fontSize: 11 }} 
                      axisLine={{ stroke: '#1E293B' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={{ stroke: '#1E293B' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0A0F1C', 
                        border: '1px solid #2D3B55',
                        borderRadius: '8px',
                        color: '#F8FAFC'
                      }}
                      formatter={(value, name) => {
                        if (name === 'conversions') return [value.toFixed(2), 'Conversions'];
                        if (name === 'share') return [`${value.toFixed(1)}%`, 'Share'];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="conversions" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                      {attributionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <Target className="w-12 h-12 mx-auto text-[#64748B] mb-4" />
                  <p className="text-[#94A3B8]">No attribution data available</p>
                  <p className="text-sm text-[#64748B] mt-1">Track conversions to see attribution analysis</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attribution Share Pie */}
        <Card className="surface-primary border-panel">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#10B981]" />
              Attribution Share
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {pieData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0A0F1C', 
                        border: '1px solid #2D3B55',
                        borderRadius: '8px',
                        color: '#F8FAFC'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px' }}
                      formatter={(value) => <span className="text-[#94A3B8]">{value}</span>}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-[#64748B]">No data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Attribution Table */}
      {attributionData?.attribution?.length > 0 && (
        <Card className="surface-primary border-panel">
          <CardHeader>
            <CardTitle className="text-lg text-[#F8FAFC]">Campaign Attribution Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2D3B55]">
                    <th className="text-left py-3 px-3 text-xs text-[#64748B] font-medium">Campaign</th>
                    <th className="text-right py-3 px-3 text-xs text-[#64748B] font-medium">Attributed Conversions</th>
                    <th className="text-right py-3 px-3 text-xs text-[#64748B] font-medium">Attributed Value</th>
                    <th className="text-right py-3 px-3 text-xs text-[#64748B] font-medium">Share</th>
                    <th className="text-right py-3 px-3 text-xs text-[#64748B] font-medium">Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {attributionData.attribution.map((item, idx) => (
                    <tr key={item.campaign_id} className="border-b border-[#2D3B55]/30">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="text-sm text-[#F8FAFC]">{item.campaign_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-mono text-[#F8FAFC]">
                          {item.attributed_conversions?.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-mono text-[#10B981]">
                          ${item.attributed_value?.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Badge className="bg-[#3B82F6]/20 text-[#3B82F6]">
                          {item.attribution_share?.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Progress 
                          value={item.attribution_share} 
                          className="h-2 w-24 ml-auto"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Journey Explorer */}
      <Card className="surface-primary border-panel">
        <CardHeader>
          <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#8B5CF6]" />
            User Journey Explorer
          </CardTitle>
          <CardDescription className="text-[#64748B]">
            Visualize individual user touchpoints across campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Input
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              placeholder="Enter user ID to explore journey"
              className="max-w-md surface-secondary border-[#2D3B55] text-[#F8FAFC]"
            />
            <Button onClick={searchUserJourney} className="bg-[#8B5CF6] hover:bg-[#7C3AED]">
              <Users className="w-4 h-4 mr-2" />
              Search Journey
            </Button>
          </div>

          {userJourney && (
            <div className="space-y-4">
              {/* Journey Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 surface-secondary rounded-lg">
                  <p className="text-xs text-[#64748B]">Campaigns Touched</p>
                  <p className="text-xl font-bold text-[#F8FAFC]">{userJourney.campaigns_touched}</p>
                </div>
                <div className="p-3 surface-secondary rounded-lg">
                  <p className="text-xs text-[#64748B]">Total Events</p>
                  <p className="text-xl font-bold text-[#F8FAFC]">{userJourney.total_events}</p>
                </div>
                <div className="p-3 surface-secondary rounded-lg">
                  <p className="text-xs text-[#64748B]">First Touch</p>
                  <p className="text-sm text-[#F8FAFC] truncate">{userJourney.first_touch?.campaign_name || '-'}</p>
                </div>
                <div className="p-3 surface-secondary rounded-lg">
                  <p className="text-xs text-[#64748B]">Last Touch</p>
                  <p className="text-sm text-[#F8FAFC] truncate">{userJourney.last_touch?.campaign_name || '-'}</p>
                </div>
              </div>

              {/* Journey Timeline */}
              {userJourney.journey?.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#2D3B55]" />
                  <div className="space-y-4">
                    {userJourney.journey.map((event, idx) => (
                      <div key={idx} className="flex items-start gap-4 relative">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center z-10"
                          style={{ backgroundColor: getEventColor(event.event_type) + '20' }}
                        >
                          <div style={{ color: getEventColor(event.event_type) }}>
                            {getEventIcon(event.event_type)}
                          </div>
                        </div>
                        <div className="flex-1 p-3 surface-secondary rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge 
                                className="capitalize text-xs"
                                style={{ 
                                  backgroundColor: getEventColor(event.event_type) + '20',
                                  color: getEventColor(event.event_type)
                                }}
                              >
                                {event.event_type}
                              </Badge>
                              <span className="text-sm text-[#F8FAFC]">{event.campaign_name}</span>
                            </div>
                            <span className="text-xs text-[#64748B]">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {event.event_value > 0 && (
                            <p className="text-sm text-[#10B981] mt-1">Value: ${event.event_value}</p>
                          )}
                        </div>
                        {idx < userJourney.journey.length - 1 && (
                          <ArrowRight className="absolute left-[52px] bottom-[-16px] w-4 h-4 text-[#64748B]" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <GitBranch className="w-12 h-12 mx-auto text-[#64748B] mb-4" />
                  <p className="text-[#94A3B8]">No journey data for this user</p>
                </div>
              )}
            </div>
          )}

          {!userJourney && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-[#64748B] mb-4" />
              <p className="text-[#94A3B8]">Enter a user ID to explore their conversion journey</p>
              <p className="text-sm text-[#64748B] mt-1">
                Track attribution events to build user journeys
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
