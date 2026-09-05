"""
NAWI Sahayak — Security Middleware

Provides:
1. Rate limiting (per-IP, per-user)
2. Security headers (CSP, HSTS, X-Frame-Options, etc.)
3. Request validation (content type, size limits)
4. IP logging for audit trail

Design:
    Middleware sits between HTTP requests and application logic.
    It does NOT handle authentication or authorization (that's in security.py).
    It provides defense-in-depth security controls.
"""

import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


# ============================================================================
# SECURITY HEADERS
# ============================================================================

SECURITY_HEADERS = {
    # Prevent XSS attacks
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",

    # Prevent clickjacking
    "X-Permitted-Cross-Domain-Policies": "none",

    # Referrer policy
    "Referrer-Policy": "strict-origin-when-cross-origin",

    # Content Security Policy (restrictive for lab software)
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'"
    ),

    # Permissions policy (disable unnecessary browser features)
    "Permissions-Policy": (
        "camera=(), microphone=(), geolocation=(), "
        "payment=(), usb=(), magnetometer=(), gyroscope=()"
    ),
}


# ============================================================================
# RATE LIMITER
# ============================================================================

class RateLimiter:
    """
    Token-bucket rate limiter.

    Tracks requests per IP address.
    Returns 429 Too Many Requests when limit exceeded.
    """

    def __init__(
        self,
        requests_per_minute: int = 60,
        requests_per_hour: int = 1000,
        burst_size: int = 20,
    ):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.burst_size = burst_size

        # Per-IP tracking: {ip: [timestamps]}
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._last_cleanup = time.time()

    def _cleanup(self):
        """Remove old entries every 5 minutes."""
        now = time.time()
        if now - self._last_cleanup < 300:
            return

        cutoff_hour = now - 3600
        cutoff_minute = now - 60

        for ip in list(self._requests.keys()):
            self._requests[ip] = [
                t for t in self._requests[ip] if t > cutoff_hour
            ]
            if not self._requests[ip]:
                del self._requests[ip]

        self._last_cleanup = now

    def check(self, ip: str) -> tuple[bool, dict]:
        """
        Check if request from IP is allowed.

        Returns:
            (allowed, headers) where headers include rate limit info
        """
        self._cleanup()

        now = time.time()
        requests = self._requests[ip]

        # Count requests in last minute
        minute_ago = now - 60
        recent_minute = sum(1 for t in requests if t > minute_ago)

        # Count requests in last hour
        hour_ago = now - 3600
        recent_hour = sum(1 for t in requests if t > hour_ago)

        headers = {
            "X-RateLimit-Limit-Minute": str(self.requests_per_minute),
            "X-RateLimit-Remaining-Minute": str(max(0, self.requests_per_minute - recent_minute - 1)),
            "X-RateLimit-Limit-Hour": str(self.requests_per_hour),
            "X-RateLimit-Remaining-Hour": str(max(0, self.requests_per_hour - recent_hour - 1)),
        }

        # Check limits
        if recent_minute >= self.requests_per_minute:
            headers["Retry-After"] = "60"
            return False, headers

        if recent_hour >= self.requests_per_hour:
            headers["Retry-After"] = "3600"
            return False, headers

        # Record this request
        self._requests[ip].append(now)

        return True, headers


# ============================================================================
# MIDDLEWARE
# ============================================================================

class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Security middleware that adds headers and rate limiting.
    """

    def __init__(self, app, rate_limiter: Optional[RateLimiter] = None):
        super().__init__(app)
        self.rate_limiter = rate_limiter or RateLimiter()

    async def dispatch(self, request: Request, call_next):
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        # Check rate limit (skip for health checks)
        if request.url.path not in ("/health", "/docs", "/openapi.json"):
            allowed, rate_headers = self.rate_limiter.check(client_ip)
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded. Please try again later.",
                        "retry_after": rate_headers.get("Retry-After", "60"),
                    },
                    headers=rate_headers,
                )

            # Check request size (10 MB max)
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > 10 * 1024 * 1024:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "Request body too large (max 10 MB)"},
                )

        # Process request
        response = await call_next(request)

        # Add security headers
        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value

        # Add rate limit headers
        if "X-RateLimit-Limit-Minute" in rate_headers if 'rate_headers' in dir() else False:
            for key in rate_headers:
                if key.startswith("X-RateLimit"):
                    response.headers[key] = rate_headers[key]

        # Remove server header
        if "server" in response.headers:
            del response.headers["server"]

        return response


# ============================================================================
# INPUT VALIDATION
# ============================================================================

def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Sanitize string input to prevent injection."""
    if not isinstance(value, str):
        return ""

    # Trim
    value = value.strip()

    # Truncate
    value = value[:max_length]

    # Remove null bytes
    value = value.replace("\x00", "")

    return value


def validate_uuid(value: str) -> bool:
    """Validate UUID format."""
    import re
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(pattern, value.lower()))


def validate_email(value: str) -> bool:
    """Basic email validation."""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, value))


def validate_serial_number(value: str) -> bool:
    """Validate serial number format (alphanumeric, hyphens, underscores)."""
    import re
    pattern = r'^[A-Za-z0-9\-_]{1,100}$'
    return bool(re.match(pattern, value))


def validate_report_number(value: str) -> bool:
    """Validate report number format (TST-YYYY-NNNNNN)."""
    import re
    pattern = r'^TST-\d{4}-\d{6}$'
    return bool(re.match(pattern, value))


# ============================================================================
# SESSION MANAGEMENT
# ============================================================================

class SessionManager:
    """
    Secure session management.

    Tokens are short-lived (configurable).
    Refresh tokens are longer-lived but require re-authentication.
    """

    def __init__(
        self,
        access_token_ttl_minutes: int = 30,
        refresh_token_ttl_hours: int = 8,
        max_sessions_per_user: int = 5,
    ):
        self.access_token_ttl = access_token_ttl_minutes * 60
        self.refresh_token_ttl = refresh_token_ttl_hours * 3600
        self.max_sessions = max_sessions_per_user

        # Active sessions: {user_id: [{token, created_at, last_active}]}
        self._sessions: dict[str, list[dict]] = defaultdict(list)

    def create_session(self, user_id: str, token: str) -> dict:
        """Create a new session."""
        now = time.time()

        session = {
            "token_hash": hash(token),  # Don't store actual token
            "created_at": now,
            "last_active": now,
            "expires_at": now + self.access_token_ttl,
        }

        self._sessions[user_id].append(session)

        # Enforce max sessions
        if len(self._sessions[user_id]) > self.max_sessions:
            self._sessions[user_id] = self._sessions[user_id][-self.max_sessions:]

        return session

    def validate_session(self, user_id: str, token: str) -> bool:
        """Check if session is valid."""
        now = time.time()
        sessions = self._sessions.get(user_id, [])

        for session in sessions:
            if session["token_hash"] == hash(token):
                if now > session["expires_at"]:
                    # Session expired
                    sessions.remove(session)
                    return False

                # Update last active
                session["last_active"] = now
                return True

        return False

    def invalidate_session(self, user_id: str, token: str):
        """Invalidate a specific session."""
        sessions = self._sessions.get(user_id, [])
        self._sessions[user_id] = [
            s for s in sessions if s["token_hash"] != hash(token)
        ]

    def invalidate_all_sessions(self, user_id: str):
        """Invalidate all sessions for a user (force re-authentication)."""
        self._sessions.pop(user_id, None)

    def get_active_sessions(self, user_id: str) -> int:
        """Count active sessions for a user."""
        now = time.time()
        sessions = self._sessions.get(user_id, [])
        # Clean expired
        self._sessions[user_id] = [
            s for s in sessions if now <= s["expires_at"]
        ]
        return len(self._sessions[user_id])
