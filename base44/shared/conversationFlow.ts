import { uploadImageBuffer, processPassengerPhoto, createTripFromTemplate } from "./tripUtils.ts";

export async function handleTextUpdate(base44, sessionEntityName, session, text, sendMessage, appUrl, appId, sendDocument) {
  const lowerText = text.toLowerCase().trim();

  if (lowerText === "cancel" || lowerText === "الغاء" || lowerText === "إلغاء") {
    await resetSession(base44, sessionEntityName, session);
    await sendMessage('❌ Trip cancelled. Send "start" to begin a new trip.');
    return;
  }

  if (session.state === "idle" || session.state === "done" ||
      lowerText === "start" || lowerText === "new" || lowerText === "جديد" || lowerText === "ابدأ" || lowerText === "/start") {
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
    await handleDateTime(base44, sessionEntityName, session, text.trim(), sendMessage);
  } else if (session.state === "awaiting_company") {
    await handleCompanySelection(base44, sessionEntityName, session, text.trim(), sendMessage, appId, sendDocument);
  } else if (session.state === "awaiting_driver") {
    await handleDriverSelection(base44, sessionEntityName, session, text.trim(), sendMessage, appId, sendDocument);
  }
}

export async function handlePhotoUpdate(base44, sessionEntityName, session, photoDownloader, sendMessage) {
  if (session.state === "collecting") {
    await processPhoto(base44, sessionEntityName, session, photoDownloader, sendMessage);
  } else if (session.state === "awaiting_route") {
    await sendMessage("Please reply with 1 or 2 for the route first.");
  } else if (session.state === "awaiting_datetime") {
    await sendMessage('Please send the date and time first (e.g. 2024-01-15 7:05 PM).');
  } else if (session.state === "awaiting_company" || session.state === "awaiting_driver") {
    await sendMessage("Please pick an option from the menu first.");
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
    company_menu: [],
    company_id: null,
    driver_menu: [],
    driver: null,
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
    company_menu: [],
    company_id: null,
    driver_menu: [],
    driver: null,
    trip_id: null
  });
  await sendMessage(
    '🕋 *Umrah Transport Manifest Bot*\n' +
    '━━━━━━━━━━━━━━━━━━\n\n' +
    '👋 Welcome! Let\'s create a new trip manifest.\n\n' +
    '*How it works:*\n' +
    '1️⃣ 📸 Send a photo of each passenger\'s ID\n' +
    '      (passport / visa / iqama)\n' +
    '2️⃣ ✅ Send *done* when all passengers are added\n' +
    '3️⃣ 🛣️ Choose the route, date & driver\n' +
    '4️⃣ 📄 Receive your ready-to-print document\n\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    '📸 *Please send the first passenger\'s ID photo now.*\n\n' +
    '_Send "cancel" anytime to start over._',
    { keyboard: ["done", "cancel"], markdown: true }
  );
}

async function processPhoto(base44, sessionEntityName, session, photoDownloader, sendMessage) {
  await sendMessage("⏳ Processing photo...");
  try {
    const { buffer, filename } = await photoDownloader();
    const fileUrl = await uploadImageBuffer(base44, buffer, filename);
    let passenger = await processPassengerPhoto(base44, fileUrl);

    // Retry once if the reading came back blank
    if (!passenger.name && !passenger.id_number) {
      passenger = await processPassengerPhoto(base44, fileUrl);
    }
    if (!passenger.name && !passenger.id_number) {
      await sendMessage("⚠️ I couldn't read any details from this photo. Please send a clearer photo of the ID.");
      return;
    }

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
  const ROUTES = [
    { from: "Madina", to: "Makkah", icon: "🕌 → 🕋" },
    { from: "Makkah", to: "Madina", icon: "🕋 → 🕌" },
    { from: "Riyadh", to: "Makkah", icon: "🏙️ → 🕋" },
    { from: "Riyadh", to: "Madina", icon: "🏙️ → 🕌" },
    { from: "Madina", to: "Riyadh", icon: "🕌 → 🏙️" },
    { from: "Makkah", to: "Riyadh", icon: "🕋 → 🏙️" },
    { from: "Riyadh", to: "Dammam", icon: "🏙️ → 🌊" },
    { from: "Riyadh", to: "Jeddah", icon: "🏙️ → 🌊" },
    { from: "Riyadh", to: "Al_Qasim", icon: "🏙️ → 🏛️" },
    { from: "Riyadh", to: "Zalim", icon: "🏙️ → 🌊" },
    { from: "Riyadh", to: "Tayab", icon: "🏙️ → 🌊" },
    { from: "Zalim", to: "Tayab", icon: "🏙️ → 🌊" },
    { from: "Tayab", to: "Jeddah", icon: "🏙️ → ✈️" },
    { from: "Jeddah", to: "Makkah", icon: "🌃 → 🕋" },
    { from: "Jeddah", to: "Al_Qasim", icon: "🌃 → 🏛️" },
    { from: "Al_Qasim", to: "Riyadh", icon: "🏛️ → 🏙️" },
    { from: "Ramazia", to: "Riyadh", icon: "🏛️ → 🏙️" },
    { from: "Al_Hanakiyyah", to: "Al_Qasim", icon: "🏜️ → 🏛️" },
    { from: "Riyadh", to: "Al_Humiyat", icon: "🏙️ → 🏜️" },
    { from: "Al_Humiyat", to: "Makkah", icon: "🏜️ → 🕋" },
    { from: "Jeddah", to: "Al_Humiyat", icon: "🌃 → 🏜️" },
    { from: "Al_Humiyat", to: "Riyadh", icon: "🏜️ → 🏙️" },
    { from: "Makkah", to: "Jeddah", icon: "🕋 → 🌃" },
    { from: "Riswan", to: "Makkah", icon: "🏜️ → 🕋" },
    { from: "Riswan", to: "Madina", icon: "🏜️ → 🕌" },
    { from: "Makkah", to: "Ajdar_Milan_Airport", icon: "🕋 → ✈️" },
    { from: "Ruwaydah", to: "Riyadh", icon: "🏜️ → 🏙️" },
    { from: "Madina", to: "Buraidah", icon: "🕌 → 🏛️" }
  ];
  const menu = ROUTES.map((r, i) => `${i + 1}. ${r.from} → ${r.to}`);
  await sendMessage(
    `✅ *${session.passengers.length} passenger${session.passengers.length > 1 ? "s" : ""} added.*\n\n🛣️ *Step 1 of 4 — Route*\n\n${menu.join("\n")}\n\nTap a button or reply with a number.`,
    {
      markdown: true,
      inline: ROUTES.map((r, i) => [{ text: `${r.icon} ${r.from} → ${r.to}`, data: String(i + 1) }]),
      keyboard: menu
    }
  );
}

async function handleRouteSelection(base44, sessionEntityName, session, text, sendMessage) {
  const num = parseInt((text.match(/^(\d+)/) || [])[1], 10);
  const ROUTES = [
    { from: "Madina", to: "Makkah" },
    { from: "Makkah", to: "Madina" },
    { from: "Riyadh", to: "Makkah" },
    { from: "Riyadh", to: "Madina" },
    { from: "Madina", to: "Riyadh" },
    { from: "Makkah", to: "Riyadh" },
    { from: "Riyadh", to: "Dammam" },
    { from: "Riyadh", to: "Jeddah" },
    { from: "Riyadh", to: "Al_Qasim" },
    { from: "Riyadh", to: "Zalim" },
    { from: "Riyadh", to: "Tayab" },
    { from: "Zalim", to: "Tayab" },
    { from: "Tayab", to: "Jeddah" },
    { from: "Jeddah", to: "Makkah" },
    { from: "Jeddah", to: "Al_Qasim" },
    { from: "Al_Qasim", to: "Riyadh" },
    { from: "Ramazia", to: "Riyadh" },
    { from: "Al_Hanakiyyah", to: "Al_Qasim" },
    { from: "Riyadh", to: "Al_Humiyat" },
    { from: "Al_Humiyat", to: "Makkah" },
    { from: "Jeddah", to: "Al_Humiyat" },
    { from: "Al_Humiyat", to: "Riyadh" },
    { from: "Makkah", to: "Jeddah" },
    { from: "Riswan", to: "Makkah" },
    { from: "Riswan", to: "Madina" },
    { from: "Makkah", to: "Ajdar_Milan_Airport" },
    { from: "Ruwaydah", to: "Riyadh" },
    { from: "Madina", to: "Buraidah" }
  ];
  if (!num || num < 1 || num > ROUTES.length) {
    await sendMessage(`Please reply with a number between 1 and ${ROUTES.length}.`);
    return;
  }
  const { from: routeFrom, to: routeTo } = ROUTES[num - 1];
  await base44.asServiceRole.entities[sessionEntityName].update(session.id, {
    state: "awaiting_datetime",
    route_from: routeFrom,
    route_to: routeTo
  });
  await sendMessage(
    `✅ Route: *${routeFrom} → ${routeTo}*\n\n📅 *Step 2 of 4 — Date & Time*\n\nSend the travel date and time, for example:\n\`2024-01-15 7:05 PM\``,
    { markdown: true }
  );
}

async function handleDateTime(base44, sessionEntityName, session, rawText, sendMessage) {
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
  await askCompany(base44, sessionEntityName, updatedSession, sendMessage);
}

async function askCompany(base44, sessionEntityName, session, sendMessage) {
  const companies = await base44.asServiceRole.entities.CompanyTemplate.filter({ is_active: true }, "-updated_date", 10);
  if (!companies.length) {
    await sendMessage("⚠️ No company template configured. Please add one in the app Settings page first.");
    return;
  }
  const menu = companies.map((c, i) => `${i + 1}. ${c.name}`);
  await base44.asServiceRole.entities[sessionEntityName].update(session.id, {
    state: "awaiting_company",
    company_menu: companies.map((c) => c.id)
  });
  await sendMessage(`🏢 *Step 3 of 4 — Company*\n\n${menu.join("\n")}\n\nTap a button or reply with a number.`, {
    markdown: true,
    inline: companies.map((c, i) => [{ text: `🏢 ${c.name}`, data: String(i + 1) }]),
    keyboard: menu
  });
}

async function handleCompanySelection(base44, sessionEntityName, session, text, sendMessage, appId, sendDocument) {
  const num = parseInt((text.match(/^(\d+)/) || [])[1], 10);
  const ids = session.company_menu || [];
  if (!num || num < 1 || num > ids.length) {
    await sendMessage(`Please pick a number between 1 and ${ids.length}.`);
    return;
  }
  const companyId = ids[num - 1];
  await base44.asServiceRole.entities[sessionEntityName].update(session.id, {
    company_id: companyId
  });
  const updatedSession = { ...session, company_id: companyId };
  await askDriver(base44, sessionEntityName, updatedSession, sendMessage, appId, sendDocument);
}

async function askDriver(base44, sessionEntityName, session, sendMessage, appId, sendDocument) {
  // Saved driver profiles first
  const saved = await base44.asServiceRole.entities.Driver.filter({ is_active: true }, "-updated_date", 8);
  let drivers = saved.map((d) => ({
    name: d.name,
    iqama_no: d.iqama_no || "",
    name2: d.name2 || "",
    iqama_no2: d.iqama_no2 || "",
    vehicle_plate: d.vehicle_plate || "",
    car_model: d.car_model || ""
  }));

  if (!drivers.length) {
    // Fall back to drivers used on recent trips
    const trips = await base44.asServiceRole.entities.Trip.list("-updated_date", 50);
    const seen = new Set();
    for (const trip of trips) {
      for (const d of trip.drivers || []) {
        if (!d.name) continue;
        const key = `${d.name}|${d.iqama_no || ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        drivers.push({
          name: d.name,
          iqama_no: d.iqama_no || "",
          name2: "",
          iqama_no2: "",
          vehicle_plate: trip.vehicle_plate || "",
          car_model: trip.car_model || ""
        });
        if (drivers.length >= 8) break;
      }
      if (drivers.length >= 8) break;
    }
  }

  if (!drivers.length) {
    // No known drivers — finalize without one
    await finalizeTrip(base44, sessionEntityName, session, sendMessage, appId, sendDocument);
    return;
  }

  const menu = drivers.map((d, i) =>
    `${i + 1}. ${d.name}${d.name2 ? ` & ${d.name2}` : ""}${d.iqama_no ? ` — Iqama: ${d.iqama_no}${d.iqama_no2 ? ` / ${d.iqama_no2}` : ""}` : ""}${d.vehicle_plate ? ` — ${d.vehicle_plate}` : ""}${d.car_model ? ` (${d.car_model})` : ""}`
  );
  await base44.asServiceRole.entities[sessionEntityName].update(session.id, {
    state: "awaiting_driver",
    driver_menu: drivers
  });
  await sendMessage(`🚗 *Step 4 of 4 — Driver*\n\n${menu.join("\n")}\n\nTap a button or reply with a number. Send "skip" for no driver.`, {
    markdown: true,
    inline: [
      ...drivers.map((d, i) => [{ text: `🚗 ${d.name}${d.name2 ? ` & ${d.name2}` : ""}${d.vehicle_plate ? ` — ${d.vehicle_plate}` : ""}`, data: String(i + 1) }]),
      [{ text: "⏭️ Skip — no driver", data: "skip" }]
    ],
    keyboard: [...drivers.map((d, i) => `${i + 1}. ${d.name}${d.name2 ? ` & ${d.name2}` : ""}`), "skip"]
  });
}

async function handleDriverSelection(base44, sessionEntityName, session, text, sendMessage, appId, sendDocument) {
  const lower = text.toLowerCase();
  if (lower === "skip" || lower === "تخطي") {
    await finalizeTrip(base44, sessionEntityName, session, sendMessage, appId, sendDocument);
    return;
  }
  const num = parseInt((text.match(/^(\d+)/) || [])[1], 10);
  const drivers = session.driver_menu || [];
  if (!num || num < 1 || num > drivers.length) {
    await sendMessage(`Please pick a number between 1 and ${drivers.length}, or send "skip".`);
    return;
  }
  const driver = drivers[num - 1];
  await base44.asServiceRole.entities[sessionEntityName].update(session.id, { driver });
  const updatedSession = { ...session, driver };
  await finalizeTrip(base44, sessionEntityName, updatedSession, sendMessage, appId, sendDocument);
}

async function finalizeTrip(base44, sessionEntityName, session, sendMessage, appId, sendDocument) {
  const result = await createTripFromTemplate(base44, session);
  if (!result) {
    await sendMessage("⚠️ No company template configured. Please add one in the app Settings page first.");
    return;
  }

  const { trip, company } = result;
  // appId passed from the webhook is the full function base URL
  // (https://base44.app/api/apps/{id}/functions), so links work on any host.
  const docUrl = `${appId}/manifestView?trip_id=${trip.id}`;
  const pdfUrl = `${appId}/manifestPdf?trip_id=${trip.id}`;

  const driverLine = session.driver ? `\n🚗 Driver: ${session.driver.name}${session.driver.name2 ? ` & ${session.driver.name2}` : ""}` : "";
  const summary = `✅ Trip manifest created!\n\n📊 Passengers: ${session.passengers.length}\n🛣️ Route: ${session.route_from} → ${session.route_to}\n📅 Date: ${session.travel_date}${session.trip_time ? " " + session.trip_time : ""}\n🏢 ${company.name_ar}${driverLine}`;

  await sendMessage(`${summary}\n\n📥 PDF download:\n${pdfUrl}\n\n📄 View online:\n${docUrl}\n\nTo start a new trip, send "start".`);

  await base44.asServiceRole.entities[sessionEntityName].update(session.id, {
    state: "done",
    trip_id: trip.id
  });
}