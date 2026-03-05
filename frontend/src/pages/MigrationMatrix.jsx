import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { getMigrationMatrix } from "../lib/api";

function MigrationRow({ field, data }) {
  return (
    <tr className="border-b border-[#2D3B55] hover:bg-[#151F32]/50 transition-colors">
      <td className="py-3 px-4">
        <span className="text-sm font-medium text-[#F8FAFC]">{field}</span>
      </td>
      <td className="py-3 px-4">
        <code className="text-xs font-mono bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-1 rounded">
          {data["2.5_field"]}
        </code>
      </td>
      <td className="py-3 px-4 text-center">
        <ArrowRight className="w-4 h-4 text-[#64748B] inline" />
      </td>
      <td className="py-3 px-4">
        <code className="text-xs font-mono bg-[#3B82F6]/10 text-[#3B82F6] px-2 py-1 rounded">
          {data["2.6_field"]}
        </code>
      </td>
      <td className="py-3 px-4">
        {data.mapping && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(data.mapping).slice(0, 3).map(([k, v]) => (
              <Badge 
                key={k} 
                variant="outline" 
                className="text-[10px] bg-[#151F32] text-[#94A3B8] border-[#2D3B55]"
              >
                {k}→{v}
              </Badge>
            ))}
            {Object.entries(data.mapping).length > 3 && (
              <Badge variant="outline" className="text-[10px] bg-[#151F32] text-[#64748B] border-[#2D3B55]">
                +{Object.entries(data.mapping).length - 3}
              </Badge>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function MigrationMatrix() {
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatrix = async () => {
      try {
        setLoading(true);
        const response = await getMigrationMatrix();
        setMatrix(response.data);
      } catch (error) {
        toast.error("Failed to load migration matrix");
      } finally {
        setLoading(false);
      }
    };
    fetchMatrix();
  }, []);

  return (
    <div className="p-6" data-testid="migration-matrix-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#F8FAFC]">OpenRTB Migration Matrix</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Field mappings between OpenRTB 2.5 and 2.6 specifications
        </p>
      </div>

      {/* Version Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-[#F59E0B]/20 flex items-center justify-center">
                <span className="text-[#F59E0B] font-bold">2.5</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#F8FAFC]">OpenRTB 2.5</h3>
                <p className="text-xs text-[#64748B]">Legacy specification with extension-based fields</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-[#3B82F6]/20 flex items-center justify-center">
                <span className="text-[#3B82F6] font-bold">2.6</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#F8FAFC]">OpenRTB 2.6</h3>
                <p className="text-xs text-[#64748B]">Modern spec with native ad pod & privacy support</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Migration Table */}
      <Card className="surface-primary border-panel">
        <CardHeader className="border-b border-[#2D3B55]">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[#3B82F6]" />
            <CardTitle className="text-lg text-[#F8FAFC]">Field Migration Reference</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-[#64748B]">Loading migration matrix...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr className="border-b border-[#2D3B55]">
                    <th className="text-left">Field</th>
                    <th className="text-left">
                      <Badge variant="outline" className="version-badge version-2-5">v2.5</Badge>
                    </th>
                    <th className="text-center w-12"></th>
                    <th className="text-left">
                      <Badge variant="outline" className="version-badge version-2-6">v2.6</Badge>
                    </th>
                    <th className="text-left">Value Mapping</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix && Object.entries(matrix).map(([field, data]) => (
                    <MigrationRow key={field} field={field} data={data} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Changes Info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-[#F8FAFC] mb-2">Video Placement</h4>
            <p className="text-xs text-[#94A3B8]">
              <code className="text-[#F59E0B]">video.placement</code> (2.5) replaced by 
              <code className="text-[#3B82F6]"> video.plcmt</code> (2.6) with simplified values: 
              Instream, Accompanying, Interstitial, No-Content.
            </p>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-[#F8FAFC] mb-2">Privacy Fields</h4>
            <p className="text-xs text-[#94A3B8]">
              GDPR, US Privacy, and consent strings moved from <code className="text-[#F59E0B]">*.ext</code> to 
              root-level fields in 2.6 for standardization.
            </p>
          </CardContent>
        </Card>
        <Card className="surface-primary border-panel">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-[#F8FAFC] mb-2">Ad Pod Support</h4>
            <p className="text-xs text-[#94A3B8]">
              2.6 introduces <code className="text-[#3B82F6]">podid</code>, 
              <code className="text-[#3B82F6]"> podseq</code>, 
              <code className="text-[#3B82F6]"> slotinpod</code> for CTV ad pod targeting.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
