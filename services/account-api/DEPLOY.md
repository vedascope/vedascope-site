# vedascope-account-api deployment

Target server path:

```text
/root/vedascope-account-api
```

Source path in the site repository on the VPS:

```text
/var/www/vedascope-site/repo/services/account-api/
```

## Runtime

Systemd service name:

```text
vedascope-account-api.service
```

The service runs `uvicorn app.main:app` from `/root/vedascope-account-api` and binds to:

```text
127.0.0.1:8010
```

## Environment

Production environment file:

```text
/root/vedascope-account-api/.env
```

Required values:

```text
DATABASE_URL=postgresql+psycopg://vedascope_account:<PASSWORD>@localhost:5432/vedascope_account
APP_ENV=production
APP_NAME=vedascope-account-api
```

Store the generated database password only in the server `.env` file.

## Database

PostgreSQL database:

```text
vedascope_account
```

PostgreSQL user:

```text
vedascope_account
```

Run migrations from `/root/vedascope-account-api`:

```bash
source .venv/bin/activate
alembic upgrade head
```

## Nginx

Public route:

```text
https://vedascope.ru/api/account/
```

Proxy target:

```text
http://127.0.0.1:8010/api/account/
```

Health URLs:

```text
http://127.0.0.1:8010/health
http://127.0.0.1:8010/api/account/health
https://vedascope.ru/api/account/health
```

Always run `nginx -t` before reloading nginx.

## Current limitations

Authentication is still temporary and uses the development `X-User-Id` header only outside production. `APP_ENV=production` disables `X-User-Id` access for protected account routes. Real authentication and Telegram login are required before a public user-facing account launch.

There is no astro-engine integration yet. Saved birth charts currently store source birth data only, and calculations are not implemented.
