import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function TemplateExportImport({ onImported }) {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const exportTemplates = async () => {
    setBusy(true);
    try {
      const data = await base44.entities.CompanyTemplate.list("-created_date", 500);
      const payload = data.map((t) => ({
        name: t.name,
        name_ar: t.name_ar,
        cr_number: t.cr_number || "",
        logo_url: t.logo_url || "",
        stamp_url: t.stamp_url || "",
        qr_url: t.qr_url || "",
        footer_ar: t.footer_ar || "",
        footer_en: t.footer_en || "",
        template_url: t.template_url || "",
        is_active: t.is_active !== false
      }));
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `company-templates-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Exported ${payload.length} companies` });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const importTemplates = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming = Array.isArray(parsed) ? parsed : [parsed];
      if (!incoming.length) throw new Error("File contains no templates");
      const existing = await base44.entities.CompanyTemplate.list("-created_date", 500);
      const existingNames = new Set(existing.map((t) => t.name));
      const toCreate = incoming
        .filter((t) => t?.name && t?.name_ar && !existingNames.has(t.name))
        .map((t) => ({
          name: t.name,
          name_ar: t.name_ar,
          cr_number: t.cr_number || "",
          logo_url: t.logo_url || "",
          stamp_url: t.stamp_url || "",
          qr_url: t.qr_url || "",
          footer_ar: t.footer_ar || "",
          footer_en: t.footer_en || "",
          template_url: t.template_url || "",
          is_active: t.is_active !== false
        }));
      if (!toCreate.length) {
        toast({ title: "Nothing new to import (all already exist)" });
      } else {
        await base44.entities.CompanyTemplate.bulkCreate(toCreate);
        toast({ title: `Imported ${toCreate.length} companies` });
        onImported?.();
      }
    } catch (err) {
      toast({
        title: "Import failed",
        description: String(err?.message || "Invalid file"),
        variant: "destructive"
      });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={importTemplates}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={exportTemplates}
        disabled={busy}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}{" "}
        Export
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
      >
        <Upload className="w-4 h-4" /> Import
      </Button>
    </div>
  );
}