"""
NAWI Sahayak — Report Data Models

Data models for standardized test report generation.
These models define the structure of the report content.
"""

from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional, Any


@dataclass
class ReportIdentification:
    """Report identification information."""
    report_number: str
    report_date: date
    standard: str = "OIML R-76"
    standard_version: str = "2009"
    revision: str = "1.0"
    page_count: int = 0


@dataclass
class LaboratoryInfo:
    """Laboratory information."""
    name: str
    address: str
    city: str
    state: str
    country: str
    postal_code: str
    phone: str = ""
    email: str = ""
    accreditation_body: str = ""
    accreditation_number: str = ""
    accreditation_expiry: Optional[date] = None


@dataclass
class ManufacturerInfo:
    """Manufacturer information."""
    name: str
    country: str
    address: str = ""
    phone: str = ""
    email: str = ""
    website: str = ""


@dataclass
class InstrumentInfo:
    """Instrument identification and specifications."""
    manufacturer: ManufacturerInfo
    model_name: str
    model_number: str
    serial_number: str
    instrument_type: str  # electronic, mechanical, electromechanical
    instrument_class: str  # I, II, III, IIII, IIIIL
    max_capacity: float
    max_capacity_unit: str
    min_capacity: float
    min_capacity_unit: str
    scale_interval: float
    scale_interval_unit: str
    verification_scale_interval: Optional[float] = None
    verification_scale_interval_unit: Optional[str] = None
    number_of_verification_intervals: Optional[int] = None
    software_version: Optional[str] = None
    firmware_version: Optional[str] = None
    power_supply: Optional[str] = None
    asset_tag: Optional[str] = None
    date_received: Optional[date] = None
    last_calibration: Optional[date] = None
    next_calibration: Optional[date] = None
    notes: Optional[str] = None


@dataclass
class TestCondition:
    """Environmental condition measurement."""
    parameter: str  # e.g., "Temperature", "Humidity"
    value: float
    unit: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    status: str = "normal"  # normal, warning, critical
    notes: Optional[str] = None


@dataclass
class TestConditions:
    """Test environmental conditions."""
    conditions: list[TestCondition] = field(default_factory=list)
    test_location: str = ""
    location_detail: str = ""
    test_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class TestEquipmentItem:
    """Equipment used during testing."""
    equipment_id: str
    name: str
    equipment_type: str
    manufacturer: str = ""
    model: str = ""
    serial_number: str = ""
    calibration_date: Optional[date] = None
    calibration_valid_until: Optional[date] = None
    certificate_reference: str = ""


@dataclass
class TestEquipment:
    """Collection of equipment used."""
    items: list[TestEquipmentItem] = field(default_factory=list)


@dataclass
class Observation:
    """A single observation value."""
    observation_number: int
    value: float
    unit: str
    notes: Optional[str] = None


@dataclass
class TestProcedure:
    """Test procedure definition."""
    test_code: str
    test_name: str
    purpose: str = ""
    applicability: str = ""
    procedure_reference: str = ""


@dataclass
class TestResult:
    """Result of a single test."""
    procedure: TestProcedure
    observations: list[Observation] = field(default_factory=list)
    
    # Observed values
    mean: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    range_value: Optional[float] = None
    standard_deviation: Optional[float] = None
    coefficient_of_variation: Optional[float] = None
    deviation_from_reference: Optional[float] = None
    absolute_error: Optional[float] = None
    
    # Calculated values (in scale intervals)
    calculated_in_d: Optional[float] = None
    
    # Limit from rule
    limit_value: Optional[float] = None
    limit_unit: str = ""
    rule_id: str = ""
    rule_version: str = ""
    
    # Result
    status: str = ""  # pass, fail, rule_not_configured
    reason: str = ""
    
    # Additional
    notes: Optional[str] = None


@dataclass
class ComplianceResult:
    """Overall compliance result."""
    overall_status: str  # pass, fail, incomplete
    test_results: list[TestResult] = field(default_factory=list)
    remarks: str = ""


@dataclass
class Signature:
    """Digital or manual signature."""
    name: str
    title: str
    date: Optional[date] = None
    signature_data: Optional[bytes] = None  # For digital signatures
    notes: Optional[str] = None


@dataclass
class Attachment:
    """File attachment."""
    filename: str
    content_type: str
    data: bytes
    description: str = ""


@dataclass
class ReportMetadata:
    """Report metadata for audit trail."""
    generated_at: datetime = field(default_factory=datetime.utcnow)
    generated_by: str = "system"
    finalized_at: Optional[datetime] = None
    finalized_by: Optional[str] = None
    version: str = "1.0"
    checksum: str = ""


@dataclass
class TestReport:
    """Complete test report data."""
    identification: ReportIdentification
    laboratory: LaboratoryInfo
    instrument: InstrumentInfo
    conditions: TestConditions
    equipment: TestEquipment
    results: list[TestResult] = field(default_factory=list)
    compliance: Optional[ComplianceResult] = None
    remarks: str = ""
    attachments: list[Attachment] = field(default_factory=list)
    technician: Optional[Signature] = None
    reviewer: Optional[Signature] = None
    approver: Optional[Signature] = None
    metadata: ReportMetadata = field(default_factory=ReportMetadata)
