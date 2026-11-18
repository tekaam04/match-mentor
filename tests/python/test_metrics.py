import csv
import io
from datetime import UTC, datetime, timedelta

from s2s_analytics.metrics import MatchInfo, RequestRow, classify, summarize, summarize_by_topic, to_csv

NOW = datetime(2026, 11, 15, 12, 0, tzinfo=UTC)


def days_ago(n: float) -> datetime:
    return NOW - timedelta(days=n)


def row(rid: str, topic: str = "Essays", status: str = "matched", match: MatchInfo | None = None, **kw) -> RequestRow:
    return RequestRow(
        request_id=rid,
        topic=topic,
        urgency=kw.get("urgency", "normal"),
        request_status=status,
        created_at=kw.get("created_at", days_ago(30)),
        offers=kw.get("offers", 1),
        match=match,
        rating=kw.get("rating"),
    )


ROWS = [
    row("waiting", status="open", created_at=days_ago(4), offers=0),
    row("withdrawn", status="cancelled"),
    row("active", match=MatchInfo("active", matched_at=days_ago(3))),
    row("stale", topic="SAT", match=MatchInfo("active", matched_at=days_ago(20))),
    row(
        "done",
        status="completed",
        created_at=days_ago(30),
        match=MatchInfo("completed", matched_at=days_ago(29), completed_at=days_ago(19)),
        rating=5,
    ),
    row(
        "ended",
        topic="SAT",
        status="cancelled",
        match=MatchInfo("cancelled", matched_at=days_ago(10), cancelled_at=days_ago(8)),
    ),
]


def enriched():
    return [classify(r, NOW, stale_after_days=14) for r in ROWS]


def test_classifies_each_outcome() -> None:
    assert [e.outcome for e in enriched()] == ["waiting", "closed", "active", "stale", "completed", "ended"]


def test_durations() -> None:
    by_id = {e.row.request_id: e for e in enriched()}
    assert by_id["waiting"].days_waiting == 4
    assert by_id["done"].hours_to_match == 24
    assert by_id["done"].days_to_complete == 10
    assert by_id["withdrawn"].hours_to_match is None


def test_summary_uses_dashboard_definitions() -> None:
    s = summarize(enriched())
    assert (s.requests, s.waiting, s.active, s.stale, s.completed, s.ended) == (6, 1, 1, 1, 1, 1)
    # completed / (completed + ended + stale)
    assert s.completion_rate == 1 / 3
    # ended matches are left out of time-to-match: active 27d, stale 10d, done 1d -> median 10 days
    assert s.median_hours_to_match == 240
    assert s.median_days_to_complete == 10
    assert (s.average_rating, s.ratings) == (5, 1)


def test_empty_summary_has_no_rates() -> None:
    s = summarize([])
    assert s.completion_rate is None
    assert s.median_hours_to_match is None
    assert s.average_rating is None


def test_by_topic_busiest_first() -> None:
    topics = summarize_by_topic(enriched())
    assert list(topics) == ["Essays", "SAT"]
    assert topics["SAT"].completion_rate == 0
    assert topics["Essays"].completion_rate == 1


def test_csv_export() -> None:
    lines = list(csv.DictReader(io.StringIO(to_csv(enriched()))))
    assert [r["request_id"] for r in lines][0] == "waiting"  # newest first
    done = next(r for r in lines if r["request_id"] == "done")
    assert done["outcome"] == "completed"
    assert done["matched_at"] == "2026-10-17T12:00:00Z"
    assert done["hours_to_match"] == "24.0"
    assert done["days_to_complete"] == "10.0"
    assert done["rating"] == "5"
    waiting = next(r for r in lines if r["request_id"] == "waiting")
    assert waiting["matched_at"] == "" and waiting["days_waiting"] == "4.0"


PAYLOAD = {
    "now": "2026-11-15T12:00:00Z",
    "staleAfterDays": 14,
    "requests": [
        {
            "requestId": "r1",
            "topic": "Essays",
            "urgency": "high",
            "requestStatus": "completed",
            "createdAt": "2026-10-16T12:00:00Z",
            "offers": 2,
            "match": {
                "status": "completed",
                "matchedAt": "2026-10-17T12:00:00Z",
                "completedAt": "2026-10-27T12:00:00Z",
            },
            "rating": 4,
        },
        {
            "requestId": "r2",
            "topic": "SAT",
            "urgency": "normal",
            "requestStatus": "open",
            "createdAt": "2026-11-14T12:00:00Z",
            "offers": 0,
        },
    ],
}


def test_summary_endpoint(client, auth_headers) -> None:
    res = client.post("/api/analytics/summary", json=PAYLOAD, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["overall"]["completionRate"] == 1
    assert body["overall"]["medianHoursToMatch"] == 24
    assert [t["topic"] for t in body["byTopic"]] == ["Essays", "SAT"]
    assert body["byTopic"][1]["waiting"] == 1


def test_export_endpoint_returns_csv(client, auth_headers) -> None:
    res = client.post("/api/analytics/export", json=PAYLOAD, headers=auth_headers)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert res.text.splitlines()[0].startswith("request_id,topic,urgency")
    assert len(res.text.splitlines()) == 3


def test_metrics_reject_naive_timestamps_and_bad_ratings(client, auth_headers) -> None:
    naive = {**PAYLOAD, "now": "2026-11-15T12:00:00"}
    assert client.post("/summary", json=naive, headers=auth_headers).status_code == 422
    bad_rating = {**PAYLOAD, "requests": [{**PAYLOAD["requests"][0], "rating": 9}]}
    assert client.post("/summary", json=bad_rating, headers=auth_headers).status_code == 422
