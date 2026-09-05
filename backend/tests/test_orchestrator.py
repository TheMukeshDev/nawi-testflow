"""
NAWI Sahayak — Orchestrator Tests

End-to-end tests for the calculation engine.
Tests the complete pipeline:
    Raw Observation
    → Input Validation
    → Normalization
    → Calculation
    → Rule Resolution
    → Compliance Evaluation
    → Result
"""

import pytest

from engine.orchestrator import CalculationEngine
from engine.rules import create_default_rule_store
from engine.types import (
    TestInput,
    TestPointInput,
    RawObservation,
    MassUnit,
    InstrumentClass,
    TestStatusCode,
)


@pytest.fixture
def engine():
    return CalculationEngine()


@pytest.fixture
def no_rules_engine():
    """Engine with no rules configured."""
    from engine.rules import RuleStore
    return CalculationEngine(rule_store=RuleStore())


# ============================================================================
# Repeatability Test
# ============================================================================

class TestRepeatabilityPipeline:
    """End-to-end repeatability test."""
    
    def test_repeatability_pass(self, engine):
        """Repeatability: no OIML numeric limit -> RULE_NOT_CONFIGURED."""
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
                        RawObservation(value=100.00, unit=MassUnit.KG, observation_number=3),
                        RawObservation(value=100.01, unit=MassUnit.KG, observation_number=4),
                        RawObservation(value=100.02, unit=MassUnit.KG, observation_number=5),
                    ],
                )
            ],
        )
        
        result = engine.execute(test_input)
        
        # Validation should pass
        assert result.validation.is_valid
        
        # OIML R-76 gives no numeric repeatability limit -> RULE_NOT_CONFIGURED
        assert result.calculation_result is not None
        assert result.calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED
    
    def test_repeatability_fail(self, engine):
        """Repeatability: even wide spread has no OIML numeric limit -> RULE_NOT_CONFIGURED."""
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
                        RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1),
                        RawObservation(value=100.2, unit=MassUnit.KG, observation_number=2),
                        RawObservation(value=99.8, unit=MassUnit.KG, observation_number=3),
                        RawObservation(value=100.3, unit=MassUnit.KG, observation_number=4),
                        RawObservation(value=99.7, unit=MassUnit.KG, observation_number=5),
                    ],
                )
            ],
        )
        
        result = engine.execute(test_input)
        
        assert result.validation.is_valid
        assert result.calculation_result is not None
        # Never invent a numeric limit: wide spread -> RULE_NOT_CONFIGURED
        assert result.calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED
    
    def test_repeatability_rule_not_configured(self, no_rules_engine):
        """Repeatability with no rules configured."""
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
        
        result = no_rules_engine.execute(test_input)
        
        assert result.calculation_result is not None
        assert result.calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED


# ============================================================================
# Eccentricity Test
# ============================================================================

class TestEccentricityPipeline:
    """End-to-end eccentricity test."""
    
    def test_eccentricity_pass(self, engine):
        """Eccentricity within limits."""
        test_input = TestInput(
            test_code="ECC",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(
                    point_label="center",
                    reference_value=100.0,
                    unit=MassUnit.KG,
                    observations=[
                        RawObservation(value=100.00, unit=MassUnit.KG, observation_number=1),
                    ],
                ),
                TestPointInput(
                    point_label="front",
                    reference_value=100.0,
                    unit=MassUnit.KG,
                    observations=[
                        RawObservation(value=100.01, unit=MassUnit.KG, observation_number=1),
                    ],
                ),
                TestPointInput(
                    point_label="back",
                    reference_value=100.0,
                    unit=MassUnit.KG,
                    observations=[
                        RawObservation(value=99.99, unit=MassUnit.KG, observation_number=1),
                    ],
                ),
            ],
        )
        
        result = engine.execute(test_input)
        
        assert result.validation.is_valid
        assert result.calculation_result is not None
        assert result.calculation_result.status == TestStatusCode.PASS
    
    def test_eccentricity_insufficient_points(self, engine):
        """Eccentricity with only one point."""
        test_input = TestInput(
            test_code="ECC",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(
                    point_label="center",
                    reference_value=100.0,
                    unit=MassUnit.KG,
                    observations=[
                        RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1),
                    ],
                ),
            ],
        )
        
        result = engine.execute(test_input)
        
        assert result.calculation_result is not None
        assert result.calculation_result.status == TestStatusCode.CALCULATION_ERROR


# ============================================================================
# Linearity Test
# ============================================================================

class TestLinearityPipeline:
    """End-to-end linearity test."""
    
    def test_linearity_pass(self, engine):
        """Linearity within limits."""
        test_input = TestInput(
            test_code="LIN",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(
                    point_label="50kg",
                    reference_value=50.0,
                    unit=MassUnit.KG,
                    observations=[
                        RawObservation(value=50.00, unit=MassUnit.KG, observation_number=1),
                        RawObservation(value=50.01, unit=MassUnit.KG, observation_number=2),
                    ],
                ),
                TestPointInput(
                    point_label="100kg",
                    reference_value=100.0,
                    unit=MassUnit.KG,
                    observations=[
                        RawObservation(value=100.00, unit=MassUnit.KG, observation_number=1),
                        RawObservation(value=100.01, unit=MassUnit.KG, observation_number=2),
                    ],
                ),
            ],
        )
        
        result = engine.execute(test_input)
        
        assert result.validation.is_valid
        assert result.calculation_result is not None


# ============================================================================
# Discrimination Test
# ============================================================================

class TestDiscriminationPipeline:
    """End-to-end discrimination test."""
    
    def test_discrimination_detected(self, engine):
        """Discrimination weight detected."""
        test_input = TestInput(
            test_code="DIS",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(
                    point_label="before",
                    reference_value=100.0,
                    unit=MassUnit.KG,
                    observations=[
                        RawObservation(value=100.00, unit=MassUnit.KG, observation_number=1),
                    ],
                ),
                TestPointInput(
                    point_label="after",
                    reference_value=100.0,
                    unit=MassUnit.KG,
                    observations=[
                        RawObservation(value=100.05, unit=MassUnit.KG, observation_number=1),
                    ],
                ),
            ],
            additional_inputs={"discrimination_weight": 0.05},
        )
        
        result = engine.execute(test_input)
        
        assert result.validation.is_valid
        assert result.calculation_result is not None
        assert result.calculation_result.status == TestStatusCode.PASS


# ============================================================================
# Stability Test
# ============================================================================

class TestStabilityPipeline:
    """End-to-end stability test."""
    
    def test_stability_pass(self, engine):
        """Stability: no OIML numeric limit -> RULE_NOT_CONFIGURED."""
        test_input = TestInput(
            test_code="STB",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(
                    point_label="initial",
                    reference_value=100.0,
                    unit=MassUnit.KG,
                    observations=[
                        RawObservation(value=100.00, unit=MassUnit.KG, observation_number=1),
                    ],
                ),
                TestPointInput(
                    point_label="final",
                    reference_value=100.0,
                    unit=MassUnit.KG,
                    observations=[
                        RawObservation(value=100.01, unit=MassUnit.KG, observation_number=1),
                    ],
                ),
            ],
        )
        
        result = engine.execute(test_input)
        
        assert result.validation.is_valid
        assert result.calculation_result is not None
        assert result.calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED


# ============================================================================
# Validation Failure Tests
# ============================================================================

class TestValidationFailures:
    """Tests for validation failure paths."""
    
    def test_invalid_input_returns_early(self, engine):
        """Invalid input should return before calculation."""
        test_input = TestInput(
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            max_capacity=-100.0,  # Invalid
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
        )
        
        result = engine.execute(test_input)
        
        assert not result.validation.is_valid
        assert result.calculation_result is not None
        assert result.calculation_result.status == TestStatusCode.INVALID_INPUT
    
    def test_empty_test_points(self, engine):
        """Empty test points should fail validation."""
        test_input = TestInput(
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[],  # No test points
        )
        
        result = engine.execute(test_input)
        
        assert not result.validation.is_valid


# ============================================================================
# Unknown Test Code Tests
# ============================================================================

class TestUnknownTestCode:
    """Tests for unknown test codes."""
    
    def test_unknown_code(self, engine):
        """Unknown test code returns RULE_NOT_CONFIGURED."""
        test_input = TestInput(
            test_code="UNKNOWN",
            instrument_class=InstrumentClass.III,
            max_capacity=150.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.05,
            scale_interval_unit=MassUnit.KG,
            test_points=[
                TestPointInput(
                    point_label="test",
                    reference_value=100.0,
                    unit=MassUnit.KG,
                    observations=[
                        RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1),
                    ],
                )
            ],
        )
        
        result = engine.execute(test_input)
        
        assert result.calculation_result is not None
        # No rule exists for unknown codes, so RULE_NOT_CONFIGURED is correct
        assert result.calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED


# ============================================================================
# Serialization Tests
# ============================================================================

class TestSerialization:
    """Tests for result serialization."""
    
    def test_result_to_dict(self, engine):
        """Results should serialize to dictionary."""
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
        
        result = engine.execute(test_input)
        
        # Check that calculation result can be serialized
        if result.calculation_result:
            serialized = result.calculation_result.to_dict()
            assert isinstance(serialized, dict)
            assert "test_code" in serialized
            assert "status" in serialized
            assert "calculated_at" in serialized


# ============================================================================
# Determinism Tests
# ============================================================================

class TestOrchestratorDeterminism:
    """Verify that orchestrator results are deterministic."""
    
    def test_same_input_same_output(self, engine):
        """Same input should produce same output."""
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
        
        result1 = engine.execute(test_input)
        result2 = engine.execute(test_input)
        
        # Validation should be identical
        assert result1.validation.is_valid == result2.validation.is_valid
        
        # Calculation results should be identical
        if result1.calculation_result and result2.calculation_result:
            assert result1.calculation_result.status == result2.calculation_result.status
            assert result1.calculation_result.calculated_values == result2.calculation_result.calculated_values
