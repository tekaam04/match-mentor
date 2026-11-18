import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { rankCandidates } from "@/lib/match-score";
import { ActionError } from "@/server/errors";
import { completeMatch, createMatch, submitFeedback } from "@/server/matching";
import { exportPilotCsv, getTopicBreakdown, loadMetricRows, rankMentors } from "@/server/analytics";
import { resetDatabase } from "../support/db";
import { createMentor, createOpenRequest, createStudent, createUser, seedTopics } from "../support/factories";

/**
 * Most tests here run without the Python service and check the fallbacks.
 * When ANALYTICS_URL points at a running service (CI starts one), the "live service" tests
 * also exercise the real HTTP contract between the two languages.
 */
const liveService = Boolean(process.env.ANALYTICS_URL);

async function expectError(promise: Promise<unknown>, code: ActionError["code"]) {
  await expect(promise).rejects.toSatisfy((e) => e instanceof ActionError && e.code === code);
}

beforeEach(async () => {
  await resetDatabase();
  await seedTopics();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function pilotWithOneCompletedMatch() {
  const organizer = await createUser("organizer");
  const student = await createStudent();
  const mentor = await createMentor();
  const request = await createOpenRequest(student);
  const match = await createMatch(organizer, request.id, mentor.id);
  await completeMatch(organizer, match.id);
  await submitFeedback(student, match.id, { rating: 4, comment: "Very helpful" });
  await createOpenRequest(student, "sat");
  return { organizer, student, mentor };
}

const candidates = [
  { mentorId: "a", name: "Ann", interested: false, topicMatch: true, activeMatches: 0, capacity: 2 },
  { mentorId: "b", name: "Ben", interested: true, topicMatch: false, activeMatches: 1, capacity: 2 },
];

describe("rankMentors", () => {
  it("falls back to the TypeScript rules when the service is unreachable", async () => {
    vi.stubEnv("ANALYTICS_URL", "http://127.0.0.1:9");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await rankMentors(candidates)).toEqual(rankCandidates(candidates));
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it("falls back when the service answers with the wrong mentors", async () => {
    vi.stubEnv("ANALYTICS_URL", "http://analytics.test");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ ranked: [{ mentorId: "zzz", score: 1, remaining: 1, reasons: [] }] }),
    );
    expect(await rankMentors(candidates)).toEqual(rankCandidates(candidates));
  });

  it("uses the service's ranking and keeps local fields, sending no names", async () => {
    vi.stubEnv("ANALYTICS_URL", "http://analytics.test");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        ranked: [
          { mentorId: "a", score: 999, remaining: 2, reasons: ["from python"] },
          { mentorId: "b", score: 1, remaining: 1, reasons: [] },
        ],
      }),
    );
    const ranked = await rankMentors(candidates);
    expect(ranked.map((r) => [r.mentorId, r.name, r.score])).toEqual([
      ["a", "Ann", 999],
      ["b", "Ben", 1],
    ]);
    expect(String(fetchMock.mock.calls[0][1]?.body)).not.toContain("Ann");
  });
});

describe("loadMetricRows", () => {
  it("is for organizers only", async () => {
    await expectError(loadMetricRows(await createStudent()), "forbidden");
    await expectError(loadMetricRows(await createMentor()), "forbidden");
  });

  it("sends one row per request with no names or emails", async () => {
    const { organizer, student, mentor } = await pilotWithOneCompletedMatch();
    const payload = await loadMetricRows(organizer);

    expect(payload.requests).toHaveLength(2);
    const done = payload.requests.find((r) => r.match);
    expect(done).toMatchObject({ topic: expect.any(String), rating: 4, match: { status: "completed" } });

    const json = JSON.stringify(payload);
    const people = await db.user.findMany({ where: { id: { in: [student.id, mentor.id] } } });
    for (const p of people) {
      expect(json).not.toContain(p.id);
      expect(json).not.toContain(p.name);
      expect(json).not.toContain(p.email);
    }
    expect(json).not.toContain("Very helpful");
  });
});

describe("without the service", () => {
  it("hides the topic breakdown and refuses the export", async () => {
    vi.stubEnv("ANALYTICS_URL", "");
    const organizer = await createUser("organizer");
    expect(await getTopicBreakdown(organizer)).toBeNull();
    await expect(exportPilotCsv(organizer)).rejects.toMatchObject({ name: "AnalyticsError" });
  });
});

describe.runIf(liveService)("against the live Python service", () => {
  it("ranks suggestions the same way as the TypeScript fallback", async () => {
    const warn = vi.spyOn(console, "warn");
    expect(await rankMentors(candidates)).toEqual(rankCandidates(candidates));
    expect(warn).not.toHaveBeenCalled();
  });

  it("builds the topic breakdown and CSV export", async () => {
    const { organizer } = await pilotWithOneCompletedMatch();

    const breakdown = await getTopicBreakdown(organizer);
    expect(breakdown?.overall).toMatchObject({ requests: 2, completed: 1, waiting: 1, completionRate: 1, averageRating: 4 });
    expect(breakdown?.byTopic).toHaveLength(2);

    const csv = await exportPilotCsv(organizer);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toMatch(/^request_id,topic,urgency,posted_at/);
    expect(lines).toHaveLength(3);
  });
});
