import { beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { testOutbox } from "@/lib/email";
import { ActionError } from "@/server/errors";
import { createMatch } from "@/server/matching";
import { changeRole, createInvite, listInvites, listPeople, revokeInvite } from "@/server/people";
import { completeOnboarding } from "@/server/profiles";
import { resetDatabase } from "../support/db";
import { createMentor, createOpenRequest, createStudent, createUser, seedTopics, topicId } from "../support/factories";

const BASE = "http://localhost:3000";

async function expectError(promise: Promise<unknown>, code: ActionError["code"]) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ActionError);
  expect((error as ActionError).code).toBe(code);
}

/** Signs up through the real magic-link endpoint and returns the new user. */
async function signUp(email: string) {
  await auth.handler(
    new Request(`${BASE}/api/auth/sign-in/magic-link`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE },
      body: JSON.stringify({ email }),
    }),
  );
  const link = testOutbox.findLast((e) => e.to === email)!.text.match(/https?:\/\/\S+/)![0];
  await auth.handler(new Request(link));
  return db.user.findUniqueOrThrow({ where: { email } });
}

beforeEach(async () => {
  await resetDatabase();
  await seedTopics();
  testOutbox.length = 0;
});

describe("invites", () => {
  it("emails the invitee and lists the pending invite", async () => {
    const organizer = await createUser("organizer");
    await createInvite(organizer, { email: " New.Mentor@Test.local ", role: "mentor" });

    expect(testOutbox).toHaveLength(1);
    expect(testOutbox[0]).toMatchObject({ to: "new.mentor@test.local", subject: expect.stringMatching(/invited you/) });
    expect((await listInvites(organizer)).map((i) => i.email)).toEqual(["new.mentor@test.local"]);
  });

  it("refreshes an existing invite instead of duplicating it", async () => {
    const organizer = await createUser("organizer");
    await createInvite(organizer, { email: "a@test.local", role: "student" });
    await createInvite(organizer, { email: "a@test.local", role: "mentor" });
    const invites = await listInvites(organizer);
    expect(invites).toHaveLength(1);
    expect(invites[0].role).toBe("mentor");
  });

  it("gives an invited mentor the mentor role and skips approval", async () => {
    const organizer = await createUser("organizer");
    await createInvite(organizer, { email: "invited@test.local", role: "mentor" });

    const user = await signUp("invited@test.local");
    expect(user.role).toBe("mentor");
    expect(await listInvites(organizer)).toHaveLength(0);

    await completeOnboarding(user, {
      path: "mentor",
      name: "Invited Mentor",
      university: "MIT",
      bio: "Happy to help with essays and interviews.",
      capacity: "2",
      topicIds: [await topicId("essays")],
    });
    expect((await db.mentorProfile.findUniqueOrThrow({ where: { userId: user.id } })).status).toBe("approved");
  });

  it("leaves self-signed-up mentors pending", async () => {
    const user = await signUp("walkin@test.local");
    expect(user.role).toBe("student");
    await completeOnboarding(user, {
      path: "mentor",
      name: "Walk In",
      university: "MIT",
      bio: "Happy to help with essays and interviews.",
      capacity: "2",
      topicIds: [await topicId("essays")],
    });
    expect((await db.mentorProfile.findUniqueOrThrow({ where: { userId: user.id } })).status).toBe("pending");
  });

  it("gives invited organizers their role with no onboarding needed", async () => {
    const admin = await createUser("admin");
    await createInvite(admin, { email: "org@test.local", role: "organizer" });
    expect((await signUp("org@test.local")).role).toBe("organizer");
  });

  it("ignores expired invites", async () => {
    const organizer = await createUser("organizer");
    const invite = await createInvite(organizer, { email: "late@test.local", role: "mentor" });
    await db.invite.update({ where: { id: invite.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await signUp("late@test.local")).role).toBe("student");
  });

  it("only lets admins invite staff, and nobody but staff invite at all", async () => {
    const organizer = await createUser("organizer");
    await expectError(createInvite(organizer, { email: "x@test.local", role: "organizer" }), "forbidden");
    await expectError(createInvite(organizer, { email: "x@test.local", role: "admin" }), "forbidden");
    await expectError(createInvite(await createStudent(), { email: "x@test.local", role: "student" }), "forbidden");
    await expectError(createInvite(await createMentor(), { email: "x@test.local", role: "mentor" }), "forbidden");
  });

  it("rejects bad emails and people who already have accounts", async () => {
    const organizer = await createUser("organizer");
    await expectError(createInvite(organizer, { email: "not-an-email", role: "student" }), "invalid");
    const existing = await db.user.findUniqueOrThrow({ where: { id: (await createStudent()).id } });
    await expectError(createInvite(organizer, { email: existing.email, role: "mentor" }), "conflict");
  });

  it("can be revoked so the person signs up as a regular student", async () => {
    const organizer = await createUser("organizer");
    const invite = await createInvite(organizer, { email: "revoked@test.local", role: "mentor" });
    await revokeInvite(organizer, invite.id);
    expect((await signUp("revoked@test.local")).role).toBe("student");
  });
});

describe("changeRole", () => {
  it("lets admins promote a student to an approved mentor", async () => {
    const admin = await createUser("admin");
    const student = await createStudent();
    await changeRole(admin, student.id, { role: "mentor" });

    const user = await db.user.findUniqueOrThrow({ where: { id: student.id }, include: { mentorProfile: true } });
    expect(user.role).toBe("mentor");
    expect(user.mentorProfile?.status).toBe("approved");
  });

  it("is admin-only and can't be used on yourself", async () => {
    const admin = await createUser("admin");
    const student = await createStudent();
    await expectError(changeRole(await createUser("organizer"), student.id, { role: "mentor" }), "forbidden");
    await expectError(changeRole(admin, admin.id, { role: "student" }), "conflict");
    await expectError(changeRole(admin, student.id, { role: "superuser" }), "invalid");
  });

  it("won't remove a mentor who still has active matches", async () => {
    const admin = await createUser("admin");
    const mentor = await createMentor();
    await createMatch(admin, (await createOpenRequest(await createStudent())).id, mentor.id);
    await expectError(changeRole(admin, mentor.id, { role: "student" }), "conflict");
  });
});

describe("listPeople", () => {
  it("searches by name or email and filters by role, for organizers only", async () => {
    const organizer = await createUser("organizer", { name: "Olivia" });
    await createUser("student", { name: "Selam Bekele" });
    await createUser("mentor", { name: "Meron" });

    expect((await listPeople(organizer, { q: "selam" })).map((p) => p.name)).toEqual(["Selam Bekele"]);
    expect((await listPeople(organizer, { role: "mentor" })).map((p) => p.name)).toEqual(["Meron"]);
    await expectError(listPeople(await createStudent()), "forbidden");
  });
});
