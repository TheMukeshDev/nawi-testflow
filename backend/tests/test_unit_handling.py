"""
NAWI Sahayak — Non-kg Unit Handling Tests

Regression tests for unit handling in the calculation engine.

Weighing, repeatability and linearity statistics are computed after
normalising observations to the *test point unit* (e.g. grams). Earlier
versions then converted the mean back from kilograms — a double conversion
that is invisible when the point unit is kg (kg→kg is a no-op) but corrupts
gram/tonne cases. These tests lock the correct behaviour.
"""

import pytest

from engine.orchestrator import CalculationEngine
from engine.rules import RuleStore, ComplianceRule, create_default_rule_store
from engine.types import (
    TestInput,
    TestPointInput,
    RawObservation,
    MassUnit,
    InstrumentClass,
    TestStatusCode,
)


def _engine_with_rules(rule_type, **params):
    """Engine whose rule store carries a configured national test-point value
    (without one, RPT/LIN resolve to RULE_NOT_CONFIGURED and are not computed)."""
    store = create_default_rule_store()
    store.add_rule(ComplianceRule(
        id=f"TEST-{rule_type}-001",
        version="2026",
        standard="OIML R-76",
        standard_version="2026",
        rule_type=rule_type,
        instrument_class=InstrumentClass.III,
        parameters=params,
    ))
    return CalculationEngine(rule_store=store)


def _weighing_input(value_unit, reference_value, observations, scale_interval, scale_unit):
    return TestInput(
        test_code="WGT",
        instrument_class=InstrumentClass.III,
        max_capacity=6.0,
        max_capacity_unit=MassUnit.KG,
        scale_interval=scale_interval,
        scale_interval_unit=scale_unit,
        test_points=[
            TestPointInput(
                point_label="3000g",
                reference_value=reference_value,
                unit=value_unit,
                observations=[
                    RawObservation(value=v, unit=value_unit, observation_number=i + 1)
                    for i, v in enumerate(observations)
                ],
            )
        ],
        additional_inputs={"zero_error_E0": 0.0, "small_added_load_delta_L": 0.0},
    )


class TestWeighingGramUnits:
    """Weighing error in grams must not be double-converted."""

    def test_weighing_error_in_grams(self):
        engine = CalculationEngine()
        test_input = _weighing_input(
            value_unit=MassUnit.G,
            reference_value=3000.0,
            observations=[3000.05, 3000.10, 2999.98],
            scale_interval=0.1,
            scale_unit=MassUnit.G,
        )
        result = engine.execute(test_input)
        calc = result.calculation_result

        assert calc.status == TestStatusCode.PASS
        # E = I + ½·e − ΔL − L; mean = 3000.0433 g, e = 0.1 g
        expected = 3000.0433 + 0.5 * 0.1 - 3000.0
        assert abs(calc.calculated_values["max_abs_ec"] - expected) < 0.001


class TestRepeatabilityGramUnits:
    """Repeatability deviation in grams must not be double-converted."""

    def test_repeatability_deviation_in_grams(self):
        engine = _engine_with_rules("repeatability", max_std_dev=9.0, unit="d")
        test_input = TestInput(
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            max_capacity=6.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.1,
            scale_interval_unit=MassUnit.G,
            test_points=[
                TestPointInput(
                    point_label="3000g",
                    reference_value=3000.0,
                    unit=MassUnit.G,
                    observations=[
                        RawObservation(value=v, unit=MassUnit.G, observation_number=i + 1)
                        for i, v in enumerate([3000.01, 3000.02, 3000.00])
                    ],
                )
            ],
        )
        result = engine.execute(test_input)
        calc = result.calculation_result

        # Statistics are mean 3000.01 g / std 0.01 g — not kg-scaled values.
        assert abs(calc.calculated_values["mean"] - 3000.01) < 0.001
        assert abs(calc.calculated_values["std_deviation"] - 0.01) < 0.001
        assert abs(calc.calculated_values["deviation_from_reference"] - 0.01) < 0.001


class TestLinearityGramUnits:
    """Linearity error in grams must not be double-converted."""

    def test_linearity_error_in_grams(self):
        engine = _engine_with_rules("linearity", max_linearity=1.0, unit="e")
        test_input = TestInput(
            test_code="LIN",
            instrument_class=InstrumentClass.III,
            max_capacity=6.0,
            max_capacity_unit=MassUnit.KG,
            scale_interval=0.1,
            scale_interval_unit=MassUnit.G,
            test_points=[
                TestPointInput(
                    point_label=label,
                    reference_value=ref,
                    unit=MassUnit.G,
                    observations=[
                        RawObservation(value=val, unit=MassUnit.G, observation_number=1)
                    ],
                )
                for label, ref, val in [
                    ("1000g", 1000.0, 1000.02),
                    ("2000g", 2000.0, 2000.04),
                    ("3000g", 3000.0, 3000.03),
                ]
            ],
        )
        result = engine.execute(test_input)
        calc = result.calculation_result

        # Max linearity error = 0.04 g (2000 g point). A double conversion
        # would produce ~monolith values of grams treated as kilograms.
        assert abs(calc.calculated_values["max_linearity_error"] - 0.04) < 0.001