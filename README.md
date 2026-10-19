# Match Mentor

A mentorship matching app for a 345+ member university-applications community. Students request help (SAT, essays, recommendation letters, financial aid, visas and more), mentors respond, and organizers make and track matches.

See [PLAN.md](PLAN.md) for the 5-day build plan, data model and metrics.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS 4)
- **PostgreSQL** + **Prisma 7**
- **Better Auth**: Google sign-in and email magic links, with a role on each user
- **Vitest**: unit tests and integration tests against a real Postgres database
- **GitHub Actions**: lint, typecheck, test and build on every push and PR

## Roles

| Role | Home | Access |
|---|---|---|
| Student | `/student` | Own requests and matches |
| Mentor | `/mentor` | Open requests, own matches |
| Organizer | `/organizer` | All requests and mentors, matching, metrics |
| Admin | `/organizer` | Everything an organizer can do, plus role changes |

New users start as **students**. Emails listed in `SEED_ADMIN_EMAILS` become **admins** on first sign-in. Other roles are assigned by organizers. Clients can never set their own role.

Authorization works in two layers:

1. `src/proxy.ts` makes a fast cookie-only check and bounces signed-out users to `/sign-in`.
2. `requireRole()` in `src/lib/dal.ts` validates the session against the database and enforces the role on every protected page.

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

**Signing in locally:** without `RESEND_API_KEY`, magic-link emails are printed to the dev server terminal, so you can click the link from there. The seed creates demo accounts for each role:

| Email | Role |
|---|---|
| `student1@example.com` … `student3@example.com` | Student |
| `mentor1@example.com` … `mentor3@example.com` | Mentor |
| `organizer@example.com` | Organizer |

The Google button appears only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. The redirect URI is `http://localhost:3000/api/auth/callback/google`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run all tests (uses the `matchmentor_test` database) |
| `npm run lint` / `npm run typecheck` | Static checks |
| `npm run db:migrate` | Create/apply a migration after editing `prisma/schema.prisma` |
| `npm run db:seed` | Re-run the seed (idempotent) |
| `npm run db:reset` | Drop, re-migrate and re-seed the dev database |

## Project layout

```
prisma/              schema, migrations, seed
src/app/             routes (sign-in, role homes, auth API)
src/components/      shared UI
src/lib/             auth, data access layer, roles, db, email
src/proxy.ts         optimistic auth redirect
tests/               integration tests and test helpers
```
