"""
NAWI TestFlow — Report Repository

Digital test report repository with:
- Search by report number, instrument serial, model, manufacturer
- Filter by status, date, test result, instrument
- Sort by date
- View report details
- Download PDF/DOCX
- Instrument-wise history
- Immutability enforcement for finalized reports
- Correction handling via new versions/audit events

Design Principles:
- Finalized reports are IMMUTABLE
- Corrections create new versions, not silent modifications
- Every change is tracked in an audit trail
- Instrument history shows complete test timeline
"""

from datetime import datetime, date
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum
import copy

from .report_models import (
    TestReport, TestResult, TestProcedure, Observation,
    ReportIdentification, LaboratoryInfo, InstrumentInfo,
    TestConditions, TestEquipment, ComplianceResult,
    Signature, ReportMetadata
)
from .report_snapshot import ReportSnapshot, ReportSnapshotManager
from .report_engine import ReportEngine, GeneratedReport


# ============================================================================
# ENUMERATIONS
# ============================================================================

class ReportStatus(str, Enum):
    """Report status lifecycle."""
    DRAFT = "draft"
    FINALIZED = "finalized"
    CORRECTED = "corrected"
    SUPERSEDED = "superseded"
    ARCHIVED = "archived"


class AuditEventType(str, Enum):
    """Types of audit events."""
    CREATED = "created"
    FINALIZED = "finalized"
    CORRECTED = "corrected"
    DOWNLOADED = "downloaded"
    VIEWED = "viewed"
    SUPERSEDED = "superseded"


# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class ReportVersion:
    """Version of a report (immutable once created)."""
    version_id: str
    report_number: str
    version_number: int
    snapshot_id: str
    status: ReportStatus
    created_at: datetime
    created_by: str
    checksum: str
    parent_version_id: Optional[str] = None  # For corrections
    correction_reason: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class AuditEvent:
    """Audit trail event."""
    event_id: str
    report_number: str
    version_id: str
    event_type: AuditEventType
    timestamp: datetime
    user_id: str
    details: Dict[str, Any] = field(default_factory=dict)
    notes: Optional[str] = None


@dataclass
class ReportSummary:
    """Summary of a report for listing/search results."""
    report_number: str
    instrument_serial: str
    instrument_model: str
    manufacturer: str
    test_date: Optional[date]
    status: ReportStatus
    overall_result: str  # pass, fail, incomplete
    version_count: int
    latest_version: int
    created_at: datetime
    finalized_at: Optional[datetime]


@dataclass
class InstrumentTestRecord:
    """Record of a test for instrument history."""
    report_number: str
    test_date: Optional[date]
    overall_result: str
    test_types: List[str]
    status: ReportStatus
    version_id: str
    created_at: datetime


@dataclass
class InstrumentHistory:
    """Complete test history for an instrument."""
    serial_number: str
    model_name: str
    manufacturer: str
    total_tests: int
    passed_tests: int
    failed_tests: int
    incomplete_tests: int
    test_records: List[InstrumentTestRecord]
    first_test_date: Optional[date] = None
    last_test_date: Optional[date] = None


@dataclass
class SearchResult:
    """Result of a search operation."""
    reports: List[ReportSummary]
    total_count: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# REPOSITORY
# ============================================================================

class ReportRepository:
    """
    Digital test report repository.
    
    Manages the lifecycle of test reports:
    - Storage and retrieval
    - Search and filtering
    - Immutability enforcement
    - Version management
    - Audit trail
    - Instrument history
    """
    
    def __init__(self, snapshot_manager: Optional[ReportSnapshotManager] = None):
        self._reports: Dict[str, TestReport] = {}
        self._versions: Dict[str, List[ReportVersion]] = {}
        self._audit_events: Dict[str, List[AuditEvent]] = {}
        self._snapshot_manager = snapshot_manager or ReportSnapshotManager()
        self._report_engine = ReportEngine()
        self._report_engine.snapshot_manager = self._snapshot_manager
        self._instruments: Dict[str, List[str]] = {}  # serial -> [report_numbers]
        self._version_counter: Dict[str, int] = {}
    
    # --------------------------------------------------------------------
    # STORE AND RETRIEVE
    # --------------------------------------------------------------------
    
    def store_report(
        self,
        report: TestReport,
        user_id: str = "system",
        notes: Optional[str] = None,
    ) -> ReportVersion:
        """
        Store a new report (creates version 1).
        
        Args:
            report: Complete test report data
            user_id: User who created the report
            notes: Optional notes
            
        Returns:
            ReportVersion for the stored report
        """
        report_number = report.identification.report_number
        
        # Store the report data
        self._reports[report_number] = copy.deepcopy(report)
        
        # Generate PDF for checksum
        pdf_result = self._report_engine.generate_pdf(report)
        
        # Create version
        version = self._create_version(
            report_number=report_number,
            snapshot_id=pdf_result.snapshot_id,
            status=ReportStatus.DRAFT,
            user_id=user_id,
            checksum=pdf_result.checksum,
            notes=notes,
        )
        
        # Track instrument
        serial = report.instrument.serial_number
        if serial not in self._instruments:
            self._instruments[serial] = []
        if report_number not in self._instruments[serial]:
            self._instruments[serial].append(report_number)
        
        # Create audit event
        self._create_audit_event(
            report_number=report_number,
            version_id=version.version_id,
            event_type=AuditEventType.CREATED,
            user_id=user_id,
            details={"report_number": report_number},
        )
        
        return version
    
    def get_report(self, report_number: str) -> Optional[TestReport]:
        """
        Get report data by report number.
        
        Args:
            report_number: Unique report number
            
        Returns:
            TestReport if found, None otherwise
        """
        return copy.deepcopy(self._reports.get(report_number))
    
    def get_version(self, version_id: str) -> Optional[ReportVersion]:
        """
        Get a specific version.
        
        Args:
            version_id: Version ID
            
        Returns:
            ReportVersion if found, None otherwise
        """
        for versions in self._versions.values():
            for v in versions:
                if v.version_id == version_id:
                    return v
        return None
    
    def get_versions(self, report_number: str) -> List[ReportVersion]:
        """
        Get all versions of a report.
        
        Args:
            report_number: Report number
            
        Returns:
            List of ReportVersion objects
        """
        return self._versions.get(report_number, [])
    
    def get_latest_version(self, report_number: str) -> Optional[ReportVersion]:
        """
        Get the latest version of a report.
        
        Args:
            report_number: Report number
            
        Returns:
            Latest ReportVersion if found, None otherwise
        """
        versions = self.get_versions(report_number)
        if not versions:
            return None
        return max(versions, key=lambda v: v.version_number)
    
    # --------------------------------------------------------------------
    # SEARCH AND FILTER
    # --------------------------------------------------------------------
    
    def search(
        self,
        query: Optional[str] = None,
        report_number: Optional[str] = None,
        instrument_serial: Optional[str] = None,
        instrument_model: Optional[str] = None,
        manufacturer: Optional[str] = None,
        status: Optional[ReportStatus] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        overall_result: Optional[str] = None,
        sort_by: str = "created_at",
        sort_desc: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> SearchResult:
        """
        Search and filter reports.
        
        Args:
            query: Free text search (searches report number, model, manufacturer)
            report_number: Exact report number match
            instrument_serial: Exact serial number match
            instrument_model: Partial model name match
            manufacturer: Partial manufacturer name match
            status: Filter by status
            start_date: Filter reports created after this date
            end_date: Filter reports created before this date
            overall_result: Filter by pass/fail/incomplete
            sort_by: Field to sort by (created_at, test_date, report_number)
            sort_desc: Sort descending if True
            page: Page number (1-based)
            page_size: Results per page
            
        Returns:
            SearchResult with matching reports
        """
        results = []
        
        for report_number, report in self._reports.items():
            summary = self._create_summary(report_number)
            if summary is None:
                continue
            
            # Apply filters
            if report_number is not None and report_number != summary.report_number:
                continue
            
            if query:
                query_lower = query.lower()
                if (query_lower not in summary.report_number.lower() and
                    query_lower not in summary.instrument_model.lower() and
                    query_lower not in summary.manufacturer.lower() and
                    query_lower not in summary.instrument_serial.lower()):
                    continue
            
            if instrument_serial and summary.instrument_serial != instrument_serial:
                continue
            
            if instrument_model and instrument_model.lower() not in summary.instrument_model.lower():
                continue
            
            if manufacturer and manufacturer.lower() not in summary.manufacturer.lower():
                continue
            
            if status and summary.status != status:
                continue
            
            if start_date and summary.test_date and summary.test_date < start_date:
                continue
            
            if end_date and summary.test_date and summary.test_date > end_date:
                continue
            
            if overall_result and summary.overall_result != overall_result:
                continue
            
            results.append(summary)
        
        # Sort
        sort_key = self._get_sort_key(sort_by)
        results.sort(key=sort_key, reverse=sort_desc)
        
        # Paginate
        total_count = len(results)
        total_pages = max(1, (total_count + page_size - 1) // page_size)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_results = results[start_idx:end_idx]
        
        return SearchResult(
            reports=paginated_results,
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    
    def find_by_report_number(self, report_number: str) -> Optional[ReportSummary]:
        """Find report by exact report number."""
        return self._create_summary(report_number)
    
    def find_by_instrument_serial(self, serial_number: str) -> List[ReportSummary]:
        """Find all reports for an instrument serial number."""
        report_numbers = self._instruments.get(serial_number, [])
        results = []
        for rn in report_numbers:
            summary = self._create_summary(rn)
            if summary:
                results.append(summary)
        return results
    
    def find_by_model(self, model: str) -> List[ReportSummary]:
        """Find reports by instrument model (partial match)."""
        results = []
        for report_number, report in self._reports.items():
            if model.lower() in report.instrument.model_name.lower():
                summary = self._create_summary(report_number)
                if summary:
                    results.append(summary)
        return results
    
    def find_by_manufacturer(self, manufacturer: str) -> List[ReportSummary]:
        """Find reports by manufacturer name (partial match)."""
        results = []
        for report_number, report in self._reports.items():
            if manufacturer.lower() in report.instrument.manufacturer.name.lower():
                summary = self._create_summary(report_number)
                if summary:
                    results.append(summary)
        return results
    
    def find_by_date_range(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[ReportSummary]:
        """Find reports within a date range."""
        results = []
        for report_number, report in self._reports.items():
            test_date = report.conditions.test_date
            if test_date:
                if start_date and test_date < start_date:
                    continue
                if end_date and test_date > end_date:
                    continue
                summary = self._create_summary(report_number)
                if summary:
                    results.append(summary)
        return results
    
    def find_by_status(self, status: ReportStatus) -> List[ReportSummary]:
        """Find reports by status."""
        results = []
        for report_number in self._reports:
            summary = self._create_summary(report_number)
            if summary and summary.status == status:
                results.append(summary)
        return results
    
    def find_by_result(self, result: str) -> List[ReportSummary]:
        """Find reports by overall result (pass/fail/incomplete)."""
        results = []
        for report_number in self._reports:
            summary = self._create_summary(report_number)
            if summary and summary.overall_result == result:
                results.append(summary)
        return results
    
    # --------------------------------------------------------------------
    # DOWNLOAD
    # --------------------------------------------------------------------
    
    def download_pdf(
        self,
        report_number: str,
        version_id: Optional[str] = None,
        user_id: str = "system",
    ) -> Optional[GeneratedReport]:
        """
        Download PDF version of a report.
        
        Args:
            report_number: Report number
            version_id: Specific version to download (latest if None)
            user_id: User requesting download
            
        Returns:
            GeneratedReport if successful, None otherwise
        """
        # Get version
        if version_id:
            version = self.get_version(version_id)
        else:
            version = self.get_latest_version(report_number)
        
        if version is None:
            return None
        
        # Get report data
        report = self._reports.get(report_number)
        if report is None:
            return None
        
        # Reproduce from snapshot
        result = self._report_engine.reproduce_from_snapshot(
            version.snapshot_id, format='pdf'
        )
        
        if result:
            # Create audit event
            self._create_audit_event(
                report_number=report_number,
                version_id=version.version_id,
                event_type=AuditEventType.DOWNLOADED,
                user_id=user_id,
                details={"format": "pdf"},
            )
        
        return result
    
    def download_docx(
        self,
        report_number: str,
        version_id: Optional[str] = None,
        user_id: str = "system",
    ) -> Optional[GeneratedReport]:
        """
        Download DOCX version of a report.
        
        Args:
            report_number: Report number
            version_id: Specific version to download (latest if None)
            user_id: User requesting download
            
        Returns:
            GeneratedReport if successful, None otherwise
        """
        # Get version
        if version_id:
            version = self.get_version(version_id)
        else:
            version = self.get_latest_version(report_number)
        
        if version is None:
            return None
        
        # Get report data
        report = self._reports.get(report_number)
        if report is None:
            return None
        
        # Reproduce from snapshot
        result = self._report_engine.reproduce_from_snapshot(
            version.snapshot_id, format='docx'
        )
        
        if result:
            # Create audit event
            self._create_audit_event(
                report_number=report_number,
                version_id=version.version_id,
                event_type=AuditEventType.DOWNLOADED,
                user_id=user_id,
                details={"format": "docx"},
            )
        
        return result
    
    # --------------------------------------------------------------------
    # FINALIZATION
    # --------------------------------------------------------------------
    
    def finalize_report(
        self,
        report_number: str,
        user_id: str = "system",
        notes: Optional[str] = None,
    ) -> Optional[ReportVersion]:
        """
        Finalize a report (make it immutable).
        
        Args:
            report_number: Report number to finalize
            user_id: User who finalized
            notes: Optional notes
            
        Returns:
            Updated ReportVersion if successful, None otherwise
        """
        version = self.get_latest_version(report_number)
        if version is None:
            return None
        
        if version.status == ReportStatus.FINALIZED:
            raise ValueError("Report {} is already finalized".format(report_number))
        
        # Finalize the snapshot
        self._snapshot_manager.finalize_snapshot(version.snapshot_id)
        
        # Update version status
        version.status = ReportStatus.FINALIZED
        version.notes = notes
        
        # Create audit event
        self._create_audit_event(
            report_number=report_number,
            version_id=version.version_id,
            event_type=AuditEventType.FINALIZED,
            user_id=user_id,
            details={"status": "finalized"},
        )
        
        return version
    
    # --------------------------------------------------------------------
    # CORRECTIONS (New versions, not modifications)
    # --------------------------------------------------------------------
    
    def correct_report(
        self,
        report_number: str,
        corrected_report: TestReport,
        reason: str,
        user_id: str = "system",
        notes: Optional[str] = None,
    ) -> ReportVersion:
        """
        Create a corrected version of a report.
        
        IMPORTANT: This does NOT modify the original report.
        It creates a new version linked to the original.
        
        Args:
            report_number: Original report number
            corrected_report: Corrected report data
            reason: Reason for correction
            user_id: User who made the correction
            notes: Additional notes
            
        Returns:
            New ReportVersion for the corrected report
            
        Raises:
            ValueError: If original report not found
        """
        if report_number not in self._reports:
            raise ValueError("Report {} not found".format(report_number))
        
        # Get current version
        current_version = self.get_latest_version(report_number)
        if current_version is None:
            raise ValueError("No versions found for report {}".format(report_number))
        
        # Mark current version as superseded
        current_version.status = ReportStatus.SUPERSEDED
        
        # Store corrected report (same report number, new version)
        self._reports[report_number] = copy.deepcopy(corrected_report)
        
        # Generate new PDF for checksum
        pdf_result = self._report_engine.generate_pdf(corrected_report)
        
        # Create new version
        new_version = self._create_version(
            report_number=report_number,
            snapshot_id=pdf_result.snapshot_id,
            status=ReportStatus.CORRECTED,
            user_id=user_id,
            checksum=pdf_result.checksum,
            parent_version_id=current_version.version_id,
            correction_reason=reason,
            notes=notes,
        )
        
        # Create audit event
        self._create_audit_event(
            report_number=report_number,
            version_id=new_version.version_id,
            event_type=AuditEventType.CORRECTED,
            user_id=user_id,
            details={
                "parent_version": current_version.version_id,
                "reason": reason,
            },
        )
        
        return new_version
    
    # --------------------------------------------------------------------
    # INSTRUMENT HISTORY
    # --------------------------------------------------------------------
    
    def get_instrument_history(
        self,
        serial_number: str,
    ) -> Optional[InstrumentHistory]:
        """
        Get complete test history for an instrument.
        
        Args:
            serial_number: Instrument serial number
            
        Returns:
            InstrumentHistory if instrument has tests, None otherwise
        """
        report_numbers = self._instruments.get(serial_number, [])
        if not report_numbers:
            return None
        
        test_records = []
        test_dates = []
        
        for rn in report_numbers:
            report = self._reports.get(rn)
            if report is None:
                continue
            
            # Get latest version
            version = self.get_latest_version(rn)
            if version is None:
                continue
            
            # Get test types from results
            test_types = [
                r.procedure.test_code for r in report.results
            ]
            
            record = InstrumentTestRecord(
                report_number=rn,
                test_date=report.conditions.test_date,
                overall_result=report.compliance.overall_status if report.compliance else "incomplete",
                test_types=test_types,
                status=version.status,
                version_id=version.version_id,
                created_at=version.created_at,
            )
            test_records.append(record)
            
            if report.conditions.test_date:
                test_dates.append(report.conditions.test_date)
        
        # Calculate statistics
        passed = sum(1 for r in test_records if r.overall_result == "pass")
        failed = sum(1 for r in test_records if r.overall_result == "fail")
        incomplete = sum(1 for r in test_records if r.overall_result == "incomplete")
        
        # Get instrument info from first report
        first_report = self._reports.get(report_numbers[0])
        model_name = first_report.instrument.model_name if first_report else ""
        manufacturer = first_report.instrument.manufacturer.name if first_report else ""
        
        return InstrumentHistory(
            serial_number=serial_number,
            model_name=model_name,
            manufacturer=manufacturer,
            total_tests=len(test_records),
            passed_tests=passed,
            failed_tests=failed,
            incomplete_tests=incomplete,
            test_records=test_records,
            first_test_date=min(test_dates) if test_dates else None,
            last_test_date=max(test_dates) if test_dates else None,
        )
    
    def get_instrument_reports(
        self,
        serial_number: str,
    ) -> List[ReportSummary]:
        """
        Get all reports for an instrument as summaries.
        
        Args:
            serial_number: Instrument serial number
            
        Returns:
            List of ReportSummary objects
        """
        report_numbers = self._instruments.get(serial_number, [])
        results = []
        for rn in report_numbers:
            summary = self._create_summary(rn)
            if summary:
                results.append(summary)
        return results
    
    # --------------------------------------------------------------------
    # AUDIT TRAIL
    # --------------------------------------------------------------------
    
    def get_audit_trail(
        self,
        report_number: str,
    ) -> List[AuditEvent]:
        """
        Get complete audit trail for a report.
        
        Args:
            report_number: Report number
            
        Returns:
            List of AuditEvent objects
        """
        return self._audit_events.get(report_number, [])
    
    def get_audit_trail_for_version(
        self,
        version_id: str,
    ) -> List[AuditEvent]:
        """
        Get audit events for a specific version.
        
        Args:
            version_id: Version ID
            
        Returns:
            List of AuditEvent objects
        """
        events = []
        for report_events in self._audit_events.values():
            for event in report_events:
                if event.version_id == version_id:
                    events.append(event)
        return events
    
    # --------------------------------------------------------------------
    # HELPERS
    # --------------------------------------------------------------------
    
    def _create_version(
        self,
        report_number: str,
        snapshot_id: str,
        status: ReportStatus,
        user_id: str,
        checksum: str,
        parent_version_id: Optional[str] = None,
        correction_reason: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> ReportVersion:
        """Create a new version for a report."""
        # Increment version counter
        if report_number not in self._version_counter:
            self._version_counter[report_number] = 0
        self._version_counter[report_number] += 1
        version_number = self._version_counter[report_number]
        
        version_id = "VER-{}-{}".format(report_number, version_number)
        
        version = ReportVersion(
            version_id=version_id,
            report_number=report_number,
            version_number=version_number,
            snapshot_id=snapshot_id,
            status=status,
            created_at=datetime.utcnow(),
            created_by=user_id,
            checksum=checksum,
            parent_version_id=parent_version_id,
            correction_reason=correction_reason,
            notes=notes,
        )
        
        if report_number not in self._versions:
            self._versions[report_number] = []
        self._versions[report_number].append(version)
        
        return version
    
    def _create_audit_event(
        self,
        report_number: str,
        version_id: str,
        event_type: AuditEventType,
        user_id: str,
        details: Optional[Dict[str, Any]] = None,
        notes: Optional[str] = None,
    ) -> AuditEvent:
        """Create an audit event."""
        event_id = "AUD-{}-{}".format(
            report_number,
            datetime.utcnow().strftime("%Y%m%d%H%M%S")
        )
        
        event = AuditEvent(
            event_id=event_id,
            report_number=report_number,
            version_id=version_id,
            event_type=event_type,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            details=details or {},
            notes=notes,
        )
        
        if report_number not in self._audit_events:
            self._audit_events[report_number] = []
        self._audit_events[report_number].append(event)
        
        return event
    
    def _create_summary(self, report_number: str) -> Optional[ReportSummary]:
        """Create a ReportSummary from stored data."""
        report = self._reports.get(report_number)
        if report is None:
            return None
        
        version = self.get_latest_version(report_number)
        if version is None:
            return None
        
        # Get overall result
        overall_result = "incomplete"
        if report.compliance:
            overall_result = report.compliance.overall_status
        
        # Get version count
        versions = self.get_versions(report_number)
        
        return ReportSummary(
            report_number=report_number,
            instrument_serial=report.instrument.serial_number,
            instrument_model=report.instrument.model_name,
            manufacturer=report.instrument.manufacturer.name,
            test_date=report.conditions.test_date,
            status=version.status,
            overall_result=overall_result,
            version_count=len(versions),
            latest_version=version.version_number,
            created_at=version.created_at,
            finalized_at=version.created_at if version.status == ReportStatus.FINALIZED else None,
        )
    
    def _get_sort_key(self, sort_by: str):
        """Get sort key function for sorting reports."""
        def sort_by_created(report: ReportSummary):
            return report.created_at
        
        def sort_by_date(report: ReportSummary):
            return report.test_date or date.min
        
        def sort_by_number(report: ReportSummary):
            return report.report_number
        
        sort_map = {
            "created_at": sort_by_created,
            "test_date": sort_by_date,
            "report_number": sort_by_number,
        }
        
        return sort_map.get(sort_by, sort_by_created)
