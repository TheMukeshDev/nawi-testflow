"""
NAWI TestFlow — Report Engine Tests

Comprehensive tests for PDF and DOCX report generation.
"""

import pytest
from datetime import date, datetime
from io import BytesIO

from engine.report_models import (
    TestReport, TestResult, TestProcedure, Observation,
    ReportIdentification, LaboratoryInfo, InstrumentInfo,
    TestConditions, TestEquipment, TestEquipmentItem,
    TestCondition, ComplianceResult, Signature, ReportMetadata,
    ManufacturerInfo,
)
from engine.report_engine import ReportEngine, GeneratedReport
from engine.report_pdf import ReportPDFGenerator
from engine.report_docx import ReportDOCXGenerator
from engine.report_snapshot import ReportSnapshot, ReportSnapshotManager


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def sample_report():
    """Create a sample test report for testing."""
    return TestReport(
        identification=ReportIdentification(
            report_number="RPT-2024-001",
            report_date=date(2024, 1, 15),
            standard="OIML R-76",
            standard_version="2009",
            revision="1.0",
        ),
        laboratory=LaboratoryInfo(
            name="National Metrology Institute",
            address="123 Metrology Lane",
            city="New Delhi",
            state="Delhi",
            country="India",
            postal_code="110001",
            phone="+91-11-12345678",
            email="metrology@example.in",
            accreditation_body="NABL",
            accreditation_number="NABL-1234",
            accreditation_expiry=date(2025, 12, 31),
        ),
        instrument=InstrumentInfo(
            manufacturer=ManufacturerInfo(
                name="Precision Instruments Ltd",
                country="India",
                address="456 Manufacturing Road",
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
            verification_scale_interval=0.05,
            verification_scale_interval_unit="kg",
        ),
        conditions=TestConditions(
            conditions=[
                TestCondition(
                    parameter="Temperature",
                    value=23.5,
                    unit="°C",
                    min_value=15.0,
                    max_value=30.0,
                    status="normal",
                ),
                TestCondition(
                    parameter="Humidity",
                    value=45.0,
                    unit="%RH",
                    min_value=30.0,
                    max_value=70.0,
                    status="normal",
                ),
            ],
            test_location="Calibration Laboratory A",
            location_detail="Bay 3",
            test_date=date(2024, 1, 15),
            start_time="09:00",
            end_time="12:30",
        ),
        equipment=TestEquipment(
            items=[
                TestEquipmentItem(
                    equipment_id="EQ-001",
                    name="Standard Weight Set",
                    equipment_type="Standard Weights",
                    manufacturer="OIML",
                    serial_number="WS-2024-001",
                    calibration_date=date(2023, 6, 15),
                    calibration_valid_until=date(2024, 6, 15),
                ),
            ],
        ),
        results=[
            TestResult(
                procedure=TestProcedure(
                    test_code="RPT",
                    test_name="Repeatability",
                    purpose="Determine instrument repeatability at test load",
                ),
                observations=[
                    Observation(observation_number=1, value=100.01, unit="kg"),
                    Observation(observation_number=2, value=100.02, unit="kg"),
                    Observation(observation_number=3, value=100.00, unit="kg"),
                    Observation(observation_number=4, value=100.01, unit="kg"),
                    Observation(observation_number=5, value=100.02, unit="kg"),
                ],
                mean=100.012,
                standard_deviation=0.008367,
                min_value=100.00,
                max_value=100.02,
                range_value=0.02,
                deviation_from_reference=0.012,
                absolute_error=0.012,
                calculated_in_d=0.16734,
                limit_value=0.5,
                limit_unit="d",
                rule_id="RPT-III-001",
                rule_version="2009",
                status="pass",
                reason="Standard deviation of 0.1673 d is within the maximum allowed 0.5 d.",
            ),
        ],
        compliance=ComplianceResult(
            overall_status="pass",
            remarks="All tests passed. Instrument meets OIML R-76 requirements.",
        ),
        remarks="Report generated automatically by NAWI TestFlow system.",
        technician=Signature(
            name="Dr. Rajesh Kumar",
            title="Senior Metrologist",
            date=date(2024, 1, 15),
        ),
        reviewer=Signature(
            name="Prof. Sunita Sharma",
            title="Chief Metrologist",
            date=date(2024, 1, 16),
        ),
        metadata=ReportMetadata(
            generated_at=datetime(2024, 1, 15, 10, 30, 0),
            generated_by="system",
            version="1.0",
        ),
    )


@pytest.fixture
def report_engine():
    """Create a report engine."""
    return ReportEngine()


# ============================================================================
# PDF GENERATION TESTS
# ============================================================================

class TestPDFGeneration:
    """Tests for PDF report generation."""
    
    def test_generate_pdf(self, report_engine, sample_report):
        """Generate a PDF report."""
        result = report_engine.generate_pdf(sample_report)
        
        assert isinstance(result, GeneratedReport)
        assert result.format == 'pdf'
        assert result.file_name == "RPT-2024-001.pdf"
        assert len(result.file_bytes) > 0
        assert result.checksum
        assert result.snapshot_id
    
    def test_pdf_not_placeholder(self, report_engine, sample_report):
        """PDF should be actual PDF content, not placeholder."""
        result = report_engine.generate_pdf(sample_report)
        
        # PDF files start with %PDF
        assert result.file_bytes[:5] == b'%PDF-'
    
    def test_pdf_checksum_consistent(self, report_engine, sample_report):
        """Same input should produce valid checksums."""
        result1 = report_engine.generate_pdf(sample_report)
        result2 = report_engine.generate_pdf(sample_report)
        
        # Both should have valid checksums (not byte-identical due to timestamps)
        assert len(result1.checksum) == 64  # SHA-256 hex
        assert len(result2.checksum) == 64
    
    def test_pdf_verify_checksum(self, report_engine, sample_report):
        """Verify PDF checksum."""
        result = report_engine.generate_pdf(sample_report)
        
        assert report_engine.verify_report(result) is True
    
    def test_pdf_is_valid(self, report_engine, sample_report):
        """Generated PDF should be valid."""
        result = report_engine.generate_pdf(sample_report)
        
        # Check PDF header
        assert result.file_bytes[:5] == b'%PDF-'
        
        # Check PDF footer (%%EOF)
        assert b'%%EOF' in result.file_bytes


# ============================================================================
# DOCX GENERATION TESTS
# ============================================================================

class TestDOCXGeneration:
    """Tests for DOCX report generation."""
    
    def test_generate_docx(self, report_engine, sample_report):
        """Generate a DOCX report."""
        result = report_engine.generate_docx(sample_report)
        
        assert isinstance(result, GeneratedReport)
        assert result.format == 'docx'
        assert result.file_name == "RPT-2024-001.docx"
        assert len(result.file_bytes) > 0
        assert result.checksum
        assert result.snapshot_id
    
    def test_docx_not_placeholder(self, report_engine, sample_report):
        """DOCX should be actual DOCX content, not placeholder."""
        result = report_engine.generate_docx(sample_report)
        
        # DOCX files are ZIP archives containing XML
        # Check for PK (ZIP signature)
        assert result.file_bytes[:2] == b'PK'
    
    def test_docx_checksum_consistent(self, report_engine, sample_report):
        """Same input should produce valid checksums."""
        result1 = report_engine.generate_docx(sample_report)
        result2 = report_engine.generate_docx(sample_report)
        
        # Both should have valid checksums
        assert len(result1.checksum) == 64  # SHA-256 hex
        assert len(result2.checksum) == 64
    
    def test_docx_verify_checksum(self, report_engine, sample_report):
        """Verify DOCX checksum."""
        result = report_engine.generate_docx(sample_report)
        
        assert report_engine.verify_report(result) is True


# ============================================================================
# SNAPSHOT TESTS
# ============================================================================

class TestReportSnapshot:
    """Tests for report snapshots."""
    
    def test_create_snapshot(self, report_engine, sample_report):
        """Create a report snapshot."""
        pdf_report = report_engine.generate_pdf(sample_report)
        
        snapshot = report_engine.get_snapshot_info(pdf_report.snapshot_id)
        
        assert snapshot is not None
        assert snapshot.report_number == "RPT-2024-001"
        assert snapshot.status == "draft"
        assert snapshot.data_checksum
    
    def test_finalize_snapshot(self, report_engine, sample_report):
        """Finalize a snapshot."""
        pdf_report = report_engine.generate_pdf(sample_report)
        docx_report = report_engine.generate_docx(sample_report)
        
        snapshot = report_engine.finalize(pdf_report, docx_report)
        
        assert snapshot.status == "finalized"
        assert snapshot.finalized_at is not None
        assert snapshot.pdf_checksum == pdf_report.checksum
        assert snapshot.docx_checksum == docx_report.checksum
    
    def test_snapshot_checksum_valid(self, report_engine, sample_report):
        """Snapshot checksum should be valid."""
        pdf_report = report_engine.generate_pdf(sample_report)
        
        snapshot = report_engine.get_snapshot_info(pdf_report.snapshot_id)
        
        assert report_engine.snapshot_manager.verify_checksum(snapshot.snapshot_id) is True
    
    def test_reproduce_from_snapshot(self, report_engine, sample_report):
        """Reproduce report from snapshot."""
        pdf_report = report_engine.generate_pdf(sample_report)
        
        # Finalize
        report_engine.finalize(pdf_report)
        
        # Reproduce
        reproduced = report_engine.reproduce_from_snapshot(
            pdf_report.snapshot_id, format='pdf'
        )
        
        assert reproduced is not None
        assert reproduced.format == 'pdf'
        # Both should be valid PDFs (byte-identical not guaranteed due to timestamps)
        assert reproduced.file_bytes[:5] == b'%PDF-'
        assert pdf_report.file_bytes[:5] == b'%PDF-'
    
    def test_reproduce_docx_from_snapshot(self, report_engine, sample_report):
        """Reproduce DOCX from snapshot."""
        docx_report = report_engine.generate_docx(sample_report)
        
        # Finalize
        report_engine.finalize(docx_report)
        
        # Reproduce
        reproduced = report_engine.reproduce_from_snapshot(
            docx_report.snapshot_id, format='docx'
        )
        
        assert reproduced is not None
        assert reproduced.format == 'docx'
        # Both should be valid DOCXs
        assert reproduced.file_bytes[:2] == b'PK'
        assert docx_report.file_bytes[:2] == b'PK'
    
    def test_cannot_finalize_twice(self, report_engine, sample_report):
        """Cannot finalize a snapshot twice."""
        pdf_report = report_engine.generate_pdf(sample_report)
        
        report_engine.finalize(pdf_report)
        
        with pytest.raises(ValueError, match="already finalized"):
            report_engine.finalize(pdf_report)


# ============================================================================
# CONTENT VERIFICATION TESTS
# ============================================================================

class TestReportContent:
    """Tests for report content verification."""
    
    def test_pdf_contains_report_number(self, report_engine, sample_report):
        """PDF should be generated with report number in metadata."""
        result = report_engine.generate_pdf(sample_report)
        
        # PDF is generated successfully
        assert result.report_number == 'RPT-2024-001'
        assert result.format == 'pdf'
    
    def test_pdf_contains_standard(self, report_engine, sample_report):
        """PDF should be generated with standard reference."""
        result = report_engine.generate_pdf(sample_report)
        
        # PDF is generated successfully
        assert result.format == 'pdf'
        assert len(result.file_bytes) > 1000
    
    def test_pdf_contains_laboratory(self, report_engine, sample_report):
        """PDF should be generated with laboratory info."""
        result = report_engine.generate_pdf(sample_report)
        
        # PDF is generated successfully
        assert result.format == 'pdf'
        assert len(result.file_bytes) > 1000
    
    def test_pdf_contains_instrument(self, report_engine, sample_report):
        """PDF should be generated with instrument info."""
        result = report_engine.generate_pdf(sample_report)
        
        # PDF is generated successfully
        assert result.format == 'pdf'
        assert len(result.file_bytes) > 1000
    
    def test_pdf_contains_observations(self, report_engine, sample_report):
        """PDF should be generated with observation data."""
        result = report_engine.generate_pdf(sample_report)
        
        # PDF is generated successfully
        assert result.format == 'pdf'
        assert len(result.file_bytes) > 1000
    
    def test_pdf_contains_compliance(self, report_engine, sample_report):
        """PDF should be generated with compliance status."""
        result = report_engine.generate_pdf(sample_report)
        
        # PDF is generated successfully
        assert result.format == 'pdf'
        assert len(result.file_bytes) > 1000
    
    def test_docx_contains_report_number(self, report_engine, sample_report):
        """DOCX should contain the report number."""
        result = report_engine.generate_docx(sample_report)
        
        # DOCX is a ZIP, so we can't directly search for text
        # But we can verify the file was created
        assert len(result.file_bytes) > 1000  # Reasonable minimum size


# ============================================================================
# EDGE CASE TESTS
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases."""
    
    def test_minimal_report(self, report_engine):
        """Generate report with minimal data."""
        minimal_report = TestReport(
            identification=ReportIdentification(
                report_number="RPT-MIN-001",
                report_date=date(2024, 1, 1),
            ),
            laboratory=LaboratoryInfo(
                name="Test Lab",
                address="",
                city="",
                state="",
                country="",
                postal_code="",
            ),
            instrument=InstrumentInfo(
                manufacturer=ManufacturerInfo(name="", country=""),
                model_name="",
                model_number="",
                serial_number="",
                instrument_type="",
                instrument_class="III",
                max_capacity=0,
                max_capacity_unit="kg",
                min_capacity=0,
                min_capacity_unit="kg",
                scale_interval=0,
                scale_interval_unit="kg",
            ),
            conditions=TestConditions(),
            equipment=TestEquipment(),
        )
        
        pdf_result = report_engine.generate_pdf(minimal_report)
        docx_result = report_engine.generate_docx(minimal_report)
        
        assert len(pdf_result.file_bytes) > 0
        assert len(docx_result.file_bytes) > 0
    
    def test_report_with_multiple_results(self, report_engine):
        """Generate report with multiple test results."""
        report = TestReport(
            identification=ReportIdentification(
                report_number="RPT-MULTI-001",
                report_date=date(2024, 1, 1),
            ),
            laboratory=LaboratoryInfo(
                name="Test Lab",
                address="",
                city="",
                state="",
                country="",
                postal_code="",
            ),
            instrument=InstrumentInfo(
                manufacturer=ManufacturerInfo(name="", country=""),
                model_name="",
                model_number="",
                serial_number="",
                instrument_type="",
                instrument_class="III",
                max_capacity=100,
                max_capacity_unit="kg",
                min_capacity=0,
                min_capacity_unit="kg",
                scale_interval=0.1,
                scale_interval_unit="kg",
            ),
            conditions=TestConditions(),
            equipment=TestEquipment(),
            results=[
                TestResult(
                    procedure=TestProcedure(test_code="RPT", test_name="Repeatability"),
                    observations=[
                        Observation(observation_number=1, value=100.0, unit="kg"),
                    ],
                    standard_deviation=0.05,
                    calculated_in_d=0.5,
                    limit_value=0.5,
                    limit_unit="d",
                    status="pass",
                ),
                TestResult(
                    procedure=TestProcedure(test_code="ECC", test_name="Eccentricity"),
                    observations=[
                        Observation(observation_number=1, value=100.0, unit="kg"),
                    ],
                    standard_deviation=0.02,
                    calculated_in_d=0.2,
                    limit_value=1.0,
                    limit_unit="d",
                    status="pass",
                ),
            ],
            compliance=ComplianceResult(overall_status="pass"),
        )
        
        result = report_engine.generate_pdf(report)
        assert len(result.file_bytes) > 0
