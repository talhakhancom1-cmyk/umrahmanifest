import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import jpeg from 'npm:jpeg-js@0.4.4';

// Serves a driver's portrait, cropped out of the licence photo the driver sent
// (kept in the app's private storage). Used as the driver photo on the Musafir
// contract, where the template otherwise prints one fixed picture.
// Query: x, y, w, h — crop rectangle as fractions of the source (0..1).
const SRC = 'mp/private/6a5cef68337f5303ffc014f5/chat/08350dce624cd6d16b46a1059160ca17_WhatsAppImage2026-11-26at41057PM1.jpeg';

// portrait frame of the licence card in that photo
const BOX = { x: 0.219, y: 0.336, w: 0.146, h: 0.364 };

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const q = new URL(req.url).searchParams;
  const f = (k: string, d: number) => {
    const v = parseFloat(q.get(k) || '');
    return isNaN(v) ? d : v;
  };

  const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: SRC });
  const res = await fetch(signed_url);
  if (!res.ok) return new Response('source unavailable', { status: 502 });
  const img = jpeg.decode(new Uint8Array(await res.arrayBuffer()), { useTArray: true });

  const sx = Math.round(f('x', BOX.x) * img.width);
  const sy = Math.round(f('y', BOX.y) * img.height);
  const sw = Math.round(f('w', BOX.w) * img.width);
  const sh = Math.round(f('h', BOX.h) * img.height);
  const data = new Uint8Array(sw * sh * 4);
  for (let row = 0; row < sh; row++) {
    const from = ((sy + row) * img.width + sx) * 4;
    data.set(img.data.subarray(from, from + sw * 4), row * sw * 4);
  }
  const out = jpeg.encode({ data, width: sw, height: sh }, 92);

  return new Response(out.data, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' }
  });
});