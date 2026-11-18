"""Service-to-service auth.

The Next.js app and this service run in the same Vercel project, so both already have
BETTER_AUTH_SECRET. Rather than share that secret directly, both sides derive a separate
token from it with HMAC; rotating the auth secret rotates this token too.
Keep in sync with serviceToken() in src/lib/analytics-client.ts.
"""

import hashlib
import hmac
import os

TOKEN_CONTEXT = b"s2s-analytics-v1"


def service_token(secret: str) -> str:
    return hmac.new(secret.encode(), TOKEN_CONTEXT, hashlib.sha256).hexdigest()


def expected_token() -> str | None:
    secret = os.environ.get("BETTER_AUTH_SECRET")
    return service_token(secret) if secret else None


def is_authorized(authorization: str | None, expected: str) -> bool:
    if not authorization or not authorization.startswith("Bearer "):
        return False
    return hmac.compare_digest(authorization.removeprefix("Bearer "), expected)
