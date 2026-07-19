import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, Building2, Send } from "lucide-react";
import WhatsAppCredentials from "@/components/settings/WhatsAppCredentials";
import CompanyTemplateManager from "@/components/settings/CompanyTemplateManager";

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">WhatsApp & Telegram Credentials</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Enter your WhatsApp Business API credentials and Telegram bot token (from BotFather).
            Both webhook functions use these to receive messages and send replies in the same
            conversational flow.
          </p>
          <WhatsAppCredentials />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Company Templates</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            The active template fills the document header, footer, logo, stamp, and QR code
            for every trip created via WhatsApp or Telegram.
          </p>
          <CompanyTemplateManager />
        </section>
      </main>
    </div>
  );
}