# Vedascope platform architecture

Date: 2026-06-25.

This document defines the target architecture for the vedascope personal account, saved charts, calculation settings, account API, astro-engine, Telegram WebApp, future mobile app, Digital Rishi, paid materials, and subscriptions.

Core principle:

```text
One user -> one central database -> one API layer -> many clients
```

Clients include the desktop website, mobile website, Telegram WebApp, future mobile app, and Digital Rishi bot. No client should own a separate user database or a separate copy of saved chart data.

## 1. Platform overview

`/account/` is only a frontend client. It may be served by the static `vedascope-site` repository, but it must not be the source of truth for users, saved birth charts, settings, purchases, subscriptions, or library access.

Real user data belongs in a central backend and PostgreSQL database. The account UI, Telegram WebApp, mobile website, future mobile app, and Digital Rishi should all authenticate against the same account API and read/write the same user records.

The current public site can remain static. The account system should be added as a separate backend-backed product area, not mixed into public page rendering.

## 2. Services and responsibilities

### `vedascope-site`

Static website and frontend clients:

- public pages;
- `/panchanga/` and current browser UI;
- future `/account/` frontend;
- static assets, events, legal pages, and documentation.

This repository should not contain production secrets, database migrations for backend services, or long-running account logic. GitHub remains the source of truth for site changes.

### `vedascope-account-api`

Central account backend:

- users and authentication;
- saved birth charts;
- user calculation settings;
- chart-specific calculation settings;
- subscriptions and purchases;
- library and course access;
- Telegram account links;
- API authorization for frontend clients, Telegram WebApp, future mobile app, and Digital Rishi.

Recommended stack for the first implementation phase:

- FastAPI;
- PostgreSQL;
- SQLAlchemy;
- Alembic;
- Pydantic schemas;
- service-level tests.

### `vedascope-astro-engine`

Calculation service for all Jyotish logic:

- Panchanga;
- natal charts;
- vargas;
- dashas;
- transits;
- muhurta;
- yogas;
- strengths;
- reports and PDF-ready data.

The account API should call the astro-engine for calculations instead of embedding calculation logic directly. This keeps user/account concerns separate from astrology algorithms and makes the same engine reusable by public tools, account features, Telegram, mobile, and background workers.

### PostgreSQL

Central persistent database for users, charts, settings, subscriptions, purchases, library access, Telegram links, and reusable calculation snapshots.

PostgreSQL is the only long-term source of truth for account data. Static JSON files may remain useful for public site content, seed data, and frontend fallback data, but not for user-owned account records.

### Redis later

Redis can be introduced after the first account API is stable:

- short-lived sessions or token metadata;
- rate limits;
- cache for expensive calculations;
- temporary Telegram login states;
- background job coordination.

Redis must remain disposable. Durable user data stays in PostgreSQL.

### Workers later

Background workers can be added for tasks that should not block API requests:

- PDF generation;
- heavy reports;
- recurring transit calculations;
- paid report delivery;
- AI-assisted interpretation;
- email or Telegram notifications;
- batch cache warming.

### Digital Rishi

Digital Rishi is the knowledge and AI layer. It should use account API permissions and library access rather than bypassing them.

Responsibilities:

- answer questions using approved knowledge sources;
- use saved charts and settings with explicit account authorization;
- respect subscriptions, purchases, and library access;
- request calculations from the account API or astro-engine instead of creating a separate data model.

## 3. Existing Panchanga migration strategy

The current Panchanga/FastAPI service is the first working module of the future astro-engine. It already supports production functionality and must not be broken while account architecture is being introduced.

For now:

- keep the existing Panchanga service working and separate;
- do not refactor Panchanga as part of account setup;
- keep `/panchanga/` compatible with the production service;
- document future contracts before moving code.

Later, the current service can evolve into `/root/vedascope-astro-engine` or be integrated into a dedicated `vedascope-astro-engine` repository. That migration should be done carefully:

1. freeze the existing public API behavior with tests;
2. extract reusable calculation core;
3. add versioned schemas;
4. migrate endpoints one at a time;
5. keep backward-compatible Panchanga routes until all clients have moved.

## 4. Astro-engine modules

The astro-engine should eventually support these modules:

- Panchanga;
- natal chart calculation;
- grahas;
- lagna;
- divisional charts / vargas;
- multiple dasha systems;
- Vimshottari and other dashas from Moon nakshatra;
- Vimshottari and other dashas from any planet's nakshatra;
- dasha start from Lagna or custom longitude;
- transits;
- muhurta selection;
- varshaphala;
- compatibility;
- planetary strength and weakness evaluation;
- yogas, including Nabhasa yogas and a future large yoga catalog;
- reusable report data;
- PDF exports.

Important modeling rule: divisional charts are derived calculations from one birth chart. They are not separate user-owned birth charts unless the user explicitly creates a separate source birth record.

## 5. Suggested astro-engine folder structure

```text
vedascope-astro-engine/
  app/
    api/
      panchanga.py
      chart.py
      vargas.py
      dashas.py
      transits.py
      muhurta.py
      compatibility.py
      varshaphala.py
      strengths.py
      yogas.py
    core/
      config.py
      time.py
      ephemeris.py
      coordinates.py
      versioning.py
      errors.py
    calculations/
      panchanga.py
      chart.py
      grahas.py
      lagna.py
      transits.py
      muhurta.py
      compatibility.py
      varshaphala.py
      dashas/
        vimshottari.py
        yogini.py
        base.py
      vargas/
        d1.py
        d9.py
        d10.py
        base.py
      yogas/
        nabhasa.py
        catalog.py
        evaluator.py
      strengths/
        shadbala.py
        dignity.py
        combustion.py
        retrograde.py
    schemas/
      common.py
      chart.py
      panchanga.py
      dashas.py
      vargas.py
      yogas.py
      strengths.py
    tests/
      test_panchanga.py
      test_chart.py
      test_dashas.py
      test_vargas.py
      test_yogas.py
      test_strengths.py
```

This structure keeps HTTP routes thin, calculation logic reusable, schemas explicit, and tests close to the algorithms they protect.

## 6. PostgreSQL schema draft

Initial tables should be small, explicit, and migration-friendly.

### `users`

- `id` UUID primary key;
- `email` nullable unique;
- `display_name` nullable;
- `preferred_language`;
- `created_at`;
- `updated_at`;
- `last_login_at`;
- `is_active`.

### `auth_identities`

- `id` UUID primary key;
- `user_id` foreign key to `users.id`;
- `provider` such as `email`, `telegram`, `google`, `apple`;
- `provider_user_id`;
- `email` nullable;
- `metadata_json` JSONB;
- `created_at`;
- unique index on `provider`, `provider_user_id`.

### `user_settings`

- `id` UUID primary key;
- `user_id` unique foreign key;
- `ayanamsa`;
- `house_system`;
- `node_type`;
- `language`;
- `default_timezone`;
- `enabled_vargas` JSONB;
- `dasha_system`;
- `dasha_start_reference`;
- `custom_dasha_longitude` nullable numeric;
- `settings_json` JSONB;
- `created_at`;
- `updated_at`.

### `birth_charts`

Stores source birth data, not derived vargas.

- `id` UUID primary key;
- `user_id` foreign key;
- `name`;
- `native_name` nullable;
- `birth_date`;
- `birth_time` nullable;
- `birth_time_accuracy` such as `exact`, `approximate`, `unknown`;
- `timezone`;
- `place_name`;
- `latitude`;
- `longitude`;
- `notes` nullable;
- `is_primary`;
- `created_at`;
- `updated_at`;
- `deleted_at` nullable.

### `chart_calculation_settings`

Optional per-chart overrides.

- `id` UUID primary key;
- `user_id` foreign key;
- `chart_id` foreign key to `birth_charts.id`;
- `ayanamsa` nullable;
- `house_system` nullable;
- `node_type` nullable;
- `enabled_vargas` JSONB nullable;
- `dasha_system` nullable;
- `dasha_start_reference` nullable;
- `custom_dasha_longitude` nullable numeric;
- `settings_json` JSONB;
- `created_at`;
- `updated_at`.

### `astro_calculations`

Reusable calculation snapshots and cache records.

- `id` UUID primary key;
- `user_id` nullable foreign key;
- `chart_id` nullable foreign key to `birth_charts.id`;
- `calculation_type`;
- `calculation_key`;
- `input_json` JSONB;
- `settings_json` JSONB;
- `result_json` JSONB;
- `engine_version`;
- `algorithm_version`;
- `input_hash`;
- `created_at`;
- index on `user_id`, `chart_id`, `calculation_type`;
- unique index on `calculation_type`, `calculation_key`, `input_hash`, `engine_version`, `algorithm_version` where appropriate.

### `user_notes`

- `id` UUID primary key;
- `user_id` foreign key;
- `chart_id` nullable foreign key;
- `title` nullable;
- `body`;
- `tags` JSONB;
- `created_at`;
- `updated_at`.

### `subscriptions`

- `id` UUID primary key;
- `user_id` foreign key;
- `provider`;
- `provider_subscription_id`;
- `plan_key`;
- `status`;
- `current_period_start`;
- `current_period_end`;
- `cancel_at_period_end`;
- `metadata_json` JSONB;
- `created_at`;
- `updated_at`.

### `purchases`

- `id` UUID primary key;
- `user_id` foreign key;
- `provider`;
- `provider_purchase_id`;
- `item_type`;
- `item_id`;
- `amount`;
- `currency`;
- `status`;
- `purchased_at`;
- `metadata_json` JSONB.

### `library_items`

- `id` UUID primary key;
- `slug` unique;
- `title`;
- `item_type` such as `article`, `course`, `video`, `pdf`, `report`;
- `access_level`;
- `published_at` nullable;
- `metadata_json` JSONB;
- `created_at`;
- `updated_at`.

### `library_access`

- `id` UUID primary key;
- `user_id` foreign key;
- `library_item_id` foreign key;
- `source_type` such as `purchase`, `subscription`, `manual_grant`;
- `source_id` nullable;
- `starts_at`;
- `ends_at` nullable;
- `created_at`.

### `telegram_links`

- `id` UUID primary key;
- `user_id` foreign key;
- `telegram_user_id` unique;
- `telegram_username` nullable;
- `linked_at`;
- `last_seen_at`;
- `metadata_json` JSONB.

### `yoga_definitions`

- `id` UUID primary key;
- `key` unique;
- `name`;
- `category`;
- `tradition` nullable;
- `description`;
- `rules_json` JSONB;
- `source_references` JSONB;
- `is_active`;
- `created_at`;
- `updated_at`.

## 7. Calculation settings model

Calculation settings must be explicit, versioned, and stored with each reusable calculation snapshot.

Core settings:

- `ayanamsa`;
- `house_system`;
- `node_type`: `mean` or `true`;
- `language`;
- `default_timezone`;
- `enabled_vargas`;
- `dasha_system`;
- `dasha_start_reference`;
- `custom_dasha_longitude` when the reference is custom;
- `engine_version`;
- `algorithm_version`.

Allowed dasha start references:

- Moon;
- Sun;
- Mars;
- Mercury;
- Jupiter;
- Venus;
- Saturn;
- Rahu;
- Ketu;
- Lagna;
- custom longitude.

Versioning rules:

- every calculation response should include `engine_version` and `algorithm_version`;
- every cached calculation should store the input, settings, result, versions, and input hash;
- changing an algorithm should create a new `algorithm_version`;
- old snapshots should remain readable for historical consistency;
- recalculation should be explicit when a user wants updated algorithms.

## 8. API contract draft

The account API owns user authorization and saved data. The astro API owns calculations. They may initially live behind the same domain or reverse proxy, but their responsibilities should remain separate.

### Account endpoints

```http
GET /api/account/me
PATCH /api/account/settings
GET /api/account/charts
POST /api/account/charts
GET /api/account/charts/{id}
PATCH /api/account/charts/{id}
DELETE /api/account/charts/{id}
POST /api/account/charts/{id}/calculate
GET /api/account/subscription
GET /api/account/library
POST /api/account/telegram/link
```

`POST /api/account/charts/{id}/calculate` should accept a calculation request such as:

```json
{
  "calculation_type": "dashas",
  "calculation_key": "vimshottari:moon",
  "settings": {
    "ayanamsa": "lahiri",
    "node_type": "mean",
    "dasha_start_reference": "Moon"
  }
}
```

The account API should authorize the user, load the chart and settings, call the astro-engine, store or reuse an `astro_calculations` snapshot, and return the result.

### Astro endpoints

```http
POST /api/astro/chart
POST /api/astro/vargas
POST /api/astro/dashas
POST /api/astro/transits
POST /api/astro/muhurta/search
POST /api/astro/compatibility
POST /api/astro/varshaphala
POST /api/astro/strengths
POST /api/astro/yogas
GET /api/astro/panchanga
```

Astro endpoints should be stateless from the user perspective. They receive normalized input and settings, return calculation output and version metadata, and avoid owning account records.

## 9. Telegram WebApp and mobile app strategy

Telegram WebApp and the future mobile app must not have separate databases.

They should:

- authenticate or link through `vedascope-account-api`;
- use the same `users` table;
- use the same saved `birth_charts`;
- use the same `user_settings`;
- use the same subscription and library access checks;
- request calculations through the same account API and astro-engine flow.

Telegram-specific state belongs in `telegram_links` and temporary login/session storage. A Telegram user can be linked to an existing vedascope account instead of becoming a separate identity silo.

The mobile app should be treated as another client of the same API. It may have local offline cache, but PostgreSQL remains the source of truth.

## 10. Implementation roadmap

### Phase 1: architecture document

Create this document and use it as the baseline for account and astro-engine planning.

### Phase 2: account API skeleton

Create `vedascope-account-api` with FastAPI, PostgreSQL, SQLAlchemy, Alembic, configuration, health check, and test setup.

### Phase 3: users, settings, and birth charts schema

Add migrations and models for `users`, `auth_identities`, `user_settings`, `birth_charts`, and `chart_calculation_settings`.

### Phase 4: saved charts API

Implement authenticated CRUD endpoints for saved birth charts and calculation settings.

### Phase 5: `/account/` frontend

Build the account frontend in `vedascope-site` and consume the account API. Keep the UI client-side or statically served unless a server-rendered frontend becomes necessary.

### Phase 6: connect astro-engine chart calculation

Connect saved charts to chart calculation through the astro-engine contract. Store reusable results in `astro_calculations`.

### Phase 7: add vargas

Add divisional chart calculation as derived output from the source birth chart.

### Phase 8: add dashas

Add Vimshottari first, then additional dasha systems. Support start references from Moon, other grahas, Lagna, and custom longitude.

### Phase 9: add yogas, strengths, and transits

Add Nabhasa yogas, the first yoga catalog structure, planetary strengths/weaknesses, and transit calculations.

### Phase 10: Telegram WebApp

Add Telegram account linking and a Telegram WebApp client that uses the same account API, charts, settings, and access rules.

### Phase 11: subscriptions and payments

Implement subscription and purchase tables, payment provider integration, webhook handling, and access checks.

### Phase 12: Digital Rishi and library integration

Connect Digital Rishi to account permissions, saved charts, library access, and approved knowledge sources.

### Phase 13: mobile / PWA

Add a PWA or native mobile client on top of the same account API. Use local cache only as a client optimization.

## Operational notes

- GitHub is the source of truth.
- The working site repository on the RU VPS is `/var/www/vedascope-site/repo`.
- The production static folder is `/var/www/vedascope-site/current`.
- Deployments should publish built/static site files to `current` without making production-only source edits.
- Existing Panchanga behavior should be protected before any future migration into the astro-engine.
- No frontend, backend, auth, database migrations, payments, or Telegram login are implemented by this document.
