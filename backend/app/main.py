"""
NAWI TestFlow — FastAPI Application

Main application entry point with:
- CORS configuration
- Route registration
- Exception handlers
- Health check endpoint
"""

import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse

from .core.config import get_settings
from .core.exceptions import NawiException

settings = get_settings()

# Surface pydantic-loaded .env values into the process environment so every
# module (engine/ai_settings, engine/ai_assistance) that reads os.environ
# sees them — identical behaviour to Vercel, where they are real env vars.
# Must run before the AI modules are imported below.
if not os.environ.get("GEMINI_API_KEY") and settings.GEMINI_API_KEY:
    os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY
if not os.environ.get("GEMINI_MODEL") and settings.GEMINI_MODEL:
    os.environ["GEMINI_MODEL"] = settings.GEMINI_MODEL

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="OIML R-76 NAWI Test Report Generation System",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time, 4))
    return response


# Exception handler for custom exceptions
@app.exception_handler(NawiException)
async def nawi_exception_handler(request: Request, exc: NawiException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "service": settings.APP_NAME
    }


# Root landing page — points to the interactive API docs and repo
@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root_home():
    """Landing page directing to the interactive API documentation."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{settings.APP_NAME} — API</title>
  <style>
    body {{ font-family: 'Segoe UI', system-ui, sans-serif; background: #f5f7fa; color: #1e3a5f; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }}
    .card {{ background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px 48px; max-width: 560px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,.06); }}
    h1 {{ font-size: 22px; margin: 0 0 6px; }}
    p {{ color: #64748b; font-size: 14px; margin: 0 0 24px; }}
    .links {{ display: flex; flex-direction: column; gap: 10px; }}
    a {{ display: block; text-decoration: none; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 600; transition: .15s; }}
    a.docs {{ background: #1e3a5f; color: #fff; }}
    a.docs:hover {{ background: #162d4a; }}
    a.ghost {{ background: #f1f5f9; color: #1e3a5f; border: 1px solid #e2e8f0; }}
    a.ghost:hover {{ background: #e2e8f0; }}
    .meta {{ margin-top: 26px; font-size: 12px; color: #94a3b8; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>{settings.APP_NAME}</h1>
    <p>OIML R-76 Non-Automatic Weighing Instrument Test Report Generation System &middot; API v{settings.APP_VERSION}</p>
    <div class="links">
      <a class="docs" href="/api/docs">Interactive API Docs (Swagger UI)</a>
      <a class="ghost" href="/api/redoc">ReDoc Documentation</a>
      <a class="ghost" href="/api/health">Health Check</a>
    </div>
    <div class="meta">
      Source: <a href="https://github.com/TheMukeshDev/nawi-testflow" style="color:#1e3a5f;">github.com/TheMukeshDev/nawi-testflow</a><br/>
      Live frontend: <a href="https://nawi-testflow.vercel.app" style="color:#1e3a5f;">nawi-testflow.vercel.app</a>
    </div>
  </div>
</body>
</html>
"""


# Import and register routes
from .api.v1 import auth, tests, instruments, laboratories, equipment, reports, users, admin, ai_assistance

app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(tests.router, prefix=settings.API_V1_PREFIX)
app.include_router(instruments.router, prefix=settings.API_V1_PREFIX)
app.include_router(laboratories.router, prefix=settings.API_V1_PREFIX)
app.include_router(equipment.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(ai_assistance.router, prefix=settings.API_V1_PREFIX)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
