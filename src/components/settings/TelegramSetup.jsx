import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { telegramSetup } from "@/functions/telegramSetup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Send, CheckCircle2, Loader2 } from "lucide-react";

export default function TelegramSetup() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.entities.WhatsAppSetting.list().then((settings) => {
      if (settings[0]?.telegram_bot_token) setToken(settings[0].telegram_bot_token);
    });
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await telegramSetup({ bot_token: token.trim() });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || "Connection failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tg-token">Telegram Bot Token</Label>
          <Input
            id="tg-token"
            placeholder="123456789:ABC-DEF..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Open Telegram, message @BotFather, send /newbot, and paste the token here.
          </p>
        </div>
        <Button onClick={handleConnect} disabled={loading || !token.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Connect Bot
        </Button>
        {result && (
          <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              Bot <strong>@{result.bot_username}</strong> is connected! Open it in Telegram and send
              "start" to begin creating a trip.
            </div>
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}