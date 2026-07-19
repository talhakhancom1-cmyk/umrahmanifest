const WA_API = "https://graph.facebook.com/v18.0";

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