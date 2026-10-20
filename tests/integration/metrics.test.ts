import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { ActionError } from "@/server/errors";
import { cancelMatch, completeMatch, createMatch, submitFeedback } from "@/server/matching";
import { getAttentionItems, getDashboardMetrics, STALE_AFTER_DAYS } from "@/server/metrics";
import { resetDatabase } from "../support/db";
import { createMentor, createOpenRequest, createStudent, createUser, seedTopics } from "../support/factories";

const DAY = 86_400_000;

beforeEach(async () => {
  await resetDatabase();
  await seedTopics();
});

describe("getDashboardMetrics", () => {
  it("returns empty-state values before anything has happened", async () => {
    const m = await getDashboardMetrics(await createUser("organizer"));
    expect(m).toMatchObject({
      completionRate: null,
      medianDaysToMatch: null,
      medianDaysToComplete: null,
      mentorUtilization: null,
      averageRating: null,
      ratingCount: 0,
    });
  });

  it("computes completion rate over completed, ended and stale matches", async () => {
    const organizer = await createUser("organizer");
    const student = await createStudent();
    const mentor = await createMentor({ capacity: 10 });
    const make = async () => createMatch(organizer, (await createOpenRequest(student)).id, mentor.id);

    const [done1, done2, ended, stale] = [await make(), await make(), await make(), await make()];
    await make(); // fresh active match: too early to count either way
    await completeMatch(organizer, done1.id);
    await completeMatch(organizer, done2.id);
    await cancelMatch(organizer, ended.id, { reopen: false });
    await db.match.update({
      where: { id: stale.id },
      data: { matchedAt: new Date(Date.now() - (STALE_AFTER_DAYS + 1) * DAY) },
    });

    const m = await getDashboardMetrics(organizer);
    expect(m).toMatchObject({ completedMatches: 2, endedMatches: 1, staleMatches: 1, activeMatches: 2 });
    expect(m.completionRate).toBe(0.5);
    expect(m.mentorUtilization).toBeCloseTo(2 / 10);
  });

  it("measures median time to match and to complete, and the average rating", async () => {
    const organizer = await createUser("organizer");
    const student = await createStudent();
    const mentor = await createMentor({ capacity: 10 });

    for (const [postedDaysAgo, rating] of [
      [4, 5],
      [2, 3],
    ]) {
      const request = await createOpenRequest(student, "essays", { createdAt: new Date(Date.now() - postedDaysAgo * DAY) });
      const match = await createMatch(organizer, request.id, mentor.id);
      await completeMatch(student, match.id);
      await submitFeedback(student, match.id, { rating: String(rating) });
    }

    const m = await getDashboardMetrics(organizer);
    expect(m.medianDaysToMatch).toBeCloseTo(3, 1);
    expect(m.medianDaysToComplete).toBeCloseTo(0, 1);
    expect(m.averageRating).toBe(4);
    expect(m.ratingCount).toBe(2);
  });

  it("is organizer-only", async () => {
    await expect(getDashboardMetrics(await createStudent())).rejects.toBeInstanceOf(ActionError);
  });
});

describe("getAttentionItems", () => {
  it("lists quiet matches and requests waiting 3+ days", async () => {
    const organizer = await createUser("organizer");
    const student = await createStudent();
    const mentor = await createMentor();
    const old = await createOpenRequest(student, "essays", { createdAt: new Date(Date.now() - 5 * DAY) });
    await createOpenRequest(student); // fresh
    const quiet = await createMatch(organizer, (await createOpenRequest(student)).id, mentor.id);
    await db.match.update({ where: { id: quiet.id }, data: { matchedAt: new Date(Date.now() - 30 * DAY) } });

    const items = await getAttentionItems(organizer);
    expect(items.waitingRequests.map((r) => r.id)).toEqual([old.id]);
    expect(items.staleMatches.map((s) => s.id)).toEqual([quiet.id]);
  });
});
