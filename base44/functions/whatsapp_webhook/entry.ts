import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import {
  sendWhatsAppMessage,
  getMediaUrl,
  downloadMedia,
  OCR_PROMPT,
  OCR_SCHEMA
} from "./util.ts";

Deno.serve(async (req) => {
  try {
    // GET — webhook verification
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

    // Status update (delivery/read) — ack only
    if (!messages || messages.length === 0) {
      return Response.json({ status: "ok" });
    }

    const message = messages[0];
    const from = message.from;
    const type = message.type;

    // Get or create session
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

    if (type === "text") {
      const text = message.text.body.toLowerCase().trim();

      // Cancel resets everything
      if (text === "cancel" || text === "الغاء" || text === "إلغاء") {
        await base44.asServiceRole.entities.WhatsAppSession.update(session.id, {
          state: "idle",
          passengers: [],
          photo_urls: [],
          route_from: null,
          route_to: null,
          travel_date: null,
          trip_time: null,
          trip_id: null
        });
        await sendWhatsAppMessage(phone_number_id, access_token, from,
          "❌ Trip cancelled. Send \"start\" to begin a new trip.");
        return Response.json({ status: "ok" });
      }

      if (session.state === "idle" || session.state === "done" ||
          text === "start" || text === "new" || text === "جديد" || text === "ابدأ") {
        await startCollecting(base44, session, phone_number_id, access_token, from);
      } else if (session.state === "collecting") {
        if (text === "done" || text === "finish" || text === "تم" || text === "انتهيت" || text === "انهيت") {
          await askRoute(base44, session, phone_number_id, access_token, from);
        } else {
          await sendWhatsAppMessage(phone_number_id, access_token, from,
            '📸 Please send photos of passenger IDs, or reply "done" when finished.');
        }
      } else if (session.state === "awaiting_route") {
        await handleRouteSelection(base44, session, text, phone_number_id, access_token, from);
      } else if (session.state === "awaiting_datetime") {
        await handleDateTime(base44, session, message.text.body.trim(), phone_number_id, access_token, from, app_url);
      }
    } else if (type === "image") {
      if (session.state === "collecting") {
        await processPhoto(base44, session, message, phone_number_id, access_token, from);
      } else if (session.state === "awaiting_route") {
        await sendWhatsAppMessage(phone_number_id, access_token, from,
          "Please reply with 1 or 2 for the route first.");
      } else if (session.state === "awaiting_datetime") {
        await sendWhatsAppMessage(phone_number_id, access_token, from,
          'Please send the date and time first (e.g. 2024-01-15 7:05 PM).');
      } else {
        await sendWhatsAppMessage(phone_number_id, access_token, from,
          'To start a new trip, send "start".');
      }
    }

    return Response.json({ status: "ok" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function startCollecting(base44, session, phoneNumberId, token, from) {
  await base44.asServiceRole.entities.WhatsAppSession.update(session.id, {
    state: "collecting",
    passengers: [],
    photo_urls: [],
    route_from: null,
    route_to: null,
    travel_date: null,
    trip_time: null,
    trip_id: null
  });
  await sendWhatsAppMessage(phoneNumberId, token, from,
    '📸 Send me photos of each passenger\'s ID (passport/visa/iqama).\n\nI\'ll extract their name, ID number, and nationality.\n\nWhen you\'re done, send "done".');
}

async function processPhoto(base44, session, message, phoneNumberId, token, from) {
  const mediaId = message.image.id;
  await sendWhatsAppMessage(phoneNumberId, token, from, "⏳ Processing photo...");

  try {
    const mediaUrl = await getMediaUrl(token, mediaId);
    const imageBuffer = await downloadMedia(mediaUrl, token);

    const file = new File([imageBuffer], `wa_${mediaId}.jpg`, { type: "image/jpeg" });
    const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    const fileUrl = uploadRes.file_url;

    const ocrRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: OCR_PROMPT,
      file_urls: [fileUrl],
      response_json_schema: OCR_SCHEMA
    });

    const passenger = {
      name: ocrRes.full_name || "",
      id_number: ocrRes.id_number || "",
      nationality: ocrRes.nationality || ""
    };

    const updatedPassengers = [...(session.passengers || []), passenger];
    const updatedPhotos = [...(session.photo_urls || []), fileUrl];

    await base44.asServiceRole.entities.WhatsAppSession.update(session.id, {
      passengers: updatedPassengers,
      photo_urls: updatedPhotos
    });

    await sendWhatsAppMessage(phoneNumberId, token, from,
      `✅ Passenger ${updatedPassengers.length} added:\nName: ${passenger.name}\nID: ${passenger.id_number}\nNationality: ${passenger.nationality}\n\nSend the next photo or reply "done".`);
  } catch (e) {
    await sendWhatsAppMessage(phoneNumberId, token, from,
      `⚠️ Could not process this photo: ${e.message}\n\nPlease try sending it again.`);
  }
}

async function askRoute(base44, session, phoneNumberId, token, from) {
  if (!session.passengers || session.passengers.length === 0) {
    await sendWhatsAppMessage(phoneNumberId, token, from,
      '⚠️ No passengers collected yet. Please send at least one photo, then reply "done".');
    return;
  }
  await base44.asServiceRole.entities.WhatsAppSession.update(session.id, {
    state: "awaiting_route"
  });
  await sendWhatsAppMessage(phoneNumberId, token, from,
    "🛣️ What is the route?\n1. Madinah → Makkah\n2. Makkah → Madinah\n\nReply with 1 or 2.");
}

async function handleRouteSelection(base44, session, text, phoneNumberId, token, from) {
  let routeFrom, routeTo;
  if (text === "1") {
    routeFrom = "Madina";
    routeTo = "Makkah";
  } else if (text === "2") {
    routeFrom = "Makkah";
    routeTo = "Madina";
  } else {
    await sendWhatsAppMessage(phoneNumberId, token, from, "Please reply with 1 or 2.");
    return;
  }
  await base44.asServiceRole.entities.WhatsAppSession.update(session.id, {
    state: "awaiting_datetime",
    route_from: routeFrom,
    route_to: routeTo
  });
  await sendWhatsAppMessage(phoneNumberId, token, from,
    `✅ Route: ${routeFrom} → ${routeTo}\n\n📅 What is the travel date and time?\n\nPlease send like: 2024-01-15 7:05 PM`);
}

async function handleDateTime(base44, session, rawText, phoneNumberId, token, from, appUrl) {
  const text = rawText.trim();
  // Try to extract date (YYYY-MM-DD)
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  // Try to extract time (e.g. 7:05 PM, 19:05, 7:05)
  const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/);

  if (!dateMatch) {
    await sendWhatsAppMessage(phoneNumberId, token, from,
      '⚠️ Could not read the date. Please send like: 2024-01-15 7:05 PM');
    return;
  }

  const travelDate = dateMatch[1];
  const tripTime = timeMatch ? timeMatch[1].trim() : "";

  await generateTrip(base44, session, travelDate, tripTime, phoneNumberId, token, from, appUrl);
}

async function generateTrip(base44, session, travelDate, tripTime, phoneNumberId, token, from, appUrl) {
  // Get the MSC company template (first active one)
  const companies = await base44.asServiceRole.entities.CompanyTemplate.filter({ is_active: true });
  const company = companies[0];
  if (!company) {
    await sendWhatsAppMessage(phoneNumberId, token, from,
      "⚠️ No company template configured. Please add one in the app Settings page first.");
    return;
  }

  const trip = await base44.asServiceRole.entities.Trip.create({
    trip_name: `${company.name} - ${session.route_from} to ${session.route_to} - ${travelDate}`,
    route_from: session.route_from,
    route_to: session.route_to,
    travel_date: travelDate,
    trip_time: tripTime,
    second_party_name: "",
    drivers: [],
    vehicle_plate: "",
    car_model: "",
    company_name: company.name,
    company_name_ar: company.name_ar,
    cr_number: company.cr_number || "",
    logo_url: company.logo_url || "",
    stamp_url: company.stamp_url || "",
    qr_url: company.qr_url || "",
    footer_ar: company.footer_ar || "",
    footer_en: company.footer_en || "",
    passengers: session.passengers,
    photo_urls: session.photo_urls,
    status: "completed"
  });

  const docUrl = `${appUrl || ""}/trips/${trip.id}/document`;

  await sendWhatsAppMessage(phoneNumberId, token, from,
    `✅ Trip manifest created!\n\n📊 Passengers: ${session.passengers.length}\n🛣️ Route: ${session.route_from} → ${session.route_to}\n📅 Date: ${travelDate}${tripTime ? " " + tripTime : ""}\n🏢 ${company.name_ar}\n\n📄 View & download your document:\n${docUrl}\n\nTo start a new trip, send "start".`);

  await base44.asServiceRole.entities.WhatsAppSession.update(session.id, {
    state: "done",
    trip_id: trip.id,
    travel_date: travelDate,
    trip_time: tripTime
  });
}