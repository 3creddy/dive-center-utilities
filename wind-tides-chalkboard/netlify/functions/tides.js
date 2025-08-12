// netlify/functions/tides.js
export default async (req, context) => {
  try {
    const key = Deno.env.get('WORLDTIDES_API_KEY');
    if (!key) return Response.json({ error:'WORLDTIDES_API_KEY not set' }, { status:500 });

    const url = new URL(req.url);
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    const date = url.searchParams.get('date'); // YYYY-MM-DD (local IST day)

    if (!lat || !lon || !date) {
      return Response.json({ error: 'lat, lon, date required' }, { status: 400 });
    }

    const api = new URL('https://www.worldtides.info/api');
    api.searchParams.set('extremes', '');
    api.searchParams.set('date', date);
    api.searchParams.set('lat', lat);
    api.searchParams.set('lon', lon);
    api.searchParams.set('key', key);

    const r = await fetch(api.toString(), { headers: { 'accept': 'application/json' }});
    if (!r.ok) throw new Error(`WorldTides ${r.status}`);
    const j = await r.json();

    const extremes = (j?.extremes || []).map(x => ({
      type: x.type,
      timeISO: new Date(x.dt * 1000).toISOString(),
      height: typeof x.height === 'number' ? x.height : undefined
    }));

    return Response.json({ extremes, note: j?.status || undefined });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
};
