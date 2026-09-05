"""
NAWI Sahayak — Authentication Routes

Handles user authentication via Supabase Auth.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from ...core.security import (
    get_current_user,
    create_access_token,
    get_supabase_client
)
from ...core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: Optional[str] = None
    laboratory_id: Optional[str] = None


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate user and return JWT token."""
    try:
        supabase = get_supabase_client()
    except Exception as e:
        logger.error("Failed to create Supabase client: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth service configuration error"
        )

    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        access_token = create_access_token(response.user.id)

        return LoginResponse(
            access_token=access_token,
            user={
                "id": response.user.id,
                "email": response.user.email
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login failed for %s: %s", request.email, e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout current user."""
    # Supabase handles token invalidation
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user profile."""
    # Fetch profile from database
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"]
    )


@router.post("/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Refresh access token."""
    new_token = create_access_token(current_user["id"])
    return {"access_token": new_token, "token_type": "bearer"}
