"""HTTP API for the analytics service.

On Vercel each file in api/analytics/ serves this same app at /api/analytics/<name>.
Locally, run it with:  .venv/bin/uvicorn s2s_analytics.app:app --port 8000 --env-file .env
Both URL shapes (/score and /api/analytics/score) work because the /api/analytics prefix is stripped before routing.
"""

from dataclasses import asdict
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.responses import PlainTextResponse
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from . import __version__
from .auth import expected_token, is_authorized
from .metrics import (
    EnrichedRow,
    MatchInfo,
    RequestRow,
    classify,
    summarize,
    summarize_by_topic,
    to_csv,
)
from .scoring import Candidate, rank_candidates

PREFIX = "/api/analytics"


class Model(BaseModel):
    """camelCase on the wire to match the TypeScript side, snake_case in Python."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


# ─── Schemas ──────────────────────────────────────────────────────────────────


class CandidateIn(Model):
    mentor_id: str = Field(min_length=1)
    interested: bool
    topic_match: bool
    active_matches: int = Field(ge=0)
    capacity: int = Field(ge=0)


class ScoreRequest(Model):
    candidates: list[CandidateIn] = Field(max_length=2000)


class ScoredOut(Model):
    mentor_id: str
    score: int
    remaining: int
    reasons: list[str]


class ScoreResponse(Model):
    ranked: list[ScoredOut]


class MatchIn(Model):
    status: Literal["active", "completed", "cancelled"]
    matched_at: AwareDatetime
    completed_at: AwareDatetime | None = None
    cancelled_at: AwareDatetime | None = None


class RequestIn(Model):
    request_id: str = Field(min_length=1)
    topic: str
    urgency: str
    request_status: str
    created_at: AwareDatetime
    offers: int = Field(ge=0)
    match: MatchIn | None = None
    rating: int | None = Field(default=None, ge=1, le=5)


class MetricsRequest(Model):
    now: AwareDatetime
    stale_after_days: int = Field(default=14, ge=1, le=365)
    requests: list[RequestIn] = Field(max_length=50_000)


class SummaryOut(Model):
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


class TopicSummaryOut(SummaryOut):
    topic: str


class SummaryResponse(Model):
    overall: SummaryOut
    by_topic: list[TopicSummaryOut]


# ─── App ──────────────────────────────────────────────────────────────────────


def require_service_token(authorization: Annotated[str | None, Header()] = None) -> None:
    expected = expected_token()
    if expected is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Service secret is not configured.")
    if not is_authorized(authorization, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing or invalid service token.")


Authorized = [Depends(require_service_token)]

app = FastAPI(title="S2S Tigray Mentors analytics", version=__version__, docs_url=None, redoc_url=None)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}


@app.post("/score", dependencies=Authorized, response_model=ScoreResponse)
def score(body: ScoreRequest) -> ScoreResponse:
    ranked = rank_candidates(
        [
            Candidate(
                mentor_id=c.mentor_id,
                interested=c.interested,
                topic_match=c.topic_match,
                active_matches=c.active_matches,
                capacity=c.capacity,
            )
            for c in body.candidates
        ]
    )
    return ScoreResponse(
        ranked=[
            ScoredOut(mentor_id=s.mentor_id, score=s.score, remaining=s.remaining, reasons=s.reasons) for s in ranked
        ]
    )


def _enrich(body: MetricsRequest) -> list[EnrichedRow]:
    rows = [
        RequestRow(
            request_id=r.request_id,
            topic=r.topic,
            urgency=r.urgency,
            request_status=r.request_status,
            created_at=r.created_at,
            offers=r.offers,
            rating=r.rating,
            match=MatchInfo(
                status=r.match.status,
                matched_at=r.match.matched_at,
                completed_at=r.match.completed_at,
                cancelled_at=r.match.cancelled_at,
            )
            if r.match
            else None,
        )
        for r in body.requests
    ]
    return [classify(row, body.now, body.stale_after_days) for row in rows]


@app.post("/summary", dependencies=Authorized, response_model=SummaryResponse)
def metrics_summary(body: MetricsRequest) -> SummaryResponse:
    rows = _enrich(body)
    return SummaryResponse(
        overall=SummaryOut(**asdict(summarize(rows))),
        by_topic=[TopicSummaryOut(topic=topic, **asdict(s)) for topic, s in summarize_by_topic(rows).items()],
    )


@app.post("/export", dependencies=Authorized, response_class=PlainTextResponse)
def metrics_export(body: MetricsRequest) -> PlainTextResponse:
    return PlainTextResponse(to_csv(_enrich(body)), media_type="text/csv; charset=utf-8")


class StripPrefix:
    """ASGI middleware: serve the same routes at /score and /api/analytics/score."""

    def __init__(self, inner, prefix: str = PREFIX) -> None:
        self.inner = inner
        self.prefix = prefix

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] in ("http", "websocket"):
            path: str = scope["path"]
            if path == self.prefix or path.startswith(self.prefix + "/"):
                scope = {**scope, "path": path[len(self.prefix) :] or "/", "root_path": ""}
        await self.inner(scope, receive, send)


app.add_middleware(StripPrefix)
