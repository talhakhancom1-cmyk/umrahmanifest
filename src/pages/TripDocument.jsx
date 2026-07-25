import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { downloadWord } from "@/lib/wordExport.jsx";
import { generateManifest } from "@/functions/generateManifest";
import { appParams } from "@/lib/app-params";

export default function TripDocument() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trip, setTrip] = useState(null);
  const [html, setHtml] = useState(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    base44.entities.Trip.get(id)
      .then(setTrip)
      .catch(() => {
        toast({ title: "Trip not found", variant: "destructive" });
        navigate("/");
      });
    generateManifest({ trip_id: id })
      .then((res) => setHtml(res.data.html))
      .catch(() => {
        toast({ title: "Could not generate document", variant: "destructive" });
      });
  }, [id]);

  const handlePrint = () => {
    // Server-generated PDF keeps the exact 3-page layout (browser print
    // mangles the template's fixed-pixel pages).
    window.open(`https://base44.app/api/apps/${appParams.appId}/functions/manifestPdf?trip_id=${id}`, "_blank");
  };

  if (!html) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Generating document…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="no-print sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(`/trips/${id}`)}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex gap-2">
            {trip && (
              <Button variant="outline" onClick={() => downloadWord(trip)}>
                <FileText className="w-4 h-4" /> Word
              </Button>
            )}
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Print / Save PDF
            </Button>
          </div>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        title="Trip Document"
        srcDoc={html}
        className="flex-1 w-full border-0"
        style={{ minHeight: "calc(100vh - 61px)" }}
      />
    </div>
  );
}