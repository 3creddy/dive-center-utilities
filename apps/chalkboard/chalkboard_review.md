# Chalkboard Project - Review & Recommendations

## Step 1 — Current Architecture & Flow

### Hosting & Config
- **Platform:** Netlify (frontend + backend functions).
- **Config:**
  - `netlify.toml` defines build settings and function routing.
  - Functions live in `/netlify/functions`.

### Frontend (index.html)
- Single HTML page with embedded JavaScript and CSS.
- **Features:**
  - Island toggle to switch between Havelock and Neil.
  - Wind section with speed, gust, and direction.
  - Compass-style arrow for wind direction.
  - Tide section formatted as a table with 4 rows (low/high/low/high) × 3 columns (type, time, height).
  - Fetches data from Netlify functions via `/api/...` endpoints.

### Backend
- **tides.js**
  - Calls WorldTides API with lat/long from query params.
  - Filters for next day’s high/low tides.
  - Returns simplified JSON array with `{ type, time, height }`.

- **wind.js**
  - Fetches wind data (speed, gust, direction) from `windy.js` helper.
  - Filters for tomorrow’s date.
  - Returns compact JSON with relevant forecast entries.

- **windy.js**
  - Shared utility to query Windy Point Forecast API.
  - Takes lat/long + API key from env vars.
  - Returns parsed data for calling functions.

### Data Flow
1. User selects island (frontend).
2. JS triggers:
   - `/api/tides?lat=...&lon=...`
   - `/api/wind?lat=...&lon=...`
3. Backend functions call respective APIs → format → return JSON.
4. Frontend updates wind cards + tide table.

---

## Step 2 — Optimisation Opportunities

### Frontend
- **CSS & Layout**
  - Fonts: still some fixed pixel sizes — could use `rem` or viewport-based units for better scaling on all devices.
  - Mobile-first layout could be further optimised with flex/grid media queries for better column stacking.
- **JS Logic**
  - Fetch calls could be parallelised with `Promise.all` to reduce load time.
  - Minimal error handling — show a friendly message if API fails instead of leaving blank space.

### Backend
- **Code Duplication**
  - Date handling & location constants could be centralised in a shared module instead of repeated in `tides.js` and `wind.js`.
- **Error Handling**
  - API errors currently return `500` but without much context. Could log details to Netlify’s console for debugging.
- **Caching**
  - WorldTides & Windy data could be cached in-memory (or via Netlify Edge functions) for a few hours to reduce API calls and improve speed.
- **Data Precision**
  - Windy API returns a lot of extra detail; you’re already trimming it, but you could also pre-format units (e.g., m/s to knots or km/h) server-side for consistency.

### Security
- API keys are correctly in env vars, but ensure no accidental exposure in logs or frontend code.
- Validate `lat`/`lon` query parameters to prevent abuse.

---

## Step 3 — Future Enhancement Backlog

**High-impact / Low-effort**
- Add a “last updated” timestamp for wind & tide sections.
- Add loading spinners or placeholders while fetching.
- Parallel fetch wind + tide data on island toggle.

**Medium-impact**
- Add Beaufort scale icon or category to wind display.
- Allow a “both islands” comparison view.
- Add moon phase + sunrise/sunset times for context with tides.

**Long-term**
- Offline cache via Service Worker so data remains viewable during boat trips.
- Expand forecast to 3 days ahead with swipe navigation.
- Integrate a small back-office toggle for quick data refresh without code deployment.
