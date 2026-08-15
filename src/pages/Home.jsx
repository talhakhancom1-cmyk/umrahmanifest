import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2, ArrowRight, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const routeLabel = (t) => {
  const a = (t.route_from || "").toUpperCase();
  const b = (t.route_to || "").toUpperCase();
  return a && b ? `${a} → ${b}` : "—";
};

export default function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Trip.list("-created_date", 50);
      setTrips(data);
    } catch (e) {
      toast({ title: "Failed to load trips", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const newTrip = async () => {
    try {
      let prefill = {};
      if (trips.length) {
        const latest = trips[0];
        [
          "company_name",
          "company_name_ar",
          "logo_url",
          "stamp_url",
          "qr_url",
          "vehicle_plate",
          "car_model",
          "drivers",
          "second_party_name",
          "template_url"
        ].forEach((k) => {
          prefill[k] = latest[k];
        });
      }
      const created = await base44.entities.Trip.create({
        trip_name: `Trip ${new Date().toLocaleDateString()}`,
        route_from: "Madina",
        route_to: "Makkah",
        travel_date: new Date().toISOString().slice(0, 10),
        trip_time: "",
        second_party_name: "",
        drivers: [],
        vehicle_plate: "",
        car_model: "",
        passengers: [],
        photo_urls: [],
        status: "draft",
        ...prefill
      });
      navigate(`/trips/${created.id}`);
    } catch (e) {
      toast({ title: "Could not create trip", variant: "destructive" });
    }
  };

  const remove = async (id) => {
    await base44.entities.Trip.delete(id);
    setTrips(trips.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Umrah Transport Manifests
            </h1>
            <p className="text-sm text-muted-foreground">
              Batch-extract passenger photos into ready-to-send manifests.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/settings")}>
              <SettingsIcon className="w-4 h-4" /> Settings
            </Button>
            <Button onClick={newTrip}>
              <Plus className="w-4 h-4" /> New Trip
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-muted-foreground">Loading trips…</div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">
              No trips yet. Create your first trip to start.
            </p>
            <Button onClick={newTrip}>
              <Plus className="w-4 h-4" /> New Trip
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {trips.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border border-border rounded-lg p-4 bg-card hover:shadow-sm transition"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.trip_name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{routeLabel(t)}</span>
                    <span>·</span>
                    <span>{t.travel_date}</span>
                    <span>·</span>
                    <span>{(t.passengers || []).length} passengers</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/trips/${t.id}`)}
                  >
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(t.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}