// Picks the right template + builder for a trip (per-company templates)
// and returns the filled document HTML.
import { buildFromMscTemplate, MSC_TEMPLATE_URL } from "./mscTemplate.ts";
import { buildFromAwtarTemplate, AWTAR_TEMPLATE_URL } from "./awtarTemplate.ts";
import { buildFromSaudTemplate, SAUD_TEMPLATE_URL } from "./saudTemplate.ts";
import { buildFromJiwahTemplate, JIWAH_TEMPLATE_URL } from "./jiwahTemplate.ts";
import { buildFromIshraqTemplate, ISHRAQ_TEMPLATE_URL } from "./ishraqTemplate.ts";
import { buildFromTailSaeedTemplate, TAIL_SAEED_TEMPLATE_URL } from "./tailSaeedTemplate.ts";
import { buildFromImranTemplate, IMRAN_TEMPLATE_URL } from "./imranTemplate.ts";
import { buildFromSharifTemplate, SHARIF_TEMPLATE_URL } from "./sharifTemplate.ts";
import { buildFromRawahilTemplate, RAWAHIL_TEMPLATE_URL } from "./rawahilTemplate.ts";
import { buildFromWardaTemplate, WARDA_TEMPLATE_URL } from "./wardaTemplate.ts";
import { buildFromTaybahTemplate, TAYBAH_TEMPLATE_URL } from "./taybahTemplate.ts";
import { buildFromTalabTemplate, TALAB_TEMPLATE_URL } from "./talabTemplate.ts";
import { buildFromMehdullahTemplate, MEHDULLAH_TEMPLATE_URL } from "./mehdullahTemplate.ts";
import { buildFromShamTemplate, SHAM_TEMPLATE_URL } from "./shamTemplate.ts";
import { buildFromHayatCrystalTemplate, HAYAT_CRYSTAL_TEMPLATE_URL } from "./hayatCrystalTemplate.ts";
import { buildFromSaidRehmanTemplate, SAID_REHMAN_TEMPLATE_URL } from "./saidRehmanTemplate.ts";
import { buildFromIrfanTemplate, IRFAN_TEMPLATE_URL } from "./irfanTemplate.ts";
import { buildFromLamarTemplate, LAMAR_TEMPLATE_URL } from "./lamarTemplate.ts";

const BUILDERS = {
  [MSC_TEMPLATE_URL]: buildFromMscTemplate,
  [AWTAR_TEMPLATE_URL]: buildFromAwtarTemplate,
  [SAUD_TEMPLATE_URL]: buildFromSaudTemplate,
  [JIWAH_TEMPLATE_URL]: buildFromJiwahTemplate,
  [ISHRAQ_TEMPLATE_URL]: buildFromIshraqTemplate,
  [TAIL_SAEED_TEMPLATE_URL]: buildFromTailSaeedTemplate,
  [IMRAN_TEMPLATE_URL]: buildFromImranTemplate,
  [SHARIF_TEMPLATE_URL]: buildFromSharifTemplate,
  [RAWAHIL_TEMPLATE_URL]: buildFromRawahilTemplate,
  [WARDA_TEMPLATE_URL]: buildFromWardaTemplate,
  [TAYBAH_TEMPLATE_URL]: buildFromTaybahTemplate,
  [TALAB_TEMPLATE_URL]: buildFromTalabTemplate,
  [MEHDULLAH_TEMPLATE_URL]: buildFromMehdullahTemplate,
  [SHAM_TEMPLATE_URL]: buildFromShamTemplate,
  [HAYAT_CRYSTAL_TEMPLATE_URL]: buildFromHayatCrystalTemplate,
  [SAID_REHMAN_TEMPLATE_URL]: buildFromSaidRehmanTemplate,
  [IRFAN_TEMPLATE_URL]: buildFromIrfanTemplate,
  [LAMAR_TEMPLATE_URL]: buildFromLamarTemplate
};

// Alias old non-http template identifiers to their real fetched URLs
const URL_ALIASES = {
  "tail-saeed-ibrahim-al-thubaiti": TAIL_SAEED_TEMPLATE_URL,
  "taybah-fakhmah": TAYBAH_TEMPLATE_URL,
  // Al Talab: first upload had sample data baked into the page image —
  // point old trips at the blank template.
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/c83e4c40d_trip_148487_company_a.html":
    TALAB_TEMPLATE_URL,
  // Mehdullah: first upload had sample data baked in — use the blank template.
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/c3dd01e3f_MEHDULLAH.html":
    MEHDULLAH_TEMPLATE_URL
};

const templateCache = {};

export async function buildManifestDoc(trip) {
  const rawUrl = (trip && trip.template_url) || MSC_TEMPLATE_URL;
  const url = URL_ALIASES[rawUrl] || rawUrl;
  const builder = BUILDERS[url] || buildFromMscTemplate;
  if (!url.startsWith("http")) {
    return builder("", trip);
  }
  if (!templateCache[url]) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("template fetch failed: " + res.status);
    templateCache[url] = await res.text();
  }
  return builder(templateCache[url], trip);
}