import { useState, useEffect } from "react";
import { 
  Download, 
  FileSpreadsheet, 
  FileText,
  BarChart3,
  RefreshCw,
  Calendar,
  Filter,
  Eye,
  Video,
  MousePointerClick,
  Users,
  Target,
  Layers,
  Globe,
  Play,
  CheckCircle,
  Loader2,
  AlertCircle,
  Save,
  Trash2,
  Server,
  Image,
  Database,
  Zap,
  BookMarked,
  Plus
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { toast } from "sonner";
import { 
  generateAdPerformanceReport, 
  exportAdPerformanceCSV, 
  exportAdPerformanceExcel,
  getReportTemplates,
  saveReportTemplate,
  deleteReportTemplate
} from "../lib/api";

// Available dimensions
const DIMENSIONS = [
  { id: "source", label: "Source", icon: Globe, description: "SSP/Exchange source" },
  { id: "domain", label: "Domain", icon: Layers, description: "Publisher domain" },
  { id: "insertion_order", label: "Insertion Order", icon: FileText, description: "IO identifier" },
  { id: "line_item", label: "Line Item", icon: Target, description: "Line item name" },
  { id: "creative_name", label: "Creative Name", icon: Eye, description: "Creative asset" },
];

// Performance metrics info
const PERFORMANCE_METRICS = [
  { id: "impressions", label: "Impressions", icon: Eye, color: "#3B82F6" },
  { id: "reach", label: "Reach", icon: Users, color: "#10B981" },
  { id: "clicks", label: "Clicks", icon: MousePointerClick, color: "#F59E0B" },
  { id: "ctr", label: "CTR", icon: Target, color: "#8B5CF6" },
  { id: "conversions", label: "Conversions", icon: CheckCircle, color: "#EC4899" },
];

// Video metrics info
const VIDEO_METRICS = [
  { id: "video_q1_25", label: "Q1 (25%)", color: "#06B6D4" },
  { id: "video_q2_50", label: "Q2 (50%)", color: "#14B8A6" },
  { id: "video_q3_75", label: "Q3 (75%)", color: "#22C55E" },
  { id: "video_completed_100", label: "Completed (100%)", color: "#10B981" },
  { id: "video_completion_rate", label: "Completion Rate", color: "#059669" },
];

// Template icon mapping
const TEMPLATE_ICONS = {
  BarChart3: BarChart3,
  Video: Video,
  Globe: Globe,
  Image: Image,
  Server: Server,
  FileText: FileText,
  Target: Target,
  Users: Users,
};

function MetricCard({ label, value, icon: Icon, color, subValue }) {
  return (
    <div className="p-4 surface-secondary rounded-lg border border-[#2D3B55]">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-[#64748B] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[#F8FAFC]">{value}</p>
      {subValue && <p className="text-xs text-[#94A3B8] mt-1">{subValue}</p>}
    </div>
  );
}

function TemplateCard({ template, onApply, onDelete, isCustom }) {
  const IconComponent = TEMPLATE_ICONS[template.icon] || FileText;
  
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
              className="h-8 w-8 opacity-0 group-hover:opacity-100 text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(template.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        <h3 className="text-sm font-semibold text-[#F8FAFC] mb-1">{template.name}</h3>
        <p className="text-xs text-[#64748B] mb-3">{template.description}</p>
        <div className="flex flex-wrap gap-1">
          {template.dimensions.slice(0, 3).map((dim) => (
            <Badge key={dim} className="bg-[#10B981]/20 text-[#10B981] text-[10px]">
              {dim}
            </Badge>
          ))}
          {template.dimensions.length > 3 && (
            <Badge className="bg-[#64748B]/20 text-[#64748B] text-[10px]">
              +{template.dimensions.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdPerformanceReport() {
  const [selectedDimensions, setSelectedDimensions] = useState(["source", "domain", "creative_name"]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [numRows, setNumRows] = useState(100);
  const [useRealData, setUseRealData] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");
  
  // Templates state
  const [templates, setTemplates] = useState({ built_in: [], custom: [] });
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");

  // Load templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await getReportTemplates();
      setTemplates(response.data);
    } catch (error) {
      console.error("Failed to load templates:", error);
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

  const applyTemplate = (template) => {
    setSelectedDimensions(template.dimensions);
    setActiveTab("config");
    toast.success(`Applied template: ${template.name}`);
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    
    try {
      await saveReportTemplate(
        newTemplateName,
        newTemplateDesc || `Custom template with ${selectedDimensions.length} dimensions`,
        selectedDimensions
      );
      toast.success("Template saved successfully");
      setShowSaveDialog(false);
      setNewTemplateName("");
      setNewTemplateDesc("");
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to save template");
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await deleteReportTemplate(id);
      toast.success("Template deleted");
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete template");
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const response = await generateAdPerformanceReport(
        selectedDimensions,
        startDate,
        endDate,
        numRows,
        useRealData
      );
      setReportData(response.data);
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
    exportAdPerformanceCSV(selectedDimensions, startDate, endDate, numRows);
    toast.success("Downloading CSV report...");
  };

  const handleExportExcel = () => {
    exportAdPerformanceExcel(selectedDimensions, startDate, endDate, numRows);
    toast.success("Downloading Excel report...");
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toLocaleString() || '0';
  };

  return (
    <div className="p-6" data-testid="ad-performance-report-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Ad Performance Report</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Generate comprehensive reports for video and display campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          {reportData && (
            <>
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10"
                data-testid="export-csv-btn"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={handleExportExcel}
                className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white"
                data-testid="export-excel-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-[#0A0F1C] mb-6 p-1 h-auto">
          <TabsTrigger value="templates" className="data-[state=active]:bg-[#8B5CF6] px-4 py-2">
            <BookMarked className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-[#3B82F6] px-4 py-2">
            <Filter className="w-4 h-4 mr-2" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="preview" className="data-[state=active]:bg-[#10B981] px-4 py-2" disabled={!reportData}>
            <Eye className="w-4 h-4 mr-2" />
            Results
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          {/* Built-in Templates */}
          <div>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#F59E0B]" />
              Quick Start Templates
            </h2>
            {loadingTemplates ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-[#64748B]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {templates.built_in.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onApply={applyTemplate}
                    onDelete={() => {}}
                    isCustom={false}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Custom Templates */}
          <div>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-[#3B82F6]" />
              My Templates
            </h2>
            {templates.custom.length === 0 ? (
              <Card className="surface-secondary border-dashed border-[#2D3B55]">
                <CardContent className="py-8 text-center">
                  <Plus className="w-10 h-10 mx-auto text-[#64748B] mb-3" />
                  <p className="text-sm text-[#94A3B8] mb-2">No custom templates yet</p>
                  <p className="text-xs text-[#64748B]">
                    Configure a report and save it as a template for quick access
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {templates.custom.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onApply={applyTemplate}
                    onDelete={handleDeleteTemplate}
                    isCustom={true}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          {/* Data Source Toggle */}
          <Card className="surface-primary border-panel">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#10B981]/20">
                    <Database className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#F8FAFC]">Use Real Data</p>
                    <p className="text-xs text-[#64748B]">
                      Pull data from bid logs, campaigns, and creatives. Falls back to mock data if none available.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={useRealData}
                  onCheckedChange={setUseRealData}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card className="surface-primary border-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#3B82F6]" />
                Date Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">Max Rows</Label>
                  <Select value={numRows.toString()} onValueChange={(v) => setNumRows(parseInt(v))}>
                    <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="surface-primary border-[#2D3B55]">
                      <SelectItem value="50">50 rows</SelectItem>
                      <SelectItem value="100">100 rows</SelectItem>
                      <SelectItem value="250">250 rows</SelectItem>
                      <SelectItem value="500">500 rows</SelectItem>
                      <SelectItem value="1000">1,000 rows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dimensions Selection */}
          <Card className="surface-primary border-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#10B981]" />
                Dimensions (Group By)
              </CardTitle>
              <CardDescription className="text-[#64748B]">
                Select at least one dimension to group your report data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3">
                {DIMENSIONS.map((dim) => (
                  <div
                    key={dim.id}
                    onClick={() => toggleDimension(dim.id)}
                    className={`p-4 rounded-lg cursor-pointer border transition-all ${
                      selectedDimensions.includes(dim.id)
                        ? "bg-[#10B981]/20 border-[#10B981]"
                        : "surface-secondary border-[#2D3B55] hover:border-[#10B981]/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={selectedDimensions.includes(dim.id)}
                        onCheckedChange={() => toggleDimension(dim.id)}
                      />
                      <dim.icon className="w-4 h-4 text-[#10B981]" />
                    </div>
                    <p className="text-sm font-medium text-[#F8FAFC]">{dim.label}</p>
                    <p className="text-xs text-[#64748B] mt-1">{dim.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metrics Preview */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="surface-primary border-panel">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#3B82F6]" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {PERFORMANCE_METRICS.map((metric) => (
                    <div key={metric.id} className="flex items-center gap-3 p-2 rounded surface-secondary">
                      <metric.icon className="w-4 h-4" style={{ color: metric.color }} />
                      <span className="text-sm text-[#F8FAFC]">{metric.label}</span>
                      <Badge className="ml-auto bg-[#3B82F6]/20 text-[#3B82F6]">Included</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="surface-primary border-panel">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#F8FAFC] flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#8B5CF6]" />
                  Video Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {VIDEO_METRICS.map((metric) => (
                    <div key={metric.id} className="flex items-center gap-3 p-2 rounded surface-secondary">
                      <Play className="w-4 h-4" style={{ color: metric.color }} />
                      <span className="text-sm text-[#F8FAFC]">{metric.label}</span>
                      <Badge className="ml-auto bg-[#8B5CF6]/20 text-[#8B5CF6]">Included</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(true)}
              className="border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Template
            </Button>
            <Button
              size="lg"
              onClick={generateReport}
              disabled={loading || selectedDimensions.length === 0}
              className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white px-8"
              data-testid="generate-report-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          {reportData && (
            <>
              {/* Data Source Badge */}
              <Card className={`surface-secondary ${reportData.report_metadata.is_real_data ? 'border-[#10B981]/30' : 'border-[#F59E0B]/30'}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {reportData.report_metadata.is_real_data ? (
                      <Badge className="bg-[#10B981]/20 text-[#10B981]">
                        <Database className="w-3 h-3 mr-1" />
                        REAL DATA
                      </Badge>
                    ) : (
                      <Badge className="bg-[#F59E0B]/20 text-[#F59E0B]">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {reportData.report_metadata.data_source}
                      </Badge>
                    )}
                    <span className="text-sm text-[#94A3B8]">
                      {reportData.report_metadata.start_date} to {reportData.report_metadata.end_date}
                    </span>
                    <span className="text-sm text-[#64748B]">
                      {reportData.report_metadata.total_rows} rows
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      className="border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-1" />
                      CSV
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleExportExcel}
                      className="bg-[#3B82F6] hover:bg-[#60A5FA] text-white"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <MetricCard
                  label="Impressions"
                  value={formatNumber(reportData.summary.total_impressions)}
                  icon={Eye}
                  color="#3B82F6"
                />
                <MetricCard
                  label="Reach"
                  value={formatNumber(reportData.summary.total_reach)}
                  icon={Users}
                  color="#10B981"
                />
                <MetricCard
                  label="Clicks"
                  value={formatNumber(reportData.summary.total_clicks)}
                  icon={MousePointerClick}
                  color="#F59E0B"
                />
                <MetricCard
                  label="CTR"
                  value={`${reportData.summary.avg_ctr}%`}
                  icon={Target}
                  color="#8B5CF6"
                />
                <MetricCard
                  label="Conversions"
                  value={formatNumber(reportData.summary.total_conversions)}
                  icon={CheckCircle}
                  color="#EC4899"
                />
                <MetricCard
                  label="Video Completion"
                  value={`${reportData.summary.video_completion_rate}%`}
                  icon={Video}
                  color="#06B6D4"
                />
              </div>

              {/* Data Table */}
              <Card className="surface-primary border-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-[#F8FAFC]">Report Data</CardTitle>
                  <CardDescription className="text-[#64748B]">
                    Showing first 20 rows. Export to view all {reportData.data.length} rows.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[#2D3B55] hover:bg-transparent">
                          {selectedDimensions.map((dim) => (
                            <TableHead key={dim} className="text-[#10B981] font-semibold bg-[#10B981]/10">
                              {DIMENSIONS.find(d => d.id === dim)?.label}
                            </TableHead>
                          ))}
                          <TableHead className="text-[#3B82F6] font-semibold">Impressions</TableHead>
                          <TableHead className="text-[#3B82F6] font-semibold">Reach</TableHead>
                          <TableHead className="text-[#3B82F6] font-semibold">Clicks</TableHead>
                          <TableHead className="text-[#3B82F6] font-semibold">CTR (%)</TableHead>
                          <TableHead className="text-[#3B82F6] font-semibold">Conversions</TableHead>
                          <TableHead className="text-[#8B5CF6] font-semibold bg-[#8B5CF6]/10">Q1 (25%)</TableHead>
                          <TableHead className="text-[#8B5CF6] font-semibold bg-[#8B5CF6]/10">Q2 (50%)</TableHead>
                          <TableHead className="text-[#8B5CF6] font-semibold bg-[#8B5CF6]/10">Q3 (75%)</TableHead>
                          <TableHead className="text-[#8B5CF6] font-semibold bg-[#8B5CF6]/10">Completed</TableHead>
                          <TableHead className="text-[#8B5CF6] font-semibold bg-[#8B5CF6]/10">Completion %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.data.slice(0, 20).map((row, idx) => (
                          <TableRow key={idx} className="border-b border-[#2D3B55] hover:bg-[#151F32]/50">
                            {selectedDimensions.map((dim) => (
                              <TableCell key={dim} className="text-[#F8FAFC] font-mono text-xs">
                                {row[dim] || "-"}
                              </TableCell>
                            ))}
                            <TableCell className="text-[#F8FAFC] font-mono">{formatNumber(row.impressions)}</TableCell>
                            <TableCell className="text-[#F8FAFC] font-mono">{formatNumber(row.reach)}</TableCell>
                            <TableCell className="text-[#F8FAFC] font-mono">{formatNumber(row.clicks)}</TableCell>
                            <TableCell className="text-[#F59E0B] font-mono">{row.ctr}%</TableCell>
                            <TableCell className="text-[#10B981] font-mono">{row.conversions}</TableCell>
                            <TableCell className="text-[#94A3B8] font-mono">{formatNumber(row.video_q1_25)}</TableCell>
                            <TableCell className="text-[#94A3B8] font-mono">{formatNumber(row.video_q2_50)}</TableCell>
                            <TableCell className="text-[#94A3B8] font-mono">{formatNumber(row.video_q3_75)}</TableCell>
                            <TableCell className="text-[#94A3B8] font-mono">{formatNumber(row.video_completed_100)}</TableCell>
                            <TableCell className="text-[#10B981] font-mono">{row.video_completion_rate}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="surface-primary border-panel">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Template Name</Label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="My Custom Report"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Description (Optional)</Label>
              <Input
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
                placeholder="Description of this report configuration"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Selected Dimensions</Label>
              <div className="flex flex-wrap gap-2">
                {selectedDimensions.map((dim) => (
                  <Badge key={dim} className="bg-[#10B981]/20 text-[#10B981]">
                    {DIMENSIONS.find(d => d.id === dim)?.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              className="border-[#2D3B55] text-[#94A3B8]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
