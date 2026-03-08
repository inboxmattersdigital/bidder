import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BarChart3, TrendingUp, DollarSign, Users, Target, Lightbulb, 
  RefreshCw, Download, Calendar, Zap, PieChart, ArrowRight, Megaphone
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
import { Slider } from "../components/ui/slider";
import { toast } from "sonner";
import { 
  getMediaPlanForecast, getIndustryBenchmarks, getPerformanceProjections,
  recommendCampaignStrategy, recommendLineItems, getCampaigns
} from "../lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, LineChart, Line
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const CAMPAIGN_GOALS = [
  { value: "brand_awareness", label: "Brand Awareness" },
  { value: "reach", label: "Reach" },
  { value: "traffic", label: "Traffic" },
  { value: "conversions", label: "Conversions" },
  { value: "app_installs", label: "App Installs" },
  { value: "video_views", label: "Video Views" },
];

const CREATIVE_TYPES = [
  { value: "display", label: "Display" },
  { value: "video", label: "Video" },
  { value: "native", label: "Native" },
  { value: "ctv", label: "Connected TV" },
  { value: "audio", label: "Audio" },
];

const INVENTORY_SOURCES = [
  { value: "open_exchange", label: "Open Exchange" },
  { value: "pmp", label: "Private Marketplace" },
  { value: "youtube", label: "YouTube" },
  { value: "gdn", label: "Google Display Network" },
  { value: "ctv", label: "Connected TV" },
];

export default function MediaPlanner() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);
  const [projections, setProjections] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [lineItemRecs, setLineItemRecs] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  const [planConfig, setPlanConfig] = useState({
    budget: 10000,
    duration_days: 30,
    goal: "brand_awareness",
    creative_type: "display",
    inventory_sources: ["open_exchange", "gdn"],
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [benchRes, campaignsRes] = await Promise.all([
        getIndustryBenchmarks(),
        getCampaigns()
      ]);
      setBenchmarks(benchRes.data);
      setCampaigns(campaignsRes.data || []);
    } catch (err) {
      toast.error("Failed to load data");
    }
  };

  const generateForecast = async () => {
    setLoading(true);
    try {
      const [forecastRes, projectionsRes, strategyRes, lineItemRes] = await Promise.all([
        getMediaPlanForecast({
          budget: planConfig.budget,
          duration_days: planConfig.duration_days,
          goal: planConfig.goal,
          inventory_sources: planConfig.inventory_sources,
          creative_types: [planConfig.creative_type],
        }),
        getPerformanceProjections(
          planConfig.budget, 
          planConfig.duration_days, 
          planConfig.creative_type,
          planConfig.goal
        ),
        recommendCampaignStrategy(
          planConfig.goal,
          planConfig.budget,
          planConfig.duration_days,
          [planConfig.creative_type]
        ),
        recommendLineItems(planConfig.goal, planConfig.budget, "prospecting")
      ]);

      setForecast(forecastRes.data);
      setProjections(projectionsRes.data);
      setStrategy(strategyRes.data);
      setLineItemRecs(lineItemRes.data);
      toast.success("Media plan generated!");
    } catch (err) {
      toast.error("Failed to generate forecast");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toLocaleString() || "0";
  };

  const createCampaignFromPlan = () => {
    // Build campaign data from media plan
    const campaignData = {
      // Budget & Bidding
      total_budget: planConfig.budget,
      daily_budget: Math.round(planConfig.budget / planConfig.duration_days),
      duration_days: planConfig.duration_days,
      
      // Goal & KPI
      primary_goal: planConfig.goal,
      kpi_type: strategy?.strategy?.recommended_bid_type?.toLowerCase() || "cpm",
      
      // Strategy recommendations
      bidding_strategy: strategy?.strategy?.bidding_strategy || "manual_cpm",
      pacing_type: strategy?.strategy?.pacing || "even",
      
      // Frequency cap
      frequency_cap_enabled: true,
      frequency_cap_count: strategy?.strategy?.frequency_cap || 5,
      frequency_cap_period: strategy?.strategy?.frequency_period || "day",
      
      // Inventory sources from priority inventory
      inventory_sources: strategy?.strategy?.priority_inventory || planConfig.inventory_sources,
      
      // Forecast data for reference
      forecast: {
        impressions: forecast?.estimated_impressions,
        reach: forecast?.estimated_reach,
        clicks: forecast?.estimated_clicks,
        cpm: forecast?.estimated_cpm,
        confidence: forecast?.confidence_level
      }
    };
    
    // Navigate to campaign wizard with state
    navigate("/campaigns/new", { 
      state: { 
        fromMediaPlan: true,
        planData: campaignData 
      }
    });
    
    toast.success("Creating campaign from media plan...");
  };

  const budgetAllocationData = lineItemRecs?.recommendations?.map((rec, idx) => ({
    name: rec.type,
    value: rec.budget,
    color: COLORS[idx % COLORS.length]
  })) || [];

  const performanceProjectionData = projections ? [
    { name: "Impressions", min: projections.min_impressions, max: projections.max_impressions, expected: projections.expected_impressions },
    { name: "Clicks", min: projections.min_clicks * 100, max: projections.max_clicks * 100, expected: projections.expected_clicks * 100 },
    { name: "Conversions", min: projections.min_conversions * 1000, max: projections.max_conversions * 1000, expected: projections.expected_conversions * 1000 },
  ] : [];

  return (
    <div className="p-6 space-y-6" data-testid="media-planner-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Media Planner</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Forecast campaign performance and get strategic recommendations
          </p>
        </div>
        {forecast && strategy && (
          <Button 
            onClick={createCampaignFromPlan}
            className="bg-[#10B981] hover:bg-[#059669]"
            data-testid="create-campaign-from-plan-btn"
          >
            <Megaphone className="w-4 h-4 mr-2" />
            Create Campaign from Plan
          </Button>
        )}
      </div>

      {/* Configuration Panel */}
      <Card className="surface-primary border-panel">
        <CardHeader>
          <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
            <Target className="w-5 h-5 text-[#3B82F6]" />
            Campaign Planning Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Budget ($)</Label>
              <Input
                type="number"
                value={planConfig.budget}
                onChange={(e) => setPlanConfig(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Duration (days)</Label>
              <Input
                type="number"
                value={planConfig.duration_days}
                onChange={(e) => setPlanConfig(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 30 }))}
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Goal</Label>
              <Select 
                value={planConfig.goal} 
                onValueChange={(v) => setPlanConfig(prev => ({ ...prev, goal: v }))}
              >
                <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="surface-primary border-[#2D3B55]">
                  {CAMPAIGN_GOALS.map((goal) => (
                    <SelectItem key={goal.value} value={goal.value} className="text-[#F8FAFC]">
                      {goal.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Creative Type</Label>
              <Select 
                value={planConfig.creative_type} 
                onValueChange={(v) => setPlanConfig(prev => ({ ...prev, creative_type: v }))}
              >
                <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="surface-primary border-[#2D3B55]">
                  {CREATIVE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-[#F8FAFC]">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={generateForecast}
                disabled={loading}
                className="w-full bg-[#3B82F6] hover:bg-[#2563EB]"
              >
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                Generate Plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {forecast && (
        <>
          {/* Forecast Overview */}
          <div className="grid grid-cols-6 gap-4">
            <Card className="surface-primary border-panel">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-[#3B82F6]" />
                  <span className="text-xs text-[#64748B]">Impressions</span>
                </div>
                <p className="text-2xl font-bold text-[#F8FAFC]">{formatNumber(forecast.estimated_impressions)}</p>
              </CardContent>
            </Card>
            <Card className="surface-primary border-panel">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-[#10B981]" />
                  <span className="text-xs text-[#64748B]">Reach</span>
                </div>
                <p className="text-2xl font-bold text-[#F8FAFC]">{formatNumber(forecast.estimated_reach)}</p>
              </CardContent>
            </Card>
            <Card className="surface-primary border-panel">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-xs text-[#64748B]">Clicks</span>
                </div>
                <p className="text-2xl font-bold text-[#F8FAFC]">{formatNumber(forecast.estimated_clicks)}</p>
              </CardContent>
            </Card>
            <Card className="surface-primary border-panel">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-xs text-[#64748B]">Conversions</span>
                </div>
                <p className="text-2xl font-bold text-[#F8FAFC]">{formatNumber(forecast.estimated_conversions)}</p>
              </CardContent>
            </Card>
            <Card className="surface-primary border-panel">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-[#EC4899]" />
                  <span className="text-xs text-[#64748B]">Est. CPM</span>
                </div>
                <p className="text-2xl font-bold text-[#F8FAFC]">${forecast.estimated_cpm?.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="surface-primary border-panel">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-[#EF4444]" />
                  <span className="text-xs text-[#64748B]">Confidence</span>
                </div>
                <p className="text-2xl font-bold text-[#F8FAFC]">{forecast.confidence_level}%</p>
                <Progress value={forecast.confidence_level} className="h-1 mt-2" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Budget Allocation Pie Chart */}
            <Card className="surface-primary border-panel">
              <CardHeader className="pb-0">
                <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#F59E0B]" />
                  Recommended Budget Allocation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={budgetAllocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {budgetAllocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0A0F1C', 
                          border: '1px solid #2D3B55',
                          borderRadius: '8px',
                          color: '#F8FAFC'
                        }}
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Budget']}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Strategy Recommendations */}
            <Card className="surface-primary border-panel">
              <CardHeader className="pb-0">
                <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#3B82F6]" />
                  Strategy Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {strategy && (
                  <>
                    <div className="p-3 surface-secondary rounded-lg">
                      <p className="text-xs text-[#64748B]">Bidding Strategy</p>
                      <p className="text-sm font-medium text-[#F8FAFC] capitalize">
                        {strategy.strategy?.bidding_strategy?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="p-3 surface-secondary rounded-lg">
                      <p className="text-xs text-[#64748B]">Frequency Cap</p>
                      <p className="text-sm font-medium text-[#F8FAFC]">
                        {strategy.strategy?.frequency_cap} per {strategy.strategy?.frequency_period}
                      </p>
                    </div>
                    <div className="p-3 surface-secondary rounded-lg">
                      <p className="text-xs text-[#64748B]">Pacing</p>
                      <p className="text-sm font-medium text-[#F8FAFC] capitalize">
                        {strategy.strategy?.pacing}
                      </p>
                    </div>
                    <div className="p-3 surface-secondary rounded-lg">
                      <p className="text-xs text-[#64748B]">Priority Inventory</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {strategy.strategy?.priority_inventory?.slice(0, 3).map((inv) => (
                          <Badge key={inv} className="bg-[#3B82F6]/20 text-[#3B82F6] text-xs">
                            {inv}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Performance Projections */}
            <Card className="surface-primary border-panel">
              <CardHeader className="pb-0">
                <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#10B981]" />
                  Expected Performance Ranges
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {projections && (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#64748B]">CPM Range</span>
                        <span className="text-[#F8FAFC]">
                          ${projections.expected_cpm_range?.[0]?.toFixed(2)} - ${projections.expected_cpm_range?.[1]?.toFixed(2)}
                        </span>
                      </div>
                      <Progress value={50} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#64748B]">CPC Range</span>
                        <span className="text-[#F8FAFC]">
                          ${projections.expected_cpc_range?.[0]?.toFixed(2)} - ${projections.expected_cpc_range?.[1]?.toFixed(2)}
                        </span>
                      </div>
                      <Progress value={50} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#64748B]">CPA Range</span>
                        <span className="text-[#F8FAFC]">
                          ${projections.expected_cpa_range?.[0]?.toFixed(2)} - ${projections.expected_cpa_range?.[1]?.toFixed(2)}
                        </span>
                      </div>
                      <Progress value={50} className="h-2" />
                    </div>
                    <div className="pt-2 border-t border-[#2D3B55]">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#64748B]">Industry Avg CTR</span>
                        <span className="text-[#10B981]">{projections.industry_avg_ctr}%</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#64748B]">Industry Avg CVR</span>
                        <span className="text-[#10B981]">{projections.industry_avg_cvr}%</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Line Item Recommendations */}
          {lineItemRecs && (
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC]">Recommended Line Items</CardTitle>
                <CardDescription className="text-[#64748B]">
                  Suggested line item structure for optimal performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {lineItemRecs.recommendations?.map((rec, idx) => (
                    <div key={idx} className="p-4 surface-secondary rounded-lg border-l-4" style={{ borderLeftColor: COLORS[idx % COLORS.length] }}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] capitalize">{rec.type}</Badge>
                        <span className="text-xs text-[#64748B]">{rec.budget_allocation * 100}%</span>
                      </div>
                      <p className="text-sm font-medium text-[#F8FAFC]">{rec.name}</p>
                      <p className="text-xs text-[#64748B] mt-1">{rec.description}</p>
                      <div className="mt-3 pt-2 border-t border-[#2D3B55]">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#64748B]">Budget</span>
                          <span className="text-[#F8FAFC]">${rec.budget?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-[#64748B]">Inventory</span>
                          <span className="text-[#F8FAFC]">{rec.inventory_source}</span>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-[#64748B]">Strategy</span>
                          <span className="text-[#F8FAFC] capitalize">{rec.bid_strategy?.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Optimization Checkpoints */}
          {strategy?.optimization_checkpoints && (
            <Card className="surface-primary border-panel">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#8B5CF6]" />
                  Optimization Checkpoints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {strategy.optimization_checkpoints.map((checkpoint, idx) => (
                    <div key={idx} className="flex-1 relative">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          idx === 0 ? "bg-[#3B82F6]" : "bg-[#2D3B55]"
                        }`}>
                          <span className="text-sm font-medium text-white">D{checkpoint.day}</span>
                        </div>
                        {idx < strategy.optimization_checkpoints.length - 1 && (
                          <div className="flex-1 h-0.5 bg-[#2D3B55]" />
                        )}
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-2 max-w-[150px]">{checkpoint.action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Industry Benchmarks */}
      {benchmarks && (
        <Card className="surface-primary border-panel">
          <CardHeader>
            <CardTitle className="text-lg text-[#F8FAFC]">Industry Benchmarks by Format</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {Object.entries(benchmarks.benchmarks || {}).map(([format, data]) => (
                <div key={format} className="p-4 surface-secondary rounded-lg">
                  <p className="text-sm font-medium text-[#F8FAFC] capitalize mb-3">{format}</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">CTR</span>
                      <span className="text-[#10B981]">{data.ctr}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">CVR</span>
                      <span className="text-[#3B82F6]">{data.cvr}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">CPM</span>
                      <span className="text-[#F8FAFC]">${data.cpm_range?.[0]} - ${data.cpm_range?.[1]}</span>
                    </div>
                    {data.viewability && (
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Viewability</span>
                        <span className="text-[#F59E0B]">{data.viewability}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
