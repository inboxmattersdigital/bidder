import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { NumberInput } from "../../../components/ui/number-input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../../components/ui/select";
import { CAMPAIGN_GOALS, KPI_TYPES, IAB_CATEGORIES } from "../constants";

export function OverviewStep({ form, updateField, onGetRecommendations }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Campaign Overview</h2>
        <p className="text-sm text-[#64748B]">Define your campaign goals and target audience</p>
      </div>

      {/* Campaign Name */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Campaign Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Enter campaign name"
          className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          data-testid="campaign-name-input"
        />
      </div>

      {/* IAB Categories */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">IAB Categories *</Label>
        <Select 
          value={form.iab_categories[0] || ""} 
          onValueChange={(v) => {
            if (v && !form.iab_categories.includes(v)) {
              updateField("iab_categories", [...form.iab_categories, v]);
            }
          }}
        >
          <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
            <SelectValue placeholder="Select IAB category" />
          </SelectTrigger>
          <SelectContent className="surface-primary border-[#2D3B55] max-h-[300px]">
            {IAB_CATEGORIES.map((cat) => (
              <SelectItem key={cat.code} value={cat.code} className="text-[#F8FAFC]">
                {cat.code} - {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.iab_categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {form.iab_categories.map((code) => (
              <Badge key={code} variant="secondary" className="bg-[#3B82F6]/20 text-[#3B82F6]">
                {IAB_CATEGORIES.find(c => c.code === code)?.name || code}
                <button 
                  onClick={() => updateField("iab_categories", form.iab_categories.filter(c => c !== code))} 
                  className="ml-2"
                >
                  x
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Primary Goal */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Primary Goal *</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CAMPAIGN_GOALS.map((goal) => (
            <div
              key={goal.value}
              onClick={() => updateField("primary_goal", goal.value)}
              className={`p-4 rounded-lg cursor-pointer border transition-all ${
                form.primary_goal === goal.value
                  ? "bg-[#3B82F6]/20 border-[#3B82F6]"
                  : "surface-secondary border-[#2D3B55] hover:border-[#3B82F6]/50"
              }`}
              data-testid={`goal-${goal.value}`}
            >
              <p className="text-sm font-medium text-[#F8FAFC]">{goal.label}</p>
              <p className="text-xs text-[#64748B] mt-1">{goal.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Settings */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">Key Performance Indicator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">KPI Type</Label>
              <Select value={form.kpi_type} onValueChange={(v) => updateField("kpi_type", v)}>
                <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="surface-primary border-[#2D3B55]">
                  {KPI_TYPES.map((kpi) => (
                    <SelectItem key={kpi.value} value={kpi.value} className="text-[#F8FAFC]">
                      {kpi.label} - {kpi.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Target {form.kpi_type.toUpperCase()}</Label>
              <NumberInput
                value={form.kpi_target}
                onChange={(e) => {
                  const val = e.target.value;
                  updateField("kpi_target", val === "" ? 0 : (typeof val === 'number' ? val : parseFloat(val) || 0));
                }}
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                min={0}
                data-testid="kpi-target-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Description */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Campaign Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Internal notes about this campaign"
          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] min-h-[100px]"
        />
      </div>

      {/* Strategy Recommendations */}
      <Button
        variant="outline"
        onClick={onGetRecommendations}
        className="border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10"
      >
        <Lightbulb className="w-4 h-4 mr-2" />
        Get Strategy Recommendations
      </Button>
    </div>
  );
}
