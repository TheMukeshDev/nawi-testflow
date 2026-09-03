"""
NAWI TestFlow — Validation Module Tests

Tests for input validation including:
- Required field validation
- Numeric range validation
- Duplicate detection
- Impossible value detection
- Spread detection
"""

import pytest

from engine.validation import InputValidator
from engine.types import (
    TestInput,
    TestPointInput,
    RawObservation,
    MassUnit,
    InstrumentClass,
)


@pytest.fixture
def validator():
    return InputValidator()


@pytest.fixture
def valid_test_input():
    """Create a valid test input for basic validation."""
    return TestInput(
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
                ],
            )
        ],
    )


class TestBasicFieldValidation:
    """Tests for basic field validation."""
    
    def test_valid_input(self, validator, valid_test_input):
        result = validator.validate_test_input(valid_test_input)
        assert result.is_valid
        assert len(result.errors) == 0
    
    def test_missing_test_code(self, validator, valid_test_input):
        valid_test_input.test_code = ""
        result = validator.validate_test_input(valid_test_input)
        assert not result.is_valid
        assert any(e.code == "MISSING_TEST_CODE" for e in result.errors)
    
    def test_missing_instrument_class(self, validator, valid_test_input):
        valid_test_input.instrument_class = None
        result = validator.validate_test_input(valid_test_input)
        assert not result.is_valid
        assert any(e.code == "MISSING_INSTRUMENT_CLASS" for e in result.errors)
    
    def test_zero_max_capacity(self, validator, valid_test_input):
        valid_test_input.max_capacity = 0
        result = validator.validate_test_input(valid_test_input)
        assert not result.is_valid
        assert any(e.code == "INVALID_MAX_CAPACITY" for e in result.errors)
    
    def test_negative_max_capacity(self, validator, valid_test_input):
        valid_test_input.max_capacity = -100.0
        result = validator.validate_test_input(valid_test_input)
        assert not result.is_valid
    
    def test_zero_scale_interval(self, validator, valid_test_input):
        valid_test_input.scale_interval = 0
        result = validator.validate_test_input(valid_test_input)
        assert not result.is_valid
        assert any(e.code == "INVALID_SCALE_INTERVAL" for e in result.errors)


class TestTestPointValidation:
    """Tests for test point validation."""
    
    def test_no_test_points(self, validator, valid_test_input):
        valid_test_input.test_points = []
        result = validator.validate_test_input(valid_test_input)
        assert not result.is_valid
        assert any(e.code == "MISSING_TEST_POINTS" for e in result.errors)
    
    def test_missing_point_label(self, validator, valid_test_input):
        valid_test_input.test_points[0].point_label = ""
        result = validator.validate_test_input(valid_test_input)
        assert not result.is_valid
        assert any(e.code == "MISSING_POINT_LABEL" for e in result.errors)
    
    def test_zero_reference_value(self, validator, valid_test_input):
        valid_test_input.test_points[0].reference_value = 0
        result = validator.validate_test_input(valid_test_input)
        assert not result.is_valid
        assert any(e.code == "INVALID_REFERENCE_VALUE" for e in result.errors)
    
    def test_no_observations(self, validator, valid_test_input):
        valid_test_input.test_points[0].observations = []
        result = validator.validate_test_input(valid_test_input)
        assert not result.is_valid
        assert any(e.code == "MISSING_OBSERVATIONS" for e in result.errors)


class TestObservationValidation:
    """Tests for observation validation."""
    
    def test_duplicate_observations(self, validator, valid_test_input):
        valid_test_input.test_points[0].observations = [
            RawObservation(value=100.00, unit=MassUnit.KG, observation_number=1),
            RawObservation(value=100.00, unit=MassUnit.KG, observation_number=2),
        ]
        result = validator.validate_test_input(valid_test_input)
        assert any(w.code == "DUPLICATE_OBSERVATION" for w in result.warnings)
    
    def test_negative_observation(self, validator, valid_test_input):
        valid_test_input.test_points[0].observations = [
            RawObservation(value=-100.0, unit=MassUnit.KG, observation_number=1),
        ]
        result = validator.validate_test_input(valid_test_input)
        assert not result.is_valid
        assert any(e.code == "NEGATIVE_VALUE" for e in result.errors)
    
    def test_large_spread(self, validator, valid_test_input):
        # Spread > 10% of mean
        valid_test_input.test_points[0].observations = [
            RawObservation(value=90.0, unit=MassUnit.KG, observation_number=1),
            RawObservation(value=110.0, unit=MassUnit.KG, observation_number=2),
        ]
        result = validator.validate_test_input(valid_test_input)
        assert any(w.code == "LARGE_SPREAD" for w in result.warnings)
    
    def test_valid_observations_no_warnings(self, validator, valid_test_input):
        # Observations within reasonable spread
        valid_test_input.test_points[0].observations = [
            RawObservation(value=100.01, unit=MassUnit.KG, observation_number=1),
            RawObservation(value=100.02, unit=MassUnit.KG, observation_number=2),
            RawObservation(value=100.00, unit=MassUnit.KG, observation_number=3),
        ]
        result = validator.validate_test_input(valid_test_input)
        assert not any(w.code == "LARGE_SPREAD" for w in result.warnings)


class TestObservationsComplete:
    """Tests for observation completeness validation."""
    
    def test_sufficient_observations(self, validator):
        observations = [
            RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1),
            RawObservation(value=100.1, unit=MassUnit.KG, observation_number=2),
        ]
        result = validator.validate_observations_complete(observations, 2)
        assert result.is_valid
    
    def test_insufficient_observations(self, validator):
        observations = [
            RawObservation(value=100.0, unit=MassUnit.KG, observation_number=1),
        ]
        result = validator.validate_observations_complete(observations, 3)
        assert not result.is_valid
        assert any(e.code == "INSUFFICIENT_OBSERVATIONS" for e in result.errors)
