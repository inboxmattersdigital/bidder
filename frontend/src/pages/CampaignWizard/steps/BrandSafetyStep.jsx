import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import { BRAND_SAFETY_LEVELS, BLOCKED_CATEGORIES } from "../constants";

export function BrandSafetyStep({ form, updateField }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Brand Safety</h2>
        <p className="text-sm text-[#64748B]">Configure brand safety controls and content exclusions</p>
      </div>

      {/* Safety Level */}
      <Card className="surface-secondary border-[#3B82F6]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#3B82F6]">Safety Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {BRAND_SAFETY_LEVELS.map((level) => (
              <div
                key={level.value}
                onClick={() => updateField("brand_safety_level", level.value)}
                className={`p-4 rounded-lg cursor-pointer border transition-all ${
                  form.brand_safety_level === level.value
                    ? "bg-[#3B82F6]/20 border-[#3B82F6]"
                    : "surface-primary border-[#2D3B55] hover:border-[#3B82F6]/50"
                }`}
              >
                <p className="text-sm font-medium text-[#F8FAFC]">{level.label}</p>
                <p className="text-xs text-[#64748B] mt-1">{level.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blocked Categories */}
      <Card className="surface-secondary border-[#EF4444]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#EF4444]">Blocked Content Categories</CardTitle>
          <CardDescription className="text-xs text-[#64748B]">
            Select categories to exclude from ad placements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {BLOCKED_CATEGORIES.map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className={`cursor-pointer ${
                  form.blocked_categories.includes(cat)
                    ? "bg-[#EF4444]/20 text-[#EF4444]"
                    : "bg-[#1E293B] text-[#64748B] hover:bg-[#EF4444]/10"
                }`}
                onClick={() => {
                  const cats = form.blocked_categories.includes(cat)
                    ? form.blocked_categories.filter(c => c !== cat)
                    : [...form.blocked_categories, cat];
                  updateField("blocked_categories", cats);
                }}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blocked Keywords */}
      <Card className="surface-secondary border-[#F59E0B]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#F59E0B]">Blocked Keywords</CardTitle>
          <CardDescription className="text-xs text-[#64748B]">
            Ads will not appear on pages containing these keywords
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Enter keyword and press Enter"
            className="surface-primary border-[#2D3B55] text-[#F8FAFC]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                const keyword = e.target.value.trim().toLowerCase();
                if (!form.blocked_keywords.includes(keyword)) {
                  updateField("blocked_keywords", [...form.blocked_keywords, keyword]);
                }
                e.target.value = '';
              }
            }}
          />
          {form.blocked_keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {form.blocked_keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="bg-[#F59E0B]/20 text-[#F59E0B]">
                  {keyword}
                  <button onClick={() => updateField("blocked_keywords", form.blocked_keywords.filter(k => k !== keyword))} className="ml-2">x</button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Domains */}
      <Card className="surface-secondary border-[#8B5CF6]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#8B5CF6]">Blocked Domains</CardTitle>
          <CardDescription className="text-xs text-[#64748B]">
            Ads will not appear on these domains
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Enter domain and press Enter (e.g., example.com)"
            className="surface-primary border-[#2D3B55] text-[#F8FAFC]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                const domain = e.target.value.trim().toLowerCase();
                if (!form.blocked_domains.includes(domain)) {
                  updateField("blocked_domains", [...form.blocked_domains, domain]);
                }
                e.target.value = '';
              }
            }}
          />
          {form.blocked_domains.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {form.blocked_domains.map((domain) => (
                <Badge key={domain} variant="secondary" className="bg-[#8B5CF6]/20 text-[#8B5CF6]">
                  {domain}
                  <button onClick={() => updateField("blocked_domains", form.blocked_domains.filter(d => d !== domain))} className="ml-2">x</button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Controls */}
      <Card className="surface-secondary border-[#2D3B55]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#F8FAFC]">Additional Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#F8FAFC]">Exclude User-Generated Content</p>
              <p className="text-xs text-[#64748B]">Avoid placements on UGC platforms like forums, comments</p>
            </div>
            <Switch
              checked={form.exclude_ugc}
              onCheckedChange={(v) => updateField("exclude_ugc", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#F8FAFC]">Exclude Live Streaming Content</p>
              <p className="text-xs text-[#64748B]">Avoid placements in live streams and live events</p>
            </div>
            <Switch
              checked={form.exclude_live_streaming}
              onCheckedChange={(v) => updateField("exclude_live_streaming", v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
