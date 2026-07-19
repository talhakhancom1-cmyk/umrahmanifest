import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

function AssetField({ label, value, onChange }) {
  const ref = useRef(null);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange(file_url);
  };
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => ref.current?.click()}
        >
          <Upload className="w-3.5 h-3.5" /> Upload
        </Button>
        {value && (
          <img
            src={value}
            alt={label}
            className="w-10 h-10 object-contain rounded border border-border"
          />
        )}
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Clear
          </Button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={upload}
      />
    </div>
  );
}

export default function TemplatePanel({ trip, setTrip }) {
  const set = (field) => (value) => setTrip({ ...trip, [field]: value });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card border border-border rounded-lg p-4">
      <div className="space-y-1.5">
        <Label>Company Name (EN)</Label>
        <Input
          value={trip.company_name || ""}
          onChange={(e) => set("company_name")(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Company Name (AR)</Label>
        <Input
          value={trip.company_name_ar || ""}
          onChange={(e) => set("company_name_ar")(e.target.value)}
          dir="rtl"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Driver Name</Label>
        <Input
          value={trip.driver_name || ""}
          onChange={(e) => set("driver_name")(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Vehicle Plate</Label>
        <Input
          value={trip.vehicle_plate || ""}
          onChange={(e) => set("vehicle_plate")(e.target.value)}
        />
      </div>
      <AssetField
        label="Company Logo"
        value={trip.logo_url || ""}
        onChange={set("logo_url")}
      />
      <AssetField
        label="Company Stamp"
        value={trip.stamp_url || ""}
        onChange={set("stamp_url")}
      />
      <AssetField
        label="QR Code"
        value={trip.qr_url || ""}
        onChange={set("qr_url")}
      />
    </div>
  );
}