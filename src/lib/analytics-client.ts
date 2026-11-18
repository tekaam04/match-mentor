import "server-only";
import { createHmac } from "node:crypto";

/**
 * Client for the Python analytics service (s2s_analytics/, served from api/analytics/*.py on Vercel).
 *
 * The service is optional: callers must handle `null` / AnalyticsError and fall back, so the app keeps
 * working in tests, preview deploys and local dev without the Python server running.
 */

const TOKEN_CONTEXT = "s2s-analytics-v1";
const DEFAULT_TIMEOUT_MS = 3000;

/** Derived from BETTER_AUTH_SECRET, same as service_token() in s2s_analytics/auth.py. */
export function serviceToken(secret: string): string {
  return createHmac("sha256", secret).update(TOKEN_CONTEXT).digest("hex");
}

/**
 * Where the service lives, or null when there isn't one.
 * - ANALYTICS_URL wins (local dev: http://127.0.0.1:8000)
 * - in production it's on the same domain, under /api/analytics
 * - preview deploys sit behind Vercel's login wall, so they use the fallbacks
 */
export function analyticsBaseUrl(env: Record<string, string | undefined> = process.env): string | null {
  const explicit = env.ANALYTICS_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  if (env.VERCEL_ENV === "production" && env.BETTER_AUTH_URL) {
    return `${env.BETTER_AUTH_URL.replace(/\/+$/, "")}/api/analytics`;
  }
  return null;
}

export class AnalyticsError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AnalyticsError";
  }
}

/** POST JSON to the service. Throws AnalyticsError when it's unconfigured, slow, or answers with an error. */
export async function postToAnalytics(
  path: "score" | "summary" | "export",
  body: unknown,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<Response> {
  const base = analyticsBaseUrl();
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!base || !secret) throw new AnalyticsError("Analytics service is not configured.");

  let res: Response;
  try {
    res = await fetch(`${base}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceToken(secret)}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    throw new AnalyticsError(`Analytics service unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) throw new AnalyticsError(`Analytics service answered ${res.status} for /${path}`, res.status);
  return res;
}
