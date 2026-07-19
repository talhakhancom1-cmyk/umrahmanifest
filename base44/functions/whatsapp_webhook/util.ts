const WA_API = "https://graph.facebook.com/v18.0";

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

export async function sendWhatsAppMessage(phoneNumberId, token, to, text) {
  await fetch(`${WA_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text }
    })
  });
}

export async function getMediaUrl(token, mediaId) {
  const res = await fetch(`${WA_API}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.url;
}

export async function downloadMedia(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return await res.arrayBuffer();
}