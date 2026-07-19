import { uploadImageBuffer, processPassengerPhoto, createTripFromTemplate } from "./tripUtils.ts";

export async function handleTextUpdate(base44, sessionEntityName, session, text, sendMessage, appUrl) {
  const lowerText = text.toLowerCase().trim();

  if (lowerText === "cancel" || lowerText === "الغاء" || lowerText === "إلغاء") {
    await resetSession(base44, sessionEntityName, session);
    await sendMessage('❌ Trip cancelled. Send "start" to begin a new trip.');
    return;
  }

  if (session.state === "idle" || session.state === "done" ||
      lowerText === "start" || lowerText === "new" || lowerText === "جديد" || lowerText === "ابدأ") {
    await startCollecting(base44, sessionEntityName, session, sendMessage);
  } else if (session.state === "collecting") {
    if (lowerText === "done" || lowerText === "finish" || lowerText === "تم" || lowerText === "انتهيت" || lowerText === "انهيت") {
      await askRoute(base44, sessionEntityName, session, sendMessage);
    } else {
      await sendMessage('📸 Please send photos of passenger IDs, or reply "done" when finished.');
    }
  } else if (session.state === "awaiting_route") {
    await handleRouteSelection(base44, sessionEntityName, session, lowerText, sendMessage);
  } else if (session.state === "awaiting_datetime") {
    await handleDateTime(base44, sessionEntityName, session, text.trim(), sendMessage, appUrl);
  }
}

export async function handlePhotoUpdate(base44, sessionEntityName, session, photoDownloader, sendMessage) {
  if (session.state === "collecting") {
    await processPhoto(base44, sessionEntityName, session, photoDownloader, sendMessage);
  } else if (session.state === "awaiting_route") {
    await sendMessage("Please reply with 1 or 2 for the route first.");
  } else if (session.state === "awaiting_datetime") {
    await sendMessage('Please send the date and time first (e.g. 2024-01-15 7:05 PM).');
  } else {
    await sendMessage('To start a new trip, send "start".');
  }
}

async function resetSession(base44, sessionEntityName, session) {
  await base44.asServiceRole.entities[sessionEntityName].update(session.id, {
    state: "idle",
    passengers: [],
    photo_urls: [],
    route_from: null,
    route_to: null,
    travel_date: null,
    trip_time: null,
    trip_id: null
  });
}

async function startCollecting(base44, sessionEntityName, session, sendMessage) {
  await base44.asServiceRole.entities[sessionEntityName].update(session.id, {
    state: "collecting",
    passengers: [],
    photo_urls: [],
    route_from: null,
    route_to: null,
    travel_date: null,
    trip_time: null,
    trip_id: null
  });
  await sendMessage('📸 Send me photos of each passenger\'s ID (passport/visa/iqama).\n\nI\'ll extract their name, ID number, and nationality.\n\nWhen you\'re done, send "done".');
}

async function processPhoto(base44, sessionEntityName, session, photoDownloader, sendMessage) {
  await sendMessage("⏳ Processing photo...");
  try {
    const { buffer, filename } = await photoDownloader();
    const fileUrl = await uploadImageBuffer(base44, buffer, filename);
    const passenger = await processPassengerPhoto(base44, fileUrl);

    const updatedPassengers = [...(session.passengers || []), passenger];
    const updatedPhotos = [...(session.photo_urls || []), fileUrl];

    await base44.asServiceRole.entities[sessionEntityName].update(session.id, {
      passengers: updatedPassengers,
      photo_urls: updatedPhotos
    });

    await sendMessage(`✅ Passenger ${updatedPassengers.length} added:\nName: ${passenger.name}\nID: ${passenger.id_number}\nNationality: ${passenger.nationality}\n\nSend the next photo or reply "done".`);
  } catch (e) {
    await sendMessage(`⚠️ Could not process this photo: ${e.message}\n\nPlease try sending it again.`);
  }
}

async function askRoute(base44, sessionEntityName, session, sendMessage) {
  if (!session.passengers || session.passengers.length === 0) {
    await sendMessage('⚠️ No passengers collected yet. Please send at least one photo, then reply "done".');
    return;
  }
  await base44.asServiceRole.entities[sessionEntityName].update(session.id, {
    state: "awaiting_route"
  });
  await sendMessage("🛣️ What is the route?\n1. Madinah → Makkah\n2. Makkah → Madinah\n\nReply with 1 or 2.");
}

async function handleRouteSelection(base44, sessionEntityName, session, text, sendMessage) {
  let routeFrom, routeTo;
  if (text === "1") {
    routeFrom = "Madina";
    routeTo = "Makkah";
  } else if (text === "2") {
    routeFrom = "Makkah";
    routeTo = "Madina";
  } else {
    await sendMessage("Please reply with 1 or 2.");
    return;
  }
  await base44.asServiceRole.entities[sessionEntityName].update(session.id, {
    state: "awaiting_datetime",
    route_from: routeFrom,
    route_to: routeTo
  });
  await sendMessage(`✅ Route: ${routeFrom} → ${routeTo}\n\n📅 What is the travel date and time?\n\nPlease send like: 2024-01-15 7:05 PM`);
}

async function handleDateTime(base44, sessionEntityName, session, rawText, sendMessage, appUrl) {
  const text = rawText.trim();
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/);

  if (!dateMatch) {
    await sendMessage('⚠️ Could not read the date. Please send like: 2024-01-15 7:05 PM');
    return;
  }

  const travelDate = dateMatch[1];
  const tripTime = timeMatch ? timeMatch[1].trim() : "";

  await base44.asServiceRole.entities[sessionEntityName].update(session.id, {
    travel_date: travelDate,
    trip_time: tripTime
  });

  const updatedSession = { ...session, travel_date: travelDate, trip_time: tripTime };
  await finalizeTrip(base44, sessionEntityName, updatedSession, sendMessage, appUrl);
}

async function finalizeTrip(base44, sessionEntityName, session, sendMessage, appUrl) {
  const result = await createTripFromTemplate(base44, session);
  if (!result) {
    await sendMessage("⚠️ No company template configured. Please add one in the app Settings page first.");
    return;
  }

  const { trip, company } = result;
  const docUrl = `${appUrl || ""}/trips/${trip.id}/document`;

  await sendMessage(`✅ Trip manifest created!\n\n📊 Passengers: ${session.passengers.length}\n🛣️ Route: ${session.route_from} → ${session.route_to}\n📅 Date: ${session.travel_date}${session.trip_time ? " " + session.trip_time : ""}\n🏢 ${company.name_ar}\n\n📄 View & download your document:\n${docUrl}\n\nTo start a new trip, send "start".`);

  await base44.asServiceRole.entities[sessionEntityName].update(session.id, {
    state: "done",
    trip_id: trip.id
  });
}