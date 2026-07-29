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
import { ArrowLeft, Save, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PhotoUploader from "@/components/trips/PhotoUploader";
import PassengerTable from "@/components/trips/PassengerTable";
import DriversEditor from "@/components/trips/DriversEditor";
import TemplatePanel from "@/components/trips/TemplatePanel";

export default function TripWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trip, setTrip] = useState(null);
  const [saving, setSaving] = useState(false);

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
        route_from: trip.route_from,
        route_to: trip.route_to,
        travel_date: trip.travel_date,
        trip_time: trip.trip_time,
        second_party_name: trip.second_party_name,
        drivers: trip.drivers,
        vehicle_plate: trip.vehicle_plate,
        car_model: trip.car_model,
        company_name: trip.company_name,
        company_name_ar: trip.company_name_ar,
        cr_number: trip.cr_number,
        footer_ar: trip.footer_ar,
        footer_en: trip.footer_en,
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
      .update(id, {
        passengers: merged.passengers,
        photo_urls: merged.photo_urls
      })
      .catch(() => {});
    toast({ title: `Extracted ${passengers.length} passengers` });
  };

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading trip…
      </div>
    );
  }

  const destination = `${(trip.route_from || "").toUpperCase()} TO ${(
    trip.route_to || ""
  ).toUpperCase()}`;

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
            <Button onClick={() => navigate(`/trips/${id}/document`)}>
              <FileText className="w-4 h-4" /> Open Document
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Trip Name</Label>
            <Input
              value={trip.trip_name || ""}
              onChange={(e) =>
                setTrip({ ...trip, trip_name: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Second Party Name</Label>
            <Input
              value={trip.second_party_name || ""}
              onChange={(e) =>
                setTrip({ ...trip, second_party_name: e.target.value })
              }
            />
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
          <div className="space-y-1.5">
            <Label>Trip Time</Label>
            <Input
              placeholder="e.g. 7:05 PM"
              value={trip.trip_time || ""}
              onChange={(e) =>
                setTrip({ ...trip, trip_time: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Route From</Label>
            <Select
              value={trip.route_from}
              onValueChange={(v) => setTrip({ ...trip, route_from: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Madina">Madina</SelectItem>
                <SelectItem value="Makkah">Makkah</SelectItem>
                <SelectItem value="Riyadh">Riyadh</SelectItem>
                <SelectItem value="Dammam">Dammam</SelectItem>
                <SelectItem value="Jeddah">Jeddah</SelectItem>
                <SelectItem value="Zalim">Zalim</SelectItem>
                <SelectItem value="Tayab">Tayab</SelectItem>
                <SelectItem value="Al_Qasim">Al Qasim</SelectItem>
                <SelectItem value="Ramazia">Ramazia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Route To</Label>
            <Select
              value={trip.route_to}
              onValueChange={(v) => setTrip({ ...trip, route_to: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Madina">Madina</SelectItem>
                <SelectItem value="Makkah">Makkah</SelectItem>
                <SelectItem value="Riyadh">Riyadh</SelectItem>
                <SelectItem value="Dammam">Dammam</SelectItem>
                <SelectItem value="Jeddah">Jeddah</SelectItem>
                <SelectItem value="Zalim">Zalim</SelectItem>
                <SelectItem value="Tayab">Tayab</SelectItem>
                <SelectItem value="Al_Qasim">Al Qasim</SelectItem>
                <SelectItem value="Ramazia">Ramazia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Drivers</Label>
            <DriversEditor
              drivers={trip.drivers || []}
              onChange={(drivers) => setTrip({ ...trip, drivers })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Plate No.</Label>
              <Input
                value={trip.vehicle_plate || ""}
                onChange={(e) =>
                  setTrip({ ...trip, vehicle_plate: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Car Model</Label>
              <Input
                value={trip.car_model || ""}
                onChange={(e) =>
                  setTrip({ ...trip, car_model: e.target.value })
                }
              />
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Passengers
            </h2>
            <PhotoUploader onExtracted={onExtracted} />
          </div>
          <PassengerTable
            passengers={trip.passengers || []}
            onChange={(passengers) => setTrip({ ...trip, passengers })}
            destination={destination}
            date={trip.travel_date || ""}
          />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Template & Company Assets
          </h2>
          <TemplatePanel trip={trip} setTrip={setTrip} />
        </section>
      </main>
    </div>
  );
}