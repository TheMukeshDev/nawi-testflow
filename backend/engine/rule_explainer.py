"""
NAWI Sahayak — Rule-Based Explainer (deterministic, zero AI cost).

This module is the FIRST layer of user-facing explanations. It uses ONLY
the authoritative compliance engine outputs (ComplianceDecision,
ApplicableLimit, calculation values) and the actual configured OIML R-76
rules — never an LLM.

Design intent (per product requirement):
- Users always get a rule-based explanation first: what was measured,
  which exact rule + version applied, the formula used, observed vs
  allowed values, margin/excess, and WHY a test passed/failed.
- Gemini is reserved for ON-DEMAND enhancement only ("Enhance with AI"),
  and only when an API key has been configured in Settings.
- This keeps AI usage (and cost) minimal while keeping the process
  transparent and traceable.

Every function here is pure/deterministic: same inputs -> same outputs.
"""

from typing import Optional

# ============================================================================
# AUTHORITATIVE RULE FORMULAS (mirrors engine/rules.py + engine/compliance.py)
# These are display strings of the ACTUAL formulas the engine executes —
# not invented values. Keep in sync with ComplianceEvaluator.
# ============================================================================

TEST_FORMULAS: dict[str, dict[str, str]] = {
    "WGT": {
        "name": "Weighing (Gross Load)",
        "formula": "E = I + ½·e − ΔL − L;  E_c = E − E0",
        "decision": "PASS if |E_c| ≤ MPE(L) for every load (MPE from OIML R 76-1 Table 2)",
        "procedure": (
            "1. Apply test load L. 2. Record indication I. 3. Add small weights "
            "to find changeover ΔL. 4. Compute E = I + ½e − ΔL − L. "
            "5. Correct by zero-error E0 → E_c. 6. Compare |E_c| against MPE(L)."
        ),
    },
    "RPT": {
        "name": "Repeatability",
        "formula": "s = √(Σ(xi − x̄)² / (n−1)); compare s against configured national limit",
        "decision": (
            "PASS if s ≤ configured limit. NOTE: OIML R-76 (R76-1 §5.5.4) gives "
            "NO numeric repeatability limit — a national/regulatory value must be "
            "configured, otherwise the result is RULE_NOT_CONFIGURED."
        ),
        "procedure": (
            "1. Load the same test mass repeatedly (≥5 readings). "
            "2. Compute mean x̄ and sample std-dev s. "
            "3. Compare s against the configured limit for the instrument class."
        ),
    },
    "ECC": {
        "name": "Eccentricity",
        "formula": "E_i = I_i + ½·e − ΔL − L − E0 (same method as weighing, per position)",
        "decision": "PASS if every position |E_c(i)| ≤ MPE(L) for the test load",
        "procedure": (
            "1. Place test load (≈⅓–½ Max) at center, record I. "
            "2. Repeat at front / back / left / right positions. "
            "3. Compute E_c per position. 4. Worst position must be within MPE(L)."
        ),
    },
    "LIN": {
        "name": "Linearity",
        "formula": "err_i = |indicated_i − reference_i|; max_err = max(err_i)",
        "decision": (
            "PASS if max_err ≤ configured limit at each load. OIML gives no "
            "standalone numeric linearity limit — judged against MPE unless a "
            "reviewer configures a value."
        ),
        "procedure": (
            "1. Test at Min, 25%, 50%, 75%, Max loads. "
            "2. Compute error at each point. 3. Worst error must be within limit."
        ),
    },
    "DIS": {
        "name": "Discrimination",
        "formula": "ΔI = I_after − I_before; PASS if |ΔI| ≥ 1 d",
        "decision": (
            "PASS if adding/removing a small weight shifts the indication by at "
            "least 1 scale interval (OIML R 76-2 §5.8, functional test — no MPE)."
        ),
        "procedure": (
            "1. Record stable reading. 2. Add small discrimination weight. "
            "3. Indication must change by ≥ 1 d. 4. Remove weight — must return."
        ),
    },
    "STB": {
        "name": "Stability",
        "formula": "drift = I_final − I_initial; compare |drift| against configured limit",
        "decision": (
            "PASS if |drift| ≤ configured limit. OIML gives no standalone "
            "numeric stability limit — reviewer configures the applicable value."
        ),
        "procedure": (
            "1. Apply test load, record initial reading. "
            "2. Wait the specified duration. 3. Record final reading. "
            "4. Drift must be within limit."
        ),
    },
}


def get_test_formula(test_code: str) -> dict[str, str]:
    """Return the authoritative formula/procedure block for a test code."""
    return TEST_FORMULAS.get(
        test_code,
        {
            "name": test_code,
            "formula": "Unknown test code — cannot explain.",
            "decision": "Result is INCOMPLETE for unknown test codes.",
            "procedure": "Select a valid OIML R-76 test (WGT, RPT, ECC, LIN, DIS, STB).",
        },
    )


def _fmt(value: Optional[float]) -> str:
    if value is None:
        return "N/A"
    if isinstance(value, float):
        return f"{value:.4f}"
    return str(value)


def explain_decision(decision_data: dict) -> dict:
    """
    Build a deterministic, rule-based explanation of a compliance decision.

    Args:
        decision_data: serialized ComplianceDecision (must contain test_code,
            test_name, decision, reason, calculated_value, applicable_limit,
            rule_id, rule_version, explanations).

    Returns:
        Dict with title, process steps, formula, comparison table, why_failed
        / why_passed narrative, rule reference, and source="rule-based".
        Works with NO api key and makes ZERO network calls.
    """
    test_code = str(decision_data.get("test_code", "")).upper()
    test_name = decision_data.get("test_name") or get_test_formula(test_code)["name"]
    decision = str(decision_data.get("decision", "unknown")).lower()
    reason = decision_data.get("reason", "No reason provided.")
    calculated = decision_data.get("calculated_value")
    limit = decision_data.get("applicable_limit")
    calc_unit = decision_data.get("calculated_unit", "")
    limit_unit = decision_data.get("limit_unit", calc_unit)
    rule_id = decision_data.get("rule_id", "none")
    rule_version = decision_data.get("rule_version", "unknown")
    standard = decision_data.get("standard", "OIML R-76")
    standard_version = decision_data.get("standard_version", rule_version)
    explanations = decision_data.get("explanations", []) or []
    formula = get_test_formula(test_code)

    # Margin / excess from structured explanations when available
    margin: Optional[float] = None
    excess: Optional[float] = None
    comparison_rows: list[dict] = []
    for expl in explanations:
        if not isinstance(expl, dict):
            continue
        comparison_rows.append(
            {
                "parameter": expl.get("parameter_name", "Unknown"),
                "observed": f"{_fmt(expl.get('observed_value'))} {expl.get('observed_unit', '')}".strip(),
                "allowed": f"{_fmt(expl.get('allowed_value'))} {expl.get('allowed_unit', '')}".strip(),
                "operator": expl.get("comparison_operator", "<="),
                "within_limit": bool(expl.get("is_within_limit", False)),
                "margin": expl.get("margin"),
            }
        )
        m = expl.get("margin")
        if isinstance(m, (int, float)):
            margin = float(m)
            if m < 0:
                excess = abs(float(m))

    # Fallback margin from top-level values
    if margin is None and isinstance(calculated, (int, float)) and isinstance(limit, (int, float)):
        margin = float(limit) - float(calculated)
        if margin < 0:
            excess = abs(margin)

    if decision == "pass":
        headline = (
            f"PASS: {_fmt(calculated)} {calc_unit} is within the allowed "
            f"{_fmt(limit)} {limit_unit}."
            + (f" Margin remaining: {_fmt(margin)} {limit_unit}." if margin is not None and margin >= 0 else "")
        )
        why = (
            f"The {test_name.lower()} test PASSED because the measured value "
            f"({_fmt(calculated)} {calc_unit}) satisfies the rule "
            f"{rule_id} v{rule_version}: {formula['decision']}."
        )
    elif decision == "fail":
        headline = (
            f"FAIL: {_fmt(calculated)} {calc_unit} exceeds the allowed "
            f"{_fmt(limit)} {limit_unit}."
            + (f" Excess over limit: {_fmt(excess)} {limit_unit}." if excess is not None else "")
        )
        why = (
            f"The {test_name.lower()} test FAILED because the measured value "
            f"({_fmt(calculated)} {calc_unit}) is greater than the maximum allowed "
            f"({_fmt(limit)} {limit_unit}) under rule {rule_id} v{rule_version}. "
            f"To pass, reduce the error by at least {_fmt(excess)} {limit_unit} "
            f"(e.g. recalibrate, check load placement, control environment) and re-test."
            if excess is not None
            else (
                f"The {test_name.lower()} test FAILED: {reason} "
                f"(rule {rule_id} v{rule_version})."
            )
        )
    elif decision == "rule_not_configured":
        headline = "No verdict possible: required rule is not configured."
        why = (
            f"No PASS/FAIL can be given for {test_name} because the required rule "
            f"is not configured (rule_id={rule_id}). This is a safety guard — "
            f"the system never invents limits. An administrator/reviewer must "
            f"configure the applicable national limit, then re-evaluate."
        )
    elif decision == "incomplete":
        headline = "No verdict possible: data incomplete."
        why = (
            f"The {test_name.lower()} test is INCOMPLETE: {reason} "
            f"Complete the missing observations/inputs, then re-run calculation."
        )
    else:
        headline = f"{decision.upper()}: {reason}"
        why = f"{test_name}: {reason} (rule {rule_id} v{rule_version})."

    steps = [
        f"Observations recorded for {test_name} ({test_code}).",
        f"Engine computed {_fmt(calculated)} {calc_unit} using: {formula['formula']}.",
        f"Resolved applicable rule {rule_id} v{rule_version} ({standard} {standard_version}) → limit {_fmt(limit)} {limit_unit}.",
        f"Compared observed vs allowed ({formula['decision']}).",
        f"Verdict: {decision.upper()} — {reason}",
    ]

    return {
        "source": "rule-based",
        "ai_used": False,
        "title": f"{test_name} — {decision.upper()} (rule-based)",
        "headline": headline,
        "why": why,
        "test_code": test_code,
        "test_name": test_name,
        "decision": decision,
        "formula": formula["formula"],
        "decision_rule": formula["decision"],
        "procedure": formula["procedure"],
        "steps": steps,
        "comparison": comparison_rows,
        "calculated_value": calculated,
        "calculated_unit": calc_unit,
        "applicable_limit": limit,
        "limit_unit": limit_unit,
        "margin": margin,
        "excess": excess,
        "rule": {
            "rule_id": rule_id,
            "rule_version": rule_version,
            "standard": standard,
            "standard_version": standard_version,
        },
        "official_reason": reason,
        "note": (
            "Deterministic explanation from the compliance engine — no AI was used. "
            "For a plain-language rephrasing, use 'Enhance with AI' (requires API key in Settings)."
        ),
    }


def explain_process(test_code: str) -> dict:
    """
    Explain HOW a test works (procedure + formula + decision rule) without
    needing any measurement data. Used to help users understand the process
    before/without invoking AI.
    """
    code = str(test_code or "").upper()
    formula = get_test_formula(code)
    return {
        "source": "rule-based",
        "ai_used": False,
        "test_code": code,
        "test_name": formula["name"],
        "title": f"How {formula['name']} ({code}) works — rule-based",
        "formula": formula["formula"],
        "decision_rule": formula["decision"],
        "procedure": formula["procedure"],
        "steps": [s.strip() for s in formula["procedure"].split(". ") if s.strip()],
        "note": "Deterministic process description from configured OIML R-76 rules — no AI used.",
    }


def summarize_report(report_data: dict) -> dict:
    """
    Deterministic report summary: counts PASS/FAIL/INCOMPLETE/RULE_NOT_CONFIGURED,
    overall verdict, and per-test one-liners — all from authoritative data.
    """
    report_number = report_data.get("report_number", "Unknown")
    instrument = report_data.get("instrument", {}) or {}
    overall = str(report_data.get("overall_result", "unknown"))
    results = report_data.get("test_results", []) or []

    counts: dict[str, int] = {}
    lines: list[str] = []
    for r in results:
        d = str(r.get("decision", "unknown")).lower()
        counts[d] = counts.get(d, 0) + 1
        name = r.get("test_name", "Unknown")
        calc = r.get("calculated_value", "N/A")
        lim = r.get("applicable_limit", "N/A")
        lines.append(f"{name}: {d.upper()} (observed {calc} vs allowed {lim})")

    total = len(results)
    passed = counts.get("pass", 0)
    failed = counts.get("fail", 0)

    if total == 0:
        headline = "Report contains no test results."
    elif failed > 0:
        headline = f"{failed}/{total} test(s) FAILED — instrument is NON-COMPLIANT on failed tests."
    elif counts.get("rule_not_configured", 0):
        headline = "Some tests have no configured rule — verdict pending reviewer configuration."
    elif counts.get("incomplete", 0):
        headline = "Some tests are incomplete — finish data entry and re-evaluate."
    else:
        headline = f"All {total} test(s) PASSED ({passed}/{total})."

    return {
        "source": "rule-based",
        "ai_used": False,
        "title": f"Report {report_number} — rule-based summary",
        "headline": headline,
        "overall_result": overall,
        "counts": counts,
        "total": total,
        "passed": passed,
        "failed": failed,
        "per_test": lines,
        "instrument": {
            "manufacturer": instrument.get("manufacturer", "N/A"),
            "model": instrument.get("model", "N/A"),
            "serial_number": instrument.get("serial_number", "N/A"),
        },
        "note": (
            "Deterministic summary computed from compliance decisions — no AI used. "
            "Use 'Enhance with AI' for a narrative rephrasing if needed."
        ),
    }
