import { db } from "@/lib/db";
import { daysBetween, median, ratio } from "@/lib/stats";
import { assertRole, type Actor } from "./actor";

/** An active match with no completion after this many days needs an organizer's attention. */
export const STALE_AFTER_DAYS = 14;

export function staleCutoff(now = new Date()) {
  return new Date(now.getTime() - STALE_AFTER_DAYS * 86_400_000);
}

/**
 * Pilot metrics. Definitions:
 * - completion rate = completed / (completed + ended + stale), i.e. of matches that have had a fair chance
 *   to finish, how many did
 * - time to match = request posted → match made (re-matches count from the latest match)
 * - time to complete = match made → marked complete
 * - mentor utilization = active matches / total capacity of approved mentors
 */
export async function getDashboardMetrics(actor: Actor, now = new Date()) {
  assertRole(actor, "organizer");
  const cutoff = staleCutoff(now);

  const [matches, openRequests, openWithoutOffers, mentors, ratings, students, pendingMentors] = await Promise.all([
    db.match.findMany({
      select: {
        status: true,
        matchedAt: true,
        completedAt: true,
        request: { select: { createdAt: true } },
      },
    }),
    db.mentorshipRequest.count({ where: { status: "open" } }),
    db.mentorshipRequest.count({ where: { status: "open", responses: { none: { kind: "interested" } } } }),
    db.mentorProfile.findMany({
      where: { status: "approved", user: { role: "mentor" } },
      select: {
        capacity: true,
        user: { select: { _count: { select: { mentorMatches: { where: { status: "active" } } } } } },
      },
    }),
    db.feedback.aggregate({ _avg: { rating: true }, _count: true }),
    db.user.count({ where: { role: "student", onboardedAt: { not: null } } }),
    db.mentorProfile.count({ where: { status: "pending", user: { role: "mentor" } } }),
  ]);

  const completed = matches.filter((m) => m.status === "completed");
  const ended = matches.filter((m) => m.status === "cancelled");
  const active = matches.filter((m) => m.status === "active");
  const stale = active.filter((m) => m.matchedAt < cutoff);

  const capacity = mentors.reduce((sum, m) => sum + m.capacity, 0);
  const activeLoad = mentors.reduce((sum, m) => sum + m.user._count.mentorMatches, 0);

  return {
    students,
    approvedMentors: mentors.length,
    pendingMentors,
    openRequests,
    openWithoutOffers,
    activeMatches: active.length,
    staleMatches: stale.length,
    completedMatches: completed.length,
    endedMatches: ended.length,
    completionRate: ratio(completed.length, completed.length + ended.length + stale.length),
    medianDaysToMatch: median(
      matches.filter((m) => m.status !== "cancelled").map((m) => daysBetween(m.request.createdAt, m.matchedAt)),
    ),
    medianDaysToComplete: median(
      completed.filter((m) => m.completedAt).map((m) => daysBetween(m.matchedAt, m.completedAt!)),
    ),
    mentorUtilization: ratio(activeLoad, capacity),
    averageRating: ratings._avg.rating,
    ratingCount: ratings._count,
  };
}

export type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;

/** Things an organizer should look at today, oldest first. */
export async function getAttentionItems(actor: Actor, now = new Date()) {
  assertRole(actor, "organizer");
  const [staleMatches, waitingRequests] = await Promise.all([
    db.match.findMany({
      where: { status: "active", matchedAt: { lt: staleCutoff(now) } },
      select: {
        id: true,
        matchedAt: true,
        mentor: { select: { name: true } },
        request: { select: { title: true, student: { select: { name: true } } } },
      },
      orderBy: { matchedAt: "asc" },
      take: 10,
    }),
    db.mentorshipRequest.findMany({
      where: { status: "open", createdAt: { lt: new Date(now.getTime() - 3 * 86_400_000) } },
      select: { id: true, title: true, createdAt: true, student: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),
  ]);
  return { staleMatches, waitingRequests };
}
