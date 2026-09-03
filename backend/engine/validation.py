"""
NAWI TestFlow — Input Validation Module

Validates all inputs before calculation.
Detects:
- Missing values
- Non-numeric values
- Out-of-range values
- Duplicate observations
- Impossible values
- Unit mismatches
"""

from typing import Optional
from .types import (
    TestInput,
    TestPointInput,
    RawObservation,
    ValidationResult,
    MassUnit,
    InstrumentClass,
)


class InputValidator:
    """
    Validates test inputs before calculation.
    
    All validation methods are pure functions.
    Each returns a ValidationResult with errors and warnings.
    """
    
    # Reasonable physical limits for mass measurements
    MASS_LIMITS = {
        MassUnit.MG: (0, 1_000_000),      # 0 to 1,000,000 mg
        MassUnit.G: (0, 1_000_000),        # 0 to 1,000,000 g
        MassUnit.KG: (0, 100_000),         # 0 to 100,000 kg
        MassUnit.T: (0, 1_000),            # 0 to 1,000 t
    }
    
    # Maximum allowed coefficient of variation for observations
    MAX_CV_PERCENT = 50.0
    
    # Maximum allowed relative difference between observations
    MAX_RELATIVE_DIFF = 0.1  # 10%
    
    def validate_test_input(self, test_input: TestInput) -> ValidationResult:
        """
        Validate complete test input.
        
        Args:
            test_input: Complete test input to validate
            
        Returns:
            ValidationResult with all errors and warnings
        """
        result = ValidationResult(is_valid=True)
        
        # Validate basic fields
        self._validate_basic_fields(test_input, result)
        
        # Validate test points
        if not test_input.test_points:
            result.add_error(
                field="test_points",
                message="At least one test point is required",
                code="MISSING_TEST_POINTS",
            )
        else:
            for i, point in enumerate(test_input.test_points):
                self._validate_test_point(point, i, result)
        
        return result
    
    def _validate_basic_fields(
        self,
        test_input: TestInput,
        result: ValidationResult,
    ):
        """Validate basic test input fields."""
        # Test code
        if not test_input.test_code:
            result.add_error(
                field="test_code",
                message="Test code is required",
                code="MISSING_TEST_CODE",
            )
        
        # Instrument class
        if not test_input.instrument_class:
            result.add_error(
                field="instrument_class",
                message="Instrument class is required",
                code="MISSING_INSTRUMENT_CLASS",
            )
        
        # Max capacity
        if test_input.max_capacity <= 0:
            result.add_error(
                field="max_capacity",
                message="Maximum capacity must be positive",
                code="INVALID_MAX_CAPACITY",
                value=test_input.max_capacity,
            )
        
        # Scale interval
        if test_input.scale_interval <= 0:
            result.add_error(
                field="scale_interval",
                message="Scale interval must be positive",
                code="INVALID_SCALE_INTERVAL",
                value=test_input.scale_interval,
            )
        
        # Unit consistency
        if test_input.max_capacity_unit != test_input.scale_interval_unit:
            result.add_warning(
                field="units",
                message="Capacity and scale interval units differ",
                code="UNIT_MISMATCH",
            )
    
    def _validate_test_point(
        self,
        point: TestPointInput,
        index: int,
        result: ValidationResult,
    ):
        """Validate a single test point."""
        prefix = f"test_points[{index}]"
        
        # Point label
        if not point.point_label:
            result.add_error(
                field=f"{prefix}.point_label",
                message="Test point label is required",
                code="MISSING_POINT_LABEL",
            )
        
        # Reference value
        if point.reference_value <= 0:
            result.add_error(
                field=f"{prefix}.reference_value",
                message="Reference value must be positive",
                code="INVALID_REFERENCE_VALUE",
                value=point.reference_value,
            )
        
        # Check if reference value exceeds capacity
        # (This would need capacity passed in, simplified here)
        
        # Observations
        if not point.observations:
            result.add_error(
                field=f"{prefix}.observations",
                message="At least one observation is required",
                code="MISSING_OBSERVATIONS",
            )
        else:
            self._validate_observations(point.observations, prefix, result)
    
    def _validate_observations(
        self,
        observations: list[RawObservation],
        prefix: str,
        result: ValidationResult,
    ):
        """Validate a set of observations."""
        values = []
        
        for i, obs in enumerate(observations):
            obs_prefix = f"{prefix}.observations[{i}]"
            
            # Check for None/NaN
            if obs.value is None:
                result.add_error(
                    field=obs_prefix,
                    message="Observation value cannot be None",
                    code="MISSING_VALUE",
                )
                continue
            
            # Check for NaN
            try:
                if obs.value != obs.value:  # NaN check
                    result.add_error(
                        field=obs_prefix,
                        message="Observation value cannot be NaN",
                        code="INVALID_VALUE",
                    )
                    continue
            except (TypeError, ValueError):
                result.add_error(
                    field=obs_prefix,
                    message="Invalid observation value",
                    code="INVALID_VALUE",
                )
                continue
            
            # Check for infinity
            if not (-1e10 < obs.value < 1e10):
                result.add_error(
                    field=obs_prefix,
                    message="Observation value is out of reasonable range",
                    code="IMPOSSIBLE_VALUE",
                    value=obs.value,
                )
                continue
            
            # Check physical limits
            unit = obs.unit
            if unit in self.MASS_LIMITS:
                min_val, max_val = self.MASS_LIMITS[unit]
                if obs.value < min_val:
                    result.add_error(
                        field=obs_prefix,
                        message=f"Observation value cannot be negative for {unit.value}",
                        code="NEGATIVE_VALUE",
                        value=obs.value,
                    )
                elif obs.value > max_val:
                    result.add_warning(
                        field=obs_prefix,
                        message=f"Observation value exceeds typical range for {unit.value}",
                        code="LARGE_VALUE",
                        value=obs.value,
                    )
            
            # Check for negative values (mass cannot be negative)
            if obs.value < 0:
                result.add_error(
                    field=obs_prefix,
                    message="Mass observation cannot be negative",
                    code="NEGATIVE_VALUE",
                    value=obs.value,
                )
            
            values.append(obs.value)
        
        # Check for duplicate observations
        if values:
            self._check_duplicates(values, prefix, result)
            
            # Check for impossible spread
            self._check_spread(values, prefix, result)
    
    def _check_duplicates(
        self,
        values: list[float],
        prefix: str,
        result: ValidationResult,
    ):
        """Check for duplicate observation values."""
        seen = {}
        for i, val in enumerate(values):
            if val in seen:
                result.add_warning(
                    field=f"{prefix}.observations",
                    message=f"Duplicate observation value detected: {val} (indices {seen[val]} and {i})",
                    code="DUPLICATE_OBSERVATION",
                    value=val,
                )
            else:
                seen[val] = i
    
    def _check_spread(
        self,
        values: list[float],
        prefix: str,
        result: ValidationResult,
    ):
        """Check for impossible spread in observations."""
        if len(values) < 2:
            return
        
        mean = sum(values) / len(values)
        if mean == 0:
            return
        
        min_val = min(values)
        max_val = max(values)
        relative_range = (max_val - min_val) / abs(mean) if mean != 0 else 0
        
        if relative_range > self.MAX_RELATIVE_DIFF:
            result.add_warning(
                field=f"{prefix}.observations",
                message=f"Large spread detected: range is {relative_range:.1%} of mean",
                code="LARGE_SPREAD",
                value=relative_range,
            )
    
    def validate_observations_complete(
        self,
        observations: list[RawObservation],
        required_count: int,
    ) -> ValidationResult:
        """
        Validate that sufficient observations are provided.
        
        Args:
            observations: List of observations
            required_count: Minimum number required
            
        Returns:
            ValidationResult
        """
        result = ValidationResult(is_valid=True)
        
        if len(observations) < required_count:
            result.add_error(
                field="observations",
                message=f"Required {required_count} observations, got {len(observations)}",
                code="INSUFFICIENT_OBSERVATIONS",
                value=len(observations),
            )
        
        return result
