import "server-only";
import { z } from "zod";
import { AnalyticsError, analyticsBaseUrl, postToAnalytics } from "@/lib/analytics-client";
import { db } from "@/lib/db";
import { rankCandidates, type MentorCandidate, type ScoredCandidate } from "@/lib/match-score";
import { assertRole, type Actor } from "./actor";
import { STALE_AFTER_DAYS } from "./metrics";

/** Whether organizer pages should offer the Python-backed export and topic breakdown. */
export function analyticsEnabled(): boolean {
  return analyticsBaseUrl() !== null;
}

// ─── Mentor scoring ──────────────────────────────────────────────────────────

const scoreResponse = z.object({
  ranked: z.array(
    z.object({ mentorId: z.string(), score: z.number(), remaining: z.number(), reasons: z.array(z.string()) }),
  ),
});

/**
 * Ranks mentors with the Python service, falling back to the identical TypeScript rules
 * (src/lib/match-score.ts) if the service is missing, slow, or returns something unexpected.
 * Only scoring inputs and opaque ids are sent; names stay here.
 */
export async function rankMentors<T extends MentorCandidate>(candidates: T[]): Promise<ScoredCandidate<T>[]> {
  if (candidates.length === 0 || !analyticsEnabled()) return rankCandidates(candidates);

  try {
    const res = await postToAnalytics("score", {
      candidates: candidates.map(({ mentorId, interested, topicMatch, activeMatches, capacity }) => ({
        mentorId,
        interested,
        topicMatch,
        activeMatches,
        capacity,
      })),
    });
    const { ranked } = scoreResponse.parse(await res.json());
    const byId = new Map(candidates.map((c) => [c.mentorId, c]));
    if (ranked.length !== candidates.length || ranked.some((r) => !byId.has(r.mentorId))) {
      throw new AnalyticsError("Score response doesn't match the candidates sent.");
    }
    return ranked.map((r) => ({ ...byId.get(r.mentorId)!, score: r.score, remaining: r.remaining, reasons: r.reasons }));
  } catch (err) {
    console.warn(`[analytics] scoring fell back to TypeScript: ${err instanceof Error ? err.message : err}`);
    return rankCandidates(candidates);
  }
}

// ─── Pilot metrics ───────────────────────────────────────────────────────────

/** One row per request, without names or emails. Drafts are left out. */
export async function loadMetricRows(actor: Actor, now = new Date()) {
  assertRole(actor, "organizer");
  const requests = await db.mentorshipRequest.findMany({
    where: { status: { not: "draft" } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      status: true,
      urgency: true,
      topic: { select: { label: true } },
      _count: { select: { responses: { where: { kind: "interested" } } } },
      match: {
        select: {
          status: true,
          matchedAt: true,
          completedAt: true,
          cancelledAt: true,
          feedback: { select: { rating: true } },
        },
      },
    },
  });

  return {
    now: now.toISOString(),
    staleAfterDays: STALE_AFTER_DAYS,
    requests: requests.map((r) => ({
      requestId: r.id,
      topic: r.topic.label,
      urgency: r.urgency,
      requestStatus: r.status,
      createdAt: r.createdAt.toISOString(),
      offers: r._count.responses,
      match: r.match
        ? {
            status: r.match.status,
            matchedAt: r.match.matchedAt.toISOString(),
            completedAt: r.match.completedAt?.toISOString() ?? null,
            cancelledAt: r.match.cancelledAt?.toISOString() ?? null,
          }
        : null,
      rating: r.match?.feedback?.rating ?? null,
    })),
  };
}

const summary = z.object({
  requests: z.number(),
  waiting: z.number(),
  active: z.number(),
  stale: z.number(),
  completed: z.number(),
  ended: z.number(),
  completionRate: z.number().nullable(),
  medianHoursToMatch: z.number().nullable(),
  medianDaysToComplete: z.number().nullable(),
  averageRating: z.number().nullable(),
  ratings: z.number(),
});

const summaryResponse = z.object({
  overall: summary,
  byTopic: z.array(summary.extend({ topic: z.string() })),
});

export type TopicBreakdown = z.infer<typeof summaryResponse>;

/** Per-topic pilot metrics from the Python service, or null if it's unavailable. */
export async function getTopicBreakdown(actor: Actor, now = new Date()): Promise<TopicBreakdown | null> {
  const payload = await loadMetricRows(actor, now);
  if (!analyticsEnabled()) return null;
  try {
    const res = await postToAnalytics("summary", payload);
    return summaryResponse.parse(await res.json());
  } catch (err) {
    console.warn(`[analytics] topic breakdown unavailable: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

/** The pilot as a CSV, one row per request. Throws AnalyticsError if the service can't produce it. */
export async function exportPilotCsv(actor: Actor, now = new Date()): Promise<string> {
  const payload = await loadMetricRows(actor, now);
  const res = await postToAnalytics("export", payload, { timeoutMs: 10_000 });
  return res.text();
}
