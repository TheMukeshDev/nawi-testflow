"""
NAWI TestFlow — Rule Resolver Module

Resolves applicable compliance rules for test calculations.
Rules are loaded from a rule store (database, file, or in-memory).
If a required rule does not exist, returns RULE_NOT_CONFIGURED.

IMPORTANT: This engine never guesses regulatory values.
If a rule is not found, the calculation status is RULE_NOT_CONFIGURED.

RULE SOURCING (per OIML R-76 rulebook):
  - Maximum Permissible Error (MPE) tables are taken from OIML R 76-1
    class tables (the only authoritative numeric limits in the standard).
  - The weighing error formula is the verbatim R 76-2 method:
        E   = I + ½·e − ΔL − L      (pre-rounding error)
        E_c = E − E₀                (corrected by initial zero-error)
  - Where OIML does NOT provide a numeric limit (e.g. repeatability,
    zero-setting, temperature tolerance), the limit is marked
    RULE_NOT_CONFIGURED so a human must review. We never invent values.
"""

from typing import Optional, Any
from dataclasses import dataclass, field
from datetime import datetime

from .types import (
    InstrumentClass,
    TestType,
    MassUnit,
    ApplicableLimit,
    TestStatusCode,
)


# ============================================================================
# RULE STORE
# ============================================================================

@dataclass
class ComplianceRule:
    """A single compliance rule."""
    id: str
    version: str
    standard: str  # e.g., "OIML R-76"
    standard_version: str  # e.g., "2009"
    rule_type: str  # e.g., "mpe", "repeatability", "eccentricity"
    instrument_class: Optional[InstrumentClass] = None
    parameters: dict[str, Any] = field(default_factory=dict)
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


class RuleStore:
    """
    In-memory rule store for development and testing.
    
    In production, this would be replaced by a database-backed store.
    """
    
    def __init__(self):
        self._rules: dict[str, ComplianceRule] = {}
    
    def add_rule(self, rule: ComplianceRule):
        """Add a rule to the store."""
        self._rules[rule.id] = rule
    
    def get_rule(self, rule_id: str) -> Optional[ComplianceRule]:
        """Get a rule by ID."""
        return self._rules.get(rule_id)
    
    def get_rules_by_type(
        self,
        rule_type: str,
        instrument_class: Optional[InstrumentClass] = None,
    ) -> list[ComplianceRule]:
        """Get all rules of a type, optionally filtered by instrument class."""
        rules = [
            r for r in self._rules.values()
            if r.rule_type == rule_type and r.is_active
        ]
        if instrument_class:
            rules = [
                r for r in rules
                if r.instrument_class is None or r.instrument_class == instrument_class
            ]
        return rules
    
    def get_active_rules(self) -> list[ComplianceRule]:
        """Get all active rules."""
        return [r for r in self._rules.values() if r.is_active]


# ============================================================================
# RULE RESOLVER
# ============================================================================

class RuleResolver:
    """
    Resolves applicable rules for test calculations.
    
    If a required rule does not exist, returns None and the caller
    should set status to RULE_NOT_CONFIGURED.
    """
    
    def __init__(self, rule_store: RuleStore):
        self.rule_store = rule_store
    
    def resolve_mpe_rule(
        self,
        instrument_class: InstrumentClass,
        scale_divisions: int,
    ) -> Optional[ApplicableLimit]:
        """
        Resolve Maximum Permissible Error rule.
        
        MPE is drawn from the official OIML R 76-1 class tables. The
        applicable multiplier is selected by the number of verification
        scale divisions (n = L/e).
        
        Args:
            instrument_class: Instrument class (I, II, III, etc.)
            scale_divisions: Number of verification scale divisions (L/e)
            
        Returns:
            ApplicableLimit if found, None if not configured
        """
        rules = self.rule_store.get_rules_by_type("mpe", instrument_class)
        
        for rule in rules:
            params = rule.parameters
            min_div = params.get("min_divisions", 0)
            max_div = params.get("max_divisions", float("inf"))
            
            if min_div <= scale_divisions <= max_div:
                return ApplicableLimit(
                    limit_key="mpe",
                    label="Maximum Permissible Error",
                    value=params.get("multiplier", 0),
                    unit=params.get("unit", "e"),
                    rule_id=rule.id,
                    rule_version=rule.version,
                    description=params.get(
                        "description",
                        "MPE per OIML R 76-1 Table 2",
                    ),
                )
        
        return None

    def resolve_mpe_for_load(
        self,
        instrument_class: InstrumentClass,
        load: float,
        scale_interval: float,
    ) -> Optional[ApplicableLimit]:
        """
        Resolve MPE for a specific applied load L.
        
        The number of verification scale divisions is n = L / e.
        This is the limit used by the weighing and eccentricity tests,
        which PASS only if |E_c| ≤ MPE(L).
        
        Args:
            instrument_class: Instrument class
            load: Applied load L (in scale_interval units)
            scale_interval: Verification scale interval e (same units as load)
            
        Returns:
            ApplicableLimit for the MPE at load L, or None if not configured
        """
        if scale_interval <= 0:
            return None
        divisions = int(round(load / scale_interval))
        return self.resolve_mpe_rule(instrument_class, divisions)
    
    def resolve_repeatability_rule(
        self,
        instrument_class: InstrumentClass,
    ) -> Optional[ApplicableLimit]:
        """
        Resolve repeatability limit rule.
        
        CRITICAL: OIML R-76 (R76-1 §5.5.4) does NOT specify a numeric
        repeatability limit. Per the rulebook, this returns None so the
        caller reports RULE_NOT_CONFIGURED rather than inventing a value.
        
        Args:
            instrument_class: Instrument class
            
        Returns:
            None (repeatability has no authoritative numeric limit)
        """
        rules = self.rule_store.get_rules_by_type("repeatability", instrument_class)
        
        # OIML R-76 gives NO numeric repeatability limit. The seeded rule
        # (RPT-R76-000) records this as RULE_NOT_CONFIGURED. If a reviewer
        # has configured a real national value (max_std_dev), use it;
        # otherwise return None so the caller reports RULE_NOT_CONFIGURED.
        for rule in rules:
            val = rule.parameters.get("max_std_dev")
            if val is not None:
                return ApplicableLimit(
                    limit_key="repeatability",
                    label="Maximum Standard Deviation",
                    value=val,
                    unit=rule.parameters.get("unit", "d"),
                    rule_id=rule.id,
                    rule_version=rule.version,
                    description=rule.parameters.get(
                        "description", "Repeatability limit (national value)"
                    ),
                )
        
        # No numeric limit configured -> RULE_NOT_CONFIGURED (None)
        return None
    
    def resolve_eccentricity_rule(
        self,
        instrument_class: InstrumentClass,
        load: Optional[float] = None,
        scale_interval: Optional[float] = None,
    ) -> Optional[ApplicableLimit]:
        """
        Resolve eccentricity limit rule.
        
        Per OIML R 76-2, the eccentricity error at each position is
        determined with the same method as weighing (5.4.3) and must meet
        the MPE for the test load.
        
        If load and scale_interval are provided, the MPE at that load is
        returned directly. Otherwise the class-level eccentricity rule is
        used (non-authoritative — reviewer must supply a value).
        """
        if load is not None and scale_interval is not None:
            return self.resolve_mpe_for_load(instrument_class, load, scale_interval)
        
        rules = self.rule_store.get_rules_by_type("eccentricity", instrument_class)
        
        if rules:
            rule = rules[0]
            val = rule.parameters.get("max_eccentricity")
            if val is not None:
                return ApplicableLimit(
                    limit_key="eccentricity",
                    label="Maximum Eccentricity",
                    value=val,
                    unit=rule.parameters.get("unit", "e"),
                    rule_id=rule.id,
                    rule_version=rule.version,
                    description=rule.parameters.get(
                        "description", "Eccentricity limit (must meet MPE)"
                    ),
                )
            # Class-level eccentricity rule without a numeric value:
            # eccentricity is judged against MPE, so fall through.
        
        return None
    
    def resolve_rule(
        self,
        test_code: str,
        instrument_class: InstrumentClass,
        **kwargs,
    ) -> Optional[ApplicableLimit]:
        """
        Generic rule resolver based on test code.

        MPE-based tests (weighing, eccentricity) resolve the MPE at the
        applied load. Tests without an authoritative numeric limit
        (repeatability, stability, linearity) return None so the caller
        reports RULE_NOT_CONFIGURED.
        
        Args:
            test_code: Test code (e.g., "RPT", "ECC", "WGT")
            instrument_class: Instrument class
            **kwargs: Additional parameters for rule lookup
                (e.g., load, scale_interval for MPE-based resolution)
            
        Returns:
            ApplicableLimit if found, None if not configured
        """
        resolver_map = {
            "WGT": self.resolve_weighing_rule,
            "RPT": self.resolve_repeatability_rule,
            "ECC": self.resolve_eccentricity_rule,
            "LIN": self.resolve_linearity_rule,
            "DIS": self.resolve_discrimination_rule,
            "STB": self.resolve_stability_rule,
        }
        
        resolver = resolver_map.get(test_code)
        if resolver:
            if test_code in ("WGT", "ECC"):
                return resolver(
                    instrument_class,
                    load=kwargs.get("load"),
                    scale_interval=kwargs.get("scale_interval"),
                )
            return resolver(instrument_class)
        
        return None

    def resolve_weighing_rule(
        self,
        instrument_class: InstrumentClass,
        load: Optional[float] = None,
        scale_interval: Optional[float] = None,
    ) -> Optional[ApplicableLimit]:
        """
        Resolve the limit for the gross-load weighing test.

        Per OIML R 76-2, the weighing error is
            E   = I + ½·e − ΔL − L
            E_c = E − E₀
        and the test PASSES if |E_c| ≤ MPE(L). The limit is therefore the
        official MPE at the applied load (R 76-1 Table 2).
        """
        if load is not None and scale_interval is not None:
            return self.resolve_mpe_for_load(instrument_class, load, scale_interval)
        return None

    def resolve_linearity_rule(
        self,
        instrument_class: InstrumentClass,
    ) -> Optional[ApplicableLimit]:
        """
        Resolve linearity limit rule.

        Linearity errors are judged against the MPE for each load.
        OIML R-76 gives no separate numeric linearity limit, so this stays
        RULE_NOT_CONFIGURED unless a reviewer configures one.
        """
        rules = self.rule_store.get_rules_by_type("linearity", instrument_class)
        for rule in rules:
            val = rule.parameters.get("max_linearity")
            if val is not None and rule.parameters.get("limit") != "RULE_NOT_CONFIGURED":
                return ApplicableLimit(
                    limit_key="linearity",
                    label="Maximum Linearity Error",
                    value=val,
                    unit=rule.parameters.get("unit", "e"),
                    rule_id=rule.id,
                    rule_version=rule.version,
                    description=rule.parameters.get("description", "Linearity limit"),
                )
        return None
    
    def resolve_discrimination_rule(
        self,
        instrument_class: InstrumentClass,
    ) -> Optional[ApplicableLimit]:
        """
        Resolve discrimination limit rule.

        Per OIML R 76-2 5.8, discrimination is a functional test: adding or
        removing a small weight must shift the indication by at least one
        scale interval. There is no numeric MPE — the decision is based on
        whether the indication moved by >= 1 d (== 1 e for equal d/e).
        """
        rules = self.rule_store.get_rules_by_type("discrimination", instrument_class)
        for rule in rules:
            val = rule.parameters.get("min_discrimination")
            if val is not None:
                return ApplicableLimit(
                    limit_key="discrimination",
                    label="Minimum Discrimination (scale intervals)",
                    value=val,
                    unit=rule.parameters.get("unit", "d"),
                    rule_id=rule.id,
                    rule_version=rule.version,
                    description=rule.parameters.get("description", "Discrimination limit"),
                )

        # Functional rule: indication must change by at least 1 scale
        # interval (d). This is the authoritative behavioural criterion
        # from R 76-2 5.8, not an invented numeric value.
        return ApplicableLimit(
            limit_key="discrimination",
            label="Minimum Change (scale intervals)",
            value=1.0,
            unit="d",
            rule_id="DIS-R76-001",
            rule_version="2006",
            description=(
                "Discrimination (R 76-2 5.8): indication must change by "
                "at least 1 scale interval when a small weight is added/removed."
            ),
        )
    
    def resolve_stability_rule(
        self,
        instrument_class: InstrumentClass,
    ) -> Optional[ApplicableLimit]:
        """
        Resolve stability limit rule.

        OIML R-76 does not specify a standalone numeric stability limit.
        This stays RULE_NOT_CONFIGURED unless a reviewer configures one.
        """
        rules = self.rule_store.get_rules_by_type("stability", instrument_class)
        for rule in rules:
            val = rule.parameters.get("max_drift")
            if val is not None and rule.parameters.get("limit") != "RULE_NOT_CONFIGURED":
                return ApplicableLimit(
                    limit_key="stability",
                    label="Maximum Drift",
                    value=val,
                    unit=rule.parameters.get("unit", "e"),
                    rule_id=rule.id,
                    rule_version=rule.version,
                    description=rule.parameters.get("description", "Stability limit"),
                )
        return None


# ============================================================================
# DEFAULT RULES (OIML R-76 METHOD)
# ============================================================================

# OIML R 76-1 Maximum Permissible Error (MPE) tables.
# Each entry is: (min_divisions, max_divisions, mpe_multiplier)
# where mpe (in verification scale intervals e) = multiplier × e.
# The only authoritative numeric limits in OIML R-76 are these MPE tables
# (R 76-1 Table 2). Other tests without a numeric criterion stay
# RULE_NOT_CONFIGURED.
MPE_TABLES: dict[InstrumentClass, list[tuple[int, Optional[int], float]]] = {
    InstrumentClass.I: [
        (0, 50000, 0.5),
        (50000, 200000, 1.0),
        (200000, None, 1.5),
    ],
    InstrumentClass.II: [
        (0, 5000, 0.5),
        (5000, 20000, 1.0),
        (20000, None, 1.5),
    ],
    InstrumentClass.III: [
        (0, 500, 0.5),
        (500, 2000, 1.0),
        (2000, None, 1.5),
    ],
    InstrumentClass.IIII: [
        (0, 50, 0.5),
        (50, 200, 1.0),
        (200, None, 1.5),
    ],
}

# Test codes that have NO numeric limit in OIML R-76 and therefore
# resolve to RULE_NOT_CONFIGURED unless a national/regulatory value is
# supplied by the operator. Per the rulebook, these are:
#   - Repeatability (R76-1 §5.5.4): no numeric limit given
TEST_CODES_WITHOUT_OIML_LIMIT = {"RPT"}


def create_default_rule_store() -> RuleStore:
    """
    Create a rule store with OIML R-76 reference rules.

    The only authoritative numeric limits seeded here are the official
    OIML R 76-1 MPE tables (Table 2). These are drawn from the standard
    class tables described in the rulebook and are NOT invented values.

    Tests for which OIML does not provide a numeric limit (e.g.
    repeatability per R76-1 §5.5.4) are deliberately left unconfigured so
    a reviewer must supply the applicable national/regulatory value.
    """
    store = RuleStore()

    # ── MPE tables per instrument class (official OIML R 76-1 values) ──
    for cls in InstrumentClass:
        table = MPE_TABLES.get(cls, [])
        for idx, (min_div, max_div, multiplier) in enumerate(table):
            store.add_rule(ComplianceRule(
                id=f"MPE-{cls.value}-{idx + 1:03d}",
                version="2006",
                standard="OIML R-76",
                standard_version="2006",
                rule_type="mpe",
                instrument_class=cls,
                parameters={
                    "min_divisions": min_div,
                    "max_divisions": max_div if max_div is not None else float("inf"),
                    "multiplier": multiplier,  # MPE = multiplier × e
                    "unit": "e",
                    "description": (
                        f"MPE for Class {cls.value}: ±{multiplier} e for "
                        f"{min_div} < n ≤ {max_div if max_div is not None else '∞'}"
                    ),
                },
            ))

    # ── Weighing (Gross Load) test — R76-1 §5.4 / §6.7 ──
    # Decision uses the MPE at the applied load: PASS if |E_c| ≤ MPE(L).
    # The error formula (R 76-2) is E = I + ½e − ΔL − L; E_c = E − E₀.
    store.add_rule(ComplianceRule(
        id="WGT-R76-001",
        version="2006",
        standard="OIML R-76",
        standard_version="2006",
        rule_type="weighing",
        parameters={
            "formula": "E = I + 0.5*e − ΔL − L;  E_c = E − E0",
            "decision": "PASS if abs(E_c) <= MPE(L)",
            "mpe_source": "OIML R 76-1 Table 2 (class MPE)",
            "unit": "e",
            "description": (
                "Gross load weighing test. Error per R 76-2, "
                "corrected by zero-error E0. Limit is the official MPE(L)."
            ),
        },
    ))

    # ── Eccentricity — R76-1 §5.5.5 ──
    # Same error formula as weighing; PASS if every position |E_c(i)| ≤ MPE.
    store.add_rule(ComplianceRule(
        id="ECC-R76-001",
        version="2006",
        standard="OIML R-76",
        standard_version="2006",
        rule_type="eccentricity",
        parameters={
            "formula": "E_i = I_i + 0.5*e − ΔL − L − E0_i",
            "decision": "PASS if all abs(E_c(i)) <= MPE(L)",
            "mpe_source": "OIML R 76-1 Table 2",
            "unit": "e",
            "description": (
                "Eccentricity test at each platter position. Each position "
                "must meet the MPE for the test load."
            ),
        },
    ))

    # ── Discrimination — R76-1 §5.7 / R76-2 5.8 ──
    # Functional rule: adding/removing a small weight must shift the
    # indication by at least ±1 scale interval (d). No numeric MPE exists.
    store.add_rule(ComplianceRule(
        id="DIS-R76-001",
        version="2006",
        standard="OIML R-76",
        standard_version="2006",
        rule_type="discrimination",
        parameters={
            "rule": "Adding/removing a small weight must shift indication by >= 1 d",
            "decision": "PASS if abs(dI) >= e (1 scale interval)",
            "unit": "d",
            "description": (
                "Discrimination: observed indication change must be at "
                "least one scale interval. Functional test, no numeric MPE."
            ),
        },
    ))

    # ── Repeatability — R76-1 §5.5.4 ──
    # OIML R-76 gives NO numeric repeatability limit. Per the rulebook this
    # stays RULE_NOT_CONFIGURED for human/national review.
    store.add_rule(ComplianceRule(
        id="RPT-R76-000",
        version="2006",
        standard="OIML R-76",
        standard_version="2006",
        rule_type="repeatability",
        parameters={
            "limit": "RULE_NOT_CONFIGURED",
            "description": (
                "Repeatability (R76-1 §5.5.4). OIML does not specify a "
                "numeric limit; must be set by national/regulatory rule."
            ),
        },
        is_active=True,
    ))

    # ── Stability / Linearity — retained for backward compatibility ──
    # These are not given explicit MPE-based numeric limits in R-76 either;
    # mark them RULE_NOT_CONFIGURED so reviewers supply applicable values
    # rather than relying on invented limits.
    for rule_type, rule_id, label in [
        ("stability", "STB-R76-000", "Stability"),
        ("linearity", "LIN-R76-000", "Linearity"),
    ]:
        store.add_rule(ComplianceRule(
            id=rule_id,
            version="2006",
            standard="OIML R-76",
            standard_version="2006",
            rule_type=rule_type,
            parameters={
                "limit": "RULE_NOT_CONFIGURED",
                "description": (
                    f"{label}: OIML R-76 does not provide a standalone "
                    "numeric limit; resolved against MPE by a reviewer."
                ),
            },
        ))

    return store
