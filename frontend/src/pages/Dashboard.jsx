import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Activity,
  Percent,
  RefreshCw,
  Users,
  Shield,
  Building2,
  ChevronRight,
  Play,
  Pause,
  FileText,
  Image,
  BarChart3,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { getDashboardStats, getChartData, getUserChartData } from "../lib/api";
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
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const API_URL = process.env.REACT_APP_BACKEND_URL;

function MetricCard({ title, value, subtitle, icon: Icon, trend, color = "primary", className = "" }) {
  const colorClasses = {
    primary: "text-[#3B82F6]",
    success: "text-[#10B981]",
    warning: "text-[#F59E0B]",
    error: "text-[#EF4444]",
    purple: "text-[#8B5CF6]",
    pink: "text-[#EC4899]"
  };
  
  const bgClasses = {
    primary: "bg-[#3B82F6]/10",
    success: "bg-[#10B981]/10",
    warning: "bg-[#F59E0B]/10",
    error: "bg-[#EF4444]/10",
    purple: "bg-[#8B5CF6]/10",
    pink: "bg-[#EC4899]/10"
  };
  
  return (
    <Card className={`surface-primary border-panel metric-card card-hover ${className}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#64748B] uppercase tracking-wider mb-1">{title}</p>
            <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
            {subtitle && <p className="text-xs text-[#94A3B8] mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${bgClasses[color]}`}>
            <Icon className={`w-5 h-5 ${colorClasses[color]}`} />
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

// Advertiser Dashboard Component
function AdvertiserDashboard({ data, chartData, formatNumber, formatCurrency }) {
  const stats = data.stats;
  
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
  
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">{data.welcome_message}</h2>
          <p className="text-sm text-[#64748B]">Monitor your campaign performance and manage creatives</p>
        </div>
        <Badge className="bg-[#3B82F6]/20 text-[#3B82F6]">Advertiser</Badge>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Active Campaigns"
          value={stats.active_campaigns}
          subtitle={`${stats.total_campaigns} total`}
          icon={Target}
          color="primary"
        />
        <MetricCard
          title="Total Bids"
          value={formatNumber(stats.total_bids)}
          icon={Activity}
          color="success"
        />
        <MetricCard
          title="Win Rate"
          value={`${stats.win_rate}%`}
          subtitle={`${formatNumber(stats.total_wins)} wins`}
          icon={Percent}
          color="warning"
        />
        <MetricCard
          title="Total Spend"
          value={formatCurrency(stats.total_spend)}
          icon={DollarSign}
          color="purple"
        />
        <MetricCard
          title="CTR"
          value={`${stats.ctr}%`}
          subtitle={`${formatNumber(stats.total_clicks || 0)} clicks`}
          icon={TrendingUp}
          color="pink"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Bidding Activity Chart */}
        <Card className="surface-primary border-panel lg:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#F8FAFC]">Bidding Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBids" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D3B55" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#151F32', border: '1px solid #2D3B55', borderRadius: '8px' }}
                    labelStyle={{ color: '#F8FAFC' }}
                  />
                  <Area type="monotone" dataKey="bids" stroke="#3B82F6" fillOpacity={1} fill="url(#colorBids)" name="Bids" />
                  <Area type="monotone" dataKey="wins" stroke="#10B981" fillOpacity={1} fill="url(#colorWins)" name="Wins" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Campaigns */}
        <Card className="surface-primary border-panel lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#F8FAFC]">Top Campaigns</CardTitle>
            <CardDescription className="text-[#64748B]">By performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.top_campaigns?.length === 0 ? (
              <p className="text-sm text-[#64748B] text-center py-4">No campaigns yet</p>
            ) : (
              data.top_campaigns?.map((campaign, idx) => (
                <div key={campaign.id} className="flex items-center justify-between p-2 rounded-lg bg-[#0B1221] border border-[#2D3B55]/50">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-xs text-[#3B82F6] font-medium">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm text-[#F8FAFC] truncate max-w-[120px]">{campaign.name}</p>
                      <p className="text-xs text-[#64748B]">{campaign.wins} wins</p>
                    </div>
                  </div>
                  <Badge className={
                    campaign.status === 'active' ? 'bg-[#10B981]/20 text-[#10B981]' :
                    campaign.status === 'paused' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                    'bg-[#64748B]/20 text-[#64748B]'
                  }>
                    {campaign.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Creatives */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">Recent Creatives</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {data.recent_creatives?.length === 0 ? (
              <p className="text-sm text-[#64748B] col-span-full text-center py-4">No creatives yet</p>
            ) : (
              data.recent_creatives?.map((creative) => (
                <div key={creative.id} className="p-3 rounded-lg bg-[#0B1221] border border-[#2D3B55]/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Image className="w-4 h-4 text-[#3B82F6]" />
                    <Badge variant="outline" className="text-xs border-[#2D3B55] text-[#94A3B8]">
                      {creative.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-[#F8FAFC] truncate">{creative.name}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Admin Dashboard Component
function AdminDashboard({ data, formatNumber, formatCurrency }) {
  const stats = data.stats;
  
  const statusData = data.campaigns_by_status ? [
    { name: 'Active', value: data.campaigns_by_status.active || 0, color: '#10B981' },
    { name: 'Paused', value: data.campaigns_by_status.paused || 0, color: '#F59E0B' },
    { name: 'Draft', value: data.campaigns_by_status.draft || 0, color: '#64748B' },
    { name: 'Completed', value: data.campaigns_by_status.completed || 0, color: '#3B82F6' },
  ].filter(d => d.value > 0) : [];
  
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">{data.welcome_message}</h2>
          <p className="text-sm text-[#64748B]">Monitor your team's performance and manage advertisers</p>
        </div>
        <Badge className="bg-[#10B981]/20 text-[#10B981]">Admin</Badge>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Advertisers"
          value={stats.total_advertisers}
          subtitle={`${stats.active_advertisers} active`}
          icon={Users}
          color="primary"
        />
        <MetricCard
          title="Total Campaigns"
          value={stats.total_campaigns}
          subtitle={`${stats.active_campaigns} active`}
          icon={Target}
          color="success"
        />
        <MetricCard
          title="Team Bids"
          value={formatNumber(stats.total_bids)}
          icon={Activity}
          color="warning"
        />
        <MetricCard
          title="Win Rate"
          value={`${stats.win_rate}%`}
          subtitle={`${formatNumber(stats.total_wins)} wins`}
          icon={Percent}
          color="purple"
        />
        <MetricCard
          title="Total Spend"
          value={formatCurrency(stats.total_spend)}
          icon={DollarSign}
          color="pink"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Top Advertisers */}
        <Card className="surface-primary border-panel lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#F8FAFC]">Top Advertisers</CardTitle>
            <CardDescription className="text-[#64748B]">By spend</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.top_advertisers?.length === 0 ? (
              <p className="text-sm text-[#64748B] text-center py-4">No advertisers yet</p>
            ) : (
              data.top_advertisers?.map((adv, idx) => (
                <div key={adv.id} className="flex items-center justify-between p-3 rounded-lg bg-[#0B1221] border border-[#2D3B55]/50">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-sm text-[#3B82F6] font-medium">
                      {adv.name?.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm text-[#F8FAFC] font-medium">{adv.name}</p>
                      <p className="text-xs text-[#64748B]">{adv.campaigns} campaigns</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#F8FAFC] font-medium">{formatCurrency(adv.spend)}</p>
                    <Badge className={adv.is_active ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#EF4444]/20 text-[#EF4444]"}>
                      {adv.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Campaign Status Chart */}
        <Card className="surface-primary border-panel lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#F8FAFC]">Campaigns by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#151F32', border: '1px solid #2D3B55', borderRadius: '8px' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      formatter={(value) => <span style={{ color: '#94A3B8' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[#64748B]">
                  No campaign data
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">Team Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {data.recent_activity?.length === 0 ? (
              <p className="text-sm text-[#64748B] text-center py-4">No recent activity</p>
            ) : (
              data.recent_activity?.map((act, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#0B1221]">
                  <div className="w-8 h-8 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-[#3B82F6]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#F8FAFC]">
                      <span className="font-medium">{act.actor_name}</span>
                      <span className="text-[#64748B]"> {act.action?.replace(/\./g, ' ')}</span>
                    </p>
                  </div>
                  <span className="text-xs text-[#64748B]">
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Super Admin Dashboard Component
function SuperAdminDashboard({ data, formatNumber, formatCurrency }) {
  const stats = data.stats;
  const health = data.platform_health;
  
  const statusData = health?.campaigns_by_status ? [
    { name: 'Active', value: health.campaigns_by_status.active || 0, color: '#10B981' },
    { name: 'Paused', value: health.campaigns_by_status.paused || 0, color: '#F59E0B' },
    { name: 'Draft', value: health.campaigns_by_status.draft || 0, color: '#64748B' },
    { name: 'Completed', value: health.campaigns_by_status.completed || 0, color: '#3B82F6' },
  ].filter(d => d.value > 0) : [];
  
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">{data.welcome_message}</h2>
          <p className="text-sm text-[#64748B]">Platform health, all admins, and system-wide metrics</p>
        </div>
        <Badge className="bg-[#F59E0B]/20 text-[#F59E0B]">Super Admin</Badge>
      </div>

      {/* Platform Health Banner */}
      <Card className="surface-secondary border-panel bg-gradient-to-r from-[#0B1221] to-[#151F32]">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                <div>
                  <p className="text-2xl font-bold text-[#F8FAFC]">{health?.logins_24h || 0}</p>
                  <p className="text-xs text-[#64748B]">Logins (24h)</p>
                </div>
              </div>
              <div className="w-px h-10 bg-[#2D3B55]" />
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${(health?.failed_logins_24h || 0) > 10 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`} />
                <div>
                  <p className="text-2xl font-bold text-[#F8FAFC]">{health?.failed_logins_24h || 0}</p>
                  <p className="text-xs text-[#64748B]">Failed Logins (24h)</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[#10B981]">
              <Globe className="w-5 h-5" />
              <span className="text-sm font-medium">Platform Online</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total Admins"
          value={stats.total_admins}
          subtitle={`${stats.active_admins} active`}
          icon={Shield}
          color="warning"
        />
        <MetricCard
          title="Advertisers"
          value={stats.total_advertisers}
          subtitle={`${stats.active_advertisers} active`}
          icon={Users}
          color="primary"
        />
        <MetricCard
          title="Campaigns"
          value={stats.total_campaigns}
          subtitle={`${stats.active_campaigns} active`}
          icon={Target}
          color="success"
        />
        <MetricCard
          title="SSP Endpoints"
          value={stats.total_endpoints}
          icon={Globe}
          color="purple"
        />
        <MetricCard
          title="Win Rate"
          value={`${stats.win_rate}%`}
          subtitle={`${formatNumber(stats.total_wins)} wins`}
          icon={Percent}
          color="warning"
        />
        <MetricCard
          title="Total Spend"
          value={formatCurrency(stats.total_spend)}
          icon={DollarSign}
          color="pink"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Top Admins */}
        <Card className="surface-primary border-panel lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#F8FAFC]">Top Admins</CardTitle>
            <CardDescription className="text-[#64748B]">By total spend across their teams</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.top_admins?.length === 0 ? (
              <p className="text-sm text-[#64748B] text-center py-4">No admins yet</p>
            ) : (
              data.top_admins?.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-3 rounded-lg bg-[#0B1221] border border-[#2D3B55]/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                      <span className="text-[#10B981] font-medium">{admin.name?.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm text-[#F8FAFC] font-medium">{admin.name}</p>
                      <p className="text-xs text-[#64748B]">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm text-[#F8FAFC] font-medium">{admin.advertisers_count}</p>
                      <p className="text-xs text-[#64748B]">Advertisers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-[#F8FAFC] font-medium">{admin.campaigns_count}</p>
                      <p className="text-xs text-[#64748B]">Campaigns</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#10B981] font-medium">{formatCurrency(admin.total_spend)}</p>
                      <p className="text-xs text-[#64748B]">Spend</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Campaign Status */}
        <Card className="surface-primary border-panel lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#F8FAFC]">Platform Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#151F32', border: '1px solid #2D3B55', borderRadius: '8px' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      formatter={(value) => <span style={{ color: '#94A3B8' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[#64748B]">
                  No campaign data
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Activity */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">Platform Activity</CardTitle>
          <CardDescription className="text-[#64748B]">Recent actions across all users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {data.recent_activity?.length === 0 ? (
              <p className="text-sm text-[#64748B] text-center py-4">No recent activity</p>
            ) : (
              data.recent_activity?.map((act, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#0B1221]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    act.success !== false ? 'bg-[#3B82F6]/20' : 'bg-[#EF4444]/20'
                  }`}>
                    {act.success !== false ? (
                      <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#F8FAFC]">
                      <span className="font-medium">{act.actor_name}</span>
                      <Badge className="ml-2 text-xs bg-[#2D3B55] text-[#94A3B8]">{act.actor_role}</Badge>
                    </p>
                    <p className="text-xs text-[#64748B]">{act.action?.replace(/\./g, ' ')}</p>
                  </div>
                  <span className="text-xs text-[#64748B]">
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { user, token, hasRole } = useAuth();
  const [roleData, setRoleData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch role-based dashboard data
      const roleRes = await fetch(`${API_URL}/api/dashboard/role-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (roleRes.ok) {
        setRoleData(await roleRes.json());
      }
      
      // Fetch user-scoped chart data (respects role-based data isolation)
      const chartRes = await getUserChartData();
      const rawChartData = chartRes.data;
      if (rawChartData && rawChartData.labels && Array.isArray(rawChartData.labels)) {
        const transformedData = rawChartData.labels.map((label, index) => ({
          date: label,
          bids: rawChartData.bids?.[index] || 0,
          wins: rawChartData.wins?.[index] || 0,
          spend: rawChartData.spend?.[index] || 0
        }));
        setChartData(transformedData);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toLocaleString() || '0';
  };

  const formatCurrency = (num) => {
    return `$${num?.toFixed(2) || '0.00'}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Dashboard</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {roleData?.role === 'super_admin' ? 'Platform-wide overview and health metrics' :
             roleData?.role === 'admin' ? 'Team performance and advertiser management' :
             'Your campaign performance metrics'}
          </p>
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
        </div>
      </div>

      {/* Role-based Dashboard Content */}
      {roleData?.role === 'super_admin' && (
        <SuperAdminDashboard data={roleData} formatNumber={formatNumber} formatCurrency={formatCurrency} />
      )}
      {roleData?.role === 'admin' && (
        <AdminDashboard data={roleData} formatNumber={formatNumber} formatCurrency={formatCurrency} />
      )}
      {roleData?.role === 'advertiser' && (
        <AdvertiserDashboard data={roleData} chartData={chartData} formatNumber={formatNumber} formatCurrency={formatCurrency} />
      )}
      {!roleData && (
        <div className="text-center py-12">
          <p className="text-[#64748B]">Unable to load dashboard data. Please try refreshing.</p>
        </div>
      )}
    </div>
  );
}
