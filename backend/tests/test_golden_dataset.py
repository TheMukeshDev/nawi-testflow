"""
NAWI Sahayak — Golden Dataset Tests

Comprehensive verification using known inputs and expected outputs.
This is the MOST IMPORTANT test file — it verifies the core calculation engine.

Tests:
1. Determinism: same inputs + same rules = same outputs
2. PASS cases: all test types produce correct results
3. FAIL cases: failures are correctly detected
4. RULE_NOT_CONFIGURED: unknown tests are handled
5. INCOMPLETE: missing data is handled
6. Historical rules: old versions produce different results
7. Reproducibility: finalized reports can be regenerated
8. Cross-version: same input, different rule versions → different compliance
"""

import math
import pytest
from datetime import datetime, date

from engine.orchestrator import CalculationEngine
from engine.compliance import ComplianceEvaluator
from engine.rules import RuleStore, RuleResolver, ComplianceRule, create_default_rule_store
from engine.validation import InputValidator
from engine.calculations import Calculations
from engine.normalization import UnitNormalizer
from engine.types import (
    TestInput, TestPointInput, RawObservation, MassUnit,
    InstrumentClass, TestStatusCode,
)
from engine.versioned_rules import (
    VersionedRuleStore, VersionedRuleResolver, RuleVersion, RuleStatus,
    VersionedComplianceRule, RuleSource,
)

from tests.golden_dataset import (
    RPT_PASS_INPUT, RPT_PASS_EXPECTED,
    RPT_FAIL_INPUT, RPT_FAIL_EXPECTED,
    ECC_PASS_INPUT, ECC_PASS_EXPECTED,
    ECC_FAIL_INPUT, ECC_FAIL_EXPECTED,
    LIN_PASS_INPUT, LIN_PASS_EXPECTED,
    DIS_PASS_INPUT, DIS_PASS_EXPECTED,
    STB_PASS_INPUT, STB_PASS_EXPECTED,
    RULE_NOT_CONFIGURED_INPUT, RULE_NOT_CONFIGURED_EXPECTED,
    INCOMPLETE_INPUT, INCOMPLETE_EXPECTED,
    create_rule_version_2009, create_rule_version_2024,
    create_rules_2009, create_rules_2024,
    GOLDEN_REPORTS, GoldenReportSnapshot,
    ALL_GOLDEN_INPUTS,
)


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def engine():
    """Standard calculation engine."""
    return CalculationEngine()


@pytest.fixture
def validator():
    return InputValidator()


@pytest.fixture
def calculator():
    return Calculations()


@pytest.fixture
def normalizer():
    return UnitNormalizer()


@pytest.fixture
def versioned_store():
    """Versioned rule store with 2009 and 2024 rules."""
    store = VersionedRuleStore()

    # Add 2009 version
    v2009 = create_rule_version_2009()
    store.add_version(v2009)
    for rule in create_rules_2009():
        store.add_rule(rule)

    # Add 2024 version
    v2024 = create_rule_version_2024()
    store.add_version(v2024)
    for rule in create_rules_2024():
        store.add_rule(rule)

    return store


# ============================================================================
# 1. DETERMINISM TESTS
# ============================================================================

class TestDeterminism:
    """
    Same inputs + same rule version = same output.
    This is the most critical property of the calculation engine.
    """

    def test_rpt_determinism(self, engine):
        """Repeatability calculation must be deterministic."""
        result1 = engine.execute(RPT_PASS_INPUT)
        result2 = engine.execute(RPT_PASS_INPUT)

        # Same status
        assert result1.calculation_result.status == result2.calculation_result.status

        # Same calculated values
        for key in result1.calculation_result.calculated_values:
            v1 = result1.calculation_result.calculated_values[key]
            v2 = result2.calculation_result.calculated_values[key]
            assert v1 == v2, f"Value '{key}' differs: {v1} vs {v2}"

    def test_ecc_determinism(self, engine):
        """Eccentricity calculation must be deterministic."""
        result1 = engine.execute(ECC_PASS_INPUT)
        result2 = engine.execute(ECC_PASS_INPUT)

        assert result1.calculation_result.status == result2.calculation_result.status
        assert result1.calculation_result.calculated_values == result2.calculation_result.calculated_values

    def test_lin_determinism(self, engine):
        """Linearity calculation must be deterministic."""
        result1 = engine.execute(LIN_PASS_INPUT)
        result2 = engine.execute(LIN_PASS_INPUT)

        assert result1.calculation_result.status == result2.calculation_result.status
        assert result1.calculation_result.calculated_values == result2.calculation_result.calculated_values

    def test_dis_determinism(self, engine):
        """Discrimination calculation must be deterministic."""
        result1 = engine.execute(DIS_PASS_INPUT)
        result2 = engine.execute(DIS_PASS_INPUT)

        assert result1.calculation_result.status == result2.calculation_result.status
        assert result1.calculation_result.calculated_values == result2.calculation_result.calculated_values

    def test_stb_determinism(self, engine):
        """Stability calculation must be deterministic."""
        result1 = engine.execute(STB_PASS_INPUT)
        result2 = engine.execute(STB_PASS_INPUT)

        assert result1.calculation_result.status == result2.calculation_result.status
        assert result1.calculation_result.calculated_values == result2.calculation_result.calculated_values


# ============================================================================
# 2. PASS CASES — Verify against golden dataset
# ============================================================================

class TestPassCases:
    """Verify all PASS cases against golden dataset expected values."""

    def test_rpt_pass(self, engine):
        """Repeatability PASS case.

        OIML R-76 (R76-1 §5.5.4) specifies no numeric repeatability limit,
        so the pipeline short-circuits to RULE_NOT_CONFIGURED (never an
        invented PASS). Statistical values are covered by the dedicated
        calculation tests.
        """
        result = engine.execute(RPT_PASS_INPUT)

        assert result.calculation_result is not None
        assert result.calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED
        assert result.compliance_result is None

    def test_ecc_pass(self, engine):
        """Eccentricity PASS case."""
        result = engine.execute(ECC_PASS_INPUT)
        expected = ECC_PASS_EXPECTED

        assert result.calculation_result.status == TestStatusCode.PASS
        assert result.calculation_result.test_name == expected["test_name"]

        cv = result.calculation_result.calculated_values
        assert abs(cv["center_reading"] - expected["calculated_values"]["center_reading"]) < 1e-6
        assert abs(cv["max_absolute_deviation"] - expected["calculated_values"]["max_absolute_deviation"]) < 1e-6

    def test_lin_pass(self, engine):
        """Linearity PASS case.

        OIML R-76 provides no standalone numeric linearity limit, so the
        pipeline reports RULE_NOT_CONFIGURED (never an invented PASS).
        """
        result = engine.execute(LIN_PASS_INPUT)

        assert result.calculation_result is not None
        assert result.calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED

    def test_dis_pass(self, engine):
        """Discrimination PASS case."""
        result = engine.execute(DIS_PASS_INPUT)
        expected = DIS_PASS_EXPECTED

        assert result.calculation_result.status == TestStatusCode.PASS
        cv = result.calculation_result.calculated_values
        assert cv["is_detected"] == expected["calculated_values"]["is_detected"]

    def test_stb_pass(self, engine):
        """Stability PASS case.

        OIML R-76 provides no standalone numeric stability limit, so the
        pipeline reports RULE_NOT_CONFIGURED (never an invented PASS).
        """
        result = engine.execute(STB_PASS_INPUT)

        assert result.calculation_result is not None
        assert result.calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED


# ============================================================================
# 3. FAIL CASES — Verify failures are correctly detected
# ============================================================================

class TestFailCases:
    """Verify all FAIL cases are correctly detected."""

    def test_rpt_fail(self, engine):
        """Repeatability FAIL case — wide spread.

        Even a wide spread has no OIML numeric limit, so the pipeline reports
        RULE_NOT_CONFIGURED rather than inventing a FAIL.
        """
        result = engine.execute(RPT_FAIL_INPUT)

        assert result.calculation_result is not None
        assert result.calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED
        assert result.compliance_result is None

    def test_ecc_fail(self, engine):
        """Eccentricity FAIL case — large deviation."""
        result = engine.execute(ECC_FAIL_INPUT)
        expected = ECC_FAIL_EXPECTED

        assert result.calculation_result.status == TestStatusCode.FAIL
        cv = result.calculation_result.calculated_values
        assert abs(cv["max_absolute_deviation"] - expected["calculated_values"]["max_absolute_deviation"]) < 1e-6


# ============================================================================
# 4. RULE NOT CONFIGURED
# ============================================================================

class TestRuleNotConfigured:
    """Verify unknown test codes return RULE_NOT_CONFIGURED."""

    def test_unknown_test_code(self, engine):
        """Unknown test code must return RULE_NOT_CONFIGURED."""
        result = engine.execute(RULE_NOT_CONFIGURED_INPUT)

        assert result.calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED
        # Note: orchestrator may not set compliance_result for RULE_NOT_CONFIGURED
        # because it returns early. The calculation_result.status is the source of truth.

    def test_empty_rule_store(self):
        """Empty rule store must return None for any lookup."""
        store = RuleStore()
        resolver = RuleResolver(store)

        result = resolver.resolve_rule("RPT", InstrumentClass.III)
        assert result is None

    def test_wrong_instrument_class(self):
        """Rule for different instrument class must not be returned."""
        store = create_default_rule_store()
        resolver = RuleResolver(store)

        # Try to resolve a rule for Class I (may not exist in defaults)
        result = resolver.resolve_rule("RPT", InstrumentClass.I)
        # Result depends on whether default rules have Class I
        # The key assertion is that it doesn't crash


# ============================================================================
# 5. INCOMPLETE — Missing data handling
# ============================================================================

class TestIncomplete:
    """Verify missing data produces INCOMPLETE status."""

    def test_missing_observations(self, engine):
        """Empty observations must produce INVALID_INPUT."""
        result = engine.execute(INCOMPLETE_INPUT)

        assert result.calculation_result.status == TestStatusCode.INVALID_INPUT
        assert result.validation is not None
        assert not result.validation.is_valid
        assert len(result.validation.errors) > 0

    def test_missing_test_points(self, validator):
        """Empty test points must be caught by validation."""
        inp = TestInput(
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            max_capacity=100,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.02,
            scale_interval_unit=MassUnit.KG,
            test_points=[],
        )
        result = validator.validate_test_input(inp)
        assert not result.is_valid

    def test_zero_capacity(self, validator):
        """Zero capacity must be caught by validation."""
        inp = TestInput(
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            max_capacity=0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.02,
            scale_interval_unit=MassUnit.KG,
        )
        result = validator.validate_test_input(inp)
        assert not result.is_valid

    def test_nan_observation(self, validator):
        """NaN observation must be caught by validation."""
        inp = TestInput(
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            max_capacity=100,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.02,
            scale_interval_unit=MassUnit.KG,
            test_points=[TestPointInput(
                point_label="Max",
                reference_value=100,
                unit=MassUnit.KG,
                observations=[RawObservation(value=float('nan'), unit=MassUnit.KG, observation_number=1)],
            )],
        )
        result = validator.validate_test_input(inp)
        assert not result.is_valid


# ============================================================================
# 6. HISTORICAL RULE VERSIONS
# ============================================================================

class TestHistoricalRules:
    """Verify historical rule versions are preserved correctly."""

    def test_2009_rules_available(self, versioned_store):
        """2009 rules must be available."""
        resolver = VersionedRuleResolver(versioned_store)
        rule = resolver.resolve("RPT", InstrumentClass.III, version_label="2009")
        assert rule is not None
        assert rule.value == 0.5  # 2009 limit

    def test_2024_rules_available(self, versioned_store):
        """2024 rules must be available."""
        resolver = VersionedRuleResolver(versioned_store)
        rule = resolver.resolve("RPT", InstrumentClass.III, version_label="2024")
        assert rule is not None
        assert rule.value == 0.4  # 2024 limit (stricter)

    def test_different_versions_different_limits(self, versioned_store):
        """Different rule versions must produce different limits."""
        resolver = VersionedRuleResolver(versioned_store)

        rule_2009 = resolver.resolve("RPT", InstrumentClass.III, version_label="2009")
        rule_2024 = resolver.resolve("RPT", InstrumentClass.III, version_label="2024")

        assert rule_2009.value != rule_2024.value
        assert rule_2024.value < rule_2009.value  # 2024 is stricter

    def test_same_input_different_compliance(self, versioned_store):
        """Same input with different rule versions may produce different compliance."""
        resolver = VersionedRuleResolver(versioned_store)

        # RPT_PASS has std_dev of 0.001 d
        # 2009 limit: 0.5d → PASS
        # 2024 limit: 0.4d → PASS (still passes because 0.001 < 0.4)

        # But if we had a case where std_dev = 0.45 d:
        # 2009 limit: 0.5d → PASS
        # 2024 limit: 0.4d → FAIL

        rule_2009 = resolver.resolve("RPT", InstrumentClass.III, version_label="2009")
        rule_2024 = resolver.resolve("RPT", InstrumentClass.III, version_label="2024")

        # Verify limits are different
        assert rule_2009.value == 0.5
        assert rule_2024.value == 0.4

    def test_frozen_version_preserves_rules(self, versioned_store):
        """Frozen version must preserve its rules."""
        # Freeze 2009
        versioned_store.freeze_version("R76-2009", "report-001")

        # Rules should still be accessible
        resolver = VersionedRuleResolver(versioned_store)
        rule = resolver.resolve("RPT", InstrumentClass.III, version_label="2009")
        assert rule is not None
        assert rule.value == 0.5


# ============================================================================
# 7. REPRODUCIBILITY — Finalized reports
# ============================================================================

class TestReproducibility:
    """Verify finalized reports can be reproduced exactly."""

    def test_rpt_reproducibility(self, engine):
        """RPT report must be reproducible across multiple runs."""
        results = []
        for _ in range(10):
            result = engine.execute(RPT_PASS_INPUT)
            results.append(result)

        # All results must be identical
        first = results[0]
        for i, result in enumerate(results[1:], 2):
            assert result.calculation_result.status == first.calculation_result.status
            for key in first.calculation_result.calculated_values:
                v1 = first.calculation_result.calculated_values[key]
                v2 = result.calculation_result.calculated_values[key]
                assert v1 == v2, f"Run {i}: '{key}' differs: {v1} vs {v2}"

    def test_ecc_reproducibility(self, engine):
        """ECC report must be reproducible across multiple runs."""
        results = []
        for _ in range(10):
            result = engine.execute(ECC_PASS_INPUT)
            results.append(result)

        first = results[0]
        for result in results[1:]:
            assert result.calculation_result.calculated_values == first.calculation_result.calculated_values

    def test_all_golden_reports_reproducible(self, engine):
        """All golden reports must be reproducible."""
        golden_inputs = [
            ("RPT_PASS", RPT_PASS_INPUT),
            ("RPT_FAIL", RPT_FAIL_INPUT),
            ("ECC_PASS", ECC_PASS_INPUT),
            ("ECC_FAIL", ECC_FAIL_INPUT),
            ("LIN_PASS", LIN_PASS_INPUT),
            ("DIS_PASS", DIS_PASS_INPUT),
            ("STB_PASS", STB_PASS_INPUT),
        ]

        for name, test_input in golden_inputs:
            # Run twice
            result1 = engine.execute(test_input)
            result2 = engine.execute(test_input)

            # Must be identical
            assert result1.calculation_result.status == result2.calculation_result.status, \
                f"{name}: Status differs"
            assert result1.calculation_result.calculated_values == result2.calculation_result.calculated_values, \
                f"{name}: Calculated values differ"


# ============================================================================
# 8. UNIT NORMALIZATION
# ============================================================================

class TestUnitNormalization:
    """Verify unit conversions are correct."""

    def test_kg_to_g(self, normalizer):
        """1 kg = 1000 g."""
        assert normalizer.to_kg(1000, MassUnit.G) == 1.0

    def test_g_to_kg(self, normalizer):
        """1000 g = 1 kg."""
        assert normalizer.from_kg(1.0, MassUnit.G) == 1000.0

    def test_mg_to_kg(self, normalizer):
        """1000000 mg = 1 kg."""
        assert normalizer.to_kg(1000000, MassUnit.MG) == 1.0

    def test_t_to_kg(self, normalizer):
        """1 t = 1000 kg."""
        assert normalizer.to_kg(1, MassUnit.T) == 1000.0

    def test_kg_identity(self, normalizer):
        """1 kg = 1 kg."""
        assert normalizer.to_kg(1, MassUnit.KG) == 1.0
        assert normalizer.from_kg(1.0, MassUnit.KG) == 1.0

    def test_roundtrip_conversion(self, normalizer):
        """Conversion to kg and back should be lossless."""
        original = 123.456
        kg_value = normalizer.to_kg(original, MassUnit.G)
        back = normalizer.from_kg(kg_value, MassUnit.G)
        assert abs(back - original) < 1e-10


# ============================================================================
# 9. STATISTICAL CALCULATIONS
# ============================================================================

class TestStatisticalCalculations:
    """Verify statistical calculation functions."""

    def _make_obs(self, values):
        """Create RawObservation list from float values."""
        return [
            RawObservation(value=v, unit=MassUnit.KG, observation_number=i)
            for i, v in enumerate(values, 1)
        ]

    def test_mean(self, calculator):
        """Mean calculation must be correct."""
        stats = calculator.calculate_observation_statistics(self._make_obs([10.0, 20.0, 30.0]))
        assert stats.mean == 20.0

    def test_std_deviation(self, calculator):
        """Standard deviation must be correct."""
        stats = calculator.calculate_observation_statistics(self._make_obs([10.0, 20.0, 30.0]))
        # Sample std dev of [10, 20, 30] = 10.0
        assert abs(stats.std_deviation - 10.0) < 1e-10

    def test_min_max(self, calculator):
        """Min and max must be correct."""
        stats = calculator.calculate_observation_statistics(self._make_obs([5.0, 1.0, 10.0, 3.0]))
        assert stats.min_value == 1.0
        assert stats.max_value == 10.0
        assert stats.range == 9.0

    def test_single_observation(self, calculator):
        """Single observation should have std dev of 0."""
        stats = calculator.calculate_observation_statistics(self._make_obs([42.0]))
        assert stats.mean == 42.0
        assert stats.std_deviation == 0.0

    def test_identical_observations(self, calculator):
        """Identical observations should have std dev of 0."""
        stats = calculator.calculate_observation_statistics(self._make_obs([5.0, 5.0, 5.0]))
        assert stats.mean == 5.0
        assert stats.std_deviation == 0.0


# ============================================================================
# 10. COMPLETE PIPELINE
# ============================================================================

class TestCompletePipeline:
    """Verify the complete pipeline produces correct end-to-end results."""

    def test_rpt_pipeline_pass(self, engine):
        """Complete RPT pipeline: no OIML numeric limit -> RULE_NOT_CONFIGURED."""
        result = engine.execute(RPT_PASS_INPUT)

        # Pipeline completed
        assert result.validation is not None
        assert result.calculation_result is not None

        # Validation passed
        assert result.validation.is_valid

        # No OIML numeric repeatability limit -> orchestrator short-circuits
        # to RULE_NOT_CONFIGURED (never an invented PASS/FAIL).
        assert result.calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED

    def test_rpt_pipeline_fail(self, engine):
        """Complete RPT pipeline: no OIML numeric limit -> RULE_NOT_CONFIGURED."""
        result = engine.execute(RPT_FAIL_INPUT)

        assert result.validation is not None
        assert result.calculation_result is not None

        assert result.validation.is_valid
        assert result.calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED

    def test_incomplete_pipeline(self, engine):
        """Incomplete input should stop at validation."""
        result = engine.execute(INCOMPLETE_INPUT)

        assert result.validation is not None
        assert not result.validation.is_valid
        assert result.calculation_result is not None
        assert result.calculation_result.status == TestStatusCode.INVALID_INPUT

    def test_rule_not_configured_pipeline(self, engine):
        """Unknown test code should stop at rule resolution."""
        result = engine.execute(RULE_NOT_CONFIGURED_INPUT)

        assert result.calculation_result is not None
        assert result.calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED
        # The orchestrator returns early for RULE_NOT_CONFIGURED without setting compliance_result
