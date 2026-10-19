import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { assertRole, type Actor } from "./actor";
import { conflict, notFound, parse } from "./errors";
import { assertActiveTopics } from "./topics";
import { requestSchema, type RequestInput } from "./validation";

const studentRequestInclude = {
  topic: { select: { id: true, label: true } },
  match: { select: { id: true, status: true, mentor: { select: { name: true } } } },
  _count: { select: { responses: { where: { kind: "interested" } } } },
} satisfies Prisma.MentorshipRequestInclude;

export type StudentRequest = Prisma.MentorshipRequestGetPayload<{ include: typeof studentRequestInclude }>;

/** The student's own requests, newest first. */
export async function listMyRequests(actor: Actor) {
  assertRole(actor, "student");
  return db.mentorshipRequest.findMany({
    where: { studentId: actor.id },
    include: studentRequestInclude,
    orderBy: { createdAt: "desc" },
  });
}

/** One of the student's own requests. Other students' requests are reported as not found. */
export async function getMyRequest(actor: Actor, id: string) {
  assertRole(actor, "student");
  const request = await db.mentorshipRequest.findFirst({
    where: { id, studentId: actor.id },
    include: studentRequestInclude,
  });
  if (!request) throw notFound("Request not found.");
  return request;
}

async function validated(raw: RequestInput) {
  const input = parse(requestSchema, raw);
  await assertActiveTopics([input.topicId], "topicId");
  return input;
}

export async function createRequest(actor: Actor, raw: RequestInput) {
  assertRole(actor, "student");
  const input = await validated(raw);
  return db.mentorshipRequest.create({ data: { ...input, studentId: actor.id, status: "open" } });
}

/** Students can edit a request until it has been matched. */
export async function updateRequest(actor: Actor, id: string, raw: RequestInput) {
  const existing = await getMyRequest(actor, id);
  if (existing.status !== "open") throw conflict("This request can no longer be edited.");
  const input = await validated(raw);
  return db.mentorshipRequest.update({ where: { id }, data: input });
}

export async function cancelRequest(actor: Actor, id: string) {
  const existing = await getMyRequest(actor, id);
  if (existing.status !== "open") {
    throw conflict("Only open requests can be cancelled. Contact an organizer to end a match.");
  }
  // Conditional update so a concurrent match can't be overwritten.
  const { count } = await db.mentorshipRequest.updateMany({
    where: { id, status: "open" },
    data: { status: "cancelled" },
  });
  if (count === 0) throw conflict("This request was just matched and can't be cancelled.");
}
