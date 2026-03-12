import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
import { Slider } from "../../../components/ui/slider";
import { ATTRIBUTION_MODELS } from "../constants";

export function MeasurementStep({ form, updateField }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Measurement</h2>
        <p className="text-sm text-[#64748B]">Configure conversion tracking and attribution settings</p>
      </div>

      {/* Conversion Tracking */}
      <Card className="surface-secondary border-[#10B981]/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-[#10B981]">Conversion Tracking</CardTitle>
            <Switch
              checked={form.conversion_tracking_enabled}
              onCheckedChange={(v) => updateField("conversion_tracking_enabled", v)}
            />
          </div>
        </CardHeader>
        {form.conversion_tracking_enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Conversion Pixel ID</Label>
              <Input
                value={form.conversion_pixel_id}
                onChange={(e) => updateField("conversion_pixel_id", e.target.value)}
                placeholder="Enter your conversion pixel ID"
                className="surface-primary border-[#2D3B55] text-[#F8FAFC]"
              />
              <p className="text-xs text-[#64748B]">
                The pixel ID from your tracking platform (e.g., GTM, Meta Pixel, etc.)
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Attribution Model */}
      <Card className="surface-secondary border-[#3B82F6]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#3B82F6]">Attribution Model</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ATTRIBUTION_MODELS.map((model) => (
              <div
                key={model.value}
                onClick={() => updateField("attribution_model", model.value)}
                className={`p-4 rounded-lg cursor-pointer border transition-all ${
                  form.attribution_model === model.value
                    ? "bg-[#8B5CF6]/20 border-[#8B5CF6]"
                    : "surface-primary border-[#2D3B55] hover:border-[#8B5CF6]/50"
                }`}
              >
                <p className="text-sm font-medium text-[#F8FAFC]">{model.label}</p>
                <p className="text-xs text-[#64748B] mt-1">{model.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attribution Windows */}
      <Card className="surface-secondary border-[#F59E0B]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#F59E0B]">Attribution Windows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[#94A3B8]">Click-Through Window</Label>
              <span className="text-sm text-[#F8FAFC]">{form.click_through_window} days</span>
            </div>
            <Slider
              value={[form.click_through_window]}
              onValueChange={([v]) => updateField("click_through_window", v)}
              min={1}
              max={90}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-[#64748B]">
              Time period to attribute conversions after a user clicks on your ad
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[#94A3B8]">View-Through Window</Label>
              <span className="text-sm text-[#F8FAFC]">{form.view_through_window} day{form.view_through_window > 1 ? 's' : ''}</span>
            </div>
            <Slider
              value={[form.view_through_window]}
              onValueChange={([v]) => updateField("view_through_window", v)}
              min={1}
              max={30}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-[#64748B]">
              Time period to attribute conversions after a user views (but doesn't click) your ad
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Optimization */}
      <Card className="surface-secondary border-[#2D3B55]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#F8FAFC]">Advanced Optimization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#F8FAFC]">Bid Shading</p>
              <p className="text-xs text-[#64748B]">Automatically adjust bids based on win rate</p>
            </div>
            <Switch
              checked={form.bid_shading_enabled}
              onCheckedChange={(v) => updateField("bid_shading_enabled", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#F8FAFC]">ML-Based Prediction</p>
              <p className="text-xs text-[#64748B]">Use machine learning for bid optimization</p>
            </div>
            <Switch
              checked={form.ml_prediction_enabled}
              onCheckedChange={(v) => updateField("ml_prediction_enabled", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#F8FAFC]">Supply Path Optimization</p>
              <p className="text-xs text-[#64748B]">Optimize inventory supply paths</p>
            </div>
            <Switch
              checked={form.spo_enabled}
              onCheckedChange={(v) => updateField("spo_enabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Priority */}
      <Card className="surface-secondary border-[#2D3B55]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#F8FAFC]">Campaign Priority</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[#94A3B8]">Priority Level</Label>
              <span className="text-sm text-[#F8FAFC]">{form.priority}</span>
            </div>
            <Slider
              value={[form.priority]}
              onValueChange={([v]) => updateField("priority", v)}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-[#64748B]">
              Higher priority campaigns are preferred when multiple campaigns compete for the same impression
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
