// netlify/functions/tides.js
export default async (req, context) => {
  try {
    const key = process.env.WORLDTIDES_API_KEY; // Node env
    if (!key) return Response.json({ error: 'WORLDTIDES_API_KEY not set' }, { status: 500 });

    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get('lat'));
    const lon = parseFloat(url.searchParams.get('lon'));
    const date = url.searchParams.get('date'); // YYYY-MM-DD (IST target day)

    if (Number.isNaN(lat) || Number.isNaN(lon) || !date) {
      return Response.json({ error: 'lat, lon, date required' }, { status: 400 });
    }

    // 1) Try WorldTides "extremes" for the IST calendar day
    const ex = new URL('https://www.worldtides.info/api');
    ex.searchParams.set('extremes', '');
    ex.searchParams.set('date', date);
    ex.searchParams.set('lat', String(lat));
    ex.searchParams.set('lon', String(lon));
    ex.searchParams.set('key', key);

    const r1 = await fetch(ex.toString(), { headers: { accept: 'application/json' } });
    const body1 = await r1.text();
    if (r1.ok) {
      let j1;
      try { j1 = JSON.parse(body1); } catch { /* non-JSON body */ }
      if (j1?.extremes?.length) {
        const extremes = j1.extremes.map(x => ({
          type: x.type,                                   // "High" / "Low"
          timeISO: new Date(x.dt * 1000).toISOString(),   // ISO for client to format to IST
          height: typeof x.height === 'number' ? x.height : undefined
        }));
        return Response.json({ extremes, note: j1?.status || 'extremes' }, { status: 200 });
      }
    }

    // 2) Fallback: pull 48h of heights around the IST day and detect local maxima/minima
    // Convert IST midnight of "date" to UTC epoch seconds (IST = UTC+05:30)
    const [Y, M, D] = date.split('-').map(n => parseInt(n, 10));
    const startUTC = Math.floor(new Date(Date.UTC(Y, M - 1, D, 0 - 5, 30)).getTime() / 1000);
    const length = 48 * 3600;

    const hurl = new URL('https://www.worldtides.info/api');
    hurl.searchParams.set('heights', '');
    hurl.searchParams.set('start', String(startUTC));
    hurl.searchParams.set('length', String(length));
    hurl.searchParams.set('lat', String(lat));
    hurl.searchParams.set('lon', String(lon));
    hurl.searchParams.set('key', key);

    const r2 = await fetch(hurl.toString(), { headers: { accept: 'application/json' } });
    const body2 = await r2.text();
    if (!r2.ok) {
      // Surface both attempts for quick diagnosis
      return Response.json({
        error: 'WorldTides request failed',
        extremes_attempt: { status: r1.status, body: body1?.slice(0, 400) },
        heights_attempt: { status: r2.status, body: body2?.slice(0, 400) }
      }, { status: 502 });
    }

    const j2 = JSON.parse(body2);
    const series = j2?.heights || [];
    if (series.length < 5) {
      return Response.json({ extremes: [], note: j2?.status || 'no heights/extremes found' }, { status: 200 });
    }

    // Detect local maxima/minima
    const peaks = [];
    for (let i = 1; i < series.length - 1; i++) {
      const a = series[i - 1].height, b = series[i].height, c = series[i + 1].height;
      if (b > a && b > c) peaks.push({ type: 'High', dt: series[i].dt, height: b });
      if (b < a && b < c) peaks.push({ type: 'Low',  dt: series[i].dt, height: b });
    }

    // Keep peaks that fall on the requested IST date
    const isSameISTDate = (unix) => {
      const istDate = new Date(unix * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
      return istDate === date;
    };

    const extremes = peaks
      .filter(p => isSameISTDate(p.dt))
      .map(p => ({ type: p.type, timeISO: new Date(p.dt * 1000).toISOString(), height: p.height }));

    return Response.json({ extremes, note: j2?.status || 'heights-fallback' }, { status: 200 });

  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
};
