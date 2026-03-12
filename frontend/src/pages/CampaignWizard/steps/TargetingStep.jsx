import { useState } from "react";
import { Check, Trash2, Plus, Upload, X, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import { Checkbox } from "../../../components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../../components/ui/select";
import { toast } from "sonner";
import { 
  COUNTRIES, COUNTRY_STATES, COUNTRY_CITIES, TELECOM_OPERATORS,
  DEVICE_TYPES, OS_LIST, OS_VERSIONS, BROWSERS, CONNECTION_SPEEDS,
  AD_PLACEMENTS_DISPLAY, AD_PLACEMENTS_INCONTENT, AD_PLACEMENTS_NATIVE,
  SUPPLY_SOURCES
} from "../constants";

// Helper component for bulk input
function BulkInputSection({ title, items, onAdd, onRemove, placeholder, type = "include" }) {
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  
  const handleBulkAdd = () => {
    const newItems = bulkInput
      .split(/[\n,]+/)
      .map(item => item.trim())
      .filter(item => item && !items.includes(item));
    if (newItems.length > 0) {
      onAdd([...items, ...newItems]);
      setBulkInput("");
      setShowBulk(false);
      toast.success(`Added ${newItems.length} items`);
    }
  };

  const colorClass = type === "include" ? "10B981" : "EF4444";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[#94A3B8]">{title}</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowBulk(!showBulk)}
          className={`text-[#${colorClass}] hover:text-[#${colorClass}]`}
        >
          <Upload className="w-3 h-3 mr-1" />
          Bulk
        </Button>
      </div>
      
      {showBulk ? (
        <div className="space-y-2">
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder={`Paste ${placeholder} (comma or newline separated)`}
            className="w-full h-24 p-2 rounded surface-primary border border-[#2D3B55] text-[#F8FAFC] text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleBulkAdd} className={`bg-[#${colorClass}]`}>
              Add All
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowBulk(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Input
          placeholder={`Enter ${placeholder} and press Enter`}
          className="surface-primary border-[#2D3B55] text-[#F8FAFC]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              const val = e.target.value.trim();
              if (!items.includes(val)) {
                onAdd([...items, val]);
              }
              e.target.value = '';
            }
          }}
        />
      )}
      
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className={`bg-[#${colorClass}]/20 text-[#${colorClass}]`}>
              {item}
              <button onClick={() => onRemove(items.filter(i => i !== item))} className="ml-2">x</button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Country/State/City selector component
function GeoSelector({ form, updateField, type = "include" }) {
  const suffix = type === "include" ? "" : "_exclude";
  const countriesField = `geo_countries${suffix}`;
  const statesField = `geo_states${suffix}`;
  const citiesField = `geo_cities${suffix}`;
  const pincodesField = `geo_pincodes${suffix}`;
  
  const countries = form[countriesField] || [];
  const states = form[statesField] || [];
  const cities = form[citiesField] || [];
  const pincodes = form[pincodesField] || [];
  
  const availableStates = countries.length === 1 ? (COUNTRY_STATES[countries[0]] || []) : [];
  const availableCities = countries.length === 1 ? (COUNTRY_CITIES[countries[0]] || []) : [];
  
  const colorClass = type === "include" ? "10B981" : "EF4444";
  
  return (
    <div className="space-y-4">
      {/* Countries */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Countries</Label>
        <Select 
          onValueChange={(v) => {
            if (v && !countries.includes(v)) {
              updateField(countriesField, [...countries, v]);
              if (type === "include") {
                updateField(statesField, []);
                updateField(citiesField, []);
              }
            }
          }}
        >
          <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
            <SelectValue placeholder={`Select country to ${type}`} />
          </SelectTrigger>
          <SelectContent className="surface-primary border-[#2D3B55] max-h-[300px]">
            {COUNTRIES.map((country) => (
              <SelectItem key={country.code} value={country.code} className="text-[#F8FAFC]">
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {countries.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {countries.map((code) => (
              <Badge key={code} variant="secondary" className={`bg-[#${colorClass}]/20 text-[#${colorClass}]`}>
                {COUNTRIES.find(c => c.code === code)?.name || code}
                <button onClick={() => updateField(countriesField, countries.filter(c => c !== code))} className="ml-2">x</button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* States */}
      {availableStates.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">States / Regions</Label>
          <Select onValueChange={(v) => {
            if (v && !states.includes(v)) {
              updateField(statesField, [...states, v]);
            }
          }}>
            <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
              <SelectValue placeholder="Select state/region" />
            </SelectTrigger>
            <SelectContent className="surface-primary border-[#2D3B55] max-h-[300px]">
              {availableStates.map((state) => (
                <SelectItem key={state} value={state} className="text-[#F8FAFC]">{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {states.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {states.map((state) => (
                <Badge key={state} variant="secondary" className={`bg-[#${colorClass}]/20 text-[#${colorClass}]`}>
                  {state}
                  <button onClick={() => updateField(statesField, states.filter(s => s !== state))} className="ml-2">x</button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cities */}
      {availableCities.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Cities</Label>
          <Select onValueChange={(v) => {
            if (v && !cities.includes(v)) {
              updateField(citiesField, [...cities, v]);
            }
          }}>
            <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent className="surface-primary border-[#2D3B55] max-h-[300px]">
              {availableCities.map((city) => (
                <SelectItem key={city} value={city} className="text-[#F8FAFC]">{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {cities.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {cities.map((city) => (
                <Badge key={city} variant="secondary" className={`bg-[#${colorClass}]/20 text-[#${colorClass}]`}>
                  {city}
                  <button onClick={() => updateField(citiesField, cities.filter(c => c !== city))} className="ml-2">x</button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pincodes */}
      <BulkInputSection
        title="Pincodes / ZIP Codes"
        items={pincodes}
        onAdd={(items) => updateField(pincodesField, items)}
        onRemove={(items) => updateField(pincodesField, items)}
        placeholder="pincode"
        type={type}
      />
    </div>
  );
}

export function TargetingStep({ form, updateField }) {
  const availableOperators = form.geo_countries.length === 1 
    ? (TELECOM_OPERATORS[form.geo_countries[0]] || []) 
    : [];
  
  const availableOSVersions = form.os_list.flatMap(os => 
    (OS_VERSIONS[os] || []).map(v => `${v}`)
  );

  const addLatLongPoint = () => {
    if (form.geo_latitude && form.geo_longitude) {
      const newPoint = {
        id: Date.now().toString(),
        lat: parseFloat(form.geo_latitude),
        lon: parseFloat(form.geo_longitude),
        radius_km: form.radius_km,
        type: form.lat_long_type
      };
      updateField("lat_long_points", [...form.lat_long_points, newPoint]);
      updateField("geo_latitude", "");
      updateField("geo_longitude", "");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Targeting</h2>
        <p className="text-sm text-[#64748B]">Define geographic, device, inventory, and technical targeting</p>
      </div>

      <Tabs defaultValue="geo" className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-[#0A0F1C]">
          <TabsTrigger value="geo" className="data-[state=active]:bg-[#3B82F6] text-xs">Geography</TabsTrigger>
          <TabsTrigger value="device" className="data-[state=active]:bg-[#3B82F6] text-xs">Device</TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-[#3B82F6] text-xs">Inventory</TabsTrigger>
          <TabsTrigger value="supply" className="data-[state=active]:bg-[#3B82F6] text-xs">Supply</TabsTrigger>
          <TabsTrigger value="contextual" className="data-[state=active]:bg-[#3B82F6] text-xs">Contextual</TabsTrigger>
          <TabsTrigger value="technical" className="data-[state=active]:bg-[#3B82F6] text-xs">Technical</TabsTrigger>
        </TabsList>

        {/* Geography Tab */}
        <TabsContent value="geo" className="space-y-4 mt-4">
          <Card className="surface-secondary border-[#10B981]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#10B981] flex items-center gap-2">
                <Check className="w-4 h-4" /> Include Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GeoSelector form={form} updateField={updateField} type="include" />
            </CardContent>
          </Card>

          <Card className="surface-secondary border-[#EF4444]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#EF4444] flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Exclude Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GeoSelector form={form} updateField={updateField} type="exclude" />
            </CardContent>
          </Card>

          {/* Telecom Operators */}
          {availableOperators.length > 0 && (
            <Card className="surface-secondary border-[#8B5CF6]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[#8B5CF6]">Telecom Operators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {availableOperators.map((op) => (
                    <Badge
                      key={op}
                      variant="secondary"
                      className={`cursor-pointer ${
                        form.telecom_operators.includes(op)
                          ? "bg-[#8B5CF6]/20 text-[#8B5CF6]"
                          : "bg-[#1E293B] text-[#64748B] hover:bg-[#8B5CF6]/10"
                      }`}
                      onClick={() => {
                        const ops = form.telecom_operators.includes(op)
                          ? form.telecom_operators.filter(o => o !== op)
                          : [...form.telecom_operators, op];
                        updateField("telecom_operators", ops);
                      }}
                    >
                      {op}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lat/Long Targeting */}
          <Card className="surface-secondary border-[#F59E0B]/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-[#F59E0B] flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Lat/Long Radius Targeting
                </CardTitle>
                <Switch
                  checked={form.lat_long_targeting}
                  onCheckedChange={(v) => updateField("lat_long_targeting", v)}
                />
              </div>
            </CardHeader>
            {form.lat_long_targeting && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[#94A3B8] text-xs">Latitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={form.geo_latitude}
                      onChange={(e) => updateField("geo_latitude", e.target.value)}
                      placeholder="e.g. 40.7128"
                      className="surface-primary border-[#2D3B55] text-[#F8FAFC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[#94A3B8] text-xs">Longitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={form.geo_longitude}
                      onChange={(e) => updateField("geo_longitude", e.target.value)}
                      placeholder="e.g. -74.0060"
                      className="surface-primary border-[#2D3B55] text-[#F8FAFC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[#94A3B8] text-xs">Radius (km)</Label>
                    <Input
                      type="number"
                      value={form.radius_km}
                      onChange={(e) => updateField("radius_km", parseInt(e.target.value) || 10)}
                      className="surface-primary border-[#2D3B55] text-[#F8FAFC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[#94A3B8] text-xs">Type</Label>
                    <Select value={form.lat_long_type} onValueChange={(v) => updateField("lat_long_type", v)}>
                      <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="surface-primary border-[#2D3B55]">
                        <SelectItem value="include">Include</SelectItem>
                        <SelectItem value="exclude">Exclude</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={addLatLongPoint}
                  disabled={!form.geo_latitude || !form.geo_longitude}
                  className="bg-[#F59E0B] hover:bg-[#D97706]"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Point
                </Button>
                {form.lat_long_points.length > 0 && (
                  <div className="space-y-2">
                    {form.lat_long_points.map((point) => (
                      <div key={point.id} className={`flex items-center justify-between p-2 rounded ${
                        point.type === "include" ? "bg-[#10B981]/10" : "bg-[#EF4444]/10"
                      }`}>
                        <span className="text-sm text-[#F8FAFC]">
                          {point.lat.toFixed(4)}, {point.lon.toFixed(4)} ({point.radius_km}km) - {point.type}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateField("lat_long_points", form.lat_long_points.filter(p => p.id !== point.id))}
                        >
                          <X className="w-4 h-4 text-[#EF4444]" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Device Tab */}
        <TabsContent value="device" className="space-y-4 mt-4">
          <Card className="surface-secondary border-[#3B82F6]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#3B82F6]">Device Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {DEVICE_TYPES.map((device) => {
                  const Icon = device.icon;
                  const isSelected = form.device_types.includes(device.value);
                  return (
                    <div
                      key={device.value}
                      onClick={() => {
                        const types = isSelected
                          ? form.device_types.filter(t => t !== device.value)
                          : [...form.device_types, device.value];
                        updateField("device_types", types);
                      }}
                      className={`p-4 rounded-lg cursor-pointer border text-center ${
                        isSelected
                          ? "bg-[#3B82F6]/20 border-[#3B82F6]"
                          : "surface-primary border-[#2D3B55] hover:border-[#3B82F6]/50"
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? "text-[#3B82F6]" : "text-[#64748B]"}`} />
                      <p className="text-sm text-[#F8FAFC]">{device.label}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-secondary border-[#10B981]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#10B981]">Operating Systems</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {OS_LIST.map((os) => (
                  <Badge
                    key={os.value}
                    variant="secondary"
                    className={`cursor-pointer ${
                      form.os_list.includes(os.value)
                        ? "bg-[#10B981]/20 text-[#10B981]"
                        : "bg-[#1E293B] text-[#64748B] hover:bg-[#10B981]/10"
                    }`}
                    onClick={() => {
                      const list = form.os_list.includes(os.value)
                        ? form.os_list.filter(o => o !== os.value)
                        : [...form.os_list, os.value];
                      updateField("os_list", list);
                    }}
                  >
                    {os.label}
                  </Badge>
                ))}
              </div>
              
              {/* OS Versions */}
              {availableOSVersions.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-[#94A3B8]">OS Versions</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableOSVersions.map((version) => (
                      <Badge
                        key={version}
                        variant="secondary"
                        className={`cursor-pointer ${
                          form.os_versions.includes(version)
                            ? "bg-[#10B981]/20 text-[#10B981]"
                            : "bg-[#1E293B] text-[#64748B] hover:bg-[#10B981]/10"
                        }`}
                        onClick={() => {
                          const versions = form.os_versions.includes(version)
                            ? form.os_versions.filter(v => v !== version)
                            : [...form.os_versions, version];
                          updateField("os_versions", versions);
                        }}
                      >
                        {version}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connection Speed */}
          <Card className="surface-secondary border-[#8B5CF6]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#8B5CF6]">Connection Speed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {CONNECTION_SPEEDS.map((speed) => (
                  <Badge
                    key={speed.value}
                    variant="secondary"
                    className={`cursor-pointer ${
                      form.connection_types.includes(speed.value)
                        ? "bg-[#8B5CF6]/20 text-[#8B5CF6]"
                        : "bg-[#1E293B] text-[#64748B] hover:bg-[#8B5CF6]/10"
                    }`}
                    onClick={() => {
                      const types = form.connection_types.includes(speed.value)
                        ? form.connection_types.filter(t => t !== speed.value)
                        : [...form.connection_types, speed.value];
                      updateField("connection_types", types);
                    }}
                  >
                    {speed.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4 mt-4">
          <Card className="surface-secondary border-[#10B981]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#10B981]">Domain/URL Allowlist</CardTitle>
              <CardDescription className="text-xs text-[#64748B]">Only bid on these domains</CardDescription>
            </CardHeader>
            <CardContent>
              <BulkInputSection
                title=""
                items={form.domain_allowlist}
                onAdd={(items) => updateField("domain_allowlist", items)}
                onRemove={(items) => updateField("domain_allowlist", items)}
                placeholder="domain (e.g. example.com)"
                type="include"
              />
            </CardContent>
          </Card>

          <Card className="surface-secondary border-[#EF4444]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#EF4444]">Domain/URL Blocklist</CardTitle>
              <CardDescription className="text-xs text-[#64748B]">Never bid on these domains</CardDescription>
            </CardHeader>
            <CardContent>
              <BulkInputSection
                title=""
                items={form.domain_blocklist}
                onAdd={(items) => updateField("domain_blocklist", items)}
                onRemove={(items) => updateField("domain_blocklist", items)}
                placeholder="domain"
                type="exclude"
              />
            </CardContent>
          </Card>

          <Card className="surface-secondary border-[#10B981]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#10B981]">App Allowlist</CardTitle>
              <CardDescription className="text-xs text-[#64748B]">Only bid on these app bundle IDs</CardDescription>
            </CardHeader>
            <CardContent>
              <BulkInputSection
                title=""
                items={form.app_allowlist}
                onAdd={(items) => updateField("app_allowlist", items)}
                onRemove={(items) => updateField("app_allowlist", items)}
                placeholder="bundle ID (e.g. com.example.app)"
                type="include"
              />
            </CardContent>
          </Card>

          <Card className="surface-secondary border-[#EF4444]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#EF4444]">App Blocklist</CardTitle>
              <CardDescription className="text-xs text-[#64748B]">Never bid on these apps</CardDescription>
            </CardHeader>
            <CardContent>
              <BulkInputSection
                title=""
                items={form.app_blocklist}
                onAdd={(items) => updateField("app_blocklist", items)}
                onRemove={(items) => updateField("app_blocklist", items)}
                placeholder="bundle ID"
                type="exclude"
              />
            </CardContent>
          </Card>

          {/* Ad Placements */}
          <Card className="surface-secondary border-[#F59E0B]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#F59E0B]">Ad Placements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display Placements */}
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Display Placements (Include)</Label>
                <div className="flex flex-wrap gap-2">
                  {AD_PLACEMENTS_DISPLAY.map((p) => (
                    <Badge
                      key={p.value}
                      variant="secondary"
                      className={`cursor-pointer ${
                        form.ad_placements_display_include.includes(p.value)
                          ? "bg-[#10B981]/20 text-[#10B981]"
                          : "bg-[#1E293B] text-[#64748B]"
                      }`}
                      onClick={() => {
                        const list = form.ad_placements_display_include.includes(p.value)
                          ? form.ad_placements_display_include.filter(x => x !== p.value)
                          : [...form.ad_placements_display_include, p.value];
                        updateField("ad_placements_display_include", list);
                      }}
                    >
                      {p.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Native Placements */}
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Native Placements (Include)</Label>
                <div className="flex flex-wrap gap-2">
                  {AD_PLACEMENTS_NATIVE.map((p) => (
                    <Badge
                      key={p.value}
                      variant="secondary"
                      className={`cursor-pointer ${
                        form.ad_placements_native_include.includes(p.value)
                          ? "bg-[#10B981]/20 text-[#10B981]"
                          : "bg-[#1E293B] text-[#64748B]"
                      }`}
                      onClick={() => {
                        const list = form.ad_placements_native_include.includes(p.value)
                          ? form.ad_placements_native_include.filter(x => x !== p.value)
                          : [...form.ad_placements_native_include, p.value];
                        updateField("ad_placements_native_include", list);
                      }}
                    >
                      {p.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supply Tab */}
        <TabsContent value="supply" className="space-y-4 mt-4">
          <Card className="surface-secondary border-[#10B981]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#10B981]">Include SSPs/Exchanges</CardTitle>
              <CardDescription className="text-xs text-[#64748B]">Only bid through these supply sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SUPPLY_SOURCES.map((ssp) => (
                  <Badge
                    key={ssp}
                    variant="secondary"
                    className={`cursor-pointer ${
                      form.supply_sources_include.includes(ssp)
                        ? "bg-[#10B981]/20 text-[#10B981]"
                        : "bg-[#1E293B] text-[#64748B] hover:bg-[#10B981]/10"
                    }`}
                    onClick={() => {
                      const list = form.supply_sources_include.includes(ssp)
                        ? form.supply_sources_include.filter(s => s !== ssp)
                        : [...form.supply_sources_include, ssp];
                      updateField("supply_sources_include", list);
                    }}
                  >
                    {ssp}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-secondary border-[#EF4444]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#EF4444]">Exclude SSPs/Exchanges</CardTitle>
              <CardDescription className="text-xs text-[#64748B]">Never bid through these supply sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SUPPLY_SOURCES.map((ssp) => (
                  <Badge
                    key={ssp}
                    variant="secondary"
                    className={`cursor-pointer ${
                      form.supply_sources_exclude.includes(ssp)
                        ? "bg-[#EF4444]/20 text-[#EF4444]"
                        : "bg-[#1E293B] text-[#64748B] hover:bg-[#EF4444]/10"
                    }`}
                    onClick={() => {
                      const list = form.supply_sources_exclude.includes(ssp)
                        ? form.supply_sources_exclude.filter(s => s !== ssp)
                        : [...form.supply_sources_exclude, ssp];
                      updateField("supply_sources_exclude", list);
                    }}
                  >
                    {ssp}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contextual Tab */}
        <TabsContent value="contextual" className="space-y-4 mt-4">
          <Card className="surface-secondary border-[#3B82F6]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#3B82F6]">Contextual Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              <BulkInputSection
                title=""
                items={form.contextual_keywords}
                onAdd={(items) => updateField("contextual_keywords", items)}
                onRemove={(items) => updateField("contextual_keywords", items)}
                placeholder="keyword"
                type="include"
              />
              <div className="mt-4 space-y-2">
                <Label className="text-[#94A3B8]">Keyword Match Type</Label>
                <Select value={form.keyword_match_type} onValueChange={(v) => updateField("keyword_match_type", v)}>
                  <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="surface-primary border-[#2D3B55]">
                    <SelectItem value="broad">Broad Match</SelectItem>
                    <SelectItem value="phrase">Phrase Match</SelectItem>
                    <SelectItem value="exact">Exact Match</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technical Tab */}
        <TabsContent value="technical" className="space-y-4 mt-4">
          <Card className="surface-secondary border-[#10B981]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#10B981]">Include Browsers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {BROWSERS.map((browser) => (
                  <Badge
                    key={browser}
                    variant="secondary"
                    className={`cursor-pointer ${
                      form.browsers_include.includes(browser)
                        ? "bg-[#10B981]/20 text-[#10B981]"
                        : "bg-[#1E293B] text-[#64748B] hover:bg-[#10B981]/10"
                    }`}
                    onClick={() => {
                      const list = form.browsers_include.includes(browser)
                        ? form.browsers_include.filter(b => b !== browser)
                        : [...form.browsers_include, browser];
                      updateField("browsers_include", list);
                    }}
                  >
                    {browser}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-secondary border-[#EF4444]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#EF4444]">Exclude Browsers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {BROWSERS.map((browser) => (
                  <Badge
                    key={browser}
                    variant="secondary"
                    className={`cursor-pointer ${
                      form.browsers_exclude.includes(browser)
                        ? "bg-[#EF4444]/20 text-[#EF4444]"
                        : "bg-[#1E293B] text-[#64748B] hover:bg-[#EF4444]/10"
                    }`}
                    onClick={() => {
                      const list = form.browsers_exclude.includes(browser)
                        ? form.browsers_exclude.filter(b => b !== browser)
                        : [...form.browsers_exclude, browser];
                      updateField("browsers_exclude", list);
                    }}
                  >
                    {browser}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
