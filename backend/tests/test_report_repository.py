"""
NAWI Sahayak — Report Repository Tests

Comprehensive tests for:
- Report storage and retrieval
- Search and filtering
- Version management
- Immutability enforcement
- Correction handling
- Instrument history
- Audit trail
"""

import pytest
from datetime import date, datetime
from copy import deepcopy

from engine.report_models import (
    TestReport, TestResult, TestProcedure, Observation,
    ReportIdentification, LaboratoryInfo, InstrumentInfo,
    TestConditions, TestEquipment, TestEquipmentItem,
    TestCondition, ComplianceResult, Signature, ReportMetadata,
    ManufacturerInfo,
)
from engine.report_repository import (
    ReportRepository, ReportVersion, AuditEvent,
    ReportStatus, AuditEventType, ReportSummary,
    InstrumentHistory, InstrumentTestRecord, SearchResult,
)
from engine.report_snapshot import ReportSnapshotManager


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def repository():
    """Create a fresh repository for each test."""
    return ReportRepository()


@pytest.fixture
def sample_report():
    """Create a sample test report."""
    return TestReport(
        identification=ReportIdentification(
            report_number="RPT-2024-001",
            report_date=date(2024, 1, 15),
            standard="OIML R-76",
            standard_version="2009",
        ),
        laboratory=LaboratoryInfo(
            name="National Metrology Institute",
            address="123 Metrology Lane",
            city="New Delhi",
            state="Delhi",
            country="India",
            postal_code="110001",
        ),
        instrument=InstrumentInfo(
            manufacturer=ManufacturerInfo(
                name="Precision Instruments Ltd",
                country="India",
            ),
            model_name="Digital Scale Pro",
            model_number="DSP-150",
            serial_number="SN-2024-001",
            instrument_type="electronic",
            instrument_class="III",
            max_capacity=150.0,
            max_capacity_unit="kg",
            min_capacity=0.01,
            min_capacity_unit="kg",
            scale_interval=0.05,
            scale_interval_unit="kg",
        ),
        conditions=TestConditions(
            conditions=[
                TestCondition(
                    parameter="Temperature",
                    value=23.5,
                    unit="°C",
                    status="normal",
                ),
            ],
            test_date=date(2024, 1, 15),
        ),
        equipment=TestEquipment(),
        results=[
            TestResult(
                procedure=TestProcedure(
                    test_code="RPT",
                    test_name="Repeatability",
                ),
                observations=[
                    Observation(observation_number=1, value=100.01, unit="kg"),
                ],
                mean=100.01,
                standard_deviation=0.008,
                calculated_in_d=0.16,
                limit_value=0.5,
                limit_unit="d",
                status="pass",
            ),
        ],
        compliance=ComplianceResult(
            overall_status="pass",
            remarks="All tests passed.",
        ),
        metadata=ReportMetadata(
            generated_at=datetime(2024, 1, 15, 10, 30, 0),
            generated_by="system",
        ),
    )


@pytest.fixture
def sample_report_2():
    """Create a second sample test report (different instrument)."""
    return TestReport(
        identification=ReportIdentification(
            report_number="RPT-2024-002",
            report_date=date(2024, 1, 20),
        ),
        laboratory=LaboratoryInfo(
            name="National Metrology Institute",
            address="123 Metrology Lane",
            city="New Delhi",
            state="Delhi",
            country="India",
            postal_code="110001",
        ),
        instrument=InstrumentInfo(
            manufacturer=ManufacturerInfo(
                name="MetroTech Systems",
                country="Germany",
            ),
            model_name="Precision Balance",
            model_number="PB-500",
            serial_number="SN-2024-002",
            instrument_type="electronic",
            instrument_class="II",
            max_capacity=500.0,
            max_capacity_unit="g",
            min_capacity=0.001,
            min_capacity_unit="g",
            scale_interval=0.001,
            scale_interval_unit="g",
        ),
        conditions=TestConditions(
            test_date=date(2024, 1, 20),
        ),
        equipment=TestEquipment(),
        results=[
            TestResult(
                procedure=TestProcedure(
                    test_code="RPT",
                    test_name="Repeatability",
                ),
                observations=[
                    Observation(observation_number=1, value=250.001, unit="g"),
                ],
                mean=250.001,
                standard_deviation=0.0005,
                calculated_in_d=0.5,
                limit_value=1.0,
                limit_unit="d",
                status="pass",
            ),
        ],
        compliance=ComplianceResult(
            overall_status="pass",
        ),
    )


@pytest.fixture
def sample_report_fail():
    """Create a sample test report with failed result."""
    return TestReport(
        identification=ReportIdentification(
            report_number="RPT-2024-003",
            report_date=date(2024, 1, 25),
        ),
        laboratory=LaboratoryInfo(
            name="Regional Testing Lab",
            address="456 Test Street",
            city="Mumbai",
            state="Maharashtra",
            country="India",
            postal_code="400001",
        ),
        instrument=InstrumentInfo(
            manufacturer=ManufacturerInfo(
                name="Precision Instruments Ltd",
                country="India",
            ),
            model_name="Digital Scale Pro",
            model_number="DSP-150",
            serial_number="SN-2024-001",  # Same instrument as first report
            instrument_type="electronic",
            instrument_class="III",
            max_capacity=150.0,
            max_capacity_unit="kg",
            min_capacity=0.01,
            min_capacity_unit="kg",
            scale_interval=0.05,
            scale_interval_unit="kg",
        ),
        conditions=TestConditions(
            test_date=date(2024, 1, 25),
        ),
        equipment=TestEquipment(),
        results=[
            TestResult(
                procedure=TestProcedure(
                    test_code="RPT",
                    test_name="Repeatability",
                ),
                observations=[
                    Observation(observation_number=1, value=100.5, unit="kg"),
                ],
                mean=100.5,
                standard_deviation=0.3,
                calculated_in_d=6.0,
                limit_value=0.5,
                limit_unit="d",
                status="fail",
                reason="Standard deviation exceeds limit",
            ),
        ],
        compliance=ComplianceResult(
            overall_status="fail",
            remarks="Instrument failed repeatability test.",
        ),
    )


# ============================================================================
# STORE AND RETRIEVE TESTS
# ============================================================================

class TestStoreAndRetrieve:
    """Tests for storing and retrieving reports."""
    
    def test_store_report(self, repository, sample_report):
        """Store a report and retrieve it."""
        version = repository.store_report(sample_report, user_id="tech01")
        
        assert version is not None
        assert version.version_number == 1
        assert version.status == ReportStatus.DRAFT
        assert version.created_by == "tech01"
        
        # Retrieve report
        retrieved = repository.get_report("RPT-2024-001")
        assert retrieved is not None
        assert retrieved.identification.report_number == "RPT-2024-001"
    
    def test_store_multiple_versions(self, repository, sample_report):
        """Store multiple versions of the same report."""
        v1 = repository.store_report(sample_report, user_id="tech01")
        
        # Correct the report
        corrected = deepcopy(sample_report)
        corrected.results[0].standard_deviation = 0.007
        v2 = repository.correct_report(
            "RPT-2024-001", corrected, reason="Data correction", user_id="tech02"
        )
        
        versions = repository.get_versions("RPT-2024-001")
        assert len(versions) == 2
        assert v1.version_number == 1
        assert v2.version_number == 2
    
    def test_get_nonexistent_report(self, repository):
        """Get a report that doesn't exist."""
        result = repository.get_report("NONEXISTENT")
        assert result is None
    
    def test_get_latest_version(self, repository, sample_report):
        """Get the latest version of a report."""
        repository.store_report(sample_report)
        
        latest = repository.get_latest_version("RPT-2024-001")
        assert latest is not None
        assert latest.version_number == 1


# ============================================================================
# SEARCH AND FILTER TESTS
# ============================================================================

class TestSearch:
    """Tests for search and filtering."""
    
    def test_search_all(self, repository, sample_report, sample_report_2):
        """Search all reports."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_2)
        
        result = repository.search()
        assert result.total_count == 2
        assert len(result.reports) == 2
    
    def test_search_by_query(self, repository, sample_report, sample_report_2):
        """Search by query string."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_2)
        
        # Search by model
        result = repository.search(query="Digital")
        assert result.total_count == 1
        assert result.reports[0].instrument_model == "Digital Scale Pro"
        
        # Search by manufacturer
        result = repository.search(query="MetroTech")
        assert result.total_count == 1
        assert result.reports[0].manufacturer == "MetroTech Systems"
    
    def test_search_by_serial(self, repository, sample_report, sample_report_2):
        """Search by instrument serial number."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_2)
        
        result = repository.search(instrument_serial="SN-2024-001")
        assert result.total_count == 1
        assert result.reports[0].instrument_serial == "SN-2024-001"
    
    def test_search_by_model(self, repository, sample_report, sample_report_2):
        """Search by instrument model."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_2)
        
        result = repository.search(instrument_model="Precision")
        assert result.total_count == 1
        assert result.reports[0].instrument_model == "Precision Balance"
    
    def test_search_by_manufacturer(self, repository, sample_report, sample_report_2):
        """Search by manufacturer."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_2)
        
        result = repository.search(manufacturer="MetroTech")
        assert result.total_count == 1
        assert result.reports[0].manufacturer == "MetroTech Systems"
    
    def test_search_by_status(self, repository, sample_report):
        """Search by status."""
        repository.store_report(sample_report)
        
        result = repository.search(status=ReportStatus.DRAFT)
        assert result.total_count == 1
        
        result = repository.search(status=ReportStatus.FINALIZED)
        assert result.total_count == 0
    
    def test_search_by_date_range(self, repository, sample_report, sample_report_2):
        """Search by date range."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_2)
        
        result = repository.search(
            start_date=date(2024, 1, 18),
            end_date=date(2024, 1, 22),
        )
        assert result.total_count == 1
        assert result.reports[0].report_number == "RPT-2024-002"
    
    def test_search_by_result(self, repository, sample_report, sample_report_fail):
        """Search by overall result."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_fail)
        
        result = repository.search(overall_result="pass")
        assert result.total_count == 1
        assert result.reports[0].report_number == "RPT-2024-001"
        
        result = repository.search(overall_result="fail")
        assert result.total_count == 1
        assert result.reports[0].report_number == "RPT-2024-003"
    
    def test_search_pagination(self, repository, sample_report, sample_report_2):
        """Search with pagination."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_2)
        
        # Page 1 with size 1
        result = repository.search(page=1, page_size=1)
        assert result.total_count == 2
        assert result.total_pages == 2
        assert len(result.reports) == 1
        
        # Page 2 with size 1
        result = repository.search(page=2, page_size=1)
        assert result.total_count == 2
        assert len(result.reports) == 1
    
    def test_search_sort_by_date(self, repository, sample_report, sample_report_2):
        """Search with sorting by date."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_2)
        
        # Sort ascending
        result = repository.search(sort_by="test_date", sort_desc=False)
        assert result.reports[0].report_number == "RPT-2024-001"
        assert result.reports[1].report_number == "RPT-2024-002"
        
        # Sort descending
        result = repository.search(sort_by="test_date", sort_desc=True)
        assert result.reports[0].report_number == "RPT-2024-002"
        assert result.reports[1].report_number == "RPT-2024-001"
    
    def test_find_by_report_number(self, repository, sample_report):
        """Find report by exact report number."""
        repository.store_report(sample_report)
        
        result = repository.find_by_report_number("RPT-2024-001")
        assert result is not None
        assert result.report_number == "RPT-2024-001"
    
    def test_find_by_instrument_serial(self, repository, sample_report, sample_report_fail):
        """Find all reports for an instrument."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_fail)
        
        results = repository.find_by_instrument_serial("SN-2024-001")
        assert len(results) == 2
    
    def test_find_by_model(self, repository, sample_report, sample_report_2):
        """Find reports by model (partial match)."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_2)
        
        results = repository.find_by_model("Scale")
        assert len(results) == 1
        assert results[0].instrument_model == "Digital Scale Pro"
    
    def test_find_by_manufacturer(self, repository, sample_report, sample_report_2):
        """Find reports by manufacturer (partial match)."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_2)
        
        results = repository.find_by_manufacturer("Precision")
        assert len(results) == 1
        assert results[0].manufacturer == "Precision Instruments Ltd"


# ============================================================================
# DOWNLOAD TESTS
# ============================================================================

class TestDownload:
    """Tests for downloading reports."""
    
    def test_download_pdf(self, repository, sample_report):
        """Download PDF version."""
        repository.store_report(sample_report)
        
        result = repository.download_pdf("RPT-2024-001")
        assert result is not None
        assert result.format == "pdf"
        assert result.file_bytes[:5] == b'%PDF-'
    
    def test_download_docx(self, repository, sample_report):
        """Download DOCX version."""
        repository.store_report(sample_report)
        
        result = repository.download_docx("RPT-2024-001")
        assert result is not None
        assert result.format == "docx"
        assert result.file_bytes[:2] == b'PK'
    
    def test_download_nonexistent(self, repository):
        """Download nonexistent report."""
        result = repository.download_pdf("NONEXISTENT")
        assert result is None
    
    def test_download_creates_audit_event(self, repository, sample_report):
        """Download should create audit event."""
        repository.store_report(sample_report)
        
        repository.download_pdf("RPT-2024-001", user_id="user01")
        
        audit_trail = repository.get_audit_trail("RPT-2024-001")
        assert len(audit_trail) == 2  # Created + Downloaded
        assert audit_trail[1].event_type == AuditEventType.DOWNLOADED
        assert audit_trail[1].user_id == "user01"


# ============================================================================
# FINALIZATION TESTS
# ============================================================================

class TestFinalization:
    """Tests for report finalization and immutability."""
    
    def test_finalize_report(self, repository, sample_report):
        """Finalize a report."""
        repository.store_report(sample_report)
        
        version = repository.finalize_report("RPT-2024-001", user_id="reviewer01")
        
        assert version is not None
        assert version.status == ReportStatus.FINALIZED
        
        # Verify audit trail
        audit_trail = repository.get_audit_trail("RPT-2024-001")
        assert any(e.event_type == AuditEventType.FINALIZED for e in audit_trail)
    
    def test_cannot_finalize_twice(self, repository, sample_report):
        """Cannot finalize a report twice."""
        repository.store_report(sample_report)
        repository.finalize_report("RPT-2024-001")
        
        with pytest.raises(ValueError, match="already finalized"):
            repository.finalize_report("RPT-2024-001")
    
    def test_finalize_nonexistent(self, repository):
        """Finalize a nonexistent report."""
        result = repository.finalize_report("NONEXISTENT")
        assert result is None


# ============================================================================
# CORRECTION TESTS
# ============================================================================

class TestCorrections:
    """Tests for correction handling via new versions."""
    
    def test_correct_report(self, repository, sample_report):
        """Create a corrected version of a report."""
        repository.store_report(sample_report)
        
        # Create corrected report
        corrected = deepcopy(sample_report)
        corrected.results[0].mean = 100.015
        corrected.results[0].standard_deviation = 0.007
        
        version = repository.correct_report(
            "RPT-2024-001",
            corrected,
            reason="Correction of observation data",
            user_id="tech02",
        )
        
        assert version is not None
        assert version.version_number == 2
        assert version.status == ReportStatus.CORRECTED
        assert version.correction_reason == "Correction of observation data"
        assert version.parent_version_id is not None
        
        # Verify original version is superseded
        versions = repository.get_versions("RPT-2024-001")
        v1 = next(v for v in versions if v.version_number == 1)
        assert v1.status == ReportStatus.SUPERSEDED
        
        # Verify report data is updated
        report = repository.get_report("RPT-2024-001")
        assert report.results[0].mean == 100.015
    
    def test_correction_creates_audit_event(self, repository, sample_report):
        """Correction should create audit event."""
        repository.store_report(sample_report)
        
        corrected = deepcopy(sample_report)
        repository.correct_report(
            "RPT-2024-001",
            corrected,
            reason="Data correction",
            user_id="tech02",
        )
        
        audit_trail = repository.get_audit_trail("RPT-2024-001")
        assert len(audit_trail) == 2
        assert audit_trail[1].event_type == AuditEventType.CORRECTED
        assert audit_trail[1].details["reason"] == "Data correction"
    
    def test_correct_nonexistent_report(self, repository, sample_report):
        """Correct a nonexistent report."""
        with pytest.raises(ValueError, match="not found"):
            repository.correct_report("NONEXISTENT", sample_report, "reason")


# ============================================================================
# INSTRUMENT HISTORY TESTS
# ============================================================================

class TestInstrumentHistory:
    """Tests for instrument-wise history."""
    
    def test_instrument_history(self, repository, sample_report, sample_report_fail):
        """Get instrument history with multiple tests."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_fail)
        
        history = repository.get_instrument_history("SN-2024-001")
        
        assert history is not None
        assert history.serial_number == "SN-2024-001"
        assert history.total_tests == 2
        assert history.passed_tests == 1
        assert history.failed_tests == 1
        assert history.first_test_date == date(2024, 1, 15)
        assert history.last_test_date == date(2024, 1, 25)
    
    def test_instrument_history_no_tests(self, repository):
        """Get history for instrument with no tests."""
        history = repository.get_instrument_history("NONEXISTENT")
        assert history is None
    
    def test_instrument_reports(self, repository, sample_report, sample_report_fail):
        """Get all reports for an instrument."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_fail)
        
        reports = repository.get_instrument_reports("SN-2024-001")
        assert len(reports) == 2
    
    def test_instrument_history_with_corrections(self, repository, sample_report):
        """Instrument history should reflect version status."""
        repository.store_report(sample_report)
        
        # Correct the report
        corrected = deepcopy(sample_report)
        repository.correct_report(
            "RPT-2024-001",
            corrected,
            reason="Correction",
        )
        
        history = repository.get_instrument_history("SN-2024-001")
        assert history is not None
        assert history.total_tests == 1  # Still one test, just updated version
    
    def test_instrument_history_multiple_instruments(self, repository, sample_report, sample_report_2):
        """History is separate for each instrument."""
        repository.store_report(sample_report)
        repository.store_report(sample_report_2)
        
        history_1 = repository.get_instrument_history("SN-2024-001")
        history_2 = repository.get_instrument_history("SN-2024-002")
        
        assert history_1 is not None
        assert history_1.total_tests == 1
        assert history_1.model_name == "Digital Scale Pro"
        
        assert history_2 is not None
        assert history_2.total_tests == 1
        assert history_2.model_name == "Precision Balance"


# ============================================================================
# AUDIT TRAIL TESTS
# ============================================================================

class TestAuditTrail:
    """Tests for audit trail."""
    
    def test_audit_trail_created(self, repository, sample_report):
        """Audit trail should have creation event."""
        repository.store_report(sample_report, user_id="tech01")
        
        trail = repository.get_audit_trail("RPT-2024-001")
        assert len(trail) == 1
        assert trail[0].event_type == AuditEventType.CREATED
        assert trail[0].user_id == "tech01"
    
    def test_audit_trail_full_lifecycle(self, repository, sample_report):
        """Audit trail should capture full lifecycle."""
        repository.store_report(sample_report, user_id="tech01")
        repository.download_pdf("RPT-2024-001", user_id="reviewer01")
        repository.finalize_report("RPT-2024-001", user_id="approver01")
        
        trail = repository.get_audit_trail("RPT-2024-001")
        assert len(trail) == 3
        assert trail[0].event_type == AuditEventType.CREATED
        assert trail[1].event_type == AuditEventType.DOWNLOADED
        assert trail[2].event_type == AuditEventType.FINALIZED
    
    def test_audit_trail_for_version(self, repository, sample_report):
        """Get audit events for specific version."""
        repository.store_report(sample_report, user_id="tech01")
        
        versions = repository.get_versions("RPT-2024-001")
        v1 = versions[0]
        
        events = repository.get_audit_trail_for_version(v1.version_id)
        assert len(events) == 1
        assert events[0].event_type == AuditEventType.CREATED


# ============================================================================
# EDGE CASES
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases."""
    
    def test_empty_repository(self, repository):
        """Operations on empty repository."""
        result = repository.search()
        assert result.total_count == 0
        assert len(result.reports) == 0
        
        history = repository.get_instrument_history("SN-001")
        assert history is None
    
    def test_report_isolation(self, repository, sample_report):
        """Retrieved report should be a copy (not reference)."""
        repository.store_report(sample_report)
        
        retrieved = repository.get_report("RPT-2024-001")
        retrieved.identification.report_number = "MODIFIED"
        
        # Original should be unchanged
        original = repository.get_report("RPT-2024-001")
        assert original.identification.report_number == "RPT-2024-001"
    
    def test_concurrent_corrections(self, repository, sample_report):
        """Multiple corrections should create sequential versions."""
        repository.store_report(sample_report)
        
        corrected_1 = deepcopy(sample_report)
        corrected_1.results[0].mean = 100.02
        v2 = repository.correct_report("RPT-2024-001", corrected_1, "First correction")
        
        corrected_2 = deepcopy(sample_report)
        corrected_2.results[0].mean = 100.025
        v3 = repository.correct_report("RPT-2024-001", corrected_2, "Second correction")
        
        versions = repository.get_versions("RPT-2024-001")
        assert len(versions) == 3
        assert v2.version_number == 2
        assert v3.version_number == 3
        assert v2.status == ReportStatus.SUPERSEDED
        assert v3.status == ReportStatus.CORRECTED
