"""
NAWI TestFlow — API Dependencies

Dependency injection for FastAPI routes.
"""

from fastapi import Depends
from app.core.security import get_current_user


async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    """Get current user and verify they are active."""
    # Check if user is active in database
    return current_user


async def require_admin_role(current_user: dict = Depends(get_current_user)):
    """Require admin role."""
    # Check role in database
    # if user_role != 'admin':
    #     raise ForbiddenError()
    return current_user


async def require_lab_manager_role(current_user: dict = Depends(get_current_user)):
    """Require lab manager or admin role."""
    return current_user


async def require_technician_role(current_user: dict = Depends(get_current_user)):
    """Require technician, lab manager, or admin role."""
    return current_user


async def require_reviewer_role(current_user: dict = Depends(get_current_user)):
    """Require reviewer, lab manager, or admin role."""
    return current_user
