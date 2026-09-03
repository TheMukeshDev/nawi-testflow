"""
NAWI TestFlow — Golden Dataset

Known test inputs with deterministic expected outputs.
This is the SINGLE SOURCE OF TRUTH for calculation verification.

Every entry contains:
1. Input: TestInput (observations, parameters)
2. Expected: CalculationResult + ComplianceDecision
3. Rule version used
4. Human-readable description

Design principles:
- Every expected value is verified against manual calculation
- All values use SI units where applicable
- Test cases cover PASS, FAIL, INCOMPLETE, RULE_NOT_CONFIGURED
- Historical rule versions are tested separately
"""

from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional

from engine.types import (
    TestInput, TestPointInput, RawObservation, MassUnit,
    InstrumentClass, TestStatusCode,
)
from engine.rules import ComplianceRule
from engine.versioned_rules import (
    RuleVersion, VersionedComplianceRule, RuleSource, RuleStatus,
)


# ============================================================================
# GOLDEN TEST CASE: REPEATABILITY (PASS)
# ============================================================================

RPT_PASS_INPUT = TestInput(
    test_code="RPT",
    instrument_class=InstrumentClass.III,
    max_capacity=100,
    max_capacity_unit=MassUnit.KG,
    scale_interval=0.02,  # d = 20 g
    scale_interval_unit=MassUnit.KG,
    test_points=[
        TestPointInput(
            point_label="Max",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.002, unit=MassUnit.KG, observation_number=1),
                RawObservation(value=100.001, unit=MassUnit.KG, observation_number=2),
                RawObservation(value=100.003, unit=MassUnit.KG, observation_number=3),
            ],
        ),
    ],
)

RPT_PASS_EXPECTED = {
    "test_code": "RPT",
    "test_name": "Repeatability",
    "status": TestStatusCode.PASS,
    "calculated_values": {
        "mean": 100.002,  # (100.002 + 100.001 + 100.003) / 3
        "std_deviation": 0.001,  # sample std dev
        "min_value": 100.001,
        "max_value": 100.003,
        "range": 0.002,
    },
    "compliance_decision": "pass",
    "rule_id": "RPT-III-001",
    "rule_version": "2009",
    "description": "Repeatability test with tight observations — should PASS",
}


# ============================================================================
# GOLDEN TEST CASE: REPEATABILITY (FAIL)
# ============================================================================

RPT_FAIL_INPUT = TestInput(
    test_code="RPT",
    instrument_class=InstrumentClass.III,
    max_capacity=100,
    max_capacity_unit=MassUnit.KG,
    scale_interval=0.02,  # d = 20 g
    scale_interval_unit=MassUnit.KG,
    test_points=[
        TestPointInput(
            point_label="Max",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.05, unit=MassUnit.KG, observation_number=1),
                RawObservation(value=100.15, unit=MassUnit.KG, observation_number=2),
                RawObservation(value=100.10, unit=MassUnit.KG, observation_number=3),
            ],
        ),
    ],
)

RPT_FAIL_EXPECTED = {
    "test_code": "RPT",
    "test_name": "Repeatability",
    "status": TestStatusCode.FAIL,
    "calculated_values": {
        "mean": 100.10,  # (100.05 + 100.15 + 100.10) / 3
        "std_deviation": 0.05,  # sample std dev
    },
    "compliance_decision": "fail",
    "rule_id": "RPT-III-001",
    "rule_version": "2009",
    "description": "Repeatability test with wide spread — should FAIL",
}


# ============================================================================
# GOLDEN TEST CASE: ECCENTRICITY (PASS)
# ============================================================================

ECC_PASS_INPUT = TestInput(
    test_code="ECC",
    instrument_class=InstrumentClass.III,
    max_capacity=100,
    max_capacity_unit=MassUnit.KG,
    scale_interval=0.02,
    scale_interval_unit=MassUnit.KG,
    test_points=[
        TestPointInput(
            point_label="center",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.001, unit=MassUnit.KG, observation_number=1),
                RawObservation(value=100.002, unit=MassUnit.KG, observation_number=2),
            ],
        ),
        TestPointInput(
            point_label="front",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.005, unit=MassUnit.KG, observation_number=1),
            ],
        ),
        TestPointInput(
            point_label="rear",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.003, unit=MassUnit.KG, observation_number=1),
            ],
        ),
        TestPointInput(
            point_label="left",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.004, unit=MassUnit.KG, observation_number=1),
            ],
        ),
        TestPointInput(
            point_label="right",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.002, unit=MassUnit.KG, observation_number=1),
            ],
        ),
    ],
)

ECC_PASS_EXPECTED = {
    "test_code": "ECC",
    "test_name": "Eccentricity",
    "status": TestStatusCode.PASS,
    "calculated_values": {
        "center_reading": 100.0015,
        "max_absolute_deviation": 0.0035,  # front: 100.005 - 100.0015
    },
    "compliance_decision": "pass",
    "rule_id": "ECC-III-001",
    "rule_version": "2009",
    "description": "Eccentricity test with small deviations — should PASS",
}


# ============================================================================
# GOLDEN TEST CASE: ECCENTRICITY (FAIL)
# ============================================================================

ECC_FAIL_INPUT = TestInput(
    test_code="ECC",
    instrument_class=InstrumentClass.III,
    max_capacity=100,
    max_capacity_unit=MassUnit.KG,
    scale_interval=0.02,
    scale_interval_unit=MassUnit.KG,
    test_points=[
        TestPointInput(
            point_label="center",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.001, unit=MassUnit.KG, observation_number=1),
            ],
        ),
        TestPointInput(
            point_label="front",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.05, unit=MassUnit.KG, observation_number=1),  # Large deviation
            ],
        ),
        TestPointInput(
            point_label="rear",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.003, unit=MassUnit.KG, observation_number=1),
            ],
        ),
    ],
)

ECC_FAIL_EXPECTED = {
    "test_code": "ECC",
    "test_name": "Eccentricity",
    "status": TestStatusCode.FAIL,
    "calculated_values": {
        "center_reading": 100.001,
        "max_absolute_deviation": 0.049,  # front: 100.05 - 100.001
    },
    "compliance_decision": "fail",
    "rule_id": "ECC-III-001",
    "rule_version": "2009",
    "description": "Eccentricity test with large deviation — should FAIL",
}


# ============================================================================
# GOLDEN TEST CASE: RULE NOT CONFIGURED
# ============================================================================

RULE_NOT_CONFIGURED_INPUT = TestInput(
    test_code="XYZ",  # Unknown test code
    instrument_class=InstrumentClass.III,
    max_capacity=100,
    max_capacity_unit=MassUnit.KG,
    scale_interval=0.02,
    scale_interval_unit=MassUnit.KG,
    test_points=[
        TestPointInput(
            point_label="Max",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.001, unit=MassUnit.KG, observation_number=1),
            ],
        ),
    ],
)

RULE_NOT_CONFIGURED_EXPECTED = {
    "test_code": "XYZ",
    "status": TestStatusCode.RULE_NOT_CONFIGURED,
    "compliance_decision": "rule_not_configured",
    "description": "Unknown test code — must return RULE_NOT_CONFIGURED",
}


# ============================================================================
# GOLDEN TEST CASE: INCOMPLETE (Missing observations)
# ============================================================================

INCOMPLETE_INPUT = TestInput(
    test_code="RPT",
    instrument_class=InstrumentClass.III,
    max_capacity=100,
    max_capacity_unit=MassUnit.KG,
    scale_interval=0.02,
    scale_interval_unit=MassUnit.KG,
    test_points=[
        TestPointInput(
            point_label="Max",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[],  # Empty!
        ),
    ],
)

INCOMPLETE_EXPECTED = {
    "test_code": "RPT",
    "status": TestStatusCode.INVALID_INPUT,
    "compliance_decision": "incomplete",
    "description": "Missing observations — must return INVALID_INPUT / INCOMPLETE",
}


# ============================================================================
# GOLDEN TEST CASE: LINEARITY (PASS)
# ============================================================================

LIN_PASS_INPUT = TestInput(
    test_code="LIN",
    instrument_class=InstrumentClass.III,
    max_capacity=100,
    max_capacity_unit=MassUnit.KG,
    scale_interval=0.02,
    scale_interval_unit=MassUnit.KG,
    test_points=[
        TestPointInput(
            point_label="0.1e",
            reference_value=10,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=10.001, unit=MassUnit.KG, observation_number=1),
            ],
        ),
        TestPointInput(
            point_label="0.5e",
            reference_value=50,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=50.002, unit=MassUnit.KG, observation_number=1),
            ],
        ),
        TestPointInput(
            point_label="1e",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.003, unit=MassUnit.KG, observation_number=1),
            ],
        ),
    ],
)

LIN_PASS_EXPECTED = {
    "test_code": "LIN",
    "test_name": "Linearity",
    "status": TestStatusCode.PASS,
    "calculated_values": {
        "max_linearity_error": 0.003,  # max deviation from reference
    },
    "compliance_decision": "pass",
    "rule_id": "LIN-III-001",
    "rule_version": "2009",
    "description": "Linearity test with small errors — should PASS",
}


# ============================================================================
# GOLDEN TEST CASE: DISCRIMINATION (PASS)
# ============================================================================

DIS_PASS_INPUT = TestInput(
    test_code="DIS",
    instrument_class=InstrumentClass.III,
    max_capacity=100,
    max_capacity_unit=MassUnit.KG,
    scale_interval=0.02,
    scale_interval_unit=MassUnit.KG,
    test_points=[
        TestPointInput(
            point_label="before",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.000, unit=MassUnit.KG, observation_number=1),
            ],
        ),
        TestPointInput(
            point_label="after",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.025, unit=MassUnit.KG, observation_number=1),  # Change > d
            ],
        ),
    ],
    additional_inputs={"discrimination_weight": 0.02},
)

DIS_PASS_EXPECTED = {
    "test_code": "DIS",
    "test_name": "Discrimination",
    "status": TestStatusCode.PASS,
    "calculated_values": {
        "is_detected": 1.0,
        "measured_discrimination": 0.025,
    },
    "compliance_decision": "pass",
    "rule_id": "DIS-III-001",
    "rule_version": "2009",
    "description": "Discrimination detected — should PASS",
}


# ============================================================================
# GOLDEN TEST CASE: STABILITY (PASS)
# ============================================================================

STB_PASS_INPUT = TestInput(
    test_code="STB",
    instrument_class=InstrumentClass.III,
    max_capacity=100,
    max_capacity_unit=MassUnit.KG,
    scale_interval=0.02,
    scale_interval_unit=MassUnit.KG,
    test_points=[
        TestPointInput(
            point_label="initial",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.001, unit=MassUnit.KG, observation_number=1),
            ],
        ),
        TestPointInput(
            point_label="final",
            reference_value=100,
            unit=MassUnit.KG,
            observations=[
                RawObservation(value=100.003, unit=MassUnit.KG, observation_number=1),
            ],
        ),
    ],
)

STB_PASS_EXPECTED = {
    "test_code": "STB",
    "test_name": "Stability",
    "status": TestStatusCode.PASS,
    "calculated_values": {
        "initial_reading": 100.001,
        "final_reading": 100.003,
        "drift": 0.002,
        "absolute_drift": 0.002,
    },
    "compliance_decision": "pass",
    "rule_id": "STB-III-001",
    "rule_version": "2009",
    "description": "Stability test with small drift — should PASS",
}


# ============================================================================
# GOLDEN DATASET COLLECTION
# ============================================================================

GOLDEN_DATASET_PASS = [
    RPT_PASS_INPUT,
    ECC_PASS_INPUT,
    LIN_PASS_INPUT,
    DIS_PASS_INPUT,
    STB_PASS_INPUT,
]

GOLDEN_DATASET_FAIL = [
    RPT_FAIL_INPUT,
    ECC_FAIL_INPUT,
]

GOLDEN_DATASET_INVALID = [
    INCOMPLETE_INPUT,
]

GOLDEN_DATASET_RULE_NOT_CONFIGURED = [
    RULE_NOT_CONFIGURED_INPUT,
]

ALL_GOLDEN_INPUTS = (
    GOLDEN_DATASET_PASS
    + GOLDEN_DATASET_FAIL
    + GOLDEN_DATASET_INVALID
    + GOLDEN_DATASET_RULE_NOT_CONFIGURED
)

ALL_GOLDEN_EXPECTED = {
    "RPT_PASS": RPT_PASS_EXPECTED,
    "RPT_FAIL": RPT_FAIL_EXPECTED,
    "ECC_PASS": ECC_PASS_EXPECTED,
    "ECC_FAIL": ECC_FAIL_EXPECTED,
    "LIN_PASS": LIN_PASS_EXPECTED,
    "DIS_PASS": DIS_PASS_EXPECTED,
    "STB_PASS": STB_PASS_EXPECTED,
    "RULE_NOT_CONFIGURED": RULE_NOT_CONFIGURED_EXPECTED,
    "INCOMPLETE": INCOMPLETE_EXPECTED,
}


# ============================================================================
# HISTORICAL RULE VERSIONS
# ============================================================================

def create_rule_version_2009() -> RuleVersion:
    """Create OIML R-76 2009 rule version.
    NOTE: No expiry date so it remains available for historical resolution."""
    return RuleVersion(
        id="R76-2009",
        standard_code="OIML R-76",
        version_label="2009",
        effective_date=date(2009, 1, 1),
        expiry_date=None,  # No expiry — always available for historical reports
        status=RuleStatus.ACTIVE,
        source=RuleSource.VERIFIED,
        title="OIML R-76 Edition 2009",
    )


def create_rule_version_2024() -> RuleVersion:
    """Create OIML R-76 2024 rule version (stricter limits)."""
    return RuleVersion(
        id="R76-2024",
        standard_code="OIML R-76",
        version_label="2024",
        effective_date=date(2025, 1, 1),
        status=RuleStatus.ACTIVE,
        source=RuleSource.VERIFIED,
        title="OIML R-76 Edition 2024",
    )


def create_rules_2009() -> list[VersionedComplianceRule]:
    """Create compliance rules for 2009 version."""
    return [
        VersionedComplianceRule(
            id="RPT-III-001-2009",
            rule_version_id="R76-2009",
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            limit_key="max_std_dev",
            limit_value=0.5,  # 0.5d
            limit_unit="d",
            description="Max standard deviation for Class III repeatability",
        ),
        VersionedComplianceRule(
            id="ECC-III-001-2009",
            rule_version_id="R76-2009",
            test_code="ECC",
            instrument_class=InstrumentClass.III,
            limit_key="max_eccentricity",
            limit_value=1.0,  # 1.0d
            limit_unit="d",
            description="Max eccentricity deviation for Class III",
        ),
        VersionedComplianceRule(
            id="LIN-III-001-2009",
            rule_version_id="R76-2009",
            test_code="LIN",
            instrument_class=InstrumentClass.III,
            limit_key="max_linearity_error",
            limit_value=1.0,  # 1.0d
            limit_unit="d",
            description="Max linearity error for Class III",
        ),
        VersionedComplianceRule(
            id="DIS-III-001-2009",
            rule_version_id="R76-2009",
            test_code="DIS",
            instrument_class=InstrumentClass.III,
            limit_key="must_detect",
            limit_value=1.0,
            limit_unit="detected",
            description="Discrimination must be detected for Class III",
        ),
        VersionedComplianceRule(
            id="STB-III-001-2009",
            rule_version_id="R76-2009",
            test_code="STB",
            instrument_class=InstrumentClass.III,
            limit_key="max_drift",
            limit_value=0.5,  # 0.5d
            limit_unit="d",
            description="Max stability drift for Class III",
        ),
    ]


def create_rules_2024() -> list[VersionedComplianceRule]:
    """Create compliance rules for 2024 version (stricter)."""
    return [
        VersionedComplianceRule(
            id="RPT-III-001-2024",
            rule_version_id="R76-2024",
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            limit_key="max_std_dev",
            limit_value=0.4,  # Stricter: 0.4d (was 0.5d)
            limit_unit="d",
            description="Max standard deviation for Class III repeatability (2024)",
        ),
        VersionedComplianceRule(
            id="ECC-III-001-2024",
            rule_version_id="R76-2024",
            test_code="ECC",
            instrument_class=InstrumentClass.III,
            limit_key="max_eccentricity",
            limit_value=0.8,  # Stricter: 0.8d (was 1.0d)
            limit_unit="d",
            description="Max eccentricity deviation for Class III (2024)",
        ),
    ]


# ============================================================================
# REPORT SNAPSHOT (for reproducibility testing)
# ============================================================================

@dataclass
class GoldenReportSnapshot:
    """Complete report snapshot for reproducibility testing."""
    report_number: str
    test_input: TestInput
    rule_version_id: str
    expected_calculation: dict
    expected_compliance: str
    snapshot_timestamp: datetime = field(default_factory=datetime.utcnow)
    checksum: Optional[str] = None


GOLDEN_REPORTS = [
    GoldenReportSnapshot(
        report_number="RPT-2026-GOLDEN-001",
        test_input=RPT_PASS_INPUT,
        rule_version_id="R76-2009",
        expected_calculation=RPT_PASS_EXPECTED["calculated_values"],
        expected_compliance="pass",
    ),
    GoldenReportSnapshot(
        report_number="RPT-2026-GOLDEN-002",
        test_input=RPT_FAIL_INPUT,
        rule_version_id="R76-2009",
        expected_calculation=RPT_FAIL_EXPECTED["calculated_values"],
        expected_compliance="fail",
    ),
    GoldenReportSnapshot(
        report_number="RPT-2026-GOLDEN-003",
        test_input=ECC_PASS_INPUT,
        rule_version_id="R76-2009",
        expected_calculation=ECC_PASS_EXPECTED["calculated_values"],
        expected_compliance="pass",
    ),
    GoldenReportSnapshot(
        report_number="RPT-2026-GOLDEN-004",
        test_input=ECC_FAIL_INPUT,
        rule_version_id="R76-2009",
        expected_calculation=ECC_FAIL_EXPECTED["calculated_values"],
        expected_compliance="fail",
    ),
    GoldenReportSnapshot(
        report_number="RPT-2026-GOLDEN-005",
        test_input=LIN_PASS_INPUT,
        rule_version_id="R76-2009",
        expected_calculation=LIN_PASS_EXPECTED["calculated_values"],
        expected_compliance="pass",
    ),
    GoldenReportSnapshot(
        report_number="RPT-2026-GOLDEN-006",
        test_input=DIS_PASS_INPUT,
        rule_version_id="R76-2009",
        expected_calculation=DIS_PASS_EXPECTED["calculated_values"],
        expected_compliance="pass",
    ),
    GoldenReportSnapshot(
        report_number="RPT-2026-GOLDEN-007",
        test_input=STB_PASS_INPUT,
        rule_version_id="R76-2009",
        expected_calculation=STB_PASS_EXPECTED["calculated_values"],
        expected_compliance="pass",
    ),
]
