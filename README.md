# ShieldIQ

Insurance protection planning for households in India. ShieldIQ takes a family's income, loans, dependents and
existing cover, and works out how much life, health, critical-illness and accident cover they need, what the gaps cost
to close, and which plan types fit. Insurers are compared on official IRDAI claim and service records. Optional AI
(Gemini, with OpenAI as fallback) explains results, answers questions and reads policy PDFs.

Figures are guidance, not regulated financial advice. Premiums are ShieldIQ estimates, not insurer quotes.

## Layout

| Folder | What it is |
|---|---|
| `backend/` | Express + TypeScript API. Postgres via `pg`; an embedded Postgres (PGlite) when no database URL is set. |
| `frontend/` | React 19 + Vite + Tailwind single-page app. `e2e/` holds the Playwright browser tests. |
| `docker-compose.yml` | Postgres 17 and the backend, for local use. |
| `.github/workflows/ci.yml` | Lint, unit tests, builds, browser tests and a Docker build on every push and pull request. |

Requirements: Node 22 (22.19 or newer recommended), pnpm 10 (`corepack enable`), and Docker for the Postgres setup.

## Run it locally

### With Docker (Postgres)

```sh
cp backend/.env.example backend/.env    # add GEMINI_API_KEY and/or OPENAI_API_KEY for AI features
docker compose up --build -d            # API on :5001, Postgres on :5432
cd frontend && pnpm install && pnpm dev # app on http://localhost:5173 (proxies /api to :5001)
```

Postgres is reachable from any database tool at `localhost:5432`, database and user `shieldiq`, password
`shieldiq-dev` (override with `POSTGRES_PASSWORD`). Data lives in the `pgdata` volume and survives restarts.
After changing backend code, run `docker compose up --build -d` again: the container does not pick up edits.

### Without Docker

```sh
cd backend && pnpm install && pnpm dev   # API on :5001, embedded Postgres stored in backend/data/pglite
cd frontend && pnpm install && pnpm dev  # app on http://localhost:5173
```

Both ways seed a demo account in development: `alex.vance@shieldiq.internal` / `Password123!`
(there is also a one-click demo button on the sign-in screen).

## Tests

| Command | Where | What |
|---|---|---|
| `pnpm test` | `backend/` | API, strategy engine, security and database tests (embedded Postgres in memory). |
| `pnpm test` | `frontend/` | Component tests (Vitest + Testing Library). |
| `pnpm e2e` | `frontend/` | Browser tests: every screen, onboarding, account flows, accessibility (WCAG 2 AA, both themes) and layout from 320px to 2560px. Starts its own backend and frontend on ports 5291/5299. |
| `pnpm e2e:ai` | `frontend/` | AI features against the real provider. Needs API keys in `backend/.env`; each run makes paid calls. |

`pnpm e2e` uses your installed Chrome. To use Playwright's own browser instead: `pnpm exec playwright install chromium`.

## Configuration

Backend settings come from the environment or `backend/.env` (see `backend/.env.example`).

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | unset | Postgres connection string. Unset: embedded Postgres in `data/pglite` (or `PGLITE_DIR`). |
| `NODE_ENV` | production | `development` turns on the demo account, reset links in the log and non-Secure cookies. Anything else is treated as production. |
| `SEED_DEMO` | `false` | `true` creates the demo account outside development. |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated origins allowed to call the API with cookies. |
| `APP_URL` | `http://localhost:5173` | Base of password-reset links. |
| `TRUST_PROXY` | unset | Number of reverse-proxy hops, so rate limits see the real client IP. |
| `GEMINI_API_KEY`, `OPENAI_API_KEY` | unset | AI providers; Gemini is tried first. With neither, AI features are hidden. |
| `AI_DAILY_CALL_LIMIT`, `AI_IP_HOURLY_LIMIT` | 500, 60 | Caps on paid AI calls (all users per day; per IP per hour). |
| `AUTH_RATE_LIMIT_MAX` | 10 | Sign-in attempts per 15 minutes, per IP and per account. Raise only for automated tests. |
| `SENTRY_DSN` | unset | Sends server errors (type, message, stack, method, path, request id) to Sentry. |
| `FRONTEND_DIST` | `../frontend/dist` | Built frontend the API serves on the same origin. |

## Deploying

The API serves the built frontend itself when `frontend/dist` exists (or `FRONTEND_DIST` points at a build), which
keeps the app and API on one origin. That matters: the session cookie is `SameSite=Strict` and `Secure`.

1. **Database.** Use a managed Postgres and set `DATABASE_URL`. Tables are created and upgraded on startup.
   Back it up: managed snapshots, or a scheduled `pg_dump` (see below).
2. **Backend.** Build the image with `docker build ./backend`, or run `pnpm build && pnpm start` in `backend/`. The image
   contains the API only (production dependencies, non-root user); it does not include the frontend build.
3. **Frontend.** Run `pnpm build` in `frontend/` and either set `FRONTEND_DIST` to the output on the API host, or serve
   it from a CDN on the same domain with `/api` routed to the backend.
4. **HTTPS is required.** Cookies are `Secure` outside development, so sign-in only works over HTTPS (or on localhost).
5. **Production settings.** Leave `NODE_ENV` unset or `production`, keep `SEED_DEMO` off, set `CORS_ORIGIN` and
   `APP_URL` to your domain, `TRUST_PROXY` if behind a load balancer, and a real `POSTGRES_PASSWORD` if you use the
   compose file.
6. **Email.** There is no mail provider yet: password-reset links are only logged in development. Wire one up before
   real users need to reset passwords.

### Monitoring

- **Health:** `GET /api/v1/health` returns `200 {"status":"UP","database":"up"}`, or `503` with `"DOWN"` when the database
  doesn't answer within 3 seconds. Point an uptime monitor at it. The compose file uses it as the backend's healthcheck.
- **Logs:** one JSON object per line on stdout: every request (method, path without query string, status, duration)
  and every server error with its stack. Health polls are not logged. Ship stdout to your log service.
- **Request ids:** every response carries an `X-Request-Id` header (a proxy's own id is kept), and 500 responses include
  it as `requestId`, so a user's error report can be matched to the log line.
- **Error tracking:** set `SENTRY_DSN` and every 500 is also sent to Sentry, tagged with its request id. No request
  bodies or cookies are sent. Browser-side errors are not reported.

### Backups

`./scripts/backup-postgres.sh` dumps the compose Postgres to `backups/` (git-ignored) and keeps the newest 14
(`KEEP=30` to change). Schedule it with cron, e.g. `30 2 * * * cd /path/to/SheildIQ && ./scripts/backup-postgres.sh`.
Restore one with:

```sh
docker compose exec -T postgres pg_restore -U shieldiq -d shieldiq --clean --if-exists < backups/<file>.dump
```

Backups hold personal data: store copies somewhere access-controlled, and test a restore now and then.

### Moving data from the old SQLite database

Older versions stored data in `backend/data/shieldiq.db`. Copy it into Postgres (safe to run more than once):

```sh
cd backend
DATABASE_URL=postgres://shieldiq:shieldiq-dev@localhost:5432/shieldiq pnpm exec tsx src/db/import-sqlite.ts data/shieldiq.db
```

## Data sources

Insurer claim and service records (claims paid, speed, complaints, solvency, offices) come from the IRDAI Handbook on
Indian Insurance Statistics and Annual Report for FY 2024-25. They are kept in
`backend/src/services/insurer-records.ts`; the comment at the top of that file explains how to refresh them each year.

Compare ranks insurers for each household from these records (`backend/src/services/insurer-ranking.ts`): three-year
figures (FY 2022-23 to 2024-25) scored on fixed scales, with weights that shift for large cover, dependent parents and
smaller cities. Ask ShieldIQ explains that same ranking. It is presented as a ranking of published records, not advice to
buy from a particular insurer; have it reviewed against IRDAI's rules on insurance advice before launch.
