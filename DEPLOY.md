# Deploying Match Mentor

Production runs on **Vercel** (app), **Neon** (Postgres, added through Vercel), **Resend** (email) and the domain **s2stigraymentors.com** (DNS on Cloudflare). All have free tiers that cover the pilot. Do the steps in order; each takes a few minutes.

## 1. Vercel project
1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project**, import `tekaam04/match-mentor`. Keep the defaults (framework: Next.js). **Don't deploy yet**: open *Environment Variables* first, or let the first deploy fail and redeploy after step 3.

## 2. Database (Neon)
1. In the Vercel project: **Storage → Create Database → Neon → Continue**, accept the defaults, region close to your users (e.g. `Washington, D.C. (iad1)`).
2. Connect it to the project for **Production** (and Preview if you want preview deploys to work). This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically.

The build runs `prisma migrate deploy && prisma db seed && next build`, so tables, the 10 topics and the admin accounts are created on every deploy. Demo users are never created in production.

## 3. Environment variables
In **Settings → Environment Variables** (Production):

| Name | Value |
|---|---|
| `BETTER_AUTH_SECRET` | a new random secret: run `openssl rand -base64 32` locally. Don't reuse the local one. |
| `BETTER_AUTH_URL` | `https://s2stigraymentors.com` |
| `SEED_ADMIN_EMAILS` | `tekaabel04@gmail.com,tekaabel0411@gmail.com` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | same as your local `.env` (after step 5) |
| `RESEND_API_KEY` | from step 6 |
| `EMAIL_FROM` | `Match Mentor <hello@s2stigraymentors.com>` |

Then **Deployments → ⋯ → Redeploy**.

## 4. Domain
1. Vercel project → **Settings → Domains → Add** `s2stigraymentors.com` (and `www.s2stigraymentors.com`, redirecting to the main one).
2. Vercel shows DNS records (usually an `A` record for the root and a `CNAME` for `www`). Add them in **Cloudflare → your domain → DNS → Records**, with the proxy status set to **DNS only** (grey cloud).
3. Wait for Vercel to show **Valid Configuration**. HTTPS is automatic.

## 5. Google sign-in for production
In [console.cloud.google.com](https://console.cloud.google.com) → *Google Auth Platform* → **Clients** → your web client:
- Authorized JavaScript origins: add `https://s2stigraymentors.com`
- Authorized redirect URIs: add `https://s2stigraymentors.com/api/auth/callback/google`

In **Branding**, add the domain under *Authorized domains*. In **Audience**, click **Publish app** so anyone (not only test users) can sign in. The app only asks for name and email, so Google doesn't require a review.

## 6. Email (Resend)
1. Sign up at [resend.com](https://resend.com). **Domains → Add Domain** → `s2stigraymentors.com`.
2. Resend lists DNS records (SPF `TXT`, DKIM `TXT`/`CNAME`, and an `MX` for bounces). Add each one in Cloudflare DNS exactly as shown. Resend can also do this automatically through its Cloudflare integration.
3. Wait for the domain to show **Verified**, then **API Keys → Create** (permission: *Sending access*), and put it in `RESEND_API_KEY` on Vercel. Redeploy.

## 7. Smoke test
1. Open `https://s2stigraymentors.com` → **Sign in with Google** as `tekaabel04@gmail.com` → you should land on the Organizer overview.
2. In a private window, sign in with the email-link option using another address you own → the email should arrive within a minute → finish onboarding as a student → post a request.
3. Back as admin: **People → Invite** a mentor you know, approve or match, and check that both emails arrive.

## Afterwards
- **Logs:** Vercel → project → *Logs* (filter by `error`).
- **Database:** Vercel → *Storage* → Neon → *Open in Neon* for the SQL editor and backups.
- **Deploys:** every push to `main` deploys automatically after CI passes on GitHub.
