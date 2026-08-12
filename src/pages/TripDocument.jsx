import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileText, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { downloadWord } from "@/lib/wordExport.jsx";
import { appParams } from "@/lib/app-params";

// Public manifest endpoints (service-role, no auth) — direct API path works
// on any domain/device.
const fnUrl = (name, id) =>
  `/api/apps/${appParams.appId}/functions/${name}?trip_id=${id}&t=${Date.now()}`;

export default function TripDocument() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trip, setTrip] = useState(null);
  const [html, setHtml] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const iframeRef = useRef(null);

  // Load the manifest via the public manifestView function (service-role,
  // no auth required) through the SDK so it resolves the correct domain.
  useEffect(() => {
    base44.functions
      .invoke("manifestView", { trip_id: id })
      .then((res) => setHtml(typeof res.data === "string" ? res.data : String(res.data)))
      .catch(() => {
        toast({ title: "Could not generate document", variant: "destructive" });
      });
  }, [id]);

  // Trip metadata is best-effort (used for the Word button + filename only).
  // The document itself is loaded via the public manifestView endpoint, so a
  // missing/failed trip fetch no longer blocks rendering.
  useEffect(() => {
    base44.entities.Trip.get(id)
      .then(setTrip)
      .catch(() => setTrip(null));
  }, [id]);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(fnUrl("manifestPdf", id));
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
        srcDoc={html || "<html><body style='font-family:sans-serif;color:#888;display:flex;align-items:center;justify-content:center;height:100vh'>Generating document…</body></html>"}
        className="flex-1 w-full border-0"
        style={{ minHeight: "calc(100vh - 61px)" }}
      />
    </div>
  );
}