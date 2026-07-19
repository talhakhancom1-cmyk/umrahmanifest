import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";

export default function PassengerTable({ passengers, onChange, destination, date }) {
  const update = (i, field, value) => {
    const next = passengers.map((p, idx) =>
      idx === i ? { ...p, [field]: value } : p
    );
    onChange(next);
  };
  const remove = (i) => onChange(passengers.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...passengers, { name: "", id_number: "", nationality: "" }]);

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>ID No.</TableHead>
            <TableHead>Nationality</TableHead>
            <TableHead className="w-24">Destination</TableHead>
            <TableHead className="w-28">Date</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {passengers.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                No passengers yet. Upload photos to auto-fill.
              </TableCell>
            </TableRow>
          )}
          {passengers.map((p, i) => (
            <TableRow key={i}>
              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
              <TableCell>
                <Input
                  value={p.name}
                  onChange={(e) => update(i, "name", e.target.value)}
                  className="h-8"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={p.id_number}
                  onChange={(e) => update(i, "id_number", e.target.value)}
                  className="h-8"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={p.nationality}
                  onChange={(e) => update(i, "nationality", e.target.value)}
                  className="h-8"
                />
              </TableCell>
              <TableCell className="text-sm">{destination}</TableCell>
              <TableCell className="text-sm">{date}</TableCell>
              <TableCell>
                <Button size="icon" variant="ghost" onClick={() => remove(i)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="p-2 border-t border-border">
        <Button size="sm" variant="ghost" onClick={add}>
          <Plus className="w-4 h-4" /> Add row
        </Button>
      </div>
    </div>
  );
}