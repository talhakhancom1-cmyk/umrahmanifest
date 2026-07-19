import { base44 } from "@/api/base44Client";

const SCHEMA = {
  type: "object",
  properties: {
    full_name: { type: "string" },
    id_number: { type: "string" },
    nationality: { type: "string" }
  },
  required: ["full_name", "id_number", "nationality"]
};

const PROMPT = `You are an OCR assistant for Saudi Umrah transport documents.
The attached image is a photo of a passport, visa, or iqama (Saudi residence ID).
Extract these fields:
- full_name: the passenger's full name as written (prefer Latin/English spelling if present, otherwise transliterate).
- id_number: the main ID number visible — passport number, iqama number, or visa number.
- nationality: the passenger's nationality / issuing country.
Return ONLY the JSON object.`;

export async function extractPassengers(files, onProgress) {
  const results = [];
  const photoUrls = [];
  let done = 0;
  for (const file of files) {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      photoUrls.push(file_url);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: PROMPT,
        file_urls: [file_url],
        response_json_schema: SCHEMA
      });
      results.push({
        name: res.full_name || "",
        id_number: res.id_number || "",
        nationality: res.nationality || ""
      });
    } catch (e) {
      results.push({ name: "", id_number: "", nationality: "" });
      photoUrls.push("");
    }
    done++;
    if (onProgress) onProgress(done, files.length);
  }
  return { passengers: results, photoUrls };
}