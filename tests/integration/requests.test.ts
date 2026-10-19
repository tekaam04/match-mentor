import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ActionError } from "@/server/errors";
import { cancelRequest, createRequest, getMyRequest, listMyRequests, updateRequest } from "@/server/requests";
import { resetDatabase } from "../support/db";
import { createMentor, createOpenRequest, createStudent, createUser, seedTopics, topicId, validRequest } from "../support/factories";

async function expectError(promise: Promise<unknown>, code: ActionError["code"]) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ActionError);
  expect((error as ActionError).code).toBe(code);
  return error as ActionError;
}

beforeEach(async () => {
  await resetDatabase();
  await seedTopics();
});

describe("createRequest", () => {
  it("creates an open request owned by the student", async () => {
    const student = await createStudent();
    const request = await createRequest(student, validRequest(await topicId("essays")));

    expect(request.status).toBe("open");
    expect(request.studentId).toBe(student.id);
    expect(request.targetUniversities).toEqual(["MIT", "Yale"]);
    expect(request.urgency).toBe("high");
  });

  it("only lets students create requests", async () => {
    const topic = await topicId("essays");
    await expectError(createRequest(await createMentor(), validRequest(topic)), "forbidden");
    await expectError(createRequest(await createUser("organizer"), validRequest(topic)), "forbidden");
  });

  it("reports each invalid field", async () => {
    const student = await createStudent();
    const error = await expectError(
      createRequest(student, { topicId: "", title: "Hi", description: "short", deadline: "2001-01-01" }),
      "invalid",
    );
    expect(Object.keys(error.fieldErrors ?? {}).sort()).toEqual(["deadline", "description", "title", "topicId"]);
  });

  it("rejects an unknown or inactive topic", async () => {
    const student = await createStudent();
    await expectError(createRequest(student, validRequest("nope")), "invalid");

    const topic = await topicId("sat");
    await db.topic.update({ where: { id: topic }, data: { active: false } });
    const error = await expectError(createRequest(student, validRequest(topic)), "invalid");
    expect(error.fieldErrors?.topicId).toBeDefined();
  });

  it("accepts today as a deadline", async () => {
    const student = await createStudent();
    const today = new Date().toISOString().slice(0, 10);
    const request = await createRequest(student, { ...validRequest(await topicId("essays")), deadline: today });
    expect(request.deadline?.toISOString().slice(0, 10)).toBe(today);
  });
});

describe("reading requests", () => {
  it("lists only the student's own requests", async () => {
    const [me, other] = [await createStudent(), await createStudent()];
    await createOpenRequest(me);
    await createOpenRequest(other);

    const mine = await listMyRequests(me);
    expect(mine).toHaveLength(1);
    expect(mine[0].studentId).toBe(me.id);
  });

  it("hides other students' requests as not found", async () => {
    const [me, other] = [await createStudent(), await createStudent()];
    const theirs = await createOpenRequest(other);
    await expectError(getMyRequest(me, theirs.id), "not_found");
  });

  it("counts only interested mentor responses", async () => {
    const student = await createStudent();
    const request = await createOpenRequest(student);
    const [m1, m2] = [await createMentor(), await createMentor()];
    await db.mentorResponse.create({ data: { requestId: request.id, mentorId: m1.id, kind: "interested" } });
    await db.mentorResponse.create({ data: { requestId: request.id, mentorId: m2.id, kind: "passed" } });

    expect((await getMyRequest(student, request.id))._count.responses).toBe(1);
  });
});

describe("updateRequest", () => {
  it("updates an open request", async () => {
    const student = await createStudent();
    const request = await createOpenRequest(student);
    const updated = await updateRequest(student, request.id, {
      ...validRequest(await topicId("sat")),
      title: "New title here",
    });
    expect(updated.title).toBe("New title here");
  });

  it("refuses to edit someone else's request", async () => {
    const request = await createOpenRequest(await createStudent());
    await expectError(updateRequest(await createStudent(), request.id, validRequest(request.topicId)), "not_found");
  });

  it("refuses to edit a matched request", async () => {
    const student = await createStudent();
    const request = await createOpenRequest(student, "essays", { status: "matched" });
    await expectError(updateRequest(student, request.id, validRequest(request.topicId)), "conflict");
  });
});

describe("cancelRequest", () => {
  it("cancels an open request", async () => {
    const student = await createStudent();
    const request = await createOpenRequest(student);
    await cancelRequest(student, request.id);
    expect((await db.mentorshipRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("cancelled");
  });

  it("refuses to cancel a matched or already-cancelled request", async () => {
    const student = await createStudent();
    const matched = await createOpenRequest(student, "essays", { status: "matched" });
    const cancelled = await createOpenRequest(student, "essays", { status: "cancelled" });
    await expectError(cancelRequest(student, matched.id), "conflict");
    await expectError(cancelRequest(student, cancelled.id), "conflict");
  });

  it("refuses to cancel someone else's request", async () => {
    const request = await createOpenRequest(await createStudent());
    await expectError(cancelRequest(await createStudent(), request.id), "not_found");
  });
});
