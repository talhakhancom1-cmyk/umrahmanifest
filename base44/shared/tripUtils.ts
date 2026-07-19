export const OCR_SCHEMA = {
  type: "object",
  properties: {
    full_name: { type: "string" },
    id_number: { type: "string" },
    nationality: { type: "string" }
  },
  required: ["full_name", "id_number", "nationality"]
};

export const OCR_PROMPT = `You are an OCR assistant for Saudi Umrah transport documents.
The attached image is a photo of a passport, visa, or iqama (Saudi residence ID).
Extract these fields:
- full_name: the passenger's full name as written (prefer Latin/English spelling if present, otherwise transliterate).
- id_number: the main ID number visible — passport number, iqama number, or visa number.
- nationality: the passenger's nationality / issuing country.
Return ONLY the JSON object.`;

export async function uploadImageBuffer(base44, buffer, filename) {
  const file = new File([buffer], filename, { type: "image/jpeg" });
  const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });
  return uploadRes.file_url;
}

export async function processPassengerPhoto(base44, fileUrl) {
  const ocrRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: OCR_PROMPT,
    file_urls: [fileUrl],
    response_json_schema: OCR_SCHEMA
  });
  return {
    name: ocrRes.full_name || "",
    id_number: ocrRes.id_number || "",
    nationality: ocrRes.nationality || ""
  };
}

export async function createTripFromTemplate(base44, session) {
  const companies = await base44.asServiceRole.entities.CompanyTemplate.filter({ is_active: true });
  const company = companies[0];
  if (!company) return null;

  const trip = await base44.asServiceRole.entities.Trip.create({
    trip_name: `${company.name} - ${session.route_from} to ${session.route_to} - ${session.travel_date}`,
    route_from: session.route_from,
    route_to: session.route_to,
    travel_date: session.travel_date,
    trip_time: session.trip_time,
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

  return { trip, company };
}