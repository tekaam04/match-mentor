import { randomUUID } from "node:crypto";
import type { MentorStatus, Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { DEFAULT_TOPICS } from "@/lib/topics";
import type { Actor } from "@/server/actor";

export async function seedTopics() {
  for (const [i, t] of DEFAULT_TOPICS.entries()) {
    await db.topic.create({ data: { slug: t.slug, label: t.label, sortOrder: i } });
  }
  return db.topic.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function topicId(slug: string) {
  return (await db.topic.findUniqueOrThrow({ where: { slug } })).id;
}

export async function createUser(role: Role, overrides: { name?: string; onboarded?: boolean } = {}): Promise<Actor> {
  const id = randomUUID();
  await db.user.create({
    data: {
      id,
      email: `${role}-${id.slice(0, 8)}@test.local`,
      name: overrides.name ?? `Test ${role}`,
      role,
      onboardedAt: overrides.onboarded === false ? null : new Date(),
    },
  });
  return { id, role };
}

export async function createStudent() {
  const actor = await createUser("student");
  await db.studentProfile.create({ data: { userId: actor.id, targetUniversities: [] } });
  return actor;
}

export async function createMentor(
  opts: { status?: MentorStatus; capacity?: number; topics?: string[] } = {},
): Promise<Actor> {
  const actor = await createUser("mentor");
  const ids = await Promise.all((opts.topics ?? ["essays"]).map(topicId));
  await db.mentorProfile.create({
    data: {
      userId: actor.id,
      university: "Test University",
      bio: "I can help with applications.",
      capacity: opts.capacity ?? 3,
      status: opts.status ?? "approved",
      topics: { connect: ids.map((id) => ({ id })) },
    },
  });
  return actor;
}

export async function createOpenRequest(student: Actor, topicSlug = "essays", overrides: Record<string, unknown> = {}) {
  return db.mentorshipRequest.create({
    data: {
      studentId: student.id,
      topicId: await topicId(topicSlug),
      title: "Help with my essay",
      description: "I would like feedback on my personal statement draft.",
      targetUniversities: [],
      ...overrides,
    },
  });
}

/** An active match for `mentor`, on a new request from a new student. */
export async function createActiveMatch(mentor: Actor) {
  const student = await createStudent();
  const request = await createOpenRequest(student, "essays", { status: "matched" });
  return db.match.create({ data: { requestId: request.id, mentorId: mentor.id } });
}

export const validRequest = (topic: string) => ({
  topicId: topic,
  title: "Feedback on my essay",
  description: "I have a second draft and want feedback on the structure.",
  targetUniversities: "MIT, Yale",
  urgency: "high" as const,
  format: "call" as const,
});
