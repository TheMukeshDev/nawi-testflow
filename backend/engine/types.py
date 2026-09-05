"""
NAWI Sahayak — Calculation Engine Types

Core data types for inputs, outputs, and intermediate results.
All types are dataclasses for immutability and clarity.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Any


# ============================================================================
# ENUMERATIONS
# ============================================================================

class MassUnit(str, Enum):
    """Mass units for weighing instruments."""
    MG = "mg"
    G = "g"
    KG = "kg"
    T = "t"


class TestStatusCode(str, Enum):
    """Test result status codes."""
    PASS = "pass"
    FAIL = "fail"
    NOT_APPLICABLE = "not_applicable"
    INCOMPLETE = "incomplete"
    RULE_NOT_CONFIGURED = "rule_not_configured"
    INSUFFICIENT_DATA = "insufficient_data"
    INVALID_INPUT = "invalid_input"
    OUT_OF_RANGE = "out_of_range"
    CALCULATION_ERROR = "calculation_error"


class ValidationSeverity(str, Enum):
    """Validation error severity."""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class InstrumentClass(str, Enum):
    """OIML R-76 instrument classes."""
    I = "I"
    II = "II"
    III = "III"
    IIII = "IIII"
    IIIIL = "IIIIL"


class TestType(str, Enum):
    """
    Test types for NAWI verification (OIML R-76).
    
    The ``value`` is the short ``test_code`` used throughout the engine.
    These map to the OIML R-76 test procedures in the rulebook:
      - WEIGHING  -> R76-1 §5.4 / §6.7  (Gross load weighing test)
      - REPEATABILITY, ECCENTRICITY, DISCRIMINATION etc.
    """
    WEIGHING = "WGT"
    REPEATABILITY = "RPT"
    ECCENTRICITY = "ECC"
    LINEARITY = "LIN"
    DISCRIMINATION = "DIS"
    STABILITY = "STB"
    TARE = "TARE"
    ZERO_SETTING = "ZST"
    TEMPERATURE = "TMP"
    TEMP_ZERO_DRIFT = "TZD"


# ============================================================================
# INPUT TYPES
# ============================================================================

@dataclass
class RawObservation:
    """A single raw observation value with metadata."""
    value: float
    unit: MassUnit
    observation_number: int
    notes: Optional[str] = None


@dataclass
class TestPointInput:
    """Input for a single test point."""
    point_label: str
    reference_value: float
    unit: MassUnit
    observations: list[RawObservation] = field(default_factory=list)


@dataclass
class TestInput:
    """Complete input for a test calculation."""
    test_code: str
    instrument_class: InstrumentClass
    max_capacity: float
    max_capacity_unit: MassUnit
    scale_interval: float
    scale_interval_unit: MassUnit
    verification_scale_interval: Optional[float] = None
    verification_scale_interval_unit: Optional[MassUnit] = None
    test_points: list[TestPointInput] = field(default_factory=list)
    additional_inputs: dict[str, Any] = field(default_factory=dict)


# ============================================================================
# VALIDATION TYPES
# ============================================================================

@dataclass
class ValidationError:
    """A single validation error."""
    field: str
    message: str
    severity: ValidationSeverity
    code: str
    value: Optional[Any] = None


@dataclass
class ValidationResult:
    """Result of input validation."""
    is_valid: bool
    errors: list[ValidationError] = field(default_factory=list)
    warnings: list[ValidationError] = field(default_factory=list)

    def add_error(self, field: str, message: str, code: str, value: Any = None):
        """Add a validation error."""
        self.errors.append(ValidationError(
            field=field,
            message=message,
            severity=ValidationSeverity.ERROR,
            code=code,
            value=value,
        ))
        self.is_valid = False

    def add_warning(self, field: str, message: str, code: str, value: Any = None):
        """Add a validation warning."""
        self.warnings.append(ValidationError(
            field=field,
            message=message,
            severity=ValidationSeverity.WARNING,
            code=code,
            value=value,
        ))


# ============================================================================
# CALCULATION TYPES
# ============================================================================

@dataclass
class ObservationStatistics:
    """Statistical calculations for a set of observations."""
    count: int
    mean: float
    std_deviation: float
    min_value: float
    max_value: float
    range: float
    coefficient_of_variation: float


@dataclass
class TestPointResult:
    """Result of calculations for a single test point."""
    point_label: str
    reference_value: float
    unit: MassUnit
    observation_count: int
    statistics: ObservationStatistics
    deviation_from_reference: float
    absolute_error: float


# ============================================================================
# RULE TYPES
# ============================================================================

@dataclass
class ApplicableLimit:
    """A limit resolved from compliance rules."""
    limit_key: str
    label: str
    value: float
    unit: str
    rule_id: str
    rule_version: str
    description: str


# ============================================================================
# OUTPUT TYPES
# ============================================================================

@dataclass
class CalculationResult:
    """
    Complete result of a test calculation.
    
    Every calculation result contains:
    - test_code
    - input_observations
    - calculated_values
    - applicable_limit
    - unit
    - status
    - rule_id
    - rule_version
    - calculated_at
    """
    # Identification
    test_code: str
    test_name: str
    
    # Input observations (what was measured)
    input_observations: list[dict]  # Serialized observations
    
    # Calculated values (computed from observations)
    calculated_values: dict[str, float]
    
    # Applicable limit (from rule resolution)
    applicable_limit: Optional[ApplicableLimit]
    
    # Unit of the result
    unit: str
    
    # Status (pass, fail, rule_not_configured, etc.)
    status: TestStatusCode
    
    # Rule information
    rule_id: Optional[str] = None
    rule_version: Optional[str] = None
    
    # Timestamp
    calculated_at: datetime = field(default_factory=datetime.utcnow)
    
    # Validation errors (if any)
    validation_errors: list[ValidationError] = field(default_factory=list)
    
    # Additional details
    details: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Serialize to dictionary for storage/API."""
        return {
            "test_code": self.test_code,
            "test_name": self.test_name,
            "input_observations": self.input_observations,
            "calculated_values": self.calculated_values,
            "applicable_limit": {
                "limit_key": self.applicable_limit.limit_key,
                "label": self.applicable_limit.label,
                "value": self.applicable_limit.value,
                "unit": self.applicable_limit.unit,
                "rule_id": self.applicable_limit.rule_id,
                "rule_version": self.applicable_limit.rule_version,
            } if self.applicable_limit else None,
            "unit": self.unit,
            "status": self.status.value,
            "rule_id": self.rule_id,
            "rule_version": self.rule_version,
            "calculated_at": self.calculated_at.isoformat(),
            "validation_errors": [
                {
                    "field": e.field,
                    "message": e.message,
                    "severity": e.severity.value,
                    "code": e.code,
                }
                for e in self.validation_errors
            ],
            "details": self.details,
        }


@dataclass
class ComplianceExplanation:
    """Structured explanation for a compliance decision.
    
    Provides clear, traceable reasoning:
    - What was measured
    - What the limit is
    - How they compare
    - What rule was applied
    """
    parameter_name: str  # e.g., "Standard Deviation", "Maximum Eccentricity"
    observed_value: float  # The calculated/measured value
    observed_unit: str  # Unit of the observed value
    allowed_value: float  # The limit from the rule
    allowed_unit: str  # Unit of the allowed value
    difference: float  # observed - allowed (positive = exceeded)
    margin: float  # allowed - observed (positive = within limit)
    is_within_limit: bool  # Whether the observation meets the limit
    comparison_operator: str  # "<=", ">=", "==", etc.
    
    def to_dict(self) -> dict:
        return {
            "parameter_name": self.parameter_name,
            "observed_value": self.observed_value,
            "observed_unit": self.observed_unit,
            "allowed_value": self.allowed_value,
            "allowed_unit": self.allowed_unit,
            "difference": round(self.difference, 6),
            "margin": round(self.margin, 6),
            "is_within_limit": self.is_within_limit,
            "comparison_operator": self.comparison_operator,
        }


@dataclass
class ComplianceDecision:
    """Complete, deterministic compliance decision for a single test.
    
    Every decision must contain full traceability:
    - Which standard and version was applied
    - Which specific rule was used
    - What was observed vs. what was allowed
    - Why the decision was made
    
    IMPORTANT: This engine never guesses regulatory values.
    If a required rule is missing, the decision is RULE_NOT_CONFIGURED.
    """
    # Identification
    standard: str  # e.g., "OIML R-76"
    standard_version: str  # e.g., "2009"
    rule_id: str  # e.g., "RPT-III-001"
    rule_version: str  # e.g., "2009"
    test_code: str  # e.g., "RPT"
    test_name: str  # e.g., "Repeatability"
    
    # Values
    calculated_value: Optional[float]  # The computed value from observations
    calculated_unit: str  # Unit of the calculated value
    applicable_limit: Optional[float]  # The limit from the rule
    limit_unit: str  # Unit of the limit
    
    # Decision
    decision: TestStatusCode  # PASS, FAIL, NOT_APPLICABLE, INCOMPLETE, RULE_NOT_CONFIGURED
    reason: str  # Human-readable explanation
    
    # Detailed explanations (one per evaluated parameter)
    explanations: list[ComplianceExplanation] = field(default_factory=list)
    
    # Metadata
    evaluated_at: datetime = field(default_factory=datetime.utcnow)
    evaluated_by: str = "system"  # "system" for automated, user ID for manual
    notes: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Serialize to dictionary for storage/API."""
        return {
            "standard": self.standard,
            "standard_version": self.standard_version,
            "rule_id": self.rule_id,
            "rule_version": self.rule_version,
            "test_code": self.test_code,
            "test_name": self.test_name,
            "calculated_value": self.calculated_value,
            "calculated_unit": self.calculated_unit,
            "applicable_limit": self.applicable_limit,
            "limit_unit": self.limit_unit,
            "decision": self.decision.value,
            "reason": self.reason,
            "explanations": [e.to_dict() for e in self.explanations],
            "evaluated_at": self.evaluated_at.isoformat(),
            "evaluated_by": self.evaluated_by,
            "notes": self.notes,
        }


@dataclass
class ComplianceResult:
    """Overall compliance evaluation result for a complete test."""
    test_code: str
    test_name: str
    overall_status: TestStatusCode
    point_results: list[dict]  # Serialized TestPointResults
    validation_summary: dict
    decisions: list[ComplianceDecision] = field(default_factory=list)
    calculated_at: datetime = field(default_factory=datetime.utcnow)
    details: Optional[str] = None


@dataclass
class EngineResult:
    """Complete engine output for a test."""
    test_code: str
    validation: ValidationResult = field(default_factory=lambda: ValidationResult(is_valid=True))
    calculation_result: Optional[CalculationResult] = None
    compliance_result: Optional[ComplianceResult] = None
    executed_at: datetime = field(default_factory=datetime.utcnow)
