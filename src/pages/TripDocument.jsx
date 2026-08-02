import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileText, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { downloadWord } from "@/lib/wordExport.jsx";
import { generateManifest } from "@/functions/generateManifest";
import { base44 as base44Client } from "@/api/base44Client";

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

  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await base44Client.functions.fetch(
        `/manifestPdf?trip_id=${id}`
      );
      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(trip?.trip_name || "manifest").replace(/[^\w\- ]+/g, "").slice(0, 60) || "manifest"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "Could not generate PDF", variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    }
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
            <Button onClick={handleDownloadPdf} disabled={pdfLoading}>
              <Download className="w-4 h-4" />{" "}
              {pdfLoading ? "Generating…" : "Download PDF"}
            </Button>
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