"""
NAWI TestFlow — Security Module

Handles authentication using Supabase Auth and JWT tokens.
Provides dependency injection for protected routes.

IMPORTANT: The roles defined here (admin, tester, reviewer, viewer) are
PROPOSED application roles for our implementation. They are NOT specified
by the SIH Problem Statement 26035.
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from supabase import create_client, Client
import asyncpg

from app.core.config import get_settings
from app.core.exceptions import ForbiddenError, UnauthorizedError

settings = get_settings()
security = HTTPBearer()

# ============================================================================
# ROLE DEFINITIONS
# ============================================================================
#
# NOTE: These roles are PROPOSED application roles.
# See docs/ROLES.md for full documentation.
#
# The PS requires "secure user access with role-based permissions"
# but does not prescribe specific role names.
# ============================================================================

ROLES = {
    "admin": "Administrator",
    "tester": "Tester",
    "reviewer": "Reviewer",
    "viewer": "Viewer",
}

# Role hierarchy (higher index = more permissions)
ROLE_HIERARCHY = ["viewer", "tester", "reviewer", "admin"]

# Permission definitions
PERMISSIONS = {
    # Users
    "users:create": ["admin"],
    "users:read": ["admin"],
    "users:update": ["admin"],
    "users:delete": ["admin"],
    
    # Laboratories
    "laboratories:create": ["admin"],
    "laboratories:read": ["admin", "tester", "reviewer", "viewer"],
    "laboratories:update": ["admin"],
    "laboratories:delete": ["admin"],
    
    # Instruments
    "instruments:create": ["admin", "tester"],
    "instruments:read": ["admin", "tester", "reviewer", "viewer"],
    "instruments:update": ["admin", "tester"],
    "instruments:delete": ["admin"],
    
    # Test Reports
    "test_reports:create": ["admin", "tester"],
    "test_reports:read_own": ["admin", "tester"],
    "test_reports:read_lab": ["admin", "reviewer"],
    "test_reports:read_completed": ["admin", "tester", "reviewer", "viewer"],
    "test_reports:update_draft": ["admin", "tester"],
    "test_reports:update_review": ["admin", "reviewer"],
    "test_reports:delete_draft": ["admin", "tester"],
    "test_reports:submit": ["admin", "tester"],
    "test_reports:approve": ["admin", "reviewer"],
    "test_reports:reject": ["admin", "reviewer"],
    
    # Test Data
    "test_data:create": ["admin", "tester"],
    "test_data:read_own": ["admin", "tester"],
    "test_data:read_lab": ["admin", "reviewer"],
    "test_data:read_completed": ["admin", "tester", "reviewer", "viewer"],
    "test_data:update": ["admin", "tester"],
    "test_data:delete": ["admin", "tester"],
    
    # Reports (generated PDFs/DOCX)
    "reports:generate": ["admin", "tester", "reviewer"],
    "reports:read": ["admin", "tester", "reviewer", "viewer"],
    "reports:download": ["admin", "tester", "reviewer", "viewer"],
    "reports:approve": ["admin", "reviewer"],
    
    # Attachments
    "attachments:create": ["admin", "tester"],
    "attachments:read_own": ["admin", "tester"],
    "attachments:read_lab": ["admin", "reviewer"],
    "attachments:read_completed": ["admin", "tester", "reviewer", "viewer"],
    "attachments:delete": ["admin"],
    
    # Compliance Rules
    "compliance_rules:create": ["admin"],
    "compliance_rules:read": ["admin", "tester", "reviewer"],
    "compliance_rules:update": ["admin"],
    "compliance_rules:delete": ["admin"],
    
    # Audit Logs
    "audit_logs:read": ["admin"],
    
    # System
    "system:configure": ["admin"],
}


def get_supabase_client() -> Client:
    """Get Supabase client instance."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    """Verify and decode JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Get current authenticated user from JWT token."""
    payload = verify_token(credentials.credentials)
    user_id = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Fetch user from Supabase
    supabase = get_supabase_client()
    try:
        resp = supabase.auth.admin.get_user_by_id(user_id)
        user = resp.user
        return {
            "id": user.id,
            "email": user.email,
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )


async def get_db_pool() -> Optional[asyncpg.Pool]:
    """
    Dependency that yields the application database pool.

    This application does not configure a direct asyncpg pool (auth and
    storage are handled via Supabase), so the pool is None. A future DB
    integration can swap the body of this dependency without touching
    downstream endpoints.
    """
    return None


async def get_current_user_profile(
    current_user: dict = Depends(get_current_user),
    db: Optional[asyncpg.Pool] = Depends(get_db_pool),
) -> dict:
    """Get current user's profile with role information."""
    # Roles are stored in the Supabase `profiles` table. When a direct DB pool
    # is available (future integration) we read it directly; otherwise we look
    # it up through the Supabase REST API using the service role key, which
    # bypasses RLS so any caller can read its own profile.
    if db is None:
        try:
            supabase = get_supabase_client()
            resp = (
                supabase.table("profiles")
                .select("id, auth_user_id, email, full_name, role, laboratory_id, is_active")
                .eq("auth_user_id", current_user["id"])
                .limit(1)
                .execute()
            )
            rows = resp.data or []
            if rows:
                return rows[0]
        except Exception:
            pass
        # No profile found / API unavailable: default to the lowest privilege.
        return {
            "id": current_user["id"],
            "email": current_user["email"],
            "role": "viewer",
            "laboratory_id": None,
        }

    query = """
        SELECT id, auth_user_id, email, full_name, role, laboratory_id, is_active
        FROM profiles
        WHERE auth_user_id = $1 AND is_active = true
    """
    row = await db.fetchrow(query, current_user["id"])

    if not row:
        raise UnauthorizedError("User profile not found or inactive")

    return dict(row)


def require_role(allowed_roles: list[str]):
    """
    Dependency factory that checks if user has required role.
    
    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user = Depends(require_role(["admin"]))):
            pass
    """
    async def role_checker(
        current_user_profile: dict = Depends(get_current_user_profile),
    ) -> dict:
        user_role = current_user_profile.get("role")
        
        if user_role not in allowed_roles:
            raise ForbiddenError(
                f"Required role: {', '.join(allowed_roles)}. "
                f"Your role: {user_role}"
            )
        
        return current_user_profile
    
    return role_checker


def require_permission(permission: str):
    """
    Dependency factory that checks if user has required permission.
    
    Usage:
        @router.post("/tests")
        async def create_test(user = Depends(require_permission("test_reports:create"))):
            pass
    """
    async def permission_checker(
        current_user_profile: dict = Depends(get_current_user_profile),
    ) -> dict:
        user_role = current_user_profile.get("role")
        allowed_roles = PERMISSIONS.get(permission, [])
        
        if user_role not in allowed_roles:
            raise ForbiddenError(
                f"Permission denied: {permission}. "
                f"Required role: {', '.join(allowed_roles)}. "
                f"Your role: {user_role}"
            )
        
        return current_user_profile
    
    return permission_checker


def has_role(user_role: str, required_roles: list[str]) -> bool:
    """Check if user role is in allowed roles."""
    return user_role in required_roles


def has_permission(user_role: str, permission: str) -> bool:
    """Check if user has specific permission."""
    allowed_roles = PERMISSIONS.get(permission, [])
    return user_role in allowed_roles


def get_role_level(role: str) -> int:
    """Get numeric level for role hierarchy comparison."""
    try:
        return ROLE_HIERARCHY.index(role)
    except ValueError:
        return -1


def can_access_resource(
    user_role: str,
    user_laboratory_id: Optional[str],
    resource_laboratory_id: Optional[str],
    resource_created_by: Optional[str],
    user_id: Optional[str],
    resource_status: Optional[str] = None,
) -> bool:
    """
    Check if user can access a specific resource based on role and ownership.
    
    Args:
        user_role: User's role
        user_laboratory_id: User's laboratory ID
        resource_laboratory_id: Resource's laboratory ID
        resource_created_by: Who created the resource
        user_id: Current user's ID
        resource_status: Resource's status (for draft/completed checks)
    
    Returns:
        True if access is allowed
    """
    # Admin can access everything
    if user_role == "admin":
        return True
    
    # Check laboratory access
    if resource_laboratory_id and user_laboratory_id != resource_laboratory_id:
        return False
    
    # Role-specific checks
    if user_role == "tester":
        # Can access own resources
        if resource_created_by == user_id:
            return True
        # Can access resources in their lab
        if resource_laboratory_id == user_laboratory_id:
            return True
        return False
    
    elif user_role == "reviewer":
        # Can access all resources in their lab
        if resource_laboratory_id == user_laboratory_id:
            return True
        return False
    
    elif user_role == "viewer":
        # Can only access completed resources in their lab
        if resource_laboratory_id == user_laboratory_id:
            if resource_status in ("completed", "approved"):
                return True
        return False
    
    return False


# ============================================================================
# CONVENIENCE DEPENDENCIES
# ============================================================================

# Require admin role
require_admin = require_role(["admin"])

# Require tester or admin
require_tester = require_role(["admin", "tester"])

# Require reviewer or admin
require_reviewer = require_role(["admin", "reviewer"])

# Require any authenticated user
require_authenticated = require_role(["admin", "tester", "reviewer", "viewer"])
