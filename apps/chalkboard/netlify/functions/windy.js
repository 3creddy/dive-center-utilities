// apps/chalkboard/netlify/functions/windy.js
export default async (req, context) => {
  try {
    const key = Deno.env.get('WINDY_API_KEY');
    if (!key) return Response.json({ error:'WINDY_API_KEY not set' }, { status:500 });

    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get('lat'));
    const lon = parseFloat(url.searchParams.get('lon'));

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return Response.json({ error: 'lat/lon required' }, { status: 400 });
    }

    const body = {
      lat, lon,
      model: 'gfs',
      parameters: ['wind','gust'],
      levels: ['surface'],
      key
    };

    const r = await fetch('https://api.windy.com/api/point-forecast/v2', {
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`Windy ${r.status}`);
    const j = await r.json();
    return Response.json(j, { status: 200 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
};
