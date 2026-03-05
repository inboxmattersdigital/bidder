import { useEffect, useState } from "react";
import { 
  Scale, RefreshCw, TrendingUp, TrendingDown, ChevronRight,
  Target, DollarSign, BarChart2, Check, X, Lightbulb
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import { getCampaigns, compareCampaigns } from "../lib/api";

export default function CampaignComparison() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await getCampaigns();
      setCampaigns(res.data);
    } catch (error) {
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else if (selectedIds.length < 3) {
      setSelectedIds([...selectedIds, id]);
    } else {
      toast.error("Maximum 3 campaigns can be compared");
    }
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      toast.error("Select at least 2 campaigns");
      return;
    }
    
    try {
      setComparing(true);
      const res = await compareCampaigns(selectedIds);
      setComparison(res.data);
    } catch (error) {
      toast.error("Failed to compare campaigns");
    } finally {
      setComparing(false);
    }
  };

  const getMetricColor = (metric, idx, values) => {
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    if (values[idx] === maxVal && maxVal > 0) return "text-[#10B981]";
    if (values[idx] === minVal && minVal < maxVal) return "text-[#EF4444]";
    return "text-[#F8FAFC]";
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[#64748B]">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="comparison-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Campaign Comparison</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Compare 2-3 campaigns side-by-side to identify optimization opportunities
          </p>
        </div>
        <Button 
          onClick={handleCompare}
          disabled={selectedIds.length < 2 || comparing}
          className="bg-[#3B82F6] hover:bg-[#60A5FA]"
          data-testid="compare-btn"
        >
          {comparing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Scale className="w-4 h-4 mr-2" />}
          Compare ({selectedIds.length} selected)
        </Button>
      </div>

      {/* Campaign Selection */}
      <Card className="surface-primary border-panel">
        <CardHeader>
          <CardTitle className="text-lg text-[#F8FAFC]">Select Campaigns to Compare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {campaigns.map(campaign => (
              <div 
                key={campaign.id}
                onClick={() => toggleSelection(campaign.id)}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  selectedIds.includes(campaign.id) 
                    ? "border-[#3B82F6] bg-[#3B82F6]/10" 
                    : "border-[#2D3B55] hover:border-[#3B82F6]/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#F8FAFC]">{campaign.name}</p>
                    <p className="text-xs text-[#64748B] mt-1">{campaign.status}</p>
                  </div>
                  <Checkbox 
                    checked={selectedIds.includes(campaign.id)}
                    onCheckedChange={() => toggleSelection(campaign.id)}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-[#10B981]">${campaign.bid_price?.toFixed(2)}</span>
                  <span className="text-[#64748B]">|</span>
                  <span className="text-[#94A3B8]">{campaign.bids || 0} bids</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6">
          {/* Metrics Comparison */}
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[#3B82F6]" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2D3B55]">
                      <th className="text-left py-3 px-4 text-[#64748B] text-sm font-medium">Metric</th>
                      {comparison.campaigns.map((c, idx) => (
                        <th key={idx} className="text-right py-3 px-4 text-[#F8FAFC] text-sm font-medium">
                          {c.name}
                        </th>
                      ))}
                      <th className="text-center py-3 px-4 text-[#64748B] text-sm font-medium">Best</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(comparison.metrics_comparison).map(([metric, data]) => (
                      <tr key={metric} className="border-b border-[#2D3B55]/50">
                        <td className="py-3 px-4 text-[#94A3B8] capitalize">{metric.replace("_", " ")}</td>
                        {data.values.map((val, idx) => (
                          <td 
                            key={idx} 
                            className={`py-3 px-4 text-right font-mono ${getMetricColor(metric, idx, data.values)}`}
                          >
                            {metric === "bid_price" ? `$${val?.toFixed(2)}` : 
                             metric === "win_rate" ? `${val}%` : 
                             val?.toLocaleString()}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-center">
                          {data.best ? (
                            <Badge className="bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30">
                              <Check className="w-3 h-3 mr-1" />
                              {comparison.campaigns.find(c => c.id === data.best)?.name?.substring(0, 10)}
                            </Badge>
                          ) : (
                            <span className="text-[#64748B]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Targeting Differences */}
          <Card className="surface-primary border-panel">
            <CardHeader>
              <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
                <Target className="w-5 h-5 text-[#F59E0B]" />
                Targeting Differences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(comparison.targeting_differences).map(([field, data]) => (
                  <div key={field} className="p-3 surface-secondary rounded">
                    <p className="text-sm font-medium text-[#F8FAFC] mb-2">{field.replace(".", " → ")}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[#64748B] mb-1">Common</p>
                        <div className="flex flex-wrap gap-1">
                          {data.common.length > 0 ? data.common.map((v, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30">
                              {v}
                            </Badge>
                          )) : (
                            <span className="text-[#64748B] text-xs">None</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-[#64748B] mb-1">Unique per campaign</p>
                        <div className="space-y-1">
                          {data.unique.map((u, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs text-[#94A3B8]">{comparison.campaigns[idx]?.name?.substring(0, 15)}:</span>
                              <div className="flex flex-wrap gap-1">
                                {u.length > 0 ? u.map((v, i) => (
                                  <Badge key={i} variant="outline" className="text-[9px] text-[#64748B] border-[#2D3B55]">
                                    {v}
                                  </Badge>
                                )) : (
                                  <span className="text-[#64748B] text-xs">-</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {comparison.recommendations.length > 0 && (
            <Card className="surface-primary border-panel border-[#F59E0B]/30">
              <CardHeader>
                <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-[#F59E0B]" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparison.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 surface-secondary rounded">
                      <ChevronRight className="w-4 h-4 text-[#F59E0B] mt-0.5" />
                      <p className="text-sm text-[#94A3B8]">{rec.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
