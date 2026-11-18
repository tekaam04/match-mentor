"""Pilot metrics: one row per request, plus summaries overall and by topic.

The input holds no names or emails, only opaque ids, topics, timestamps and statuses,
so no personal data leaves the Next.js app.

Definitions match the organizer dashboard (src/server/metrics.ts):
- completion rate = completed / (completed + ended + stale)
- time to match = request posted -> match made; ended matches are left out of the median
- time to complete = match made -> marked complete
"""

import csv
import io
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from statistics import fmean, median
from typing import Literal

Outcome = Literal["waiting", "closed", "active", "stale", "completed", "ended"]


@dataclass(frozen=True)
class MatchInfo:
    status: Literal["active", "completed", "cancelled"]
    matched_at: datetime
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None


@dataclass(frozen=True)
class RequestRow:
    request_id: str
    topic: str
    urgency: str
    request_status: str
    created_at: datetime
    offers: int
    match: MatchInfo | None = None
    rating: int | None = None


@dataclass(frozen=True)
class EnrichedRow:
    row: RequestRow
    outcome: Outcome
    hours_to_match: float | None
    days_to_complete: float | None
    days_waiting: float | None


@dataclass(frozen=True)
class Summary:
    requests: int
    waiting: int
    active: int
    stale: int
    completed: int
    ended: int
    completion_rate: float | None
    median_hours_to_match: float | None
    median_days_to_complete: float | None
    average_rating: float | None
    ratings: int


def _hours(start: datetime, end: datetime) -> float:
    return (end - start).total_seconds() / 3600


def classify(row: RequestRow, now: datetime, stale_after_days: int) -> EnrichedRow:
    m = row.match
    if m is None:
        outcome: Outcome = "waiting" if row.request_status == "open" else "closed"
        waiting = _hours(row.created_at, now) / 24 if outcome == "waiting" else None
        return EnrichedRow(row, outcome, None, None, waiting)

    if m.status == "completed":
        outcome = "completed"
    elif m.status == "cancelled":
        outcome = "ended"
    elif m.matched_at < now - timedelta(days=stale_after_days):
        outcome = "stale"
    else:
        outcome = "active"

    to_complete = _hours(m.matched_at, m.completed_at) / 24 if m.status == "completed" and m.completed_at else None
    return EnrichedRow(row, outcome, _hours(row.created_at, m.matched_at), to_complete, None)


def summarize(rows: list[EnrichedRow]) -> Summary:
    def count(outcome: Outcome) -> int:
        return sum(1 for r in rows if r.outcome == outcome)

    completed, ended, stale = count("completed"), count("ended"), count("stale")
    finished = completed + ended + stale
    to_match = [r.hours_to_match for r in rows if r.hours_to_match is not None and r.outcome != "ended"]
    to_complete = [r.days_to_complete for r in rows if r.days_to_complete is not None]
    ratings = [r.row.rating for r in rows if r.row.rating is not None]

    return Summary(
        requests=len(rows),
        waiting=count("waiting"),
        active=count("active"),
        stale=stale,
        completed=completed,
        ended=ended,
        completion_rate=completed / finished if finished else None,
        median_hours_to_match=median(to_match) if to_match else None,
        median_days_to_complete=median(to_complete) if to_complete else None,
        average_rating=fmean(ratings) if ratings else None,
        ratings=len(ratings),
    )


def summarize_by_topic(rows: list[EnrichedRow]) -> dict[str, Summary]:
    """Topics with the most requests first, so the busiest areas lead the table."""
    groups: dict[str, list[EnrichedRow]] = {}
    for r in rows:
        groups.setdefault(r.row.topic, []).append(r)
    ordered = sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0]))
    return {topic: summarize(group) for topic, group in ordered}


CSV_COLUMNS = [
    "request_id",
    "topic",
    "urgency",
    "posted_at",
    "request_status",
    "offers",
    "outcome",
    "matched_at",
    "completed_at",
    "ended_at",
    "hours_to_match",
    "days_to_complete",
    "days_waiting",
    "rating",
]


def _iso(value: datetime | None) -> str:
    return value.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ") if value else ""


def _num(value: float | None) -> str:
    return "" if value is None else f"{value:.1f}"


def to_csv(rows: list[EnrichedRow]) -> str:
    """Newest requests first. Spreadsheet-friendly: ISO UTC timestamps, one decimal place."""
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(CSV_COLUMNS)
    for r in sorted(rows, key=lambda r: r.row.created_at, reverse=True):
        m = r.row.match
        writer.writerow(
            [
                r.row.request_id,
                r.row.topic,
                r.row.urgency,
                _iso(r.row.created_at),
                r.row.request_status,
                r.row.offers,
                r.outcome,
                _iso(m.matched_at if m else None),
                _iso(m.completed_at if m else None),
                _iso(m.cancelled_at if m else None),
                _num(r.hours_to_match),
                _num(r.days_to_complete),
                _num(r.days_waiting),
                "" if r.row.rating is None else r.row.rating,
            ]
        )
    return out.getvalue()
