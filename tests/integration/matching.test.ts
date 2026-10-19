import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { testOutbox } from "@/lib/email";
import { ActionError } from "@/server/errors";
import {
  cancelMatch,
  completeMatch,
  createMatch,
  getMatch,
  listMyMatches,
  listQueue,
  reassignMatch,
  submitFeedback,
  suggestMentors,
} from "@/server/matching";
import { respondToRequest, reviewMentor } from "@/server/mentoring";
import { resetDatabase } from "../support/db";
import { createActiveMatch, createMentor, createOpenRequest, createStudent, createUser, seedTopics } from "../support/factories";

async function expectError(promise: Promise<unknown>, code: ActionError["code"]) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ActionError);
  expect((error as ActionError).code).toBe(code);
}

const emailOf = (id: string) => db.user.findUniqueOrThrow({ where: { id } }).then((u) => u.email);

async function setup() {
  const organizer = await createUser("organizer");
  const student = await createStudent();
  const mentor = await createMentor({ topics: ["essays"] });
  const request = await createOpenRequest(student, "essays");
  return { organizer, student, mentor, request };
}

beforeEach(async () => {
  await resetDatabase();
  await seedTopics();
  testOutbox.length = 0;
});

describe("createMatch", () => {
  it("matches the request, logs an event and emails both people", async () => {
    const { organizer, student, mentor, request } = await setup();

    const match = await createMatch(organizer, request.id, mentor.id);

    expect(match).toMatchObject({ mentorId: mentor.id, organizerId: organizer.id, status: "active" });
    expect((await db.mentorshipRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("matched");
    expect(await db.matchEvent.findMany({ where: { matchId: match.id } })).toMatchObject([{ type: "created" }]);

    const recipients = testOutbox.map((e) => e.to).sort();
    expect(recipients).toEqual([await emailOf(student.id), await emailOf(mentor.id)].sort());
    // Each side gets the other's contact details and a link to the match.
    const toStudent = testOutbox.find((e) => e.to === recipients.find((r) => r.startsWith("student")))!;
    expect(toStudent.text).toContain(await emailOf(mentor.id));
    expect(toStudent.text).toContain(`/matches/${match.id}`);
  });

  it("only lets organizers and admins match", async () => {
    const { student, mentor, request } = await setup();
    await expectError(createMatch(student, request.id, mentor.id), "forbidden");
    await expectError(createMatch(mentor, request.id, mentor.id), "forbidden");
    await expect(createMatch(await createUser("admin"), request.id, mentor.id)).resolves.toBeDefined();
  });

  it("refuses unapproved mentors and people who aren't mentors", async () => {
    const { organizer, student, request } = await setup();
    const pending = await createMentor({ status: "pending" });
    await expectError(createMatch(organizer, request.id, pending.id), "conflict");
    await expectError(createMatch(organizer, request.id, student.id), "conflict");
    expect(testOutbox).toHaveLength(0);
  });

  it("refuses mentors with no free spots", async () => {
    const { organizer, request } = await setup();
    const busy = await createMentor({ capacity: 1 });
    await createActiveMatch(busy);
    await expectError(createMatch(organizer, request.id, busy.id), "conflict");
  });

  it("can't match a request twice", async () => {
    const { organizer, mentor, request } = await setup();
    await createMatch(organizer, request.id, mentor.id);
    await expectError(createMatch(organizer, request.id, (await createMentor()).id), "conflict");
  });

  it("re-matches a request after its match was cancelled", async () => {
    const { organizer, mentor, request } = await setup();
    const first = await createMatch(organizer, request.id, mentor.id);
    await cancelMatch(organizer, first.id, { reopen: true });

    const other = await createMentor();
    const second = await createMatch(organizer, request.id, other.id);
    expect(second.id).toBe(first.id);
    expect(second).toMatchObject({ mentorId: other.id, status: "active", cancelledAt: null });
    const events = await db.matchEvent.findMany({ where: { matchId: first.id }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => e.type)).toEqual(["created", "cancelled", "created"]);
  });
});

describe("suggestMentors", () => {
  it("ranks mentors who offered, then topic experts; hides passers and the current mentor", async () => {
    const { organizer, student, request } = await setup();
    const topicExpert = await createMentor({ topics: ["essays"] });
    const offered = await createMentor({ topics: ["sat"] });
    const passer = await createMentor({ topics: ["essays"] });
    const other = await createMentor({ topics: ["sat"] });
    await createMentor({ status: "pending", topics: ["essays"] });
    await respondToRequest(offered, request.id, { kind: "interested", note: "Pick me" });
    await respondToRequest(passer, request.id, { kind: "passed" });

    const ids = (await suggestMentors(organizer, request.id)).map((s) => s.mentorId);
    expect(ids[0]).toBe(offered.id);
    expect(ids.slice(1, 3)).toContain(topicExpert.id);
    expect(ids).toContain(other.id);
    expect(ids).not.toContain(passer.id);
    expect(ids).not.toContain(student.id);

    const match = await createMatch(organizer, request.id, offered.id);
    expect((await suggestMentors(organizer, request.id)).map((s) => s.mentorId)).not.toContain(match.mentorId);
  });

  it("is organizer-only", async () => {
    const { student, request } = await setup();
    await expectError(suggestMentors(student, request.id), "forbidden");
  });
});

describe("reassignMatch", () => {
  it("moves the match, logs it and tells all three people", async () => {
    const { organizer, mentor, request } = await setup();
    const match = await createMatch(organizer, request.id, mentor.id);
    testOutbox.length = 0;

    const next = await createMentor();
    const moved = await reassignMatch(organizer, match.id, next.id);

    expect(moved.mentorId).toBe(next.id);
    expect(testOutbox).toHaveLength(3);
    expect(testOutbox.map((e) => e.to)).toContain(await emailOf(mentor.id));
    const events = await db.matchEvent.findMany({ where: { matchId: match.id, type: "reassigned" } });
    expect(events[0].payload).toEqual({ from: mentor.id, to: next.id });
  });

  it("refuses the same mentor or a closed match", async () => {
    const { organizer, mentor, request } = await setup();
    const match = await createMatch(organizer, request.id, mentor.id);
    await expectError(reassignMatch(organizer, match.id, mentor.id), "conflict");
    await completeMatch(organizer, match.id);
    await expectError(reassignMatch(organizer, match.id, (await createMentor()).id), "conflict");
  });
});

describe("cancelMatch", () => {
  it("can reopen the request or close it", async () => {
    const { organizer, student, mentor } = await setup();
    const a = await createOpenRequest(student);
    const b = await createOpenRequest(student);
    const ma = await createMatch(organizer, a.id, mentor.id);
    const mb = await createMatch(organizer, b.id, mentor.id);

    await cancelMatch(organizer, ma.id, { reopen: "true", reason: "Schedules didn't line up" });
    await cancelMatch(organizer, mb.id, { reopen: "false" });

    expect((await db.mentorshipRequest.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("open");
    expect((await db.mentorshipRequest.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("cancelled");
    expect((await db.match.findUniqueOrThrow({ where: { id: ma.id } })).status).toBe("cancelled");
    const event = await db.matchEvent.findFirstOrThrow({ where: { matchId: ma.id, type: "cancelled" } });
    expect(event.payload).toEqual({ reopen: true, reason: "Schedules didn't line up" });
  });

  it("frees the mentor's spot", async () => {
    const { organizer, request, student } = await setup();
    const mentor = await createMentor({ capacity: 1 });
    const match = await createMatch(organizer, request.id, mentor.id);
    await cancelMatch(organizer, match.id, { reopen: true });
    await expect(createMatch(organizer, (await createOpenRequest(student)).id, mentor.id)).resolves.toBeDefined();
  });

  it("is organizer-only", async () => {
    const { organizer, student, mentor, request } = await setup();
    const match = await createMatch(organizer, request.id, mentor.id);
    await expectError(cancelMatch(student, match.id, { reopen: true }), "forbidden");
    await expectError(cancelMatch(mentor, match.id, { reopen: true }), "forbidden");
  });
});

describe("viewing a match", () => {
  it("is visible to its student, its mentor and organizers only", async () => {
    const { organizer, student, mentor, request } = await setup();
    const match = await createMatch(organizer, request.id, mentor.id);

    expect((await getMatch(student, match.id)).role).toBe("student");
    expect((await getMatch(mentor, match.id)).role).toBe("mentor");
    expect((await getMatch(await createUser("admin"), match.id)).role).toBe("organizer");
    await expectError(getMatch(await createStudent(), match.id), "not_found");
    await expectError(getMatch(await createMentor(), match.id), "not_found");
  });

  it("lists a mentor's active and completed matches", async () => {
    const { organizer, mentor, request, student } = await setup();
    const active = await createMatch(organizer, request.id, mentor.id);
    const cancelled = await createMatch(organizer, (await createOpenRequest(student)).id, mentor.id);
    await cancelMatch(organizer, cancelled.id, { reopen: true });

    expect((await listMyMatches(mentor)).map((m) => m.id)).toEqual([active.id]);
  });
});

describe("completeMatch and feedback", () => {
  it("lets the mentor complete, then the student rate once", async () => {
    const { organizer, student, mentor, request } = await setup();
    const match = await createMatch(organizer, request.id, mentor.id);
    testOutbox.length = 0;

    await completeMatch(mentor, match.id);
    expect((await db.mentorshipRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("completed");
    expect(testOutbox.map((e) => e.to)).toEqual([await emailOf(student.id)]);
    expect(testOutbox[0].subject).toMatch(/How did it go/);

    await submitFeedback(student, match.id, { rating: "5", comment: "So helpful!" });
    expect(await db.feedback.findUniqueOrThrow({ where: { matchId: match.id } })).toMatchObject({ rating: 5 });
    await expectError(submitFeedback(student, match.id, { rating: "4" }), "conflict");
  });

  it("lets the student complete too, but not strangers or twice", async () => {
    const { organizer, student, mentor, request } = await setup();
    const match = await createMatch(organizer, request.id, mentor.id);
    await expectError(completeMatch(await createStudent(), match.id), "not_found");
    await completeMatch(student, match.id);
    await expectError(completeMatch(mentor, match.id), "conflict");
  });

  it("only accepts feedback from the student on a completed match, rated 1–5", async () => {
    const { organizer, student, mentor, request } = await setup();
    const match = await createMatch(organizer, request.id, mentor.id);

    await expectError(submitFeedback(student, match.id, { rating: "5" }), "conflict");
    await completeMatch(student, match.id);
    await expectError(submitFeedback(mentor, match.id, { rating: "5" }), "forbidden");
    await expectError(submitFeedback(student, match.id, { rating: "9" }), "invalid");
    await expectError(submitFeedback(student, match.id, {} as never), "invalid");
  });
});

describe("organizer queue", () => {
  it("splits requests into needs-a-match, matched and closed", async () => {
    const { organizer, mentor, request, student } = await setup();
    const matched = await createOpenRequest(student);
    await createMatch(organizer, matched.id, mentor.id);
    await createOpenRequest(student, "essays", { status: "cancelled" });

    expect((await listQueue(organizer, "open")).map((r) => r.id)).toEqual([request.id]);
    expect((await listQueue(organizer, "active")).map((r) => r.id)).toEqual([matched.id]);
    expect(await listQueue(organizer, "closed")).toHaveLength(1);
    await expectError(listQueue(student, "open"), "forbidden");
  });
});

describe("mentor review emails", () => {
  it("emails the mentor when their status changes, and not when it stays the same", async () => {
    const organizer = await createUser("organizer");
    const mentor = await createMentor({ status: "pending" });

    await reviewMentor(organizer, mentor.id, { decision: "approved" });
    await reviewMentor(organizer, mentor.id, { decision: "approved" });

    expect(testOutbox).toHaveLength(1);
    expect(testOutbox[0]).toMatchObject({ to: await emailOf(mentor.id), subject: expect.stringMatching(/approved/) });
  });
});
