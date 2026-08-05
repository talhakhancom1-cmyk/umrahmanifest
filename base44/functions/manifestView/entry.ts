import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { buildManifestHtml } from '../../shared/manifestHtml.ts';
import { buildManifestDoc } from '../../shared/manifestBuilder.ts';

// Public document viewer: GET ?trip_id=<id>
// The trip id acts as an unguessable access token (used in Telegram links).
// (v2: print-aligned extra manifest rows)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    let tripId = url.searchParams.get('trip_id');
    if (!tripId && req.method === 'POST') {
      try { tripId = (await req.json()).trip_id; } catch { /* no body */ }
    }
    if (!tripId || !/^[a-f0-9]{24}$/.test(tripId)) {
      return new Response('Invalid trip id', { status: 400 });
    }

    const trip = await base44.asServiceRole.entities.Trip.get(tripId);
    if (!trip) return new Response('Not found', { status: 404 });

    let html;
    try {
      html = await buildManifestDoc(trip);
    } catch (e) {
      console.error('template unavailable, using generated template:', e.message);
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