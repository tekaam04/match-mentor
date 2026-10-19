import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hasRole } from "@/lib/roles";
import { rankCandidates } from "@/lib/match-score";
import { assertRole, type Actor } from "./actor";
import { conflict, forbidden, notFound, parse } from "./errors";
import { notifyCompleted, notifyMatched, notifyReassigned } from "./notifications";
import { cancelMatchSchema, feedbackSchema, type FeedbackInput } from "./validation";

const person = { select: { id: true, name: true, email: true } } as const;

// ─── Organizer queue ─────────────────────────────────────────────────────────

export type QueueTab = "open" | "active" | "closed";

const QUEUE_WHERE: Record<QueueTab, Prisma.MentorshipRequestWhereInput> = {
  open: { status: "open" },
  active: { status: { in: ["matched", "in_progress"] } },
  closed: { status: { in: ["completed", "cancelled"] } },
};

export async function listQueue(actor: Actor, tab: QueueTab = "open") {
  assertRole(actor, "organizer");
  return db.mentorshipRequest.findMany({
    where: QUEUE_WHERE[tab],
    include: {
      topic: { select: { label: true } },
      student: { select: { name: true } },
      match: { select: { id: true, status: true, mentor: { select: { name: true } } } },
      _count: { select: { responses: { where: { kind: "interested" } } } },
    },
    // Oldest open requests first so nobody waits too long; newest first elsewhere.
    orderBy:
      tab === "open"
        ? [{ urgency: "desc" }, { createdAt: "asc" }]
        : [{ updatedAt: "desc" }],
    take: 200,
  });
}

export type QueueItem = Awaited<ReturnType<typeof listQueue>>[number];

export async function queueCounts(actor: Actor) {
  assertRole(actor, "organizer");
  const [open, active, closed] = await Promise.all(
    (["open", "active", "closed"] as const).map((t) => db.mentorshipRequest.count({ where: QUEUE_WHERE[t] })),
  );
  return { open, active, closed };
}

/** Everything an organizer needs to decide on one request. */
export async function getRequestForOrganizer(actor: Actor, id: string) {
  assertRole(actor, "organizer");
  const request = await db.mentorshipRequest.findUnique({
    where: { id },
    include: {
      topic: { select: { id: true, label: true } },
      student: { select: { ...person.select, studentProfile: { select: { bio: true, targetUniversities: true } } } },
      responses: { include: { mentor: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      match: {
        include: {
          mentor: person,
          events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!request) throw notFound("Request not found.");
  return request;
}

/** Approved mentors ranked for a request; mentors who passed and the student themselves are left out. */
export async function suggestMentors(actor: Actor, requestId: string) {
  assertRole(actor, "organizer");
  const request = await db.mentorshipRequest.findUnique({
    where: { id: requestId },
    select: { topicId: true, studentId: true, match: { select: { mentorId: true, status: true } } },
  });
  if (!request) throw notFound("Request not found.");

  const mentors = await db.mentorProfile.findMany({
    where: {
      status: "approved",
      user: { role: "mentor", id: { not: request.studentId } },
      NOT: { user: { responses: { some: { requestId, kind: "passed" } } } },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          responses: { where: { requestId }, select: { kind: true, note: true } },
          _count: { select: { mentorMatches: { where: { status: "active" } } } },
        },
      },
      topics: { select: { id: true, label: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  const currentMentorId = request.match?.status === "active" ? request.match.mentorId : null;
  return rankCandidates(
    mentors
      .filter((m) => m.userId !== currentMentorId)
      .map((m) => ({
        mentorId: m.userId,
        name: m.user.name,
        university: m.university,
        topics: m.topics.map((t) => t.label),
        note: m.user.responses[0]?.note ?? null,
        interested: m.user.responses[0]?.kind === "interested",
        topicMatch: m.topics.some((t) => t.id === request.topicId),
        activeMatches: m.user._count.mentorMatches,
        capacity: m.capacity,
      })),
  );
}

export type Suggestion = Awaited<ReturnType<typeof suggestMentors>>[number];

// ─── Making and changing matches ─────────────────────────────────────────────

type Tx = Prisma.TransactionClient;

/** The mentor must be an approved mentor with a free spot. */
async function assertMentorAvailable(tx: Tx, mentorId: string, studentId: string) {
  const profile = await tx.mentorProfile.findUnique({
    where: { userId: mentorId },
    include: { user: { select: { role: true } } },
  });
  if (!profile || profile.status !== "approved" || profile.user.role !== "mentor") {
    throw conflict("That person isn't an approved mentor.");
  }
  if (mentorId === studentId) throw conflict("A student can't mentor their own request.");
  const active = await tx.match.count({ where: { mentorId, status: "active" } });
  if (active >= profile.capacity) {
    throw conflict("That mentor has no free spots. Choose another mentor or ask them to raise their limit.");
  }
}

const matchWithPeople = {
  request: { select: { title: true, student: person } },
  mentor: person,
} satisfies Prisma.MatchInclude;

export async function createMatch(actor: Actor, requestId: string, mentorId: string) {
  assertRole(actor, "organizer");

  const match = await db.$transaction(async (tx) => {
    const request = await tx.mentorshipRequest.findUnique({ where: { id: requestId } });
    if (!request) throw notFound("Request not found.");
    await assertMentorAvailable(tx, mentorId, request.studentId);

    // Claim the request atomically so two organizers can't match it at once.
    const { count } = await tx.mentorshipRequest.updateMany({
      where: { id: requestId, status: "open" },
      data: { status: "matched" },
    });
    if (count === 0) throw conflict("This request isn't open any more. Refresh to see its current state.");

    // A request keeps one match row; re-matching after a cancellation reuses it.
    const data = { mentorId, organizerId: actor.id, status: "active" as const, matchedAt: new Date(), completedAt: null, cancelledAt: null };
    const saved = await tx.match.upsert({
      where: { requestId },
      create: { requestId, ...data },
      update: data,
      include: matchWithPeople,
    });
    await tx.matchEvent.create({ data: { matchId: saved.id, actorId: actor.id, type: "created", payload: { mentorId } } });
    return saved;
  });

  await notifyMatched({
    matchId: match.id,
    requestTitle: match.request.title,
    student: match.request.student,
    mentor: match.mentor,
  });
  return match;
}

export async function reassignMatch(actor: Actor, matchId: string, mentorId: string) {
  assertRole(actor, "organizer");

  const { match, previousMentor } = await db.$transaction(async (tx) => {
    const existing = await tx.match.findUnique({ where: { id: matchId }, include: { request: true, mentor: person } });
    if (!existing) throw notFound("Match not found.");
    if (existing.status !== "active") throw conflict("Only active matches can be reassigned.");
    if (existing.mentorId === mentorId) throw conflict("That mentor is already on this match.");
    await assertMentorAvailable(tx, mentorId, existing.request.studentId);

    const updated = await tx.match.update({
      where: { id: matchId },
      data: { mentorId, organizerId: actor.id },
      include: matchWithPeople,
    });
    await tx.matchEvent.create({
      data: { matchId, actorId: actor.id, type: "reassigned", payload: { from: existing.mentorId, to: mentorId } },
    });
    return { match: updated, previousMentor: existing.mentor };
  });

  await notifyReassigned({
    matchId,
    requestTitle: match.request.title,
    student: match.request.student,
    mentor: match.mentor,
    previousMentor,
  });
  return match;
}

/** Ends an active match. `reopen` puts the request back in the queue; otherwise it is closed. */
export async function cancelMatch(actor: Actor, matchId: string, raw: { reopen: unknown; reason?: unknown }) {
  assertRole(actor, "organizer");
  const { reopen, reason } = parse(cancelMatchSchema, raw);

  return db.$transaction(async (tx) => {
    const { count } = await tx.match.updateMany({
      where: { id: matchId, status: "active" },
      data: { status: "cancelled", cancelledAt: new Date() },
    });
    if (count === 0) throw conflict("Only active matches can be cancelled.");
    const match = await tx.match.findUniqueOrThrow({ where: { id: matchId } });
    await tx.mentorshipRequest.update({
      where: { id: match.requestId },
      data: { status: reopen ? "open" : "cancelled" },
    });
    await tx.matchEvent.create({ data: { matchId, actorId: actor.id, type: "cancelled", payload: { reopen, reason } } });
    return match;
  });
}

// ─── Participants: viewing, completing, feedback ─────────────────────────────

const matchDetailInclude = {
  request: {
    include: {
      topic: { select: { label: true } },
      student: { select: { ...person.select, studentProfile: { select: { targetUniversities: true } } } },
    },
  },
  mentor: { select: { ...person.select, mentorProfile: { select: { university: true, bio: true } } } },
  feedback: true,
  events: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.MatchInclude;

export type MatchDetail = Prisma.MatchGetPayload<{ include: typeof matchDetailInclude }>;

/** How the actor relates to a match, or null if they have no business seeing it. */
export function matchRole(actor: Actor, match: { mentorId: string; request: { studentId: string } }) {
  if (match.request.studentId === actor.id) return "student" as const;
  if (match.mentorId === actor.id) return "mentor" as const;
  if (hasRole(actor.role, ["organizer"])) return "organizer" as const;
  return null;
}

export async function getMatch(actor: Actor, matchId: string) {
  const match = await db.match.findUnique({ where: { id: matchId }, include: matchDetailInclude });
  // Same answer for "missing" and "not yours", so ids can't be probed.
  if (!match) throw notFound("Match not found.");
  const role = matchRole(actor, match);
  if (!role) throw notFound("Match not found.");
  return { match, role };
}

export async function listMyMatches(actor: Actor) {
  assertRole(actor, "mentor");
  return db.match.findMany({
    where: { mentorId: actor.id, status: { in: ["active", "completed"] } },
    include: { request: { select: { id: true, title: true, topic: { select: { label: true } }, student: { select: { name: true } } } } },
    orderBy: [{ status: "asc" }, { matchedAt: "desc" }],
  });
}

/** The student, the mentor or an organizer can mark an active match complete. */
export async function completeMatch(actor: Actor, matchId: string) {
  const { match, role } = await getMatch(actor, matchId);
  if (!role) throw forbidden();

  await db.$transaction(async (tx) => {
    const { count } = await tx.match.updateMany({
      where: { id: matchId, status: "active" },
      data: { status: "completed", completedAt: new Date() },
    });
    if (count === 0) throw conflict("This match is already closed.");
    await tx.mentorshipRequest.update({ where: { id: match.requestId }, data: { status: "completed" } });
    await tx.matchEvent.create({ data: { matchId, actorId: actor.id, type: "completed", payload: { by: role } } });
  });

  await notifyCompleted({ matchId, requestTitle: match.request.title, student: match.request.student });
}

/** One rating per match, from the student, after it's completed. */
export async function submitFeedback(actor: Actor, matchId: string, raw: FeedbackInput) {
  const { match, role } = await getMatch(actor, matchId);
  if (role !== "student") throw forbidden("Only the student can leave feedback on this match.");
  if (match.status !== "completed") throw conflict("You can leave feedback once the match is complete.");
  if (match.feedback) throw conflict("You've already left feedback. Thank you!");
  const input = parse(feedbackSchema, raw);
  return db.feedback.create({ data: { matchId, authorId: actor.id, rating: input.rating, comment: input.comment } });
}
