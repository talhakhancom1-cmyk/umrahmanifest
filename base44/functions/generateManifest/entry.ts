import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { buildManifestHtml } from '../../shared/manifestHtml.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { trip_id } = await req.json();
    if (!trip_id) return Response.json({ error: 'trip_id is required' }, { status: 400 });

    const trip = await base44.entities.Trip.get(trip_id);
    if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 });

    return Response.json({ html: buildManifestHtml(trip) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});