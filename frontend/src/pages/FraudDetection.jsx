import { useEffect, useState } from "react";
import { 
  ShieldAlert, RefreshCw, AlertTriangle, Ban, CheckCircle,
  Activity, Eye, Bug, Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { getFraudStats, checkFraud, updateFraudPatterns } from "../lib/api";

export default function FraudDetection() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testRequest, setTestRequest] = useState(JSON.stringify({
    device: {
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
      ip: "192.168.1.1",
      geo: { country: "USA" },
      js: 1
    }
  }, null, 2));
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await getFraudStats();
      setStats(res.data);
    } catch (error) {
      toast.error("Failed to load fraud stats");
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    try {
      const requestData = JSON.parse(testRequest);
      const res = await checkFraud(requestData);
      setCheckResult(res.data);
    } catch (error) {
      toast.error("Invalid JSON or check failed");
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[#64748B]">Loading fraud stats...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="fraud-detection-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Fraud Detection</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Monitor and detect invalid traffic patterns
          </p>
        </div>
        <Button 
          onClick={fetchStats}
          className="bg-[#EF4444] hover:bg-[#F87171]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Stats
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3B82F6]/20">
              <Activity className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Total Bids</p>
              <p className="text-xl font-bold text-[#F8FAFC]">{stats?.total_bids?.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#EF4444]/20">
              <ShieldAlert className="w-5 h-5 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Flagged Bids</p>
              <p className="text-xl font-bold text-[#EF4444]">{stats?.flagged_bids?.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Fraud Rate</p>
              <p className="text-xl font-bold text-[#F59E0B]">{stats?.fraud_rate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#10B981]/20">
              <CheckCircle className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Clean Traffic</p>
              <p className="text-xl font-bold text-[#10B981]">
                {(100 - (stats?.fraud_rate || 0)).toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Fraud by Type */}
        <Card className="surface-primary border-panel">
          <CardHeader>
            <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
              <Bug className="w-5 h-5 text-[#EF4444]" />
              Fraud by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats?.fraud_by_type || {}).length > 0 ? (
              Object.entries(stats.fraud_by_type).map(([type, count]) => (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#94A3B8] capitalize">{type.replace("_", " ")}</span>
                    <span className="text-[#EF4444] font-mono">{count}</span>
                  </div>
                  <Progress 
                    value={(count / stats.flagged_bids) * 100} 
                    className="h-2"
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-[#10B981] mx-auto mb-3" />
                <p className="text-[#10B981]">No fraud detected</p>
                <p className="text-xs text-[#64748B]">All traffic appears clean</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detection Patterns */}
        <Card className="surface-primary border-panel">
          <CardHeader>
            <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#F59E0B]" />
              Detection Patterns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Bot User Agents</Label>
              <div className="flex flex-wrap gap-2">
                {stats?.patterns?.bot_user_agents?.map((ua, idx) => (
                  <Badge key={idx} variant="outline" className="text-[#EF4444] border-[#EF4444]/30">
                    {ua}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">High Frequency Threshold</Label>
              <p className="text-sm text-[#F8FAFC] font-mono">
                {stats?.patterns?.high_frequency_threshold} requests/min
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Invalid Geo Patterns</Label>
              <div className="flex flex-wrap gap-2">
                {stats?.patterns?.invalid_geo_patterns?.map((geo, idx) => (
                  <Badge key={idx} variant="outline" className="text-[#F59E0B] border-[#F59E0B]/30">
                    {geo}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fraud Checker */}
      <Card className="surface-primary border-panel">
        <CardHeader>
          <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#3B82F6]" />
            Test Fraud Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-[#94A3B8]">Bid Request JSON</Label>
              <textarea
                value={testRequest}
                onChange={(e) => setTestRequest(e.target.value)}
                rows={12}
                className="w-full p-3 surface-secondary border border-[#2D3B55] rounded text-[#F8FAFC] font-mono text-sm"
              />
              <Button onClick={handleCheck} className="w-full bg-[#3B82F6] hover:bg-[#60A5FA]">
                Check for Fraud
              </Button>
            </div>
            <div>
              <Label className="text-[#94A3B8] mb-3 block">Result</Label>
              {checkResult ? (
                <div className={`p-4 rounded border ${
                  checkResult.is_fraudulent 
                    ? "bg-[#EF4444]/10 border-[#EF4444]/30" 
                    : "bg-[#10B981]/10 border-[#10B981]/30"
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    {checkResult.is_fraudulent ? (
                      <Ban className="w-8 h-8 text-[#EF4444]" />
                    ) : (
                      <CheckCircle className="w-8 h-8 text-[#10B981]" />
                    )}
                    <div>
                      <p className={`text-lg font-bold ${
                        checkResult.is_fraudulent ? "text-[#EF4444]" : "text-[#10B981]"
                      }`}>
                        {checkResult.is_fraudulent ? "Fraud Detected" : "Clean Traffic"}
                      </p>
                      <p className="text-sm text-[#94A3B8]">
                        Score: {checkResult.fraud_score}/100
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#94A3B8]">Recommendation</p>
                    <Badge className={
                      checkResult.recommendation === "block"
                        ? "bg-[#EF4444]/20 text-[#EF4444]"
                        : "bg-[#10B981]/20 text-[#10B981]"
                    }>
                      {checkResult.recommendation.toUpperCase()}
                    </Badge>
                  </div>
                  
                  {checkResult.flags?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-[#94A3B8]">Flags</p>
                      <div className="flex flex-wrap gap-2">
                        {checkResult.flags.map((flag, idx) => (
                          <Badge key={idx} variant="outline" className="text-[#EF4444] border-[#EF4444]/30">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {flag.replace("_", " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 surface-secondary rounded text-center">
                  <Eye className="w-12 h-12 text-[#64748B] mx-auto mb-3" />
                  <p className="text-[#64748B]">Enter a bid request and click check</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
