import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { buildManifestHtml } from '../../shared/manifestHtml.ts';
import { buildManifestDoc } from '../../shared/manifestBuilder.ts';

// Public document viewer: GET ?trip_id=<id>
// The trip id acts as an unguessable access token (used in Telegram links).
// (v8: Hayat Crystal template field injection)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    let tripId = url.searchParams.get('trip_id');
    let check = url.searchParams.get('check');
    if (req.method === 'POST') {
      try { const b = await req.json(); if (!tripId) tripId = b.trip_id; if (!check) check = b.check; } catch { /* no body */ }
    }
    if (!tripId || !/^[a-f0-9]{24}$/.test(tripId)) {
      return new Response('Invalid trip id [b44-v7]', { status: 400 });
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

    // EARLY marker so we can confirm the latest code runs via the test runner
    if (url.searchParams.get('check') === 'v7') {
      const has = (s) => html.includes(s);
      return Response.json({
        mv: 'v7',
        taybahMarker: has('b44-taybah-v7'),
        secondParty: has('Ahmad Group'),
        date: has('20/8/2026'),
        paxAhmad: has('Ahmad Raza'),
        paxBilal: has('Bilal Hussain'),
        paxRubab: has('Rubab Fatima'),
        sampleKhalil: has('khalil and 7 members'),
        sampleOldDate: has('15/8/2026'),
        zoomCss: has('zoom:0.4265')
      });
    }

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Manifests are regenerated per trip edit — never let a browser or
        // edge layer serve a previous render of the same trip id.
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    return new Response('Error: ' + error.message, { status: 500 });
  }
});