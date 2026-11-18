"""Vercel entry point for /api/analytics/score. Every file here serves the same app; the URL picks the route."""

import sys
from pathlib import Path

# Make the repo root importable so the shared s2s_analytics package is found.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from s2s_analytics.app import app  # noqa: E402

__all__ = ["app"]
