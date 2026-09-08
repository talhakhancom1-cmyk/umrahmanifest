import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Extra manifest fields that only the Warda Al Hayah template prints.
export default function WardaExtraFields({ values, onChange }) {
  const set = (key) => (e) => onChange({ ...values, [key]: e.target.value });
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Warda Al Hayah fields
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Driver Phone</Label>
          <Input
            placeholder="05xxxxxxxx"
            value={values.driverPhone}
            onChange={set("driverPhone")}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Trip Number</Label>
          <Input value={values.tripNumber} onChange={set("tripNumber")} />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input value={values.notes} onChange={set("notes")} />
        </div>
      </div>
    </section>
  );
}