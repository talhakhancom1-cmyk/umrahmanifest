import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ManifestDocument from "@/components/document/ManifestDocument";
import { downloadWord } from "@/lib/wordExport.jsx";

export default function TripDocument() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    base44.entities.Trip.get(id)
      .then(setTrip)
      .catch(() => {
        toast({ title: "Trip not found", variant: "destructive" });
        navigate("/");
      });
  }, [id]);

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="no-print sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(`/trips/${id}`)}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadWord(trip)}>
              <FileText className="w-4 h-4" /> Word
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Print / Save PDF
            </Button>
          </div>
        </div>
      </div>
      <div className="py-6">
        <ManifestDocument trip={trip} />
      </div>
    </div>
  );
}