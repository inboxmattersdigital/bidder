import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import { Slider } from "../../../components/ui/slider";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../../components/ui/select";
import { 
  AGE_RANGES, GENDERS, INCOME_SEGMENTS, PARENTAL_STATUSES, LANGUAGES,
  AFFINITY_SEGMENTS, IN_MARKET_SEGMENTS
} from "../constants";

export function AudienceStep({ form, updateField }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Audience</h2>
        <p className="text-sm text-[#64748B]">Define demographic, interest, and audience targeting</p>
      </div>

      {/* Affinity Segments */}
      <Card className="surface-secondary border-[#F59E0B]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#F59E0B]">Affinity Segments</CardTitle>
          <CardDescription className="text-xs text-[#64748B]">
            Target users based on long-term interests and lifestyles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select 
            onValueChange={(v) => {
              if (v && !form.affinity_segments.includes(v)) {
                updateField("affinity_segments", [...form.affinity_segments, v]);
              }
            }}
          >
            <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
              <SelectValue placeholder="Select affinity segment" />
            </SelectTrigger>
            <SelectContent className="surface-primary border-[#2D3B55] max-h-[300px]">
              {AFFINITY_SEGMENTS.map((seg) => (
                <SelectItem key={seg} value={seg} className="text-[#F8FAFC]">{seg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.affinity_segments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {form.affinity_segments.map((seg) => (
                <Badge key={seg} variant="secondary" className="bg-[#F59E0B]/20 text-[#F59E0B]">
                  {seg}
                  <button onClick={() => updateField("affinity_segments", form.affinity_segments.filter(s => s !== seg))} className="ml-2">x</button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* In-Market Segments */}
      <Card className="surface-secondary border-[#10B981]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#10B981]">In-Market Segments</CardTitle>
          <CardDescription className="text-xs text-[#64748B]">
            Target users actively researching or comparing products/services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select 
            onValueChange={(v) => {
              if (v && !form.in_market_segments.includes(v)) {
                updateField("in_market_segments", [...form.in_market_segments, v]);
              }
            }}
          >
            <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
              <SelectValue placeholder="Select in-market segment" />
            </SelectTrigger>
            <SelectContent className="surface-primary border-[#2D3B55] max-h-[300px]">
              {IN_MARKET_SEGMENTS.map((seg) => (
                <SelectItem key={seg} value={seg} className="text-[#F8FAFC]">{seg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.in_market_segments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {form.in_market_segments.map((seg) => (
                <Badge key={seg} variant="secondary" className="bg-[#10B981]/20 text-[#10B981]">
                  {seg}
                  <button onClick={() => updateField("in_market_segments", form.in_market_segments.filter(s => s !== seg))} className="ml-2">x</button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* First Party Audiences */}
      <Card className="surface-secondary border-[#3B82F6]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#3B82F6]">First Party Audiences</CardTitle>
          <CardDescription className="text-xs text-[#64748B]">
            Your owned customer data (customer lists, site visitors)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={form.first_party_audience_input}
              onChange={(e) => updateField("first_party_audience_input", e.target.value)}
              placeholder="Audience name"
              className="surface-primary border-[#2D3B55] text-[#F8FAFC]"
            />
            <button 
              onClick={() => {
                if (form.first_party_audience_input.trim()) {
                  updateField("first_party_audiences", [...form.first_party_audiences, form.first_party_audience_input.trim()]);
                  updateField("first_party_audience_input", "");
                }
              }}
              className="px-4 py-2 bg-[#3B82F6] text-white rounded hover:bg-[#2563EB]"
            >
              Add
            </button>
          </div>
          {form.first_party_audiences.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.first_party_audiences.map((aud, idx) => (
                <Badge key={idx} variant="secondary" className="bg-[#3B82F6]/20 text-[#3B82F6]">
                  {aud}
                  <button onClick={() => updateField("first_party_audiences", form.first_party_audiences.filter((_, i) => i !== idx))} className="ml-2">x</button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Third Party Audiences */}
      <Card className="surface-secondary border-[#8B5CF6]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#8B5CF6]">Third Party Audiences</CardTitle>
          <CardDescription className="text-xs text-[#64748B]">
            Data from external providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={form.third_party_audience_input}
              onChange={(e) => updateField("third_party_audience_input", e.target.value)}
              placeholder="Audience name or segment ID"
              className="surface-primary border-[#2D3B55] text-[#F8FAFC]"
            />
            <button 
              onClick={() => {
                if (form.third_party_audience_input.trim()) {
                  updateField("third_party_audiences", [...form.third_party_audiences, form.third_party_audience_input.trim()]);
                  updateField("third_party_audience_input", "");
                }
              }}
              className="px-4 py-2 bg-[#8B5CF6] text-white rounded hover:bg-[#7C3AED]"
            >
              Add
            </button>
          </div>
          {form.third_party_audiences.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.third_party_audiences.map((aud, idx) => (
                <Badge key={idx} variant="secondary" className="bg-[#8B5CF6]/20 text-[#8B5CF6]">
                  {aud}
                  <button onClick={() => updateField("third_party_audiences", form.third_party_audiences.filter((_, i) => i !== idx))} className="ml-2">x</button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demographics */}
      <Card className="surface-secondary border-[#EC4899]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#EC4899]">Demographics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Age Ranges */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Age Ranges</Label>
            <Select 
              onValueChange={(v) => {
                if (v && !form.age_ranges.includes(v)) {
                  updateField("age_ranges", [...form.age_ranges, v]);
                }
              }}
            >
              <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
                <SelectValue placeholder="Select age range" />
              </SelectTrigger>
              <SelectContent className="surface-primary border-[#2D3B55]">
                {AGE_RANGES.map((age) => (
                  <SelectItem key={age} value={age} className="text-[#F8FAFC]">{age}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.age_ranges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.age_ranges.map((age) => (
                  <Badge key={age} variant="secondary" className="bg-[#EC4899]/20 text-[#EC4899]">
                    {age}
                    <button onClick={() => updateField("age_ranges", form.age_ranges.filter(a => a !== age))} className="ml-2">x</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Genders */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Genders</Label>
            <Select 
              onValueChange={(v) => {
                if (v && !form.genders.includes(v)) {
                  updateField("genders", [...form.genders, v]);
                }
              }}
            >
              <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent className="surface-primary border-[#2D3B55]">
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g} className="text-[#F8FAFC] capitalize">{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.genders.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.genders.map((g) => (
                  <Badge key={g} variant="secondary" className="bg-[#EC4899]/20 text-[#EC4899] capitalize">
                    {g}
                    <button onClick={() => updateField("genders", form.genders.filter(x => x !== g))} className="ml-2">x</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Income Segments */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Income Segments</Label>
            <Select 
              onValueChange={(v) => {
                if (v && !form.income_segments.includes(v)) {
                  updateField("income_segments", [...form.income_segments, v]);
                }
              }}
            >
              <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
                <SelectValue placeholder="Select income segment" />
              </SelectTrigger>
              <SelectContent className="surface-primary border-[#2D3B55]">
                {INCOME_SEGMENTS.map((inc) => (
                  <SelectItem key={inc} value={inc} className="text-[#F8FAFC] capitalize">{inc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.income_segments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.income_segments.map((inc) => (
                  <Badge key={inc} variant="secondary" className="bg-[#EC4899]/20 text-[#EC4899] capitalize">
                    {inc}
                    <button onClick={() => updateField("income_segments", form.income_segments.filter(x => x !== inc))} className="ml-2">x</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Parental Status */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Parental Status</Label>
            <div className="flex gap-4">
              {PARENTAL_STATUSES.map((status) => (
                <label key={status} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.parental_status.includes(status)}
                    onChange={() => {
                      const list = form.parental_status.includes(status)
                        ? form.parental_status.filter(s => s !== status)
                        : [...form.parental_status, status];
                      updateField("parental_status", list);
                    }}
                    className="rounded border-[#2D3B55]"
                  />
                  <span className="text-sm text-[#F8FAFC] capitalize">{status.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Languages</Label>
            <Select 
              onValueChange={(v) => {
                if (v && !form.languages.includes(v)) {
                  updateField("languages", [...form.languages, v]);
                }
              }}
            >
              <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="surface-primary border-[#2D3B55] max-h-[300px]">
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code} className="text-[#F8FAFC]">{lang.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.languages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.languages.map((code) => (
                  <Badge key={code} variant="secondary" className="bg-[#10B981]/20 text-[#10B981]">
                    {LANGUAGES.find(l => l.code === code)?.name || code}
                    <button onClick={() => updateField("languages", form.languages.filter(l => l !== code))} className="ml-2">x</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lookalike Audiences */}
      <Card className="surface-secondary border-[#06B6D4]/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-[#06B6D4]">Lookalike Expansion</CardTitle>
            <Switch
              checked={form.lookalike_enabled}
              onCheckedChange={(v) => updateField("lookalike_enabled", v)}
            />
          </div>
          <CardDescription className="text-xs text-[#64748B]">
            Expand reach to similar users
          </CardDescription>
        </CardHeader>
        {form.lookalike_enabled && (
          <CardContent>
            <Label className="text-[#94A3B8]">Expansion Level: {form.lookalike_expansion}</Label>
            <Slider
              value={[form.lookalike_expansion]}
              onValueChange={([v]) => updateField("lookalike_expansion", v)}
              min={1}
              max={10}
              step={1}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-[#64748B] mt-1">
              <span>More Similar</span>
              <span>Broader Reach</span>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
