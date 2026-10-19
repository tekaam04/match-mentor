import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { assertRole, type Actor } from "./actor";
import { conflict, forbidden, notFound, parse } from "./errors";
import { mentorReviewSchema, responseSchema, type ResponseInput } from "./validation";

/** Loads the mentor's profile and requires that an organizer has approved it. */
export async function requireApprovedMentor(actor: Actor) {
  assertRole(actor, "mentor");
  const profile = await db.mentorProfile.findUnique({
    where: { userId: actor.id },
    include: { topics: { select: { id: true } } },
  });
  if (profile?.status !== "approved") throw forbidden("Your mentor profile is waiting for organizer approval.");
  return profile;
}

export function activeMatchCount(mentorId: string) {
  return db.match.count({ where: { mentorId, status: "active" } });
}

export type FeedScope = "mine" | "all" | "responded";

function feedInclude(mentorId: string) {
  return {
    topic: { select: { id: true, label: true } },
    student: { select: { name: true } },
    responses: { where: { mentorId }, select: { kind: true, note: true } },
    _count: { select: { responses: { where: { kind: "interested" } } } },
  } satisfies Prisma.MentorshipRequestInclude;
}

export type FeedRequest = Prisma.MentorshipRequestGetPayload<{ include: ReturnType<typeof feedInclude> }>;

/**
 * Open requests for a mentor.
 * - "mine": open requests in the mentor's topics they haven't answered yet
 * - "all": every open request they haven't passed on
 * - "responded": requests they have answered, in any status
 * Most urgent first, then the nearest deadline, then newest.
 */
export async function listFeed(actor: Actor, scope: FeedScope = "mine") {
  const profile = await requireApprovedMentor(actor);
  const myResponse = { some: { mentorId: actor.id } };

  const where: Prisma.MentorshipRequestWhereInput =
    scope === "responded"
      ? { responses: myResponse }
      : {
          status: "open",
          studentId: { not: actor.id },
          ...(scope === "mine"
            ? { topicId: { in: profile.topics.map((t) => t.id) }, responses: { none: { mentorId: actor.id } } }
            : { responses: { none: { mentorId: actor.id, kind: "passed" } } }),
        };

  return db.mentorshipRequest.findMany({
    where,
    include: feedInclude(actor.id),
    orderBy: [{ urgency: "desc" }, { deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 100,
  });
}

/** A request a mentor may look at: any open request, or one they've already answered. */
export async function getRequestForMentor(actor: Actor, id: string) {
  await requireApprovedMentor(actor);
  const request = await db.mentorshipRequest.findFirst({
    where: { id, OR: [{ status: "open" }, { responses: { some: { mentorId: actor.id } } }] },
    include: {
      ...feedInclude(actor.id),
      student: { select: { name: true, studentProfile: { select: { bio: true, targetUniversities: true } } } },
    },
  });
  if (!request) throw notFound("This request is no longer open.");
  return request;
}

/** "I can help" or "Pass". Answering again replaces the previous answer. */
export async function respondToRequest(actor: Actor, requestId: string, raw: ResponseInput) {
  const profile = await requireApprovedMentor(actor);
  const input = parse(responseSchema, raw);

  const request = await db.mentorshipRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "open") throw notFound("This request is no longer open.");
  if (request.studentId === actor.id) throw forbidden("You can't respond to your own request.");

  if (input.kind === "interested" && (await activeMatchCount(actor.id)) >= profile.capacity) {
    throw conflict(
      `You already have ${profile.capacity} active match${profile.capacity === 1 ? "" : "es"}, your limit. ` +
        "Raise your capacity in your profile or finish a match first.",
    );
  }

  return db.mentorResponse.upsert({
    where: { requestId_mentorId: { requestId, mentorId: actor.id } },
    create: { requestId, mentorId: actor.id, kind: input.kind, note: input.note },
    update: { kind: input.kind, note: input.note },
  });
}

/** Takes back an answer while the request is still open. */
export async function withdrawResponse(actor: Actor, requestId: string) {
  await requireApprovedMentor(actor);
  const { count } = await db.mentorResponse.deleteMany({
    where: { requestId, mentorId: actor.id, request: { status: "open" } },
  });
  if (count === 0) throw notFound("There's no response to withdraw on an open request.");
}

// ─── Organizer: mentor approvals ──────────────────────────────────────────────

export async function listMentorsByStatus(actor: Actor, status: "pending" | "approved" | "rejected") {
  assertRole(actor, "organizer");
  return db.mentorProfile.findMany({
    where: { status, user: { role: "mentor" } },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      topics: { select: { label: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: status === "pending" ? "asc" : "desc" },
  });
}

export async function reviewMentor(actor: Actor, mentorId: string, raw: { decision: string }) {
  assertRole(actor, "organizer");
  const { decision } = parse(mentorReviewSchema, raw);
  const profile = await db.mentorProfile.findUnique({ where: { userId: mentorId } });
  if (!profile) throw notFound("Mentor not found.");
  return db.mentorProfile.update({
    where: { userId: mentorId },
    data: { status: decision, reviewedAt: new Date(), reviewedById: actor.id },
  });
}

export function pendingMentorCount() {
  return db.mentorProfile.count({ where: { status: "pending", user: { role: "mentor" } } });
}
