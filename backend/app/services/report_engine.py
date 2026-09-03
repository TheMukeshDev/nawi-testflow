"""
NAWI TestFlow — Report Engine

Service facade for generating standardized test reports in PDF and DOCX
formats.

This facade keeps the public ``ReportEngine`` interface stable for the API
layer while delegating the actual bytes to the real generation engine in
``engine.report_engine`` (ReportLab for PDF, python-docx for DOCX),
including snapshot-based reproducibility.

This module has NO HTTP dependencies.
"""

import hashlib
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional
from io import BytesIO

from engine.report_models import (
    TestReport,
    TestResult,
    TestProcedure,
    Observation,
    ReportIdentification,
    LaboratoryInfo,
    InstrumentInfo,
    TestConditions,
    TestCondition,
    TestEquipment,
    TestEquipmentItem,
    ComplianceResult,
    Signature,
    ReportMetadata,
    ManufacturerInfo,
)
from engine.report_engine import ReportEngine as _RealReportEngine


@dataclass
class ReportData:
    """Data needed to generate a test report."""
    report_number: str
    test_standard: str
    test_standard_version: str
    verification_type: str
    laboratory: dict
    instrument: dict
    manufacturer: dict
    environmental_conditions: dict
    test_cases: list[dict]
    test_results: list[dict]
    compliance_result: str
    compliance_notes: Optional[str]
    technician: dict
    reviewer: Optional[dict]
    generated_at: datetime


@dataclass
class GeneratedReport:
    """Result of report generation."""
    file_bytes: bytes
    file_format: str
    file_name: str
    checksum: str


def _as_float(value) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_date(value) -> Optional[date]:
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _to_test_report(data: ReportData) -> TestReport:
    """Map the API's flat ``ReportData`` into the engine's ``TestReport`` model."""

    lab = data.laboratory or {}
    mfr = data.manufacturer or {}
    instr = data.instrument or {}
    env = data.environmental_conditions or {}
    tech = data.technician or {}
    rev = data.reviewer or {}

    manufacturer = ManufacturerInfo(
        name=mfr.get("name", ""),
        country=mfr.get("country", ""),
        address=mfr.get("address", ""),
        phone=mfr.get("phone", ""),
        email=mfr.get("email", ""),
    )

    instrument = InstrumentInfo(
        manufacturer=manufacturer,
        model_name=instr.get("model_name", mfr.get("model_name", "")),
        model_number=instr.get("model_number", ""),
        serial_number=instr.get("serial_number", ""),
        instrument_type=instr.get("instrument_type", "electronic"),
        instrument_class=instr.get("instrument_class", "III"),
        max_capacity=_as_float(instr.get("capacity") or instr.get("max_capacity")),
        max_capacity_unit=instr.get("capacity_unit") or instr.get("max_capacity_unit") or "kg",
        min_capacity=_as_float(instr.get("min_capacity")),
        min_capacity_unit=instr.get("min_capacity_unit") or "kg",
        scale_interval=_as_float(instr.get("division") or instr.get("scale_interval")),
        scale_interval_unit=instr.get("division_unit") or instr.get("scale_interval_unit") or "kg",
        next_calibration=_as_date(instr.get("next_calibration")),
        last_calibration=_as_date(instr.get("last_calibration")),
        notes=instr.get("notes"),
    )

    conditions = []
    temp = _as_float(env.get("temperature"))
    if temp is not None:
        conditions.append(
            TestCondition(
                parameter="Temperature",
                value=temp,
                unit=env.get("temperature_unit") or "°C",
                min_value=_as_float(env.get("temperature_min")),
                max_value=_as_float(env.get("temperature_max")),
                status=env.get("temperature_status") or "normal",
            )
        )
    hum = _as_float(env.get("humidity"))
    if hum is not None:
        conditions.append(
            TestCondition(
                parameter="Humidity",
                value=hum,
                unit=env.get("humidity_unit") or "%RH",
                min_value=_as_float(env.get("humidity_min")),
                max_value=_as_float(env.get("humidity_max")),
                status=env.get("humidity_status") or "normal",
            )
        )
    press = _as_float(env.get("air_pressure"))
    if press is not None:
        conditions.append(
            TestCondition(
                parameter="Air Pressure",
                value=press,
                unit=env.get("air_pressure_unit") or "hPa",
                status=env.get("air_pressure_status") or "normal",
            )
        )

    test_conditions = TestConditions(
        conditions=conditions,
        test_location=env.get("test_location", ""),
        test_date=_as_date(env.get("test_date")),
        notes=env.get("notes"),
    )

    equipment_items = []
    for eq in (env.get("equipment") or []):
        equipment_items.append(
            TestEquipmentItem(
                equipment_id=eq.get("id") or eq.get("equipment_id") or "",
                name=eq.get("equipment_name") or eq.get("name") or "",
                equipment_type=eq.get("equipment_type") or "accessory",
                manufacturer="",
                serial_number=eq.get("serial_number") or "",
                calibration_date=_as_date(eq.get("calibration_date")),
                calibration_valid_until=_as_date(eq.get("calibration_valid_until")),
                certificate_reference=eq.get("certificate_number") or "",
            )
        )
    equipment = TestEquipment(items=equipment_items)

    # Join test cases with their computed results.
    results_by_case = {
        (r.get("case_id") or r.get("id")): r for r in (data.test_results or [])
    }

    results = []
    for case in (data.test_cases or []):
        case_id = case.get("id") or case.get("case_id")
        res = results_by_case.get(case_id, {})
        case_type = case.get("case_type", "")
        label = case.get("test_point_label", "")

        procedure = TestProcedure(
            test_code=case_type.upper()[:8],
            test_name=(case.get("test_name") or case_type.title() or "Test"),
            purpose="",
            procedure_reference="OIML R-76",
        )

        observations = [
            Observation(
                observation_number=o.get("observation_number", i + 1),
                value=_as_float(o.get("measured_value") or o.get("value") or 0.0),
                unit=o.get("unit") or case.get("unit") or "kg",
                notes=o.get("notes"),
            )
            for i, o in enumerate(case.get("observations") or [])
        ]

        verdict = res.get("verdict") or case.get("status") or "pass"
        status = "pass"
        if verdict in ("fail", "non-compliant", "out-of-range"):
            status = "fail"
        elif verdict in ("pending", "in-progress"):
            status = "rule_not_configured"

        results.append(
            TestResult(
                procedure=procedure,
                observations=observations,
                mean=_as_float(res.get("mean_value") or res.get("mean")),
                min_value=_as_float(res.get("min_value")),
                max_value=_as_float(res.get("max_value")),
                standard_deviation=_as_float(res.get("std_deviation") or res.get("standard_deviation")),
                deviation_from_reference=_as_float(res.get("deviation_from_reference")),
                absolute_error=_as_float(res.get("calculated_error") or res.get("absolute_error")),
                limit_value=_as_float(res.get("max_permissible_error") or res.get("limit_value")),
                limit_unit=case.get("unit") or "kg",
                status=status,
                reason=res.get("notes") or "",
            )
        )

    overall_status = "pass"
    if data.compliance_result in ("non-compliant", "fail"):
        overall_status = "fail"
    elif not data.compliance_result or data.compliance_result in ("pending", "not-applicable"):
        overall_status = "incomplete"

    compliance = ComplianceResult(
        overall_status=overall_status,
        test_results=results,
        remarks=data.compliance_notes or "",
    )

    technician = Signature(
        name=tech.get("full_name") or tech.get("name") or "",
        title=tech.get("role") or "Technician",
    )
    reviewer = None
    if rev:
        reviewer = Signature(
            name=rev.get("full_name") or rev.get("name") or "",
            title=rev.get("role") or "Reviewer",
        )

    identification = ReportIdentification(
        report_number=data.report_number,
        report_date=_as_date(instr.get("date_received")) or data.generated_at.date(),
        standard=data.test_standard or "OIML R-76",
        standard_version=data.test_standard_version or "2009",
        revision="1.0",
    )

    return TestReport(
        identification=identification,
        laboratory=LaboratoryInfo(
            name=lab.get("name", ""),
            address=lab.get("address", ""),
            city=lab.get("city", ""),
            state=lab.get("state", ""),
            country=lab.get("country", "India"),
            postal_code=lab.get("postal_code", ""),
            phone=lab.get("phone", ""),
            email=lab.get("email", ""),
            accreditation_body=lab.get("accreditation_body", ""),
            accreditation_number=lab.get("accreditation_number", ""),
            accreditation_expiry=_as_date(lab.get("accreditation_valid_until")),
        ),
        instrument=instrument,
        conditions=test_conditions,
        equipment=equipment,
        results=results,
        compliance=compliance,
        remarks=data.compliance_notes or "",
        technician=technician,
        reviewer=reviewer,
        metadata=ReportMetadata(
            generated_at=data.generated_at,
            version="1.0",
        ),
    )


class ReportEngine:
    """
    Generate standardized test reports.

    Supports:
    - PDF generation via ReportLab
    - DOCX generation via python-docx
    - Checksum calculation for tamper detection

    Delegates to the real generation engine for the actual file bytes.
    """

    def __init__(self):
        self._engine = _RealReportEngine()

    def generate_pdf(self, report_data: ReportData) -> GeneratedReport:
        """
        Generate PDF report.

        Args:
            report_data: Complete report data

        Returns:
            GeneratedReport with file bytes and metadata
        """
        report = _to_test_report(report_data)
        real = self._engine.generate_pdf(report)
        return GeneratedReport(
            file_bytes=real.file_bytes,
            file_format="pdf",
            file_name=real.file_name,
            checksum=real.checksum,
        )

    def generate_docx(self, report_data: ReportData) -> GeneratedReport:
        """
        Generate editable DOCX report.

        Args:
            report_data: Complete report data

        Returns:
            GeneratedReport with file bytes and metadata
        """
        report = _to_test_report(report_data)
        real = self._engine.generate_docx(report)
        return GeneratedReport(
            file_bytes=real.file_bytes,
            file_format="docx",
            file_name=real.file_name,
            checksum=real.checksum,
        )

    def to_test_report(self, report_data: ReportData) -> TestReport:
        """Expose the mapped engine model (useful for snapshots/tests)."""
        return _to_test_report(report_data)

    def calculate_checksum(self, file_bytes: bytes) -> str:
        """
        Calculate SHA-256 checksum for tamper detection.

        Args:
            file_bytes: File content as bytes

        Returns:
            Hex digest of SHA-256 hash
        """
        sha256 = hashlib.sha256()
        sha256.update(file_bytes)
        return sha256.hexdigest()

    def verify_checksum(self, file_bytes: bytes, expected_checksum: str) -> bool:
        """
        Verify file integrity against checksum.

        Args:
            file_bytes: File content as bytes
            expected_checksum: Expected SHA-256 checksum

        Returns:
            True if checksum matches
        """
        return self.calculate_checksum(file_bytes) == expected_checksum
