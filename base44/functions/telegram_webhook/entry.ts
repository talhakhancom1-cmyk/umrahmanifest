import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { handleTextUpdate, handlePhotoUpdate } from "../../shared/conversationFlow.ts";

const TG_API = "https://api.telegram.org/bot";

async function sendTelegramMessage(token, chatId, text, extra) {
  const body = { chat_id: chatId, text };
  if (extra && extra.markdown) body.parse_mode = "Markdown";
  if (extra && extra.inline) {
    body.reply_markup = {
      inline_keyboard: extra.inline.map((row) =>
        row.map((b) => ({ text: b.text, callback_data: b.data }))
      )
    };
  } else if (extra && extra.keyboard) {
    body.reply_markup = {
      keyboard: extra.keyboard.map((t) => [{ text: t }]),
      one_time_keyboard: true,
      resize_keyboard: true
    };
  } else {
    body.reply_markup = { remove_keyboard: true };
  }
  await fetch(`${TG_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function getTelegramFilePath(token, fileId) {
  const res = await fetch(`${TG_API}${token}/getFile?file_id=${fileId}`);
  const data = await res.json();
  return data.result?.file_path;
}

async function downloadTelegramFile(token, filePath) {
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  return await res.arrayBuffer();
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const settings = await base44.asServiceRole.entities.WhatsAppSetting.filter({});
    const setting = settings[0];
    if (!setting || !setting.telegram_bot_token) {
      return Response.json({ status: "no_settings" });
    }

    const { telegram_bot_token: token, app_url: appUrl } = setting;

    const message = body.message;
    const callback = body.callback_query;
    if (!message && !callback) return Response.json({ status: "ok" });

    const chatId = String((message?.chat || callback.message?.chat)?.id);

    let sessions = await base44.asServiceRole.entities.TelegramSession.filter({ chat_id: chatId });
    let session = sessions[0];
    if (!session) {
      session = await base44.asServiceRole.entities.TelegramSession.create({
        chat_id: chatId,
        state: "idle",
        passengers: [],
        photo_urls: []
      });
    }

    const sendMessage = (text, extra) => sendTelegramMessage(token, chatId, text, extra);

    if (callback) {
      await fetch(`${TG_API}${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callback.id })
      });
      await handleTextUpdate(base44, "TelegramSession", session, String(callback.data || ""), sendMessage, appUrl);
    } else if (message.text) {
      await handleTextUpdate(base44, "TelegramSession", session, message.text, sendMessage, appUrl);
    } else if (message.photo) {
      const photos = message.photo;
      const largest = photos[photos.length - 1];
      const fileId = largest.file_id;
      const photoDownloader = async () => {
        const filePath = await getTelegramFilePath(token, fileId);
        const buffer = await downloadTelegramFile(token, filePath);
        return { buffer, filename: `tg_${fileId}.jpg` };
      };
      await handlePhotoUpdate(base44, "TelegramSession", session, photoDownloader, sendMessage);
    }

    return Response.json({ status: "ok" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});