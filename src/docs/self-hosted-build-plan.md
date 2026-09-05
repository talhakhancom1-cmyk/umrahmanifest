# UmrahManifest — Self-Hosted Rebuild Plan

A complete blueprint for rebuilding this system on your own backend.
Everything below describes exactly how the current app works, so you can
re-implement it with any stack.

---

## 1. What the system does

An operator (or a group chat of drivers) sends photos of pilgrim identity
documents (passport / Saudi visa / iqama card) to a Telegram or WhatsApp bot,
or uploads them on the website. The system:

1. Reads each photo with a vision AI model (OCR) and extracts:
   **full name, ID number, nationality, gender**.
2. Blocks duplicate passengers (same ID already in the trip).
3. Collects trip details through a step-by-step conversation:
   route → date & time → company → driver.
4. Generates a **print-ready A4 manifest** in the chosen company's official
   layout (their contract/manifest PDF template, filled with real trip data).
5. Delivers it as an **online view link** and a **direct PDF download** —
   no login needed (the trip's random 24-char ID acts as the access token).

---

## 2. Architecture at a glance

```
Telegram / WhatsApp user
        │  (webhook events)
        ▼
┌─────────────────────┐      ┌──────────────┐
│  Bot Webhook Service  │◄────►│ Session Store │  (state machine memory)
└─────────┬───────────┘      └──────────────┘
          │ photo
          ▼
┌─────────────────────┐      ┌──────────────┐
│  File Storage (S3)   │─────►│ Vision LLM   │  (Claude, MRZ-based OCR)
└─────────────────────┘      └──────┬───────┘
                                    │ JSON {name, id, nationality, gender}
                                    ▼
                          ┌──────────────────┐
                          │ Database (Trips) │
                          └────────┬─────────┘
                                   │ on finalize
                                   ▼
              ┌────────────────────────────────┐
              │ Template Engine: company HTML  │
              │ template + trip data injection │
              └────────┬───────────┬──────────┘
                       ▼           ▼
              /manifest/view   /manifest/pdf
              (HTML, no login) (server-side HTML→PDF)
```

**Five core services to implement:**

1. **Bot webhook** — receives Telegram/WhatsApp updates, runs the state machine.
2. **OCR engine** — image → structured passenger JSON.
3. **Template engine** — trip data + company HTML template → finished document HTML.
4. **PDF service** — HTML → PDF (headless Chrome).
5. **Web app** — dashboard, trip editor, quick manifest, settings.

---

## 3. Database design

Four business tables + one settings table:

### drivers
| column | notes |
|---|---|
| id | primary key |
| name | driver full name |
| iqama_no | driver iqama number |
| name2, iqama_no2 | optional 2nd driver on the same vehicle |
| vehicle_plate | e.g. `9748 / RXA` |
| car_model | e.g. `Hyundai Staria` |
| is_active | boolean |

### companies (CompanyTemplate)
| column | notes |
|---|---|
| id | primary key |
| name, name_ar | English + Arabic company name |
| cr_number | commercial registration number |
| logo_url, stamp_url, qr_url | branding images |
| footer_ar, footer_en | footer text lines |
| template_url | URL of the company's manifest HTML template. **Empty = default template.** |
| is_active | boolean |

### trips (Trip)
| column | notes |
|---|---|
| id | random 24-hex string — doubles as the public access token |
| trip_name | auto: `{company} - {from} to {to} - {date}` |
| route_from, route_to | city names |
| travel_date | YYYY-MM-DD |
| trip_time | free text, e.g. `7:05 PM` |
| second_party_name | contract second party |
| drivers | JSON array: `[{name, iqama_no}, ...]` |
| vehicle_plate, car_model | |
| company_name, company_name_ar, cr_number | **copied from company at creation time** (so later company edits never change old manifests) |
| logo_url, stamp_url, qr_url, footer_ar, footer_en | same — copied snapshot |
| template_url | which layout to render |
| passengers | JSON array: `[{name, id_number, nationality, gender}, ...]` |
| photo_urls | JSON array of stored photo URLs |
| status | draft / completed |

### sessions (TelegramSession / WhatsAppSession — one row per chat)
| column | notes |
|---|---|
| id | primary key |
| chat_id / phone_number | who is talking |
| state | `idle → collecting → awaiting_route → (awaiting_custom_route) → awaiting_datetime → awaiting_company → awaiting_driver → done` |
| passengers | JSON array, grows photo by photo |
| photo_urls | JSON array, grows with passengers |
| route_from, route_to, travel_date, trip_time | |
| company_menu | ordered list of company IDs (shown when the menu was rendered) |
| company_id, company_page | selection + pagination |
| driver_menu | JSON array of driver objects shown in the menu |
| driver | chosen driver object |
| trip_id | created trip reference |

### settings
WhatsApp phone_number_id, access token, verify token; Telegram bot token; public app URL. Store as environment variables in your own backend instead of a table if you prefer.

---

## 4. OCR engine (the accuracy lives here)

### Pipeline per photo
1. Download the photo bytes (from Telegram `getFile` API / WhatsApp media URL).
2. Upload to file storage; get a **publicly readable URL** (the LLM must be able to fetch it). If public URLs are unreliable on your stack, use presigned URLs (7-day expiry is enough).
3. Call the vision model **once**, image attached, asking for a JSON object.
4. If name AND id_number both come back empty → **retry once**. Still empty → tell the user to retake the photo.
5. Duplicate check (below), then save.

### The OCR prompt (copy verbatim — this is what makes reads accurate)

> You are an expert OCR system for travel identity documents (passports, Saudi visas, iqama residence cards) used for Umrah transport manifests.
>
> Read the attached image VERY carefully. Rules:
>
> 1. If the document has a Machine Readable Zone (MRZ — the two lines of `<<` characters at the bottom of a passport/visa), ALWAYS use the MRZ as the source of truth:
>    - Line 1 after "P<XXX" contains SURNAME<<GIVEN<NAMES — convert `<<` to spaces and output as "GIVEN NAMES SURNAME".
>    - Line 2 starts with the passport number (first 9 characters, ignore the check digit after it).
>    - The 3-letter country code in the MRZ gives the nationality (e.g. PAK = Pakistan, BGD = Bangladesh, IDN = Indonesia, SDN = Sudan, EGY = Egypt, IND = India, NGA = Nigeria, TUR = Turkey).
> 2. If there is no MRZ (e.g. iqama card), use the printed fields. The iqama number is a 10-digit number starting with 2 (labelled "رقم الإقامة" / "Iqama No").
> 3. full_name: full name in UPPERCASE Latin letters exactly as printed. Never invent, translate, or reorder beyond MRZ rules. Do not include titles (MR/MRS).
> 4. id_number: exact characters, letters and digits, no spaces or dashes. Do not confuse it with dates, document/serial numbers on card edges, or the check digit.
> 5. nationality: the full English country name (e.g. "Pakistan", not "PAK" or "Pakistani").
> 6. gender: "Male" or "Female" based on the document. On passports, MRZ line 2 position 21 is sex (M/F). On iqama/visa cards, look for "الجنس" / "Sex" / "Gender". If unclear, best guess from the name/photo.
> 7. NEVER invent, guess, or fabricate any value. Only output what is actually printed/encoded on the document. If a field is genuinely not visible, return it as an empty string "" — do not make up a name, number, or nationality.
>
> Double-check digits 0/8, 1/7, 5/6 and letters O/0, I/1, S/5 against both the printed text and the MRZ before answering.
> Return ONLY the JSON object.

Response schema (ask for structured JSON output):
```json
{ "full_name": "string", "id_number": "string", "nationality": "string", "gender": "string" }
```
Required: full_name, id_number, nationality.

### Anti-duplication (integrity lives here)
Before saving a passenger, re-fetch the session and check the existing list:
- same `id_number` already present → duplicate → reject with a warning message; OR
- no ID was read and the same `name` is already present → duplicate → reject.

### Concurrency rule (critical)
Photos often arrive as a forwarded batch and are processed **in parallel**.
Never do read-modify-write on the passenger list — you will lose passengers.
Use an **atomic array append** (e.g. Postgres `jsonb` + a serialized update,
or `$push`-style semantics, or a row lock). Also always **re-fetch the session
fresh** before duplicate checks and before finalizing, so parallel photo saves
are all visible.

### Model choice note
Claude Sonnet gives the best accuracy/latency tradeoff here (~8–10 s per photo).
Gemini Flash is cheaper but roughly doubled the latency; other models returned
empty readings. Budget ~15 credits/photo equivalent on your own Claude API key.

---

## 5. Bot state machine (one shared flow for both Telegram & WhatsApp)

Session row = the entire memory. Every message is handled according to `state`.

### Global commands (any state)
- `cancel` / `الغاء` / `إلغاء` → reset session, confirm.
- `start` / `new` / `جديد` / `ابدأ` / `/start` → restart flow at photo collection.

### State flow

**idle/done → collecting** ("start")
Reset the session and welcome the user with the 4-step explanation:
photos → done → route/date/driver → document. Ask for the first ID photo.

**collecting**
- photo received → OCR pipeline (section 4) → one short confirmation per passenger:
  `✅ Passenger 3 added: Name / ID / Nationality` — nothing else, no re-listing.
- `done`/`finish`/`تم`/`انتهيت` → re-fetch session, require ≥1 passenger, go to route step.
- any other text → remind to send photos or "done".

**awaiting_route**
Show the fixed route menu (2-column inline keyboard + numbered list):

```
Madina → Makkah, Makkah → Madina, Riyadh → Makkah, Riyadh → Madina,
Madina → Riyadh, Makkah → Riyadh, Riyadh → Dammam, Riyadh → Jeddah,
Riyadh → Al Qasim, Riyadh → Zalim, Riyadh → Tayab, Zalim → Tayab,
Tayab → Jeddah, Jeddah → Makkah, Jeddah → Al Qasim, Al Qasim → Riyadh,
Ramazia → Riyadh, Al Hanakiyyah → Al Qasim, Riyadh → Al Humiyat,
Al Humiyat → Makkah, Jeddah → Al Humiyat, Al Humiyat → Riyadh,
Makkah → Jeddah, Riswan → Makkah, Riswan → Madina,
Makkah → Ajdar Milan Airport, Ruwaydah → Riyadh, Madina → Buraidah
```
Plus a **"✏️ Custom route"** button.

⚠️ Telegram note: underscores are Markdown syntax — never send raw `_` in
Markdown messages (the API rejects the whole message). Replace with spaces.

**awaiting_custom_route**
Parse free text with: `/^(.+?)\s*(?:to|->|→|-|,)\s*(.+)$/i`
→ saves route_from/route_to, moves to date. Ask for the format `Madina to Buraidah`.

**awaiting_datetime**
Parse loosely:
- date: `/(\d{4}-\d{2}-\d{2})/`
- time: `/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/` (optional)
Invalid → ask again. Then move to company.

**awaiting_company**
- Load active companies sorted by most recently updated.
- **Paginate: 8 per page.** Store the full ordered ID list in the session so a
  number reply ("5") always maps to the same company, even across pages.
- Navigation: `More` / `Back` (+ Arabic التالي / السابق), or `pg<N>` callback.

**awaiting_driver**
- Load active **Driver profiles** (name, both drivers' iqamas, plate, model).
- Fallback: unique drivers from the 50 most recent trips (max 8).
- None at all → skip the step entirely.
- `skip` / `تخطي` → no driver.
- Menu line format:
  `1. NAME & NAME2 — Iqama: X / Y — PLATE (CAR MODEL)`

**finalize**
Create the Trip row:
- copy ALL company branding + template_url from the chosen company (snapshot),
- copy route, date/time, driver, passengers, photo_urls from the session,
- trip_name = `{company} - {from} to {to} - {date}`, status = completed.

Send the user:
```
✅ Trip manifest created!

📊 Passengers: N
🛣️ Route: X → Y
📅 Date: ...
🏢 {company_ar}
🚗 Driver: ...

📥 PDF download:
{APP_URL}/manifest/pdf?trip_id={id}

📄 View online:
{APP_URL}/manifest/view?trip_id={id}

To start a new trip, send "start".
```
Then set session state = done.

### Photo sent in the wrong state
Always answer with what's expected next (e.g. in `awaiting_company`:
"Please pick an option from the menu first."). Never silently ignore.

---

## 6. Template engine (per-company manifest layouts)

### The pdf2htmlEX approach
1. Take the company's official manifest/contract **PDF**.
2. Convert it to HTML once with **pdf2htmlEX** (preserves exact positioning,
   fonts, Arabic text, stamps, background images — output looks identical to
   the PDF).
3. Upload that HTML file to storage; its URL is the company's `template_url`.
4. At generation time: fetch the template HTML (cache it in memory),
   **inject trip data**, return the finished HTML.

### Two injection patterns (per template type)

**A. Text-based templates** — the HTML contains real positioned text cells.
- Replace the content of specific cells (identify them by their
  pdf2htmlEX layout classes — inspect the HTML once to find the right ones), OR
- draw **absolutely positioned overlay divs** on top of the placeholders.
- Use **percentage coordinates** (x%, y% relative to the page) so overlays stay
  aligned when the page scales, not pixels.
- Auto-squeeze long values: shrink font-size / letter-spacing until the text
  fits its cell width.
- Passenger grids: fill the printed rows; if there are more passengers than
  printed rows, generate additional overlay rows below using the same row pitch.

**B. Image-based templates** — old sample data is baked into the background picture.
- First place **white rectangles (CSS masks)** over every stale cell, then
  draw the real values on top. Without masking, fake old data shows through.

### Global print CSS (inject into every document)
- Hide pdf2htmlEX sidebars/toolbars.
- Force exact A4 pages: one template page per sheet, no margins, exact scale.
- `page-break-after: always` between pages.
- **Wrap every date/time/number in `<span dir="ltr">…</span>`** so RTL
  rendering can't reverse them.

### Registry pattern
One small "builder" function per company, keyed by template URL:

```
BUILDERS = { MSC_URL: buildMsc, TALAB_URL: buildTalab, ... }
buildManifest(trip):
    url = trip.template_url or DEFAULT
    html = cache[url] or fetch(url)
    return BUILDERS[url](html, trip)
```
Add a new company = add one builder + one URL key.

---

## 7. Delivery endpoints

Both are **public GET** endpoints; the 24-hex trip id is the only token.

### GET /manifest/view?trip_id=…
- Load trip → build HTML → return `Content-Type: text/html`.
- **Set `Cache-Control: no-store`** — browsers cache the URL hard otherwise.

### GET /manifest/pdf?trip_id=…
- Load trip → build HTML → render with **headless Chrome (Puppeteer/Playwright)**:
  A4, print background graphics on, no margins.
- Return `application/pdf` with
  `Content-Disposition: attachment; filename="{trip_name}.pdf"`.

---

## 8. Web app pages

| Page | What it does |
|---|---|
| **Home / dashboard** | List trips (newest first), create trip (prefills branding/driver from the latest trip), delete trip, open workspace. |
| **Trip workspace** | Edit everything on one trip: routes, date/time, drivers list, passengers table (add/edit/remove rows), company branding uploads (logo/stamp/QR), template picker. |
| **Quick Manifest** | The fast path: pick company & driver (driver menu shows car model + plate), type route/date, upload photos (same OCR engine, client-side calls), one click → trip created → jumps to the document. |
| **Trip document** | Iframe preview of the view URL + Print + Download PDF buttons. |
| **Settings** | Company template manager (CRUD + uploads), WhatsApp credentials, Telegram setup, agent connect. |

---

## 9. Suggested self-hosted stack

| Concern | Recommendation |
|---|---|
| Language/runtime | Node.js (Express or Fastify) — everything here is JS already |
| Database | PostgreSQL (`jsonb` for passengers/drivers arrays) |
| File storage | S3 / Cloudflare R2 + presigned URLs |
| Vision OCR | Anthropic Claude API (Sonnet), image attached to the message |
| HTML→PDF | Puppeteer / Playwright headless Chrome |
| Telegram | Telegram Bot API (`setWebhook` → your `/telegram` endpoint) |
| WhatsApp | Meta WhatsApp Cloud API (webhook → your `/whatsapp` endpoint) |
| Web frontend | Any React app (you can reuse this app's pages almost as-is) |
| Hosting | One VPS or container service is enough — the whole thing is stateless except the DB and S3 |

### Webhook specifics
- **Telegram**: `POST https://yourdomain/telegram` receives updates. Photos:
  `getFile` → download from `api.telegram.org/file/bot<token>/<path>`.
  Reply with `sendMessage` (supports inline keyboards via `reply_markup`).
- **WhatsApp**: Meta sends messages to `POST /whatsapp` (verify with
  `hub.verify_token` challenge first). Photos arrive as media IDs →
  `GET /{media-id}` → download URL (auth with the access token).
  Reply via `POST /{phone_number_id}/messages`.
- **Do everything inside the webhook request** and reply to the user as the
  last step — do not rely on background tasks after the response is sent
  (serverless runtimes kill them; on your own server use a real queue if
  you want async).

---

## 10. API surface summary

```
POST /telegram            Telegram webhook
POST /whatsapp            WhatsApp webhook
GET  /manifest/view?trip_id=      Public HTML document
GET  /manifest/pdf?trip_id=       Public PDF download

(website / admin, behind auth)
GET/POST/PUT/DELETE /trips, /drivers, /companies
POST /extract  (photo upload → passenger JSON)   ← used by the web uploader
```

---

## 11. Build order (roadbook)

1. **Phase 1 — data layer.** Postgres schema (section 3), file uploads to S3.
2. **Phase 2 — OCR endpoint.** Photo in → passenger JSON out, with the
   verbatim prompt, one retry, duplicate check helper (section 4).
3. **Phase 3 — template engine.** Convert one company PDF with pdf2htmlEX,
   write its builder, verify the output prints as perfect A4. Then the
   default template. Then per-company builders.
4. **Phase 4 — PDF + view endpoints.** Puppeteer rendering, no-cache headers
   (section 7).
5. **Phase 5 — Telegram bot.** Webhook + full state machine (section 5).
   Test the whole flow manually. Add WhatsApp after Telegram works (same
   state machine, different transport).
6. **Phase 6 — web app.** Dashboard, workspace, quick manifest, settings.

---

## 12. Gotchas learned the hard way (do not re-learn these)

1. **Atomic appends for parallel photo batches** — read-modify-write loses
   passengers (section 4).
2. **MRZ-first prompt** — vision models are unreliable on passport printed
   text alone; anchoring them to the MRZ is what makes reads trustworthy.
3. **Blank-read retry** — some photos come back empty on the first call and
   fine on the second.
4. **Underscores break Telegram Markdown** — `Al_Qasim` in a Markdown message
   makes the API reject it. Sanitize `_` before sending.
5. **`Cache-Control: no-store`** on the view endpoint — otherwise browsers
   show a stale manifest even after edits.
6. **`dir="ltr"` on dates/numbers** — Arabic RTL reverses `2024-01-15` into
   garbage otherwise.
7. **Percentage coordinates for overlays** — pixel positions break the moment
   the rendered page scales.
8. **Mask baked-in sample data on image templates** before drawing real data.
9. **Company data is snapshotted onto the trip at creation** — editing a
   company later must never mutate past manifests.
10. **One short confirmation per photo** — operators send dozens of photos;
    verbose replies (re-listing all passengers each time) make the chat
    unusable.
11. **The trip ID is the access token** — random 24-hex, unguessable; no
    login for the document links. Treat leaked IDs as "grant document
    access"; add expiry if that matters to you.
12. **Latency budget** — vision OCR is 8–10 s per photo; parallelize photo
    processing where the provider allows it, and send the "processing…"
    message before starting the work.