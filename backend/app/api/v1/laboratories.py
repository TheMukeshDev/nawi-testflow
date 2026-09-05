"""
NAWI Sahayak — Laboratories Routes

CRUD operations for laboratory management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

from app.core.security import get_current_user
from app.services.validation_service import ValidationService

router = APIRouter(prefix="/laboratories", tags=["Laboratories"])
validation_service = ValidationService()


class LaboratoryCreate(BaseModel):
    name: str
    code: str
    address: str
    city: str
    state: str
    country: str = "India"
    accreditation_body: Optional[str] = None
    accreditation_number: Optional[str] = None
    accreditation_valid_until: Optional[str] = None
    contact_person: str
    phone: str
    email: str


class LaboratoryUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    accreditation_body: Optional[str] = None
    accreditation_number: Optional[str] = None
    accreditation_valid_until: Optional[str] = None
    is_active: Optional[bool] = None


class LaboratoryResponse(BaseModel):
    id: UUID
    name: str
    code: str
    is_active: bool
    created_at: str


@router.get("/", response_model=List[LaboratoryResponse])
async def list_laboratories(
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List laboratories."""
    return []


@router.post("/", response_model=LaboratoryResponse, status_code=status.HTTP_201_CREATED)
async def create_laboratory(
    data: LaboratoryCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new laboratory."""
    validation_result = validation_service.validate_laboratory(data.dict())
    if not validation_result.is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"errors": [e.__dict__ for e in validation_result.errors]}
        )
    return LaboratoryResponse(
        id="placeholder",
        name=data.name,
        code=data.code,
        is_active=True,
        created_at="2026-01-01T00:00:00Z"
    )


@router.get("/{lab_id}", response_model=LaboratoryResponse)
async def get_laboratory(
    lab_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Get laboratory details."""
    return LaboratoryResponse(
        id=lab_id,
        name="National Physical Laboratory",
        code="NPL-DL-01",
        is_active=True,
        created_at="2026-01-01T00:00:00Z"
    )


@router.put("/{lab_id}", response_model=LaboratoryResponse)
async def update_laboratory(
    lab_id: UUID,
    data: LaboratoryUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update laboratory."""
    return LaboratoryResponse(
        id=lab_id,
        name="National Physical Laboratory",
        code="NPL-DL-01",
        is_active=True,
        created_at="2026-01-01T00:00:00Z"
    )
