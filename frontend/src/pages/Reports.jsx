import { useEffect, useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign,
  Target,
  Calendar,
  RefreshCw,
  Download,
  FileJson,
  FileSpreadsheet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { toast } from "sonner";
import { getReportSummary, getCampaignReport, getCampaigns, exportReportCSV, exportReportJSON } from "../lib/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line
} from "recharts";

function MetricBox({ label, value, subValue, color = "primary" }) {
  const colors = {
    primary: "text-[#3B82F6]",
    success: "text-[#10B981]",
    warning: "text-[#F59E0B]",
    error: "text-[#EF4444]"
  };
  
  return (
    <div className="p-4 surface-secondary rounded border border-[#2D3B55]">
      <p className="text-xs text-[#64748B] uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      {subValue && <p className="text-xs text-[#94A3B8] mt-1">{subValue}</p>}
    </div>
  );
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7d");
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [reportData, setReportData] = useState(null);
  const [campaignReport, setCampaignReport] = useState(null);

  const getDateRange = () => {
    const end = new Date();
    let start = new Date();
    
    switch (dateRange) {
      case "1d":
        start.setDate(end.getDate() - 1);
        break;
      case "7d":
        start.setDate(end.getDate() - 7);
        break;
      case "30d":
        start.setDate(end.getDate() - 30);
        break;
      default:
        start.setDate(end.getDate() - 7);
    }
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();
      
      const [campaignsRes, summaryRes] = await Promise.all([
        getCampaigns(),
        getReportSummary(startDate, endDate)
      ]);
      
      setCampaigns(campaignsRes.data);
      setReportData(summaryRes.data);
      
      if (selectedCampaign !== "all") {
        const campaignRes = await getCampaignReport(selectedCampaign, startDate, endDate);
        setCampaignReport(campaignRes.data);
      } else {
        setCampaignReport(null);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedCampaign]);

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toLocaleString() || '0';
  };

  const formatCurrency = (num) => `$${num?.toFixed(2) || '0.00'}`;
  const formatPercent = (num) => `${num?.toFixed(2) || '0'}%`;

  const displayData = selectedCampaign === "all" ? reportData : campaignReport;
  const summary = displayData?.summary || {};

  return (
    <div className="p-6" data-testid="reports-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Performance Reports</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Campaign analytics and bid shading insights</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32 surface-secondary border-[#2D3B55] text-[#F8FAFC]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="surface-primary border-panel">
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-48 surface-secondary border-[#2D3B55] text-[#F8FAFC]">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent className="surface-primary border-panel">
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline"
            onClick={fetchData}
            className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151F32]"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white"
                data-testid="export-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="surface-primary border-panel">
              <DropdownMenuItem 
                onClick={() => {
                  const { startDate, endDate } = getDateRange();
                  exportReportCSV(startDate, endDate, selectedCampaign !== "all" ? selectedCampaign : null);
                  toast.success("Downloading CSV report...");
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  const { startDate, endDate } = getDateRange();
                  exportReportJSON(startDate, endDate, selectedCampaign !== "all" ? selectedCampaign : null);
                  toast.success("Downloading JSON report...");
                }}
              >
                <FileJson className="w-4 h-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#64748B]">Loading reports...</div>
        </div>
      ) : (
        <>
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <MetricBox 
              label="Total Bids" 
              value={formatNumber(summary.total_bids || summary.bids || 0)} 
              color="primary"
            />
            <MetricBox 
              label="Total Wins" 
              value={formatNumber(summary.total_wins || summary.wins || 0)} 
              color="success"
            />
            <MetricBox 
              label="Win Rate" 
              value={formatPercent(summary.win_rate || 0)} 
              color="warning"
            />
            <MetricBox 
              label="Total Spend" 
              value={formatCurrency(summary.total_spend || summary.spend || 0)} 
              color="primary"
            />
            <MetricBox 
              label="Avg CPM" 
              value={formatCurrency(summary.avg_cpm || 0)} 
              subValue="Cost per mille"
            />
            <MetricBox 
              label="CTR" 
              value={formatPercent(summary.ctr || summary.avg_ctr || 0)} 
              subValue="Click-through rate"
            />
          </div>

          {/* Bid Shading Info (for campaign view) */}
          {campaignReport?.bid_shading && (
            <Card className="surface-primary border-panel mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#3B82F6]" />
                  Bid Shading Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-[#64748B]">Status</p>
                    <Badge 
                      variant="outline" 
                      className={campaignReport.bid_shading.enabled 
                        ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30"
                        : "bg-[#64748B]/20 text-[#64748B] border-[#64748B]/30"
                      }
                    >
                      {campaignReport.bid_shading.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">Current Shade Factor</p>
                    <p className="text-lg font-mono text-[#3B82F6]">
                      {(campaignReport.bid_shading.current_factor * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">Target Win Rate</p>
                    <p className="text-lg font-mono text-[#F59E0B]">
                      {(campaignReport.bid_shading.target_win_rate * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">Actual Win Rate</p>
                    <p className="text-lg font-mono text-[#10B981]">
                      {(campaignReport.bid_shading.actual_win_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Bids vs Wins Chart */}
            <Card className="surface-primary border-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#F8FAFC]">Bids vs Wins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayData?.daily_data || []}>
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
                      />
                      <Legend />
                      <Bar dataKey="bids" fill="#3B82F6" name="Bids" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="wins" fill="#10B981" name="Wins" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Win Rate Trend */}
            <Card className="surface-primary border-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#F8FAFC]">Win Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={displayData?.daily_data || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D3B55" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#64748B', fontSize: 10 }} 
                        axisLine={{ stroke: '#2D3B55' }}
                      />
                      <YAxis 
                        tick={{ fill: '#64748B', fontSize: 10 }} 
                        axisLine={{ stroke: '#2D3B55' }}
                        domain={[0, 100]}
                        unit="%"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0B1221', 
                          border: '1px solid #2D3B55',
                          borderRadius: '4px',
                          color: '#F8FAFC'
                        }}
                        formatter={(value) => [`${value?.toFixed(1)}%`, 'Win Rate']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="win_rate" 
                        stroke="#F59E0B" 
                        strokeWidth={2}
                        dot={{ fill: '#F59E0B', r: 4 }}
                        name="Win Rate"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Avg Prices Chart */}
          {campaignReport && (
            <Card className="surface-primary border-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#F8FAFC]">Bid Price vs Win Price</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={campaignReport.daily_data || []}>
                      <defs>
                        <linearGradient id="colorBid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorWin" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D3B55" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#64748B', fontSize: 10 }} 
                        axisLine={{ stroke: '#2D3B55' }}
                      />
                      <YAxis 
                        tick={{ fill: '#64748B', fontSize: 10 }} 
                        axisLine={{ stroke: '#2D3B55' }}
                        tickFormatter={(v) => `$${v.toFixed(2)}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0B1221', 
                          border: '1px solid #2D3B55',
                          borderRadius: '4px',
                          color: '#F8FAFC'
                        }}
                        formatter={(value) => [`$${value?.toFixed(2)}`, '']}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="avg_bid_price" 
                        stroke="#3B82F6" 
                        fill="url(#colorBid)" 
                        name="Avg Bid Price"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="avg_win_price" 
                        stroke="#10B981" 
                        fill="url(#colorWin)" 
                        name="Avg Win Price"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaign Summary Table (for all campaigns view) */}
          {selectedCampaign === "all" && campaigns.length > 0 && (
            <Card className="surface-primary border-panel mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#F8FAFC]">Campaign Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full data-table">
                  <thead>
                    <tr className="border-b border-[#2D3B55]">
                      <th>Campaign</th>
                      <th>Status</th>
                      <th>Bids</th>
                      <th>Wins</th>
                      <th>Win Rate</th>
                      <th>Spend</th>
                      <th>Bid Shading</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => (
                      <tr key={c.id} className="border-b border-[#2D3B55] hover:bg-[#151F32]/50">
                        <td className="text-[#F8FAFC]">{c.name}</td>
                        <td>
                          <Badge 
                            variant="outline"
                            className={c.status === "active" 
                              ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30"
                              : "bg-[#64748B]/20 text-[#64748B] border-[#64748B]/30"
                            }
                          >
                            {c.status}
                          </Badge>
                        </td>
                        <td className="font-mono">{formatNumber(c.bids || 0)}</td>
                        <td className="font-mono text-[#10B981]">{formatNumber(c.wins || 0)}</td>
                        <td className="font-mono text-[#F59E0B]">
                          {c.bids > 0 ? ((c.wins / c.bids) * 100).toFixed(1) : 0}%
                        </td>
                        <td className="font-mono">{formatCurrency(c.budget?.total_spend || 0)}</td>
                        <td>
                          {c.bid_shading?.enabled ? (
                            <span className="text-[#3B82F6]">
                              {(c.bid_shading.current_shade_factor * 100).toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-[#64748B]">Off</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
