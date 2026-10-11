# Mentor Match — 5-Day Build Plan

A web app for an existing 345+ member student/mentor community. Students request help, mentors respond, and organizers make and track matches. The build ends with a pilot of about 30 real users.

## Goals (what "done" means)

1. **Three working flows:** a student submits a request, a mentor responds to it, and an organizer matches the two.
2. **Role-based access:** each of the four roles can see and do only what it should.
3. **Quality:** API tests run in CI on every push, and `main` stays deployable.
4. **Deployed:** the app runs at a public URL with a real database.
5. **Pilot:** about 30 students and mentors use it. We track match completion and fix the issues they report.

## Roles

| Role | Can do |
|---|---|
| **Student** | Create and edit their profile, submit and cancel requests, see their own requests and matches, mark a match complete, and leave feedback |
| **Mentor** | Create and edit their profile (topics, capacity, availability), browse open requests, express interest or decline, see their own matches, and mark a match complete |
| **Organizer** | See all requests and mentors, create, reassign or close matches, view the metrics dashboard, and invite users |
| **Admin** | Do everything an organizer can, and also change user roles |

## Core workflows

**1. Student request**
`draft → open → (mentor interest) → matched → in_progress → completed | cancelled`
- The request form covers topic or category, a description, urgency, preferred format (chat, call or in-person) and availability.

**2. Mentor response**
- The mentor sees open requests filtered by their topics.
- They can express interest (with an optional note) or pass.
- Their capacity (maximum active matches) is enforced.

**3. Organizer matching**
- The queue shows open requests with a count of interested mentors and suggested mentors (simple scoring: topic overlap, then remaining capacity, then availability overlap).
- The organizer confirms a match, and the student and mentor each get an email.
- Organizers can reassign or close a match. Every change is written to a `match_events` audit log.

**4. Completion and feedback**
- Either side can mark a match complete. The student then gets a short form (a 1–5 rating and a comment).
- A match that sits with no activity for more than N days gets flagged on the organizer dashboard.

## Data model (first draft)

- `users`: id, email, name, role, created_at
- `student_profiles` / `mentor_profiles`: topics[], bio, availability, capacity (mentors only)
- `requests`: id, student_id, topic, description, urgency, format, status, timestamps
- `mentor_interests`: request_id, mentor_id, note, created_at
- `matches`: id, request_id, mentor_id, organizer_id, status, matched_at, completed_at
- `match_events`: match_id, actor_id, type, payload, created_at (audit log and metrics source)
- `feedback`: match_id, rating, comment
- `invites`: email, role, token, used_at

## Metrics (organizer dashboard)

- **Match completion rate** = completed / (completed + cancelled + stale)
- Median time from request to match, and from match to completion
- Open requests with no mentor interest
- Mentor utilization (active matches compared with capacity)
- Average feedback rating

## Proposed stack (open to change)

| Concern | Choice | Why |
|---|---|---|
| App | **Next.js (App Router) + TypeScript** | UI and API in one repo, fast to ship |
| DB | **Postgres** (Neon or Supabase) + **Prisma** | Relational data and easy migrations |
| Auth | **Auth.js** with email magic links (or Google) | No passwords to manage; role stored on the user |
| UI | Tailwind + shadcn/ui | Fast, clean forms and tables |
| Email | Resend | Simple transactional email |
| Tests | Vitest for unit and API route tests against a test DB, plus one Playwright smoke test | |
| CI | GitHub Actions: lint, typecheck, test, build | |
| Deploy | Vercel, with preview deploys per PR | |

## Day-by-day

### Day 1: Foundation
- Scaffold Next.js, Tailwind, Prisma and ESLint.
- Write the Prisma schema and first migration, plus seed data (a few users per role, requests and mentors).
- Set up Auth.js sign-in and put the role on the session.
- Add RBAC helpers (`requireRole()`) for routes and pages, plus middleware.
- Add a GitHub Actions CI workflow (lint, typecheck, test, build) and get it passing.
- **End of day:** I can sign in as each role and land on a role-specific placeholder page, and CI is green.

### Day 2: Student and mentor flows
- Student: profile, a create/edit/cancel request form, and a "My requests" list with status.
- Mentor: profile with topics and capacity, an open-requests feed filtered by topic, and express-interest/pass actions.
- API routes with zod validation, and API tests for each route, including permission-denied cases.
- **End of day:** a student can post a request and a mentor can express interest, both covered by tests.

### Day 3: Organizer matching
- Organizer queue with suggested-mentor scoring.
- Create, reassign and close a match, with `match_events` logging.
- Email notifications for a new match.
- Match detail page for students and mentors, mark-complete, and the feedback form.
- **End of day:** the full loop works end to end (request → interest → match → complete → feedback).

### Day 4: Metrics, polish, deploy
- Organizer dashboard with the metrics above and the stale-match flag.
- Invite flow so organizers can onboard pilot users by email.
- Empty states, loading and error states, mobile layout check.
- Deploy to Vercel with a production DB, environment variables and migrations.
- Playwright smoke test of the happy path, run in CI.
- **End of day:** the production URL is live and seeded with real organizer accounts.

### Day 5: Pilot launch and fixes
- Invite about 30 pilot users (a mix of students and mentors) from the community.
- Watch errors (Vercel logs, or Sentry if time allows) and collect feedback through a form or channel.
- Triage issues into GitHub Issues, fix the top ones, and add a regression test for each bug fix.
- Write the README: setup, architecture, roles, how to run tests, and pilot results.
- **End of day:** the pilot is running, fixes are shipped, and match completion is being tracked on the dashboard.

> Realistically a pilot needs more than one day to produce completion data, because matches take time to finish. Treat Day 5 as **launch**, and keep tracking completion and fixing issues for 1–2 weeks after it.

## Out of scope for v1
In-app chat, calendar booking, ML matching, mobile app, SSO with the university.

## Risks and mitigations
- **Auth or email setup eats time:** start magic links on Day 1. Use the Google provider as a fallback.
- **Matching logic grows too big:** keep the scoring simple and rule-based. Organizers make the final call.
- **Low pilot engagement:** pick 30 people who have agreed in advance, and have organizers seed the first matches by hand.

## Decisions to make before Day 1
- [ ] Confirm the stack (Next.js/Prisma/Vercel above, or something else such as FastAPI + React)
- [ ] Topic categories the community uses
- [ ] Who the organizers are (the first accounts to seed)
- [ ] Sign-in method: magic link or Google
