import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Award,
  Activity,
  Percent,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { getDashboardStats, getChartData, seedData } from "../lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

function MetricCard({ title, value, subtitle, icon: Icon, trend, color = "primary" }) {
  const colorClasses = {
    primary: "text-[#3B82F6]",
    success: "text-[#10B981]",
    warning: "text-[#F59E0B]",
    error: "text-[#EF4444]"
  };
  
  return (
    <Card className="surface-primary border-panel metric-card card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#64748B] uppercase tracking-wider mb-1">{title}</p>
            <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
            {subtitle && <p className="text-xs text-[#94A3B8] mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-sm surface-secondary ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {trend !== undefined && (
          <div className="mt-3 flex items-center gap-1">
            <TrendingUp className={`w-3 h-3 ${trend >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`} />
            <span className={`text-xs ${trend >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
            <span className="text-xs text-[#64748B]">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, chartRes] = await Promise.all([
        getDashboardStats(),
        getChartData()
      ]);
      setStats(statsRes.data);
      setChartData(chartRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      const response = await seedData();
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error("Failed to seed data");
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toLocaleString() || '0';
  };

  const formatCurrency = (num) => {
    return `$${num?.toFixed(2) || '0.00'}`;
  };

  return (
    <div className="p-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Dashboard</h1>
          <p className="text-sm text-[#94A3B8] mt-1">OpenRTB Bidder Performance Overview</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData}
            className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151F32]"
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            size="sm" 
            onClick={handleSeedData}
            disabled={seeding}
            className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white btn-press"
            data-testid="seed-data-btn"
          >
            {seeding ? "Seeding..." : "Seed Demo Data"}
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-testid="metrics-grid">
        <MetricCard
          title="Active Campaigns"
          value={stats?.active_campaigns || 0}
          subtitle={`${stats?.total_campaigns || 0} total`}
          icon={Target}
          color="primary"
        />
        <MetricCard
          title="Total Bids"
          value={formatNumber(stats?.total_bids || 0)}
          icon={Activity}
          color="success"
        />
        <MetricCard
          title="Win Rate"
          value={`${stats?.win_rate?.toFixed(1) || 0}%`}
          subtitle={`${formatNumber(stats?.total_wins || 0)} wins`}
          icon={Percent}
          color="warning"
        />
        <MetricCard
          title="Total Spend"
          value={formatCurrency(stats?.total_spend || 0)}
          subtitle={`Avg CPM: ${formatCurrency(stats?.avg_cpm || 0)}`}
          icon={DollarSign}
          color="primary"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Spend Over Time */}
        <Card className="surface-primary border-panel lg:col-span-8" data-testid="spend-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#F8FAFC]">Bidding Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBids" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorWins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3B55" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#64748B', fontSize: 12 }} 
                    axisLine={{ stroke: '#2D3B55' }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748B', fontSize: 12 }} 
                    axisLine={{ stroke: '#2D3B55' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0B1221', 
                      border: '1px solid #2D3B55',
                      borderRadius: '4px',
                      color: '#F8FAFC'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="bids" 
                    stroke="#3B82F6" 
                    fill="url(#colorBids)" 
                    name="Bids"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="wins" 
                    stroke="#10B981" 
                    fill="url(#colorWins)" 
                    name="Wins"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Spend by Day */}
        <Card className="surface-primary border-panel lg:col-span-4" data-testid="daily-spend-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#F8FAFC]">Daily Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3B55" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#64748B', fontSize: 10 }} 
                    axisLine={{ stroke: '#2D3B55' }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748B', fontSize: 10 }} 
                    axisLine={{ stroke: '#2D3B55' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0B1221', 
                      border: '1px solid #2D3B55',
                      borderRadius: '4px',
                      color: '#F8FAFC'
                    }}
                    formatter={(value) => [`$${value}`, 'Spend']}
                  />
                  <Bar dataKey="spend" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#64748B]">Impressions</span>
              <Award className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <p className="text-xl font-bold text-[#F8FAFC] mt-1">
              {formatNumber(stats?.total_impressions || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#64748B]">Clicks</span>
              <Activity className="w-4 h-4 text-[#10B981]" />
            </div>
            <p className="text-xl font-bold text-[#F8FAFC] mt-1">
              {formatNumber(stats?.total_clicks || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#64748B]">Total Creatives</span>
              <Target className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <p className="text-xl font-bold text-[#F8FAFC] mt-1">
              {stats?.total_creatives || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#64748B]">Total Wins</span>
              <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <p className="text-xl font-bold text-[#F8FAFC] mt-1">
              {formatNumber(stats?.total_wins || 0)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
