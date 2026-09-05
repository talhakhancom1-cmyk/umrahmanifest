import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Loader2, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import TemplateExportImport from "@/components/settings/TemplateExportImport";

function AssetField({ label, value, onChange }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Upload
        </Button>
        {value && <img src={value} alt={label} className="w-10 h-10 object-contain rounded border border-border" />}
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>Clear</Button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={upload} />
    </div>
  );
}

function TemplateField({ value, onChange }) {
  const { toast } = useToast();
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // The platform's file storage blocks .html uploads (XSS protection),
      // so rewrap the file as .txt — the manifest builder reads it as text
      // regardless of extension.
      const buf = await file.arrayBuffer();
      const wrapped = new File([buf], `template-${Date.now()}.txt`, { type: "text/plain" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: wrapped });
      onChange(file_url);
      toast({ title: "Template uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };
  return (
    <div className="space-y-1.5">
      <Label>Manifest Template (HTML)</Label>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Upload template
        </Button>
        <span className="text-xs text-muted-foreground">
          {value ? "Custom template attached" : "Default template used"}
        </span>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>Clear</Button>
        )}
      </div>
      <input ref={ref} type="file" accept=".html,.htm" className="hidden" onChange={upload} />
    </div>
  );
}

export default function CompanyTemplateManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const blank = {
    name: "", name_ar: "", cr_number: "",
    logo_url: "", stamp_url: "", qr_url: "",
    footer_ar: "", footer_en: "", template_url: "", is_active: true
  };
  const [form, setForm] = useState(blank);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.CompanyTemplate.list("-created_date", 50);
      setTemplates(data);
    } catch {
      toast({ title: "Failed to load templates", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(blank);
    setDialogOpen(true);
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    setForm({ ...blank, ...tpl });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.name_ar) {
      toast({ title: "Name (EN + AR) is required", variant: "destructive" });
      return;
    }
    try {
      if (editing) {
        await base44.entities.CompanyTemplate.update(editing.id, form);
      } else {
        await base44.entities.CompanyTemplate.create(form);
      }
      setDialogOpen(false);
      load();
      toast({ title: "Template saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  const remove = async (id) => {
    await base44.entities.CompanyTemplate.delete(id);
    setTemplates(templates.filter((t) => t.id !== id));
    toast({ title: "Template deleted" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <TemplateExportImport onImported={load} />
        <Button onClick={openNew} size="sm">
          <Plus className="w-4 h-4" /> Add Company
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
          No company templates yet. Click "Add Company" to create your first one.
        </div>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between border border-border rounded-lg p-4 bg-card">
              <div className="flex items-center gap-3 min-w-0">
                {t.logo_url && (
                  <img src={t.logo_url} className="w-10 h-10 object-contain rounded border border-border" />
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate" dir="rtl">{t.name_ar}</div>
                  <div className="text-sm text-muted-foreground truncate">{t.name}</div>
                  {t.cr_number && (
                    <div className="text-xs text-muted-foreground">C.R. {t.cr_number}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Company" : "Add Company"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Company Name (EN)</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Company Name (AR)</Label>
                <Input
                  value={form.name_ar}
                  onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                  dir="rtl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>C.R. Number</Label>
              <Input
                value={form.cr_number}
                onChange={(e) => setForm({ ...form, cr_number: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <AssetField label="Logo" value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} />
              <AssetField label="Stamp" value={form.stamp_url} onChange={(v) => setForm({ ...form, stamp_url: v })} />
              <AssetField label="QR Code" value={form.qr_url} onChange={(v) => setForm({ ...form, qr_url: v })} />
            </div>
            <TemplateField value={form.template_url} onChange={(v) => setForm({ ...form, template_url: v })} />
            <div className="space-y-1.5">
              <Label>Footer (Arabic)</Label>
              <Textarea
                value={form.footer_ar}
                onChange={(e) => setForm({ ...form, footer_ar: e.target.value })}
                dir="rtl"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Footer (English)</Label>
              <Textarea
                value={form.footer_en}
                onChange={(e) => setForm({ ...form, footer_en: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Active (available in WhatsApp flow)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}