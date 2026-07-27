// Picks the right template + builder for a trip (per-company templates)
// and returns the filled document HTML.
import { buildFromMscTemplate, MSC_TEMPLATE_URL } from "./mscTemplate.ts";
import { buildFromAwtarTemplate, AWTAR_TEMPLATE_URL } from "./awtarTemplate.ts";
import { buildFromSaudTemplate, SAUD_TEMPLATE_URL } from "./saudTemplate.ts";
import { buildFromJiwahTemplate, JIWAH_TEMPLATE_URL } from "./jiwahTemplate.ts";

const BUILDERS = {
  [MSC_TEMPLATE_URL]: buildFromMscTemplate,
  [AWTAR_TEMPLATE_URL]: buildFromAwtarTemplate,
  [SAUD_TEMPLATE_URL]: buildFromSaudTemplate,
  [JIWAH_TEMPLATE_URL]: buildFromJiwahTemplate
};

const templateCache = {};

export async function buildManifestDoc(trip) {
  const url = (trip && trip.template_url) || MSC_TEMPLATE_URL;
  if (!templateCache[url]) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("template fetch failed: " + res.status);
    templateCache[url] = await res.text();
  }
  const builder = BUILDERS[url] || buildFromMscTemplate;
  return builder(templateCache[url], trip);
}