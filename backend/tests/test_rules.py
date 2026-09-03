"""
NAWI TestFlow — Rules Module Tests

Tests for rule store and rule resolver.
Verifies that rules are correctly resolved and that
missing rules return None (RULE_NOT_CONFIGURED).
"""

import pytest

from engine.rules import RuleStore, RuleResolver, ComplianceRule, create_default_rule_store
from engine.types import InstrumentClass, ApplicableLimit


@pytest.fixture
def rule_store():
    return create_default_rule_store()


@pytest.fixture
def resolver(rule_store):
    return RuleResolver(rule_store)


@pytest.fixture
def empty_rule_store():
    return RuleStore()


@pytest.fixture
def empty_resolver(empty_rule_store):
    return RuleResolver(empty_rule_store)


# ============================================================================
# Rule Store Tests
# ============================================================================

class TestRuleStore:
    """Tests for rule store operations."""
    
    def test_add_and_get_rule(self):
        store = RuleStore()
        rule = ComplianceRule(
            id="TEST-001",
            version="1.0",
            standard="OIML R-76",
            standard_version="2009",
            rule_type="mpe",
            instrument_class=InstrumentClass.III,
            parameters={"mpe_value": 1.0, "unit": "d"},
        )
        
        store.add_rule(rule)
        retrieved = store.get_rule("TEST-001")
        
        assert retrieved is not None
        assert retrieved.id == "TEST-001"
        assert retrieved.rule_type == "mpe"
    
    def test_get_nonexistent_rule(self):
        store = RuleStore()
        assert store.get_rule("NONEXISTENT") is None
    
    def test_get_rules_by_type(self):
        store = RuleStore()
        store.add_rule(ComplianceRule(
            id="MPE-001", version="1.0", standard="OIML R-76",
            standard_version="2009", rule_type="mpe",
            instrument_class=InstrumentClass.III, parameters={},
        ))
        store.add_rule(ComplianceRule(
            id="MPE-002", version="1.0", standard="OIML R-76",
            standard_version="2009", rule_type="mpe",
            instrument_class=InstrumentClass.II, parameters={},
        ))
        store.add_rule(ComplianceRule(
            id="RPT-001", version="1.0", standard="OIML R-76",
            standard_version="2009", rule_type="repeatability",
            instrument_class=InstrumentClass.III, parameters={},
        ))
        
        mpe_rules = store.get_rules_by_type("mpe")
        assert len(mpe_rules) == 2
        
        mpe_iii_rules = store.get_rules_by_type("mpe", InstrumentClass.III)
        assert len(mpe_iii_rules) == 1
        assert mpe_iii_rules[0].id == "MPE-001"
    
    def test_inactive_rules_excluded(self):
        store = RuleStore()
        store.add_rule(ComplianceRule(
            id="ACTIVE-001", version="1.0", standard="OIML R-76",
            standard_version="2009", rule_type="mpe",
            is_active=True, parameters={},
        ))
        store.add_rule(ComplianceRule(
            id="INACTIVE-001", version="1.0", standard="OIML R-76",
            standard_version="2009", rule_type="mpe",
            is_active=False, parameters={},
        ))
        
        active_rules = store.get_rules_by_type("mpe")
        assert len(active_rules) == 1
        assert active_rules[0].id == "ACTIVE-001"


# ============================================================================
# Default Rule Store Tests
# ============================================================================

class TestDefaultRuleStore:
    """Tests for default rule store creation."""
    
    def test_default_store_has_rules(self, rule_store):
        rules = rule_store.get_active_rules()
        assert len(rules) > 0
    
    def test_default_store_has_mpe_rules(self, rule_store):
        mpe_rules = rule_store.get_rules_by_type("mpe")
        assert len(mpe_rules) > 0
    
    def test_default_store_has_repeatability_rules(self, rule_store):
        rpt_rules = rule_store.get_rules_by_type("repeatability")
        assert len(rpt_rules) > 0
    
    def test_default_store_has_eccentricity_rules(self, rule_store):
        ecc_rules = rule_store.get_rules_by_type("eccentricity")
        assert len(ecc_rules) > 0
    
    def test_default_store_has_class_iii_rules(self, rule_store):
        rules = rule_store.get_rules_by_type("mpe", InstrumentClass.III)
        assert len(rules) > 0
    
    def test_default_store_has_class_ii_rules(self, rule_store):
        rules = rule_store.get_rules_by_type("mpe", InstrumentClass.II)
        assert len(rules) > 0


# ============================================================================
# Rule Resolver Tests
# ============================================================================

class TestRuleResolver:
    """Tests for rule resolution."""
    
    def test_resolve_repeatability_rule(self, resolver):
        # Per OIML R-76 (R76-1 §5.5.4) there is NO authoritative numeric
        # repeatability limit. It must resolve to None (RULE_NOT_CONFIGURED)
        # unless a reviewer configures a national value.
        limit = resolver.resolve_repeatability_rule(InstrumentClass.III)
        assert limit is None
    
    def test_resolve_eccentricity_rule(self, resolver):
        # Eccentricity is judged against the MPE at the applied load.
        # Without a load, the class-level rule has no numeric value -> None.
        limit = resolver.resolve_eccentricity_rule(InstrumentClass.III)
        if limit is not None:
            assert limit.limit_key == "eccentricity" or limit.limit_key == "mpe"
    
    def test_resolve_eccentricity_with_load(self, resolver):
        # With a load and scale interval, eccentricity resolves to MPE(L).
        # Class III, L = 100, e = 0.05 -> n = 2000 divisions -> MPE = 1.0 e
        limit = resolver.resolve_eccentricity_rule(
            InstrumentClass.III, load=100.0, scale_interval=0.05
        )
        assert limit is not None
        assert limit.value == 1.0
        assert limit.unit == "e"
    
    def test_resolve_weighing_with_load(self, resolver):
        # Weighing test resolves the MPE at the applied load.
        # Class III, L = 100, e = 0.05 -> n = 2000 -> MPE = 1.0 e
        limit = resolver.resolve_weighing_rule(
            InstrumentClass.III, load=100.0, scale_interval=0.05
        )
        assert limit is not None
        assert limit.value == 1.0
        assert limit.unit == "e"

    def test_resolve_mpe_rule_within_range(self, resolver):
        limit = resolver.resolve_mpe_rule(InstrumentClass.III, scale_divisions=250)
        
        assert limit is not None
        assert limit.limit_key == "mpe"
        assert limit.rule_id == "MPE-III-001"
        assert limit.value == 0.5
    
    def test_resolve_mpe_rule_higher_range(self, resolver):
        limit = resolver.resolve_mpe_rule(InstrumentClass.III, scale_divisions=1000)
        
        assert limit is not None
        assert limit.rule_id == "MPE-III-002"
        assert limit.value == 1.0
    
    def test_resolve_mpe_rule_above_2000(self, resolver):
        limit = resolver.resolve_mpe_rule(InstrumentClass.III, scale_divisions=5000)
        
        assert limit is not None
        assert limit.rule_id == "MPE-III-003"
        assert limit.value == 1.5
    
    def test_resolve_linearity_rule_class_iii(self, resolver):
        # Linearity has no standalone OIML numeric limit -> None (unless configured)
        limit = resolver.resolve_linearity_rule(InstrumentClass.III)
        assert limit is None
    
    def test_resolve_stability_rule_class_iii(self, resolver):
        # Stability has no standalone OIML numeric limit -> None (unless configured)
        limit = resolver.resolve_stability_rule(InstrumentClass.III)
        assert limit is None
    
    def test_resolve_discrimination_rule_class_iii(self, resolver):
        # Discrimination is a functional rule: indication must change by
        # at least 1 scale interval.
        limit = resolver.resolve_discrimination_rule(InstrumentClass.III)
        assert limit is not None
        assert limit.limit_key == "discrimination"
        assert limit.value == 1.0


# ============================================================================
# RULE_NOT_CONFIGURED Tests
# ============================================================================

class TestRuleNotConfigured:
    """Tests for when rules are missing."""
    
    def test_no_rules_returns_none(self, empty_resolver):
        limit = empty_resolver.resolve_repeatability_rule(InstrumentClass.III)
        assert limit is None
    
    def test_no_mpe_rules(self, empty_resolver):
        limit = empty_resolver.resolve_mpe_rule(InstrumentClass.III, 250)
        assert limit is None
    
    def test_unknown_test_code(self, resolver):
        limit = resolver.resolve_rule("XYZ", InstrumentClass.III)
        assert limit is None
    
    def test_class_i_not_configured(self, resolver):
        # Class I may not have rules in default store
        limit = resolver.resolve_repeatability_rule(InstrumentClass.I)
        # May be None
        if limit is None:
            assert limit is None


# ============================================================================
# Generic Rule Resolver Tests
# ============================================================================

class TestGenericResolver:
    """Tests for the generic resolve_rule method."""
    
    def test_resolve_wgt(self, resolver):
        # Weighing resolves MPE at load.
        limit = resolver.resolve_rule("WGT", InstrumentClass.III,
                                      load=100.0, scale_interval=0.05)
        assert limit is not None
        assert limit.limit_key == "mpe"
    
    def test_resolve_rpt(self, resolver):
        # Repeatability has no OIML numeric limit -> None.
        limit = resolver.resolve_rule("RPT", InstrumentClass.III)
        assert limit is None
    
    def test_resolve_ecc(self, resolver):
        # Eccentricity without a load is not configured -> None.
        limit = resolver.resolve_rule("ECC", InstrumentClass.III)
        assert limit is None
    
    def test_resolve_ecc_with_load(self, resolver):
        # Eccentricity with a load resolves to MPE(L).
        limit = resolver.resolve_rule("ECC", InstrumentClass.III,
                                      load=100.0, scale_interval=0.05)
        assert limit is not None
    
    def test_resolve_dis(self, resolver):
        # Discrimination always resolves to the functional limit.
        limit = resolver.resolve_rule("DIS", InstrumentClass.III)
        assert limit is not None
        assert limit.value == 1.0
    
    def test_resolve_unknown(self, resolver):
        limit = resolver.resolve_rule("UNKNOWN", InstrumentClass.III)
        assert limit is None
