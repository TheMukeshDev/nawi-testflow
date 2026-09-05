"""
NAWI Sahayak — Report Generation Engine

Main entry point for report generation.
Orchestrates PDF and DOCX generation with snapshot-based reproducibility.

Architecture:
    TestReport (data)
        → ReportSnapshot (immutable record)
            → PDF Generation (ReportLab)
            → DOCX Generation (python-docx)
            → Checksums (SHA-256)
            → Storage

Finalized reports must be reproducible from their snapshot.
"""

import hashlib
from datetime import datetime
from typing import Optional
from dataclasses import dataclass

from .report_models import TestReport, ReportMetadata
from .report_pdf import ReportPDFGenerator
from .report_docx import ReportDOCXGenerator
from .report_snapshot import ReportSnapshot, ReportSnapshotManager


@dataclass
class GeneratedReport:
    """Result of report generation."""
    report_number: str
    format: str  # pdf, docx
    file_bytes: bytes
    file_name: str
    checksum: str
    snapshot_id: str
    generated_at: datetime


class ReportEngine:
    """
    Main report generation engine.
    
    Generates standardized test reports in PDF and DOCX formats.
    Uses snapshots to ensure reproducibility of finalized reports.
    
    Usage:
        engine = ReportEngine()
        
        # Create report from data
        pdf_report = engine.generate_pdf(report)
        docx_report = engine.generate_docx(report)
        
        # Finalize (creates immutable snapshot)
        engine.finalize(pdf_report, docx_report)
        
        # Reproduce (generate from snapshot)
        reproduced = engine.reproduce_from_snapshot(snapshot_id, format='pdf')
    """
    
    def __init__(self):
        self.pdf_generator = ReportPDFGenerator()
        self.docx_generator = ReportDOCXGenerator()
        self.snapshot_manager = ReportSnapshotManager()
    
    def generate_pdf(self, report: TestReport) -> GeneratedReport:
        """
        Generate PDF report.
        
        Args:
            report: Complete test report data
            
        Returns:
            GeneratedReport with file bytes and metadata
        """
        # Generate PDF
        pdf_bytes = self.pdf_generator.generate(report)
        
        # Calculate checksum
        checksum = hashlib.sha256(pdf_bytes).hexdigest()
        
        # Create file name
        file_name = "{}.pdf".format(report.identification.report_number)
        
        # Create snapshot
        snapshot = self.snapshot_manager.create_snapshot(
            report, report.identification.report_number
        )
        
        return GeneratedReport(
            report_number=report.identification.report_number,
            format='pdf',
            file_bytes=pdf_bytes,
            file_name=file_name,
            checksum=checksum,
            snapshot_id=snapshot.snapshot_id,
            generated_at=datetime.utcnow(),
        )
    
    def generate_docx(self, report: TestReport) -> GeneratedReport:
        """
        Generate DOCX report.
        
        Args:
            report: Complete test report data
            
        Returns:
            GeneratedReport with file bytes and metadata
        """
        # Generate DOCX
        docx_bytes = self.docx_generator.generate(report)
        
        # Calculate checksum
        checksum = hashlib.sha256(docx_bytes).hexdigest()
        
        # Create file name
        file_name = "{}.docx".format(report.identification.report_number)
        
        # Create snapshot
        snapshot = self.snapshot_manager.create_snapshot(
            report, report.identification.report_number
        )
        
        return GeneratedReport(
            report_number=report.identification.report_number,
            format='docx',
            file_bytes=docx_bytes,
            file_name=file_name,
            checksum=checksum,
            snapshot_id=snapshot.snapshot_id,
            generated_at=datetime.utcnow(),
        )
    
    def finalize(
        self,
        pdf_report: Optional[GeneratedReport] = None,
        docx_report: Optional[GeneratedReport] = None,
    ) -> ReportSnapshot:
        """
        Finalize reports (create immutable snapshot).
        
        Once finalized, the report data cannot be changed.
        Any future generation must use this exact snapshot.
        
        Args:
            pdf_report: Generated PDF report
            docx_report: Generated DOCX report
            
        Returns:
            Finalized ReportSnapshot
        """
        # Use the snapshot from either report
        snapshot_id = None
        if pdf_report:
            snapshot_id = pdf_report.snapshot_id
        elif docx_report:
            snapshot_id = docx_report.snapshot_id
        
        if snapshot_id is None:
            raise ValueError("No report provided for finalization")
        
        # Finalize the snapshot
        snapshot = self.snapshot_manager.finalize_snapshot(
            snapshot_id,
            pdf_checksum=pdf_report.checksum if pdf_report else None,
            docx_checksum=docx_report.checksum if docx_report else None,
        )
        
        return snapshot
    
    def reproduce_from_snapshot(
        self,
        snapshot_id: str,
        format: str = 'pdf',
    ) -> Optional[GeneratedReport]:
        """
        Reproduce a report from a finalized snapshot.
        
        This ensures that historical reports can always be regenerated
        with the exact same data.
        
        Args:
            snapshot_id: ID of the finalized snapshot
            format: 'pdf' or 'docx'
            
        Returns:
            GeneratedReport if successful, None if snapshot not found
        """
        # Recreate report from snapshot
        report = self.snapshot_manager.recreate_report(snapshot_id)
        if report is None:
            return None
        
        # Generate the requested format
        if format == 'pdf':
            return self.generate_pdf(report)
        elif format == 'docx':
            return self.generate_docx(report)
        else:
            raise ValueError("Unsupported format: {}".format(format))
    
    def verify_report(self, generated: GeneratedReport) -> bool:
        """
        Verify report integrity against its checksum.
        
        Args:
            generated: GeneratedReport to verify
            
        Returns:
            True if checksum matches
        """
        if generated.format == 'pdf':
            current_checksum = hashlib.sha256(generated.file_bytes).hexdigest()
        elif generated.format == 'docx':
            current_checksum = hashlib.sha256(generated.file_bytes).hexdigest()
        else:
            return False
        
        return current_checksum == generated.checksum
    
    def get_snapshot_info(self, snapshot_id: str) -> Optional[ReportSnapshot]:
        """Get snapshot information."""
        return self.snapshot_manager.get_snapshot(snapshot_id)
    
    def get_report_snapshot(self, report_number: str) -> Optional[ReportSnapshot]:
        """Get the finalized snapshot for a report."""
        return self.snapshot_manager.get_snapshot_by_report(report_number)
