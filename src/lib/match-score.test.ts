import { describe, expect, it } from "vitest";
import { rankCandidates, scoreCandidate } from "./match-score";

const base = { interested: false, topicMatch: false, activeMatches: 0, capacity: 3 };

describe("scoreCandidate", () => {
  it("explains each part of the score", () => {
    const s = scoreCandidate({ ...base, mentorId: "a", interested: true, topicMatch: true, activeMatches: 1 });
    expect(s.remaining).toBe(2);
    expect(s.reasons).toEqual(["Offered to help", "Knows this topic", "2 spots free"]);
  });

  it("flags mentors at capacity", () => {
    const s = scoreCandidate({ ...base, mentorId: "a", activeMatches: 3 });
    expect(s.remaining).toBe(0);
    expect(s.reasons).toContain("At capacity");
  });
});

describe("rankCandidates", () => {
  it("ranks interest above topic, topic above free capacity, and full mentors last", () => {
    const ranked = rankCandidates([
      { ...base, mentorId: "free", capacity: 10 },
      { ...base, mentorId: "full-but-interested", interested: true, topicMatch: true, activeMatches: 3 },
      { ...base, mentorId: "topic", topicMatch: true },
      { ...base, mentorId: "interested", interested: true },
    ]);
    expect(ranked.map((c) => c.mentorId)).toEqual(["interested", "topic", "free", "full-but-interested"]);
  });

  it("breaks ties by remaining capacity", () => {
    const ranked = rankCandidates([
      { ...base, mentorId: "busy", topicMatch: true, activeMatches: 2 },
      { ...base, mentorId: "open", topicMatch: true },
    ]);
    expect(ranked.map((c) => c.mentorId)).toEqual(["open", "busy"]);
  });
});
