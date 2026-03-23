import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../../components/ui/select";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TIMEZONES = [
  "UTC", "America/New_York", "America/Los_Angeles", "America/Chicago",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Singapore", "Asia/Dubai", "Asia/Kolkata",
  "Australia/Sydney"
];

export function ScheduleStep({ form, updateField }) {
  const toggleDay = (day) => {
    const days = form.days_of_week.includes(day)
      ? form.days_of_week.filter(d => d !== day)
      : [...form.days_of_week, day].sort((a, b) => a - b);
    updateField("days_of_week", days);
  };

  const toggleHour = (hour) => {
    const hours = form.hours_of_day.includes(hour)
      ? form.hours_of_day.filter(h => h !== hour)
      : [...form.hours_of_day, hour].sort((a, b) => a - b);
    updateField("hours_of_day", hours);
  };

  const selectAllHours = () => updateField("hours_of_day", HOURS);
  const clearAllHours = () => updateField("hours_of_day", []);
  const selectBusinessHours = () => updateField("hours_of_day", [9, 10, 11, 12, 13, 14, 15, 16, 17]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Schedule & Pacing</h2>
        <p className="text-sm text-slate-500">Set campaign flight dates, frequency caps, and dayparting</p>
      </div>

      {/* Flight Dates */}
      <Card className="surface-secondary border-[#3B82F6]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#3B82F6]">Flight Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-600">Start Date *</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => updateField("start_date", e.target.value)}
                className="surface-primary border-slate-200 text-slate-900"
                data-testid="start-date-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600">End Date (Optional)</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => updateField("end_date", e.target.value)}
                className="surface-primary border-slate-200 text-slate-900"
                min={form.start_date}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frequency Capping */}
      <Card className="surface-secondary border-[#10B981]/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-[#10B981]">Frequency Capping</CardTitle>
            <Switch
              checked={form.frequency_cap_enabled}
              onCheckedChange={(v) => updateField("frequency_cap_enabled", v)}
            />
          </div>
        </CardHeader>
        {form.frequency_cap_enabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">Max Impressions</Label>
                <Input
                  type="number"
                  value={form.frequency_cap_count ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateField("frequency_cap_count", val === "" ? 1 : parseInt(val) || 1);
                  }}
                  onBlur={(e) => {
                    if (!e.target.value || parseInt(e.target.value) < 1) {
                      updateField("frequency_cap_count", 1);
                    }
                  }}
                  className="surface-primary border-slate-200 text-slate-900"
                  min={1}
                  data-testid="frequency-cap-count"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Period</Label>
                <Select value={form.frequency_cap_period || "day"} onValueChange={(v) => updateField("frequency_cap_period", v)}>
                  <SelectTrigger className="surface-primary border-slate-200 text-slate-900" data-testid="frequency-cap-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="surface-primary border-slate-200">
                    <SelectItem value="hour">Per Hour</SelectItem>
                    <SelectItem value="day">Per Day</SelectItem>
                    <SelectItem value="week">Per Week</SelectItem>
                    <SelectItem value="month">Per Month</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Cap Type</Label>
                <Select value={form.frequency_cap_type || "user"} onValueChange={(v) => updateField("frequency_cap_type", v)}>
                  <SelectTrigger className="surface-primary border-slate-200 text-slate-900" data-testid="frequency-cap-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="surface-primary border-slate-200">
                    <SelectItem value="user">Per User</SelectItem>
                    <SelectItem value="campaign">Per Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {form.frequency_cap_type === "user" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600">Daily Cap (per user)</Label>
                  <Input
                    type="number"
                    value={form.frequency_cap_daily ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateField("frequency_cap_daily", val === "" ? 0 : parseInt(val) || 0);
                    }}
                    className="surface-primary border-slate-200 text-slate-900"
                    placeholder="Unlimited"
                    min={0}
                    data-testid="frequency-cap-daily"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600">Lifetime Cap (per user)</Label>
                  <Input
                    type="number"
                    value={form.frequency_cap_lifetime ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateField("frequency_cap_lifetime", val === "" ? 0 : parseInt(val) || 0);
                    }}
                    className="surface-primary border-slate-200 text-slate-900"
                    placeholder="Unlimited"
                    min={0}
                    data-testid="frequency-cap-lifetime"
                  />
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Dayparting */}
      <Card className="surface-secondary border-[#8B5CF6]/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-[#8B5CF6]">Dayparting (Time Targeting)</CardTitle>
            <Switch
              checked={form.time_targeting_enabled}
              onCheckedChange={(v) => updateField("time_targeting_enabled", v)}
            />
          </div>
        </CardHeader>
        {form.time_targeting_enabled && (
          <CardContent className="space-y-4">
            {/* Timezone */}
            <div className="space-y-2">
              <Label className="text-slate-600">Timezone</Label>
              <Select value={form.timezone} onValueChange={(v) => updateField("timezone", v)}>
                <SelectTrigger className="surface-primary border-slate-200 text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="surface-primary border-slate-200">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz} className="text-slate-900">{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Days of Week */}
            <div className="space-y-2">
              <Label className="text-slate-600">Days of Week</Label>
              <div className="flex gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                      form.days_of_week.includes(day.value)
                        ? "bg-[#8B5CF6] text-white"
                        : "surface-primary border border-slate-200 text-slate-500 hover:border-[#8B5CF6]/50"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours of Day */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-600">Hours of Day</Label>
                <div className="flex gap-2">
                  <button onClick={selectAllHours} className="text-xs text-[#3B82F6] hover:underline">All</button>
                  <button onClick={selectBusinessHours} className="text-xs text-[#10B981] hover:underline">Business</button>
                  <button onClick={clearAllHours} className="text-xs text-[#EF4444] hover:underline">Clear</button>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                {HOURS.map((hour) => (
                  <button
                    key={hour}
                    onClick={() => toggleHour(hour)}
                    className={`py-2 rounded text-xs font-medium transition-all ${
                      form.hours_of_day.includes(hour)
                        ? "bg-[#8B5CF6] text-white"
                        : "surface-primary border border-slate-200 text-slate-500 hover:border-[#8B5CF6]/50"
                    }`}
                  >
                    {hour.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Selected: {form.hours_of_day.length} hours
                {form.hours_of_day.length > 0 && ` (${Math.min(...form.hours_of_day)}:00 - ${Math.max(...form.hours_of_day)}:59)`}
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
