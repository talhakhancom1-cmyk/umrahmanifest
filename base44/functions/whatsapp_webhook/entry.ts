import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { sendWhatsAppMessage, getMediaUrl, downloadMedia } from "./util.ts";
import { handleTextUpdate, handlePhotoUpdate } from "../../shared/conversationFlow.ts";

Deno.serve(async (req) => {
  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token) {
        const base44 = createClientFromRequest(req);
        const settings = await base44.asServiceRole.entities.WhatsAppSetting.filter({});
        const setting = settings[0];
        if (setting && setting.verify_token === token) {
          return new Response(challenge, { status: 200 });
        }
      }
      return new Response("Forbidden", { status: 403 });
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const settings = await base44.asServiceRole.entities.WhatsAppSetting.filter({});
    const setting = settings[0];
    if (!setting) return Response.json({ status: "no_settings" });

    const { access_token, phone_number_id, app_url } = setting;

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return Response.json({ status: "ok" });
    }

    const message = messages[0];
    const from = message.from;
    const type = message.type;

    let sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({ phone_number: from });
    let session = sessions[0];
    if (!session) {
      session = await base44.asServiceRole.entities.WhatsAppSession.create({
        phone_number: from,
        state: "idle",
        passengers: [],
        photo_urls: []
      });
    }

    const appId = new URL(req.url).pathname.match(/\/api\/apps\/([^/]+)\/functions/)?.[1] || "";

    const sendMessage = (text) => sendWhatsAppMessage(phone_number_id, access_token, from, text);

    if (type === "text") {
      await handleTextUpdate(base44, "WhatsAppSession", session, message.text.body, sendMessage, app_url, appId);
    } else if (type === "image") {
      const mediaId = message.image.id;
      const photoDownloader = async () => {
        const mediaUrl = await getMediaUrl(access_token, mediaId);
        const buffer = await downloadMedia(mediaUrl, access_token);
        return { buffer, filename: `wa_${mediaId}.jpg` };
      };
      await handlePhotoUpdate(base44, "WhatsAppSession", session, photoDownloader, sendMessage);
    }

    return Response.json({ status: "ok" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});