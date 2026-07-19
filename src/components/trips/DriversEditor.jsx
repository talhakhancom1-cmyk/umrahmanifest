import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export default function DriversEditor({ drivers, onChange }) {
  const update = (i, field, value) =>
    onChange(drivers.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)));
  const add = () => onChange([...drivers, { name: "", iqama_no: "" }]);
  const remove = (i) => onChange(drivers.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {drivers.map((d, i) => (
        <div key={i} className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Driver Name</Label>
            <Input
              value={d.name}
              onChange={(e) => update(i, "name", e.target.value)}
              className="h-8"
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Iqama No.</Label>
            <Input
              value={d.iqama_no}
              onChange={(e) => update(i, "iqama_no", e.target.value)}
              className="h-8"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => remove(i)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={add}>
        <Plus className="w-4 h-4" /> Add driver
      </Button>
    </div>
  );
}