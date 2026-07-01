# VedaClock Production Routing

MVP-06 target public same-origin flow:

```text
https://vedascope.ru/veda-clock/
https://vedascope.ru/api/v1/veda-clock/state
```

The static site serves `/veda-clock/`. The astro backend serves `/api/v1/veda-clock/state`.
Do not implement this endpoint in the static site or account API.

## Current Production Setup

Known repository notes identify:

- site repository on VPS: `/var/www/vedascope-site/repo`;
- public static folder: `/var/www/vedascope-site/current`;
- astro backend service: `vedascope-panchanga.service`;
- astro backend app path: `/root/vedascope-panchanga`;
- existing astro local checks use `http://127.0.0.1:8000`;
- account-api deployment notes reserve `127.0.0.1:8010`, so VedaClock must not be routed there.

The actual production nginx server block is not present in this repository. Apply the route in the live nginx config on the VPS.
An example snippet is also tracked in the astro backend repository at
`deploy/nginx/veda-clock-location.conf.example`.

## Nginx Route

Add this before generic static-file fallback locations:

```nginx
location /api/v1/veda-clock/ {
  proxy_pass http://127.0.0.1:8000/api/v1/veda-clock/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Keep existing routes such as `/api/panchanga`, `/api/grahas`, and `/api/locations/search` unchanged.

## Static Deploy

Publish the static VedaClock files to the public static folder along with the rest of the site:

```text
/veda-clock/index.html
/assets/js/veda-clock-preview.mjs
/assets/js/veda-clock-renderer.mjs
/assets/js/veda-clock-state.mjs
/assets/js/veda-clock-state.d.ts
/assets/css/veda-clock.css
/docs/veda-clock-state.sample.json
```

Production frontend requests must use the relative URL:

```text
/api/v1/veda-clock/state
```

Do not use `apiBase` in production URLs.

## Deploy Checks

Run on the VPS after syncing backend code:

```bash
cd /root/vedascope-panchanga
python -m py_compile main.py astro/veda_clock.py astro/chart.py
systemctl restart vedascope-panchanga.service
systemctl status vedascope-panchanga.service
curl 'http://127.0.0.1:8000/api/v1/veda-clock/state?lat=55.7558&lon=37.6173&timezone=Europe/Moscow'
```

Validate nginx before reload:

```bash
nginx -t
systemctl reload nginx
```

Public smoke from any machine:

```bash
node scripts/veda-clock-smoke.mjs https://vedascope.ru
```

Browser check:

```text
https://vedascope.ru/veda-clock/?debug=1&lat=55.7558&lon=37.6173&timezone=Europe/Moscow
```

Expected debug values:

- `source: api-state`;
- `requestUrl: /api/v1/veda-clock/state?...` or same-origin absolute URL;
- `calculationInstantUtc` present;
- warnings `none`;
- Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke present in the backend response.

## Local CORS

The backend only allows local browser origins for development:

```text
http://localhost:<port>
http://127.0.0.1:<port>
```

Production same-origin requests do not need CORS. Do not broaden production CORS.

## Rollback

1. Remove or comment the nginx `location /api/v1/veda-clock/` block.
2. Run `nginx -t`.
3. Reload nginx.
4. If backend code was deployed only for VedaClock and must be reverted, roll back `/root/vedascope-panchanga` to the previous release and restart `vedascope-panchanga.service`.
5. If static files were deployed only for VedaClock, remove `/veda-clock/` and the VedaClock assets from the published static folder or roll back `/var/www/vedascope-site/current`.

Existing `/api/panchanga`, `/api/grahas`, `/api/locations/search`, and static site routes should remain unaffected.
