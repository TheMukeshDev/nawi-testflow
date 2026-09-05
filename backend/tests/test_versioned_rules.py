"""
NAWI Sahayak — Versioned Rules Tests

Comprehensive tests for the versioned regulatory-rule architecture.

Tests cover:
- RuleVersion lifecycle (create, activate, expire, freeze)
- VersionedRuleStore operations
- VersionedRuleResolver resolution strategies
- Freeze protection (immutable rules in finalized reports)
- DEMO/VERIFIED separation
- Date-based version resolution
- RULE_NOT_CONFIGURED for missing rules
- Migration from old rule format
"""

import pytest
from datetime import date, datetime, timedelta

from engine.versioned_rules import (
    RuleVersion,
    RuleStatus,
    RuleSource,
    VersionedComplianceRule,
    VersionedRuleStore,
    VersionedRuleResolver,
    create_demo_rule_store,
    create_version_from_old_store,
)
from engine.types import InstrumentClass, ApplicableLimit
from engine.rules import ComplianceRule


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def demo_store():
    """Create a demo rule store."""
    return create_demo_rule_store()


@pytest.fixture
def demo_resolver(demo_store):
    """Create a resolver with demo rules."""
    return VersionedRuleResolver(demo_store)


@pytest.fixture
def empty_store():
    """Create an empty rule store."""
    return VersionedRuleStore()


@pytest.fixture
def empty_resolver(empty_store):
    """Create a resolver with no rules."""
    return VersionedRuleResolver(empty_store)


# ============================================================================
# RULE VERSION TESTS
# ============================================================================

class TestRuleVersion:
    """Tests for RuleVersion lifecycle."""
    
    def test_create_version(self):
        """Create a basic version."""
        v = RuleVersion(
            id="TEST-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            status=RuleStatus.ACTIVE,
            source=RuleSource.DEMO,
        )
        
        assert v.id == "TEST-001"
        assert v.standard_code == "OIML R-76"
        assert v.version_label == "2009"
        assert v.status == RuleStatus.ACTIVE
        assert v.source == RuleSource.DEMO
    
    def test_is_available_active(self):
        """Active version within date range is available."""
        v = RuleVersion(
            id="TEST-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            status=RuleStatus.ACTIVE,
        )
        
        assert v.is_available(date(2015, 6, 15)) is True
    
    def test_is_available_before_effective(self):
        """Version before effective date is not available."""
        v = RuleVersion(
            id="TEST-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            status=RuleStatus.ACTIVE,
        )
        
        assert v.is_available(date(2009, 12, 31)) is False
    
    def test_is_available_after_expiry(self):
        """Version after expiry date is not available."""
        v = RuleVersion(
            id="TEST-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            expiry_date=date(2015, 12, 31),
            status=RuleStatus.ACTIVE,
        )
        
        assert v.is_available(date(2016, 1, 1)) is False
    
    def test_is_available_draft(self):
        """Draft version is not available."""
        v = RuleVersion(
            id="TEST-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            status=RuleStatus.DRAFT,
        )
        
        assert v.is_available(date(2015, 6, 15)) is False
    
    def test_freeze_version(self):
        """Freezing a version locks it."""
        v = RuleVersion(
            id="TEST-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            status=RuleStatus.ACTIVE,
        )
        
        v.freeze("REPORT-123", "user-456")
        
        assert v.status == RuleStatus.FROZEN
        assert v.frozen_at is not None
        assert v.frozen_by == "REPORT-123"
        assert v.is_frozen() is True
    
    def test_double_freeze_raises(self):
        """Cannot freeze an already frozen version."""
        v = RuleVersion(
            id="TEST-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            status=RuleStatus.ACTIVE,
        )
        
        v.freeze("REPORT-123")
        
        with pytest.raises(ValueError, match="already frozen"):
            v.freeze("REPORT-456")


# ============================================================================
# VERSIONED RULE STORE TESTS
# ============================================================================

class TestVersionedRuleStore:
    """Tests for VersionedRuleStore operations."""
    
    def test_add_and_get_version(self, empty_store):
        """Add and retrieve a version."""
        v = RuleVersion(
            id="TEST-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            status=RuleStatus.ACTIVE,
        )
        
        empty_store.add_version(v)
        retrieved = empty_store.get_version("TEST-001")
        
        assert retrieved is not None
        assert retrieved.id == "TEST-001"
    
    def test_duplicate_version_raises(self, empty_store):
        """Cannot add a version with duplicate ID."""
        v1 = RuleVersion(
            id="TEST-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
        )
        v2 = RuleVersion(
            id="TEST-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
        )
        
        empty_store.add_version(v1)
        
        with pytest.raises(ValueError, match="already exists"):
            empty_store.add_version(v2)
    
    def test_get_versions_by_standard(self, demo_store):
        """Get all versions for a standard."""
        versions = demo_store.get_versions_by_standard("OIML R-76")
        
        assert len(versions) >= 1
        assert all(v.standard_code == "OIML R-76" for v in versions)
    
    def test_get_active_version(self, demo_store):
        """Get the active version for a date."""
        version = demo_store.get_active_version("OIML R-76", date(2015, 6, 15))
        
        assert version is not None
        assert version.status == RuleStatus.ACTIVE
    
    def test_add_and_get_rule(self, empty_store):
        """Add and retrieve a rule."""
        v = RuleVersion(
            id="VER-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            status=RuleStatus.ACTIVE,
        )
        empty_store.add_version(v)
        
        rule = VersionedComplianceRule(
            id="RPT-001",
            rule_version_id="VER-001",
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            limit_key="max_std_dev",
            limit_value=0.5,
            limit_unit="d",
        )
        empty_store.add_rule(rule)
        
        retrieved = empty_store.get_rule("RPT-001")
        assert retrieved is not None
        assert retrieved.limit_value == 0.5
    
    def test_add_rule_to_nonexistent_version_raises(self, empty_store):
        """Cannot add a rule to a non-existent version."""
        rule = VersionedComplianceRule(
            id="RPT-001",
            rule_version_id="NONEXISTENT",
            test_code="RPT",
        )
        
        with pytest.raises(ValueError, match="not found"):
            empty_store.add_rule(rule)
    
    def test_get_rules_for_version(self, demo_store):
        """Get all rules for a version."""
        version = demo_store.get_version("OIML-R76-2009-DEMO")
        rules = demo_store.get_rules_for_version(version.id)
        
        assert len(rules) > 0
        assert all(r.rule_version_id == version.id for r in rules)
    
    def test_get_rules_by_type(self, demo_store):
        """Get rules filtered by test code and instrument class."""
        rules = demo_store.get_rules_for_version_by_type(
            "OIML-R76-2009-DEMO", "RPT", InstrumentClass.III
        )
        
        assert len(rules) == 1
        assert rules[0].test_code == "RPT"
        assert rules[0].instrument_class == InstrumentClass.III


# ============================================================================
# FREEZE PROTECTION TESTS
# ============================================================================

class TestFreezeProtection:
    """Tests that frozen versions protect their rules."""
    
    def test_cannot_add_rule_to_frozen_version(self, empty_store):
        """Cannot add rules to a frozen version."""
        v = RuleVersion(
            id="VER-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            status=RuleStatus.ACTIVE,
        )
        empty_store.add_version(v)
        
        # Freeze it
        empty_store.freeze_version("VER-001", "REPORT-123")
        
        # Try to add a rule
        rule = VersionedComplianceRule(
            id="RPT-001",
            rule_version_id="VER-001",
            test_code="RPT",
        )
        
        with pytest.raises(ValueError, match="frozen"):
            empty_store.add_rule(rule)
    
    def test_cannot_modify_rule_in_frozen_version(self, empty_store):
        """Cannot modify rules in a frozen version."""
        v = RuleVersion(
            id="VER-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            status=RuleStatus.ACTIVE,
        )
        empty_store.add_version(v)
        
        rule = VersionedComplianceRule(
            id="RPT-001",
            rule_version_id="VER-001",
            test_code="RPT",
            limit_value=0.5,
        )
        empty_store.add_rule(rule)
        
        # Freeze the version
        empty_store.freeze_version("VER-001", "REPORT-123")
        
        # Try to modify the rule
        with pytest.raises(ValueError, match="frozen"):
            empty_store.update_rule("RPT-001", limit_value=1.0)
    
    def test_cannot_delete_rule_in_frozen_version(self, empty_store):
        """Cannot delete rules in a frozen version."""
        v = RuleVersion(
            id="VER-001",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            status=RuleStatus.ACTIVE,
        )
        empty_store.add_version(v)
        
        rule = VersionedComplianceRule(
            id="RPT-001",
            rule_version_id="VER-001",
            test_code="RPT",
        )
        empty_store.add_rule(rule)
        
        # Freeze the version
        empty_store.freeze_version("VER-001", "REPORT-123")
        
        # Try to delete the rule
        with pytest.raises(ValueError, match="frozen"):
            empty_store.delete_rule("RPT-001")


# ============================================================================
# VERSIONED RULE RESOLVER TESTS
# ============================================================================

class TestVersionedRuleResolver:
    """Tests for versioned rule resolution."""
    
    def test_resolve_with_explicit_version(self, demo_store):
        """Resolve using an explicit version label."""
        resolver = VersionedRuleResolver(demo_store)
        
        limit = resolver.resolve(
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            version_label="2009",
        )
        
        assert limit is not None
        assert limit.value == 0.5
        assert limit.unit == "d"
        assert "2009" in limit.rule_version
    
    def test_resolve_with_date(self, demo_store):
        """Resolve using a date."""
        resolver = VersionedRuleResolver(demo_store)
        
        limit = resolver.resolve(
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            effective_date=date(2015, 6, 15),
        )
        
        assert limit is not None
        assert limit.value == 0.5
    
    def test_resolve_latest(self, demo_store):
        """Resolve using the latest active version."""
        resolver = VersionedRuleResolver(demo_store)
        
        limit = resolver.resolve(
            test_code="RPT",
            instrument_class=InstrumentClass.III,
        )
        
        assert limit is not None
        assert limit.value == 0.5
    
    def test_resolve_missing_rule(self, empty_resolver):
        """Missing rule returns None (RULE_NOT_CONFIGURED)."""
        limit = empty_resolver.resolve(
            test_code="RPT",
            instrument_class=InstrumentClass.III,
        )
        
        assert limit is None
    
    def test_resolve_all_test_types(self, demo_store):
        """Resolve all test types for an instrument class."""
        resolver = VersionedRuleResolver(demo_store)
        
        limits = resolver.resolve_all(InstrumentClass.III)
        
        assert "RPT" in limits
        assert "ECC" in limits
        assert "LIN" in limits
        assert "DIS" in limits
        assert "STB" in limits
        
        # All should have values
        for test_code, limit in limits.items():
            assert limit is not None, "Missing limit for {}".format(test_code)
    
    def test_version_info(self, demo_store):
        """Get version metadata."""
        resolver = VersionedRuleResolver(demo_store)
        
        info = resolver.get_version_info(version_label="2009")
        
        assert info is not None
        assert info.standard_code == "OIML R-76"
        assert info.version_label == "2009"
        assert info.source == RuleSource.DEMO


# ============================================================================
# DEMO RULE SEPARATION TESTS
# ============================================================================

class TestDemoRuleSeparation:
    """Tests for DEMO vs VERIFIED rule separation."""
    
    def test_demo_rules_are_marked(self, demo_store):
        """All demo rules should be clearly marked."""
        version = demo_store.get_version("OIML-R76-2009-DEMO")
        
        assert version.source == RuleSource.DEMO
        assert "DEMO" in version.title
        assert "DEMO" in version.notes
    
    def test_demo_rules_have_disclaimer(self, demo_store):
        """Demo rules should have clear disclaimer."""
        version = demo_store.get_version("OIML-R76-2009-DEMO")
        
        assert "demonstration" in version.description.lower() or "DEMO" in version.description
        assert "NOT" in version.notes or "demo" in version.notes.lower()
    
    def test_rule_source_is_demo(self, demo_store):
        """Individual rules should also be marked as DEMO."""
        rules = demo_store.get_rules_for_version("OIML-R76-2009-DEMO")
        
        for rule in rules:
            assert rule.source == RuleSource.DEMO


# ============================================================================
# MULTI-VERSION TESTS
# ============================================================================

class TestMultiVersion:
    """Tests for multiple versions of the same standard."""
    
    def test_multiple_versions_same_standard(self):
        """Multiple versions of the same standard coexist."""
        store = VersionedRuleStore()
        
        # Version A
        v_a = RuleVersion(
            id="OIML-R76-A",
            standard_code="OIML R-76",
            version_label="2006",
            effective_date=date(2007, 1, 1),
            expiry_date=date(2012, 12, 31),
            status=RuleStatus.EXPIRED,
            source=RuleSource.VERIFIED,
        )
        store.add_version(v_a)
        
        # Version B
        v_b = RuleVersion(
            id="OIML-R76-B",
            standard_code="OIML R-76",
            version_label="2012",
            effective_date=date(2013, 1, 1),
            status=RuleStatus.ACTIVE,
            source=RuleSource.VERIFIED,
        )
        store.add_version(v_b)
        
        # Add rules to each version
        store.add_rule(VersionedComplianceRule(
            id="RPT-III-A",
            rule_version_id="OIML-R76-A",
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            limit_value=0.6,
            limit_unit="d",
        ))
        
        store.add_rule(VersionedComplianceRule(
            id="RPT-III-B",
            rule_version_id="OIML-R76-B",
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            limit_value=0.5,
            limit_unit="d",
        ))
        
        # Date-based resolution
        resolver = VersionedRuleResolver(store)
        
        # Before 2013 -> Version A
        limit_old = resolver.resolve(
            "RPT", InstrumentClass.III,
            effective_date=date(2010, 6, 15),
        )
        assert limit_old is not None
        assert limit_old.value == 0.6
        
        # After 2013 -> Version B
        limit_new = resolver.resolve(
            "RPT", InstrumentClass.III,
            effective_date=date(2015, 6, 15),
        )
        assert limit_new is not None
        assert limit_new.value == 0.5
    
    def test_historical_report_preserves_version(self):
        """Historical reports always reference their exact rule version."""
        store = VersionedRuleStore()
        
        # Create two versions with different limits
        v_2009 = RuleVersion(
            id="R76-2009",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            status=RuleStatus.ACTIVE,
        )
        store.add_version(v_2009)
        
        store.add_rule(VersionedComplianceRule(
            id="RPT-III-2009",
            rule_version_id="R76-2009",
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            limit_value=0.5,
            limit_unit="d",
        ))
        
        # Simulate: report finalized with 2009 rules
        store.freeze_version("R76-2009", "REPORT-001")
        
        # Later, a new version is added with different limits
        v_2024 = RuleVersion(
            id="R76-2024",
            standard_code="OIML R-76",
            version_label="2024",
            effective_date=date(2025, 1, 1),
            status=RuleStatus.ACTIVE,
        )
        store.add_version(v_2024)
        
        store.add_rule(VersionedComplianceRule(
            id="RPT-III-2024",
            rule_version_id="R76-2024",
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            limit_value=0.4,
            limit_unit="d",
        ))
        
        # The frozen version still has the original limit
        frozen_version = store.get_version("R76-2009")
        assert frozen_version.is_frozen()
        assert frozen_version.frozen_by == "REPORT-001"
        
        # The 2009 rules are preserved
        rules_2009 = store.get_rules_for_version("R76-2009")
        assert len(rules_2009) == 1
        assert rules_2009[0].limit_value == 0.5  # Original value preserved
        
        # New resolution uses 2024 rules
        resolver = VersionedRuleResolver(store)
        limit_current = resolver.resolve(
            "RPT", InstrumentClass.III,
            effective_date=date(2025, 6, 15),
        )
        assert limit_current.value == 0.4  # New value


# ============================================================================
# MIGRATION HELPER TESTS
# ============================================================================

class TestMigration:
    """Tests for migrating from old rule format."""
    
    def test_migrate_old_rules(self):
        """Migrate old ComplianceRule objects to versioned format."""
        # Create old-style rules
        old_rules = [
            ComplianceRule(
                id="RPT-III-001",
                version="2009",
                standard="OIML R-76",
                standard_version="2009",
                rule_type="repeatability",
                instrument_class=InstrumentClass.III,
                parameters={"max_std_dev": 0.5, "unit": "d", "description": "Test"},
            ),
            ComplianceRule(
                id="ECC-III-001",
                version="2009",
                standard="OIML R-76",
                standard_version="2009",
                rule_type="eccentricity",
                instrument_class=InstrumentClass.III,
                parameters={"max_eccentricity": 1.0, "unit": "d", "description": "Test"},
            ),
        ]
        
        version, new_rules = create_version_from_old_store(
            old_store_rules=old_rules,
            version_id="MIGRATED-2009",
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            source=RuleSource.VERIFIED,
        )
        
        assert version.id == "MIGRATED-2009"
        assert version.source == RuleSource.VERIFIED
        assert len(new_rules) == 2
        
        # Verify limits were extracted correctly
        rpt_rule = [r for r in new_rules if r.test_code == "repeatability"][0]
        assert rpt_rule.limit_value == 0.5
        
        ecc_rule = [r for r in new_rules if r.test_code == "eccentricity"][0]
        assert ecc_rule.limit_value == 1.0
    
    def test_migrate_and_use(self):
        """Migrate old rules and use them with the resolver."""
        old_rules = [
            ComplianceRule(
                id="RPT-III-001",
                version="2009",
                standard="OIML R-76",
                standard_version="2009",
                rule_type="repeatability",
                instrument_class=InstrumentClass.III,
                parameters={"max_std_dev": 0.5, "unit": "d"},
            ),
        ]
        
        store = VersionedRuleStore()
        version, rules = create_version_from_old_store(
            old_rules, "MIG-2009", "OIML R-76", "2009", date(2010, 1, 1)
        )
        store.add_version(version)
        for rule in rules:
            store.add_rule(rule)
        
        resolver = VersionedRuleResolver(store)
        
        # Note: migrated rules use original rule_type as test_code
        # which may need mapping in production
        limit = resolver.resolve(
            "repeatability", InstrumentClass.III,
            version_label="2009",
        )
        
        assert limit is not None
        assert limit.value == 0.5


# ============================================================================
# RULE GET_LIMIT TEST
# ============================================================================

class TestRuleGetLimit:
    """Tests for VersionedComplianceRule.get_limit()."""
    
    def test_get_limit(self):
        """Get ApplicableLimit from a rule."""
        rule = VersionedComplianceRule(
            id="RPT-001",
            rule_version_id="VER-001",
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            limit_key="max_std_dev",
            limit_value=0.5,
            limit_unit="d",
            description="Max std dev for Class III",
        )
        
        limit = rule.get_limit()
        
        assert limit is not None
        assert limit.limit_key == "max_std_dev"
        assert limit.value == 0.5
        assert limit.unit == "d"
        assert limit.rule_id == "RPT-001"
    
    def test_get_limit_no_value(self):
        """Rule with no limit value returns None."""
        rule = VersionedComplianceRule(
            id="RPT-001",
            rule_version_id="VER-001",
            test_code="RPT",
            instrument_class=InstrumentClass.III,
            limit_value=None,
        )
        
        limit = rule.get_limit()
        assert limit is None
