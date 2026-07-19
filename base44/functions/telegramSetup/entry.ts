import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const { bot_token } = await req.json();
    if (!bot_token || !bot_token.includes(":")) {
      return Response.json({ error: "Please enter a valid bot token from BotFather (looks like 123456:ABC-xyz)." }, { status: 400 });
    }

    // Verify the token with Telegram
    const meRes = await fetch(`https://api.telegram.org/bot${bot_token}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      return Response.json({ error: "Telegram rejected this token. Please check it and try again." }, { status: 400 });
    }
    const botUsername = meData.result.username;

    // Register the webhook
    const appId = Deno.env.get("BASE44_APP_ID");
    const webhookUrl = `https://base44.app/api/apps/${appId}/functions/telegram_webhook`;
    const hookRes = await fetch(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl })
    });
    const hookData = await hookRes.json();
    if (!hookData.ok) {
      return Response.json({ error: `Could not register the webhook: ${hookData.description || "unknown error"}` }, { status: 400 });
    }

    // Save the token in settings
    const settings = await base44.asServiceRole.entities.WhatsAppSetting.filter({});
    if (settings.length) {
      await base44.asServiceRole.entities.WhatsAppSetting.update(settings[0].id, { telegram_bot_token: bot_token });
    } else {
      await base44.asServiceRole.entities.WhatsAppSetting.create({
        phone_number_id: "-",
        access_token: "-",
        verify_token: "-",
        telegram_bot_token: bot_token
      });
    }

    return Response.json({ ok: true, bot_username: botUsername, webhook_url: webhookUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});