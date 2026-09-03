"""
NAWI TestFlow — FastAPI Application

Main application entry point with:
- CORS configuration
- Route registration
- Exception handlers
- Health check endpoint
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from .core.config import get_settings
from .core.exceptions import NawiException

settings = get_settings()

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
    allow_origins=settings.CORS_ORIGINS,
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
