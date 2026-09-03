"""
NAWI TestFlow — Calculation Engine

OIML R-76 calculations for:
- Mean and standard deviation
- Maximum permissible error (MPE)
- Error at test points
- Compliance evaluation

This module has NO HTTP or database dependencies.
All functions are pure and testable.
"""

from dataclasses import dataclass
from typing import Optional
import math


@dataclass
class TestPointResult:
    """Result of evaluating a single test point."""
    test_point_label: str
    test_point_value: float
    measured_values: list[float]
    mean: float
    std_deviation: float
    deviation_from_reference: float
    calculated_error: float
    max_permissible_error: float
    verdict: str  # 'pass' or 'fail'


@dataclass
class TestCaseResult:
    """Result of evaluating a complete test case."""
    case_type: str
    test_points: list[TestPointResult]
    overall_verdict: str  # 'pass' or 'fail'


@dataclass
class ReportCalculationResult:
    """Complete calculation result for a test report."""
    test_cases: list[TestCaseResult]
    overall_verdict: str  # 'compliant', 'non-compliant', 'conditional'
    calculation_timestamp: str


class CalculationEngine:
    """
    OIML R-76 calculation engine.
    
    All methods are pure functions with no side effects.
    Each method is independently testable.
    """
    
    def calculate_mean(self, values: list[float]) -> float:
        """
        Calculate arithmetic mean.
        
        Args:
            values: List of measured values
            
        Returns:
            Arithmetic mean
            
        Raises:
            ValueError: If values list is empty
        """
        if not values:
            raise ValueError("Cannot calculate mean of empty list")
        return sum(values) / len(values)
    
    def calculate_std_dev(self, values: list[float]) -> float:
        """
        Calculate sample standard deviation.
        
        Args:
            values: List of measured values (minimum 2 required)
            
        Returns:
            Sample standard deviation
            
        Raises:
            ValueError: If fewer than 2 values provided
        """
        if len(values) < 2:
            raise ValueError("Standard deviation requires at least 2 values")
        
        mean = self.calculate_mean(values)
        squared_diffs = [(x - mean) ** 2 for x in values]
        variance = sum(squared_diffs) / (len(values) - 1)
        return math.sqrt(variance)
    
    def calculate_mpe(
        self,
        instrument_class: str,
        scale_divisions: int,
        test_point_fraction: float,
        mpe_table: dict
    ) -> float:
        """
        Calculate maximum permissible error per OIML R-76.
        
        Args:
            instrument_class: Instrument class (I, II, III, IIII, IIIIL)
            scale_divisions: Number of verification scale divisions (n)
            test_point_fraction: Test point as fraction of capacity (e.g., 0.5 for 50%)
            mpe_table: MPE lookup table from compliance rules
            
        Returns:
            Maximum permissible error value
        """
        # Find applicable MPE rule
        class_rules = mpe_table.get("rules", [])
        
        for rule in class_rules:
            if rule["min_divisions"] <= scale_divisions <= rule["max_divisions"]:
                if test_point_fraction >= 0.5:
                    return rule["mpe_1e"]
                else:
                    return rule["mpe_0_5e"]
        
        # Default MPE if no rule found
        raise ValueError(
            f"No MPE rule found for class {instrument_class} "
            f"with {scale_divisions} divisions"
        )
    
    def calculate_error(
        self,
        measured_mean: float,
        reference_value: float
    ) -> float:
        """
        Calculate absolute error at a test point.
        
        Args:
            measured_mean: Mean of measured values
            reference_value: Reference/marked value
            
        Returns:
            Absolute error
        """
        return abs(measured_mean - reference_value)
    
    def evaluate_test_point(
        self,
        test_point_label: str,
        test_point_value: float,
        measured_values: list[float],
        mpe: float
    ) -> TestPointResult:
        """
        Evaluate a single test point.
        
        Args:
            test_point_label: Label for the test point (e.g., "0.5e")
            test_point_value: Reference value at this test point
            measured_values: List of measured values
            mpe: Maximum permissible error
            
        Returns:
            TestPointResult with all calculated values and verdict
        """
        mean = self.calculate_mean(measured_values)
        std_dev = self.calculate_std_dev(measured_values) if len(measured_values) > 1 else 0.0
        deviation = mean - test_point_value
        error = self.calculate_error(mean, test_point_value)
        
        return TestPointResult(
            test_point_label=test_point_label,
            test_point_value=test_point_value,
            measured_values=measured_values,
            mean=round(mean, 6),
            std_deviation=round(std_dev, 6),
            deviation_from_reference=round(deviation, 6),
            calculated_error=round(error, 6),
            max_permissible_error=round(mpe, 6),
            verdict="pass" if error <= mpe else "fail"
        )
    
    def evaluate_test_case(
        self,
        case_type: str,
        test_points: list[TestPointResult]
    ) -> TestCaseResult:
        """
        Evaluate a complete test case (e.g., all repeatability points).
        
        Args:
            case_type: Type of test (repeatability, eccentricity, etc.)
            test_points: List of evaluated test points
            
        Returns:
            TestCaseResult with overall verdict
        """
        verdicts = [tp.verdict for tp in test_points]
        overall = "pass" if all(v == "pass" for v in verdicts) else "fail"
        
        return TestCaseResult(
            case_type=case_type,
            test_points=test_points,
            overall_verdict=overall
        )
    
    def evaluate_compliance(
        self,
        test_cases: list[TestCaseResult]
    ) -> str:
        """
        Evaluate overall compliance for a test report.
        
        Args:
            test_cases: List of evaluated test cases
            
        Returns:
            Compliance verdict: 'compliant', 'non-compliant', or 'conditional'
        """
        if not test_cases:
            return "pending"
        
        verdicts = [tc.overall_verdict for tc in test_cases]
        
        if all(v == "pass" for v in verdicts):
            return "compliant"
        elif any(v == "fail" for v in verdicts):
            return "non-compliant"
        else:
            return "conditional"
    
    def run_full_calculation(
        self,
        test_data: dict,
        mpe_table: dict
    ) -> ReportCalculationResult:
        """
        Run complete calculation for a test report.
        
        Args:
            test_data: Dictionary containing test cases and observations
            mpe_table: MPE lookup table from compliance rules
            
        Returns:
            ReportCalculationResult with all calculations
        """
        results = []
        
        for case in test_data.get("test_cases", []):
            case_type = case["case_type"]
            test_points = []
            
            for tp in case.get("test_points", []):
                measured_values = tp["measured_values"]
                test_point_value = tp["test_point_value"]
                
                # Calculate MPE
                mpe = self.calculate_mpe(
                    instrument_class=test_data.get("instrument_class", "III"),
                    scale_divisions=test_data.get("scale_divisions", 3000),
                    test_point_fraction=test_point_value / test_data.get("capacity", 1),
                    mpe_table=mpe_table
                )
                
                # Evaluate test point
                result = self.evaluate_test_point(
                    test_point_label=tp["label"],
                    test_point_value=test_point_value,
                    measured_values=measured_values,
                    mpe=mpe
                )
                test_points.append(result)
            
            # Evaluate test case
            case_result = self.evaluate_test_case(case_type, test_points)
            results.append(case_result)
        
        # Evaluate overall compliance
        overall = self.evaluate_compliance(results)
        
        return ReportCalculationResult(
            test_cases=results,
            overall_verdict=overall,
            calculation_timestamp=""
        )
