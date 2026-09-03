"""
NAWI TestFlow — Compliance Engine

Evaluates test results against OIML R-76 compliance rules.
Determines overall compliance verdict for test reports.

This module has NO HTTP or database dependencies.
"""

from dataclasses import dataclass
from typing import Optional
from enum import Enum


class ComplianceVerdict(str, Enum):
    """Compliance verdict options."""
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non-compliant"
    CONDITIONAL = "conditional"
    PENDING = "pending"
    NOT_APPLICABLE = "not-applicable"


@dataclass
class ComplianceCheck:
    """Result of a single compliance check."""
    check_name: str
    passed: bool
    message: str
    severity: str  # 'error' or 'warning'


@dataclass
class ComplianceResult:
    """Complete compliance evaluation result."""
    verdict: ComplianceVerdict
    checks: list[ComplianceCheck]
    notes: Optional[str] = None


class ComplianceEngine:
    """
    Evaluate test compliance per OIML R-76.
    
    This engine checks:
    1. All required test cases are present
    2. All test points pass MPE requirements
    3. Environmental conditions are within range
    4. Documentation is complete
    """
    
    def evaluate_test_report(
        self,
        test_cases: list[dict],
        environmental_conditions: dict,
        instrument_data: dict,
        required_tests: list[str]
    ) -> ComplianceResult:
        """
        Evaluate complete test report compliance.
        
        Args:
            test_cases: List of test case results
            environmental_conditions: Environmental readings
            instrument_data: Instrument specifications
            required_tests: List of required test types
            
        Returns:
            ComplianceResult with verdict and detailed checks
        """
        checks = []
        
        # Check 1: All required test cases present
        checks.append(self._check_required_tests(test_cases, required_tests))
        
        # Check 2: All test points pass
        checks.append(self._check_test_point_verdicts(test_cases))
        
        # Check 3: Environmental conditions
        checks.append(self._check_environmental_conditions(environmental_conditions))
        
        # Check 4: Instrument specifications valid
        checks.append(self._check_instrument_specifications(instrument_data))
        
        # Determine overall verdict
        verdict = self._determine_verdict(checks)
        
        return ComplianceResult(
            verdict=verdict,
            checks=checks,
            notes=self._generate_notes(checks)
        )
    
    def _check_required_tests(
        self,
        test_cases: list[dict],
        required_tests: list[str]
    ) -> ComplianceCheck:
        """Check that all required test types are present."""
        present_types = {tc.get("case_type") for tc in test_cases}
        missing = set(required_tests) - present_types
        
        if not missing:
            return ComplianceCheck(
                check_name="required_tests",
                passed=True,
                message="All required test cases are present",
                severity="error"
            )
        else:
            return ComplianceCheck(
                check_name="required_tests",
                passed=False,
                message=f"Missing required tests: {', '.join(missing)}",
                severity="error"
            )
    
    def _check_test_point_verdicts(self, test_cases: list[dict]) -> ComplianceCheck:
        """Check that all test points pass MPE requirements."""
        failed_points = []
        
        for case in test_cases:
            for tp in case.get("test_points", []):
                if tp.get("verdict") == "fail":
                    failed_points.append(
                        f"{case.get('case_type')}: {tp.get('label', 'unknown')}"
                    )
        
        if not failed_points:
            return ComplianceCheck(
                check_name="test_point_verdicts",
                passed=True,
                message="All test points meet MPE requirements",
                severity="error"
            )
        else:
            return ComplianceCheck(
                check_name="test_point_verdicts",
                passed=False,
                message=f"Failed test points: {', '.join(failed_points[:5])}",
                severity="error"
            )
    
    def _check_environmental_conditions(self, conditions: dict) -> ComplianceCheck:
        """Check that environmental conditions are within acceptable range."""
        issues = []
        
        temp = conditions.get("temperature")
        humidity = conditions.get("humidity")
        
        # OIML R-76 typical ranges
        if temp is not None and (temp < -10 or temp > 40):
            issues.append(f"Temperature {temp}°C outside range (-10 to 40°C)")
        
        if humidity is not None and (humidity < 0 or humidity > 85):
            issues.append(f"Humidity {humidity}% outside range (0 to 85%)")
        
        if not issues:
            return ComplianceCheck(
                check_name="environmental_conditions",
                passed=True,
                message="Environmental conditions are within acceptable range",
                severity="warning"
            )
        else:
            return ComplianceCheck(
                check_name="environmental_conditions",
                passed=False,
                message="; ".join(issues),
                severity="warning"
            )
    
    def _check_instrument_specifications(self, instrument: dict) -> ComplianceCheck:
        """Check that instrument specifications are valid."""
        issues = []
        
        if not instrument.get("serial_number"):
            issues.append("Serial number missing")
        
        if not instrument.get("model"):
            issues.append("Instrument model missing")
        
        if not instrument.get("laboratory_id"):
            issues.append("Laboratory assignment missing")
        
        if not issues:
            return ComplianceCheck(
                check_name="instrument_specifications",
                passed=True,
                message="Instrument specifications are complete",
                severity="error"
            )
        else:
            return ComplianceCheck(
                check_name="instrument_specifications",
                passed=False,
                message="; ".join(issues),
                severity="error"
            )
    
    def _determine_verdict(self, checks: list[ComplianceCheck]) -> ComplianceVerdict:
        """Determine overall compliance verdict from checks."""
        error_checks = [c for c in checks if c.severity == "error"]
        
        # If any error check failed, non-compliant
        if any(not c.passed for c in error_checks):
            return ComplianceVerdict.NON_COMPLIANT
        
        # If all error checks passed but warnings exist, conditional
        warning_checks = [c for c in checks if c.severity == "warning"]
        if any(not c.passed for c in warning_checks):
            return ComplianceVerdict.CONDITIONAL
        
        # All checks passed
        return ComplianceVerdict.COMPLIANT
    
    def _generate_notes(self, checks: list[ComplianceCheck]) -> str:
        """Generate human-readable notes from checks."""
        notes = []
        for check in checks:
            if not check.passed:
                notes.append(f"[{check.severity.upper()}] {check.check_name}: {check.message}")
        return "\n".join(notes) if notes else None
