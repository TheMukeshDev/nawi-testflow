"""
NAWI Sahayak — Equipment Routes

CRUD operations for equipment registry.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

from app.core.security import get_current_user
from app.services.validation_service import ValidationService

router = APIRouter(prefix="/equipment", tags=["Equipment"])
validation_service = ValidationService()


class EquipmentCreate(BaseModel):
    name: str
    type: str
    laboratory_id: UUID
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    calibration_date: Optional[str] = None
    calibration_valid_until: Optional[str] = None
    certificate_number: Optional[str] = None
    nominal_value: Optional[float] = None
    nominal_value_unit: Optional[str] = None
    tolerance: Optional[float] = None


class EquipmentUpdate(BaseModel):
    calibration_date: Optional[str] = None
    calibration_valid_until: Optional[str] = None
    status: Optional[str] = None


class EquipmentResponse(BaseModel):
    id: UUID
    name: str
    type: str
    laboratory_id: UUID
    status: str
    created_at: str


@router.get("/", response_model=List[EquipmentResponse])
async def list_equipment(
    laboratory_id: Optional[UUID] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List equipment."""
    return []


@router.post("/", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_equipment(
    data: EquipmentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Register new equipment."""
    validation_result = validation_service.validate_equipment(data.dict())
    if not validation_result.is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"errors": [e.__dict__ for e in validation_result.errors]}
        )
    return EquipmentResponse(
        id="placeholder",
        name=data.name,
        type=data.type,
        laboratory_id=data.laboratory_id,
        status="active",
        created_at="2026-01-01T00:00:00Z"
    )


@router.get("/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment(
    equipment_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Get equipment details."""
    return EquipmentResponse(
        id=equipment_id,
        name="E2 Calibration Weight Set",
        type="standard-weight",
        laboratory_id="placeholder",
        status="active",
        created_at="2026-01-01T00:00:00Z"
    )


@router.put("/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(
    equipment_id: UUID,
    data: EquipmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update equipment."""
    return EquipmentResponse(
        id=equipment_id,
        name="E2 Calibration Weight Set",
        type="standard-weight",
        laboratory_id="placeholder",
        status=data.status or "active",
        created_at="2026-01-01T00:00:00Z"
    )
