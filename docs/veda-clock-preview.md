# VedaClock Preview

VedaClock preview is a static web page that renders `VedaClockState` as an SVG-only clock.

## Open Preview

Start a local static server from the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/veda-clock/
```

## Real Backend In Dev

Start the astro backend from `/Users/a1/PANCHANGA_AI/astro-engine`:

```bash
venv/bin/uvicorn main:app --host 127.0.0.1 --port 8010
```

Start the static preview from this repository:

```bash
python3 -m http.server 8000
```

Open the preview with a local backend base:

```text
http://localhost:8000/veda-clock/?debug=1&apiBase=http://127.0.0.1:8010&lat=55.7558&lon=37.6173&timezone=Europe/Moscow
```

Expected debug source when the backend is healthy:

```text
api-state
```

The `apiBase` parameter is for local testing only. Production should use same-origin routing.

## Mock And Debug

Use the sample state from `docs/veda-clock-state.sample.json`:

```text
http://localhost:8000/veda-clock/?mock=1
```

Show the JSON state under the clock:

```text
http://localhost:8000/veda-clock/?mock=1&debug=1
```

Debug mode is only enabled with `debug=1`. It shows source, load time, request URL, datetime, timezone, `calculationInstantUtc`, active segment lists, warnings, and export buttons.

## Data Loading

The preview loads data in this order:

1. `mock=1`: `docs/veda-clock-state.sample.json`, then embedded fallback.
2. `/api/v1/veda-clock/state`, with URL params forwarded.
3. `/api/grahas`, with the same location/timezone params where supported, converted with `buildVedaClockState`.
4. `localStorage` cache under `vedaClock:lastState:v1`.
5. Embedded fallback mock.

The page should still render when backend endpoints are unavailable.

Successful API loads from `/api/v1/veda-clock/state` and `/api/grahas` are cached. Sample and embedded fallback data are not saved as backend cache.

The main state endpoint response is validated before use. The preview requires `schemaVersion` to start with `veda-clock-state/`, a `grahas` array, all Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke grahas, and the derived fields used by the renderer. Invalid API responses continue through the fallback chain instead of breaking the screen.

## Request Params

The loader forwards these URL params to `/api/v1/veda-clock/state`:

- `lat`
- `lon`
- `timezone`
- `ayanamsha`
- `lang`
- `datetime`

Example same-origin URL:

```text
/veda-clock/?debug=1&lat=55.7558&lon=37.6173&timezone=Europe/Moscow
```

Example local split-origin URL:

```text
/veda-clock/?debug=1&apiBase=http://127.0.0.1:8010&lat=55.7558&lon=37.6173&timezone=Europe/Moscow
```

If `timezone` is absent, the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone` value is used when available. If `lat` and `lon` are absent, the loader tries an existing saved project location from `localStorage`; otherwise it omits coordinates and lets the backend defaults apply. The preview does not request browser geolocation permission.

## Time Sync

The hands use `createClockTimeSource(state)`:

- prefer `state.datetime` when it includes `Z` or a numeric offset;
- otherwise use `state.time`;
- otherwise use the browser's current time;
- store `baseDateMs` and `loadedAtMs`;
- current hand time is `baseDateMs + (Date.now() - loadedAtMs)`.

The displayed date stays `state.dateLabel` when present.

## Polling

Normal mode refreshes astro state every 60 seconds.

Override with:

```text
http://localhost:8000/veda-clock/?refreshMs=30000
```

Minimum refresh is 10000 ms. `mock=1` disables polling.

On refresh success, static SVG layers are rerendered and the time source is reset. On refresh failure, the current state remains visible and a warning is logged.

`mock=1` disables both initial backend loading and polling. It should make no `/api` calls.

## Same-Origin Routing

Production should expose one public origin:

```text
/veda-clock/
/api/v1/veda-clock/state
```

This static repository serves `/veda-clock/`. The astro backend serves `/api/v1/veda-clock/state`. The deployment layer should route `/api/v1/veda-clock/*` to astro-engine without adding another frontend endpoint.

Nginx-style example:

```nginx
location /api/v1/veda-clock/ {
  proxy_pass http://127.0.0.1:8010/api/v1/veda-clock/;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location / {
  root /var/www/vedascope-site;
  try_files $uri $uri/ =404;
}
```

Caddy-style example:

```caddy
handle /api/v1/veda-clock/* {
  reverse_proxy 127.0.0.1:8010
}

handle {
  root * /var/www/vedascope-site
  file_server
}
```

Cloudflare/Vercel-style routing should use the same rule: forward `/api/v1/veda-clock/*` to astro-engine and serve the static site for `/veda-clock/`.

Final production proxy/deployment config may live outside this repository.

See `docs/veda-clock-production-routing.md` for the current production route checklist and rollback notes.

## `/api/grahas` Fallback

The bridge accepts these response shapes:

```json
[{ "key": "sun", "longitude": 1 }]
```

```json
{ "grahas": [{ "key": "moon", "longitude": 2 }] }
```

```json
{ "planets": [{ "key": "mars", "siderealLongitude": 3 }] }
```

```json
{ "data": { "grahas": [{ "key": "mercury", "longitude_deg": 4 }] } }
```

Partial graha lists are allowed, but debug mode reports a warning. Grahas without a longitude are skipped.

## Export

In debug mode, use the buttons under the clock:

- `Export SVG`;
- `Export PNG`.

The same actions are exposed in the browser console:

```js
window.vedaClockExportSvg()
window.vedaClockExportPng()
```

SVG export serializes the current SVG. PNG export renders the current SVG through `Image` and `Canvas` at 2000x2000 by default. Export preserves the current hand positions.

## Smoke Test

Validate the real endpoint or same-origin proxy:

```bash
node scripts/veda-clock-smoke.mjs http://127.0.0.1:8010
```

With a local same-origin proxy/static server:

```bash
node scripts/veda-clock-smoke.mjs http://127.0.0.1:8000
```

The script fetches `/api/v1/veda-clock/state` with Moscow test params, verifies the VedaClockState shape, checks Su..Ke, and confirms active segment arrays exist.

## Visible Layers

- Outer square ring: 108 padas.
- Inner square ring: 27 nakshatras with quiet abbreviated labels.
- South Indian 4x4 chart: 12 fixed rashi cells.
- Grahas: placed in cells by `graha.rashi`.
- Center: analog hands and `state.dateLabel`.

## Active Segment Check

For the bundled mock, active nakshatras are:

```text
5, 6, 7, 8, 11, 12, 17, 24, 26
```

Active padas are:

```text
18, 23, 28, 32, 41, 46, 67, 95, 102
```

Only these indices should be highlighted. The renderer does not add decorative random highlights and does not separately highlight the lunar nakshatra unless it is present in `state.activeNakshatras`.

## Limitations

- Full timezone conversion is not attempted without an offset-aware backend response or timezone library.
- The real `/api/v1/veda-clock/state` endpoint belongs to the astro backend, not this static repo.
- Final production proxy/deployment routing may live outside this repository.
- iOS live wallpaper, Android wallpaper, widgets, and mobile app shells are out of scope for this preview.
