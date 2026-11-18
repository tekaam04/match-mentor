import json
from pathlib import Path

import pytest

from s2s_analytics.scoring import Candidate, rank_candidates

FIXTURE = json.loads((Path(__file__).parents[1] / "fixtures" / "match-score-cases.json").read_text())
CASES = FIXTURE["cases"]


def to_candidate(c: dict) -> Candidate:
    return Candidate(
        mentor_id=c["mentorId"],
        interested=c["interested"],
        topic_match=c["topicMatch"],
        active_matches=c["activeMatches"],
        capacity=c["capacity"],
    )


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_rank_candidates_matches_shared_fixture(case: dict) -> None:
    ranked = rank_candidates([to_candidate(c) for c in case["candidates"]])
    got = [{"mentorId": s.mentor_id, "score": s.score, "remaining": s.remaining, "reasons": s.reasons} for s in ranked]
    assert got == case["expected"]


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_score_endpoint_matches_shared_fixture(client, auth_headers, case: dict) -> None:
    res = client.post("/api/analytics/score", json={"candidates": case["candidates"]}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == {"ranked": case["expected"]}


def test_score_rejects_invalid_input(client, auth_headers) -> None:
    bad = {
        "candidates": [{"mentorId": "a", "interested": True, "topicMatch": False, "activeMatches": -1, "capacity": 3}]
    }
    assert client.post("/score", json=bad, headers=auth_headers).status_code == 422
    extra = {"candidates": [], "unexpected": 1}
    assert client.post("/score", json=extra, headers=auth_headers).status_code == 422
