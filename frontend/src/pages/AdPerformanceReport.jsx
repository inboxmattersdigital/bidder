import { useState, useEffect, useMemo } from "react";
import { 
  Download, FileSpreadsheet, BarChart3, RefreshCw, Calendar, Filter, Eye, Video,
  MousePointerClick, Users, Target, Layers, Globe, CheckCircle, Loader2,
  AlertCircle, Save, Trash2, Server, Image, Database, BookMarked, Plus,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Search,
  MapPin, Smartphone, Package, Monitor, Wifi, DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Switch } from "../components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import { toast } from "sonner";
import { 
  generateAdPerformanceReport, exportAdPerformanceCSV, exportAdPerformanceExcel,
  getReportTemplates, saveReportTemplate, deleteReportTemplate,
  getCampaigns, getCreatives
} from "../lib/api";

// Dimensions configuration - Extended
const DIMENSIONS = [
  { id: "campaign_name", label: "Campaign Name", icon: Target, description: "Campaign identifier" },
  { id: "creative_name", label: "Creative Name", icon: Image, description: "Creative asset name" },
  { id: "source", label: "Source", icon: Server, description: "SSP/Exchange source" },
  { id: "domain", label: "Domain", icon: Globe, description: "Publisher domain" },
  { id: "bundle", label: "Bundle", icon: Package, description: "App bundle ID" },
  { id: "app_name", label: "App Name", icon: Smartphone, description: "Application name" },
  { id: "country", label: "Country", icon: Globe, description: "User country" },
  { id: "city", label: "City", icon: MapPin, description: "User city" },
  { id: "ip", label: "IP Address", icon: Wifi, description: "User IP address" },
  { id: "device_ifa", label: "Device ID", icon: Smartphone, description: "Device IFA (IDFA/GAID)" },
  { id: "os", label: "OS", icon: Monitor, description: "Operating system" },
  { id: "make", label: "Make", icon: Smartphone, description: "Device manufacturer" },
];

// Metrics configuration - Selectable
const PERFORMANCE_METRICS = [
  { id: "requests", label: "Requests", icon: Server, color: "#64748B", default: true },
  { id: "bids", label: "Bids", icon: Target, color: "#3B82F6", default: true },
  { id: "wins", label: "Wins", icon: CheckCircle, color: "#10B981", default: true },
  { id: "impressions", label: "Impressions", icon: Eye, color: "#8B5CF6", default: true },
  { id: "spend", label: "Spend", icon: DollarSign, color: "#F59E0B", default: true },
  { id: "win_rate", label: "Win Rate", icon: Target, color: "#6366F1", default: true },
  { id: "clicks", label: "Clicks", icon: MousePointerClick, color: "#EC4899", default: false },
  { id: "ctr", label: "CTR", icon: Target, color: "#8B5CF6", default: false },
  { id: "conversions", label: "Conversions", icon: CheckCircle, color: "#EC4899", default: false },
];

const DERIVED_METRICS = [
  { id: "ecpm", label: "eCPM", icon: Target, color: "#14B8A6", default: false },
  { id: "cpc", label: "CPC", icon: MousePointerClick, color: "#F97316", default: false },
  { id: "cpv", label: "CPV", icon: Video, color: "#8B5CF6", default: false },
];

const VIDEO_METRICS = [
  { id: "video_q1_25", label: "Q1 (25%)", color: "#06B6D4", default: true },
  { id: "video_q2_50", label: "Q2 (50%)", color: "#14B8A6", default: true },
  { id: "video_q3_75", label: "Q3 (75%)", color: "#22C55E", default: true },
  { id: "video_completed_100", label: "Completed (100%)", color: "#10B981", default: true },
  { id: "video_completion_rate", label: "Completion Rate", color: "#059669", default: true },
  { id: "vtr", label: "VTR", color: "#0D9488", default: false },
];

const ALL_METRICS = [...PERFORMANCE_METRICS, ...DERIVED_METRICS, ...VIDEO_METRICS];

const TEMPLATE_ICONS = {
  BarChart3, Video, Globe, Image, Server, Target, Users,
};

// Summary Stat Card
function SummaryCard({ label, value, icon: Icon, color, className = "" }) {
  return (
    <div className={`p-4 rounded-lg border ${className}`} style={{ borderColor: `${color}40`, backgroundColor: `${color}10` }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-5 h-5" style={{ color }} />
        <span className="text-sm text-[#94A3B8]">{label}</span>
      </div>
      <p className="text-3xl font-bold text-[#F8FAFC]">{value}</p>
    </div>
  );
}

// Metric Card
function MetricCard({ label, value, icon: Icon, color }) {
  return (
    <div className="p-3 surface-secondary rounded-lg border border-[#2D3B55]">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-[#64748B] uppercase">{label}</span>
      </div>
      <p className="text-xl font-bold text-[#F8FAFC]">{value}</p>
    </div>
  );
}

// Template Card
function TemplateCard({ template, onApply, onDelete, isCustom }) {
  const IconComponent = TEMPLATE_ICONS[template.icon] || BarChart3;
  
  return (
    <Card 
      className="surface-secondary border-[#2D3B55] hover:border-[#3B82F6]/50 transition-all cursor-pointer group"
      onClick={() => onApply(template)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center">
            <IconComponent className="w-5 h-5 text-[#3B82F6]" />
          </div>
          {isCustom && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 text-[#EF4444]"
              onClick={(e) => { e.stopPropagation(); onDelete(template.id); }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        <h3 className="text-sm font-semibold text-[#F8FAFC] mb-1">{template.name}</h3>
        <p className="text-xs text-[#64748B] mb-3">{template.description}</p>
        <div className="flex flex-wrap gap-1">
          {template.dimensions.slice(0, 3).map((dim) => (
            <Badge key={dim} className="bg-[#10B981]/20 text-[#10B981] text-[10px]">{dim}</Badge>
          ))}
          {template.dimensions.length > 3 && (
            <Badge className="bg-[#64748B]/20 text-[#64748B] text-[10px]">+{template.dimensions.length - 3}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdPerformanceReport() {
  // State
  const [selectedDimensions, setSelectedDimensions] = useState(["campaign_name", "creative_name", "source", "domain"]);
  const [selectedMetrics, setSelectedMetrics] = useState(
    ALL_METRICS.filter(m => m.default).map(m => m.id)
  );
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [useRealData, setUseRealData] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");
  
  // Filter state
  const [campaigns, setCampaigns] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [selectedCreative, setSelectedCreative] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState("impressions");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Templates state
  const [templates, setTemplates] = useState({ built_in: [], custom: [] });
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");

  // Load campaigns and creatives on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [campaignsRes, creativesRes, templatesRes] = await Promise.all([
        getCampaigns(),
        getCreatives(),
        getReportTemplates()
      ]);
      setCampaigns(campaignsRes.data || []);
      setCreatives(creativesRes.data || []);
      setTemplates(templatesRes.data || { built_in: [], custom: [] });
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const toggleDimension = (dimId) => {
    if (selectedDimensions.includes(dimId)) {
      if (selectedDimensions.length > 1) {
        setSelectedDimensions(selectedDimensions.filter(d => d !== dimId));
      }
    } else {
      setSelectedDimensions([...selectedDimensions, dimId]);
    }
  };

  const toggleMetric = (metricId) => {
    if (selectedMetrics.includes(metricId)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter(m => m !== metricId));
      }
    } else {
      setSelectedMetrics([...selectedMetrics, metricId]);
    }
  };

  const selectAllMetrics = () => setSelectedMetrics(ALL_METRICS.map(m => m.id));
  const selectPerformanceMetrics = () => setSelectedMetrics([...PERFORMANCE_METRICS, ...DERIVED_METRICS].map(m => m.id));
  const selectVideoMetrics = () => setSelectedMetrics(VIDEO_METRICS.map(m => m.id));

  const applyTemplate = (template) => {
    setSelectedDimensions(template.dimensions);
    if (template.metrics) {
      setSelectedMetrics(template.metrics);
    }
    setActiveTab("config");
    toast.success(`Applied template: ${template.name}`);
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    try {
      await saveReportTemplate(newTemplateName, newTemplateDesc || `Custom template`, selectedDimensions, selectedMetrics);
      toast.success("Template saved");
      setShowSaveDialog(false);
      setNewTemplateName("");
      setNewTemplateDesc("");
      const res = await getReportTemplates();
      setTemplates(res.data);
    } catch (error) {
      toast.error("Failed to save template");
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await deleteReportTemplate(id);
      toast.success("Template deleted");
      const res = await getReportTemplates();
      setTemplates(res.data);
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const response = await generateAdPerformanceReport(
        selectedDimensions,
        selectedMetrics,
        startDate,
        endDate,
        10000, // Get all rows
        useRealData,
        selectedCampaign !== "all" ? selectedCampaign : null,
        selectedCreative !== "all" ? selectedCreative : null
      );
      setReportData(response.data);
      setCurrentPage(1);
      setActiveTab("preview");
      toast.success("Report generated successfully");
    } catch (error) {
      toast.error("Failed to generate report");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    exportAdPerformanceCSV(selectedDimensions, selectedMetrics, startDate, endDate, 10000);
    toast.success("Downloading CSV...");
  };

  const handleExportExcel = () => {
    exportAdPerformanceExcel(selectedDimensions, selectedMetrics, startDate, endDate, 10000);
    toast.success("Downloading Excel...");
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!reportData?.data) return [];
    
    let filtered = reportData.data;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(term)
        )
      );
    }
    
    // Apply campaign filter
    if (selectedCampaign !== "all") {
      filtered = filtered.filter(row => row.campaign_name === selectedCampaign || row.campaign_id === selectedCampaign);
    }
    
    // Apply creative filter
    if (selectedCreative !== "all") {
      filtered = filtered.filter(row => row.creative_name === selectedCreative || row.creative_id === selectedCreative);
    }
    
    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortColumn] || 0;
      const bVal = b[sortColumn] || 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc' 
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    
    return filtered;
  }, [reportData, searchTerm, selectedCampaign, selectedCreative, sortColumn, sortDirection]);

  // Calculate totals from filtered data
  const totals = useMemo(() => {
    return {
      requests: filteredAndSortedData.reduce((sum, row) => sum + (row.requests || 0), 0),
      bids: filteredAndSortedData.reduce((sum, row) => sum + (row.bids || 0), 0),
      wins: filteredAndSortedData.reduce((sum, row) => sum + (row.wins || 0), 0),
      impressions: filteredAndSortedData.reduce((sum, row) => sum + (row.impressions || 0), 0),
      clicks: filteredAndSortedData.reduce((sum, row) => sum + (row.clicks || 0), 0),
      conversions: filteredAndSortedData.reduce((sum, row) => sum + (row.conversions || 0), 0),
      spend: filteredAndSortedData.reduce((sum, row) => sum + (row.spend || 0), 0),
      video_completed: filteredAndSortedData.reduce((sum, row) => sum + (row.video_completed_100 || 0), 0),
    };
  }, [filteredAndSortedData]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatPercent = (num) => {
    if (num === undefined || num === null) return '0%';
    return `${(num * 100).toFixed(2)}%`;
  };

  // Column headers for the table - dynamically based on selected metrics
  const columns = useMemo(() => {
    const dimCols = selectedDimensions.map(dim => ({
      key: dim,
      label: DIMENSIONS.find(d => d.id === dim)?.label || dim,
      sortable: true
    }));
    
    const metricCols = selectedMetrics.map(metricId => {
      const metric = ALL_METRICS.find(m => m.id === metricId);
      return {
        key: metricId,
        label: metric?.label || metricId,
        sortable: true,
        format: metricId.includes('rate') || metricId === 'ctr' ? formatPercent : null
      };
    });
    
    return [...dimCols, ...metricCols];
  }, [selectedDimensions, selectedMetrics]);

  return (
    <div className="p-6" data-testid="ad-performance-report-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Ad Performance Report</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Comprehensive reporting with all dimensions and metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-[#94A3B8]">Real Data</Label>
            <Switch checked={useRealData} onCheckedChange={setUseRealData} />
          </div>
          <Button variant="outline" onClick={handleExportCSV} className="border-[#10B981] text-[#10B981]">
            <FileSpreadsheet className="w-4 h-4 mr-2" />CSV
          </Button>
          <Button onClick={handleExportExcel} className="bg-[#3B82F6]">
            <Download className="w-4 h-4 mr-2" />Excel
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-[#0A0F1C]">
          <TabsTrigger value="templates" className="data-[state=active]:bg-[#3B82F6]">
            <BookMarked className="w-4 h-4 mr-2" />Templates
          </TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-[#3B82F6]">
            <Filter className="w-4 h-4 mr-2" />Configure
          </TabsTrigger>
          <TabsTrigger value="preview" className="data-[state=active]:bg-[#3B82F6]">
            <BarChart3 className="w-4 h-4 mr-2" />Results
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          {/* Built-in Templates */}
          <div>
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Quick Start Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {templates.built_in?.map((template) => (
                <TemplateCard key={template.id} template={template} onApply={applyTemplate} onDelete={() => {}} isCustom={false} />
              ))}
            </div>
          </div>

          {/* Custom Templates */}
          {templates.custom?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Your Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {templates.custom.map((template) => (
                  <TemplateCard key={template.id} template={template} onApply={applyTemplate} onDelete={handleDeleteTemplate} isCustom={true} />
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <Button onClick={() => setActiveTab("config")} className="bg-[#3B82F6]">
              <Plus className="w-4 h-4 mr-2" />Create Custom Report
            </Button>
          </div>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Filters */}
            <Card className="surface-secondary border-[#2D3B55]">
              <CardHeader>
                <CardTitle className="text-[#F8FAFC] flex items-center gap-2">
                  <Filter className="w-5 h-5 text-[#3B82F6]" />Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campaign Filter */}
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Campaign</Label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
                      <SelectValue placeholder="All Campaigns" />
                    </SelectTrigger>
                    <SelectContent className="surface-primary border-[#2D3B55]">
                      <SelectItem value="all" className="text-[#F8FAFC]">All Campaigns</SelectItem>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-[#F8FAFC]">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Creative Filter */}
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Creative</Label>
                  <Select value={selectedCreative} onValueChange={setSelectedCreative}>
                    <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
                      <SelectValue placeholder="All Creatives" />
                    </SelectTrigger>
                    <SelectContent className="surface-primary border-[#2D3B55]">
                      <SelectItem value="all" className="text-[#F8FAFC]">All Creatives</SelectItem>
                      {creatives.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-[#F8FAFC]">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="surface-primary border-[#2D3B55] text-[#F8FAFC]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">End Date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      className="surface-primary border-[#2D3B55] text-[#F8FAFC]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dimensions */}
            <Card className="surface-secondary border-[#2D3B55]">
              <CardHeader>
                <CardTitle className="text-[#F8FAFC] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#10B981]" />Dimensions (Group By)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {DIMENSIONS.map((dim) => {
                    const Icon = dim.icon;
                    const isSelected = selectedDimensions.includes(dim.id);
                    return (
                      <div
                        key={dim.id}
                        onClick={() => toggleDimension(dim.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                          isSelected ? "bg-[#10B981]/20 border-[#10B981]" : "surface-primary border-[#2D3B55] hover:border-[#10B981]/50"
                        }`}
                      >
                        <Checkbox checked={isSelected} onChange={() => {}} />
                        <Icon className={`w-5 h-5 ${isSelected ? "text-[#10B981]" : "text-[#64748B]"}`} />
                        <div>
                          <p className="text-sm font-medium text-[#F8FAFC]">{dim.label}</p>
                          <p className="text-xs text-[#64748B]">{dim.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metrics Selection */}
          <Card className="surface-secondary border-[#2D3B55]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#F8FAFC] flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#3B82F6]" />Select Metrics
                  </CardTitle>
                  <CardDescription className="text-[#64748B]">Choose which metrics to include in your report</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={selectAllMetrics} className="border-[#3B82F6] text-[#3B82F6]">All</Button>
                  <Button size="sm" variant="outline" onClick={selectPerformanceMetrics} className="border-[#10B981] text-[#10B981]">Core</Button>
                  <Button size="sm" variant="outline" onClick={selectVideoMetrics} className="border-[#8B5CF6] text-[#8B5CF6]">Video</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Core Performance Metrics */}
                <div>
                  <h4 className="text-sm font-medium text-[#94A3B8] mb-2">Core Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {PERFORMANCE_METRICS.map((m) => {
                      const isSelected = selectedMetrics.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMetric(m.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
                            isSelected ? "border-[#3B82F6] bg-[#3B82F6]/20" : "border-[#2D3B55] hover:border-[#3B82F6]/50"
                          }`}
                        >
                          <Checkbox checked={isSelected} onChange={() => {}} />
                          <span className="text-sm text-[#F8FAFC]">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Derived Metrics */}
                <div>
                  <h4 className="text-sm font-medium text-[#94A3B8] mb-2">Derived Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {DERIVED_METRICS.map((m) => {
                      const isSelected = selectedMetrics.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMetric(m.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
                            isSelected ? "border-[#14B8A6] bg-[#14B8A6]/20" : "border-[#2D3B55] hover:border-[#14B8A6]/50"
                          }`}
                        >
                          <Checkbox checked={isSelected} onChange={() => {}} />
                          <span className="text-sm text-[#F8FAFC]">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Video Metrics */}
                <div>
                  <h4 className="text-sm font-medium text-[#94A3B8] mb-2">Video Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {VIDEO_METRICS.map((m) => {
                      const isSelected = selectedMetrics.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMetric(m.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
                            isSelected ? "border-[#8B5CF6] bg-[#8B5CF6]/20" : "border-[#2D3B55] hover:border-[#8B5CF6]/50"
                          }`}
                        >
                          <Checkbox checked={isSelected} onChange={() => {}} />
                          <span className="text-sm text-[#F8FAFC]">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#64748B]">
                  <CheckCircle className="w-4 h-4 text-[#10B981]" />
                  <span>{selectedMetrics.length} metrics selected</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-center gap-4 pt-4">
            <Button variant="outline" onClick={() => setShowSaveDialog(true)} className="border-[#8B5CF6] text-[#8B5CF6]">
              <Save className="w-4 h-4 mr-2" />Save as Template
            </Button>
            <Button size="lg" onClick={generateReport} disabled={loading} className="bg-[#3B82F6] px-8">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><RefreshCw className="w-4 h-4 mr-2" />Generate Report</>}
            </Button>
          </div>
        </TabsContent>

        {/* Preview/Results Tab */}
        <TabsContent value="preview" className="space-y-6">
          {reportData ? (
            <>
              {/* Total Summary - Top Section */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <SummaryCard label="Total Bids" value={formatNumber(totals.bids)} icon={Target} color="#3B82F6" />
                <SummaryCard label="Total Wins" value={formatNumber(totals.wins)} icon={CheckCircle} color="#10B981" />
                <SummaryCard label="Impressions" value={formatNumber(totals.impressions)} icon={Eye} color="#8B5CF6" />
                <SummaryCard label="Total Spend" value={`$${formatNumber(totals.spend)}`} icon={DollarSign} color="#F59E0B" />
                <SummaryCard label="Win Rate" value={`${totals.bids > 0 ? ((totals.wins / totals.bids) * 100).toFixed(2) : 0}%`} icon={Target} color="#6366F1" />
                <SummaryCard label="eCPM" value={`$${totals.impressions > 0 ? ((totals.spend / totals.impressions) * 1000).toFixed(2) : 0}`} icon={DollarSign} color="#14B8A6" />
              </div>

              {/* Filters and Search Bar */}
              <Card className="surface-secondary border-[#2D3B55]">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                        <Input
                          placeholder="Search in results..."
                          value={searchTerm}
                          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                          className="pl-10 surface-primary border-[#2D3B55] text-[#F8FAFC]"
                        />
                      </div>
                    </div>

                    {/* Campaign Filter */}
                    <Select value={selectedCampaign} onValueChange={(v) => { setSelectedCampaign(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[200px] surface-primary border-[#2D3B55] text-[#F8FAFC]">
                        <SelectValue placeholder="All Campaigns" />
                      </SelectTrigger>
                      <SelectContent className="surface-primary border-[#2D3B55]">
                        <SelectItem value="all" className="text-[#F8FAFC]">All Campaigns</SelectItem>
                        {campaigns.map((c) => (
                          <SelectItem key={c.id} value={c.name} className="text-[#F8FAFC]">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Creative Filter */}
                    <Select value={selectedCreative} onValueChange={(v) => { setSelectedCreative(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[200px] surface-primary border-[#2D3B55] text-[#F8FAFC]">
                        <SelectValue placeholder="All Creatives" />
                      </SelectTrigger>
                      <SelectContent className="surface-primary border-[#2D3B55]">
                        <SelectItem value="all" className="text-[#F8FAFC]">All Creatives</SelectItem>
                        {creatives.map((c) => (
                          <SelectItem key={c.id} value={c.name} className="text-[#F8FAFC]">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Data Source Badge */}
                    <Badge className={reportData.report_metadata?.is_real_data ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#F59E0B]/20 text-[#F59E0B]"}>
                      <Database className="w-3 h-3 mr-1" />
                      {reportData.report_metadata?.is_real_data ? "REAL DATA" : "MOCK DATA"}
                    </Badge>

                    {/* Row count */}
                    <span className="text-sm text-[#94A3B8]">{filteredAndSortedData.length} rows</span>
                  </div>
                </CardContent>
              </Card>

              {/* Data Table */}
              <Card className="surface-secondary border-[#2D3B55]">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[#2D3B55] hover:bg-transparent">
                          {columns.map((col) => (
                            <TableHead
                              key={col.key}
                              className={`text-[#94A3B8] font-semibold ${col.sortable ? 'cursor-pointer hover:text-[#F8FAFC]' : ''}`}
                              onClick={() => col.sortable && handleSort(col.key)}
                            >
                              <div className="flex items-center gap-1">
                                {col.label}
                                {col.sortable && (
                                  <ArrowUpDown className={`w-3 h-3 ${sortColumn === col.key ? 'text-[#3B82F6]' : ''}`} />
                                )}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((row, idx) => (
                          <TableRow key={idx} className="border-b border-[#2D3B55]/50 hover:bg-[#1E293B]/50">
                            {columns.map((col) => (
                              <TableCell key={col.key} className="text-[#F8FAFC]">
                                {col.format ? col.format(row[col.key]) : (typeof row[col.key] === 'number' ? formatNumber(row[col.key]) : row[col.key] || '-')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                        {paginatedData.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={columns.length} className="text-center text-[#64748B] py-8">
                              No data found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between p-4 border-t border-[#2D3B55]">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-[#64748B]">Rows per page:</span>
                      <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[80px] surface-primary border-[#2D3B55] text-[#F8FAFC]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="surface-primary border-[#2D3B55]">
                          <SelectItem value="10" className="text-[#F8FAFC]">10</SelectItem>
                          <SelectItem value="25" className="text-[#F8FAFC]">25</SelectItem>
                          <SelectItem value="50" className="text-[#F8FAFC]">50</SelectItem>
                          <SelectItem value="100" className="text-[#F8FAFC]">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-[#94A3B8]">
                        Showing {((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                        className="border-[#2D3B55] text-[#94A3B8]">
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                        className="border-[#2D3B55] text-[#94A3B8]">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-[#F8FAFC] px-2">Page {currentPage} of {totalPages || 1}</span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                        className="border-[#2D3B55] text-[#94A3B8]">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}
                        className="border-[#2D3B55] text-[#94A3B8]">
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="surface-secondary border-[#2D3B55]">
              <CardContent className="py-16 text-center">
                <BarChart3 className="w-16 h-16 mx-auto text-[#3B82F6] mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-[#F8FAFC] mb-2">No Report Generated</h3>
                <p className="text-sm text-[#64748B] mb-4">Configure your report and click Generate</p>
                <Button onClick={() => setActiveTab("config")} className="bg-[#3B82F6]">
                  <Filter className="w-4 h-4 mr-2" />Configure Report
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="surface-primary border-[#2D3B55]">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">Save Report Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Template Name</Label>
              <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="My Custom Report" className="surface-secondary border-[#2D3B55] text-[#F8FAFC]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Description</Label>
              <Input value={newTemplateDesc} onChange={(e) => setNewTemplateDesc(e.target.value)}
                placeholder="Optional description" className="surface-secondary border-[#2D3B55] text-[#F8FAFC]" />
            </div>
            <div className="p-3 rounded-lg bg-[#1E293B]">
              <p className="text-xs text-[#64748B] mb-2">Selected Dimensions:</p>
              <div className="flex flex-wrap gap-1">
                {selectedDimensions.map((dim) => (
                  <Badge key={dim} className="bg-[#10B981]/20 text-[#10B981]">{dim}</Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)} className="border-[#2D3B55] text-[#94A3B8]">Cancel</Button>
            <Button onClick={handleSaveTemplate} className="bg-[#3B82F6]">Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
