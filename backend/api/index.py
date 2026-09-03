"""Vercel serverless entrypoint for the FastAPI backend.

Deploy the `backend/` directory as its own Vercel project; Vercel resolves
the app via `[tool.vercel] entrypoint = "api.index:app"` in pyproject.toml
and serves it as a single function (see backend/vercel.json for
maxDuration/bundle excludes). Local dev still uses `app.main:app`.
"""

from app.main import app  # noqa: F401  (Vercel loads the `app` instance)
