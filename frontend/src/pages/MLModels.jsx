import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Brain, RefreshCw, Database, TrendingUp, Layers,
  ChevronDown, ChevronRight, Activity, Cpu
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { getAllMLModels, getMLModelDetails, trainMLModel } from "../lib/api";

export default function MLModels() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState({});
  const [expandedModel, setExpandedModel] = useState(null);
  const [modelDetails, setModelDetails] = useState({});

  const fetchModels = async () => {
    try {
      setLoading(true);
      const res = await getAllMLModels();
      setModels(res.data.models || []);
    } catch (error) {
      toast.error("Failed to load ML models");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleTrain = async (campaignId) => {
    try {
      setTraining(prev => ({ ...prev, [campaignId]: true }));
      const res = await trainMLModel(campaignId);
      if (res.data.status === "insufficient_data") {
        toast.warning(`Need ${res.data.required - res.data.data_points} more data points`);
      } else {
        toast.success(`Model trained with ${res.data.features_trained} features`);
        fetchModels();
      }
    } catch (error) {
      toast.error("Failed to train model");
    } finally {
      setTraining(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  const toggleExpand = async (campaignId) => {
    if (expandedModel === campaignId) {
      setExpandedModel(null);
    } else {
      setExpandedModel(campaignId);
      if (!modelDetails[campaignId]) {
        try {
          const res = await getMLModelDetails(campaignId);
          setModelDetails(prev => ({ ...prev, [campaignId]: res.data }));
        } catch (error) {
          toast.error("Failed to load model details");
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[#64748B]">Loading ML models...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="ml-models-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">ML Model Management</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Train and monitor machine learning models for bid optimization
          </p>
        </div>
        <Button 
          onClick={fetchModels}
          className="bg-[#3B82F6] hover:bg-[#60A5FA]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#8B5CF6]/20">
              <Brain className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">ML-Enabled Campaigns</p>
              <p className="text-xl font-bold text-[#F8FAFC]">{models.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#10B981]/20">
              <Cpu className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Trained Models</p>
              <p className="text-xl font-bold text-[#10B981]">
                {models.filter(m => m.status === "trained").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3B82F6]/20">
              <Database className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Total Data Points</p>
              <p className="text-xl font-bold text-[#F8FAFC]">
                {models.reduce((sum, m) => sum + m.total_data_points, 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <Layers className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Total Features</p>
              <p className="text-xl font-bold text-[#F8FAFC]">
                {models.reduce((sum, m) => sum + m.features_count, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Models List */}
      <div className="space-y-4">
        {models.map((model) => (
          <Card key={model.campaign_id} className="surface-primary border-panel overflow-hidden">
            <CardHeader 
              className="pb-2 cursor-pointer hover:bg-[#151F32]/50 transition-colors"
              onClick={() => toggleExpand(model.campaign_id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedModel === model.campaign_id ? 
                    <ChevronDown className="w-5 h-5 text-[#64748B]" /> : 
                    <ChevronRight className="w-5 h-5 text-[#64748B]" />
                  }
                  <Brain className={`w-5 h-5 ${model.ml_enabled ? "text-[#8B5CF6]" : "text-[#64748B]"}`} />
                  <div>
                    <CardTitle className="text-lg text-[#F8FAFC]">{model.campaign_name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={model.status === "trained" ? 
                          "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30" : 
                          "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30"
                        }
                      >
                        {model.status === "trained" ? "TRAINED" : "NEEDS DATA"}
                      </Badge>
                      <span className="text-xs text-[#64748B]">
                        {model.features_count} features • {model.total_data_points} data points
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-[#64748B]">Prediction Weight</p>
                    <p className="text-lg font-mono text-[#F8FAFC]">{(model.prediction_weight * 100).toFixed(0)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#64748B]">Avg Win Rate</p>
                    <p className="text-lg font-mono text-[#10B981]">{model.avg_win_rate}%</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleTrain(model.campaign_id); }}
                    disabled={training[model.campaign_id]}
                    className="bg-[#8B5CF6] hover:bg-[#A78BFA]"
                    data-testid={`train-model-${model.campaign_id}`}
                  >
                    {training[model.campaign_id] ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Activity className="w-4 h-4 mr-2" />
                        Train
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Expanded Details */}
            {expandedModel === model.campaign_id && modelDetails[model.campaign_id] && (
              <CardContent className="border-t border-[#2D3B55] pt-4">
                <div className="space-y-4">
                  {/* Training Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#94A3B8]">Training Data</span>
                      <span className="text-[#F8FAFC]">
                        {modelDetails[model.campaign_id].total_data_points} / 100 required
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, modelDetails[model.campaign_id].total_data_points)} 
                      className="h-2"
                    />
                  </div>

                  {/* Feature Groups */}
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(modelDetails[model.campaign_id].feature_groups || {}).map(([group, features]) => (
                      <div key={group} className="surface-secondary rounded p-3">
                        <h4 className="text-sm font-medium text-[#F8FAFC] mb-2 capitalize">
                          {group.replace("_", " ")}
                        </h4>
                        <div className="space-y-1">
                          {features.slice(0, 5).map((f, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-[#94A3B8] truncate max-w-[100px]">{f.value}</span>
                              <span className="text-[#10B981] font-mono">{f.win_rate}%</span>
                            </div>
                          ))}
                          {features.length > 5 && (
                            <p className="text-xs text-[#64748B]">+{features.length - 5} more</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Performance Summary */}
                  {modelDetails[model.campaign_id].performance_summary && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="surface-secondary rounded p-3">
                        <h4 className="text-sm font-medium text-[#10B981] mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Best Performing
                        </h4>
                        <div className="space-y-1">
                          {modelDetails[model.campaign_id].performance_summary.best_performing?.slice(0, 3).map((f, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-[#94A3B8]">{f.feature_key}</span>
                              <span className="text-[#10B981] font-mono">{(f.win_rate * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="surface-secondary rounded p-3">
                        <h4 className="text-sm font-medium text-[#EF4444] mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 rotate-180" />
                          Worst Performing
                        </h4>
                        <div className="space-y-1">
                          {modelDetails[model.campaign_id].performance_summary.worst_performing?.slice(0, 3).map((f, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-[#94A3B8]">{f.feature_key}</span>
                              <span className="text-[#EF4444] font-mono">{(f.win_rate * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/campaigns/${model.campaign_id}/edit`)}
                      className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC]"
                    >
                      Edit Campaign Settings
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {models.length === 0 && (
          <Card className="surface-primary border-panel">
            <CardContent className="p-8 text-center">
              <Brain className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
              <p className="text-[#F8FAFC] font-medium">No ML Models</p>
              <p className="text-sm text-[#64748B] mb-4">
                Enable ML prediction on campaigns to start training models.
              </p>
              <Button
                onClick={() => navigate("/campaigns")}
                className="bg-[#8B5CF6] hover:bg-[#A78BFA]"
              >
                Go to Campaigns
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
