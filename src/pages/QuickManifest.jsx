import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, FileText, Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PhotoUploader from "@/components/trips/PhotoUploader";
import PassengerTable from "@/components/trips/PassengerTable";
import WardaExtraFields from "@/components/quick/WardaExtraFields";
import PlaceSelect from "@/components/quick/PlaceSelect";

const isWarda = (company) => /warda/i.test(company?.name || "");

export default function QuickManifest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [routeFrom, setRouteFrom] = useState("Madina");
  const [routeTo, setRouteTo] = useState("Makkah");
  const [travelDate, setTravelDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [tripTime, setTripTime] = useState("");
  const [passengers, setPassengers] = useState([]);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [creating, setCreating] = useState(false);
  const [warda, setWarda] = useState({ driverPhone: "", tripNumber: "", notes: "" });

  const selectedCompany = companies.find((c) => c.id === companyId);

  useEffect(() => {
    const d = drivers.find((x) => x.id === driverId);
    if (d) setWarda((w) => ({ ...w, driverPhone: d.phone || "" }));
  }, [driverId]);

  useEffect(() => {
    base44.entities.CompanyTemplate.filter({ is_active: true })
      .then((list) => {
        setCompanies(list);
        if (list[0]) setCompanyId(list[0].id);
      })
      .catch(() => toast({ title: "Failed to load companies", variant: "destructive" }));
    base44.entities.Driver.filter({ is_active: true })
      .then((list) => setDrivers(list))
      .catch(() => toast({ title: "Failed to load drivers", variant: "destructive" }));
  }, []);

  const onExtracted = (newPassengers, newPhotoUrls) => {
    setPassengers((prev) => [...prev, ...newPassengers]);
    setPhotoUrls((prev) => [...prev, ...newPhotoUrls]);
    toast({ title: `Extracted ${newPassengers.length} passengers` });
  };

  const generate = async () => {
    const company = companies.find((c) => c.id === companyId);
    const driver = drivers.find((d) => d.id === driverId);
    if (!company) {
      toast({ title: "Select a company", variant: "destructive" });
      return;
    }
    if (!driver) {
      toast({ title: "Select a driver", variant: "destructive" });
      return;
    }
    if (!passengers.length) {
      toast({ title: "Upload passenger photos first", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const wardaSel = isWarda(company);
      const driversArr = [
        {
          name: driver.name,
          iqama_no: driver.iqama_no || "",
          phone: wardaSel ? warda.driverPhone : driver.phone || ""
        }
      ];
      if (driver.name2)
        driversArr.push({ name: driver.name2, iqama_no: driver.iqama_no2 || "" });
      const created = await base44.entities.Trip.create({
        trip_name: `${company.name} - ${routeFrom} to ${routeTo} - ${travelDate}`,
        route_from: routeFrom,
        route_to: routeTo,
        travel_date: travelDate,
        trip_time: tripTime,
        trip_number: wardaSel ? warda.tripNumber : "",
        notes: wardaSel ? warda.notes : "",
        second_party_name: "",
        drivers: driversArr,
        vehicle_plate: driver.vehicle_plate || "",
        car_model: driver.car_model || "",
        company_name: company.name,
        company_name_ar: company.name_ar,
        cr_number: company.cr_number || "",
        logo_url: company.logo_url || "",
        stamp_url: company.stamp_url || "",
        qr_url: company.qr_url || "",
        footer_ar: company.footer_ar || "",
        footer_en: company.footer_en || "",
        template_url: company.template_url || "",
        passengers,
        photo_urls: photoUrls,
        status: "completed"
      });
      navigate(`/trips/${created.id}/document`);
    } catch (e) {
      toast({ title: "Could not create manifest", variant: "destructive" });
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Quick Manifest</h1>
              <p className="text-sm text-muted-foreground">
                Upload photos, pick company &amp; driver — get a ready manifest.
              </p>
            </div>
          </div>
          <Button onClick={generate} disabled={creating}>
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}{" "}
            Make Manifest
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Select driver">
                  {drivers.find((d) => d.id === driverId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id} textValue={d.name}>
                    <div className="flex flex-col items-start gap-0.5">
                      <span>{d.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[d.car_model, d.vehicle_plate, d.name2 ? `with ${d.name2}` : ""]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Route From</Label>
            <PlaceSelect value={routeFrom} onChange={setRouteFrom} />
          </div>
          <div className="space-y-1.5">
            <Label>Route To</Label>
            <PlaceSelect value={routeTo} onChange={setRouteTo} />
          </div>
          <div className="space-y-1.5">
            <Label>Travel Date</Label>
            <Input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Trip Time</Label>
            <Input
              placeholder="e.g. 7:05 PM"
              value={tripTime}
              onChange={(e) => setTripTime(e.target.value)}
            />
          </div>
        </section>

        {isWarda(selectedCompany) && (
          <WardaExtraFields values={warda} onChange={setWarda} />
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Passengers ({passengers.length})
            </h2>
            <PhotoUploader onExtracted={onExtracted} />
          </div>
          <PassengerTable
            passengers={passengers}
            onChange={setPassengers}
            destination={`${routeFrom.toUpperCase()} TO ${routeTo.toUpperCase()}`}
            date={travelDate}
          />
        </section>

        <div className="flex justify-end">
          <Button onClick={generate} disabled={creating}>
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}{" "}
            Make Manifest
          </Button>
        </div>
      </main>
    </div>
  );
}