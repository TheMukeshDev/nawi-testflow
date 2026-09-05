-- ============================================================================
-- Seed: OIML-R76 / DEMO-2026.01 national demo rules (reference revision)
-- ============================================================================
--
-- USE: reference seed for a FRESH environment (demonstrates the exact shape
-- the engines expect) and as the TEMPLATE for adding a future OIML revision.
--
-- Idempotent: rows are only inserted when no row exists for
-- (standard, standard_version). To add a future revision, copy this block,
-- change standard_version + effective_on, adjust values, and supersede the
-- old revision (see migrations/003_oiml_rule_versioning.sql for the recipe).
--
-- Shape notes (consumed by src/lib/rule-engine.ts + backend/app/api/v1/tests.py):
--   * mpe_table:    { instrument_class, mpe_ranges: [{min_load, max_load, mpe}] }
--   * test_point:   { test_code, instrument_class, ... }
--                   Either typed national keys (max_cv_percent / %,
--                   max_deviation_fraction, min_scale_intervals, max_drift_fraction)
--                   OR the canonical forward-compatible trio
--                   { limit_key, limit_value, limit_unit } — the trio takes
--                   precedence and new parameter names pass through verbatim.
--   * standard name is normalised at load time, so "OIML-R76" and
--     "OIML R-76" resolve as the same family.
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM compliance_rules
        WHERE standard = 'OIML-R76' AND standard_version = 'DEMO-2026.01'
    ) THEN
        RAISE NOTICE 'OIML-R76 / DEMO-2026.01 rules already present; skipping seed.';
        RETURN;
    END IF;

    -- ── MPE tables (OIML R 76-1 Table 2, per class) ────────────────
    INSERT INTO compliance_rules (standard, standard_version, rule_type, rule_name, rule_data, description, is_active)
    VALUES
    ('OIML-R76', 'DEMO-2026.01', 'mpe_table', 'Class III MPE Table',
     '{"instrument_class": "III", "mpe_ranges": [
        {"mpe": "0.5e", "min_load": 0,    "max_load": 500},
        {"mpe": "1.0e", "min_load": 500,  "max_load": 2000},
        {"mpe": "1.5e", "min_load": 2000, "max_load": 3000}
     ]}',
     'Maximum Permissible Error for Class III (OIML R 76-1 Table 2; national demo revision)', true),

    ('OIML-R76', 'DEMO-2026.01', 'mpe_table', 'Class II MPE Table',
     '{"instrument_class": "II", "mpe_ranges": [
        {"mpe": "0.5e", "min_load": 0,     "max_load": 5000},
        {"mpe": "1.0e", "min_load": 5000,  "max_load": 20000},
        {"mpe": "1.5e", "min_load": 20000, "max_load": 220000}
     ]}',
     'Maximum Permissible Error for Class II (OIML R 76-1 Table 2; national demo revision)', true),

    ('OIML-R76', 'DEMO-2026.01', 'mpe_table', 'Class I MPE Table',
     '{"instrument_class": "I", "mpe_ranges": [
        {"mpe": "0.5e", "min_load": 0,     "max_load": 50000},
        {"mpe": "1.0e", "min_load": 50000, "max_load": 200000},
        {"mpe": "1.5e", "min_load": 200000, "max_load": 1000000}
     ]}',
     'Maximum Permissible Error for Class I (OIML R 76-1 Table 2; national demo revision)', true),

    ('OIML-R76', 'DEMO-2026.01', 'mpe_table', 'Class IIII MPE Table',
     '{"instrument_class": "IIII", "mpe_ranges": [
        {"mpe": "0.5e", "min_load": 0,    "max_load": 50},
        {"mpe": "1.0e", "min_load": 50,   "max_load": 200},
        {"mpe": "1.5e", "min_load": 200,  "max_load": 300}
     ]}',
     'Maximum Permissible Error for Class IIII (OIML R 76-1 Table 2; national demo revision)', true);

    -- ── Test-point rules (national demo values) ────────────────────
    -- Canonical forward-compatible form used for demonstration; the engines
    -- read limit_key / limit_value / limit_unit without any code change.
    INSERT INTO compliance_rules (standard, standard_version, rule_type, rule_name, rule_data, description, is_active)
    VALUES
    ('OIML-R76', 'DEMO-2026.01', 'test_point', 'Repeatability (Class III)',
     '{"test_code": "RPT", "instrument_class": "III", "min_observations": 5,
       "limit_key": "max_cv_percent", "limit_value": 0.03, "limit_unit": "%",
       "description": "CV must not exceed 0.03%"}',
     'Repeatability per R 76-1 5.5.4 (national limit)', true),

    ('OIML-R76', 'DEMO-2026.01', 'test_point', 'Repeatability (Class II)',
     '{"test_code": "RPT", "instrument_class": "II", "min_observations": 5,
       "limit_key": "max_cv_percent", "limit_value": 0.015, "limit_unit": "%",
       "description": "CV must not exceed 0.015%"}',
     'Repeatability per R 76-1 5.5.4 (national limit)', true),

    ('OIML-R76', 'DEMO-2026.01', 'test_point', 'Repeatability (no national limit)',
     '{"test_code": "RPT", "instrument_class": "all",
       "limit": "RULE_NOT_CONFIGURED",
       "note": "No national repeatability limit for this class — reviewer must supply."}',
     'Repeatability without a configured national value', true),

    ('OIML-R76', 'DEMO-2026.01', 'test_point', 'Eccentricity',
     '{"test_code": "ECC", "instrument_class": "all",
       "limit_key": "max_deviation_fraction", "limit_value": 0.33, "limit_unit": "fraction",
       "description": "Off-center deviation <= 1/3 of MPE"}',
     'Eccentricity: each position must stay within 1/3 of MPE(L)', true),

    ('OIML-R76', 'DEMO-2026.01', 'test_point', 'Discrimination',
     '{"test_code": "DIS", "instrument_class": "all",
       "limit_key": "min_scale_intervals", "limit_value": 1, "limit_unit": "d",
       "description": "Smallest weight must cause >= 1 scale interval change"}',
     'Discrimination functional check per R 76-2 5.8', true),

    ('OIML-R76', 'DEMO-2026.01', 'test_point', 'Stability',
     '{"test_code": "STB", "instrument_class": "all",
       "limit_key": "max_drift_fraction", "limit_value": 0.5, "limit_unit": "fraction",
       "description": "Drift over 30 min <= 0.5 scale intervals"}',
     'Stability national demo rule', true);

    -- ── Environmental operating conditions ─────────────────────────
    INSERT INTO compliance_rules (standard, standard_version, rule_type, rule_name, rule_data, description, is_active)
    VALUES
    ('OIML-R76', 'DEMO-2026.01', 'environmental', 'Operating Conditions',
     '{"temperature": {"min": -10, "max": 40, "unit": "°C"}, "humidity": {"min": 0, "max": 85, "unit": "%RH"}}',
     'Acceptable environmental conditions for testing', true);
END $$;