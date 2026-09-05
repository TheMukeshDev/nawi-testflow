"""
NAWI Sahayak — Engine Orchestrator

Main entry point for the calculation engine.
Orchestrates the complete pipeline:
    Raw Observation
    → Input Validation
    → Normalization
    → Calculation
    → Rule Resolution
    → Compliance Evaluation
    → Result

This module is completely independent from UI and HTTP layers.
"""

from datetime import datetime
from typing import Optional

from .types import (
    TestInput,
    TestPointInput,
    RawObservation,
    TestStatusCode,
    MassUnit,
    InstrumentClass,
    CalculationResult,
    ComplianceResult,
    ComplianceDecision,
    EngineResult,
    ApplicableLimit,
)
from .validation import InputValidator
from .normalization import UnitNormalizer
from .calculations import Calculations, CalculationError
from .rules import RuleResolver, RuleStore, create_default_rule_store
from .compliance import ComplianceEvaluator


class CalculationEngine:
    """
    Main calculation engine orchestrator.
    
    Processes test inputs through the complete pipeline and produces
    deterministic, reproducible results.
    
    Usage:
        engine = CalculationEngine()
        result = engine.execute(test_input)
    """
    
    def __init__(self, rule_store: Optional[RuleStore] = None):
        """
        Initialize the calculation engine.
        
        Args:
            rule_store: Optional custom rule store.
                       If None, uses default OIML R-76 rules.
        """
        self.rule_store = rule_store or create_default_rule_store()
        self.validator = InputValidator()
        self.normalizer = UnitNormalizer()
        self.calculator = Calculations()
        self.rule_resolver = RuleResolver(self.rule_store)
        self.compliance_evaluator = ComplianceEvaluator(self.rule_store)
    
    def execute(self, test_input: TestInput) -> EngineResult:
        """
        Execute the complete calculation pipeline.
        
        Args:
            test_input: Complete test input
            
        Returns:
            EngineResult with validation, calculation, and compliance results
        """
        result = EngineResult(test_code=test_input.test_code)
        
        # Step 1: Input Validation
        validation_result = self.validator.validate_test_input(test_input)
        result.validation = validation_result
        
        # If validation fails, return early
        if not validation_result.is_valid:
            result.calculation_result = CalculationResult(
                test_code=test_input.test_code,
                test_name=self._get_test_name(test_input.test_code),
                input_observations=[],
                calculated_values={},
                applicable_limit=None,
                unit=test_input.scale_interval_unit.value,
                status=TestStatusCode.INVALID_INPUT,
                validation_errors=validation_result.errors,
                calculated_at=datetime.utcnow(),
            )
            return result
        
        # Step 2: Resolve Rules
        # MPE-based tests (WGT, ECC) resolve the limit at the applied load.
        # Provide load and scale_interval so the resolver returns the
        # official OIML R 76-1 MPE(L) rather than an invented constant.
        reference_load = None
        if test_input.test_points:
            reference_load = test_input.test_points[0].reference_value

        applicable_limit = self.rule_resolver.resolve_rule(
            test_code=test_input.test_code,
            instrument_class=test_input.instrument_class,
            load=reference_load,
            scale_interval=test_input.scale_interval,
        )
        
        if applicable_limit is None:
            # Rule not configured
            result.calculation_result = CalculationResult(
                test_code=test_input.test_code,
                test_name=self._get_test_name(test_input.test_code),
                input_observations=self._serialize_observations(test_input),
                calculated_values={},
                applicable_limit=None,
                unit=test_input.scale_interval_unit.value,
                status=TestStatusCode.RULE_NOT_CONFIGURED,
                validation_errors=[],
                details=f"No compliance rule found for test {test_input.test_code} "
                        f"with instrument class {test_input.instrument_class.value}",
                calculated_at=datetime.utcnow(),
            )
            return result
        
        # Step 3: Perform Calculations
        try:
            calc_result = self._perform_calculations(test_input, applicable_limit)
            result.calculation_result = calc_result
        except CalculationError as e:
            result.calculation_result = CalculationResult(
                test_code=test_input.test_code,
                test_name=self._get_test_name(test_input.test_code),
                input_observations=self._serialize_observations(test_input),
                calculated_values={},
                applicable_limit=applicable_limit,
                unit=test_input.scale_interval_unit.value,
                status=TestStatusCode.CALCULATION_ERROR,
                validation_errors=[],
                details=str(e),
                calculated_at=datetime.utcnow(),
            )
            return result
        
        # Step 4: Evaluate Compliance (using dedicated evaluator)
        compliance_decisions = self.compliance_evaluator.evaluate(
            test_input, calc_result, result.validation
        )
        
        # Build compliance result with decisions
        overall_status = compliance_decisions[0].decision if compliance_decisions else TestStatusCode.INCOMPLETE
        compliance_result = ComplianceResult(
            test_code=test_input.test_code,
            test_name=calc_result.test_name,
            overall_status=overall_status,
            point_results=[calc_result.to_dict()],
            validation_summary={
                "total_observations": sum(
                    len(tp.observations) for tp in test_input.test_points
                ),
                "test_points": len(test_input.test_points),
            },
            decisions=compliance_decisions,
            calculated_at=calc_result.calculated_at,
            details=calc_result.details,
        )
        result.compliance_result = compliance_result
        
        return result
    
    def _perform_calculations(
        self,
        test_input: TestInput,
        applicable_limit: ApplicableLimit,
    ) -> CalculationResult:
        """Perform calculations based on test type."""
        
        if test_input.test_code == "WGT":
            return self._calculate_weighing(test_input, applicable_limit)
        elif test_input.test_code == "RPT":
            return self._calculate_repeatability(test_input, applicable_limit)
        elif test_input.test_code == "ECC":
            return self._calculate_eccentricity(test_input, applicable_limit)
        elif test_input.test_code == "DIS":
            return self._calculate_discrimination(test_input, applicable_limit)
        elif test_input.test_code == "LIN":
            return self._calculate_linearity(test_input, applicable_limit)
        elif test_input.test_code == "STB":
            return self._calculate_stability(test_input, applicable_limit)
        else:
            raise CalculationError(f"Unknown test code: {test_input.test_code}")
    
    def _calculate_weighing(
        self,
        test_input: TestInput,
        applicable_limit: ApplicableLimit,
    ) -> CalculationResult:
        """
        Calculate the gross-load weighing test result.

        Per OIML R 76-2, for each applied load L:
            E   = I + ½·e − ΔL − L
            E_c = E − E₀
        The test PASSES for that load if |E_c| ≤ MPE(L).

        Inputs via ``additional_inputs``:
            - "zero_error_E0": the zero/initial error E₀ (default 0)
            - "small_added_load_delta_L": the small load ΔL added at the
              changeover point (default 0)
        """
        if not test_input.test_points:
            raise CalculationError("No test points provided for weighing test")

        zero_error = float(test_input.additional_inputs.get("zero_error_E0", 0.0))
        small_added = float(
            test_input.additional_inputs.get("small_added_load_delta_L", 0.0)
        )

        all_errors = []
        max_abs_ec = 0.0
        worst_point = None

        for point in test_input.test_points:
            obs = self.normalizer.normalize_observations(point.observations, point.unit)
            stats = self.calculator.calculate_observation_statistics(obs)
            indication = stats.mean

            result = self.calculator.weighing_error(
                indication=indication,
                small_added_load=small_added,
                applied_load=point.reference_value,
                scale_interval=test_input.scale_interval,
                zero_error=zero_error,
            )
            ec = result["E_c"]
            all_errors.append({
                "point": point.point_label,
                "E": result["E"],
                "E_c": ec,
            })
            if abs(ec) > max_abs_ec:
                max_abs_ec = abs(ec)
                worst_point = point.point_label

        mpe_value = applicable_limit.value
        limit_in_units = mpe_value * test_input.scale_interval

        calculated_values = {
            "max_abs_ec": max_abs_ec,
            "worst_point": worst_point if worst_point else "",
            "limit_e": mpe_value,
            "limit_units": limit_in_units,
        }
        for entry in all_errors:
            calculated_values[f"E_{entry['point']}"] = entry["E"]
            calculated_values[f"Ec_{entry['point']}"] = entry["E_c"]

        status = (
            TestStatusCode.PASS if max_abs_ec <= limit_in_units
            else TestStatusCode.FAIL
        )

        return CalculationResult(
            test_code=test_input.test_code,
            test_name="Weighing (Gross Load)",
            input_observations=self._serialize_observations(test_input),
            calculated_values=calculated_values,
            applicable_limit=applicable_limit,
            unit=test_input.scale_interval_unit.value,
            status=status,
            rule_id=applicable_limit.rule_id,
            rule_version=applicable_limit.rule_version,
            calculated_at=datetime.utcnow(),
            details=(
                f"Max |E_c|: {max_abs_ec:.4f} {test_input.scale_interval_unit.value}, "
                f"MPE(L): ±{limit_in_units:.4f} {test_input.scale_interval_unit.value}"
            ),
        )
    
    def _calculate_repeatability(
        self,
        test_input: TestInput,
        applicable_limit: ApplicableLimit,
    ) -> CalculationResult:
        """Calculate repeatability test results."""
        
        if not test_input.test_points:
            raise CalculationError("No test points provided")
        
        point = test_input.test_points[0]  # Repeatability uses first test point
        
        if not point.observations:
            raise CalculationError("No observations provided")
        
        # Normalize observations to test point unit
        normalized_obs = self.normalizer.normalize_observations(
            point.observations, point.unit
        )
        
        # Calculate statistics
        stats = self.calculator.calculate_observation_statistics(normalized_obs)
        
        # Get reference value
        reference_value = point.reference_value
        
        # Calculate deviation and error (statistics are already in the test
        # point unit; scale_interval/reference use the same unit)
        mean_in_unit = stats.mean
        deviation = self.calculator.deviation_from_reference(mean_in_unit, reference_value)
        abs_error = self.calculator.absolute_error(mean_in_unit, reference_value)
        
        # Calculate values
        calculated_values = {
            "mean": stats.mean,
            "std_deviation": stats.std_deviation,
            "min_value": stats.min_value,
            "max_value": stats.max_value,
            "range": stats.range,
            "coefficient_of_variation": stats.coefficient_of_variation,
            "deviation_from_reference": deviation,
            "absolute_error": abs_error,
        }
        
        # Determine status
        # Compare std_dev to limit (in scale intervals)
        scale_interval = test_input.scale_interval
        std_dev_in_d = stats.std_deviation / scale_interval if scale_interval > 0 else 0
        
        if std_dev_in_d <= applicable_limit.value:
            status = TestStatusCode.PASS
        else:
            status = TestStatusCode.FAIL
        
        return CalculationResult(
            test_code=test_input.test_code,
            test_name="Repeatability",
            input_observations=self._serialize_observations(test_input),
            calculated_values=calculated_values,
            applicable_limit=applicable_limit,
            unit=point.unit.value,
            status=status,
            rule_id=applicable_limit.rule_id,
            rule_version=applicable_limit.rule_version,
            calculated_at=datetime.utcnow(),
            details=f"Std dev: {std_dev_in_d:.4f} d, Limit: {applicable_limit.value} d",
        )
    
    def _calculate_eccentricity(
        self,
        test_input: TestInput,
        applicable_limit: ApplicableLimit,
    ) -> CalculationResult:
        """Calculate eccentricity test results."""
        
        if len(test_input.test_points) < 2:
            raise CalculationError(
                "Eccentricity test requires at least 2 test points "
                "(center and one edge)"
            )
        
        # Find center and edge readings
        center_point = None
        edge_points = {}
        
        for point in test_input.test_points:
            if point.point_label.lower() == "center":
                center_point = point
            else:
                edge_points[point.point_label] = point
        
        if center_point is None:
            raise CalculationError("Center reading not found")
        
        if not edge_points:
            raise CalculationError("No edge readings found")
        
        # Get center reading (mean of observations)
        center_obs = self.normalizer.normalize_observations(
            center_point.observations, center_point.unit
        )
        center_stats = self.calculator.calculate_observation_statistics(center_obs)
        
        # Get edge readings (mean of observations for each edge)
        edge_readings = {}
        for label, edge_point in edge_points.items():
            edge_obs = self.normalizer.normalize_observations(
                edge_point.observations, edge_point.unit
            )
            edge_stats = self.calculator.calculate_observation_statistics(edge_obs)
            edge_readings[label] = edge_stats.mean
        
        # Calculate eccentricity
        ecc_result = self.calculator.calculate_eccentricity(
            center_reading=center_stats.mean,
            edge_readings=edge_readings,
        )
        
        # Calculate values
        calculated_values = {
            "center_reading": center_stats.mean,
            "max_absolute_deviation": ecc_result["max_absolute_deviation"],
            "max_deviation_position": ecc_result["max_deviation_position"],
        }
        
        # Add individual deviations
        for pos, dev in ecc_result["deviations"].items():
            calculated_values[f"deviation_{pos}"] = dev
        
        # Determine status
        scale_interval = test_input.scale_interval
        deviation_in_d = ecc_result["max_absolute_deviation"] / scale_interval if scale_interval > 0 else 0
        
        if deviation_in_d <= applicable_limit.value:
            status = TestStatusCode.PASS
        else:
            status = TestStatusCode.FAIL
        
        return CalculationResult(
            test_code=test_input.test_code,
            test_name="Eccentricity",
            input_observations=self._serialize_observations(test_input),
            calculated_values=calculated_values,
            applicable_limit=applicable_limit,
            unit=center_point.unit.value,
            status=status,
            rule_id=applicable_limit.rule_id,
            rule_version=applicable_limit.rule_version,
            calculated_at=datetime.utcnow(),
            details=f"Max deviation: {deviation_in_d:.4f} d, Limit: {applicable_limit.value} d",
        )
    
    def _calculate_discrimination(
        self,
        test_input: TestInput,
        applicable_limit: ApplicableLimit,
    ) -> CalculationResult:
        """Calculate discrimination test results."""
        
        if len(test_input.test_points) < 2:
            raise CalculationError(
                "Discrimination test requires 2 test points "
                "(before and after)"
            )
        
        # Get readings
        before_point = None
        after_point = None
        
        for point in test_input.test_points:
            if "before" in point.point_label.lower():
                before_point = point
            elif "after" in point.point_label.lower():
                after_point = point
        
        if before_point is None or after_point is None:
            raise CalculationError("Before/after readings not found")
        
        # Calculate means
        before_obs = self.normalizer.normalize_observations(
            before_point.observations, before_point.unit
        )
        before_stats = self.calculator.calculate_observation_statistics(before_obs)
        
        after_obs = self.normalizer.normalize_observations(
            after_point.observations, after_point.unit
        )
        after_stats = self.calculator.calculate_observation_statistics(after_obs)
        
        # Get discrimination weight from additional inputs
        disc_weight = test_input.additional_inputs.get("discrimination_weight", 0)
        
        # Calculate discrimination
        disc_result = self.calculator.calculate_discrimination(
            reading_before=before_stats.mean,
            reading_after=after_stats.mean,
            discrimination_weight=disc_weight,
        )
        
        calculated_values = {
            "reading_before": before_stats.mean,
            "reading_after": after_stats.mean,
            "measured_discrimination": disc_result["measured_discrimination"],
            "discrimination_error": disc_result["discrimination_error"],
            "is_detected": 1.0 if disc_result["is_detected"] else 0.0,
        }
        
        # Determine status
        status = TestStatusCode.PASS if disc_result["is_detected"] else TestStatusCode.FAIL
        
        return CalculationResult(
            test_code=test_input.test_code,
            test_name="Discrimination",
            input_observations=self._serialize_observations(test_input),
            calculated_values=calculated_values,
            applicable_limit=applicable_limit,
            unit=before_point.unit.value,
            status=status,
            rule_id=applicable_limit.rule_id,
            rule_version=applicable_limit.rule_version,
            calculated_at=datetime.utcnow(),
            details=f"Detected: {disc_result['is_detected']}",
        )
    
    def _calculate_linearity(
        self,
        test_input: TestInput,
        applicable_limit: ApplicableLimit,
    ) -> CalculationResult:
        """Calculate linearity test results."""
        
        if not test_input.test_points:
            raise CalculationError("No test points provided")
        
        # Calculate mean for each test point
        point_means = []
        for point in test_input.test_points:
            obs = self.normalizer.normalize_observations(
                point.observations, point.unit
            )
            stats = self.calculator.calculate_observation_statistics(obs)
            point_means.append({
                "label": point.point_label,
                "reference": point.reference_value,
                "measured": stats.mean,
            })
        
        # Calculate linearity error
        max_error = 0
        for pm in point_means:
            error = abs(pm["measured"] - pm["reference"])
            if error > max_error:
                max_error = error
        
        calculated_values = {
            "max_linearity_error": max_error,
        }
        
        # Add individual errors
        for pm in point_means:
            error = abs(pm["measured"] - pm["reference"])
            calculated_values[f"error_{pm['label']}"] = error
        
        # Determine status
        scale_interval = test_input.scale_interval
        error_in_d = max_error / scale_interval if scale_interval > 0 else 0
        
        if error_in_d <= applicable_limit.value:
            status = TestStatusCode.PASS
        else:
            status = TestStatusCode.FAIL
        
        return CalculationResult(
            test_code=test_input.test_code,
            test_name="Linearity",
            input_observations=self._serialize_observations(test_input),
            calculated_values=calculated_values,
            applicable_limit=applicable_limit,
            unit=test_input.test_points[0].unit.value,
            status=status,
            rule_id=applicable_limit.rule_id,
            rule_version=applicable_limit.rule_version,
            calculated_at=datetime.utcnow(),
            details=f"Max error: {error_in_d:.4f} d, Limit: {applicable_limit.value} d",
        )
    
    def _calculate_stability(
        self,
        test_input: TestInput,
        applicable_limit: ApplicableLimit,
    ) -> CalculationResult:
        """Calculate stability test results."""
        
        if len(test_input.test_points) < 2:
            raise CalculationError(
                "Stability test requires 2 test points "
                "(initial and final readings)"
            )
        
        # Get initial and final readings
        initial_point = test_input.test_points[0]
        final_point = test_input.test_points[1]
        
        initial_obs = self.normalizer.normalize_observations(
            initial_point.observations, initial_point.unit
        )
        initial_stats = self.calculator.calculate_observation_statistics(initial_obs)
        
        final_obs = self.normalizer.normalize_observations(
            final_point.observations, final_point.unit
        )
        final_stats = self.calculator.calculate_observation_statistics(final_obs)
        
        # Calculate drift
        drift = final_stats.mean - initial_stats.mean
        
        calculated_values = {
            "initial_reading": initial_stats.mean,
            "final_reading": final_stats.mean,
            "drift": drift,
            "absolute_drift": abs(drift),
        }
        
        # Determine status
        scale_interval = test_input.scale_interval
        drift_in_d = abs(drift) / scale_interval if scale_interval > 0 else 0
        
        if drift_in_d <= applicable_limit.value:
            status = TestStatusCode.PASS
        else:
            status = TestStatusCode.FAIL
        
        return CalculationResult(
            test_code=test_input.test_code,
            test_name="Stability",
            input_observations=self._serialize_observations(test_input),
            calculated_values=calculated_values,
            applicable_limit=applicable_limit,
            unit=initial_point.unit.value,
            status=status,
            rule_id=applicable_limit.rule_id,
            rule_version=applicable_limit.rule_version,
            calculated_at=datetime.utcnow(),
            details=f"Drift: {drift_in_d:.4f} d, Limit: {applicable_limit.value} d",
        )
    

    
    def _serialize_observations(self, test_input: TestInput) -> list[dict]:
        """Serialize observations for storage."""
        serialized = []
        for point in test_input.test_points:
            for obs in point.observations:
                serialized.append({
                    "point_label": point.point_label,
                    "reference_value": point.reference_value,
                    "observation_number": obs.observation_number,
                    "value": obs.value,
                    "unit": obs.unit.value,
                    "notes": obs.notes,
                })
        return serialized
    
    def _get_test_name(self, test_code: str) -> str:
        """Get human-readable test name."""
        names = {
            "WGT": "Weighing (Gross Load)",
            "RPT": "Repeatability",
            "ECC": "Eccentricity",
            "LIN": "Linearity",
            "DIS": "Discrimination",
            "STB": "Stability",
        }
        return names.get(test_code, test_code)
