import React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { PLACES } from "@/lib/places";

// Place picker for the Warda company: menu shows English + Arabic so the
// place is easy to spot; the manifest itself prints only the Arabic name.
export default function WardaRouteSelect({ value, onChange }) {
  const current = PLACES.find((p) => p.en === value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select place">
          {current ? `${current.en.replace(/_/g, " ")} — ${current.ar}` : value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PLACES.map((p) => (
          <SelectItem key={p.en} value={p.en} textValue={p.en}>
            <div className="flex items-center justify-between gap-4 w-full">
              <span>{p.en.replace(/_/g, " ")}</span>
              <span dir="rtl" className="text-muted-foreground">{p.ar}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}