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

This is not production authentication. Future account work should replace it with real user sessions, auth identities, and Telegram account linking.

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
