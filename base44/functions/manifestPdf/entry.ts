import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { buildManifestDoc } from '../../shared/manifestBuilder.ts';
import { buildPdfFromMscHtml, diagnoseFonts } from '../../shared/mscPdf.ts';

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

    const html = await buildManifestDoc(trip);

    if (url.searchParams.get('debug') === 'fonts') {
      const diag = await diagnoseFonts(html);
      return Response.json(diag);
    }

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