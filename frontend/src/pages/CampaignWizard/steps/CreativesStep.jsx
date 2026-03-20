import { Check, Image as ImageIcon, Video, FileCode, Layout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";

export function CreativesStep({ form, updateField, creatives }) {
  const toggleCreative = (creativeId) => {
    const isSelected = form.creative_ids.includes(creativeId);
    
    if (isSelected) {
      // Unselect the creative
      const newIds = form.creative_ids.filter(id => id !== creativeId);
      updateField("creative_ids", newIds);
      // Update primary creative_id if we just removed it
      if (form.creative_id === creativeId) {
        updateField("creative_id", newIds.length > 0 ? newIds[0] : "");
      }
    } else {
      // Select the creative
      const newIds = [...form.creative_ids, creativeId];
      updateField("creative_ids", newIds);
      // Set as primary if no primary selected
      if (!form.creative_id) {
        updateField("creative_id", creativeId);
      }
    }
  };

  const getCreativeIcon = (type) => {
    switch (type) {
      case 'video': return Video;
      case 'native': return Layout;
      case 'js_tag': return FileCode;
      default: return ImageIcon;
    }
  };

  const getFormatBadgeColor = (format) => {
    switch (format) {
      case 'video': return "bg-[#8B5CF6]/20 text-[#8B5CF6]";
      case 'native': return "bg-[#F59E0B]/20 text-[#F59E0B]";
      case 'js_tag': return "bg-[#EC4899]/20 text-[#EC4899]";
      default: return "bg-[#3B82F6]/20 text-[#3B82F6]";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Creatives</h2>
        <p className="text-sm text-[#64748B]">Select creatives for your campaign</p>
      </div>

      {creatives.length === 0 ? (
        <Card className="surface-secondary border-[#2D3B55]">
          <CardContent className="py-12 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-[#64748B] mb-4" />
            <p className="text-[#94A3B8] mb-2">No creatives available</p>
            <p className="text-sm text-[#64748B]">
              Create creatives in the Creatives section first
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {creatives.map((creative) => {
            const isSelected = form.creative_id === creative.id || form.creative_ids.includes(creative.id);
            const Icon = getCreativeIcon(creative.type);
            
            return (
              <Card
                key={creative.id}
                onClick={() => toggleCreative(creative.id)}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#10B981] bg-[#10B981]/10"
                    : "surface-secondary border-[#2D3B55] hover:border-[#10B981]/50"
                }`}
                data-testid="creative-card"
              >
                <CardContent className="p-4">
                  {/* Preview Area */}
                  <div className="aspect-video rounded-lg surface-primary flex items-center justify-center mb-3 overflow-hidden relative">
                    {creative.banner_data?.image_url ? (
                      <img 
                        src={creative.banner_data.image_url} 
                        alt={creative.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon className="w-8 h-8 text-[#64748B]" />
                    )}
                    
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    
                    {/* Duration badge for video */}
                    {creative.type === 'video' && creative.video_data?.duration && (
                      <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs">
                        {creative.video_data.duration}s
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <h3 className="text-sm font-medium text-[#F8FAFC] truncate">{creative.name}</h3>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getFormatBadgeColor(creative.type)}>
                      {creative.type}
                    </Badge>
                    {creative.format && (
                      <Badge className="bg-[#64748B]/20 text-[#64748B] text-xs">
                        {creative.format.replace(/_/g, ' ')}
                      </Badge>
                    )}
                    {creative.banner_data?.width && creative.banner_data?.height && (
                      <Badge className="bg-[#64748B]/20 text-[#64748B] text-xs">
                        {creative.banner_data.width}x{creative.banner_data.height}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Best Practices */}
      <Card className="surface-secondary border-[#F59E0B]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#F59E0B]">Creative Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-[#94A3B8]">
            <li className="flex items-start gap-2">
              <span className="text-[#F59E0B]">•</span>
              Use multiple ad sizes (300x250, 728x90, 320x50) for maximum reach
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#F59E0B]">•</span>
              Test 3-4 creative variations and optimize after 1000 impressions each
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#F59E0B]">•</span>
              Include clear call-to-action in all creatives
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#F59E0B]">•</span>
              For video: 15s or 30s formats work best; ensure sound-off compatibility
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
