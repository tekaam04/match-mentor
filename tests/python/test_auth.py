import pytest

from s2s_analytics.auth import is_authorized, service_token

PROTECTED = ["/score", "/summary", "/export"]


def test_token_is_derived_not_the_secret_itself() -> None:
    token = service_token("abc")
    assert token != "abc"
    # Same derivation as serviceToken() in src/lib/analytics-client.ts (Node crypto HMAC-SHA256, hex).
    assert token == "caeb3bee8263b115a16a2539b75f1a34f50cf129b750409a1d012e208ee95585"


def test_is_authorized() -> None:
    assert is_authorized("Bearer good", "good")
    assert not is_authorized("Bearer bad", "good")
    assert not is_authorized("good", "good")
    assert not is_authorized(None, "good")


def test_health_is_public(client) -> None:
    res = client.get("/api/analytics/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.parametrize("path", PROTECTED)
def test_protected_routes_need_the_service_token(client, path: str) -> None:
    assert client.post(path, json={}).status_code == 401
    assert client.post(path, json={}, headers={"Authorization": "Bearer nope"}).status_code == 401


@pytest.mark.parametrize("path", PROTECTED)
def test_refuses_everything_when_secret_missing(client, monkeypatch: pytest.MonkeyPatch, path: str) -> None:
    monkeypatch.delenv("BETTER_AUTH_SECRET")
    assert client.post(path, json={}, headers={"Authorization": "Bearer x"}).status_code == 503
