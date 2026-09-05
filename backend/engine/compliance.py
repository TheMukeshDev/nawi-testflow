"""
NAWI Sahayak — Compliance Evaluation Engine

Deterministic, versioned compliance evaluation for OIML R-76 tests.

Architecture:
    Rule Repository
    → Rule Resolver
    → Calculation Results
    → Compliance Evaluator
    → Compliance Decision

Every result identifies:
    - standard
    - standard_version
    - rule_id
    - rule_version
    - test_code
    - calculated_value
    - applicable_limit
    - decision
    - reason

Possible states:
    PASS — Calculated value within limit
    FAIL — Calculated value exceeds limit
    NOT_APPLICABLE — Test not required for this configuration
    INCOMPLETE — Insufficient data to make a determination
    RULE_NOT_CONFIGURED — Required rule does not exist

CRITICAL INVARIANTS:
    1. Never return PASS or FAIL when the required rule is missing
    2. Never allow an LLM to determine compliance
    3. Every decision must be traceable to a specific rule version
    4. Every decision must include a clear human-readable explanation
    5. Never claim legal certification or regulatory approval
"""

from datetime import datetime
from typing import Optional

from .types import (
    TestInput,
    TestStatusCode,
    InstrumentClass,
    MassUnit,
    CalculationResult,
    ComplianceResult,
    ComplianceDecision,
    ComplianceExplanation,
    ApplicableLimit,
    ValidationResult,
)
from .rules import RuleResolver, RuleStore, ComplianceRule, create_default_rule_store


class ComplianceEvaluator:
    """
    Evaluates compliance against configured, versioned rules.

    This is the ONLY module that determines PASS/FAIL status.
    The calculation engine computes values; this engine compares them to limits.

    Design principles:
    - Deterministic: Same inputs always produce the same decision
    - Traceable: Every decision cites a specific rule and version
    - Conservative: When in doubt, return INCOMPLETE or RULE_NOT_CONFIGURED
    - Never guesses: Missing rules -> RULE_NOT_CONFIGURED
    """

    def __init__(self, rule_store: Optional[RuleStore] = None):
        self.rule_store = rule_store or create_default_rule_store()
        self.rule_resolver = RuleResolver(self.rule_store)

    def evaluate(
        self,
        test_input: TestInput,
        calculation_result: Optional[CalculationResult] = None,
        validation: Optional[ValidationResult] = None,
    ) -> list[ComplianceDecision]:
        """
        Evaluate compliance for a test.

        Args:
            test_input: The original test input
            calculation_result: Result from the calculation engine
            validation: Validation result (to check for data completeness)

        Returns:
            List of ComplianceDecision (one per evaluated parameter)
        """
        decisions = []

        # Case 1: Input validation failed -> INCOMPLETE
        if validation and not validation.is_valid:
            decisions.append(self._make_incomplete_decision(
                test_input=test_input,
                reason="Input validation failed. Cannot evaluate compliance.",
                validation_errors=validation.errors,
            ))
            return decisions

        # Case 2: No calculation result -> INCOMPLETE
        if calculation_result is None:
            decisions.append(self._make_incomplete_decision(
                test_input=test_input,
                reason="No calculation result available. Cannot evaluate compliance.",
            ))
            return decisions

        # Case 3: Calculation produced INVALID_INPUT -> INCOMPLETE
        if calculation_result.status == TestStatusCode.INVALID_INPUT:
            decisions.append(self._make_incomplete_decision(
                test_input=test_input,
                reason="Calculation input was invalid. Cannot evaluate compliance.",
            ))
            return decisions

        # Case 4: Calculation produced CALCULATION_ERROR -> INCOMPLETE
        if calculation_result.status == TestStatusCode.CALCULATION_ERROR:
            decisions.append(self._make_incomplete_decision(
                test_input=test_input,
                reason="Calculation error: " + (calculation_result.details or "unknown error"),
            ))
            return decisions

        # Case 5: Rule not configured -> RULE_NOT_CONFIGURED
        if calculation_result.status == TestStatusCode.RULE_NOT_CONFIGURED:
            limit = calculation_result.applicable_limit
            decisions.append(ComplianceDecision(
                standard="OIML R-76",
                standard_version=limit.rule_version if limit else "unknown",
                rule_id=limit.rule_id if limit else "none",
                rule_version=limit.rule_version if limit else "unknown",
                test_code=test_input.test_code,
                test_name=calculation_result.test_name,
                calculated_value=None,
                calculated_unit=calculation_result.unit,
                applicable_limit=None,
                limit_unit="",
                decision=TestStatusCode.RULE_NOT_CONFIGURED,
                reason=(
                    "No compliance rule configured for test '"
                    + test_input.test_code
                    + "' with instrument class '"
                    + test_input.instrument_class.value
                    + "'. A PASS or FAIL determination cannot be made."
                ),
                evaluated_at=datetime.utcnow(),
            ))
            return decisions

        # Case 6: Normal evaluation
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
            decisions.append(ComplianceDecision(
                standard="unknown",
                standard_version="unknown",
                rule_id="none",
                rule_version="unknown",
                test_code=test_input.test_code,
                test_name=calculation_result.test_name,
                calculated_value=None,
                calculated_unit=calculation_result.unit,
                applicable_limit=None,
                limit_unit="",
                decision=TestStatusCode.RULE_NOT_CONFIGURED,
                reason=(
                    "Rule could not be resolved for test '"
                    + test_input.test_code
                    + "' with instrument class '"
                    + test_input.instrument_class.value + "'."
                ),
                evaluated_at=datetime.utcnow(),
            ))
            return decisions

        # Perform test-specific evaluation
        test_code = test_input.test_code

        if test_code == "WGT":
            decisions.append(self._evaluate_weighing(
                test_input, calculation_result, applicable_limit
            ))
        elif test_code == "RPT":
            decisions.append(self._evaluate_repeatability(
                test_input, calculation_result, applicable_limit
            ))
        elif test_code == "ECC":
            decisions.append(self._evaluate_eccentricity(
                test_input, calculation_result, applicable_limit
            ))
        elif test_code == "LIN":
            decisions.append(self._evaluate_linearity(
                test_input, calculation_result, applicable_limit
            ))
        elif test_code == "DIS":
            decisions.append(self._evaluate_discrimination(
                test_input, calculation_result, applicable_limit
            ))
        elif test_code == "STB":
            decisions.append(self._evaluate_stability(
                test_input, calculation_result, applicable_limit
            ))
        else:
            decisions.append(self._make_incomplete_decision(
                test_input=test_input,
                reason="Unknown test code '" + test_code + "'. Cannot evaluate compliance.",
            ))

        return decisions

    def evaluate_all(
        self,
        test_inputs: list[TestInput],
        calculation_results: dict[str, CalculationResult],
    ) -> list[ComplianceDecision]:
        """Evaluate compliance for multiple tests."""
        all_decisions = []
        for test_input in test_inputs:
            calc_result = calculation_results.get(test_input.test_code)
            decisions = self.evaluate(test_input, calc_result)
            all_decisions.extend(decisions)
        return all_decisions

    # ====================================================================
    # TEST-SPECIFIC EVALUATORS
    # ====================================================================

    def _evaluate_repeatability(
        self,
        test_input: TestInput,
        calc_result: CalculationResult,
        applicable_limit: ApplicableLimit,
    ) -> ComplianceDecision:
        """Evaluate repeatability compliance."""
        std_dev = calc_result.calculated_values.get("std_deviation", 0)
        scale_interval = test_input.scale_interval
        std_dev_in_d = std_dev / scale_interval if scale_interval > 0 else 0

        limit_value = applicable_limit.value
        margin = limit_value - std_dev_in_d
        is_within = std_dev_in_d <= limit_value

        explanation = ComplianceExplanation(
            parameter_name="Standard Deviation (in scale intervals)",
            observed_value=round(std_dev_in_d, 6),
            observed_unit="d",
            allowed_value=limit_value,
            allowed_unit=applicable_limit.unit,
            difference=round(std_dev_in_d - limit_value, 6),
            margin=round(margin, 6),
            is_within_limit=is_within,
            comparison_operator="<=",
        )

        if is_within:
            decision = TestStatusCode.PASS
            reason = (
                "Standard deviation of {:.4f} d is within "
                "the maximum allowed {} d. "
                "Margin: {:.4f} d remaining. "
                "Rule: {} v{}."
            ).format(std_dev_in_d, limit_value, margin,
                     applicable_limit.rule_id, applicable_limit.rule_version)
        else:
            excess = std_dev_in_d - limit_value
            decision = TestStatusCode.FAIL
            reason = (
                "Standard deviation of {:.4f} d exceeds "
                "the maximum allowed {} d by {:.4f} d. "
                "Rule: {} v{}."
            ).format(std_dev_in_d, limit_value, excess,
                     applicable_limit.rule_id, applicable_limit.rule_version)

        return ComplianceDecision(
            standard="OIML R-76",
            standard_version=applicable_limit.rule_version,
            rule_id=applicable_limit.rule_id,
            rule_version=applicable_limit.rule_version,
            test_code="RPT",
            test_name="Repeatability",
            calculated_value=round(std_dev_in_d, 6),
            calculated_unit="d",
            applicable_limit=limit_value,
            limit_unit=applicable_limit.unit,
            decision=decision,
            reason=reason,
            explanations=[explanation],
            evaluated_at=datetime.utcnow(),
        )

    def _evaluate_eccentricity(
        self,
        test_input: TestInput,
        calc_result: CalculationResult,
        applicable_limit: ApplicableLimit,
    ) -> ComplianceDecision:
        """Evaluate eccentricity compliance."""
        max_dev = calc_result.calculated_values.get("max_absolute_deviation", 0)
        scale_interval = test_input.scale_interval
        dev_in_d = max_dev / scale_interval if scale_interval > 0 else 0

        limit_value = applicable_limit.value
        margin = limit_value - dev_in_d
        is_within = dev_in_d <= limit_value

        explanation = ComplianceExplanation(
            parameter_name="Maximum Eccentricity (in scale intervals)",
            observed_value=round(dev_in_d, 6),
            observed_unit="d",
            allowed_value=limit_value,
            allowed_unit=applicable_limit.unit,
            difference=round(dev_in_d - limit_value, 6),
            margin=round(margin, 6),
            is_within_limit=is_within,
            comparison_operator="<=",
        )

        if is_within:
            decision = TestStatusCode.PASS
            reason = (
                "Maximum eccentricity deviation of {:.4f} d is within "
                "the maximum allowed {} d. "
                "Margin: {:.4f} d remaining. "
                "Rule: {} v{}."
            ).format(dev_in_d, limit_value, margin,
                     applicable_limit.rule_id, applicable_limit.rule_version)
        else:
            excess = dev_in_d - limit_value
            decision = TestStatusCode.FAIL
            reason = (
                "Maximum eccentricity deviation of {:.4f} d exceeds "
                "the maximum allowed {} d by {:.4f} d. "
                "Rule: {} v{}."
            ).format(dev_in_d, limit_value, excess,
                     applicable_limit.rule_id, applicable_limit.rule_version)

        return ComplianceDecision(
            standard="OIML R-76",
            standard_version=applicable_limit.rule_version,
            rule_id=applicable_limit.rule_id,
            rule_version=applicable_limit.rule_version,
            test_code="ECC",
            test_name="Eccentricity",
            calculated_value=round(dev_in_d, 6),
            calculated_unit="d",
            applicable_limit=limit_value,
            limit_unit=applicable_limit.unit,
            decision=decision,
            reason=reason,
            explanations=[explanation],
            evaluated_at=datetime.utcnow(),
        )

    def _evaluate_linearity(
        self,
        test_input: TestInput,
        calc_result: CalculationResult,
        applicable_limit: ApplicableLimit,
    ) -> ComplianceDecision:
        """Evaluate linearity compliance."""
        max_error = calc_result.calculated_values.get("max_linearity_error", 0)
        scale_interval = test_input.scale_interval
        error_in_d = max_error / scale_interval if scale_interval > 0 else 0

        limit_value = applicable_limit.value
        margin = limit_value - error_in_d
        is_within = error_in_d <= limit_value

        explanation = ComplianceExplanation(
            parameter_name="Maximum Linearity Error (in scale intervals)",
            observed_value=round(error_in_d, 6),
            observed_unit="d",
            allowed_value=limit_value,
            allowed_unit=applicable_limit.unit,
            difference=round(error_in_d - limit_value, 6),
            margin=round(margin, 6),
            is_within_limit=is_within,
            comparison_operator="<=",
        )

        if is_within:
            decision = TestStatusCode.PASS
            reason = (
                "Maximum linearity error of {:.4f} d is within "
                "the maximum allowed {} d. "
                "Margin: {:.4f} d remaining. "
                "Rule: {} v{}."
            ).format(error_in_d, limit_value, margin,
                     applicable_limit.rule_id, applicable_limit.rule_version)
        else:
            excess = error_in_d - limit_value
            decision = TestStatusCode.FAIL
            reason = (
                "Maximum linearity error of {:.4f} d exceeds "
                "the maximum allowed {} d by {:.4f} d. "
                "Rule: {} v{}."
            ).format(error_in_d, limit_value, excess,
                     applicable_limit.rule_id, applicable_limit.rule_version)

        return ComplianceDecision(
            standard="OIML R-76",
            standard_version=applicable_limit.rule_version,
            rule_id=applicable_limit.rule_id,
            rule_version=applicable_limit.rule_version,
            test_code="LIN",
            test_name="Linearity",
            calculated_value=round(error_in_d, 6),
            calculated_unit="d",
            applicable_limit=limit_value,
            limit_unit=applicable_limit.unit,
            decision=decision,
            reason=reason,
            explanations=[explanation],
            evaluated_at=datetime.utcnow(),
        )

    def _evaluate_discrimination(
        self,
        test_input: TestInput,
        calc_result: CalculationResult,
        applicable_limit: ApplicableLimit,
    ) -> ComplianceDecision:
        """Evaluate discrimination compliance."""
        is_detected = calc_result.calculated_values.get("is_detected", 0) == 1.0
        disc_weight = test_input.additional_inputs.get("discrimination_weight", 0)
        measured_disc = calc_result.calculated_values.get("measured_discrimination", 0)

        explanation = ComplianceExplanation(
            parameter_name="Discrimination Detection",
            observed_value=1.0 if is_detected else 0.0,
            observed_unit="detected",
            allowed_value=1.0,
            allowed_unit="must detect",
            difference=0.0 if is_detected else -1.0,
            margin=1.0 if is_detected else 0.0,
            is_within_limit=is_detected,
            comparison_operator=">",
        )

        if is_detected:
            decision = TestStatusCode.PASS
            reason = (
                "Discrimination weight of {} was detected "
                "(measured change: {}). "
                "Rule: {} v{}."
            ).format(disc_weight, measured_disc,
                     applicable_limit.rule_id, applicable_limit.rule_version)
        else:
            decision = TestStatusCode.FAIL
            reason = (
                "Discrimination weight of {} was NOT detected "
                "(measured change: {}). "
                "Rule: {} v{}."
            ).format(disc_weight, measured_disc,
                     applicable_limit.rule_id, applicable_limit.rule_version)

        return ComplianceDecision(
            standard="OIML R-76",
            standard_version=applicable_limit.rule_version,
            rule_id=applicable_limit.rule_id,
            rule_version=applicable_limit.rule_version,
            test_code="DIS",
            test_name="Discrimination",
            calculated_value=1.0 if is_detected else 0.0,
            calculated_unit="detected",
            applicable_limit=1.0,
            limit_unit="must detect",
            decision=decision,
            reason=reason,
            explanations=[explanation],
            evaluated_at=datetime.utcnow(),
        )

    def _evaluate_stability(
        self,
        test_input: TestInput,
        calc_result: CalculationResult,
        applicable_limit: ApplicableLimit,
    ) -> ComplianceDecision:
        """Evaluate stability compliance."""
        drift = calc_result.calculated_values.get("absolute_drift", 0)
        scale_interval = test_input.scale_interval
        drift_in_d = drift / scale_interval if scale_interval > 0 else 0

        limit_value = applicable_limit.value
        margin = limit_value - drift_in_d
        is_within = drift_in_d <= limit_value

        explanation = ComplianceExplanation(
            parameter_name="Maximum Drift (in scale intervals)",
            observed_value=round(drift_in_d, 6),
            observed_unit="d",
            allowed_value=limit_value,
            allowed_unit=applicable_limit.unit,
            difference=round(drift_in_d - limit_value, 6),
            margin=round(margin, 6),
            is_within_limit=is_within,
            comparison_operator="<=",
        )

        if is_within:
            decision = TestStatusCode.PASS
            reason = (
                "Stability drift of {:.4f} d is within "
                "the maximum allowed {} d. "
                "Margin: {:.4f} d remaining. "
                "Rule: {} v{}."
            ).format(drift_in_d, limit_value, margin,
                     applicable_limit.rule_id, applicable_limit.rule_version)
        else:
            excess = drift_in_d - limit_value
            decision = TestStatusCode.FAIL
            reason = (
                "Stability drift of {:.4f} d exceeds "
                "the maximum allowed {} d by {:.4f} d. "
                "Rule: {} v{}."
            ).format(drift_in_d, limit_value, excess,
                     applicable_limit.rule_id, applicable_limit.rule_version)

        return ComplianceDecision(
            standard="OIML R-76",
            standard_version=applicable_limit.rule_version,
            rule_id=applicable_limit.rule_id,
            rule_version=applicable_limit.rule_version,
            test_code="STB",
            test_name="Stability",
            calculated_value=round(drift_in_d, 6),
            calculated_unit="d",
            applicable_limit=limit_value,
            limit_unit=applicable_limit.unit,
            decision=decision,
            reason=reason,
            explanations=[explanation],
            evaluated_at=datetime.utcnow(),
        )

    # ====================================================================
    # HELPER METHODS
    # ====================================================================

    def _evaluate_weighing(
        self,
        test_input: TestInput,
        calc_result: CalculationResult,
        applicable_limit: ApplicableLimit,
    ) -> ComplianceDecision:
        """
        Evaluate gross-load weighing test compliance.

        Decision rule (OIML R 76-2): PASS if |E_c| ≤ MPE(L) for every load.
        ``E_c`` is the corrected error = (I + ½·e − ΔL − L) − E₀.
        """
        max_ec = calc_result.calculated_values.get("max_abs_ec", 0)
        scale_interval = test_input.scale_interval
        limit_value = applicable_limit.value
        limit_units = limit_value * scale_interval

        margin = limit_units - max_ec
        is_within = max_ec <= limit_units

        explanation = ComplianceExplanation(
            parameter_name="Maximum Corrected Error |E_c| (in mass units)",
            observed_value=round(max_ec, 6),
            observed_unit=test_input.scale_interval_unit.value,
            allowed_value=round(limit_units, 6),
            allowed_unit=test_input.scale_interval_unit.value,
            difference=round(max_ec - limit_units, 6),
            margin=round(margin, 6),
            is_within_limit=is_within,
            comparison_operator="<=",
        )

        if is_within:
            decision = TestStatusCode.PASS
            reason = (
                "Maximum corrected error |E_c| = {:.4f} {} is within "
                "the MPE ±{:.4f} {} at the applied load. "
                "Margin: {:.4f} {}. Error formula: E = I + ½e − ΔL − L; "
                "E_c = E − E0. Rule: {} v{}."
            ).format(
                max_ec, test_input.scale_interval_unit.value,
                limit_units, test_input.scale_interval_unit.value,
                margin, test_input.scale_interval_unit.value,
                applicable_limit.rule_id, applicable_limit.rule_version,
            )
        else:
            excess = max_ec - limit_units
            decision = TestStatusCode.FAIL
            reason = (
                "Maximum corrected error |E_c| = {:.4f} {} exceeds "
                "the MPE ±{:.4f} {} at the applied load by {:.4f} {}. "
                "Rule: {} v{}."
            ).format(
                max_ec, test_input.scale_interval_unit.value,
                limit_units, test_input.scale_interval_unit.value,
                excess, test_input.scale_interval_unit.value,
                applicable_limit.rule_id, applicable_limit.rule_version,
            )

        return ComplianceDecision(
            standard="OIML R-76",
            standard_version=applicable_limit.rule_version,
            rule_id=applicable_limit.rule_id,
            rule_version=applicable_limit.rule_version,
            test_code="WGT",
            test_name="Weighing (Gross Load)",
            calculated_value=round(max_ec, 6),
            calculated_unit=test_input.scale_interval_unit.value,
            applicable_limit=round(limit_units, 6),
            limit_unit=test_input.scale_interval_unit.value,
            decision=decision,
            reason=reason,
            explanations=[explanation],
            evaluated_at=datetime.utcnow(),
        )

    def _make_incomplete_decision(
        self,
        test_input: TestInput,
        reason: str,
        validation_errors: Optional[list] = None,
    ) -> ComplianceDecision:
        """Create an INCOMPLETE compliance decision."""
        return ComplianceDecision(
            standard="OIML R-76",
            standard_version="unknown",
            rule_id="none",
            rule_version="unknown",
            test_code=test_input.test_code,
            test_name=self._get_test_name(test_input.test_code),
            calculated_value=None,
            calculated_unit=test_input.scale_interval_unit.value,
            applicable_limit=None,
            limit_unit="",
            decision=TestStatusCode.INCOMPLETE,
            reason=reason,
            explanations=[],
            evaluated_at=datetime.utcnow(),
        )

    @staticmethod
    def _get_test_name(test_code: str) -> str:
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


# ====================================================================
# COMPLIANCE REPORT FORMATTER
# ====================================================================

class ComplianceReportFormatter:
    """
    Formats compliance decisions into human-readable reports.

    IMPORTANT DISCLAIMER: This report is for informational purposes only.
    It does not constitute legal certification, regulatory approval,
    or official accreditation of any kind.
    """

    DISCLAIMER = (
        "DISCLAIMER: This compliance report is generated by software for "
        "informational purposes only. It does not constitute legal "
        "certification, regulatory approval, or official accreditation. "
        "Actual compliance determination must be made by authorized "
        "personnel in accordance with applicable regulations."
    )

    @staticmethod
    def format_decision(decision: ComplianceDecision) -> str:
        """Format a single compliance decision as text."""
        lines = [
            "Compliance Decision: " + decision.test_name,
            "Standard: " + decision.standard + " (" + decision.standard_version + ")",
            "Rule: " + decision.rule_id + " v" + decision.rule_version,
            "Decision: " + decision.decision.value.upper(),
            "",
            "Reason: " + decision.reason,
        ]

        if decision.explanations:
            lines.append("")
            lines.append("Detailed Evaluation:")
            for expl in decision.explanations:
                status = "WITHIN" if expl.is_within_limit else "EXCEEDED"
                lines.append(
                    "  " + expl.parameter_name + ": "
                    + "Observed " + str(expl.observed_value) + " " + expl.observed_unit + " "
                    + expl.comparison_operator + " "
                    + "Allowed " + str(expl.allowed_value) + " " + expl.allowed_unit + " "
                    + "-> " + status
                )
                if expl.margin > 0:
                    lines.append("    Margin: {:.4f} {} remaining".format(expl.margin, expl.allowed_unit))
                else:
                    lines.append("    Excess: {:.4f} {} over limit".format(abs(expl.margin), expl.allowed_unit))

        lines.append("")
        lines.append(ComplianceReportFormatter.DISCLAIMER)

        return "\n".join(lines)

    @staticmethod
    def format_all_decisions(decisions: list[ComplianceDecision]) -> str:
        """Format all compliance decisions for a test."""
        sections = []
        for decision in decisions:
            sections.append(ComplianceReportFormatter.format_decision(decision))

        header = [
            "=" * 72,
            "COMPLIANCE EVALUATION REPORT",
            "Generated: {}Z".format(datetime.utcnow().isoformat()),
            "=" * 72,
            "",
        ]

        footer = [
            "",
            "=" * 72,
            ComplianceReportFormatter.DISCLAIMER,
            "=" * 72,
        ]

        return "\n".join(header + sections + footer)
