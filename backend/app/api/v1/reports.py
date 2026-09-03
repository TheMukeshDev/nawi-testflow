"""
NAWI TestFlow — Reports Routes

Report generation and download endpoints.

These endpoints fetch the report data from Supabase (via the service role
key, bypassing RLS) and delegate byte generation to the real report engine
(ReportLab for PDF, python-docx for DOCX).
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.security import get_current_user, get_supabase_client
from app.services.report_engine import ReportEngine, ReportData

router = APIRouter(prefix="/reports", tags=["Reports"])
report_engine = ReportEngine()


class ReportGenerateRequest(BaseModel):
    test_report_id: UUID
    format: str = "pdf"  # pdf, docx, both


class ReportResponse(BaseModel):
    id: UUID
    report_number: str
    test_report_id: UUID
    file_format: str
    file_name: str
    file_size: int
    checksum: str
    version: int
    generated_at: str
    generated_by: UUID


class ReportVersionResponse(BaseModel):
    id: UUID
    version_number: int
    file_format: str
    file_name: str
    file_size: int
    checksum: str
    generated_at: str


def _first(rows):
    return (rows or [{}])[0]


def _fetch_report_data(report_id: UUID) -> ReportData:
    """Fetch a test report and all related rows from Supabase, building ReportData."""
    supabase = get_supabase_client()

    report = _first(
        supabase.table("test_reports")
        .select("*")
        .eq("id", str(report_id))
        .limit(1)
        .execute().data
    )
    if not report:
        raise HTTPException(status_code=404, detail="Test report not found")

    instrument = _first(
        supabase.table("instruments")
        .select("*")
        .eq("id", report.get("instrument_id"))
        .limit(1)
        .execute().data
    )
    model = _first(
        supabase.table("instrument_models")
        .select("*")
        .eq("id", instrument.get("model_id"))
        .limit(1)
        .execute().data
    )
    manufacturer = _first(
        supabase.table("manufacturers")
        .select("*")
        .eq("id", model.get("manufacturer_id"))
        .limit(1)
        .execute().data
    )
    laboratory = _first(
        supabase.table("laboratories")
        .select("*")
        .eq("id", report.get("laboratory_id"))
        .limit(1)
        .execute().data
    )

    cond = _first(
        supabase.table("test_conditions")
        .select("*")
        .eq("report_id", str(report_id))
        .limit(1)
        .execute().data
    )

    cases = supabase.table("test_cases").select("*").eq("report_id", str(report_id)).order("sort_order").execute().data or []

    case_obs = {}
    for case in cases:
        obs = (
            supabase.table("test_observations")
            .select("*")
            .eq("case_id", case.get("id"))
            .order("observation_number")
            .execute().data
            or []
        )
        case_obs[case.get("id")] = obs

    results = supabase.table("test_results").select("*").eq("report_id", str(report_id)).execute().data or []

    equipment = supabase.table("test_equipment").select("*").eq("report_id", str(report_id)).execute().data or []

    # Enrich cases with their observations so the mapper can build TestResult.
    for case in cases:
        case["observations"] = case_obs.get(case.get("id"), [])

    return ReportData(
        report_number=report.get("report_number", "REPORT"),
        test_standard=report.get("test_standard") or "OIML R-76",
        test_standard_version=report.get("test_standard_version") or "2009",
        verification_type=report.get("verification_type") or "initial",
        laboratory=laboratory,
        instrument={**instrument, **model},
        manufacturer=manufacturer,
        environmental_conditions={
            **(cond or {}),
            "test_location": (cond or {}).get("test_location", ""),
            "equipment": equipment,
        },
        test_cases=cases,
        test_results=results,
        compliance_result=report.get("compliance_result") or "pending",
        compliance_notes=report.get("compliance_notes"),
        technician={"full_name": "Technician", "role": "Technician"},
        reviewer=None,
        generated_at=datetime.utcnow(),
    )


def _report_response(report: dict, generated: object, file_format: str) -> ReportResponse:
    return ReportResponse(
        id=report.get("id", report.get("test_report_id")),
        report_number=report.get("report_number"),
        test_report_id=report.get("test_report_id"),
        file_format=file_format,
        file_name=generated.file_name,
        file_size=len(generated.file_bytes),
        checksum=generated.checksum,
        version=report.get("version", 1),
        generated_at=report.get("generated_at"),
        generated_by=report.get("generated_by"),
    )


@router.get("/", response_model=List[ReportResponse])
async def list_reports(
    test_report_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """List test reports that can be exported as standardized reports."""
    supabase = get_supabase_client()
    rows = supabase.table("test_reports").select("*").order("created_at", desc=True).execute().data or []
    return [
        ReportResponse(
            id=r["id"],
            report_number=r["report_number"],
            test_report_id=r["id"],
            file_format="pdf",
            file_name=f"{r['report_number']}.pdf",
            file_size=0,
            checksum="",
            version=1,
            generated_at=str(r.get("created_at") or ""),
            generated_by=r.get("created_by") or current_user["id"],
        )
        for r in rows
    ]


@router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def generate_report(
    request: ReportGenerateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generate test report in specified format using the real engine."""
    data = _fetch_report_data(request.test_report_id)
    fmt = request.format.lower()

    if fmt == "docx":
        generated = report_engine.generate_docx(data)
        primary = "docx"
    elif fmt == "both":
        generated = report_engine.generate_pdf(data)
        primary = "pdf"
    else:
        generated = report_engine.generate_pdf(data)
        primary = "pdf"

    return ReportResponse(
        id=request.test_report_id,
        report_number=data.report_number,
        test_report_id=request.test_report_id,
        file_format=primary,
        file_name=generated.file_name,
        file_size=len(generated.file_bytes),
        checksum=generated.checksum,
        version=1,
        generated_at=data.generated_at.isoformat(),
        generated_by=current_user["id"],
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Get generated report details (regenerates PDF to report metadata)."""
    data = _fetch_report_data(report_id)
    generated = report_engine.generate_pdf(data)
    return ReportResponse(
        id=report_id,
        report_number=data.report_number,
        test_report_id=report_id,
        file_format="pdf",
        file_name=generated.file_name,
        file_size=len(generated.file_bytes),
        checksum=generated.checksum,
        version=1,
        generated_at=data.generated_at.isoformat(),
        generated_by=current_user["id"],
    )


@router.get("/{report_id}/download")
async def download_report(
    report_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Download the PDF report generated from the report data."""
    data = _fetch_report_data(report_id)
    generated = report_engine.generate_pdf(data)
    return StreamingResponse(
        BytesIO(generated.file_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{generated.file_name}"',
            "X-Checksum": generated.checksum,
        },
    )


@router.get("/{report_id}/download-docx")
async def download_report_docx(
    report_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Download the DOCX report generated from the report data."""
    data = _fetch_report_data(report_id)
    generated = report_engine.generate_docx(data)
    return StreamingResponse(
        BytesIO(generated.file_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{generated.file_name}"',
            "X-Checksum": generated.checksum,
        },
    )


@router.get("/{report_id}/versions", response_model=List[ReportVersionResponse])
async def list_report_versions(
    report_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """List generated report versions (recomputed per format)."""
    data = _fetch_report_data(report_id)
    pdf = report_engine.generate_pdf(data)
    docx = report_engine.generate_docx(data)
    now = data.generated_at.isoformat()
    return [
        ReportVersionResponse(
            id=report_id, version_number=1, file_format="pdf",
            file_name=pdf.file_name, file_size=len(pdf.file_bytes),
            checksum=pdf.checksum, generated_at=now,
        ),
        ReportVersionResponse(
            id=report_id, version_number=1, file_format="docx",
            file_name=docx.file_name, file_size=len(docx.file_bytes),
            checksum=docx.checksum, generated_at=now,
        ),
    ]
