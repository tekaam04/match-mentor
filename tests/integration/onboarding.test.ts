import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ActionError } from "@/server/errors";
import { completeOnboarding, updateMentorProfile, updateStudentProfile } from "@/server/profiles";
import { resetDatabase } from "../support/db";
import { createMentor, createStudent, createUser, seedTopics, topicId } from "../support/factories";

async function expectError(promise: Promise<unknown>, code: ActionError["code"]) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ActionError);
  expect((error as ActionError).code).toBe(code);
  return error as ActionError;
}

const mentorInput = async () => ({
  path: "mentor" as const,
  name: "Meron Tesfaye",
  university: "MIT",
  bio: "I applied from Addis and can help with essays and interviews.",
  capacity: "2",
  topicIds: [await topicId("essays"), await topicId("interviews")],
});

beforeEach(async () => {
  await resetDatabase();
  await seedTopics();
});

describe("completeOnboarding", () => {
  it("sets up a student with their profile", async () => {
    const user = await createUser("student", { onboarded: false });
    const updated = await completeOnboarding(user, {
      path: "student",
      name: "  Selam Bekele ",
      targetUniversities: "MIT, MIT, Yale",
      topicIds: await topicId("sat"),
    });

    expect(updated).toMatchObject({ role: "student", name: "Selam Bekele" });
    expect(updated.onboardedAt).toBeInstanceOf(Date);
    const profile = await db.studentProfile.findUniqueOrThrow({ where: { userId: user.id }, include: { topics: true } });
    expect(profile.targetUniversities).toEqual(["MIT", "Yale"]);
    expect(profile.topics.map((t) => t.slug)).toEqual(["sat"]);
  });

  it("turns a new user into a pending mentor", async () => {
    const user = await createUser("student", { onboarded: false });
    const updated = await completeOnboarding(user, await mentorInput());

    expect(updated.role).toBe("mentor");
    const profile = await db.mentorProfile.findUniqueOrThrow({ where: { userId: user.id }, include: { topics: true } });
    expect(profile).toMatchObject({ status: "pending", capacity: 2, university: "MIT" });
    expect(profile.topics).toHaveLength(2);
  });

  it("can only be done once, so users can't switch themselves to mentor later", async () => {
    const user = await createUser("student", { onboarded: false });
    await completeOnboarding(user, { path: "student", name: "Selam Bekele" });
    await expectError(completeOnboarding(user, await mentorInput()), "conflict");
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("student");
  });

  it("is not available to staff", async () => {
    const organizer = await createUser("organizer", { onboarded: false });
    await expectError(completeOnboarding(organizer, { path: "student", name: "Olivia" }), "forbidden");
  });

  it("requires a name, and a bio and topic for mentors", async () => {
    const user = await createUser("student", { onboarded: false });
    const error = await expectError(
      completeOnboarding(user, { path: "mentor", name: "", university: "MIT", bio: "short", capacity: "3" }),
      "invalid",
    );
    expect(Object.keys(error.fieldErrors ?? {}).sort()).toEqual(["bio", "name", "topicIds"]);
  });

  it("rejects an unknown path", async () => {
    const user = await createUser("student", { onboarded: false });
    await expectError(completeOnboarding(user, { path: "admin", name: "Sneaky" } as never), "invalid");
  });
});

describe("profile updates", () => {
  it("updates a student profile", async () => {
    const student = await createStudent();
    await updateStudentProfile(student, { bio: "Hello", targetUniversities: "Toronto", topicIds: [] });
    expect(await db.studentProfile.findUniqueOrThrow({ where: { userId: student.id } })).toMatchObject({
      bio: "Hello",
      targetUniversities: ["Toronto"],
    });
  });

  it("lets mentors edit their profile without changing approval", async () => {
    const mentor = await createMentor({ status: "pending" });
    await updateMentorProfile(mentor, { ...(await mentorInput()), capacity: "5" });
    expect(await db.mentorProfile.findUniqueOrThrow({ where: { userId: mentor.id } })).toMatchObject({
      status: "pending",
      capacity: 5,
    });
  });

  it("keeps each role to its own profile", async () => {
    await expectError(updateMentorProfile(await createStudent(), await mentorInput()), "forbidden");
    await expectError(updateStudentProfile(await createMentor(), {}), "forbidden");
  });

  it("validates mentor capacity", async () => {
    const mentor = await createMentor();
    const error = await expectError(updateMentorProfile(mentor, { ...(await mentorInput()), capacity: "50" }), "invalid");
    expect(error.fieldErrors?.capacity).toBeDefined();
  });
});
