"""
NAWI TestFlow — Forward-Compatible Rule Versioning Tests

Regression tests for the "support future OIML revisions without code changes"
contract:

1. Standard-name aliasing ("OIML-R76" == "OIML R-76").
2. Newest-revision resolution (a future revision wins automatically; a pinned
   version stays stable).
3. Generic canonical rule limits: any rule row may declare a numeric limit via
   ``limit_key`` / ``limit_value`` / ``limit_unit`` and it is passed into the
   engine's RuleStore verbatim (with typed, known keys taking precedence when
   both are present on the same row).
"""

from app.api.v1.tests import (
    _build_rule_store,
    _normalize_standard,
    _rows_for_version,
    _version_num,
)
from engine.types import InstrumentClass


def _row(rule_id: str, rule_type: str, rule_data: dict, version: str = "DEMO-2026.01",
         standard: str = "OIML-R76") -> dict:
    return {
        "id": rule_id,
        "standard": standard,
        "standard_version": version,
        "rule_type": rule_type,
        "rule_name": rule_id,
        "rule_data": rule_data,
        "is_active": True,
    }


class TestStandardNormalization:
    def test_name_aliases_are_equivalent(self):
        assert _normalize_standard("OIML-R76") == _normalize_standard("OIML R-76")
        assert _normalize_standard("oiml r-76") == _normalize_standard("OIML-R76")
        assert _normalize_standard("OIML R 76-1") == _normalize_standard("OIML-R76-1")

    def test_none_and_missing(self):
        assert _normalize_standard(None) == ""

    def test_version_num_ordering(self):
        assert _version_num("DEMO-2026.01") == 2026
        assert _version_num("2006") == 2006
        assert _version_num("") == 0
        assert _version_num(None) == 0


class TestRowsForVersion:
    def _rows(self):
        return [
            _row("a", "mpe_table", {"instrument_class": "III", "mpe_ranges": []}, version="2006"),
            _row("b", "mpe_table", {"instrument_class": "III", "mpe_ranges": []}, version="DEMO-2026.01"),
            _row("c", "mpe_table", {"instrument_class": "III", "mpe_ranges": []}, version="DEMO-2026.02"),
        ]

    def test_newest_revision_wins(self):
        rows = self._rows()
        selected = _rows_for_version(rows, None)
        assert [r["id"] for r in selected] == ["c"]

    def test_pinned_version_wins_when_present(self):
        rows = self._rows()
        selected = _rows_for_version(rows, "2006")
        assert [r["id"] for r in selected] == ["a"]

    def test_mixed_naming_is_unified(self):
        rows = self._rows()
        rows.append(_row("d", "mpe_table", {"instrument_class": "III", "mpe_ranges": []},
                         version="2009", standard="OIML R-76"))
        # All OIML family rows are one pool; newest release = 2026.02.
        assert [r["id"] for r in _rows_for_version(rows, "2009")] == ["d"]
        assert [r["id"] for r in _rows_for_version(rows, None)] == ["c"]

    def test_empty_selection(self):
        assert _rows_for_version([], None) == []


class TestBuildRuleStore:
    def _mpe_data(self):
        return {
            "instrument_class": "III",
            "mpe_ranges": [
                {"mpe": "0.5e", "min_load": 0, "max_load": 500},
                {"mpe": "1.0e", "min_load": 500, "max_load": 2000},
                {"mpe": "1.5e", "min_load": 2000, "max_load": 3000},
            ],
        }

    def test_live_mpe_ranges_shape(self):
        store = _build_rule_store(
            [_row("m1", "mpe_table", self._mpe_data())],
            {"instrument_class": "III"},
            {},
        )
        assert store is not None
        mpe = store.get_rules_by_type("mpe", InstrumentClass("III"))
        assert len(mpe) == 3
        assert [r.parameters["multiplier"] for r in mpe] == [0.5, 1.0, 1.5]
        assert all(r.parameters.get("unit") == "e" for r in mpe)

    def test_canonical_trio_passed_through(self):
        rows = [{
            "id": "r1",
            "standard": "OIML-R76",
            "standard_version": "DEMO-2026.01",
            "rule_type": "test_point",
            "rule_name": "Future Repeatability",
            "rule_data": {
                "test_code": "RPT",
                "instrument_class": "II",
                "limit_key": "max_std_dev",
                "limit_value": 0.05,
                "limit_unit": "d",
                "description": "Future revision repeatability limit",
            },
            "is_active": True,
        }]
        store = _build_rule_store(rows, {"instrument_class": "II"}, {})
        assert store is not None
        rpts = store.get_rules_by_type("repeatability", InstrumentClass("II"))
        assert len(rpts) == 1
        assert rpts[0].parameters["max_std_dev"] == 0.05
        assert rpts[0].parameters["unit"] == "d"

    def test_canonical_new_parameter_passthrough(self):
        """A limit parameter the engine has never heard of still resolves."""
        rows = [_row("r2", "test_point", {
            "test_code": "RPT",
            "instrument_class": "all",
            "limit_key": "max_weighing_percent",
            "limit_value": 0.02,
            "limit_unit": "%",
        })]
        store = _build_rule_store(rows, {"instrument_class": "III"}, {})
        assert store is not None
        rpts = store.get_rules_by_type("repeatability", InstrumentClass("III"))
        assert len(rpts) == 1
        assert rpts[0].parameters["max_weighing_percent"] == 0.02
        assert rpts[0].parameters["unit"] == "%"

    def test_cv_conversion_when_no_canonical(self):
        rows = [_row("r3", "test_point", {
            "test_code": "RPT",
            "instrument_class": "III",
            "max_cv_percent": 0.03,
            "min_observations": 5,
        })]
        context = {"scale_interval": 0.1, "load": 1000}
        store = _build_rule_store(rows, {"instrument_class": "III"}, context)
        assert store is not None
        rpt = store.get_rules_by_type("repeatability", InstrumentClass("III"))[0]
        # cv/100 * L / e = 0.03/100 * 1000 / 0.1 = 3.0 d
        assert abs(rpt.parameters["max_std_dev"] - 3.0) < 1e-9
        assert rpt.parameters["unit"] == "d"

    def test_canonical_takes_precedence_over_typed(self):
        rows = [_row("r4", "test_point", {
            "test_code": "RPT",
            "instrument_class": "III",
            "max_cv_percent": 0.03,
            "limit_key": "max_std_dev",
            "limit_value": 2.5,
            "limit_unit": "g",
        })]
        store = _build_rule_store(rows, {"instrument_class": "III"}, {})
        rpt = store.get_rules_by_type("repeatability", InstrumentClass("III"))[0]
        assert rpt.parameters["max_std_dev"] == 2.5
        assert rpt.parameters["unit"] == "g"

    def test_canonical_declaration_is_authoritative_for_its_own_key(self):
        """Canonical max_cv_percent must not be overwritten by the typed CV
        branch (which would convert it into max_std_dev·d)."""
        rows = [_row("r5", "test_point", {
            "test_code": "RPT",
            "instrument_class": "III",
            "max_cv_percent": 0.03,
            "limit_key": "max_cv_percent",
            "limit_value": 0.02,
            "limit_unit": "%",
        })]
        store = _build_rule_store(
            rows,
            {"instrument_class": "III"},
            {"scale_interval": 0.1, "load": 1000},
        )
        rpt = store.get_rules_by_type("repeatability", InstrumentClass("III"))[0]
        assert rpt.parameters.get("max_cv_percent") == 0.02
        assert "max_std_dev" not in rpt.parameters
        assert rpt.parameters["unit"] == "%"

    def test_no_rules_returns_none(self):
        assert _build_rule_store([], {"instrument_class": "III"}, {}) is None