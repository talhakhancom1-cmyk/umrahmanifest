import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function WhatsAppCredentials() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    phone_number_id: "",
    access_token: "",
    verify_token: "",
    app_url: ""
  });
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.WhatsAppSetting.filter({})
      .then((records) => {
        if (records[0]) {
          setRecordId(records[0].id);
          setForm({
            phone_number_id: records[0].phone_number_id || "",
            access_token: records[0].access_token || "",
            verify_token: records[0].verify_token || "",
            app_url: records[0].app_url || ""
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (recordId) {
        await base44.entities.WhatsAppSetting.update(recordId, form);
      } else {
        const created = await base44.entities.WhatsAppSetting.create(form);
        setRecordId(created.id);
      }
      toast({ title: "Credentials saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Phone Number ID</Label>
          <Input
            value={form.phone_number_id}
            onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
            placeholder="e.g. 107685..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Webhook Verify Token</Label>
          <Input
            value={form.verify_token}
            onChange={(e) => setForm({ ...form, verify_token: e.target.value })}
            placeholder="A custom string you set in Meta's webhook config"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Access Token</Label>
          <Input
            value={form.access_token}
            onChange={(e) => setForm({ ...form, access_token: e.target.value })}
            placeholder="EAAG..."
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>App URL (for document links sent in WhatsApp)</Label>
          <Input
            value={form.app_url}
            onChange={(e) => setForm({ ...form, app_url: e.target.value })}
            placeholder="https://your-app-domain.base44.app"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
          <div>
            <span className="font-medium text-foreground">Webhook setup:</span> After saving, go to your
            Meta WhatsApp Business dashboard → Configuration → Webhook. Find your webhook URL in the
            Base44 dashboard under Code → Functions → <code className="text-xs">whatsapp_webhook</code>.
            Subscribe to the <code className="text-xs">messages</code> field.
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Credentials
      </Button>
    </div>
  );
}