"""
NAWI Sahayak — Calculation Module Tests

Comprehensive tests for all calculation functions.
Every calculation is tested for:
- Correct results
- Edge cases
- Error conditions
- Determinism (same input → same output)
"""

import math
import pytest

from engine.calculations import Calculations, CalculationError
from engine.types import RawObservation, MassUnit, ObservationStatistics


# ============================================================================
# Basic Statistical Calculations
# ============================================================================

class TestMean:
    """Tests for arithmetic mean calculation."""
    
    def test_simple_mean(self):
        assert Calculations.mean([1.0, 2.0, 3.0]) == 2.0
    
    def test_single_value(self):
        assert Calculations.mean([5.0]) == 5.0
    
    def test_identical_values(self):
        assert Calculations.mean([3.0, 3.0, 3.0]) == 3.0
    
    def test_negative_values(self):
        assert Calculations.mean([-1.0, 1.0]) == 0.0
    
    def test_decimals(self):
        result = Calculations.mean([0.1, 0.2, 0.3])
        assert abs(result - 0.2) < 1e-10
    
    def test_large_values(self):
        assert Calculations.mean([1e6, 2e6, 3e6]) == 2e6
    
    def test_empty_list_raises(self):
        with pytest.raises(CalculationError, match="empty list"):
            Calculations.mean([])
    
    def test_deterministic(self):
        values = [1.23456, 2.34567, 3.45678]
        result1 = Calculations.mean(values)
        result2 = Calculations.mean(values)
        assert result1 == result2


class TestSampleStdDev:
    """Tests for sample standard deviation (Bessel's correction)."""
    
    def test_simple_std_dev(self):
        # Values: 2, 4, 4, 4, 5, 5, 7, 9
        # Mean = 5.0, sample std dev = sqrt(32/7) ≈ 2.1381
        values = [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]
        result = Calculations.sample_std_dev(values)
        assert abs(result - 2.1381) < 0.01
    
    def test_two_values(self):
        result = Calculations.sample_std_dev([0.0, 10.0])
        assert abs(result - 7.071068) < 0.01
    
    def test_identical_values(self):
        result = Calculations.sample_std_dev([5.0, 5.0, 5.0])
        assert result == 0.0
    
    def test_symmetric_values(self):
        result = Calculations.sample_std_dev([-1.0, 1.0])
        assert abs(result - 1.414214) < 0.01
    
    def test_single_value_raises(self):
        with pytest.raises(CalculationError, match="at least 2 values"):
            Calculations.sample_std_dev([5.0])
    
    def test_empty_list_raises(self):
        with pytest.raises(CalculationError, match="at least 2 values"):
            Calculations.sample_std_dev([])


class TestPopulationStdDev:
    """Tests for population standard deviation."""
    
    def test_simple_std_dev(self):
        # Values: 2, 4, 4, 4, 5, 5, 7, 9
        # Mean = 5.0, population std dev = sqrt(32/8) = 2.0
        values = [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]
        result = Calculations.population_std_dev(values)
        assert abs(result - 2.0) < 0.01
    
    def test_identical_values(self):
        result = Calculations.population_std_dev([5.0, 5.0, 5.0])
        assert result == 0.0
    
    def test_single_value(self):
        result = Calculations.population_std_dev([5.0])
        assert result == 0.0
    
    def test_empty_list_raises(self):
        with pytest.raises(CalculationError, match="empty list"):
            Calculations.population_std_dev([])


class TestCoefficientOfVariation:
    """Tests for coefficient of variation."""
    
    def test_simple_cv(self):
        values = [10.0, 11.0, 12.0]
        result = Calculations.coefficient_of_variation(values)
        # CV should be approximately 9.09%
        assert abs(result - 9.0909) < 0.1
    
    def test_identical_values(self):
        result = Calculations.coefficient_of_variation([5.0, 5.0, 5.0])
        assert result == 0.0
    
    def test_zero_mean_raises(self):
        with pytest.raises(CalculationError, match="mean is zero"):
            Calculations.coefficient_of_variation([-5.0, 5.0])
    
    def test_single_value_raises(self):
        with pytest.raises(CalculationError, match="at least 2 values"):
            Calculations.coefficient_of_variation([5.0])


# ============================================================================
# Basic Math Operations
# ============================================================================

class TestMinMaxRange:
    """Tests for min, max, and range."""
    
    def test_min(self):
        assert Calculations.min_value([3.0, 1.0, 2.0]) == 1.0
    
    def test_max(self):
        assert Calculations.max_value([3.0, 1.0, 2.0]) == 3.0
    
    def test_range(self):
        assert Calculations.value_range([1.0, 5.0]) == 4.0
    
    def test_range_identical(self):
        assert Calculations.value_range([3.0, 3.0]) == 0.0
    
    def test_empty_raises(self):
        with pytest.raises(CalculationError):
            Calculations.min_value([])
        with pytest.raises(CalculationError):
            Calculations.max_value([])
        with pytest.raises(CalculationError):
            Calculations.value_range([])


class TestErrorCalculations:
    """Tests for error calculations."""
    
    def test_deviation_from_reference(self):
        assert Calculations.deviation_from_reference(100.5, 100.0) == 0.5
    
    def test_deviation_negative(self):
        assert Calculations.deviation_from_reference(99.5, 100.0) == -0.5
    
    def test_absolute_error(self):
        assert Calculations.absolute_error(100.5, 100.0) == 0.5
    
    def test_absolute_error_symmetric(self):
        assert Calculations.absolute_error(99.5, 100.0) == 0.5
    
    def test_relative_error(self):
        result = Calculations.relative_error(101.0, 100.0)
        assert abs(result - 1.0) < 0.001
    
    def test_relative_error_zero_reference(self):
        with pytest.raises(CalculationError, match="zero reference"):
            Calculations.relative_error(1.0, 0.0)


# ============================================================================
# Observation Statistics
# ============================================================================

class TestObservationStatistics:
    """Tests for comprehensive observation statistics."""
    
    def test_basic_statistics(self):
        observations = [
            RawObservation(value=100.1, unit=MassUnit.G, observation_number=1),
            RawObservation(value=100.2, unit=MassUnit.G, observation_number=2),
            RawObservation(value=100.0, unit=MassUnit.G, observation_number=3),
        ]
        
        stats = Calculations.calculate_observation_statistics(observations)
        
        assert stats.count == 3
        assert abs(stats.mean - 100.1) < 0.001
        assert stats.min_value == 100.0
        assert stats.max_value == 100.2
        assert abs(stats.range - 0.2) < 0.001
        assert stats.std_deviation > 0
        assert stats.coefficient_of_variation > 0
    
    def test_single_observation(self):
        observations = [
            RawObservation(value=50.0, unit=MassUnit.G, observation_number=1),
        ]
        
        stats = Calculations.calculate_observation_statistics(observations)
        
        assert stats.count == 1
        assert stats.mean == 50.0
        assert stats.std_deviation == 0.0
        assert stats.coefficient_of_variation == 0.0
    
    def test_empty_observations_raises(self):
        with pytest.raises(CalculationError):
            Calculations.calculate_observation_statistics([])
    
    def test_normalized_observations(self):
        observations = [
            RawObservation(value=1000.0, unit=MassUnit.G, observation_number=1),
            RawObservation(value=1.0, unit=MassUnit.KG, observation_number=2),
        ]
        
        stats = Calculations.calculate_observation_statistics(
            observations, normalize_to=MassUnit.KG
        )
        
        # Both should be 1.0 kg
        assert abs(stats.mean - 1.0) < 0.001
        assert stats.std_deviation == 0.0


# ============================================================================
# Test Point Calculations
# ============================================================================

class TestCalculateTestPoint:
    """Tests for test point calculations."""
    
    def test_basic_test_point(self):
        observations = [
            RawObservation(value=100.01, unit=MassUnit.G, observation_number=1),
            RawObservation(value=100.02, unit=MassUnit.G, observation_number=2),
            RawObservation(value=100.00, unit=MassUnit.G, observation_number=3),
        ]
        
        result = Calculations.calculate_test_point(
            point_label="100g",
            reference_value=100.0,
            unit=MassUnit.G,
            observations=observations,
        )
        
        assert result.point_label == "100g"
        assert result.reference_value == 100.0
        assert result.observation_count == 3
        assert abs(result.deviation_from_reference) < 0.02
        assert abs(result.absolute_error) < 0.02
    
    def test_test_point_different_units(self):
        # Observations in grams, but normalize to kg
        observations = [
            RawObservation(value=1000.0, unit=MassUnit.G, observation_number=1),
            RawObservation(value=1000.5, unit=MassUnit.G, observation_number=2),
        ]
        
        result = Calculations.calculate_test_point(
            point_label="1kg",
            reference_value=1.0,
            unit=MassUnit.KG,
            observations=observations,
            normalize_to=MassUnit.KG,
        )
        
        assert abs(result.statistics.mean - 1.00025) < 0.001
        assert abs(result.deviation_from_reference) < 0.001


# ============================================================================
# Eccentricity Calculations
# ============================================================================

class TestEccentricity:
    """Tests for eccentricity (off-center) calculations."""
    
    def test_basic_eccentricity(self):
        edge_readings = {
            "front": 100.01,
            "back": 99.99,
            "left": 100.02,
            "right": 99.98,
        }
        
        result = Calculations.calculate_eccentricity(
            center_reading=100.00,
            edge_readings=edge_readings,
        )
        
        assert result["center_reading"] == 100.00
        assert result["max_absolute_deviation"] == 0.02
        assert result["max_deviation_position"] == "left"
        assert len(result["deviations"]) == 4
    
    def test_single_edge(self):
        edge_readings = {"front": 100.05}
        
        result = Calculations.calculate_eccentricity(
            center_reading=100.00,
            edge_readings=edge_readings,
        )
        
        assert result["max_absolute_deviation"] == 0.05
    
    def test_no_edges_raises(self):
        with pytest.raises(CalculationError, match="At least one edge"):
            Calculations.calculate_eccentricity(
                center_reading=100.00,
                edge_readings={},
            )
    
    def test_all_edges_equal(self):
        edge_readings = {
            "front": 100.01,
            "back": 100.01,
            "left": 100.01,
            "right": 100.01,
        }
        
        result = Calculations.calculate_eccentricity(
            center_reading=100.00,
            edge_readings=edge_readings,
        )
        
        assert result["max_absolute_deviation"] == 0.01


# ============================================================================
# Discrimination Calculations
# ============================================================================

class TestDiscrimination:
    """Tests for discrimination calculations."""
    
    def test_basic_discrimination(self):
        result = Calculations.calculate_discrimination(
            reading_before=100.00,
            reading_after=100.05,
            discrimination_weight=0.05,
        )
        
        assert result["measured_discrimination"] == 0.05
        assert result["discrimination_error"] == 0.0
        assert result["is_detected"] is True
    
    def test_discrimination_not_detected(self):
        result = Calculations.calculate_discrimination(
            reading_before=100.00,
            reading_after=100.00,
            discrimination_weight=0.05,
        )
        
        assert result["measured_discrimination"] == 0.0
        assert result["discrimination_error"] == 0.05
        assert result["is_detected"] is False
    
    def test_discrimination_partial(self):
        result = Calculations.calculate_discrimination(
            reading_before=100.00,
            reading_after=100.03,
            discrimination_weight=0.05,
        )
        
        assert result["measured_discrimination"] == 0.03
        assert result["discrimination_error"] == 0.02
        assert result["is_detected"] is True


# ============================================================================
# Determinism Tests
# ============================================================================

class TestDeterminism:
    """Verify that calculations are deterministic."""
    
    def test_mean_deterministic(self):
        values = [1.23456, 2.34567, 3.45678, 4.56789, 5.67890]
        result1 = Calculations.mean(values)
        result2 = Calculations.mean(values)
        result3 = Calculations.mean(values)
        assert result1 == result2 == result3
    
    def test_std_dev_deterministic(self):
        values = [10.0, 20.0, 30.0, 40.0, 50.0]
        result1 = Calculations.sample_std_dev(values)
        result2 = Calculations.sample_std_dev(values)
        assert result1 == result2
    
    def test_observation_statistics_deterministic(self):
        observations = [
            RawObservation(value=100.1, unit=MassUnit.G, observation_number=1),
            RawObservation(value=100.2, unit=MassUnit.G, observation_number=2),
            RawObservation(value=100.0, unit=MassUnit.G, observation_number=3),
        ]
        
        stats1 = Calculations.calculate_observation_statistics(observations)
        stats2 = Calculations.calculate_observation_statistics(observations)
        
        assert stats1.mean == stats2.mean
        assert stats1.std_deviation == stats2.std_deviation
        assert stats1.coefficient_of_variation == stats2.coefficient_of_variation
    
    def test_eccentricity_deterministic(self):
        edge_readings = {"front": 100.01, "back": 99.99}
        
        result1 = Calculations.calculate_eccentricity(100.00, edge_readings)
        result2 = Calculations.calculate_eccentricity(100.00, edge_readings)
        
        assert result1["max_absolute_deviation"] == result2["max_absolute_deviation"]
