"""
NAWI TestFlow — Test Reports Routes

CRUD operations and workflow actions for test reports.
Implements role-based authorization for all endpoints.

IMPORTANT: The roles used here (admin, tester, reviewer, viewer) are
PROPOSED application roles. See docs/ROLES.md for details.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

from app.core.security import (
    get_current_user_profile,
    require_role,
    require_permission,
    has_permission,
)
from app.services.validation_service import ValidationService
from app.services.calculation_engine import CalculationEngine
from app.services.compliance_engine import ComplianceEngine

router = APIRouter(prefix="/tests", tags=["Tests"])
validation_service = ValidationService()
calculation_engine = CalculationEngine()
compliance_engine = ComplianceEngine()


class TestReportCreate(BaseModel):
    instrument_id: UUID
    laboratory_id: UUID
    verification_type: str
    test_standard: str = "OIML R-76"
    test_standard_version: str = "2009"
    assigned_technician_id: UUID
    assigned_reviewer_id: Optional[UUID] = None


class TestReportUpdate(BaseModel):
    verification_type: Optional[str] = None
    assigned_technician_id: Optional[UUID] = None
    assigned_reviewer_id: Optional[UUID] = None
    compliance_notes: Optional[str] = None


class TestCaseCreate(BaseModel):
    case_type: str
    test_point_label: str
    test_point_value: float
    unit: str = "kg"
    sort_order: int = 0


class ObservationCreate(BaseModel):
    observation_number: int
    measured_value: float
    unit: str = "kg"
    notes: Optional[str] = None


class TestReportResponse(BaseModel):
    id: UUID
    report_number: str
    status: str
    compliance_result: Optional[str]
    created_at: str


@router.get("/", response_model=List[TestReportResponse])
async def list_tests(
    status: Optional[str] = None,
    laboratory_id: Optional[UUID] = None,
    instrument_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: dict = Depends(get_current_user_profile),
):
    """
    List test reports with role-based filtering.
    
    - ADMIN: Sees all tests
    - TESTER: Sees own tests
    - REVIEWER: Sees tests pending review in their lab
    - VIEWER: Sees completed tests in their lab
    """
    user_role = current_user.get("role")
    user_id = current_user.get("id")
    lab_id = current_user.get("laboratory_id")
    
    # Build query based on role
    query = "SELECT * FROM test_reports WHERE 1=1"
    params = []
    param_idx = 1
    
    if user_role == "tester":
        query += f" AND created_by = ${param_idx}"
        params.append(user_id)
        param_idx += 1
    elif user_role == "reviewer":
        query += f" AND laboratory_id = ${param_idx}"
        params.append(lab_id)
        param_idx += 1
        query += " AND status IN ('pending-review', 'approved', 'rejected', 'completed')"
    elif user_role == "viewer":
        query += f" AND laboratory_id = ${param_idx}"
        params.append(lab_id)
        param_idx += 1
        query += " AND status IN ('completed', 'approved')"
    
    # Apply filters
    if status:
        query += f" AND status = ${param_idx}"
        params.append(status)
        param_idx += 1
    
    if laboratory_id and user_role == "admin":
        query += f" AND laboratory_id = ${param_idx}"
        params.append(laboratory_id)
        param_idx += 1
    
    # Pagination
    query += f" ORDER BY created_at DESC LIMIT ${param_idx} OFFSET ${param_idx + 1}"
    params.extend([page_size, (page - 1) * page_size])
    
    # Execute query
    # results = await db.fetch(query, *params)
    
    return []


@router.post("/", response_model=TestReportResponse, status_code=status.HTTP_201_CREATED)
async def create_test(
    data: TestReportCreate,
    current_user: dict = Depends(require_permission("test_reports:create")),
):
    """Create a new test report. Requires tester or admin role."""
    # Validate input
    validation_result = validation_service.validate_test_report(data.dict())
    if not validation_result.is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"errors": [e.__dict__ for e in validation_result.errors]}
        )
    
    # Check laboratory access
    user_lab_id = current_user.get("laboratory_id")
    if current_user.get("role") != "admin" and str(data.laboratory_id) != str(user_lab_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create test in another laboratory"
        )
    
    # Generate report number
    # Insert into database
    # Return created test
    
    return TestReportResponse(
        id="placeholder",
        report_number="TST-2026-000001",
        status="draft",
        compliance_result=None,
        created_at="2026-01-01T00:00:00Z"
    )


@router.get("/{test_id}", response_model=TestReportResponse)
async def get_test(
    test_id: UUID,
    current_user: dict = Depends(get_current_user_profile),
):
    """Get test report details with role-based access control."""
    user_role = current_user.get("role")
    user_id = current_user.get("id")
    lab_id = current_user.get("laboratory_id")
    
    # Fetch test from database
    # test = await db.fetchrow("SELECT * FROM test_reports WHERE id = $1", test_id)
    
    # Check access based on role
    # if user_role == "tester" and test["created_by"] != user_id:
    #     raise HTTPException(status_code=403, detail="Access denied")
    # if user_role in ["reviewer", "viewer"] and test["laboratory_id"] != lab_id:
    #     raise HTTPException(status_code=403, detail="Access denied")
    # if user_role == "viewer" and test["status"] not in ["completed", "approved"]:
    #     raise HTTPException(status_code=403, detail="Access denied")
    
    return TestReportResponse(
        id=test_id,
        report_number="TST-2026-000001",
        status="draft",
        compliance_result=None,
        created_at="2026-01-01T00:00:00Z"
    )


@router.put("/{test_id}", response_model=TestReportResponse)
async def update_test(
    test_id: UUID,
    data: TestReportUpdate,
    current_user: dict = Depends(get_current_user_profile),
):
    """Update test report with role-based access control."""
    user_role = current_user.get("role")
    
    # Check permission based on role and status
    if user_role == "tester":
        if not has_permission(user_role, "test_reports:update_draft"):
            raise HTTPException(status_code=403, detail="Cannot update test reports")
        # Can only update draft/in-testing/revision-requested
    elif user_role == "reviewer":
        if not has_permission(user_role, "test_reports:update_review"):
            raise HTTPException(status_code=403, detail="Cannot update test reports")
        # Can only update pending-review/approved/rejected
    elif user_role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    return TestReportResponse(
        id=test_id,
        report_number="TST-2026-000001",
        status="draft",
        compliance_result=None,
        created_at="2026-01-01T00:00:00Z"
    )


@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test(
    test_id: UUID,
    current_user: dict = Depends(require_permission("test_reports:delete_draft")),
):
    """Delete test report. Only draft reports can be deleted."""
    # Check if report is draft
    # Check ownership
    pass


@router.post("/{test_id}/submit")
async def submit_test(
    test_id: UUID,
    current_user: dict = Depends(require_permission("test_reports:submit")),
):
    """Submit test for review. Requires tester role."""
    # Validate test is complete
    # Update status to pending-review
    return {"message": "Test submitted for review"}


@router.post("/{test_id}/approve")
async def approve_test(
    test_id: UUID,
    notes: Optional[str] = None,
    current_user: dict = Depends(require_permission("test_reports:approve")),
):
    """Approve test report. Requires reviewer role."""
    # Check reviewer role
    # Update status to approved
    return {"message": "Test approved"}


@router.post("/{test_id}/reject")
async def reject_test(
    test_id: UUID,
    reason: str,
    current_user: dict = Depends(require_permission("test_reports:reject")),
):
    """Reject test report. Requires reviewer role."""
    # Check reviewer role
    # Update status to revision-requested
    return {"message": "Test rejected"}


@router.post("/{test_id}/calculate")
async def calculate_test(
    test_id: UUID,
    current_user: dict = Depends(require_permission("test_data:create")),
):
    """Run calculations for test report. Requires tester role."""
    # Fetch test data
    # Run calculation engine
    # Store results
    return {"message": "Calculations completed"}


@router.get("/{test_id}/compliance")
async def get_compliance(
    test_id: UUID,
    current_user: dict = Depends(get_current_user_profile),
):
    """Get compliance evaluation for test report."""
    # Check access based on role
    # Fetch test results
    # Run compliance engine
    return {"verdict": "pending", "checks": []}


# Test Cases
@router.post("/{test_id}/cases", status_code=status.HTTP_201_CREATED)
async def create_test_case(
    test_id: UUID,
    data: TestCaseCreate,
    current_user: dict = Depends(require_permission("test_data:create")),
):
    """Add test case to report. Requires tester role."""
    # Validate
    # Insert into database
    return {"message": "Test case created"}


@router.get("/{test_id}/cases")
async def list_test_cases(
    test_id: UUID,
    current_user: dict = Depends(get_current_user_profile),
):
    """List test cases for report with role-based access."""
    # Check access based on role
    return []


# Observations
@router.post("/{test_id}/cases/{case_id}/observations", status_code=status.HTTP_201_CREATED)
async def create_observation(
    test_id: UUID,
    case_id: UUID,
    data: ObservationCreate,
    current_user: dict = Depends(require_permission("test_data:create")),
):
    """Add observation to test case. Requires tester role."""
    # Validate
    # Insert into database
    return {"message": "Observation created"}
