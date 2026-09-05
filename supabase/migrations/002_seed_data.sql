-- ============================================================================
-- NAWI Sahayak — Seed Data (002_seed_data.sql)
--
-- Run this in Supabase SQL Editor on the LIVE database.
-- Column names deliberately match the live schema (verified via OpenAPI):
--   laboratories(lab code), manufacturers, instrument_models(model_name,
--   capacity, division), instruments(last_calibration/next_calibration),
--   test_equipment(equipment_name, report-scoped), compliance_rules.
--
-- INSERT..SELECT .. WHERE NOT EXISTS keeps this idempotent — safe to re-run.
-- ============================================================================

-- ── 1. Laboratories ──────────────────────────────────────────────────────────
-- Existing live labs (kept as-is): PMTL-PUNE-01, NITC-DEL-01
-- Addinational labs mirror the original mock registry.

INSERT INTO laboratories (id, name, code, address, city, state, country, accreditation_body, accreditation_number, accreditation_valid_until, contact_person, phone, email, is_active)
SELECT gen_random_uuid(), v.name, v.code, v.address, v.city, v.state, v.country, v.accreditation_body, v.accreditation_number, v.accreditation_valid_until, v.contact_person, v.phone, v.email, true
FROM (VALUES
  ('Central Metrology Testing Lab', 'CMTL-PY-01', '12, Tashkent Marg, Civil Lines', 'Prayagraj', 'Uttar Pradesh', 'India', 'NABL', 'NABL-0123', '2027-03-31'::date, 'Dr. K. Sharma', '+91-532-240-2700', 'cmtl-py@laboratory.example.in'),
  ('Prayagraj Instrument Testing Lab', 'PITL-PR-02', '45, Station Road, Civil Lines', 'Prayagraj', 'Uttar Pradesh', 'India', 'NABL', 'NABL-0456', '2027-06-15'::date, 'Dr. A. Patel', '+91-532-265-2700', 'pitl-pr@laboratory.example.in'),
  ('North Zone Calibration Laboratory', 'NZCL-DL-03', '78, Janpath, Connaught Place', 'New Delhi', 'Delhi', 'India', 'NABL', 'NABL-0789', '2026-12-31'::date, 'Dr. R. Krishnan', '+91-11-2830-2700', 'nzcl-dl@laboratory.example.in'),
  ('South Zone Metrology Centre', 'SZMC-CH-04', '23, Anna Salai, Teynampet', 'Chennai', 'Tamil Nadu', 'India', 'NABL', 'NABL-1024', '2027-09-30'::date, 'Dr. S. Iyer', '+91-44-2830-3000', 'szmc-ch@laboratory.example.in')
) AS v(name, code, address, city, state, country, accreditation_body, accreditation_number, accreditation_valid_until, contact_person, phone, email)
WHERE NOT EXISTS (SELECT 1 FROM laboratories l WHERE l.code = v.code);

-- ── 2. Manufacturers ─────────────────────────────────────────────────────────
-- Existing live manufacturers are reused by name; new ones are added.

INSERT INTO manufacturers (id, name, country, address, contact_person, phone, email)
SELECT gen_random_uuid(), v.name, 'India', v.address, v.contact_person, v.phone, v.email
FROM (VALUES
  ('ABC Instruments Pvt. Ltd.', 'Pune, Maharashtra', 'R. Nair', '+91-20-2714-5000', 'info@abc-instruments.in'),
  ('Precision Weigh Systems', 'New Delhi', 'S. Khanna', '+91-11-4567-8900', 'sales@precisionweigh.in'),
  ('MetroScale Technologies', 'Chennai, Tamil Nadu', 'M. Reddy', '+91-44-2345-6789', 'contact@metroscale.in')
) AS v(name, address, contact_person, phone, email)
WHERE NOT EXISTS (SELECT 1 FROM manufacturers m WHERE m.name = v.name);

-- ── 3. Instrument Models ─────────────────────────────────────────────────────

-- Model: ABC-3000 Electronic Balance (Class III, 3000 g)
INSERT INTO instrument_models (id, manufacturer_id, model_name, model_number, instrument_class, capacity, capacity_unit, min_capacity, min_capacity_unit, division, division_unit, verification_scale_divisions, accuracy_class, device_type, year_of_manufacture)
SELECT gen_random_uuid(), m.id, 'ABC-3000 Electronic Balance', 'ABC-3000', 'III',
       3000, 'g', 10, 'g', 0.01, 'g', 30000, 'III', 'electronic', 2023
FROM manufacturers m WHERE m.name = 'ABC Instruments Pvt. Ltd.'
AND NOT EXISTS (SELECT 1 FROM instrument_models im WHERE im.model_name = 'ABC-3000 Electronic Balance');

-- Model: PWS Precision Scale 220 (Class II, 220 g)
INSERT INTO instrument_models (id, manufacturer_id, model_name, model_number, instrument_class, capacity, capacity_unit, min_capacity, min_capacity_unit, division, division_unit, verification_scale_divisions, accuracy_class, device_type, year_of_manufacture)
SELECT gen_random_uuid(), m.id, 'PWS Precision Scale 220', 'PWS-220', 'II',
       220, 'g', 0.5, 'g', 0.001, 'g', 220000, 'II', 'electronic', 2022
FROM manufacturers m WHERE m.name = 'Precision Weigh Systems'
AND NOT EXISTS (SELECT 1 FROM instrument_models im WHERE im.model_name = 'PWS Precision Scale 220');

-- Model: MetroScale 2000 Industrial (Class III, 2000 kg)
INSERT INTO instrument_models (id, manufacturer_id, model_name, model_number, instrument_class, capacity, capacity_unit, min_capacity, min_capacity_unit, division, division_unit, verification_scale_divisions, accuracy_class, device_type, year_of_manufacture)
SELECT gen_random_uuid(), m.id, 'MetroScale 2000 Industrial', 'MST-2000', 'III',
       2000, 'kg', 5, 'kg', 0.5, 'kg', 4000, 'III', 'electronic', 2021
FROM manufacturers m WHERE m.name = 'MetroScale Technologies'
AND NOT EXISTS (SELECT 1 FROM instrument_models im WHERE im.model_name = 'MetroScale 2000 Industrial');

-- Model: ABC-220 Analytical Balance (Class II, 220 g)
INSERT INTO instrument_models (id, manufacturer_id, model_name, model_number, instrument_class, capacity, capacity_unit, min_capacity, min_capacity_unit, division, division_unit, verification_scale_divisions, accuracy_class, device_type, year_of_manufacture)
SELECT gen_random_uuid(), m.id, 'ABC-220 Analytical Balance', 'ABC-220', 'II',
       220, 'g', 0.1, 'g', 0.0001, 'g', 2200000, 'II', 'electronic', 2024
FROM manufacturers m WHERE m.name = 'ABC Instruments Pvt. Ltd.'
AND NOT EXISTS (SELECT 1 FROM instrument_models im WHERE im.model_name = 'ABC-220 Analytical Balance');

-- Model: PWS Platform Scale 3000 (Class III, 3000 kg)
INSERT INTO instrument_models (id, manufacturer_id, model_name, model_number, instrument_class, capacity, capacity_unit, min_capacity, min_capacity_unit, division, division_unit, verification_scale_divisions, accuracy_class, device_type, year_of_manufacture)
SELECT gen_random_uuid(), m.id, 'PWS Platform Scale 3000', 'PWS-3000P', 'III',
       3000, 'kg', 10, 'kg', 1, 'kg', 3000, 'III', 'electronic', 2021
FROM manufacturers m WHERE m.name = 'Precision Weigh Systems'
AND NOT EXISTS (SELECT 1 FROM instrument_models im WHERE im.model_name = 'PWS Platform Scale 3000');

-- Model: MetroScale 500 Bench (Class III, 500 kg)
INSERT INTO instrument_models (id, manufacturer_id, model_name, model_number, instrument_class, capacity, capacity_unit, min_capacity, min_capacity_unit, division, division_unit, verification_scale_divisions, accuracy_class, device_type, year_of_manufacture)
SELECT gen_random_uuid(), m.id, 'MetroScale 500 Bench', 'MST-500', 'III',
       500, 'kg', 2, 'kg', 0.1, 'kg', 5000, 'III', 'electronic', 2020
FROM manufacturers m WHERE m.name = 'MetroScale Technologies'
AND NOT EXISTS (SELECT 1 FROM instrument_models im WHERE im.model_name = 'MetroScale 500 Bench');

-- ── 4. Instruments ───────────────────────────────────────────────────────────
-- Existing live instruments (XPR-2021-0001 etc.) stay; new units are added.

INSERT INTO instruments (id, model_id, laboratory_id, serial_number, date_received, last_calibration, next_calibration, condition, notes)
SELECT gen_random_uuid(), im.id, l.id,
       'ABC-2026-EL-00412', '2024-01-15'::date, '2026-06-15'::date, '2027-06-15'::date, 'good',
       'Primary balance for routine weighing tests'
FROM instrument_models im, laboratories l
WHERE im.model_name = 'ABC-3000 Electronic Balance' AND l.code = 'CMTL-PY-01'
AND NOT EXISTS (SELECT 1 FROM instruments i WHERE i.serial_number = 'ABC-2026-EL-00412');

INSERT INTO instruments (id, model_id, laboratory_id, serial_number, date_received, last_calibration, next_calibration, condition, notes)
SELECT gen_random_uuid(), im.id, l.id,
       'PWS-2025-PR-00089', '2024-03-22'::date, '2026-07-20'::date, '2027-07-20'::date, 'good',
       'High-precision scale for analytical work'
FROM instrument_models im, laboratories l
WHERE im.model_name = 'PWS Precision Scale 220' AND l.code = 'CMTL-PY-01'
AND NOT EXISTS (SELECT 1 FROM instruments i WHERE i.serial_number = 'PWS-2025-PR-00089');

INSERT INTO instruments (id, model_id, laboratory_id, serial_number, date_received, last_calibration, next_calibration, condition, notes)
SELECT gen_random_uuid(), im.id, l.id,
       'MST-2024-EL-00247', '2023-11-05'::date, '2026-05-10'::date, '2026-11-10'::date, 'needs-repair',
       'Awaiting platform replacement - display flickering'
FROM instrument_models im, laboratories l
WHERE im.model_name = 'MetroScale 2000 Industrial' AND l.code = 'PITL-PR-02'
AND NOT EXISTS (SELECT 1 FROM instruments i WHERE i.serial_number = 'MST-2024-EL-00247');

INSERT INTO instruments (id, model_id, laboratory_id, serial_number, date_received, last_calibration, next_calibration, condition, notes)
SELECT gen_random_uuid(), im.id, l.id,
       'ABC-2025-EL-00589', '2025-01-10'::date, '2026-08-01'::date, '2027-08-01'::date, 'good',
       'Semi-micro balance with internal calibration'
FROM instrument_models im, laboratories l
WHERE im.model_name = 'ABC-220 Analytical Balance' AND l.code = 'CMTL-PY-01'
AND NOT EXISTS (SELECT 1 FROM instruments i WHERE i.serial_number = 'ABC-2025-EL-00589');

INSERT INTO instruments (id, model_id, laboratory_id, serial_number, date_received, last_calibration, next_calibration, condition, notes)
SELECT gen_random_uuid(), im.id, l.id,
       'PWS-2025-PL-00334', '2025-02-20'::date, '2026-02-15'::date, '2026-08-15'::date, 'out-of-service',
       'Load cell failure - sent for manufacturer repair'
FROM instrument_models im, laboratories l
WHERE im.model_name = 'PWS Platform Scale 3000' AND l.code = 'PITL-PR-02'
AND NOT EXISTS (SELECT 1 FROM instruments i WHERE i.serial_number = 'PWS-2025-PL-00334');

INSERT INTO instruments (id, model_id, laboratory_id, serial_number, date_received, last_calibration, next_calibration, condition, notes)
SELECT gen_random_uuid(), im.id, l.id,
       'MST-2024-BN-00156', '2024-09-10'::date, '2026-03-01'::date, '2027-03-01'::date, 'good',
       'Bench scale for medium-load verification'
FROM instrument_models im, laboratories l
WHERE im.model_name = 'MetroScale 500 Bench' AND l.code = 'SZMC-CH-04'
AND NOT EXISTS (SELECT 1 FROM instruments i WHERE i.serial_number = 'MST-2024-BN-00156');

INSERT INTO instruments (id, model_id, laboratory_id, serial_number, date_received, last_calibration, next_calibration, condition, notes)
SELECT gen_random_uuid(), im.id, l.id,
       'ABC-2026-EL-00789', '2026-03-05'::date, '2026-09-01'::date, '2027-09-01'::date, 'good',
       'Second unit for Delhi lab overflow testing'
FROM instrument_models im, laboratories l
WHERE im.model_name = 'ABC-3000 Electronic Balance' AND l.code = 'NZCL-DL-03'
AND NOT EXISTS (SELECT 1 FROM instruments i WHERE i.serial_number = 'ABC-2026-EL-00789');

-- ── 5. Test Equipment (report-scoped; attach to existing report TPR-2024-0001) ─

INSERT INTO test_equipment (id, report_id, equipment_name, equipment_type, serial_number, nominal_value, nominal_value_unit, calibration_date, calibration_valid_until, certificate_number, role_in_test)
SELECT gen_random_uuid(), tr.id, 'E2 Standard Weight Set (1 mg - 200 g)', 'standard-weight', 'STD-E2-001',
       200, 'g', '2026-03-15'::date, '2027-03-15'::date, 'CAL-E2-2026-001', 'reference weights'
FROM test_reports tr WHERE tr.report_number = 'TPR-2024-0001'
AND NOT EXISTS (SELECT 1 FROM test_equipment te WHERE te.serial_number = 'STD-E2-001');

INSERT INTO test_equipment (id, report_id, equipment_name, equipment_type, serial_number, nominal_value, nominal_value_unit, calibration_date, calibration_valid_until, certificate_number, role_in_test)
SELECT gen_random_uuid(), tr.id, 'M2 Calibration Weight Set (100 g - 20 kg)', 'standard-weight', 'STD-M2-003',
       20000, 'g', '2026-05-20'::date, '2027-05-20'::date, 'CAL-M2-2026-003', 'reference weights'
FROM test_reports tr WHERE tr.report_number = 'TPR-2024-0001'
AND NOT EXISTS (SELECT 1 FROM test_equipment te WHERE te.serial_number = 'STD-M2-003');

INSERT INTO test_equipment (id, report_id, equipment_name, equipment_type, serial_number, nominal_value, nominal_value_unit, calibration_date, calibration_valid_until, certificate_number, role_in_test)
SELECT gen_random_uuid(), tr.id, 'Environmental Monitor (Temp/Humidity)', 'tool', 'ENV-001',
       NULL, NULL, '2026-01-10'::date, '2027-01-10'::date, 'CAL-ENV-2026-001', 'environmental monitoring'
FROM test_reports tr WHERE tr.report_number = 'TPR-2024-0001'
AND NOT EXISTS (SELECT 1 FROM test_equipment te WHERE te.serial_number = 'ENV-001');

INSERT INTO test_equipment (id, report_id, equipment_name, equipment_type, serial_number, nominal_value, nominal_value_unit, calibration_date, calibration_valid_until, certificate_number, role_in_test)
SELECT gen_random_uuid(), tr.id, 'F1 Standard Weight Set (500 g - 10 kg)', 'standard-weight', 'STD-F1-002',
       10000, 'g', '2025-12-01'::date, '2026-12-01'::date, 'CAL-F1-2025-002', 'reference weights'
FROM test_reports tr WHERE tr.report_number = 'TPR-2024-0001'
AND NOT EXISTS (SELECT 1 FROM test_equipment te WHERE te.serial_number = 'STD-F1-002');

INSERT INTO test_equipment (id, report_id, equipment_name, equipment_type, serial_number, nominal_value, nominal_value_unit, calibration_date, calibration_valid_until, certificate_number, role_in_test)
SELECT gen_random_uuid(), tr.id, 'Precision Forceps Set', 'accessory', 'TOOL-001',
       NULL, NULL, NULL, NULL, NULL, 'handling'
FROM test_reports tr WHERE tr.report_number = 'TPR-2024-0001'
AND NOT EXISTS (SELECT 1 FROM test_equipment te WHERE te.serial_number = 'TOOL-001');

INSERT INTO test_equipment (id, report_id, equipment_name, equipment_type, serial_number, nominal_value, nominal_value_unit, calibration_date, calibration_valid_until, certificate_number, role_in_test)
SELECT gen_random_uuid(), tr.id, 'Test Weights (E2, 1 kg)', 'calibrated-weight', 'STD-E2-009',
       1000, 'g', '2026-06-01'::date, '2027-06-01'::date, 'CAL-E2-2026-009', 'reference weights'
FROM test_reports tr WHERE tr.report_number = 'TPR-2024-0001'
AND NOT EXISTS (SELECT 1 FROM test_equipment te WHERE te.serial_number = 'STD-E2-009');

-- ── 6. Compliance Rules (OIML R-76 Demo) ────────────────────────────────────
-- DEMO rules for presentation — NOT for regulatory use.

INSERT INTO compliance_rules (id, standard, standard_version, rule_type, rule_name, rule_data, description, is_active)
SELECT gen_random_uuid(), 'OIML-R76', 'DEMO-2026.01', 'mpe_table', 'Class III MPE Table',
       '{"instrument_class": "III", "mpe_ranges": [{"min_load": 0, "max_load": 500, "mpe": "0.5e"}, {"min_load": 500, "max_load": 2000, "mpe": "1.0e"}, {"min_load": 2000, "max_load": 3000, "mpe": "1.5e"}]}'::jsonb,
       'Maximum permissible error table for Class III instruments', true
WHERE NOT EXISTS (SELECT 1 FROM compliance_rules cr WHERE cr.rule_type = 'mpe_table' AND cr.rule_name = 'Class III MPE Table');

INSERT INTO compliance_rules (id, standard, standard_version, rule_type, rule_name, rule_data, description, is_active)
SELECT gen_random_uuid(), 'OIML-R76', 'DEMO-2026.01', 'mpe_table', 'Class II MPE Table',
       '{"instrument_class": "II", "mpe_ranges": [{"min_load": 0, "max_load": 5000, "mpe": "0.5e"}, {"min_load": 5000, "max_load": 20000, "mpe": "1.0e"}, {"min_load": 20000, "max_load": 220000, "mpe": "1.5e"}]}'::jsonb,
       'Maximum permissible error table for Class II instruments', true
WHERE NOT EXISTS (SELECT 1 FROM compliance_rules cr WHERE cr.rule_type = 'mpe_table' AND cr.rule_name = 'Class II MPE Table');

INSERT INTO compliance_rules (id, standard, standard_version, rule_type, rule_name, rule_data, description, is_active)
SELECT gen_random_uuid(), 'OIML-R76', 'DEMO-2026.01', 'test_point', 'Repeatability (Class III)',
       '{"test_code": "RPT", "instrument_class": "III", "max_cv_percent": 0.03, "min_observations": 5, "description": "Coefficient of variation must not exceed 0.03% for Class III instruments"}'::jsonb,
       'Repeatability limit for Class III instruments', true
WHERE NOT EXISTS (SELECT 1 FROM compliance_rules cr WHERE cr.rule_name = 'Repeatability (Class III)');

INSERT INTO compliance_rules (id, standard, standard_version, rule_type, rule_name, rule_data, description, is_active)
SELECT gen_random_uuid(), 'OIML-R76', 'DEMO-2026.01', 'test_point', 'Repeatability (Class II)',
       '{"test_code": "RPT", "instrument_class": "II", "max_cv_percent": 0.015, "min_observations": 5, "description": "Coefficient of variation must not exceed 0.015% for Class II instruments"}'::jsonb,
       'Repeatability limit for Class II instruments', true
WHERE NOT EXISTS (SELECT 1 FROM compliance_rules cr WHERE cr.rule_name = 'Repeatability (Class II)');

INSERT INTO compliance_rules (id, standard, standard_version, rule_type, rule_name, rule_data, description, is_active)
SELECT gen_random_uuid(), 'OIML-R76', 'DEMO-2026.01', 'test_point', 'Eccentricity',
       '{"test_code": "ECC", "instrument_class": "all", "max_deviation_fraction": 0.33, "description": "Off-center deviation must not exceed 1/3 of MPE at the eccentricity test load (typically 1/3 of Max capacity)"}'::jsonb,
       'Off-center loading limit (1/3 of MPE)', true
WHERE NOT EXISTS (SELECT 1 FROM compliance_rules cr WHERE cr.rule_name = 'Eccentricity');

INSERT INTO compliance_rules (id, standard, standard_version, rule_type, rule_name, rule_data, description, is_active)
SELECT gen_random_uuid(), 'OIML-R76', 'DEMO-2026.01', 'test_point', 'Discrimination',
       '{"test_code": "DIS", "instrument_class": "all", "min_scale_intervals": 1, "description": "Adding the smallest detectable weight must cause at least 1 scale interval change on the display"}'::jsonb,
       'Discrimination test (minimum 1 scale interval change)', true
WHERE NOT EXISTS (SELECT 1 FROM compliance_rules cr WHERE cr.rule_name = 'Discrimination');

INSERT INTO compliance_rules (id, standard, standard_version, rule_type, rule_name, rule_data, description, is_active)
SELECT gen_random_uuid(), 'OIML-R76', 'DEMO-2026.01', 'test_point', 'Stability',
       '{"test_code": "STB", "instrument_class": "all", "max_drift_fraction": 0.5, "description": "Reading drift over 30-minute observation period must not exceed 0.5 scale intervals"}'::jsonb,
       'Stability / drift limit (30 min)', true
WHERE NOT EXISTS (SELECT 1 FROM compliance_rules cr WHERE cr.rule_name = 'Stability');

-- ── Done ─────────────────────────────────────────────────────────────────────
-- Verify with:
--   SELECT 'laboratories', count(*) FROM laboratories;
--   SELECT 'manufacturers', count(*) FROM manufacturers;
--   SELECT 'instrument_models', count(*) FROM instrument_models;
--   SELECT 'instruments', count(*) FROM instruments;
--   SELECT 'test_equipment', count(*) FROM test_equipment;
--   SELECT 'compliance_rules', count(*) FROM compliance_rules;