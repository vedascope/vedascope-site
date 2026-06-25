# vedascope-account-api

`vedascope-account-api` is the future central backend for vedascope accounts. It will own users, authentication identities, saved birth charts, user calculation settings, and reusable astrology calculation snapshots.

This is the first backend foundation only. It is not deployed yet, does not connect to nginx, does not modify production files, and does not call the existing Panchanga service.

Production deployment is expected later at:

```text
/root/vedascope-account-api
```

## Local setup

Use Python 3.11 or newer.

```bash
cd services/account-api
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env
```

Create a local PostgreSQL database that matches `DATABASE_URL` in `.env`, or edit the value for your local database.

## Run locally

```bash
uvicorn app.main:app --reload
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "vedascope-account-api"
}
```

## Development account identity

The first account endpoints use a temporary `X-User-Id` request header to identify a user during local development and tests.

This is a dev-only identity mechanism. When `APP_ENV=production`, protected account routes reject `X-User-Id` with HTTP 403 until real authentication is implemented. `/health` and `/api/account/health` remain public.

This is not production authentication. Future account work should replace it with real user sessions, auth identities, and Telegram account linking.

## Passwordless email auth foundation

The account API has the first passwordless email flow:

- `POST /api/account/auth/request-code`;
- `POST /api/account/auth/verify-code`;
- `POST /api/account/auth/logout`.

`request-code` creates a short-lived one-time code and stores only its hash. In local, test, and development modes the response includes `dev_code` for testing. In production, the raw code is not returned.

Real SMTP/email sending is not implemented yet. Production creates the login code and responds generically, ready for a later email provider integration.

Successful `verify-code` creates a user if needed, links an `email` auth identity, creates a hashed session token, and sets the `vedascope_session` HTTP-only cookie.

`X-User-Id` remains dev-only and is blocked in production. CAPTCHA provider integration is planned before public launch; for now `CAPTCHA_REQUIRED=false` ignores `captcha_token`, and `CAPTCHA_REQUIRED=true` returns a clear not-configured error.

## Saved charts API

Saved birth chart endpoints currently use the temporary `X-User-Id` development identity:

- `GET /api/account/charts`
- `POST /api/account/charts`
- `GET /api/account/charts/{chart_id}`
- `PATCH /api/account/charts/{chart_id}`
- `DELETE /api/account/charts/{chart_id}`

Calculations are not implemented yet. Charts currently store source birth data only; divisional charts, dashas, yogas, and other calculations will be derived later by the astro-engine.

## Tests

Run the test suite from this service directory:

```bash
pytest
```

Run a Python syntax check for the app and tests:

```bash
python -m compileall -q app tests
```

## Database smoke checks

The test suite includes lightweight database metadata and Alembic checks. Alembic offline SQL generation renders migration SQL without connecting to a live PostgreSQL server:

```bash
alembic upgrade head --sql
pytest
```

## Alembic migrations

Run migrations against a local database only:

```bash
alembic upgrade head
```

Create a new migration after model changes:

```bash
alembic revision --autogenerate -m "Describe change"
```

Do not apply these migrations to any production database until deployment architecture and credentials are defined.
