"""Mentor ranking for the organizer's matching screen.

Simple and explainable on purpose: organizers make the final call, so every point
in a score comes with a human-readable reason.

The TypeScript fallback in src/lib/match-score.ts implements the same rules.
tests/fixtures/match-score-cases.json is run against both so they can't drift apart.
"""

from dataclasses import dataclass

INTERESTED_POINTS = 100
TOPIC_POINTS = 50
POINTS_PER_FREE_SPOT = 5
AT_CAPACITY_PENALTY = 1000


@dataclass(frozen=True)
class Candidate:
    mentor_id: str
    interested: bool
    topic_match: bool
    active_matches: int
    capacity: int


@dataclass(frozen=True)
class Scored:
    mentor_id: str
    score: int
    remaining: int
    reasons: list[str]


def score_candidate(c: Candidate) -> Scored:
    remaining = max(0, c.capacity - c.active_matches)
    reasons: list[str] = []
    score = 0

    if c.interested:
        score += INTERESTED_POINTS
        reasons.append("Offered to help")
    if c.topic_match:
        score += TOPIC_POINTS
        reasons.append("Knows this topic")
    if remaining == 0:
        score -= AT_CAPACITY_PENALTY
        reasons.append("At capacity")
    else:
        score += remaining * POINTS_PER_FREE_SPOT
        reasons.append(f"{remaining} spot{'' if remaining == 1 else 's'} free")

    return Scored(mentor_id=c.mentor_id, score=score, remaining=remaining, reasons=reasons)


def rank_candidates(candidates: list[Candidate]) -> list[Scored]:
    """Highest score first. Ties keep their input order (sorted() is stable), like the TS version."""
    return sorted((score_candidate(c) for c in candidates), key=lambda s: -s.score)
