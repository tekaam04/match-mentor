export type MentorCandidate = {
  mentorId: string;
  /** The mentor said "I can help" with this request. */
  interested: boolean;
  /** The mentor lists the request's topic. */
  topicMatch: boolean;
  activeMatches: number;
  capacity: number;
};

export type ScoredCandidate<T extends MentorCandidate> = T & {
  score: number;
  remaining: number;
  reasons: string[];
};

/**
 * Simple, explainable ranking for organizers:
 * mentors who offered to help come first, then topic experts, then whoever has the most free capacity.
 * Mentors with no capacity left sink to the bottom but stay visible.
 */
export function scoreCandidate<T extends MentorCandidate>(c: T): ScoredCandidate<T> {
  const remaining = Math.max(0, c.capacity - c.activeMatches);
  const reasons: string[] = [];
  let score = 0;

  if (c.interested) {
    score += 100;
    reasons.push("Offered to help");
  }
  if (c.topicMatch) {
    score += 50;
    reasons.push("Knows this topic");
  }
  if (remaining === 0) {
    score -= 1000;
    reasons.push("At capacity");
  } else {
    score += remaining * 5;
    reasons.push(`${remaining} spot${remaining === 1 ? "" : "s"} free`);
  }

  return { ...c, score, remaining, reasons };
}

export function rankCandidates<T extends MentorCandidate>(candidates: T[]): ScoredCandidate<T>[] {
  return candidates.map(scoreCandidate).sort((a, b) => b.score - a.score);
}
