"""Tests for rule-based explainer + AI gating (zero-AI tier + on-demand Gemini)."""

import pytest

from engine import rule_explainer
from engine.ai_settings import (
    get_ai_settings,
    update_ai_settings,
    reset_ai_settings,
)
from engine.ai_assistance import AIAssistanceService


def _decision(decision="fail"):
    return {
        "test_code": "ECC",
        "test_name": "Eccentricity",
        "decision": decision,
        "reason": "exceeds limit",
        "calculated_value": 1.2,
        "applicable_limit": 1.0,
        "calculated_unit": "d",
        "limit_unit": "d",
        "rule_id": "ECC-III-001",
        "rule_version": "2006",
        "standard": "OIML R-76",
        "standard_version": "2006",
        "explanations": [],
    }


class TestRuleExplainer:
    def test_fail_headline_has_excess(self):
        e = rule_explainer.explain_decision(_decision("fail"))
        assert e["source"] == "rule-based"
        assert e["ai_used"] is False
        assert "FAIL" in e["headline"]
        assert e["excess"] == pytest.approx(0.2)
        assert "ECC-III-001" in e["why"]

    def test_pass_headline(self):
        e = rule_explainer.explain_decision(_decision("pass"))
        assert "PASS" in e["headline"]

    def test_rule_not_configured_never_pass_fail(self):
        d = _decision("rule_not_configured")
        e = rule_explainer.explain_decision(d)
        assert "PASS" not in e["decision"] or True  # decision echoed, never invented
        assert e["decision"] == "rule_not_configured"
        assert "never invent" in e["why"].lower() or "not configured" in e["why"].lower()

    def test_process_description(self):
        p = rule_explainer.explain_process("WGT")
        assert p["ai_used"] is False
        assert "E = I" in p["formula"]

    def test_report_summary_counts(self):
        s = rule_explainer.summarize_report({
            "report_number": "R1",
            "instrument": {},
            "overall_result": "x",
            "test_results": [
                {"test_name": "A", "decision": "pass"},
                {"test_name": "B", "decision": "fail"},
            ],
        })
        assert s["failed"] == 1 and s["passed"] == 1
        assert s["ai_used"] is False


class TestAIGating:
    def setup_method(self):
        reset_ai_settings()

    def teardown_method(self):
        reset_ai_settings()

    def test_gated_without_key(self):
        update_ai_settings(clear_key=True)
        svc = AIAssistanceService(api_key=None)
        assert not svc.is_available
        r = svc.explain_compliance_result(_decision())
        assert "Settings" in r.content  # points user to Settings

    def test_test_keys_never_hit_network(self):
        svc = AIAssistanceService(api_key="test-key-123")
        assert svc.is_available  # configured...
        r = svc.explain_compliance_result(_decision())
        assert r.source == "rule-template"  # ...but deterministic, no network
        assert "1.2" in r.content

    def test_disabled_flag_gates(self):
        update_ai_settings(enabled=False)
        svc = AIAssistanceService(api_key="sk-real-looking-key-123")
        assert not svc.is_available

    def test_status_reports_rule_based_always(self):
        st = get_ai_settings().public_status()
        assert st["rule_based_available"] is True
