"""
NAWI Sahayak — Users Routes

User management endpoints. Requires admin role for all management operations.

IMPORTANT: The roles used here (admin, tester, reviewer, viewer) are
PROPOSED application roles. See docs/ROLES.md for details.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

from app.core.security import require_admin, get_current_user_profile

router = APIRouter(prefix="/users", tags=["Users"])


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str  # Must be one of: admin, tester, reviewer, viewer
    laboratory_id: Optional[UUID] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    laboratory_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    laboratory_id: Optional[UUID]
    is_active: bool
    created_at: str


# Valid roles for the application
VALID_ROLES = ["admin", "tester", "reviewer", "viewer"]


@router.get("/", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    laboratory_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: dict = Depends(require_admin),
):
    """List users. Requires admin role."""
    # Validate role filter
    if role and role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role. Must be one of: {VALID_ROLES}"
        )
    
    return []


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    current_user: dict = Depends(require_admin),
):
    """Create new user. Requires admin role."""
    # Validate role
    if data.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role. Must be one of: {VALID_ROLES}"
        )
    
    # Create user in Supabase Auth
    # Create profile in database
    # Send invitation email
    
    return UserResponse(
        id="placeholder",
        email=data.email,
        full_name=data.full_name,
        role=data.role,
        laboratory_id=data.laboratory_id,
        is_active=True,
        created_at="2026-01-01T00:00:00Z"
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: dict = Depends(require_admin),
):
    """Get user details. Requires admin role."""
    return UserResponse(
        id=user_id,
        email="user@example.com",
        full_name="Test User",
        role="tester",
        laboratory_id=None,
        is_active=True,
        created_at="2026-01-01T00:00:00Z"
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    current_user: dict = Depends(require_admin),
):
    """Update user. Requires admin role."""
    # Validate role if provided
    if data.role and data.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role. Must be one of: {VALID_ROLES}"
        )
    
    # Prevent admin from deactivating themselves
    if str(user_id) == str(current_user.get("id")) and data.is_active == False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    return UserResponse(
        id=user_id,
        email="user@example.com",
        full_name=data.full_name or "Test User",
        role=data.role or "tester",
        laboratory_id=data.laboratory_id,
        is_active=data.is_active if data.is_active is not None else True,
        created_at="2026-01-01T00:00:00Z"
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    current_user: dict = Depends(require_admin),
):
    """Delete user. Requires admin role."""
    # Prevent admin from deleting themselves
    if str(user_id) == str(current_user.get("id")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Soft delete (deactivate) instead of hard delete
    # Update is_active = false
    pass
