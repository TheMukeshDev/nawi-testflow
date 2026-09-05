"""
NAWI Sahayak — Instruments Routes

CRUD operations for instrument registry.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

from app.core.security import get_current_user
from app.services.validation_service import ValidationService

router = APIRouter(prefix="/instruments", tags=["Instruments"])
validation_service = ValidationService()


class InstrumentCreate(BaseModel):
    model_id: UUID
    serial_number: str
    laboratory_id: UUID
    date_received: Optional[str] = None
    last_calibration: Optional[str] = None
    next_calibration: Optional[str] = None
    condition: str = "good"
    notes: Optional[str] = None


class InstrumentUpdate(BaseModel):
    condition: Optional[str] = None
    last_calibration: Optional[str] = None
    next_calibration: Optional[str] = None
    notes: Optional[str] = None


class InstrumentResponse(BaseModel):
    id: UUID
    serial_number: str
    model_id: UUID
    laboratory_id: UUID
    condition: str
    created_at: str


@router.get("/", response_model=List[InstrumentResponse])
async def list_instruments(
    laboratory_id: Optional[UUID] = None,
    condition: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List instruments with filters."""
    return []


@router.post("/", response_model=InstrumentResponse, status_code=status.HTTP_201_CREATED)
async def create_instrument(
    data: InstrumentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Register new instrument."""
    validation_result = validation_service.validate_instrument(data.dict())
    if not validation_result.is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"errors": [e.__dict__ for e in validation_result.errors]}
        )
    return InstrumentResponse(
        id="placeholder",
        serial_number=data.serial_number,
        model_id=data.model_id,
        laboratory_id=data.laboratory_id,
        condition=data.condition,
        created_at="2026-01-01T00:00:00Z"
    )


@router.get("/{instrument_id}", response_model=InstrumentResponse)
async def get_instrument(
    instrument_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Get instrument details."""
    return InstrumentResponse(
        id=instrument_id,
        serial_number="WGH-2024-001",
        model_id="placeholder",
        laboratory_id="placeholder",
        condition="good",
        created_at="2026-01-01T00:00:00Z"
    )


@router.put("/{instrument_id}", response_model=InstrumentResponse)
async def update_instrument(
    instrument_id: UUID,
    data: InstrumentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update instrument."""
    return InstrumentResponse(
        id=instrument_id,
        serial_number="WGH-2024-001",
        model_id="placeholder",
        laboratory_id="placeholder",
        condition=data.condition or "good",
        created_at="2026-01-01T00:00:00Z"
    )


@router.get("/{instrument_id}/history")
async def get_instrument_history(
    instrument_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Get test history for instrument."""
    return {"tests": [], "total": 0}
