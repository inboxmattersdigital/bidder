import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Code, Check, X, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function CreativePreviewPage() {
  const { id } = useParams();
  const [creative, setCreative] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null); // 'approved', 'rejected', null
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCreative = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/creatives/${id}/public`);
        if (!response.ok) {
          throw new Error("Creative not found");
        }
        const data = await response.json();
        setCreative(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCreative();
    }
  }, [id]);

  const handleApproval = async (status) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/creatives/${id}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, feedback }),
      });
      
      if (response.ok) {
        setApprovalStatus(status);
        toast.success(status === 'approved' ? 'Creative approved!' : 'Feedback submitted');
      } else {
        throw new Error("Failed to submit");
      }
    } catch (err) {
      toast.error("Failed to submit approval. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020408] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#94A3B8]">Loading creative preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#020408] flex items-center justify-center p-6">
        <Card className="max-w-md w-full surface-primary border-[#2D3B55]">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-[#EF4444] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-[#F8FAFC] mb-2">Preview Not Available</h1>
            <p className="text-[#94A3B8]">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!creative) return null;

  const jsTagData = creative.js_tag_data || {};
  const tagContent = jsTagData.tag_content || creative.js_tag || "";
  const jsWidth = jsTagData.width || 300;
  const jsHeight = jsTagData.height || 250;
  const vendor = jsTagData.vendor || "Third Party";

  // Generate HTML for live preview
  const livePreviewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
          width: 100%; 
          height: 100%; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          background: #ffffff;
          overflow: hidden;
        }
        .ad-container {
          width: ${jsWidth}px;
          height: ${jsHeight}px;
          position: relative;
          background: #fff;
          overflow: hidden;
        }
      </style>
    </head>
    <body>
      <div class="ad-container">
        ${tagContent}
      </div>
    </body>
    </html>
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020408] via-[#0A0F1C] to-[#0F172A]">
      {/* Header */}
      <div className="border-b border-[#2D3B55] bg-[#0A0F1C]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#F8FAFC]">Creative Preview</h1>
              <p className="text-xs text-[#64748B]">Review and approve this creative</p>
            </div>
          </div>
          {approvalStatus && (
            <Badge className={approvalStatus === 'approved' 
              ? "bg-[#10B981]/20 text-[#10B981] text-sm px-4 py-1" 
              : "bg-[#F59E0B]/20 text-[#F59E0B] text-sm px-4 py-1"
            }>
              {approvalStatus === 'approved' ? (
                <><Check className="w-4 h-4 mr-1" /> Approved</>
              ) : (
                <><Clock className="w-4 h-4 mr-1" /> Changes Requested</>
              )}
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Preview Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Creative Info */}
            <Card className="surface-primary border-[#2D3B55]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#F8FAFC]">{creative.name}</h2>
                    <p className="text-sm text-[#64748B] mt-1">Third Party JS Tag Creative</p>
                  </div>
                  <div className="flex gap-2">
                    {vendor && <Badge className="bg-[#F59E0B]/20 text-[#F59E0B]">{vendor}</Badge>}
                    <Badge className="bg-[#3B82F6]/20 text-[#3B82F6]">{jsWidth}x{jsHeight}</Badge>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-[#F8FAFC]">Live Ad Preview</p>
                    <Badge className="bg-[#10B981]/20 text-[#10B981] text-xs animate-pulse">LIVE</Badge>
                  </div>
                  <div 
                    className="rounded-xl border-2 border-dashed border-[#3B82F6]/30 bg-[#0A0F1C] p-6 flex items-center justify-center"
                    style={{ minHeight: Math.min(jsHeight + 60, 450) }}
                  >
                    {tagContent ? (
                      <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
                        <iframe
                          srcDoc={livePreviewHtml}
                          title="JS Tag Live Preview"
                          style={{ 
                            width: jsWidth, 
                            height: jsHeight,
                            border: 'none',
                            display: 'block'
                          }}
                          sandbox="allow-scripts allow-same-origin"
                        />
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Code className="w-16 h-16 text-[#64748B] mx-auto mb-4 opacity-50" />
                        <p className="text-[#94A3B8]">No preview available</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-[#475569] text-center mt-3">
                    This is a simulated preview. Actual rendering may vary based on the target environment.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tag Details */}
            <Card className="surface-primary border-[#2D3B55]">
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-[#F8FAFC] mb-3">Tag Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#64748B]">Type</p>
                    <p className="text-[#F8FAFC] capitalize">{jsTagData.tag_type || 'script'}</p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">Dimensions</p>
                    <p className="text-[#F8FAFC]">{jsWidth} x {jsHeight} pixels</p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">HTTPS Compatible</p>
                    <p className="text-[#F8FAFC]">{jsTagData.is_secure !== false ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">Vendor</p>
                    <p className="text-[#F8FAFC]">{vendor}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Approval Panel */}
          <div className="space-y-6">
            <Card className="surface-primary border-[#2D3B55] sticky top-24">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-[#F8FAFC] mb-4">Approval</h3>
                
                {approvalStatus ? (
                  <div className="text-center py-6">
                    {approvalStatus === 'approved' ? (
                      <>
                        <div className="w-16 h-16 rounded-full bg-[#10B981]/20 flex items-center justify-center mx-auto mb-4">
                          <Check className="w-8 h-8 text-[#10B981]" />
                        </div>
                        <p className="text-[#F8FAFC] font-medium">Creative Approved</p>
                        <p className="text-sm text-[#64748B] mt-1">Thank you for your feedback!</p>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-[#F59E0B]/20 flex items-center justify-center mx-auto mb-4">
                          <Clock className="w-8 h-8 text-[#F59E0B]" />
                        </div>
                        <p className="text-[#F8FAFC] font-medium">Changes Requested</p>
                        <p className="text-sm text-[#64748B] mt-1">Your feedback has been submitted</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-[#94A3B8] mb-4">
                      Please review the creative above and provide your approval or feedback.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-[#64748B] mb-2 block">Feedback (optional)</label>
                        <Textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Add any comments or change requests..."
                          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] min-h-[100px]"
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleApproval('approved')}
                          disabled={submitting}
                          className="flex-1 bg-[#10B981] hover:bg-[#10B981]/90 text-white"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleApproval('rejected')}
                          disabled={submitting}
                          variant="outline"
                          className="flex-1 border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Request Changes
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Help */}
            <Card className="surface-primary border-[#2D3B55]">
              <CardContent className="p-4">
                <p className="text-xs text-[#64748B]">
                  Need help? Contact your account manager or reply to the email that shared this preview.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
