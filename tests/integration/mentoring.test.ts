import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ActionError } from "@/server/errors";
import {
  getRequestForMentor,
  listFeed,
  listMentorsByStatus,
  respondToRequest,
  reviewMentor,
  withdrawResponse,
} from "@/server/mentoring";
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

beforeEach(async () => {
  await resetDatabase();
  await seedTopics();
});

describe("mentor approval gate", () => {
  it("blocks pending and rejected mentors from the feed and from responding", async () => {
    const request = await createOpenRequest(await createStudent());
    for (const status of ["pending", "rejected"] as const) {
      const mentor = await createMentor({ status });
      await expectError(listFeed(mentor), "forbidden");
      await expectError(getRequestForMentor(mentor, request.id), "forbidden");
      await expectError(respondToRequest(mentor, request.id, { kind: "interested" }), "forbidden");
    }
  });

  it("blocks students from mentor actions", async () => {
    const student = await createStudent();
    const request = await createOpenRequest(await createStudent());
    await expectError(listFeed(student), "forbidden");
    await expectError(respondToRequest(student, request.id, { kind: "interested" }), "forbidden");
  });
});

describe("listFeed", () => {
  it("'mine' shows unanswered open requests in the mentor's topics", async () => {
    const mentor = await createMentor({ topics: ["essays"] });
    const student = await createStudent();
    const essay = await createOpenRequest(student, "essays");
    await createOpenRequest(student, "sat");
    await createOpenRequest(student, "essays", { status: "cancelled" });
    const answered = await createOpenRequest(student, "essays");
    await respondToRequest(mentor, answered.id, { kind: "interested" });

    expect((await listFeed(mentor, "mine")).map((r) => r.id)).toEqual([essay.id]);
  });

  it("'all' shows every open request except ones the mentor passed on", async () => {
    const mentor = await createMentor({ topics: ["essays"] });
    const student = await createStudent();
    const essay = await createOpenRequest(student, "essays");
    const sat = await createOpenRequest(student, "sat");
    const passed = await createOpenRequest(student, "sat");
    await respondToRequest(mentor, passed.id, { kind: "passed" });

    expect((await listFeed(mentor, "all")).map((r) => r.id).sort()).toEqual([essay.id, sat.id].sort());
  });

  it("'responded' shows answered requests in any status", async () => {
    const mentor = await createMentor();
    const request = await createOpenRequest(await createStudent());
    await respondToRequest(mentor, request.id, { kind: "interested", note: "Happy to help" });
    await db.mentorshipRequest.update({ where: { id: request.id }, data: { status: "matched" } });

    const feed = await listFeed(mentor, "responded");
    expect(feed).toHaveLength(1);
    expect(feed[0].responses[0]).toEqual({ kind: "interested", note: "Happy to help" });
  });

  it("puts urgent requests first, then the nearest deadline", async () => {
    const mentor = await createMentor();
    const student = await createStudent();
    const later = await createOpenRequest(student, "essays", { deadline: new Date("2030-03-01") });
    const sooner = await createOpenRequest(student, "essays", { deadline: new Date("2030-01-01") });
    const urgent = await createOpenRequest(student, "essays", { urgency: "high" });
    const none = await createOpenRequest(student, "essays");

    expect((await listFeed(mentor)).map((r) => r.id)).toEqual([urgent.id, sooner.id, later.id, none.id]);
  });
});

describe("respondToRequest", () => {
  it("records interest with a note, and a second answer replaces the first", async () => {
    const mentor = await createMentor();
    const request = await createOpenRequest(await createStudent());

    await respondToRequest(mentor, request.id, { kind: "interested", note: "I can help" });
    await respondToRequest(mentor, request.id, { kind: "passed" });

    const responses = await db.mentorResponse.findMany({ where: { requestId: request.id } });
    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({ kind: "passed", note: null });
  });

  it("refuses requests that are not open", async () => {
    const mentor = await createMentor();
    const request = await createOpenRequest(await createStudent(), "essays", { status: "cancelled" });
    await expectError(respondToRequest(mentor, request.id, { kind: "interested" }), "not_found");
  });

  it("enforces capacity for interest but still allows passing", async () => {
    const mentor = await createMentor({ capacity: 1 });
    await createActiveMatch(mentor);
    const request = await createOpenRequest(await createStudent());

    await expectError(respondToRequest(mentor, request.id, { kind: "interested" }), "conflict");
    await expect(respondToRequest(mentor, request.id, { kind: "passed" })).resolves.toMatchObject({ kind: "passed" });
  });

  it("does not count completed matches toward capacity", async () => {
    const mentor = await createMentor({ capacity: 1 });
    const match = await createActiveMatch(mentor);
    await db.match.update({ where: { id: match.id }, data: { status: "completed" } });
    const request = await createOpenRequest(await createStudent());

    await expect(respondToRequest(mentor, request.id, { kind: "interested" })).resolves.toBeDefined();
  });

  it("rejects an invalid response kind", async () => {
    const mentor = await createMentor();
    const request = await createOpenRequest(await createStudent());
    await expectError(respondToRequest(mentor, request.id, { kind: "maybe" as "interested" }), "invalid");
  });
});

describe("withdrawResponse", () => {
  it("removes the mentor's answer on an open request", async () => {
    const mentor = await createMentor();
    const request = await createOpenRequest(await createStudent());
    await respondToRequest(mentor, request.id, { kind: "interested" });

    await withdrawResponse(mentor, request.id);
    expect(await db.mentorResponse.count()).toBe(0);
  });

  it("does nothing to other mentors' answers", async () => {
    const [me, other] = [await createMentor(), await createMentor()];
    const request = await createOpenRequest(await createStudent());
    await respondToRequest(other, request.id, { kind: "interested" });

    await expectError(withdrawResponse(me, request.id), "not_found");
    expect(await db.mentorResponse.count()).toBe(1);
  });
});

describe("getRequestForMentor", () => {
  it("shows a closed request only to mentors who answered it", async () => {
    const [answered, stranger] = [await createMentor(), await createMentor()];
    const request = await createOpenRequest(await createStudent());
    await respondToRequest(answered, request.id, { kind: "interested" });
    await db.mentorshipRequest.update({ where: { id: request.id }, data: { status: "matched" } });

    await expect(getRequestForMentor(answered, request.id)).resolves.toMatchObject({ id: request.id });
    await expectError(getRequestForMentor(stranger, request.id), "not_found");
  });
});

describe("mentor review (organizers)", () => {
  it("lets organizers and admins approve or decline mentors", async () => {
    const pending = await createMentor({ status: "pending" });
    const organizer = await createUser("organizer");
    const admin = await createUser("admin");

    expect((await listMentorsByStatus(organizer, "pending")).map((m) => m.userId)).toEqual([pending.id]);

    await reviewMentor(organizer, pending.id, { decision: "approved" });
    let profile = await db.mentorProfile.findUniqueOrThrow({ where: { userId: pending.id } });
    expect(profile).toMatchObject({ status: "approved", reviewedById: organizer.id });

    await reviewMentor(admin, pending.id, { decision: "rejected" });
    profile = await db.mentorProfile.findUniqueOrThrow({ where: { userId: pending.id } });
    expect(profile.status).toBe("rejected");
  });

  it("blocks students and mentors from reviewing", async () => {
    const pending = await createMentor({ status: "pending" });
    await expectError(reviewMentor(await createStudent(), pending.id, { decision: "approved" }), "forbidden");
    await expectError(reviewMentor(await createMentor(), pending.id, { decision: "approved" }), "forbidden");
    await expectError(listMentorsByStatus(await createStudent(), "pending"), "forbidden");
  });
});
