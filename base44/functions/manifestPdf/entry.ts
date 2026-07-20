import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { buildFromMscTemplate, MSC_TEMPLATE_URL } from '../../shared/mscTemplate.ts';
import { buildPdfFromMscHtml } from '../../shared/mscPdf.ts';

let cachedTemplate = null;

// Direct PDF download: GET ?trip_id=<id>
// The trip id acts as an unguessable access token (used in Telegram links).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const tripId = url.searchParams.get('trip_id');
    if (!tripId || !/^[a-f0-9]{24}$/.test(tripId)) {
      return new Response('Invalid trip id', { status: 400 });
    }

    const trip = await base44.asServiceRole.entities.Trip.get(tripId);
    if (!trip) return new Response('Not found', { status: 404 });

    if (!cachedTemplate) {
      const res = await fetch(MSC_TEMPLATE_URL);
      if (!res.ok) throw new Error('template fetch failed: ' + res.status);
      cachedTemplate = await res.text();
    }

    const html = buildFromMscTemplate(cachedTemplate, trip);
    const pdfBytes = await buildPdfFromMscHtml(html);
    const name = (trip.trip_name || 'manifest').replace(/[^\w\- ]+/g, '').slice(0, 60) || 'manifest';

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${name}.pdf"`
      }
    });
  } catch (error) {
    return new Response('Error: ' + error.message, { status: 500 });
  }
});