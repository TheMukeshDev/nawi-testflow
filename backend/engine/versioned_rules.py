"""
NAWI TestFlow — Versioned Regulatory-Rule Architecture

Supports future updates to OIML recommendations while preserving
historical report integrity.

Key Design Decisions:
    1. Rules are organized by RuleVersion (e.g., "OIML R-76 2009")
    2. Each RuleVersion has effective/expiry dates
    3. Rules used by finalized reports are FROZEN (immutable)
    4. Historical reports always reference their exact rule version
    5. DEMO rules are clearly separated from VERIFIED rules

Architecture:
    RuleVersion (metadata: standard, version, dates, status)
        └── ComplianceRule (specific limits for a test/class)
            └── Resolved by VersionedRuleResolver
                └── Result: ApplicableLimit + RuleVersion reference

CRITICAL INVARIANTS:
    - Frozen rules CANNOT be modified or deleted
    - Every compliance decision references a specific rule version
    - DEMO rules are never used for production decisions
    - Missing rules -> RULE_NOT_CONFIGURED (never guessed)
"""

from datetime import datetime, date
from typing import Optional, Any
from dataclasses import dataclass, field
from enum import Enum

from .types import (
    InstrumentClass,
    ApplicableLimit,
    TestStatusCode,
)


# ============================================================================
# ENUMERATIONS
# ============================================================================

class RuleStatus(str, Enum):
    """Status of a rule version."""
    DRAFT = "draft"           # Under development, not for use
    ACTIVE = "active"         # Currently in effect
    EXPIRED = "expired"       # Superseded by a newer version
    FROZEN = "frozen"         # Locked for a finalized report


class RuleSource(str, Enum):
    """Source classification for rules."""
    DEMO = "demo"             # Illustrative values, NOT for production
    VERIFIED = "verified"     # Verified against official standard
    CUSTOM = "custom"         # Organization-specific rules


# ============================================================================
# RULE VERSION
# ============================================================================

@dataclass
class RuleVersion:
    """
    A complete version of a regulatory standard.

    Example:
        RuleVersion(
            standard_code="OIML R-76",
            version_label="2009",
            effective_date=date(2010, 1, 1),
            source=RuleSource.VERIFIED,
            status=RuleStatus.ACTIVE,
        )

    Rules within this version define specific limits for each test type
    and instrument class.
    """
    # Identification
    id: str                                    # e.g., "OIML-R76-2009"
    standard_code: str                         # e.g., "OIML R-76"
    version_label: str                         # e.g., "2009"
    
    # Dates
    effective_date: date                       # When this version becomes effective
    expiry_date: Optional[date] = None         # When superseded (None = no expiry)
    
    # Status
    status: RuleStatus = RuleStatus.DRAFT
    source: RuleSource = RuleSource.DEMO
    
    # Metadata
    title: str = ""                            # Human-readable title
    description: str = ""                      # Detailed description
    document_reference: str = ""               # Official document reference
    notes: str = ""                            # Additional notes
    
    # Audit
    created_at: datetime = field(default_factory=datetime.utcnow)
    created_by: str = "system"
    frozen_at: Optional[datetime] = None       # When frozen for a report
    frozen_by: Optional[str] = None            # Who froze it (report ID)
    
    def is_available(self, on_date: Optional[date] = None) -> bool:
        """Check if this version is available for use on a given date.
        
        A version is available if:
        - It is ACTIVE, FROZEN, or EXPIRED (expired means superseded but still valid)
        - The check date is on or after the effective date
        - The check date is before the expiry date (if set)
        
        DRAFT versions are never available.
        """
        check_date = on_date or date.today()
        
        # DRAFT versions are never available
        if self.status == RuleStatus.DRAFT:
            return False
        
        # Must be on or after effective date
        if check_date < self.effective_date:
            return False
        
        # Must be before expiry date (if set)
        if self.expiry_date and check_date > self.expiry_date:
            return False
        
        return True
    
    def freeze(self, report_id: str, user_id: str = "system") -> None:
        """
        Freeze this version for a finalized report.
        
        Once frozen, the version and all its rules become immutable.
        This ensures historical reports always reference their exact rule version.
        """
        if self.status == RuleStatus.FROZEN:
            raise ValueError(
                "Version {} is already frozen for report {}".format(
                    self.id, self.frozen_by
                )
            )
        
        self.status = RuleStatus.FROZEN
        self.frozen_at = datetime.utcnow()
        self.frozen_by = report_id
    
    def is_frozen(self) -> bool:
        """Check if this version is frozen."""
        return self.status == RuleStatus.FROZEN


# ============================================================================
# VERSIONED COMPLIANCE RULE
# ============================================================================

@dataclass
class VersionedComplianceRule:
    """
    A single compliance rule tied to a specific RuleVersion.

    This rule defines the actual limits/values for a test type
    and instrument class within a specific version of a standard.
    """
    # Identification
    id: str                                    # e.g., "RPT-III-001"
    rule_version_id: str                       # FK to RuleVersion.id
    
    # Applicability
    test_code: str                             # e.g., "RPT", "ECC"
    instrument_class: Optional[InstrumentClass] = None
    
    # Calculation Configuration
    parameters: dict[str, Any] = field(default_factory=dict)
    # Example parameters:
    #   {"max_std_dev": 0.5, "unit": "d", "comparison": "<="}
    #   {"max_eccentricity": 1.0, "unit": "d", "comparison": "<="}
    
    # Pass/Fail Logic
    comparison_operator: str = "<="            # <=, >=, ==, !=
    limit_key: str = ""                        # Key in parameters that holds the limit
    limit_value: Optional[float] = None        # The actual limit value
    limit_unit: str = ""                       # Unit of the limit
    
    # Status
    is_active: bool = True
    source: RuleSource = RuleSource.DEMO
    
    # Metadata
    description: str = ""
    notes: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    
    def get_limit(self) -> Optional[ApplicableLimit]:
        """Convert to ApplicableLimit for use by the compliance evaluator."""
        if self.limit_value is None:
            return None
        
        return ApplicableLimit(
            limit_key=self.limit_key or self.test_code,
            label=self.description or self.test_code,
            value=self.limit_value,
            unit=self.limit_unit,
            rule_id=self.id,
            rule_version=self.rule_version_id,
            description=self.description,
        )


# ============================================================================
# RULE VERSION STORE
# ============================================================================

class VersionedRuleStore:
    """
    Manages multiple versions of compliance rules.

    Supports:
    - Multiple versions of the same standard
    - Version activation/expiry
    - Rule freezing for finalized reports
    - DEMO/VERIFIED separation
    - Date-based version lookup
    """

    def __init__(self):
        self._versions: dict[str, RuleVersion] = {}
        self._rules: dict[str, VersionedComplianceRule] = {}
        self._rules_by_version: dict[str, list[str]] = {}  # version_id -> [rule_ids]

    # ====================================================================
    # VERSION MANAGEMENT
    # ====================================================================

    def add_version(self, version: RuleVersion) -> None:
        """Add a new rule version."""
        if version.id in self._versions:
            raise ValueError("Version {} already exists".format(version.id))
        self._versions[version.id] = version

    def get_version(self, version_id: str) -> Optional[RuleVersion]:
        """Get a version by ID."""
        return self._versions.get(version_id)

    def get_versions_by_standard(self, standard_code: str) -> list[RuleVersion]:
        """Get all versions for a standard, sorted by effective date."""
        versions = [
            v for v in self._versions.values()
            if v.standard_code == standard_code
        ]
        return sorted(versions, key=lambda v: v.effective_date)

    def get_active_version(
        self,
        standard_code: str,
        on_date: Optional[date] = None,
    ) -> Optional[RuleVersion]:
        """
        Get the active version of a standard for a given date.

        Args:
            standard_code: e.g., "OIML R-76"
            on_date: Date to check (default: today)

        Returns:
            Active RuleVersion if found, None otherwise
        """
        check_date = on_date or date.today()
        
        candidates = [
            v for v in self._versions.values()
            if v.standard_code == standard_code
            and v.is_available(check_date)
        ]
        
        if not candidates:
            return None
        
        # Return the most recent effective version
        return max(candidates, key=lambda v: v.effective_date)

    def get_latest_version(self, standard_code: str) -> Optional[RuleVersion]:
        """Get the latest version of a standard (regardless of effective date)."""
        versions = self.get_versions_by_standard(standard_code)
        return versions[-1] if versions else None

    def freeze_version(self, version_id: str, report_id: str, user_id: str = "system") -> None:
        """
        Freeze a version for a finalized report.

        Once frozen, the version and all its rules become immutable.
        """
        version = self.get_version(version_id)
        if version is None:
            raise ValueError("Version {} not found".format(version_id))
        
        version.freeze(report_id, user_id)
        
        # Also freeze all rules in this version
        rule_ids = self._rules_by_version.get(version_id, [])
        for rule_id in rule_ids:
            rule = self._rules.get(rule_id)
            if rule:
                rule.is_active = True  # Ensure rules are active in frozen version

    # ====================================================================
    # RULE MANAGEMENT
    # ====================================================================

    def add_rule(self, rule: VersionedComplianceRule) -> None:
        """Add a rule to a version."""
        version = self.get_version(rule.rule_version_id)
        if version is None:
            raise ValueError("Version {} not found".format(rule.rule_version_id))
        
        if version.is_frozen():
            raise ValueError(
                "Cannot add rule to frozen version {}".format(version.id)
            )
        
        self._rules[rule.id] = rule
        
        if rule.rule_version_id not in self._rules_by_version:
            self._rules_by_version[rule.rule_version_id] = []
        
        if rule.id not in self._rules_by_version[rule.rule_version_id]:
            self._rules_by_version[rule.rule_version_id].append(rule.id)

    def update_rule(self, rule_id: str, **kwargs) -> None:
        """
        Update a rule's parameters.

        Raises ValueError if the rule is in a frozen version.
        """
        rule = self._rules.get(rule_id)
        if rule is None:
            raise ValueError("Rule {} not found".format(rule_id))
        
        version = self.get_version(rule.rule_version_id)
        if version and version.is_frozen():
            raise ValueError(
                "Cannot modify rule in frozen version {}".format(version.id)
            )
        
        for key, value in kwargs.items():
            if hasattr(rule, key):
                setattr(rule, key, value)
        
        rule.updated_at = datetime.utcnow()

    def delete_rule(self, rule_id: str) -> None:
        """
        Delete a rule.

        Raises ValueError if the rule is in a frozen version.
        """
        rule = self._rules.get(rule_id)
        if rule is None:
            raise ValueError("Rule {} not found".format(rule_id))
        
        version = self.get_version(rule.rule_version_id)
        if version and version.is_frozen():
            raise ValueError(
                "Cannot delete rule in frozen version {}".format(version.id)
            )
        
        del self._rules[rule_id]
        
        rule_ids = self._rules_by_version.get(rule.rule_version_id, [])
        if rule_id in rule_ids:
            rule_ids.remove(rule_id)

    def get_rule(self, rule_id: str) -> Optional[VersionedComplianceRule]:
        """Get a rule by ID."""
        return self._rules.get(rule_id)

    def get_rules_for_version(self, version_id: str) -> list[VersionedComplianceRule]:
        """Get all rules for a specific version."""
        rule_ids = self._rules_by_version.get(version_id, [])
        return [self._rules[rid] for rid in rule_ids if rid in self._rules]

    def get_rules_for_version_by_type(
        self,
        version_id: str,
        test_code: str,
        instrument_class: Optional[InstrumentClass] = None,
    ) -> list[VersionedComplianceRule]:
        """Get rules for a version, filtered by test code and instrument class."""
        rules = self.get_rules_for_version(version_id)
        
        result = [r for r in rules if r.test_code == test_code and r.is_active]
        
        if instrument_class:
            result = [r for r in result if r.instrument_class == instrument_class]
        
        return result

    def get_all_versions(self) -> list[RuleVersion]:
        """Get all versions sorted by standard and effective date."""
        return sorted(
            self._versions.values(),
            key=lambda v: (v.standard_code, v.effective_date),
        )

    def get_all_rules(self) -> list[VersionedComplianceRule]:
        """Get all rules."""
        return list(self._rules.values())


# ============================================================================
# VERSIONED RULE RESOLVER
# ============================================================================

class VersionedRuleResolver:
    """
    Resolves applicable rules from a versioned rule store.

    Resolution strategies:
        1. Explicit version: "Use OIML R-76 2009 rules"
        2. Date-based: "Use rules effective on 2024-01-15"
        3. Latest active: "Use the most current rules"

    If no matching rule exists, returns RULE_NOT_CONFIGURED.
    """

    def __init__(self, store: VersionedRuleStore):
        self.store = store

    def resolve(
        self,
        test_code: str,
        instrument_class: InstrumentClass,
        standard_code: str = "OIML R-76",
        version_label: Optional[str] = None,
        effective_date: Optional[date] = None,
    ) -> Optional[ApplicableLimit]:
        """
        Resolve an applicable limit for a test.

        Args:
            test_code: Test code (e.g., "RPT", "ECC")
            instrument_class: Instrument class (e.g., III)
            standard_code: Standard to use (default: "OIML R-76")
            version_label: Explicit version (e.g., "2009")
            effective_date: Date to resolve against

        Returns:
            ApplicableLimit if found, None if not configured
        """
        # Find the appropriate version
        if version_label:
            # Explicit version requested
            version = self._find_version_by_label(standard_code, version_label)
        elif effective_date:
            # Date-based resolution
            version = self.store.get_active_version(standard_code, effective_date)
        else:
            # Latest active version
            version = self.store.get_active_version(standard_code)
        
        if version is None:
            return None
        
        # Find matching rules in this version
        rules = self.store.get_rules_for_version_by_type(
            version.id, test_code, instrument_class
        )
        
        if not rules:
            return None
        
        # Return the first matching rule's limit
        return rules[0].get_limit()

    def resolve_all(
        self,
        instrument_class: InstrumentClass,
        standard_code: str = "OIML R-76",
        version_label: Optional[str] = None,
        effective_date: Optional[date] = None,
    ) -> dict[str, Optional[ApplicableLimit]]:
        """
        Resolve all applicable limits for an instrument class.

        Returns:
            Dict mapping test_code to ApplicableLimit
        """
        test_codes = ["RPT", "ECC", "LIN", "DIS", "STB"]
        result = {}
        
        for test_code in test_codes:
            limit = self.resolve(
                test_code, instrument_class,
                standard_code, version_label, effective_date,
            )
            result[test_code] = limit
        
        return result

    def _find_version_by_label(
        self,
        standard_code: str,
        version_label: str,
    ) -> Optional[RuleVersion]:
        """Find a version by standard code and version label."""
        versions = self.store.get_versions_by_standard(standard_code)
        
        for v in versions:
            if v.version_label == version_label and v.is_available():
                return v
        
        return None

    def get_version_info(
        self,
        standard_code: str = "OIML R-76",
        version_label: Optional[str] = None,
        effective_date: Optional[date] = None,
    ) -> Optional[RuleVersion]:
        """Get version metadata for reporting purposes."""
        if version_label:
            return self._find_version_by_label(standard_code, version_label)
        elif effective_date:
            return self.store.get_active_version(standard_code, effective_date)
        else:
            return self.store.get_active_version(standard_code)


# ============================================================================
# DEMO RULE BUILDER
# ============================================================================

def create_demo_rule_store() -> VersionedRuleStore:
    """
    Create a rule store with DEMO rules.

    IMPORTANT: These values are for demonstration and testing only.
    They are NOT verified against the official OIML R-76 standard.
    Always verify against the current official document before production use.

    These rules are clearly marked as DEMO and should NEVER be used
    for actual compliance decisions in a production environment.
    """
    store = VersionedRuleStore()
    
    # ── OIML R-76 2009 DEMO Version ──
    r76_2009 = RuleVersion(
        id="OIML-R76-2009-DEMO",
        standard_code="OIML R-76",
        version_label="2009",
        effective_date=date(2010, 1, 1),
        status=RuleStatus.ACTIVE,
        source=RuleSource.DEMO,
        title="OIML R-76 (2009) — DEMO Rules",
        description=(
            "Demonstration rules based on publicly available OIML R-76 information. "
            "These values are illustrative and MUST be verified against the "
            "official standard document before production use."
        ),
        document_reference="OIML R 76-1:2006 (E) — DEMO COPY",
        notes="DEMO RULES — Not for production use",
    )
    store.add_version(r76_2009)
    
    # ── Class III Rules ──
    _add_repeatability_rule(store, "OIML-R76-2009-DEMO", InstrumentClass.III, 0.5, RuleSource.DEMO)
    _add_eccentricity_rule(store, "OIML-R76-2009-DEMO", InstrumentClass.III, 1.0, RuleSource.DEMO)
    _add_linearity_rule(store, "OIML-R76-2009-DEMO", InstrumentClass.III, 1.5, RuleSource.DEMO)
    _add_discrimination_rule(store, "OIML-R76-2009-DEMO", InstrumentClass.III, 1.0, RuleSource.DEMO)
    _add_stability_rule(store, "OIML-R76-2009-DEMO", InstrumentClass.III, 1.0, RuleSource.DEMO)
    
    # ── Class II Rules ──
    _add_repeatability_rule(store, "OIML-R76-2009-DEMO", InstrumentClass.II, 0.3, RuleSource.DEMO)
    _add_eccentricity_rule(store, "OIML-R76-2009-DEMO", InstrumentClass.II, 0.5, RuleSource.DEMO)
    _add_linearity_rule(store, "OIML-R76-2009-DEMO", InstrumentClass.II, 1.0, RuleSource.DEMO)
    _add_discrimination_rule(store, "OIML-R76-2009-DEMO", InstrumentClass.II, 0.5, RuleSource.DEMO)
    _add_stability_rule(store, "OIML-R76-2009-DEMO", InstrumentClass.II, 0.5, RuleSource.DEMO)
    
    return store


def _add_repeatability_rule(
    store: VersionedRuleStore,
    version_id: str,
    instrument_class: InstrumentClass,
    max_std_dev: float,
    source: RuleSource,
) -> None:
    """Add a repeatability rule."""
    store.add_rule(VersionedComplianceRule(
        id="RPT-{}-{}".format(instrument_class.value, version_id),
        rule_version_id=version_id,
        test_code="RPT",
        instrument_class=instrument_class,
        parameters={"max_std_dev": max_std_dev, "unit": "d"},
        comparison_operator="<=",
        limit_key="max_std_dev",
        limit_value=max_std_dev,
        limit_unit="d",
        source=source,
        description="Maximum standard deviation for {} repeatability".format(instrument_class.value),
    ))


def _add_eccentricity_rule(
    store: VersionedRuleStore,
    version_id: str,
    instrument_class: InstrumentClass,
    max_eccentricity: float,
    source: RuleSource,
) -> None:
    """Add an eccentricity rule."""
    store.add_rule(VersionedComplianceRule(
        id="ECC-{}-{}".format(instrument_class.value, version_id),
        rule_version_id=version_id,
        test_code="ECC",
        instrument_class=instrument_class,
        parameters={"max_eccentricity": max_eccentricity, "unit": "d"},
        comparison_operator="<=",
        limit_key="max_eccentricity",
        limit_value=max_eccentricity,
        limit_unit="d",
        source=source,
        description="Maximum eccentricity for {}".format(instrument_class.value),
    ))


def _add_linearity_rule(
    store: VersionedRuleStore,
    version_id: str,
    instrument_class: InstrumentClass,
    max_linearity: float,
    source: RuleSource,
) -> None:
    """Add a linearity rule."""
    store.add_rule(VersionedComplianceRule(
        id="LIN-{}-{}".format(instrument_class.value, version_id),
        rule_version_id=version_id,
        test_code="LIN",
        instrument_class=instrument_class,
        parameters={"max_linearity": max_linearity, "unit": "d"},
        comparison_operator="<=",
        limit_key="max_linearity",
        limit_value=max_linearity,
        limit_unit="d",
        source=source,
        description="Maximum linearity error for {}".format(instrument_class.value),
    ))


def _add_discrimination_rule(
    store: VersionedRuleStore,
    version_id: str,
    instrument_class: InstrumentClass,
    min_discrimination: float,
    source: RuleSource,
) -> None:
    """Add a discrimination rule."""
    store.add_rule(VersionedComplianceRule(
        id="DIS-{}-{}".format(instrument_class.value, version_id),
        rule_version_id=version_id,
        test_code="DIS",
        instrument_class=instrument_class,
        parameters={"min_discrimination": min_discrimination, "unit": "mg"},
        comparison_operator=">=",
        limit_key="min_discrimination",
        limit_value=min_discrimination,
        limit_unit="mg",
        source=source,
        description="Minimum discrimination for {}".format(instrument_class.value),
    ))


def _add_stability_rule(
    store: VersionedRuleStore,
    version_id: str,
    instrument_class: InstrumentClass,
    max_drift: float,
    source: RuleSource,
) -> None:
    """Add a stability rule."""
    store.add_rule(VersionedComplianceRule(
        id="STB-{}-{}".format(instrument_class.value, version_id),
        rule_version_id=version_id,
        test_code="STB",
        instrument_class=instrument_class,
        parameters={"max_drift": max_drift, "unit": "d"},
        comparison_operator="<=",
        limit_key="max_drift",
        limit_value=max_drift,
        limit_unit="d",
        source=source,
        description="Maximum drift for {} stability".format(instrument_class.value),
    ))


# ============================================================================
# RULE VERSION MIGRATION HELPER
# ============================================================================

def create_version_from_old_store(
    old_store_rules: list,
    version_id: str,
    standard_code: str,
    version_label: str,
    effective_date: date,
    source: RuleSource = RuleSource.DEMO,
) -> tuple[RuleVersion, list[VersionedComplianceRule]]:
    """
    Create a RuleVersion from old-style ComplianceRule objects.

    This helper migrates from the old flat rule store to the versioned system.
    """
    version = RuleVersion(
        id=version_id,
        standard_code=standard_code,
        version_label=version_label,
        effective_date=effective_date,
        status=RuleStatus.ACTIVE,
        source=source,
        title="{} {} — Migrated".format(standard_code, version_label),
        description="Migrated from old rule store format",
    )
    
    new_rules = []
    for old_rule in old_store_rules:
        params = old_rule.parameters
        
        # Determine limit key and value based on rule type
        limit_key = ""
        limit_value = None
        limit_unit = params.get("unit", "d")
        
        if old_rule.rule_type == "repeatability":
            limit_key = "max_std_dev"
            limit_value = params.get("max_std_dev")
        elif old_rule.rule_type == "eccentricity":
            limit_key = "max_eccentricity"
            limit_value = params.get("max_eccentricity")
        elif old_rule.rule_type == "linearity":
            limit_key = "max_linearity"
            limit_value = params.get("max_linearity")
        elif old_rule.rule_type == "discrimination":
            limit_key = "min_discrimination"
            limit_value = params.get("min_discrimination")
        elif old_rule.rule_type == "stability":
            limit_key = "max_drift"
            limit_value = params.get("max_drift")
        
        new_rule = VersionedComplianceRule(
            id="{}-{}".format(old_rule.id, version_id),
            rule_version_id=version_id,
            test_code=old_rule.rule_type if old_rule.rule_type in [
                "repeatability", "eccentricity", "linearity",
                "discrimination", "stability"
            ] else old_rule.rule_type,
            instrument_class=old_rule.instrument_class,
            parameters=params,
            comparison_operator="<=",
            limit_key=limit_key,
            limit_value=limit_value,
            limit_unit=limit_unit,
            source=source,
            description=params.get("description", ""),
        )
        new_rules.append(new_rule)
    
    return version, new_rules
