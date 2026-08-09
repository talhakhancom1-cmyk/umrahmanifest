import React from "react";
import { base44 } from "@/api/base44Client";
import { Bot, ExternalLink } from "lucide-react";

export default function AgentConnect() {
  const url = base44.agents.getWhatsAppConnectURL("manifest_agent");

  return (
    <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground space-y-3">
      <div className="flex items-start gap-2">
        <Bot className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <div>
          <span className="font-medium text-foreground">AI manifest agent:</span> chat naturally on
          WhatsApp — send passenger ID photos, answer its questions about route/date/driver, and it
          creates the trip manifest for you.
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
      >
        Connect on WhatsApp <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}