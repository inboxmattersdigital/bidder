import { useEffect, useState, useRef } from "react";
import { 
  Activity, RefreshCw, Zap, Globe, Smartphone, DollarSign,
  CheckCircle, XCircle, Pause, Play
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { getBidStream } from "../lib/api";

export default function BidStream() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState({ total: 0, wins: 0, noResponse: 0 });
  const intervalRef = useRef(null);

  const fetchBids = async () => {
    if (isPaused) return;
    
    try {
      const res = await getBidStream(50);
      setBids(res.data.bids || []);
      
      // Calculate stats
      const total = res.data.bids?.length || 0;
      const wins = res.data.bids?.filter(b => b.bid_made)?.length || 0;
      setStats({ total, wins, noResponse: total - wins });
    } catch (error) {
      // Silent fail for real-time updates
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBids();
    intervalRef.current = setInterval(fetchBids, 2000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused]);

  const togglePause = () => {
    setIsPaused(!isPaused);
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-[#64748B]">Loading bid stream...</div>
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
            Live feed of bid requests and responses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={togglePause}
            variant="outline"
            className={isPaused ? "border-[#10B981] text-[#10B981]" : "border-[#F59E0B] text-[#F59E0B]"}
          >
            {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button 
            onClick={fetchBids}
            className="bg-[#3B82F6] hover:bg-[#60A5FA]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isPaused ? "bg-[#F59E0B]/20" : "bg-[#10B981]/20"}`}>
              <Activity className={`w-5 h-5 ${isPaused ? "text-[#F59E0B]" : "text-[#10B981] animate-pulse"}`} />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Status</p>
              <p className={`text-sm font-bold ${isPaused ? "text-[#F59E0B]" : "text-[#10B981]"}`}>
                {isPaused ? "Paused" : "Live"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3B82F6]/20">
              <Zap className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Total Requests</p>
              <p className="text-xl font-bold text-[#F8FAFC]">{stats.total}</p>
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
              <p className="text-xl font-bold text-[#10B981]">{stats.wins}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#64748B]/20">
              <XCircle className="w-5 h-5 text-[#64748B]" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">No Bid</p>
              <p className="text-xl font-bold text-[#64748B]">{stats.noResponse}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bid Stream */}
      <Card className="surface-primary border-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-[#F8FAFC] flex items-center gap-2">
            <Activity className={`w-5 h-5 ${isPaused ? "text-[#F59E0B]" : "text-[#10B981] animate-pulse"}`} />
            Bid Activity
          </CardTitle>
          <p className="text-xs text-[#64748B]">Last 50 requests</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2D3B55]">
                  <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">Time</th>
                  <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">Status</th>
                  <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">Campaign</th>
                  <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">Price</th>
                  <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">Device</th>
                  <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">Geo</th>
                  <th className="text-left py-2 px-3 text-xs text-[#64748B] font-medium">Domain</th>
                </tr>
              </thead>
              <tbody>
                {bids.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#64748B]">
                      No recent bid activity
                    </td>
                  </tr>
                ) : (
                  bids.slice().reverse().map((bid, idx) => (
                    <tr 
                      key={bid.id || idx} 
                      className={`border-b border-[#2D3B55]/30 ${idx === 0 && !isPaused ? "bg-[#10B981]/5" : ""}`}
                    >
                      <td className="py-2 px-3 text-xs text-[#94A3B8] font-mono">
                        {bid.timestamp ? new Date(bid.timestamp).toLocaleTimeString() : "-"}
                      </td>
                      <td className="py-2 px-3">
                        {bid.bid_made ? (
                          <Badge className="bg-[#10B981]/20 text-[#10B981] border-0 text-[10px]">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            BID
                          </Badge>
                        ) : (
                          <Badge className="bg-[#64748B]/20 text-[#64748B] border-0 text-[10px]">
                            <XCircle className="w-3 h-3 mr-1" />
                            NO BID
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-[#F8FAFC]">
                        {bid.campaign_name || "-"}
                      </td>
                      <td className="py-2 px-3 text-xs font-mono">
                        {bid.bid_price ? (
                          <span className="text-[#10B981]">
                            <DollarSign className="w-3 h-3 inline" />
                            {bid.bid_price.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[#64748B]">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                          {getDeviceIcon(bid.device_type)}
                          <span>{bid.device_type || "-"}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs text-[#94A3B8] font-mono">
                        {bid.geo_country || "-"}
                      </td>
                      <td className="py-2 px-3 text-xs text-[#94A3B8] truncate max-w-[150px]">
                        {bid.domain || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
