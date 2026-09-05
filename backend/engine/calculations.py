"""
NAWI Sahayak — Calculation Module

Deterministic, reproducible calculations for OIML R-76 test parameters.
All functions are pure — no side effects, no external dependencies.

Every calculation produces a clear, traceable result.
"""

import math
from dataclasses import dataclass
from typing import Optional

from .types import (
    RawObservation,
    ObservationStatistics,
    TestPointResult,
    MassUnit,
)
from .normalization import UnitNormalizer


class CalculationError(Exception):
    """Raised when a calculation cannot be performed."""
    pass


class Calculations:
    """
    Deterministic calculation functions.
    
    All methods are pure functions with no side effects.
    Each method is independently testable.
    """
    
    @staticmethod
    def mean(values: list[float]) -> float:
        """
        Calculate arithmetic mean.
        
        Args:
            values: List of numeric values (non-empty)
            
        Returns:
            Arithmetic mean
            
        Raises:
            CalculationError: If values list is empty
        """
        if not values:
            raise CalculationError("Cannot calculate mean of empty list")
        return sum(values) / len(values)
    
    @staticmethod
    def sample_std_dev(values: list[float]) -> float:
        """
        Calculate sample standard deviation (Bessel's correction).
        
        Formula: s = sqrt(Σ(xi - x̄)² / (n - 1))
        
        Args:
            values: List of numeric values (minimum 2 required)
            
        Returns:
            Sample standard deviation
            
        Raises:
            CalculationError: If fewer than 2 values provided
        """
        if len(values) < 2:
            raise CalculationError(
                "Standard deviation requires at least 2 values, "
                f"got {len(values)}"
            )
        
        mean_val = Calculations.mean(values)
        squared_diffs = [(x - mean_val) ** 2 for x in values]
        variance = sum(squared_diffs) / (len(values) - 1)
        return math.sqrt(variance)
    
    @staticmethod
    def population_std_dev(values: list[float]) -> float:
        """
        Calculate population standard deviation.
        
        Formula: σ = sqrt(Σ(xi - μ)² / n)
        
        Args:
            values: List of numeric values
            
        Returns:
            Population standard deviation
        """
        if not values:
            raise CalculationError("Cannot calculate std dev of empty list")
        
        mean_val = Calculations.mean(values)
        squared_diffs = [(x - mean_val) ** 2 for x in values]
        variance = sum(squared_diffs) / len(values)
        return math.sqrt(variance)
    
    @staticmethod
    def coefficient_of_variation(values: list[float]) -> float:
        """
        Calculate coefficient of variation (CV).
        
        Formula: CV = (s / x̄) × 100%
        
        Args:
            values: List of numeric values
            
        Returns:
            Coefficient of variation as percentage
            
        Raises:
            CalculationError: If mean is zero or insufficient data
        """
        if len(values) < 2:
            raise CalculationError("CV requires at least 2 values")
        
        mean_val = Calculations.mean(values)
        if mean_val == 0:
            raise CalculationError("Cannot calculate CV when mean is zero")
        
        std_dev = Calculations.sample_std_dev(values)
        return (std_dev / abs(mean_val)) * 100
    
    @staticmethod
    def min_value(values: list[float]) -> float:
        """Get minimum value."""
        if not values:
            raise CalculationError("Cannot find min of empty list")
        return min(values)
    
    @staticmethod
    def max_value(values: list[float]) -> float:
        """Get maximum value."""
        if not values:
            raise CalculationError("Cannot find max of empty list")
        return max(values)
    
    @staticmethod
    def value_range(values: list[float]) -> float:
        """Calculate range (max - min)."""
        if not values:
            raise CalculationError("Cannot calculate range of empty list")
        return max(values) - min(values)
    
    @staticmethod
    def deviation_from_reference(
        measured_mean: float,
        reference_value: float,
    ) -> float:
        """
        Calculate deviation from reference value.
        
        Formula: d = x̄ - ref
        
        Args:
            measured_mean: Mean of measured values
            reference_value: Reference/marked value
            
        Returns:
            Signed deviation
        """
        return measured_mean - reference_value
    
    @staticmethod
    def absolute_error(
        measured_mean: float,
        reference_value: float,
    ) -> float:
        """
        Calculate absolute error.
        
        Formula: |x̄ - ref|
        
        Args:
            measured_mean: Mean of measured values
            reference_value: Reference/marked value
            
        Returns:
            Absolute error (always non-negative)
        """
        return abs(measured_mean - reference_value)
    
    @staticmethod
    def relative_error(
        measured_mean: float,
        reference_value: float,
    ) -> float:
        """
        Calculate relative error as percentage.
        
        Formula: |x̄ - ref| / |ref| × 100%
        
        Args:
            measured_mean: Mean of measured values
            reference_value: Reference/marked value
            
        Returns:
            Relative error as percentage
            
        Raises:
            CalculationError: If reference value is zero
        """
        if reference_value == 0:
            raise CalculationError("Cannot calculate relative error with zero reference")
        
        return (abs(measured_mean - reference_value) / abs(reference_value)) * 100
    
    @staticmethod
    def calculate_observation_statistics(
        observations: list[RawObservation],
        normalize_to: Optional[MassUnit] = None,
    ) -> ObservationStatistics:
        """
        Calculate comprehensive statistics for a set of observations.
        
        Args:
            observations: List of raw observations
            normalize_to: Unit to normalize to (optional)
            
        Returns:
            ObservationStatistics with all calculated values
        """
        if not observations:
            raise CalculationError("Cannot calculate statistics of empty observations")
        
        # Normalize if needed
        if normalize_to:
            normalized = UnitNormalizer.normalize_observations(observations, normalize_to)
            values = [obs.value for obs in normalized]
        else:
            values = [obs.value for obs in observations]
        
        if not values:
            raise CalculationError("No valid values after normalization")
        
        # Calculate statistics
        mean_val = Calculations.mean(values)
        min_val = Calculations.min_value(values)
        max_val = Calculations.max_value(values)
        range_val = Calculations.value_range(values)
        
        # Standard deviation (sample if n > 1, else 0)
        if len(values) > 1:
            std_dev = Calculations.sample_std_dev(values)
            cv = Calculations.coefficient_of_variation(values)
        else:
            std_dev = 0.0
            cv = 0.0
        
        return ObservationStatistics(
            count=len(values),
            mean=round(mean_val, 6),
            std_deviation=round(std_dev, 6),
            min_value=round(min_val, 6),
            max_value=round(max_val, 6),
            range=round(range_val, 6),
            coefficient_of_variation=round(cv, 4),
        )
    
    @staticmethod
    def calculate_test_point(
        point_label: str,
        reference_value: float,
        unit: MassUnit,
        observations: list[RawObservation],
        normalize_to: Optional[MassUnit] = None,
    ) -> TestPointResult:
        """
        Calculate all values for a single test point.
        
        Args:
            point_label: Label for the test point
            reference_value: Reference/marked value
            unit: Unit of measurement
            observations: List of raw observations
            normalize_to: Unit to normalize to (optional)
            
        Returns:
            TestPointResult with all calculated values
        """
        # Get statistics
        stats = Calculations.calculate_observation_statistics(
            observations, normalize_to
        )
        
        # Get mean in the appropriate unit
        if normalize_to:
            mean_in_unit = UnitNormalizer.from_kg(stats.mean, unit)
        else:
            mean_in_unit = stats.mean
        
        # Calculate deviation and error
        deviation = Calculations.deviation_from_reference(mean_in_unit, reference_value)
        abs_error = Calculations.absolute_error(mean_in_unit, reference_value)
        
        return TestPointResult(
            point_label=point_label,
            reference_value=reference_value,
            unit=unit,
            observation_count=stats.count,
            statistics=stats,
            deviation_from_reference=round(deviation, 6),
            absolute_error=round(abs_error, 6),
        )
    
    @staticmethod
    def calculate_eccentricity(
        center_reading: float,
        edge_readings: dict[str, float],
    ) -> dict:
        """
        Calculate eccentricity (off-center) test results.
        
        Args:
            center_reading: Reading at center of pan
            edge_readings: Dict of position -> reading (e.g., {"front": 100.01, ...})
            
        Returns:
            Dict with eccentricity results
        """
        if not edge_readings:
            raise CalculationError("At least one edge reading required")
        
        deviations = {}
        for position, reading in edge_readings.items():
            deviations[position] = reading - center_reading
        
        max_abs_deviation = max(abs(d) for d in deviations.values())
        max_deviation_position = max(
            deviations.keys(),
            key=lambda k: abs(deviations[k])
        )
        
        return {
            "center_reading": center_reading,
            "edge_readings": edge_readings,
            "deviations": deviations,
            "max_absolute_deviation": round(max_abs_deviation, 6),
            "max_deviation_position": max_deviation_position,
        }
    
    @staticmethod
    def calculate_discrimination(
        reading_before: float,
        reading_after: float,
        discrimination_weight: float,
    ) -> dict:
        """
        Calculate discrimination test results.
        
        Args:
            reading_before: Reading before adding discrimination weight
            reading_after: Reading after adding discrimination weight
            discrimination_weight: Weight of discrimination test weight
            
        Returns:
            Dict with discrimination results
        """
        measured_discrimination = reading_after - reading_before
        discrimination_error = abs(measured_discrimination - discrimination_weight)
        
        return {
            "reading_before": reading_before,
            "reading_after": reading_after,
            "discrimination_weight": discrimination_weight,
            "measured_discrimination": round(measured_discrimination, 6),
            "discrimination_error": round(discrimination_error, 6),
            "is_detected": measured_discrimination > 0,
        }

    @staticmethod
    def weighing_error(
        indication: float,
        small_added_load: float,
        applied_load: float,
        scale_interval: float,
        zero_error: float = 0.0,
    ) -> dict:
        """
        Calculate the OIML R 76-2 weighing error.

        Formula (verbatim from R 76-2, as recorded in the rulebook):
            E   = I + ½·e − ΔL − L        (pre-rounding error)
            E_c = E − E₀                   (corrected by initial zero-error)

        Args:
            indication: The displayed reading I.
            small_added_load: ΔL, the small load added at the changeover
                              point to determine the rounding error.
            applied_load: L, the actual applied load.
            scale_interval: e, the verification scale interval.
            zero_error: E₀, the zero error (weight-loading error before the
                        load is applied / at zero). Defaults to 0.

        Returns:
            Dict with E (pre-rounding), E_c (corrected) and the component
            values for full traceability.
        """
        pre_rounding = indication + 0.5 * scale_interval - small_added_load - applied_load
        corrected = pre_rounding - zero_error

        return {
            "E": round(pre_rounding, 6),
            "E_c": round(corrected, 6),
            "indication_I": indication,
            "small_added_load_delta_L": small_added_load,
            "applied_load_L": applied_load,
            "scale_interval_e": scale_interval,
            "zero_error_E0": zero_error,
        }
