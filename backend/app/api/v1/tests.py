"""
NAWI TestFlow — Test Reports Routes

CRUD operations and workflow actions for test reports.
Implements role-based authorization for all endpoints.

All persistence goes through the Supabase REST client (service role),
mirroring ``app/api/v1/reports.py``. Calculations and compliance run on the
authoritative ``engine`` package (``engine.orchestrator.CalculationEngine``);
the historical parallel engines in ``app/services/calculation_engine.py`` and
``app/services/compliance_engine.py`` have been retired.

Compliance rules are loaded from the ``compliance_rules`` table for the
report's standard/version and converted into an in-memory ``RuleStore``.
If no rules are configured a fresh default OIML R-76 store is used, so the
server never fabricates limits.
"""

import re
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.security import get_current_user_profile, get_supabase_client, require_permission
from app.services.validation_service import ValidationService

from engine.types import (
    TestInput,
    TestPointInput,
    RawObservation,
    MassUnit,
    InstrumentClass,
)
from engine.orchestrator import CalculationEngine
from engine.rules import RuleStore, ComplianceRule, create_default_rule_store

router = APIRouter(prefix="/tests", tags=["Tests"])
validation_service = ValidationService()

# ============================================================================
# MODELS
# ============================================================================


class TestReportCreate(BaseModel):
    instrument_id: UUID
    laboratory_id: UUID
    verification_type: str
    test_standard: str = "OIML R-76"
    test_standard_version: str = "2009"
    assigned_technician_id: UUID
    assigned_reviewer_id: Optional[UUID] = None


class TestReportUpdate(BaseModel):
    verification_type: Optional[str] = None
    assigned_technician_id: Optional[UUID] = None
    assigned_reviewer_id: Optional[UUID] = None
    compliance_notes: Optional[str] = None


class TestCaseCreate(BaseModel):
    case_type: str
    test_point_label: str
    test_point_value: float
    unit: str = "kg"
    sort_order: int = 0


class ObservationCreate(BaseModel):
    observation_number: int
    measured_value: float
    unit: str = "kg"
    notes: Optional[str] = None


class TestReportResponse(BaseModel):
    id: UUID
    report_number: str
    status: str
    compliance_result: Optional[str]
    created_at: str


# ============================================================================
# HELPERS
# ============================================================================


def _first(rows):
    return (rows or [{}])[0]


def _iso(dt) -> str:
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt) if dt is not None else ""


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_mpe_multiplier(raw) -> Optional[float]:
    """Parse an MPE string like '0.5e' or a bare number into a multiplier."""
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip().lower()
    text = text.replace("e", "").replace("×", "*").strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _fetch_report(report_id: UUID) -> dict:
    """Fetch a single test report row or raise 404."""
    supabase = _supabase()
    row = _first(
        supabase.table("test_reports")
        .select("*")
        .eq("id", str(report_id))
        .limit(1)
        .execute().data
    )
    if not row:
        raise HTTPException(status_code=404, detail="Test report not found")
    return row


def _supabase():
    return get_supabase_client()


def _fetch_related(full: dict) -> dict:
    """Add instrument/model/lab/conditions/cases/results/equipment to report."""
    supabase = _supabase()
    report = full["report"]

    instrument = _first(
        supabase.table("instruments")
        .select("*")
        .eq("id", report.get("instrument_id"))
        .limit(1)
        .execute().data
    )
    model = _first(
        supabase.table("instrument_models")
        .select("*")
        .eq("id", instrument.get("model_id"))
        .limit(1)
        .execute().data
    )
    laboratory = _first(
        supabase.table("laboratories")
        .select("*")
        .eq("id", report.get("laboratory_id"))
        .limit(1)
        .execute().data
    )
    conditions = _first(
        supabase.table("test_conditions")
        .select("*")
        .eq("report_id", str(report_id_id(report)))
        .limit(1)
        .execute().data
    )
    cases = (
        supabase.table("test_cases")
        .select("*")
        .eq("report_id", str(report_id_id(report)))
        .order("sort_order")
        .execute().data
        or []
    )
    case_obs = {}
    for case in cases:
        obs = (
            supabase.table("test_observations")
            .select("*")
            .eq("case_id", case.get("id"))
            .order("observation_number")
            .execute().data
            or []
        )
        case_obs[case.get("id")] = obs
    for case in cases:
        case["observations"] = case_obs.get(case.get("id"), [])

    results = (
        supabase.table("test_results")
        .select("*")
        .eq("report_id", str(report_id_id(report)))
        .execute().data
        or []
    )
    equipment = (
        supabase.table("test_equipment")
        .select("*")
        .eq("report_id", str(report_id_id(report)))
        .execute().data
        or []
    )

    return {
        "report": report,
        "instrument": instrument,
        "model": model,
        "laboratory": laboratory,
        "conditions": conditions,
        "cases": cases,
        "results": results,
        "equipment": equipment,
    }


def report_id_id(report: dict) -> UUID:
    """Coerce a report's id to a UUID (Supabase may return a string)."""
    raw = report.get("id") or report.get("report_id")
    if isinstance(raw, UUID):
        return raw
    return UUID(str(raw))


def _can_access(current_user: dict, report: dict) -> bool:
    from app.core.security import can_access_resource
    return can_access_resource(
        user_role=current_user.get("role"),
        user_laboratory_id=current_user.get("laboratory_id"),
        resource_laboratory_id=str(report.get("laboratory_id")) if report.get("laboratory_id") else None,
        resource_created_by=str(report.get("created_by")) if report.get("created_by") else None,
        user_id=current_user.get("id"),
        resource_status=report.get("status"),
    )


def _require_access(current_user: dict, report: dict) -> None:
    if not _can_access(current_user, report):
        raise HTTPException(status_code=403, detail="Access denied")


# ============================================================================
# ENGINE BRIDGING
# ============================================================================

CASE_TYPE_TO_CODE = {
    "weighing": "WGT",
    "repeatability": "RPT",
    "eccentricity": "ECC",
    "linearity": "LIN",
    "discrimination": "DIS",
    "stability": "STB",
    "temperature-effect": None,
}


def _group_cases_by_code(cases: list[dict]) -> dict[str, list[dict]]:
    """Group test_case rows by engine test code, preserving sort order."""
    groups: dict[str, list[dict]] = {}
    for case in cases:
        code = CASE_TYPE_TO_CODE.get((case.get("case_type") or "").lower())
        groups.setdefault(code, []).append(case)
    return groups


def _normalize_standard(standard: Optional[str]) -> str:
    """Normalise a standard name for identity comparison.

    Future OIML revisions may be published under slightly different spellings
    (e.g. "OIML-R76" vs "OIML R-76"); stripping all non-alphanumerics makes
    those families match so national rule rows are never silently dropped.
    """
    return re.sub(r"[^A-Za-z0-9]", "", standard or "").upper()


def _version_num(v: Optional[str]) -> int:
    """Leading 4-digit (or first) number in a version tag, for ordering."""
    m = re.search(r"\d{4}|\d+", v or "")
    return int(m.group(0)) if m else 0


def _to_float(value) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _rows_for_version(rows: list[dict], preferred: Optional[str]) -> list[dict]:
    """Pick the rule rows for the newest published revision of a standard.

    ``preferred`` (the report's stored version) wins when present; otherwise
    the newest revision by version tag wins. Future revisions automatically
    take precedence without any code change.
    """
    versions = sorted(
        {r.get("standard_version") for r in rows if r.get("standard_version")},
        key=lambda v: (_version_num(v), v),
        reverse=True,
    )
    if not versions:
        return []
    chosen = preferred if preferred in versions else versions[0]
    return [r for r in rows if r.get("standard_version") == chosen]


def _build_rule_store(rule_rows: list[dict], model: dict, context: dict) -> Optional[RuleStore]:
    """Convert DB compliance_rules into an engine RuleStore.

    Supports the live ``mpe_ranges`` shape and the seeded ``rules`` shape, and
    translates national test_point values into resolver vocabulary (converting
    RPT max_cv_percent to max_std_dev at the applied load).

    Forward-compatibility: any rule may declare a canonical numeric limit via
    ``limit_key``/``limit_value``/``limit_unit``; that triple is passed through
    verbatim so a future OIML revision that names a new parameter resolves
    without engine changes (specific known keys still take precedence when the
    same parameter is declared both ways).
    """
    store = RuleStore()
    added = False

    for row in rule_rows:
        rd = row.get("rule_data") or {}
        if not isinstance(rd, dict):
            continue
        rt = (row.get("rule_type") or "").lower()
        version = row.get("standard_version") or "unknown"
        standard = row.get("standard") or "OIML R-76"

        if rt == "mpe_table":
            cls_val = rd.get("instrument_class") or rd.get("class")
            ranges = rd.get("mpe_ranges") or rd.get("rules")
            if not cls_val or not ranges:
                continue
            try:
                cls = InstrumentClass(str(cls_val))
            except ValueError:
                continue
            for idx, rng in enumerate(ranges):
                multiplier = _parse_mpe_multiplier(rng.get("mpe") or rng.get("multiplier"))
                if multiplier is None:
                    continue
                max_divisions = rng.get("max_load")
                if max_divisions is None:
                    max_divisions = rng.get("max_divisions")
                store.add_rule(ComplianceRule(
                    id=f"DB-{row.get('id')}-{idx}",
                    version=version,
                    standard=standard,
                    standard_version=version,
                    rule_type="mpe",
                    instrument_class=cls,
                    parameters={
                        "min_divisions": float(rng.get("min_load", rng.get("min_divisions", 0))),
                        "max_divisions": float(max_divisions) if max_divisions is not None else float("inf"),
                        "multiplier": multiplier,
                        "unit": "e",
                        "description": f"MPE Class {cls.value} (from compliance_rules {version})",
                    },
                ))
                added = True

        elif rt == "test_point":
            code = str(rd.get("test_code") or "").upper()
            rule_type_map = {
                "WGT": "weighing",
                "RPT": "repeatability",
                "ECC": "eccentricity",
                "LIN": "linearity",
                "DIS": "discrimination",
                "STB": "stability",
            }
            rtype = rule_type_map.get(code)
            if not rtype:
                continue
            try:
                cls = InstrumentClass(str(rd.get("instrument_class") or model.get("instrument_class")))
            except (ValueError, TypeError):
                cls = None
            params = {}

            # Canonical forward-compatible limit: map the declared key onto the
            # resolver vocabulary verbatim unless a known key means something
            # different and is also declared on the same rule row.
            canonical_key = rd.get("limit_key")
            canonical_value = _to_float(rd.get("limit_value"))
            if canonical_key and canonical_value is not None:
                # The canonical declaration is authoritative for this row; the
                # typed-key branches below are only consulted for rules that do
                # not declare a canonical limit.
                params[str(canonical_key)] = canonical_value
                if rd.get("limit_unit"):
                    params["unit"] = str(rd["limit_unit"])
            elif rtype == "repeatability":
                if rd.get("max_std_dev") is not None:
                    params["max_std_dev"] = float(rd["max_std_dev"])
                    params["unit"] = str(rd.get("max_std_dev_unit") or "g")
                elif rd.get("max_cv_percent") is not None and context.get("scale_interval"):
                    load = float(context.get("load") or 0)
                    e = float(context["scale_interval"])
                    # max std dev (in d) consistent with a CV limit: cv/100 * L / e
                    params["max_std_dev"] = round((float(rd["max_cv_percent"]) / 100.0) * load / e, 6)
                    params["unit"] = "d"
                    params["description"] = (
                        f"Repeatability CV limit {rd['max_cv_percent']}% "
                        f"@ L={load} e={e}"
                    )
            elif rtype == "eccentricity":
                if rd.get("max_eccentricity") is not None:
                    params["max_eccentricity"] = float(rd["max_eccentricity"])
                    params["unit"] = "e"
                elif rd.get("max_deviation_fraction") is not None:
                    # ECC is judged against MPE(L); keep the fraction as the
                    # class-level fallback in verification-scale intervals.
                    params["max_eccentricity"] = float(rd["max_deviation_fraction"])
                    params["unit"] = "e"
            elif rtype == "discrimination":
                params["min_discrimination"] = float(
                    rd.get("min_scale_intervals", rd.get("min_discrimination", 1))
                )
                params["unit"] = "d"
            elif rtype == "stability":
                params["max_drift"] = float(rd.get("max_drift_fraction", rd.get("max_drift", 0)))
                params["unit"] = "e"
            elif rtype == "linearity":
                if rd.get("max_linearity") is not None:
                    params["max_linearity"] = float(rd["max_linearity"])
                    params["unit"] = "e"

            if not params:
                continue
            store.add_rule(ComplianceRule(
                id=f"DB-{row.get('id')}",
                version=version,
                standard=standard,
                standard_version=version,
                rule_type=rtype,
                instrument_class=cls,
                parameters=params,
            ))
            added = True

    return store if added else None


def _load_rules_for_report(report: dict, model: dict, context: dict) -> RuleStore:
    """Load compliance rules for the report's standard/version, else defaults.

    Rule rows are matched on the *normalised* standard name (so "OIML-R76"
    and "OIML R-76" resolve against the same rows) and the newest published
    revision wins when the report does not pin a version. Future revisions
    therefore take effect automatically.
    """
    try:
        rows = (
            _supabase().table("compliance_rules")
            .select("*")
            .eq("is_active", True)
            .execute().data
            or []
        )
        std_want = _normalize_standard(report.get("test_standard") or "OIML R-76")
        scoped = [r for r in rows if _normalize_standard(r.get("standard")) == std_want]
        version_rows = _rows_for_version(scoped, report.get("test_standard_version"))
        store = _build_rule_store(version_rows, model, context)
        if store:
            return store
    except Exception:
        pass
    return create_default_rule_store()


def _build_test_input(model: dict, test_code: str, cases: list[dict]) -> TestInput:
    """Build an engine TestInput from one case (or the case group) + model."""
    try:
        unit = MassUnit(str(model.get("division_unit") or "kg").lower())
        cls = InstrumentClass(str(model.get("instrument_class")))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=422,
            detail=f"Instrument model is missing class or division configuration",
        )

    points = []
    for case in cases:
        case_unit = MassUnit(str(case.get("unit") or "kg").lower())
        obs = [
            RawObservation(
                value=float(o["measured_value"]),
                unit=MassUnit(str(o.get("unit") or case_unit.value).lower()),
                observation_number=int(o["observation_number"]),
                notes=o.get("notes"),
            )
            for o in (case.get("observations") or [])
        ]
        points.append(TestPointInput(
            point_label=str(case.get("test_point_label") or ""),
            reference_value=float(case.get("test_point_value") or 0),
            unit=case_unit,
            observations=obs,
        ))

    additional = {}
    if test_code == "WGT":
        additional["zero_error_E0"] = 0.0
        additional["small_added_load_delta_L"] = 0.0
    elif test_code == "DIS":
        weight = float(cases[0].get("test_point_value") or 0)
        additional["discrimination_weight"] = weight

    return TestInput(
        test_code=test_code,
        instrument_class=cls,
        max_capacity=float(model.get("capacity") or 0),
        max_capacity_unit=MassUnit(str(model.get("capacity_unit") or "kg").lower()),
        scale_interval=float(model.get("division") or 0),
        scale_interval_unit=unit,
        verification_scale_interval=None,
        verification_scale_interval_unit=None,
        test_points=points,
        additional_inputs=additional,
    )


def _status_to_verdict(status: str) -> str:
    """Map engine status to the test_results.verdict enum."""
    if status == "pass":
        return "pass"
    if status == "fail":
        return "fail"
    return "pending"


def _run_engine_on_report(full: dict) -> tuple[list[dict], list[dict], str]:
    """Run the real engine over all cases.

    Returns (results_to_upsert, checks, overall_compliance).
    """
    report = full["report"]
    model = full["model"]
    if not model:
        raise HTTPException(
            status_code=422,
            detail="Instrument model not found; cannot run calculations",
        )

    scale_interval = float(model.get("division") or 0)
    results: list[dict] = []
    checks: list[dict] = []
    verdicts: list[str] = []

    for test_code, case_group in _group_cases_by_code(full["cases"]).items():
        if test_code is None:
            continue
        try:
            test_input = _build_test_input(model, test_code, case_group)
        except HTTPException as exc:
            raise HTTPException(
                status_code=exc.status_code,
                detail=f"Case '{case_group[0].get('case_type')}': {exc.detail}",
            )

        context = {
            "load": test_input.test_points[0].reference_value if test_input.test_points else 0,
            "scale_interval": scale_interval,
        }
        rule_store = _load_rules_for_report(report, model, context)
        engine = CalculationEngine(rule_store)
        engine_result = engine.execute(test_input)
        calc = engine_result.calculation_result
        if calc is None:
            for case in case_group:
                verdicts.append("pending")
                results.append({
                    "report_id": str(report_id_id(report)),
                    "case_id": str(case["id"]),
                    "verdict": "pending",
                    "notes": "No calculation result",
                })
            continue

        verdict = _status_to_verdict(calc.status.value)
        verdicts.append(verdict)
        checks.append({
            "test_code": calc.test_code,
            "test_name": calc.test_name,
            "status": calc.status.value,
            "verdict": verdict,
            "limit": (calc.applicable_limit.value if calc.applicable_limit else None),
            "limit_unit": (calc.applicable_limit.unit if calc.applicable_limit else None),
            "calculated": calc.calculated_values,
            "rule_id": calc.rule_id,
            "rule_version": calc.rule_version,
            "details": calc.details,
        })

        stats = _statistics_from_case(test_input)
        for case in case_group:
            results.append({
                "report_id": str(report_id_id(report)),
                "case_id": str(case["id"]),
                "mean_value": stats.get("mean"),
                "std_deviation": stats.get("std_deviation"),
                "deviation_from_reference": stats.get("deviation_from_reference"),
                "calculated_error": _first_calculated(calc, ["max_abs_ec", "max_linearity_error", "discrimination_error"]),
                "max_permissible_error": calc.calculated_values.get("limit_units"),
                "verdict": verdict,
                "calculation_timestamp": _now_iso(),
                "calculation_version": calc.rule_version or report.get("test_standard_version"),
                "notes": calc.details,
            })

    overall = _overall_verdict(verdicts, full)
    return results, checks, overall


def _statistics_from_case(test_input: TestInput) -> dict:
    """Mean/std dev across all observations in the case (engine-normalized)."""
    from engine.normalization import UnitNormalizer
    from engine.calculations import Calculations

    normalizer = UnitNormalizer()
    calculator = Calculations()
    all_obs = []
    for point in test_input.test_points:
        all_obs.extend(
            RawObservation(
                value=o.value,
                unit=o.unit,
                observation_number=o.observation_number,
                notes=o.notes,
            )
            for o in point.observations
        )
    if not all_obs:
        return {}
    unit = test_input.scale_interval_unit
    norm = normalizer.normalize_observations(all_obs, unit)
    stats = calculator.calculate_observation_statistics(norm)
    ref = test_input.test_points[0].reference_value
    mean_kg = stats.mean
    mean_in_unit = normalizer.from_kg(mean_kg, unit)
    std_in_unit = normalizer.from_kg(stats.std_deviation, unit)
    return {
        "mean": round(mean_in_unit, 6),
        "std_deviation": round(std_in_unit, 6),
        "deviation_from_reference": round(mean_in_unit - ref, 6),
    }


def _first_calculated(calc, keys: list[str]) -> Optional[float]:
    for key in keys:
        val = calc.calculated_values.get(key)
        if val is not None:
            try:
                return round(float(val), 6)
            except (TypeError, ValueError):
                return None
    return None


def _overall_verdict(verdicts: list[str], full: dict) -> str:
    """Aggregate case verdicts + environmental status into a compliance result."""
    if any(v == "fail" for v in verdicts):
        return "non-compliant"
    if not verdicts:
        return "pending"
    if any(v == "pending" for v in verdicts):
        return "pending"

    cond = full.get("conditions") or {}
    env_out = (
        (cond.get("temperature_status") == "out-of-range")
        or (cond.get("humidity_status") == "out-of-range")
        or (cond.get("air_pressure_status") == "out-of-range")
    )
    if env_out:
        return "non-compliant"
    return "compliant"


def _persist_results(results: list[dict], calculated_by: str) -> None:
    """Upsert test_results rows (unique report_id + case_id)."""
    supabase = _supabase()
    for row in results:
        existing = (
            supabase.table("test_results")
            .select("id")
            .eq("report_id", row["report_id"])
            .eq("case_id", row["case_id"])
            .limit(1)
            .execute().data
            or []
        )
        payload = {**row, "calculated_by": calculated_by}
        if existing:
            supabase.table("test_results").update(payload).eq("id", existing[0]["id"]).execute()
        else:
            supabase.table("test_results").insert(payload).execute()


def _transition(report: dict, *, status: str, extra: dict = None, user_id: str = None) -> None:
    payload = {"status": status, "updated_at": _now_iso()}
    if extra:
        payload.update(extra)
    if user_id:
        payload["updated_by"] = user_id
    _supabase().table("test_reports").update(payload).eq("id", str(report_id_id(report))).execute()


# ============================================================================
# ROUTE: LIST / CREATE
# ============================================================================


@router.get("/")
async def list_tests(
    status_filter: Optional[str] = Query(None, alias="status"),
    laboratory_id: Optional[UUID] = None,
    instrument_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: dict = Depends(get_current_user_profile),
):
    """
    List test reports with role-based filtering.

    - ADMIN: Sees all tests
    - TESTER: Sees own tests + lab tests
    - REVIEWER: Sees tests pending review in their lab
    - VIEWER: Sees completed tests in their lab
    """
    supabase = _supabase()
    rows = (
        supabase.table("test_reports")
        .select("*")
        .order("created_at", desc=True)
        .execute().data
        or []
    )

    user_role = current_user.get("role")
    user_id = current_user.get("id")
    lab_id = current_user.get("laboratory_id")

    visible = []
    for r in rows:
        if user_role == "tester":
            if str(r.get("created_by")) != user_id and lab_id and str(r.get("laboratory_id")) != lab_id:
                continue
        elif user_role == "reviewer":
            if lab_id and str(r.get("laboratory_id")) != lab_id:
                continue
            if r.get("status") not in ("pending-review", "approved", "rejected", "completed"):
                continue
        elif user_role == "viewer":
            if lab_id and str(r.get("laboratory_id")) != lab_id:
                continue
            if r.get("status") not in ("completed", "approved"):
                continue

        if status_filter and r.get("status") != status_filter:
            continue
        if laboratory_id and str(r.get("laboratory_id")) != str(laboratory_id):
            continue
        if instrument_id and str(r.get("instrument_id")) != str(instrument_id):
            continue
        r["access"] = {"read": True}
        visible.append(r)

    start = (page - 1) * page_size
    page_rows = visible[start:start + page_size]
    return {
        "items": page_rows,
        "total": len(visible),
        "page": page,
        "page_size": page_size,
    }


@router.post("/", response_model=TestReportResponse, status_code=status.HTTP_201_CREATED)
async def create_test(
    data: TestReportCreate,
    current_user: dict = Depends(require_permission("test_reports:create")),
):
    """Create a new test report. Requires tester or admin role."""
    validation_result = validation_service.validate_test_report(data.dict())
    if not validation_result.is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"errors": [e.__dict__ for e in validation_result.errors]}
        )

    user_lab_id = current_user.get("laboratory_id")
    if current_user.get("role") != "admin" and user_lab_id and str(data.laboratory_id) != str(user_lab_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create test in another laboratory"
        )

    year = datetime.now(timezone.utc).year
    count = len(
        _supabase().table("test_reports").select("id").eq("created_by", current_user["id"]).execute().data or []
    )

    # Retry a few sequences in case of a unique-key race on report_number.
    last_error = None
    for attempt in range(5):
        seq = count + 1 + attempt
        report_number = f"TST-{year}-{seq:06d}"
        row = {
            "report_number": report_number,
            "instrument_id": str(data.instrument_id),
            "laboratory_id": str(data.laboratory_id),
            "verification_type": data.verification_type,
            "test_standard": data.test_standard,
            "test_standard_version": data.test_standard_version,
            "status": "draft",
            "compliance_result": None,
            "assigned_technician_id": str(data.assigned_technician_id),
            "assigned_reviewer_id": str(data.assigned_reviewer_id) if data.assigned_reviewer_id else None,
            "created_by": current_user["id"],
            "updated_by": current_user["id"],
        }
        try:
            inserted = (
                _supabase().table("test_reports")
                .insert(row)
                .execute()
            )
            record = _first(inserted.data)
            return TestReportResponse(
                id=record["id"],
                report_number=record["report_number"],
                status=record["status"],
                compliance_result=record.get("compliance_result"),
                created_at=_iso(record.get("created_at")),
            )
        except Exception as exc:  # supabase.exceptions.APIError leak
            last_error = exc

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=f"Could not allocate a unique report number: {last_error}",
    )


# ============================================================================
# ROUTE: GET / UPDATE / DELETE
# ============================================================================


@router.get("/{test_id}")
async def get_test(
    test_id: UUID,
    current_user: dict = Depends(get_current_user_profile),
):
    """Get test report details (report + instrument + cases) with access control."""
    full = _fetch_related({"report": _fetch_report(test_id)})
    _require_access(current_user, full["report"])
    return full


@router.put("/{test_id}", response_model=TestReportResponse)
async def update_test(
    test_id: UUID,
    data: TestReportUpdate,
    current_user: dict = Depends(get_current_user_profile),
):
    """Update test report with role-based access control."""
    report = _fetch_report(test_id)
    _require_access(current_user, report)

    user_role = current_user.get("role")
    draft_statuses = ("draft", "in-testing", "observations-complete", "calculations-pending", "revision-requested")
    if user_role == "tester" and report.get("status") not in draft_statuses:
        raise HTTPException(status_code=403, detail="Can only update a draft/in-testing test report")
    if user_role not in ("admin", "tester", "reviewer"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    payload = {k: v for k, v in data.dict().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="No updateable fields provided")
    payload["updated_at"] = _now_iso()
    payload["updated_by"] = current_user["id"]

    updated = _first(
        _supabase().table("test_reports")
        .update(payload)
        .eq("id", str(test_id))
        .execute().data
    )
    return TestReportResponse(
        id=updated["id"],
        report_number=updated["report_number"],
        status=updated["status"],
        compliance_result=updated.get("compliance_result"),
        created_at=_iso(updated.get("created_at")),
    )


@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test(
    test_id: UUID,
    current_user: dict = Depends(require_permission("test_reports:delete_draft")),
):
    """Delete test report. Only draft reports can be deleted."""
    report = _fetch_report(test_id)
    _require_access(current_user, report)
    if report.get("status") != "draft":
        raise HTTPException(status_code=400, detail="Only draft reports can be deleted")
    _supabase().table("test_reports").delete().eq("id", str(test_id)).execute()


# ============================================================================
# ROUTE: WORKFLOW ACTIONS
# ============================================================================


@router.post("/{test_id}/submit")
async def submit_test(
    test_id: UUID,
    current_user: dict = Depends(require_permission("test_reports:submit")),
):
    """Run calculations, persist results, and move the report to pending-review."""
    report = _fetch_report(test_id)
    _require_access(current_user, report)
    if report.get("status") in ("approved", "rejected", "completed"):
        raise HTTPException(status_code=400, detail=f"Cannot submit a '{report.get('status')}' report")
    if report.get("status") == "pending-review":
        raise HTTPException(status_code=400, detail="Test is already pending review")

    full = _fetch_related({"report": report})
    results, checks, overall = _run_engine_on_report(full)
    _persist_results(results, current_user["id"])

    _transition(
        report,
        status="pending-review",
        extra={"submitted_at": _now_iso(), "compliance_result": overall},
        user_id=current_user["id"],
    )
    return {
        "message": "Test submitted for review",
        "compliance_result": overall,
        "checks": checks,
    }


@router.post("/{test_id}/approve")
async def approve_test(
    test_id: UUID,
    notes: Optional[str] = None,
    current_user: dict = Depends(require_permission("test_reports:approve")),
):
    """Approve test report. Requires reviewer role."""
    report = _fetch_report(test_id)
    _require_access(current_user, report)
    if report.get("status") != "pending-review":
        raise HTTPException(status_code=400, detail="Only pending-review reports can be approved")

    extra = {"reviewed_at": _now_iso()}
    if notes:
        extra["compliance_notes"] = notes
    _transition(report, status="approved", extra=extra, user_id=current_user["id"])
    return {"message": "Test approved", "compliance_result": report.get("compliance_result")}


@router.post("/{test_id}/reject")
async def reject_test(
    test_id: UUID,
    reason: str,
    current_user: dict = Depends(require_permission("test_reports:reject")),
):
    """Reject test report. Requires reviewer role."""
    report = _fetch_report(test_id)
    _require_access(current_user, report)
    if report.get("status") != "pending-review":
        raise HTTPException(status_code=400, detail="Only pending-review reports can be rejected")

    _transition(
        report,
        status="revision-requested",
        extra={"reviewed_at": _now_iso(), "compliance_notes": reason},
        user_id=current_user["id"],
    )
    return {"message": "Test rejected", "reason": reason}


@router.post("/{test_id}/calculate")
async def calculate_test(
    test_id: UUID,
    current_user: dict = Depends(require_permission("test_data:create")),
):
    """Run the real engine over all cases and store per-case results."""
    report = _fetch_report(test_id)
    _require_access(current_user, report)

    full = _fetch_related({"report": report})
    results, checks, overall = _run_engine_on_report(full)
    _persist_results(results, current_user["id"])

    next_status = "calculations-complete" if report.get("status") in (
        "draft", "in-testing", "observations-complete", "calculations-pending"
    ) else report.get("status")
    _transition(
        report,
        status=next_status,
        extra={"compliance_result": overall},
        user_id=current_user["id"],
    )

    return {
        "message": "Calculations completed",
        "compliance_result": overall,
        "results_written": len(results),
        "checks": checks,
    }


@router.get("/{test_id}/compliance")
async def get_compliance(
    test_id: UUID,
    current_user: dict = Depends(get_current_user_profile),
):
    """Get compliance evaluation for the test report."""
    full = _fetch_related({"report": _fetch_report(test_id)})
    _require_access(current_user, full["report"])

    results, checks, overall = _run_engine_on_report(full)

    cond = full.get("conditions") or {}
    env = []
    if cond:
        for key, label in (
            ("temperature_status", "Temperature"),
            ("humidity_status", "Humidity"),
            ("air_pressure_status", "Air pressure"),
        ):
            val = cond.get(key)
            if val and val != "not-recorded":
                env.append({
                    "parameter": label,
                    "status": val,
                    "compliant": val == "normal",
                })
            elif val == "not-recorded":
                env.append({"parameter": label, "status": val, "compliant": None})

    return {
        "verdict": overall,
        "checks": checks,
        "environmental": env,
        "summary": {
            "standard": full["report"].get("test_standard"),
            "standard_version": full["report"].get("test_standard_version"),
            "instrument_class": (full.get("model") or {}).get("instrument_class"),
            "case_count": len(full["cases"]),
            "results_count": len(results),
            "evaluated_at": _now_iso(),
        },
    }


# ============================================================================
# ROUTE: TEST CASES
# ============================================================================


@router.post("/{test_id}/cases", status_code=status.HTTP_201_CREATED)
async def create_test_case(
    test_id: UUID,
    data: TestCaseCreate,
    current_user: dict = Depends(require_permission("test_data:create")),
):
    """Add test case to report. Requires tester role."""
    report = _fetch_report(test_id)
    _require_access(current_user, report)
    if report.get("status") not in ("draft", "in-testing", "observations-complete", "calculations-pending"):
        raise HTTPException(status_code=400, detail="Cannot add cases to this report stage")

    case_type_key = (data.case_type or "").lower()
    if case_type_key not in CASE_TYPE_TO_CODE:
        raise HTTPException(status_code=422, detail=f"Unknown case_type '{data.case_type}'")

    inserted = _first(
        _supabase().table("test_cases")
        .insert({
            "report_id": str(test_id),
            "case_type": data.case_type,
            "test_point_label": data.test_point_label,
            "test_point_value": round(data.test_point_value, 6),
            "unit": data.unit,
            "sort_order": data.sort_order,
            "status": "pending",
            "created_by": current_user["id"],
            "updated_by": current_user["id"],
        })
        .execute().data
    )
    if report.get("status") == "draft":
        _transition(report, status="in-testing", user_id=current_user["id"])
    return {"message": "Test case created", "case": inserted}


@router.get("/{test_id}/cases")
async def list_test_cases(
    test_id: UUID,
    current_user: dict = Depends(get_current_user_profile),
):
    """List test cases for report with role-based access."""
    report = _fetch_report(test_id)
    _require_access(current_user, report)
    cases = (
        _supabase().table("test_cases")
        .select("*")
        .eq("report_id", str(test_id))
        .order("sort_order")
        .execute().data
        or []
    )
    for case in cases:
        case["observations"] = (
            _supabase().table("test_observations")
            .select("*")
            .eq("case_id", case.get("id"))
            .order("observation_number")
            .execute().data
            or []
        )
    return {"cases": cases}


# ============================================================================
# ROUTE: OBSERVATIONS
# ============================================================================


@router.post("/{test_id}/cases/{case_id}/observations", status_code=status.HTTP_201_CREATED)
async def create_observation(
    test_id: UUID,
    case_id: UUID,
    data: ObservationCreate,
    current_user: dict = Depends(require_permission("test_data:create")),
):
    """Add observation to test case. Requires tester role."""
    report = _fetch_report(test_id)
    _require_access(current_user, report)
    if report.get("status") in ("pending-review", "approved", "rejected", "completed"):
        raise HTTPException(status_code=400, detail="Cannot add observations to a locked report")

    case_rows = (
        _supabase().table("test_cases")
        .select("*")
        .eq("id", str(case_id))
        .eq("report_id", str(test_id))
        .limit(1)
        .execute().data
        or []
    )
    if not case_rows:
        raise HTTPException(status_code=404, detail="Test case not found in this report")

    inserted = _first(
        _supabase().table("test_observations")
        .insert({
            "case_id": str(case_id),
            "observation_number": data.observation_number,
            "measured_value": round(data.measured_value, 6),
            "unit": data.unit,
            "notes": data.notes,
            "created_by": current_user["id"],
        })
        .execute().data
    )

    # Progress the case/report state.
    existing_obs = (
        _supabase().table("test_observations")
        .select("id")
        .eq("case_id", str(case_id))
        .execute().data
        or []
    )
    case_status = "complete" if existing_obs else "in-progress"
    _supabase().table("test_cases").update(
        {"status": case_status, "updated_at": _now_iso(), "updated_by": current_user["id"]}
    ).eq("id", str(case_id)).execute()

    if report.get("status") == "in-testing":
        _transition(report, status="observations-complete", user_id=current_user["id"])

    return {"message": "Observation created", "observation": inserted}