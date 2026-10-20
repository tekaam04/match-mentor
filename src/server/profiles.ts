import { db } from "@/lib/db";
import { assertRole, type Actor } from "./actor";
import { conflict, forbidden, parse } from "./errors";
import { wasInvitedAsMentor } from "./people";
import { assertActiveTopics } from "./topics";
import {
  mentorProfileSchema,
  onboardingSchema,
  studentProfileSchema,
  type MentorProfileInput,
  type OnboardingInput,
  type StudentProfileInput,
} from "./validation";

const topicSelect = { select: { id: true, label: true }, orderBy: { sortOrder: "asc" as const } };

export function getStudentProfile(userId: string) {
  return db.studentProfile.findUnique({ where: { userId }, include: { topics: topicSelect } });
}

export function getMentorProfile(userId: string) {
  return db.mentorProfile.findUnique({ where: { userId }, include: { topics: topicSelect } });
}

/**
 * One-time choice of path (applicant or mentor) plus the matching profile.
 * Mentors start as `pending` until an organizer approves them.
 */
export async function completeOnboarding(actor: Actor, raw: OnboardingInput) {
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
  if (user.onboardedAt) throw conflict("You've already set up your account.");
  if (user.role !== "student" && user.role !== "mentor") throw forbidden("Staff accounts don't need onboarding.");

  const input = parse(onboardingSchema, raw);
  await assertActiveTopics(input.topicIds);
  const topics = input.topicIds.map((id) => ({ id }));

  return db.$transaction(async (tx) => {
    if (input.path === "student") {
      await tx.studentProfile.upsert({
        where: { userId: actor.id },
        create: {
          userId: actor.id,
          bio: input.bio,
          targetUniversities: input.targetUniversities,
          availability: input.availability,
          topics: { connect: topics },
        },
        update: {
          bio: input.bio,
          targetUniversities: input.targetUniversities,
          availability: input.availability,
          topics: { set: topics },
        },
      });
    } else {
      // Invited mentors were vetted by the organizer who invited them.
      const status = (await wasInvitedAsMentor(user.email)) ? ("approved" as const) : ("pending" as const);
      const data = {
        university: input.university,
        bio: input.bio,
        availability: input.availability,
        capacity: input.capacity,
        status,
      };
      await tx.mentorProfile.upsert({
        where: { userId: actor.id },
        create: { userId: actor.id, ...data, topics: { connect: topics } },
        update: { ...data, topics: { set: topics } },
      });
    }
    return tx.user.update({
      where: { id: actor.id },
      data: { role: input.path, name: input.name, onboardedAt: new Date() },
    });
  });
}

export async function updateStudentProfile(actor: Actor, raw: StudentProfileInput) {
  assertRole(actor, "student");
  const input = parse(studentProfileSchema, raw);
  await assertActiveTopics(input.topicIds);
  const topics = input.topicIds.map((id) => ({ id }));
  const fields = { bio: input.bio, targetUniversities: input.targetUniversities, availability: input.availability };
  return db.studentProfile.upsert({
    where: { userId: actor.id },
    create: { userId: actor.id, ...fields, topics: { connect: topics } },
    update: { ...fields, topics: { set: topics } },
  });
}

/** Mentors can edit their profile at any time; it doesn't change their approval status. */
export async function updateMentorProfile(actor: Actor, raw: MentorProfileInput) {
  assertRole(actor, "mentor");
  const input = parse(mentorProfileSchema, raw);
  await assertActiveTopics(input.topicIds);
  const topics = input.topicIds.map((id) => ({ id }));
  const fields = {
    university: input.university,
    bio: input.bio,
    availability: input.availability,
    capacity: input.capacity,
  };
  return db.mentorProfile.upsert({
    where: { userId: actor.id },
    create: { userId: actor.id, ...fields, topics: { connect: topics } },
    update: { ...fields, topics: { set: topics } },
  });
}
