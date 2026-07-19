import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { buildManifestHtml } from '../../shared/manifestHtml.ts';
import { buildFromMscTemplate, MSC_TEMPLATE_URL } from '../../shared/mscTemplate.ts';

let cachedTemplate = null;

// Public document viewer: GET ?trip_id=<id>
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

    let html;
    try {
      if (!cachedTemplate) {
        const res = await fetch(MSC_TEMPLATE_URL);
        if (!res.ok) throw new Error('template fetch failed: ' + res.status);
        cachedTemplate = await res.text();
      }
      html = buildFromMscTemplate(cachedTemplate, trip);
    } catch (e) {
      console.error('MSC template unavailable, using generated template:', e.message);
      html = buildManifestHtml(trip);
    }

    const page = url.searchParams.get('page');
    if (page && ['1', '2', '3'].includes(page)) {
      const hide = ['1', '2', '3'].filter((p) => p !== page)
        .map((p) => `#pf${p}{display:none!important}`).join('');
      html = html.replace('</head>', `<style>${hide}</style></head>`);
    }

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (error) {
    return new Response('Error: ' + error.message, { status: 500 });
  }
});