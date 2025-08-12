// netlify/functions/wind.js
export default async (req, context) => {
  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    const date = url.searchParams.get('date'); // YYYY-MM-DD (IST target day)

    if (!lat || !lon || !date) {
      return Response.json({ error: 'lat, lon, date required' }, { status: 400 });
    }

    const api = new URL('https://api.open-meteo.com/v1/forecast');
    api.searchParams.set('latitude', lat);
    api.searchParams.set('longitude', lon);
    api.searchParams.set('hourly', 'wind_speed_10m,wind_gusts_10m,wind_direction_10m');
    api.searchParams.set('timezone', 'Asia/Kolkata');
    api.searchParams.set('start_date', date);
    api.searchParams.set('end_date', date);

    const r = await fetch(api, { headers: { 'accept': 'application/json' }});
    if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
    const j = await r.json();

    const times = j?.hourly?.time || [];
    const ws = j?.hourly?.wind_speed_10m || [];
    const wg = j?.hourly?.wind_gusts_10m || [];
    const wd = j?.hourly?.wind_direction_10m || [];

    function pickAt(hh){
      const idx = times.findIndex(t => t.endsWith(`${String(hh).padStart(2,'0')}:00`));
      if (idx === -1) return { speed: NaN, gust: NaN, dir: NaN };
      const K2KT = 0.5399568; // km/h -> knots
      return {
        speed: (ws[idx] ?? 0) * K2KT,
        gust:  (wg[idx] ?? 0) * K2KT,
        dir:   (wd[idx] ?? 0)
      };
    }

    const payload = {
      morning: pickAt(6),
      noon:    pickAt(12),
      evening: pickAt(18)
    };

    return Response.json(payload, { status: 200 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
};
