import { useEffect, useState } from "react";
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Clock,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import { getBidLogs, getBidLog } from "../lib/api";

// Simple JSON display component without recursion
function SimpleJsonViewer({ data }) {
  if (!data || typeof data !== 'object') {
    return <span className="text-[#94A3B8] font-mono text-xs">{String(data)}</span>;
  }
  
  return (
    <pre className="text-xs font-mono text-[#94A3B8] whitespace-pre-wrap overflow-auto max-h-64">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function BidLogEntry({ log, onSelect, isSelected }) {
  return (
    <div 
      className={`log-entry p-3 border-b border-[#2D3B55] cursor-pointer transition-colors duration-150 ${
        isSelected ? 'bg-[#3B82F6]/10 border-l-2 border-l-[#3B82F6]' : 'hover:bg-[#151F32]/50'
      }`}
      onClick={() => onSelect(log)}
      data-testid={`bid-log-${log.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {log.bid_made ? (
            <CheckCircle className="w-4 h-4 text-[#10B981]" />
          ) : (
            <XCircle className="w-4 h-4 text-[#EF4444]" />
          )}
          <span className="text-sm font-medium text-[#F8FAFC]">
            {log.bid_made ? 'Bid Made' : 'No Bid'}
          </span>
          <Badge 
            variant="outline" 
            className={log.openrtb_version === "2.6" 
              ? "version-badge version-2-6" 
              : "version-badge version-2-5"
            }
          >
            v{log.openrtb_version}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <Clock className="w-3 h-3" />
          {log.processing_time_ms?.toFixed(1)}ms
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[#64748B]">Request: </span>
          <span className="text-[#94A3B8] font-mono">{log.request_id?.substring(0, 16)}...</span>
        </div>
        {log.bid_made && log.bid_price && (
          <div>
            <span className="text-[#64748B]">Bid: </span>
            <span className="text-[#3B82F6] font-mono">${log.bid_price.toFixed(2)}</span>
          </div>
        )}
      </div>
      
      {log.request_summary && (
        <div className="mt-2 flex flex-wrap gap-1">
          {log.request_summary.inventory_type && (
            <Badge variant="outline" className="text-[10px] bg-[#151F32] text-[#94A3B8] border-[#2D3B55]">
              {log.request_summary.inventory_type}
            </Badge>
          )}
          {log.request_summary.country && (
            <Badge variant="outline" className="text-[10px] bg-[#151F32] text-[#94A3B8] border-[#2D3B55]">
              {log.request_summary.country}
            </Badge>
          )}
          {log.request_summary.os && (
            <Badge variant="outline" className="text-[10px] bg-[#151F32] text-[#94A3B8] border-[#2D3B55]">
              {log.request_summary.os}
            </Badge>
          )}
          {log.request_summary.has_video && (
            <Badge variant="outline" className="text-[10px] bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30">
              video
            </Badge>
          )}
          {log.request_summary.has_banner && (
            <Badge variant="outline" className="text-[10px] bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30">
              banner
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export default function BidLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await getBidLogs(50, 0);
      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch (error) {
      toast.error("Failed to load bid logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSelectLog = async (log) => {
    try {
      const response = await getBidLog(log.id);
      setSelectedLog(response.data);
    } catch (error) {
      setSelectedLog(log);
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-1px)]" data-testid="bid-logs-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Bid Logs</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Real-time bid request and response monitoring
            {total > 0 && <span className="ml-2 text-[#64748B]">({total} total)</span>}
          </p>
        </div>
        <Button 
          variant="outline"
          onClick={fetchLogs}
          className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#151F32]"
          data-testid="refresh-logs-btn"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#64748B]">Loading logs...</div>
        </div>
      ) : logs.length === 0 ? (
        <Card className="surface-primary border-panel">
          <CardContent className="empty-state py-16">
            <Zap className="empty-state-icon" />
            <h3 className="text-lg font-medium text-[#F8FAFC] mb-2">No bid logs yet</h3>
            <p className="text-sm text-[#94A3B8]">Bid requests will appear here once SSPs start sending traffic</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-4 h-[calc(100%-80px)]">
          {/* Log List */}
          <Card className="surface-primary border-panel col-span-5 flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-[#2D3B55]">
              <CardTitle className="text-sm text-[#F8FAFC]">Recent Requests</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1">
              {logs.map((log) => (
                <BidLogEntry 
                  key={log.id} 
                  log={log} 
                  onSelect={handleSelectLog}
                  isSelected={selectedLog?.id === log.id}
                />
              ))}
            </ScrollArea>
          </Card>

          {/* Log Detail */}
          <Card className="surface-primary border-panel col-span-7 flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-[#2D3B55]">
              <CardTitle className="text-sm text-[#F8FAFC]">Request Details</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1 p-4">
              {selectedLog ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1">Request ID</p>
                      <p className="text-xs font-mono text-[#F8FAFC]">{selectedLog.request_id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1">OpenRTB Version</p>
                      <Badge 
                        variant="outline" 
                        className={selectedLog.openrtb_version === "2.6" 
                          ? "version-badge version-2-6" 
                          : "version-badge version-2-5"
                        }
                      >
                        v{selectedLog.openrtb_version}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1">Result</p>
                      <div className="flex items-center gap-1">
                        {selectedLog.bid_made ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-[#10B981]" />
                            <span className="text-xs text-[#10B981]">Bid Made</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-[#EF4444]" />
                            <span className="text-xs text-[#EF4444]">No Bid</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1">Processing Time</p>
                      <p className="text-xs font-mono text-[#F8FAFC]">{selectedLog.processing_time_ms?.toFixed(2)}ms</p>
                    </div>
                  </div>

                  {/* Bid Info */}
                  {selectedLog.bid_made && (
                    <div className="p-3 surface-secondary rounded border border-[#2D3B55]">
                      <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-2">Winning Bid</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-[10px] text-[#64748B]">Price (CPM)</p>
                          <p className="text-sm font-mono text-[#3B82F6]">${selectedLog.bid_price?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#64748B]">Campaign</p>
                          <p className="text-xs font-mono text-[#F8FAFC] truncate">{selectedLog.campaign_id?.substring(0, 12)}...</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#64748B]">Creative</p>
                          <p className="text-xs font-mono text-[#F8FAFC] truncate">{selectedLog.creative_id?.substring(0, 12)}...</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rejection Reasons */}
                  {selectedLog.rejection_reasons?.length > 0 && (
                    <div className="p-3 bg-[#EF4444]/10 rounded border border-[#EF4444]/30">
                      <p className="text-[10px] text-[#EF4444] uppercase tracking-wider mb-2">Rejection Reasons</p>
                      <ul className="space-y-1">
                        {selectedLog.rejection_reasons.map((reason, i) => (
                          <li key={i} className="text-xs text-[#EF4444]">• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Matched Campaigns */}
                  {selectedLog.matched_campaigns?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-2">Matched Campaigns</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedLog.matched_campaigns.map((id, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30">
                            {id.substring(0, 8)}...
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Summary JSON */}
                  {selectedLog.request_summary && (
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-2">Request Summary</p>
                      <div className="p-3 bg-[#020408] rounded border border-[#2D3B55] overflow-auto max-h-64">
                        <SimpleJsonViewer data={selectedLog.request_summary} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-[#64748B]">
                  Select a log entry to view details
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  );
}
