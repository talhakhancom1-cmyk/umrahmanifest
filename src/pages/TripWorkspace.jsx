import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { ArrowLeft, Save, FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PhotoUploader from "@/components/trips/PhotoUploader";
import PassengerTable from "@/components/trips/PassengerTable";
import TemplatePanel from "@/components/trips/TemplatePanel";
import { generateTripPdf } from "@/lib/generateTripPdf";

export default function TripWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trip, setTrip] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    base44.entities.Trip.get(id)
      .then(setTrip)
      .catch(() => {
        toast({ title: "Trip not found", variant: "destructive" });
        navigate("/");
      });
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Trip.update(id, {
        trip_name: trip.trip_name,
        route: trip.route,
        travel_date: trip.travel_date,
        driver_name: trip.driver_name,
        vehicle_plate: trip.vehicle_plate,
        company_name: trip.company_name,
        company_name_ar: trip.company_name_ar,
        logo_url: trip.logo_url,
        stamp_url: trip.stamp_url,
        qr_url: trip.qr_url,
        passengers: trip.passengers,
        photo_urls: trip.photo_urls,
        status: trip.status
      });
      toast({ title: "Saved" });
    } catch (e) {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const onExtracted = (passengers, photoUrls) => {
    const merged = {
      ...trip,
      passengers: [...(trip.passengers || []), ...passengers],
      photo_urls: [...(trip.photo_urls || []), ...photoUrls]
    };
    setTrip(merged);
    base44.entities.Trip
      .update(id, { passengers: merged.passengers, photo_urls: merged.photo_urls })
      .catch(() => {});
    toast({ title: `Extracted ${passengers.length} passengers` });
  };

  const generate = async () => {
    setGenerating(true);
    try {
      await generateTripPdf(trip);
    } catch (e) {
      toast({ title: "PDF generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading trip…
      </div>
    );
  }

  const destination = trip.route === "Madina_to_Makkah" ? "Makkah" : "Madinah";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Input
              value={trip.trip_name}
              onChange={(e) => setTrip({ ...trip, trip_name: e.target.value })}
              className="h-9 max-w-xs font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}{" "}
              Save
            </Button>
            <Button
              onClick={generate}
              disabled={generating || !trip.passengers?.length}
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}{" "}
              Generate PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Route</Label>
            <Select
              value={trip.route}
              onValueChange={(v) => setTrip({ ...trip, route: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Madina_to_Makkah">Madinah → Makkah</SelectItem>
                <SelectItem value="Makkah_to_Madina">Makkah → Madinah</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Travel Date</Label>
            <Input
              type="date"
              value={trip.travel_date || ""}
              onChange={(e) =>
                setTrip({ ...trip, travel_date: e.target.value })
              }
            />
          </div>
          <div className="flex items-end">
            <PhotoUploader onExtracted={onExtracted} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Passengers
          </h2>
          <PassengerTable
            passengers={trip.passengers || []}
            onChange={(passengers) => setTrip({ ...trip, passengers })}
            destination={destination}
            date={trip.travel_date || ""}
          />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Template & Driver Info
          </h2>
          <TemplatePanel trip={trip} setTrip={setTrip} />
        </section>
      </main>
    </div>
  );
}