# S2S Tigray Mentors

A mentorship matching app for a 345+ member university-applications community. Students request help (SAT, essays, recommendation letters, financial aid, visas and more), mentors respond, and organizers make and track matches.

See [PLAN.md](PLAN.md) for the 5-day build plan and [DEPLOY.md](DEPLOY.md) for going live.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS 4, shadcn/ui)
- **PostgreSQL** + **Prisma 7**
- **Better Auth**: Google sign-in and email magic links, with a role on each user
- **Python 3.12 + FastAPI**: analytics service for mentor scoring and pilot-metrics export (see below)
- **Vitest** and **pytest**: unit tests, plus integration tests against a real Postgres database and the live Python service
- **GitHub Actions**: lint, typecheck, test and build on every push and PR

## Roles

| Role | Home | Access |
|---|---|---|
| Student | `/student` | Own requests and matches |
| Mentor | `/mentor` | Open requests, own matches |
| Organizer | `/organizer` | All requests and mentors, matching, metrics |
| Admin | `/organizer` | Everything an organizer can do, plus role changes |

After signing in for the first time, users **onboard once**: they enter their name and choose "I'm applying" (student) or "I want to mentor". New mentors stay **pending** until an organizer approves them at `/organizer/mentors`, and only approved mentors can see and respond to requests. Emails listed in `SEED_ADMIN_EMAILS` become **admins** on first sign-in and skip onboarding. Clients can never set their own role.

Authorization works in three layers:

1. `src/proxy.ts` makes a fast cookie-only check and bounces signed-out users to `/sign-in`.
2. `requireRole()` in `src/lib/dal.ts` validates the session against the database and enforces the role on every protected page.
3. Every service in `src/server/` checks the acting user's role and ownership again, so server actions can't be called to bypass the UI. The integration tests in `tests/integration/` cover these rules.

## How matching works

1. A student posts a request. Mentors who know the topic see it and can say "I can help" or "Not for me".
2. Organizers open **Requests**, pick a request and see mentors ranked by: offered to help → knows the topic → most free spots (`src/lib/match-score.ts`). Mentors at capacity, unapproved mentors and mentors who passed can't be matched.
3. Confirming a match emails both people each other's contact details. Organizers can move a match to another mentor or end it, either reopening the request or closing it. Every change is logged in `match_event`.
4. Either side marks the match complete, and the student is asked for a 1–5 rating.

## Pilot metrics

The organizer overview (`src/server/metrics.ts`) tracks:

- **Match completion rate**: completed ÷ (completed + ended + quiet). A match is *quiet* when it's been active for 14+ days without being completed.
- **Time to match** and **time to complete** (medians).
- **Student rating**: average of 1–5 feedback.
- **Mentor capacity in use**: active matches ÷ total capacity of approved mentors.
- Lists of quiet matches and requests waiting 3+ days.

## Analytics service (Python)

A small FastAPI service in [`s2s_analytics/`](s2s_analytics/) does the number crunching. The Next.js app calls it server-side.

| Endpoint | Used by | What it does |
|---|---|---|
| `POST /api/analytics/score` | Organizer's request page | Ranks mentors for a request (offered to help → knows the topic → free spots) |
| `POST /api/analytics/summary` | Overview → **By topic** | Pilot metrics per topic: completion rate, time to match, waiting requests |
| `POST /api/analytics/export` | Overview → **Export CSV** | One row per request with outcome and durations, for spreadsheets |
| `GET /api/analytics/health` | Monitoring | Liveness check |

How it fits together:
- **Deployment.** On Vercel, each file in [`api/analytics/`](api/analytics/) becomes a Python serverless function on the same domain as the app. Locally, run it with `npm run analytics:dev`.
- **Auth.** Every call carries a token derived from `BETTER_AUTH_SECRET` with HMAC-SHA256, so no extra secret is needed and outside callers get `401`.
- **Privacy.** Only opaque IDs, topics, timestamps and statuses are sent. Names, emails and feedback comments stay in the Next.js app.
- **Resilience.** If the service is missing, slow (3 s timeout) or returns something unexpected, scoring falls back to the identical TypeScript rules in `src/lib/match-score.ts`, and the topic table and CSV button are hidden.
- **No drift.** [`tests/fixtures/match-score-cases.json`](tests/fixtures/match-score-cases.json) holds the expected rankings, and both pytest and Vitest run against it. In CI, the TypeScript integration tests also run against the real Python service.

## Local setup

Requirements: Node 24+ and Docker.

```bash
cp .env.example .env          # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm install
npm run db:up                 # Postgres in Docker (dev + test databases)
npm run db:migrate            # apply migrations
npm run db:seed               # topics, admins and demo users
npm run dev
```

Open http://localhost:3000.

Optional, for the Python analytics service (Python 3.12 via [uv](https://docs.astral.sh/uv/)):

```bash
npm run py:setup              # once
npm run analytics:dev         # in a second terminal, with ANALYTICS_URL="http://127.0.0.1:8000" in .env
```

**Signing in locally:** without `RESEND_API_KEY`, magic-link emails are printed to the dev server terminal, so you can click the link from there. The seed creates demo accounts for each role:

| Email | Role |
|---|---|
| `student1@example.com` … `student3@example.com` | Student |
| `mentor1@example.com` … `mentor3@example.com` | Mentor |
| `mentor4@example.com` | Mentor, pending approval |
| `organizer@example.com` | Organizer |

The Google button appears only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. The redirect URI is `http://localhost:3000/api/auth/callback/google`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run all tests (uses the `matchmentor_test` database) |
| `npm run py:setup` | Create `.venv` with Python 3.12 and install the analytics service's dependencies (needs [uv](https://docs.astral.sh/uv/)) |
| `npm run analytics:dev` | Run the Python analytics service on port 8000 (set `ANALYTICS_URL="http://127.0.0.1:8000"` in `.env`) |
| `npm run py:test` / `npm run py:lint` | pytest and ruff for the analytics service |
| `npm run lint` / `npm run typecheck` | Static checks |
| `npm run db:migrate` | Create/apply a migration after editing `prisma/schema.prisma` |
| `npm run db:seed` | Re-run the seed (idempotent) |
| `npm run db:reset` | Drop, re-migrate and re-seed the dev database |
| `npm run vercel-build` | What Vercel runs: migrate, seed (no demo data in production), build |

## Project layout

```
api/analytics/       Vercel entry points for the Python service
s2s_analytics/       Python analytics service: scoring, metrics, CSV export, auth
prisma/              schema, migrations, seed
src/app/             routes: landing, sign-in, (app)/onboarding, student, mentor, organizer
src/components/      shared UI (ui/ = shadcn components, forms/ = form fields and hooks)
src/lib/             auth, data access layer, roles, db, email
src/server/          business logic: validation, permissions, requests, mentoring, matching, emails
src/proxy.ts         optimistic auth redirect
tests/               integration tests, Python tests (tests/python), shared fixtures
```
