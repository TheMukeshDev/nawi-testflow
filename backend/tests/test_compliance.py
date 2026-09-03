"""
NAWI TestFlow — Compliance Evaluator Tests

Comprehensive tests for the deterministic compliance evaluation engine.

Tests cover:
- PASS/FAIL decisions for each test type
- RULE_NOT_CONFIGURED when rules are missing
- INCOMPLETE when data is insufficient
- NOT_APPLICABLE for non-required tests
- Explanation traceability
- Determinism (same inputs → same outputs)
- Edge cases (boundary values, zero values)
"""

import pytest
from datetime import datetime

from engine.compliance import ComplianceEvaluator, ComplianceReportFormatter
from engine.rules import RuleStore, create_default_rule_store
from engine.types import (
    TestInput,
    TestPointInput,
    RawObservation,
    MassUnit,
    InstrumentClass,
    TestStatusCode,
    CalculationResult,
    ValidationResult,
    ComplianceDecision,
    ApplicableLimit,
)


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def evaluator():
    """Default evaluator with OIML R-76 rules."""
    return ComplianceEvaluator()


@pytest.fixture
def empty_evaluator():
    """Evaluator with no rules configured."""
    return ComplianceEvaluator(rule_store=RuleStore())


@pytest.fixture
def class_iii_input():
    """Standard Class III test input."""
    return TestInput(
        test_code="WGT",
        instrument_class=InstrumentClass.III,
        max_capacity=150.0,
        max_capacity_unit=MassUnit.KG,
        scale_interval=0.05,
        scale_interval_unit=MassUnit.KG,
        test_points=[
            TestPointInput(
                point_label="100kg",
                reference_value=100.0,
                unit=MassUnit.KG,
                observations=[
                    RawObservation(value=100.01, unit=MassUnit.KG, observation_number=1),
                    RawObservation(value=100.02, unit=MassUnit.KG, observation_number=2),
                    RawObservation(value=100.00, unit=MassUnit.KG, observation_number=3),
                ],
            )
        ],
    )


@pytest.fixture
def pass_calc_result():
    """Calculation result that should PASS (Weighing test, |E_c| <= MPE)."""
    return CalculationResult(
        test_code="WGT",
        test_name="Weighing (Gross Load)",
        input_observations=[],
        calculated_values={
            "max_abs_ec": 0.02,  # within MPE at 100kg (2000e) = 1.0e = 0.05
            "limit_e": 1.0,
            "limit_units": 0.05,
        },
        applicable_limit=ApplicableLimit(
            limit_key="mpe",
            label="Maximum Permissible Error",
            value=1.0,
            unit="e",
            rule_id="MPE-III-002",
            rule_version="2006",
            description="MPE for Class III at 2000 divisions",
        ),
        unit="kg",
        status=TestStatusCode.PASS,
        rule_id="MPE-III-002",
        rule_version="2006",
    )


@pytest.fixture
def fail_calc_result():
    """Calculation result that should FAIL (|E_c| exceeds MPE)."""
    return CalculationResult(
        test_code="WGT",
        test_name="Weighing (Gross Load)",
        input_observations=[],
        calculated_values={
            "max_abs_ec": 0.20,  # exceeds MPE at 100kg (1.0e = 0.05)
            "limit_e": 1.0,
            "limit_units": 0.05,
        },
        applicable_limit=ApplicableLimit(
            limit_key="mpe",
            label="Maximum Permissible Error",
            value=1.0,
            unit="e",
            rule_id="MPE-III-002",
            rule_version="2006",
            description="MPE for Class III at 2000 divisions",
        ),
        unit="kg",
        status=TestStatusCode.FAIL,
        rule_id="MPE-III-002",
        rule_version="2006",
    )


@pytest.fixture
def rule_not_configured_calc_result():
    """Calculation result when rule is not configured."""
    return CalculationResult(
        test_code="RPT",
        test_name="Repeatability",
        input_observations=[],
        calculated_values={},
        applicable_limit=None,
        unit="kg",
        status=TestStatusCode.RULE_NOT_CONFIGURED,
        details="No compliance rule found for test RPT with instrument class III",
    )

# ============================================================================
# PASS/FAIL EVALUATION TESTS
# ============================================================================

class TestRepeatabilityCompliance:
    """Tests for repeatability compliance evaluation.

    Per OIML R-76 (R76-1 §5.5.4) there is NO authoritative numeric
    repeatability limit, so without a configured national/regulatory value
    the decision MUST be RULE_NOT_CONFIGURED (never an invented PASS/FAIL).
    """

    def test_repeatability_rule_not_configured(self, evaluator):
        """Repeatability without a configured national limit -> RULE_NOT_CONFIGURED."""
        test_input = TestInput(
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(
                    point_label="100kg",
                    reference_value=100.0,
                    unit=MassUnit.KG,
                    observations=[
                        RawObservation(value=100.01, unit=MassUnit.KG, observation_number=1),
                        RawObservation(value=100.02, unit=MassUnit.KG, observation_number=2),
                    ],
                )
            ],
        )
        calc_result = CalculationResult(
            test_code="RPT",
            test_name="Repeatability",
            input_observations=[],
            calculated_values={"std_deviation": 0.001},
            applicable_limit=None,
            unit="kg",
            status=TestStatusCode.PASS,
        )
        decisions = evaluator.evaluate(test_input, calc_result)
        assert decisions[0].decision == TestStatusCode.RULE_NOT_CONFIGURED

    def test_repeatability_configured_national_limit(self, evaluator):
        """Repeatability with a configured national limit -> PASS/FAIL works."""
        from engine.rules import RuleStore, ComplianceRule
        store = RuleStore()
        for mpe in evaluator.rule_store.get_rules_by_type("mpe"):
            store.add_rule(mpe)
        store.add_rule(ComplianceRule(
            id="RPT-NATL-001",
            version="2006",
            standard="National",
            standard_version="Custom",
            rule_type="repeatability",
            instrument_class=InstrumentClass.III,
            parameters={"max_std_dev": 0.5, "unit": "d", "description": "National limit"},
        ))
        from engine.compliance import ComplianceEvaluator
        ev = ComplianceEvaluator(rule_store=store)

        test_input = TestInput(
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(
                    point_label="100kg",
                    reference_value=100.0,
                    unit=MassUnit.KG,
                    observations=[RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1)],
                )
            ],
        )
        calc_result = CalculationResult(
            test_code="RPT",
            test_name="Repeatability",
            input_observations=[],
            calculated_values={"std_deviation": 0.001},
            applicable_limit=None,
            unit="kg",
            status=TestStatusCode.PASS,
        )
        decisions = ev.evaluate(test_input, calc_result)
        # Limit now resolves -> std dev in d = 0.001/0.05 = 0.02 <= 0.5 -> PASS
        assert decisions[0].decision == TestStatusCode.PASS


class TestWeighingCompliance:
    """Tests for gross-load weighing compliance evaluation (OIML R 76-2)."""

    def test_pass(self, evaluator, class_iii_input, pass_calc_result):
        """|E_c| within MPE -> PASS."""
        decisions = evaluator.evaluate(class_iii_input, pass_calc_result)
        assert len(decisions) == 1
        d = decisions[0]
        assert d.decision == TestStatusCode.PASS
        assert d.test_code == "WGT"
        assert d.test_name == "Weighing (Gross Load)"
        assert d.standard == "OIML R-76"
        assert "within" in d.reason.lower()

    def test_fail(self, evaluator, class_iii_input, fail_calc_result):
        """|E_c| exceeds MPE -> FAIL."""
        decisions = evaluator.evaluate(class_iii_input, fail_calc_result)
        assert len(decisions) == 1
        d = decisions[0]
        assert d.decision == TestStatusCode.FAIL
        assert d.test_code == "WGT"
        assert "exceeds" in d.reason.lower()

    def test_boundary_pass(self, evaluator, class_iii_input):
        """Exactly at the MPE -> PASS (<=)."""
        # MPE at 100kg with e=0.05 -> n=2000 -> 1.0e = 0.05 kg
        calc_result = CalculationResult(
            test_code="WGT",
            test_name="Weighing (Gross Load)",
            input_observations=[],
            calculated_values={
                "max_abs_ec": 0.05,
                "limit_e": 1.0,
                "limit_units": 0.05,
            },
            applicable_limit=ApplicableLimit(
                limit_key="mpe",
                label="MPE",
                value=1.0,
                unit="e",
                rule_id="MPE-III-002",
                rule_version="2006",
                description="Test",
            ),
            unit="kg",
            status=TestStatusCode.PASS,
            rule_id="MPE-III-002",
            rule_version="2006",
        )
        decisions = evaluator.evaluate(class_iii_input, calc_result)
        assert decisions[0].decision == TestStatusCode.PASS

    def test_explanations_present(self, evaluator, class_iii_input, pass_calc_result):
        """PASS decision includes structured explanation."""
        decisions = evaluator.evaluate(class_iii_input, pass_calc_result)
        d = decisions[0]
        assert len(d.explanations) == 1
        expl = d.explanations[0]
        assert "Corrected Error" in expl.parameter_name
        assert expl.allowed_value == 0.05
        assert expl.is_within_limit is True
        assert expl.comparison_operator == "<="
        assert expl.margin > 0


class TestEccentricityCompliance:
    """Tests for eccentricity compliance evaluation."""
    
    def test_pass(self, evaluator):
        """Eccentricity within limit → PASS."""
        test_input = TestInput(
            test_code="ECC",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(point_label="center", reference_value=100.0, unit=MassUnit.KG,
                    observations=[RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1)]),
                TestPointInput(point_label="front", reference_value=100.0, unit=MassUnit.KG,
                    observations=[RawObservation(value=100.01, unit=MassUnit.KG, observation_number=1)]),
            ],
        )
        
        calc_result = CalculationResult(
            test_code="ECC",
            test_name="Eccentricity",
            input_observations=[],
            calculated_values={"max_absolute_deviation": 0.01, "center_reading": 100.0},
            applicable_limit=ApplicableLimit(
                limit_key="eccentricity", label="Max Eccentricity",
                value=1.0, unit="d", rule_id="ECC-III-001", rule_version="2009", description="Test",
            ),
            unit="kg", status=TestStatusCode.PASS,
            rule_id="ECC-III-001", rule_version="2009",
        )
        
        decisions = evaluator.evaluate(test_input, calc_result)
        assert decisions[0].decision == TestStatusCode.PASS
    
    def test_fail(self, evaluator):
        """Eccentricity exceeds limit → FAIL."""
        test_input = TestInput(
            test_code="ECC",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(point_label="center", reference_value=100.0, unit=MassUnit.KG,
                    observations=[RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1)]),
                TestPointInput(point_label="front", reference_value=100.0, unit=MassUnit.KG,
                    observations=[RawObservation(value=100.1, unit=MassUnit.KG, observation_number=1)]),
            ],
        )
        
        calc_result = CalculationResult(
            test_code="ECC",
            test_name="Eccentricity",
            input_observations=[],
            calculated_values={"max_absolute_deviation": 0.1, "center_reading": 100.0},
            applicable_limit=ApplicableLimit(
                limit_key="eccentricity", label="Max Eccentricity",
                value=1.0, unit="d", rule_id="ECC-III-001", rule_version="2009", description="Test",
            ),
            unit="kg", status=TestStatusCode.FAIL,
            rule_id="ECC-III-001", rule_version="2009",
        )
        
        decisions = evaluator.evaluate(test_input, calc_result)
        assert decisions[0].decision == TestStatusCode.FAIL


class TestLinearityCompliance:
    """Tests for linearity compliance evaluation.

    OIML R-76 provides no standalone numeric linearity limit, so without a
    configured national value the decision is RULE_NOT_CONFIGURED.
    """

    def test_not_configured(self, evaluator):
        """Linearity without a configured limit -> RULE_NOT_CONFIGURED."""
        test_input = TestInput(
            test_code="LIN",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(point_label="50kg", reference_value=50.0, unit=MassUnit.KG,
                    observations=[RawObservation(value=50.0, unit=MassUnit.KG, observation_number=1)]),
            ],
        )

        calc_result = CalculationResult(
            test_code="LIN",
            test_name="Linearity",
            input_observations=[],
            calculated_values={"max_linearity_error": 0.01},
            applicable_limit=None,
            unit="kg", status=TestStatusCode.PASS,
        )

        decisions = evaluator.evaluate(test_input, calc_result)
        assert decisions[0].decision == TestStatusCode.RULE_NOT_CONFIGURED


class TestDiscriminationCompliance:
    """Tests for discrimination compliance evaluation."""
    
    def test_detected_pass(self, evaluator):
        """Discrimination detected → PASS."""
        test_input = TestInput(
            test_code="DIS",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(point_label="before", reference_value=100.0, unit=MassUnit.KG,
                    observations=[RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1)]),
                TestPointInput(point_label="after", reference_value=100.0, unit=MassUnit.KG,
                    observations=[RawObservation(value=100.05, unit=MassUnit.KG, observation_number=1)]),
            ],
            additional_inputs={"discrimination_weight": 0.05},
        )
        
        calc_result = CalculationResult(
            test_code="DIS",
            test_name="Discrimination",
            input_observations=[],
            calculated_values={"is_detected": 1.0, "measured_discrimination": 0.05},
            applicable_limit=ApplicableLimit(
                limit_key="discrimination", label="Min Discrimination",
                value=1.0, unit="mg", rule_id="DIS-III-001", rule_version="2009", description="Test",
            ),
            unit="kg", status=TestStatusCode.PASS,
            rule_id="DIS-III-001", rule_version="2009",
        )
        
        decisions = evaluator.evaluate(test_input, calc_result)
        assert decisions[0].decision == TestStatusCode.PASS
        assert "detected" in decisions[0].reason.lower()
    
    def test_not_detected_fail(self, evaluator):
        """Discrimination not detected → FAIL."""
        test_input = TestInput(
            test_code="DIS",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(point_label="before", reference_value=100.0, unit=MassUnit.KG,
                    observations=[RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1)]),
                TestPointInput(point_label="after", reference_value=100.0, unit=MassUnit.KG,
                    observations=[RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1)]),
            ],
            additional_inputs={"discrimination_weight": 0.05},
        )
        
        calc_result = CalculationResult(
            test_code="DIS",
            test_name="Discrimination",
            input_observations=[],
            calculated_values={"is_detected": 0.0, "measured_discrimination": 0.0},
            applicable_limit=ApplicableLimit(
                limit_key="discrimination", label="Min Discrimination",
                value=1.0, unit="mg", rule_id="DIS-III-001", rule_version="2009", description="Test",
            ),
            unit="kg", status=TestStatusCode.FAIL,
            rule_id="DIS-III-001", rule_version="2009",
        )
        
        decisions = evaluator.evaluate(test_input, calc_result)
        assert decisions[0].decision == TestStatusCode.FAIL
        assert "not detected" in decisions[0].reason.lower()


class TestStabilityCompliance:
    """Tests for stability compliance evaluation.

    OIML R-76 provides no standalone numeric stability limit, so without a
    configured national value the decision is RULE_NOT_CONFIGURED.
    """

    def test_not_configured(self, evaluator):
        """Stability without a configured limit -> RULE_NOT_CONFIGURED."""
        test_input = TestInput(
            test_code="STB",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(point_label="initial", reference_value=100.0, unit=MassUnit.KG,
                    observations=[RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1)]),
                TestPointInput(point_label="final", reference_value=100.0, unit=MassUnit.KG,
                    observations=[RawObservation(value=100.01, unit=MassUnit.KG, observation_number=1)]),
            ],
        )

        calc_result = CalculationResult(
            test_code="STB",
            test_name="Stability",
            input_observations=[],
            calculated_values={"absolute_drift": 0.01, "drift": 0.01},
            applicable_limit=None,
            unit="kg", status=TestStatusCode.PASS,
        )

        decisions = evaluator.evaluate(test_input, calc_result)
        assert decisions[0].decision == TestStatusCode.RULE_NOT_CONFIGURED


# ============================================================================
# RULE_NOT_CONFIGURED TESTS
# ============================================================================

class TestRuleNotConfigured:
    """Tests for RULE_NOT_CONFIGURED decisions."""
    
    def test_rule_not_configured(self, evaluator, class_iii_input, rule_not_configured_calc_result):
        """Missing rule → RULE_NOT_CONFIGURED, never PASS or FAIL."""
        decisions = evaluator.evaluate(class_iii_input, rule_not_configured_calc_result)
        
        assert len(decisions) == 1
        d = decisions[0]
        
        assert d.decision == TestStatusCode.RULE_NOT_CONFIGURED
        assert d.calculated_value is None
        assert d.applicable_limit is None
        assert "cannot be made" in d.reason.lower() or "not configured" in d.reason.lower()
    
    def test_empty_evaluator(self, empty_evaluator, class_iii_input, pass_calc_result):
        """Empty rule store → RULE_NOT_CONFIGURED."""
        decisions = empty_evaluator.evaluate(class_iii_input, pass_calc_result)
        
        assert len(decisions) == 1
        assert decisions[0].decision == TestStatusCode.RULE_NOT_CONFIGURED
    
    def test_never_pass_or_fail_without_rule(self, empty_evaluator, class_iii_input):
        """Critical invariant: never PASS/FAIL when rule is missing."""
        calc_result = CalculationResult(
            test_code="RPT",
            test_name="Repeatability",
            input_observations=[],
            calculated_values={"std_deviation": 0.01},  # Very good value
            applicable_limit=None,
            unit="kg",
            status=TestStatusCode.RULE_NOT_CONFIGURED,
        )
        
        decisions = empty_evaluator.evaluate(class_iii_input, calc_result)
        
        # Must NOT be PASS or FAIL
        assert decisions[0].decision not in [TestStatusCode.PASS, TestStatusCode.FAIL]


# ============================================================================
# INCOMPLETE TESTS
# ============================================================================

class TestIncomplete:
    """Tests for INCOMPLETE decisions."""
    
    def test_no_calculation_result(self, evaluator, class_iii_input):
        """No calculation result → INCOMPLETE."""
        decisions = evaluator.evaluate(class_iii_input, None)
        
        assert len(decisions) == 1
        assert decisions[0].decision == TestStatusCode.INCOMPLETE
        assert "no calculation" in decisions[0].reason.lower()
    
    def test_invalid_input(self, evaluator, class_iii_input):
        """Invalid input → INCOMPLETE."""
        validation = ValidationResult(is_valid=True)
        validation.add_error("max_capacity", "Must be positive", "INVALID_MAX_CAPACITY")
        
        calc_result = CalculationResult(
            test_code="RPT",
            test_name="Repeatability",
            input_observations=[],
            calculated_values={},
            applicable_limit=None,
            unit="kg",
            status=TestStatusCode.INVALID_INPUT,
        )
        
        decisions = evaluator.evaluate(class_iii_input, calc_result, validation)
        
        assert len(decisions) == 1
        assert decisions[0].decision == TestStatusCode.INCOMPLETE
    
    def test_calculation_error(self, evaluator, class_iii_input):
        """Calculation error → INCOMPLETE."""
        calc_result = CalculationResult(
            test_code="RPT",
            test_name="Repeatability",
            input_observations=[],
            calculated_values={},
            applicable_limit=None,
            unit="kg",
            status=TestStatusCode.CALCULATION_ERROR,
            details="No test points provided",
        )
        
        decisions = evaluator.evaluate(class_iii_input, calc_result)
        
        assert len(decisions) == 1
        assert decisions[0].decision == TestStatusCode.INCOMPLETE


# ============================================================================
# EXPLANATION TRACEABILITY TESTS
# ============================================================================

class TestExplanationTraceability:
    """Tests that every decision includes traceable explanations."""
    
    def test_pass_explanation_values(self, evaluator, class_iii_input, pass_calc_result):
        """PASS decision explains observed vs allowed values."""
        decisions = evaluator.evaluate(class_iii_input, pass_calc_result)
        d = decisions[0]
        
        assert len(d.explanations) > 0
        expl = d.explanations[0]
        
        # Must have all required fields
        assert expl.parameter_name
        assert expl.observed_value is not None
        assert expl.observed_unit
        assert expl.allowed_value is not None
        assert expl.allowed_unit
        assert expl.comparison_operator
        assert expl.is_within_limit is not None
    
    def test_fail_explanation_shows_excess(self, evaluator, class_iii_input, fail_calc_result):
        """FAIL decision explains the excess."""
        decisions = evaluator.evaluate(class_iii_input, fail_calc_result)
        d = decisions[0]
        
        expl = d.explanations[0]
        assert expl.is_within_limit is False
        assert expl.difference > 0  # observed exceeds allowed
        assert expl.margin < 0  # negative margin = exceeded
    
    def test_serialization(self, evaluator, class_iii_input, pass_calc_result):
        """Decision serializes to dict with all fields."""
        decisions = evaluator.evaluate(class_iii_input, pass_calc_result)
        d = decisions[0]
        
        serialized = d.to_dict()
        
        assert isinstance(serialized, dict)
        assert serialized["standard"] == "OIML R-76"
        assert serialized["standard_version"] == "2006"
        assert serialized["rule_id"] == "MPE-III-002"
        assert serialized["rule_version"] == "2006"
        assert serialized["test_code"] == "WGT"
        assert serialized["decision"] == "pass"
        assert "reason" in serialized
        assert "explanations" in serialized
        assert "evaluated_at" in serialized


# ============================================================================
# DETERMINISM TESTS
# ============================================================================

class TestDeterminism:
    """Verify that compliance decisions are deterministic."""
    
    def test_same_input_same_decision(self, evaluator, class_iii_input, pass_calc_result):
        """Same inputs always produce the same decision."""
        d1 = evaluator.evaluate(class_iii_input, pass_calc_result)
        d2 = evaluator.evaluate(class_iii_input, pass_calc_result)
        
        assert d1[0].decision == d2[0].decision
        assert d1[0].calculated_value == d2[0].calculated_value
        assert d1[0].applicable_limit == d2[0].applicable_limit
        assert d1[0].reason == d2[0].reason
    
    def test_rule_versions_in_decision(self, evaluator, class_iii_input, pass_calc_result):
        """Decision includes rule version for traceability."""
        decisions = evaluator.evaluate(class_iii_input, pass_calc_result)
        d = decisions[0]
        
        assert d.standard_version == "2006"
        assert d.rule_version == "2006"
        assert "2006" in d.reason


# ============================================================================
# MULTI-TEST EVALUATION TESTS
# ============================================================================

class TestEvaluateAll:
    """Tests for evaluating multiple tests."""
    
    def test_evaluate_all(self, evaluator):
        """Evaluate multiple tests at once."""
        test_inputs = [
            TestInput(
                test_code="WGT",
                instrument_class=InstrumentClass.III,
                max_capacity=150.0,
                max_capacity_unit=MassUnit.KG,
                scale_interval=0.05,
                scale_interval_unit=MassUnit.KG,
                test_points=[TestPointInput(point_label="100kg", reference_value=100.0, unit=MassUnit.KG,
                    observations=[RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1)])],
            ),
            TestInput(
                test_code="ECC",
                instrument_class=InstrumentClass.III,
                max_capacity=150.0,
                max_capacity_unit=MassUnit.KG,
                scale_interval=0.05,
                scale_interval_unit=MassUnit.KG,
                test_points=[
                    TestPointInput(point_label="center", reference_value=100.0, unit=MassUnit.KG,
                        observations=[RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1)]),
                    TestPointInput(point_label="front", reference_value=100.0, unit=MassUnit.KG,
                        observations=[RawObservation(value=100.01, unit=MassUnit.KG, observation_number=1)]),
                ],
            ),
        ]
        
        calc_results = {
            "WGT": CalculationResult(
                test_code="WGT", test_name="Weighing (Gross Load)",
                input_observations=[], calculated_values={"max_abs_ec": 0.01, "limit_e": 1.0, "limit_units": 0.05},
                applicable_limit=ApplicableLimit(limit_key="mpe", label="MPE",
                    value=1.0, unit="e", rule_id="MPE-III-002", rule_version="2006", description="Test"),
                unit="kg", status=TestStatusCode.PASS,
                rule_id="MPE-III-002", rule_version="2006",
            ),
            "ECC": CalculationResult(
                test_code="ECC", test_name="Eccentricity",
                input_observations=[], calculated_values={"max_absolute_deviation": 0.01, "center_reading": 100.0},
                applicable_limit=ApplicableLimit(limit_key="eccentricity", label="Max Eccentricity",
                    value=1.0, unit="d", rule_id="ECC-III-001", rule_version="2009", description="Test"),
                unit="kg", status=TestStatusCode.PASS,
                rule_id="ECC-III-001", rule_version="2009",
            ),
        }
        
        decisions = evaluator.evaluate_all(test_inputs, calc_results)
        
        assert len(decisions) == 2
        assert all(d.decision == TestStatusCode.PASS for d in decisions)


# ============================================================================
# REPORT FORMAT TESTS
# ============================================================================

class TestReportFormatter:
    """Tests for human-readable report formatting."""
    
    def test_format_decision(self, evaluator, class_iii_input, pass_calc_result):
        """Format a single decision as text."""
        decisions = evaluator.evaluate(class_iii_input, pass_calc_result)
        text = ComplianceReportFormatter.format_decision(decisions[0])
        
        assert "PASS" in text
        assert "OIML R-76" in text
        assert "Weighing" in text
        assert "DISCLAIMER" in text
    
    def test_format_all_decisions(self, evaluator, class_iii_input, pass_calc_result):
        """Format multiple decisions."""
        decisions = evaluator.evaluate(class_iii_input, pass_calc_result)
        text = ComplianceReportFormatter.format_all_decisions(decisions)
        
        assert "COMPLIANCE EVALUATION REPORT" in text
        assert "DISCLAIMER" in text


# ============================================================================
# CRITICAL INVARIANT TESTS
# ============================================================================

class TestCriticalInvariants:
    """Tests for critical compliance engine invariants."""
    
    def test_never_pass_without_rule(self, empty_evaluator, class_iii_input):
        """INVARIANT: Never return PASS when rule is missing."""
        calc_result = CalculationResult(
            test_code="RPT", test_name="Repeatability",
            input_observations=[], calculated_values={"std_deviation": 0.001},
            applicable_limit=None, unit="kg",
            status=TestStatusCode.RULE_NOT_CONFIGURED,
        )
        
        decisions = empty_evaluator.evaluate(class_iii_input, calc_result)
        assert decisions[0].decision != TestStatusCode.PASS
    
    def test_never_fail_without_rule(self, empty_evaluator, class_iii_input):
        """INVARIANT: Never return FAIL when rule is missing."""
        calc_result = CalculationResult(
            test_code="RPT", test_name="Repeatability",
            input_observations=[], calculated_values={"std_deviation": 100.0},
            applicable_limit=None, unit="kg",
            status=TestStatusCode.RULE_NOT_CONFIGURED,
        )
        
        decisions = empty_evaluator.evaluate(class_iii_input, calc_result)
        assert decisions[0].decision != TestStatusCode.FAIL
    
    def test_incomplete_when_no_data(self, evaluator, class_iii_input):
        """INVARIANT: Return INCOMPLETE when data is insufficient."""
        decisions = evaluator.evaluate(class_iii_input, None)
        assert decisions[0].decision == TestStatusCode.INCOMPLETE
    
    def test_all_decisions_have_reason(self, evaluator, class_iii_input, pass_calc_result):
        """INVARIANT: Every decision must have a human-readable reason."""
        decisions = evaluator.evaluate(class_iii_input, pass_calc_result)
        assert decisions[0].reason
        assert len(decisions[0].reason) > 10  # Not just a stub
    
    def test_all_decisions_have_standard_info(self, evaluator, class_iii_input, pass_calc_result):
        """INVARIANT: Every decision must identify the standard."""
        decisions = evaluator.evaluate(class_iii_input, pass_calc_result)
        d = decisions[0]
        assert d.standard
        assert d.standard_version
        assert d.rule_id
        assert d.rule_version
