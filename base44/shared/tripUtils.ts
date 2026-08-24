export const OCR_SCHEMA = {
  type: "object",
  properties: {
    full_name: { type: "string" },
    id_number: { type: "string" },
    nationality: { type: "string" },
    gender: { type: "string" }
  },
  required: ["full_name", "id_number", "nationality"]
};

export const OCR_PROMPT = `You are an expert OCR system for travel identity documents (passports, Saudi visas, iqama residence cards) used for Umrah transport manifests.

Read the attached image VERY carefully. Rules:

1. If the document has a Machine Readable Zone (MRZ — the two lines of << characters at the bottom of a passport/visa), ALWAYS use the MRZ as the source of truth:
   - Line 1 after "P<XXX" contains SURNAME<<GIVEN<NAMES — convert << to spaces and output as "GIVEN NAMES SURNAME".
   - Line 2 starts with the passport number (first 9 characters, ignore the check digit after it).
   - The 3-letter country code in the MRZ gives the nationality (e.g. PAK = Pakistan, BGD = Bangladesh, IDN = Indonesia, SDN = Sudan, EGY = Egypt, IND = India, NGA = Nigeria, TUR = Turkey).
2. If there is no MRZ (e.g. iqama card), use the printed fields. The iqama number is a 10-digit number starting with 2 (labelled "رقم الإقامة" / "Iqama No").
3. full_name: full name in UPPERCASE Latin letters exactly as printed. Never invent, translate, or reorder beyond MRZ rules. Do not include titles (MR/MRS).
4. id_number: exact characters, letters and digits, no spaces or dashes. Do not confuse it with dates, document/serial numbers on card edges, or the check digit.
5. nationality: the full English country name (e.g. "Pakistan", not "PAK" or "Pakistani").
6. gender: "Male" or "Female" based on the document. On passports, the MRZ line 2 position 21 is sex (M/F). On iqama/visa cards, look for "الجنس" / "Sex" / "Gender" field. If unclear, best guess from the name/photo.
7. NEVER invent, guess, or fabricate any value. Only output what is actually printed/encoded on the document. If a field is genuinely not visible or not present on the document, return it as an empty string "" — do not make up a name, number, or nationality, and do not add any extra fields beyond full_name, id_number, nationality, gender.

Double-check digits 0/8, 1/7, 5/6 and letters O/0, I/1, S/5 against both the printed text and the MRZ before answering.
Return ONLY the JSON object, with exactly the fields defined in the schema — no additional data.`;

export async function uploadImageBuffer(base44, buffer, filename) {
  // Try public upload first (accessible URLs work for both OCR and long-term storage).
  // UploadFile intermittently produces 401 URLs the LLM cannot read, so we verify
  // accessibility and fall back to a signed URL from private storage if needed.
  for (let attempt = 0; attempt < 2; attempt++) {
    const fn = attempt === 0 ? filename : `r${attempt}_${Date.now()}_${filename}`;
    const file = new File([buffer], fn, { type: "image/jpeg" });
    const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    try {
      const check = await fetch(uploadRes.file_url);
      if (check.ok) return uploadRes.file_url;
    } catch {}
  }
  // Fallback: private upload + signed URL (always accessible, 7-day expiry)
  const file = new File([buffer], filename, { type: "image/jpeg" });
  const privRes = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
  const signedRes = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
    file_uri: privRes.file_uri,
    expires_in: 604800
  });
  return signedRes.signed_url;
}

export async function processPassengerPhoto(base44, fileUrl) {
  const ocrRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: OCR_PROMPT,
    file_urls: [fileUrl],
    response_json_schema: OCR_SCHEMA,
    model: "claude_sonnet_4_6"
  });
  const data = (ocrRes && ocrRes.response) ? ocrRes.response : (ocrRes || {});
  return {
    name: data.full_name || "",
    id_number: data.id_number || "",
    nationality: data.nationality || "",
    gender: data.gender || ""
  };
}

export async function createTripFromTemplate(base44, session) {
  let company = null;
  if (session.company_id) {
    company = await base44.asServiceRole.entities.CompanyTemplate.get(session.company_id).catch(() => null);
  }
  if (!company) {
    const companies = await base44.asServiceRole.entities.CompanyTemplate.filter({ is_active: true });
    company = companies[0];
  }
  if (!company) return null;

  const driver = session.driver || null;
  const driversArr = [];
  if (driver) {
    driversArr.push({ name: driver.name, iqama_no: driver.iqama_no || "" });
    if (driver.name2) driversArr.push({ name: driver.name2, iqama_no: driver.iqama_no2 || "" });
  }

  const trip = await base44.asServiceRole.entities.Trip.create({
    trip_name: `${company.name} - ${session.route_from} to ${session.route_to} - ${session.travel_date}`,
    route_from: session.route_from,
    route_to: session.route_to,
    travel_date: session.travel_date,
    trip_time: session.trip_time,
    second_party_name: "",
    drivers: driversArr,
    vehicle_plate: driver ? (driver.vehicle_plate || "") : "",
    car_model: driver ? (driver.car_model || "") : "",
    company_name: company.name,
    company_name_ar: company.name_ar,
    cr_number: company.cr_number || "",
    logo_url: company.logo_url || "",
    stamp_url: company.stamp_url || "",
    qr_url: company.qr_url || "",
    footer_ar: company.footer_ar || "",
    footer_en: company.footer_en || "",
    template_url: company.template_url || "",
    passengers: session.passengers,
    photo_urls: session.photo_urls,
    status: "completed"
  });

  return { trip, company };
}