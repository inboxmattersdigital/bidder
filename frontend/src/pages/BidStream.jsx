import { useEffect, useState, useRef, useCallback } from "react";
import { 
  Activity, RefreshCw, Zap, Globe, Smartphone, DollarSign,
  CheckCircle, XCircle, Pause, Play, Wifi, WifiOff
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://') + '/api';

export default function BidStream() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({ 
    total_requests: 0, 
    total_bids: 0, 
    total_no_bids: 0,
    // Local session stats for displayed bids
    displayed_total: 0,
    displayed_wins: 0 
  });
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const updateLocalStats = useCallback((bidList, serverStats = null) => {
    const displayedTotal = bidList.length;
    const displayedWins = bidList.filter(b => b.bid_made).length;
    
    setStats(prev => ({
      // Use server stats if provided, otherwise keep existing
      total_requests: serverStats?.total_requests ?? prev.total_requests,
      total_bids: serverStats?.total_bids ?? prev.total_bids,
      total_no_bids: serverStats?.total_no_bids ?? prev.total_no_bids,
      // Always update local display stats
      displayed_total: displayedTotal,
      displayed_wins: displayedWins
    }));
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      const ws = new WebSocket(`${WS_URL}/ws/bid-stream`);
      
      ws.onopen = () => {
        setIsConnected(true);
        setLoading(false);
        toast.success("Connected to live bid stream");
      };
      
      ws.onmessage = (event) => {
        // Handle plain text responses (like "pong")
        if (event.data === "pong") {
          return; // Ignore pong responses
        }
        
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (e) {
          console.warn("Non-JSON message received:", event.data);
          return;
        }
        
        if (data.type === "initial" || data.type === "recent") {
          setBids(data.bids || []);
          updateLocalStats(data.bids || [], data.stats);
        } else if (data.type === "new_bid" && !isPaused) {
          setBids(prev => {
            const updated = [...prev, data.bid].slice(-50);
            updateLocalStats(updated, data.stats);
            return updated;
          });
        } else if (data.type === "heartbeat") {
          // Update stats from heartbeat if available
          if (data.stats) {
            setStats(prev => ({
              ...prev,
              total_requests: data.stats.total_requests ?? prev.total_requests,
              total_bids: data.stats.total_bids ?? prev.total_bids,
              total_no_bids: data.stats.total_no_bids ?? prev.total_no_bids
            }));
          }
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        // Auto-reconnect after 3 seconds
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, 3000);
        }
      };
      
      ws.onerror = () => {
        setIsConnected(false);
        setLoading(false);
      };
      
      wsRef.current = ws;
    } catch (error) {
      setLoading(false);
      toast.error("Failed to connect to bid stream");
    }
  }, [isPaused, updateLocalStats]);

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  // Send ping every 25 seconds to keep connection alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);
    
    return () => clearInterval(pingInterval);
  }, []);

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      toast.info("Stream resumed");
    } else {
      toast.info("Stream paused");
    }
  };

  const requestRecent = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "get_recent", limit: 50 }));
    }
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 4:
      case 5:
        return <Smartphone className="w-3 h-3" />;
      default:
        return <Globe className="w-3 h-3" />;
    }
  };

  const getDeviceName = (type) => {
    const types = {
      1: "Mobile",
      2: "PC",
      3: "Connected TV",
      4: "Phone",
      5: "Tablet",
      6: "Connected Device",
      7: "Set Top Box"
    };
    return types[type] || "Unknown";
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[#64748B]">Connecting to bid stream...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="bid-stream-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Real-Time Bid Stream</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Live feed of bid requests and responses via WebSocket
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <Badge 
            variant="outline" 
            className={isConnected 
              ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30" 
              : "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30"
            }
          >
            {isConnected ? (
              <><Wifi className="w-3 h-3 mr-1" /> Connected</>
            ) : (
              <><WifiOff className="w-3 h-3 mr-1" /> Disconnected</>
            )}
          </Badge>
          
          <Button 
            variant="outline"
            onClick={togglePause}
            className={isPaused 
              ? "border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10" 
              : "border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10"
            }
          >
            {isPaused ? (
              <><Play className="w-4 h-4 mr-2" /> Resume</>
            ) : (
              <><Pause className="w-4 h-4 mr-2" /> Pause</>
            )}
          </Button>
          
          <Button 
            onClick={requestRecent}
            className="bg-[#3B82F6] hover:bg-[#60A5FA]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3B82F6]/20">
              <Activity className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Total Requests</p>
              <p className="text-xl font-bold text-[#F8FAFC]">{stats.total_requests.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#10B981]/20">
              <CheckCircle className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Bids Made</p>
              <p className="text-xl font-bold text-[#10B981]">{stats.total_bids.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F59E0B]/20">
              <XCircle className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">No Bids</p>
              <p className="text-xl font-bold text-[#F59E0B]">{stats.total_no_bids.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#8B5CF6]/20">
              <Zap className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Bid Rate</p>
              <p className="text-xl font-bold text-[#8B5CF6]">
                {stats.total_requests > 0 ? ((stats.total_bids / stats.total_requests) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bid Stream Table */}
      <Card className="surface-primary border-panel">
        <CardHeader>
          <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#3B82F6]" />
            Live Bid Activity
            {!isPaused && (
              <span className="relative flex h-2 w-2 ml-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 surface-primary">
                <tr className="border-b border-[#2D3B55]">
                  <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">Time</th>
                  <th className="text-center py-2 px-3 text-xs text-[#64748B] font-medium">Status</th>
                  <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">Campaign</th>
                  <th className="text-right py-2 px-3 text-xs text-[#64748B] font-medium">Bid</th>
                  <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">Device</th>
                  <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">Geo</th>
                  <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">Domain</th>
                </tr>
              </thead>
              <tbody>
                {[...bids].reverse().map((bid, idx) => (
                  <tr 
                    key={bid.id || idx} 
                    className={`border-b border-[#2D3B55]/30 ${idx === 0 && !isPaused ? "animate-pulse bg-[#3B82F6]/5" : ""}`}
                  >
                    <td className="py-2 px-3 text-xs text-[#94A3B8] font-mono">
                      {new Date(bid.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {bid.bid_made ? (
                        <Badge className="bg-[#10B981]/20 text-[#10B981] text-[10px]">
                          BID
                        </Badge>
                      ) : (
                        <Badge className="bg-[#64748B]/20 text-[#64748B] text-[10px]">
                          NO BID
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-3 text-sm text-[#F8FAFC]">
                      {bid.campaign_name || "-"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {bid.bid_price ? (
                        <span className="text-sm font-mono text-[#10B981]">
                          ${bid.bid_price.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[#64748B]">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                        {getDeviceIcon(bid.device_type)}
                        {getDeviceName(bid.device_type)}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-xs text-[#94A3B8]">
                      {bid.geo_country || "-"}
                    </td>
                    <td className="py-2 px-3 text-xs text-[#94A3B8] max-w-[150px] truncate">
                      {bid.domain || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {bids.length === 0 && (
              <div className="text-center py-12 text-[#64748B]">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No bid activity yet</p>
                <p className="text-sm mt-1">Send a bid request to see it appear here in real-time</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
