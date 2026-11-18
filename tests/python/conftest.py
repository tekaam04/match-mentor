import pytest
from fastapi.testclient import TestClient

from s2s_analytics.app import app
from s2s_analytics.auth import service_token

SECRET = "test-secret-for-python-tests"


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("BETTER_AUTH_SECRET", SECRET)
    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {service_token(SECRET)}"}
