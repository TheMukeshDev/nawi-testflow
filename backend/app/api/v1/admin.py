"""
NAWI Sahayak — Admin Routes

System administration and audit log endpoints.
Requires admin role for all endpoints.

IMPORTANT: The roles used here (admin, tester, reviewer, viewer) are
PROPOSED application roles. See docs/ROLES.md for details.
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

from ...core.security import require_admin, get_current_user_profile

router = APIRouter(prefix="/admin", tags=["Admin"])


class AuditLogResponse(BaseModel):
    id: UUID
    timestamp: str
    user_id: UUID
    user_name: str
    user_role: str
    action: str
    entity_type: str
    entity_id: UUID
    entity_label: Optional[str]
    changes: Optional[dict]
    ip_address: Optional[str]


class SystemConfigResponse(BaseModel):
    app_version: str
    database_version: str
    active_rules: int
    total_users: int
    total_instruments: int
    total_reports: int
    ai_enabled: bool = True
    ai_configured: bool = False
    ai_model: Optional[str] = None


@router.get("/audit", response_model=List[AuditLogResponse])
async def get_audit_log(
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
    action: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_admin),
):
    """Get audit log. Requires admin role."""
    return []


@router.get("/config", response_model=SystemConfigResponse)
async def get_system_config(
    current_user: dict = Depends(require_admin),
):
    """Get system configuration. Requires admin role."""
    from engine.ai_settings import get_ai_settings
    ai = get_ai_settings().public_status()
    return SystemConfigResponse(
        app_version="1.0.0",
        database_version="001",
        active_rules=3,
        total_users=0,
        total_instruments=0,
        total_reports=0,
        ai_enabled=ai["ai_enabled"],
        ai_configured=ai["ai_configured"],
        ai_model=ai.get("model"),
    )


@router.get("/stats")
async def get_statistics(
    current_user: dict = Depends(require_admin),
):
    """Get system statistics. Requires admin role."""
    return {
        "tests_by_status": {},
        "reports_by_month": {},
        "compliance_summary": {}
    }
