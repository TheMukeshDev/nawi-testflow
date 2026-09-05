-- ============================================================================
-- NAWI Sahayak — Initial Schema Migration
-- Standard: OIML R-76 — Non-Automatic Weighing Instruments
-- Database: PostgreSQL 16+
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'technician'
        CHECK (role IN ('admin', 'lab-manager', 'technician', 'reviewer', 'auditor', 'viewer')),
    laboratory_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_auth_user ON profiles(auth_user_id);
CREATE INDEX idx_profiles_laboratory ON profiles(laboratory_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================================================
-- 2. LABORATORIES
-- ============================================================================

CREATE TABLE laboratories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    accreditation_body VARCHAR(100),
    accreditation_number VARCHAR(100),
    accreditation_valid_until DATE,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_laboratories_code ON laboratories(code);
CREATE INDEX idx_laboratories_active ON laboratories(is_active);

-- Add FK for profiles.laboratory_id
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_laboratory
    FOREIGN KEY (laboratory_id) REFERENCES laboratories(id);

-- ============================================================================
-- 3. MANUFACTURERS
-- ============================================================================

CREATE TABLE manufacturers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    address TEXT,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_manufacturers_name ON manufacturers(name);
CREATE INDEX idx_manufacturers_country ON manufacturers(country);

-- ============================================================================
-- 4. INSTRUMENT MODELS
-- ============================================================================

CREATE TABLE instrument_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manufacturer_id UUID NOT NULL REFERENCES manufacturers(id) ON DELETE RESTRICT,
    model_name VARCHAR(255) NOT NULL,
    model_number VARCHAR(100) NOT NULL,
    instrument_class VARCHAR(10) NOT NULL
        CHECK (instrument_class IN ('I', 'II', 'III', 'IIII', 'IIIIL')),
    capacity NUMERIC(12,4) NOT NULL,
    capacity_unit VARCHAR(10) NOT NULL DEFAULT 'kg'
        CHECK (capacity_unit IN ('mg', 'g', 'kg', 't')),
    min_capacity NUMERIC(12,4) NOT NULL,
    min_capacity_unit VARCHAR(10) NOT NULL DEFAULT 'kg'
        CHECK (min_capacity_unit IN ('mg', 'g', 'kg', 't')),
    division NUMERIC(12,6) NOT NULL,
    division_unit VARCHAR(10) NOT NULL DEFAULT 'kg'
        CHECK (division_unit IN ('mg', 'g', 'kg', 't')),
    verification_scale_divisions INTEGER NOT NULL,
    accuracy_class VARCHAR(50),
    power_supply VARCHAR(100),
    operating_temp_min NUMERIC(5,1),
    operating_temp_max NUMERIC(5,1),
    device_type VARCHAR(50) NOT NULL DEFAULT 'electronic'
        CHECK (device_type IN ('mechanical', 'electronic', 'electromechanical')),
    year_of_manufacture INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_instrument_models_manufacturer ON instrument_models(manufacturer_id);
CREATE INDEX idx_instrument_models_class ON instrument_models(instrument_class);
CREATE INDEX idx_instrument_models_model_number ON instrument_models(model_number);

-- ============================================================================
-- 5. INSTRUMENTS
-- ============================================================================

CREATE TABLE instruments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES instrument_models(id) ON DELETE RESTRICT,
    serial_number VARCHAR(100) NOT NULL,
    laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE RESTRICT,
    date_received DATE NOT NULL DEFAULT CURRENT_DATE,
    last_calibration DATE,
    next_calibration DATE,
    condition VARCHAR(20) NOT NULL DEFAULT 'good'
        CHECK (condition IN ('good', 'needs-repair', 'out-of-service')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    UNIQUE(serial_number, laboratory_id)
);

CREATE INDEX idx_instruments_model ON instruments(model_id);
CREATE INDEX idx_instruments_laboratory ON instruments(laboratory_id);
CREATE INDEX idx_instruments_serial ON instruments(serial_number);
CREATE INDEX idx_instruments_condition ON instruments(condition);

-- ============================================================================
-- 6. COMPLIANCE RULES (Configurable OIML R-76 rules)
-- ============================================================================

CREATE TABLE compliance_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    standard VARCHAR(50) NOT NULL DEFAULT 'OIML R-76',
    standard_version VARCHAR(50) NOT NULL,
    rule_type VARCHAR(50) NOT NULL
        CHECK (rule_type IN ('mpe_table', 'test_point', 'instrument_class', 'environmental')),
    rule_name VARCHAR(255) NOT NULL,
    rule_data JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_compliance_rules_standard ON compliance_rules(standard, standard_version);
CREATE INDEX idx_compliance_rules_type ON compliance_rules(rule_type);
CREATE INDEX idx_compliance_rules_active ON compliance_rules(is_active);

-- ============================================================================
-- 7. TEST REPORTS (Main test record)
-- ============================================================================

CREATE TABLE test_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_number VARCHAR(50) UNIQUE NOT NULL,
    instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,
    laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE RESTRICT,
    verification_type VARCHAR(50) NOT NULL
        CHECK (verification_type IN ('initial', 'subsequent', 'type-approval')),
    test_standard VARCHAR(50) NOT NULL DEFAULT 'OIML R-76',
    test_standard_version VARCHAR(50) NOT NULL DEFAULT '2009',
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft', 'in-testing', 'observations-complete',
            'calculations-pending', 'calculations-complete',
            'pending-review', 'revision-requested',
            'approved', 'rejected', 'completed'
        )),
    compliance_result VARCHAR(50)
        CHECK (compliance_result IN ('compliant', 'non-compliant', 'conditional', 'pending', 'not-applicable')),
    compliance_notes TEXT,
    assigned_technician_id UUID NOT NULL REFERENCES profiles(id),
    assigned_reviewer_id UUID REFERENCES profiles(id),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES profiles(id),
    updated_by UUID NOT NULL REFERENCES profiles(id)
);

CREATE INDEX idx_test_reports_number ON test_reports(report_number);
CREATE INDEX idx_test_reports_instrument ON test_reports(instrument_id);
CREATE INDEX idx_test_reports_laboratory ON test_reports(laboratory_id);
CREATE INDEX idx_test_reports_status ON test_reports(status);
CREATE INDEX idx_test_reports_compliance ON test_reports(compliance_result);
CREATE INDEX idx_test_reports_technician ON test_reports(assigned_technician_id);
CREATE INDEX idx_test_reports_reviewer ON test_reports(assigned_reviewer_id);
CREATE INDEX idx_test_reports_created ON test_reports(created_at);
CREATE INDEX idx_test_reports_standard ON test_reports(test_standard, test_standard_version);

-- ============================================================================
-- 8. TEST CONDITIONS (Environmental conditions during test)
-- ============================================================================

CREATE TABLE test_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
    temperature NUMERIC(5,1) NOT NULL,
    temperature_unit VARCHAR(5) NOT NULL DEFAULT '°C',
    temperature_min NUMERIC(5,1),
    temperature_max NUMERIC(5,1),
    humidity NUMERIC(5,1) NOT NULL,
    humidity_min NUMERIC(5,1),
    humidity_max NUMERIC(5,1),
    air_pressure NUMERIC(6,1),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_by UUID NOT NULL REFERENCES profiles(id),
    temperature_status VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (temperature_status IN ('normal', 'out-of-range', 'not-recorded')),
    humidity_status VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (humidity_status IN ('normal', 'out-of-range', 'not-recorded')),
    air_pressure_status VARCHAR(20) DEFAULT 'not-recorded'
        CHECK (air_pressure_status IN ('normal', 'out-of-range', 'not-recorded')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_conditions_report ON test_conditions(report_id);

-- ============================================================================
-- 9. TEST CASES (Individual test procedures)
-- ============================================================================

CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
    case_type VARCHAR(50) NOT NULL
        CHECK (case_type IN ('repeatability', 'eccentricity', 'linearity', 'discrimination', 'stability', 'temperature-effect')),
    test_point_label VARCHAR(50) NOT NULL,
    test_point_value NUMERIC(12,6) NOT NULL,
    unit VARCHAR(10) NOT NULL DEFAULT 'kg'
        CHECK (unit IN ('mg', 'g', 'kg', 't')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in-progress', 'complete')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_test_cases_report ON test_cases(report_id);
CREATE INDEX idx_test_cases_type ON test_cases(case_type);
CREATE INDEX idx_test_cases_status ON test_cases(status);

-- ============================================================================
-- 10. TEST OBSERVATIONS (Measured values)
-- ============================================================================

CREATE TABLE test_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    observation_number INTEGER NOT NULL,
    measured_value NUMERIC(12,6) NOT NULL,
    unit VARCHAR(10) NOT NULL DEFAULT 'kg',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    UNIQUE(case_id, observation_number)
);

CREATE INDEX idx_test_observations_case ON test_observations(case_id);

-- ============================================================================
-- 11. TEST RESULTS (Calculated results per test case)
-- ============================================================================

CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    mean_value NUMERIC(12,6),
    std_deviation NUMERIC(12,6),
    deviation_from_reference NUMERIC(12,6),
    calculated_error NUMERIC(12,6),
    max_permissible_error NUMERIC(12,6),
    verdict VARCHAR(20)
        CHECK (verdict IN ('pass', 'fail', 'conditional', 'pending')),
    calculation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    calculated_by UUID NOT NULL REFERENCES profiles(id),
    calculation_version VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(report_id, case_id)
);

CREATE INDEX idx_test_results_report ON test_results(report_id);
CREATE INDEX idx_test_results_case ON test_results(case_id);
CREATE INDEX idx_test_results_verdict ON test_results(verdict);

-- ============================================================================
-- 12. TEST EQUIPMENT (Equipment used during test)
-- ============================================================================

CREATE TABLE test_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(50) NOT NULL
        CHECK (equipment_type IN ('standard-weight', 'calibrated-weight', 'accessory', 'tool')),
    serial_number VARCHAR(100),
    nominal_value NUMERIC(12,6),
    nominal_value_unit VARCHAR(10),
    calibration_date DATE,
    calibration_valid_until DATE,
    certificate_number VARCHAR(100),
    role_in_test VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_equipment_report ON test_equipment(report_id);

-- ============================================================================
-- 13. ATTACHMENTS
-- ============================================================================

CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL
        CHECK (entity_type IN ('test-report', 'instrument', 'laboratory', 'equipment', 'user')),
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'nawi-attachments',
    category VARCHAR(50) NOT NULL DEFAULT 'other'
        CHECK (category IN ('photo', 'certificate', 'calibration', 'observation', 'report', 'other')),
    description TEXT,
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum VARCHAR(64)
);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_category ON attachments(category);
CREATE INDEX idx_attachments_uploaded ON attachments(uploaded_at);

-- ============================================================================
-- 14. REPORT VERSIONS (Version history for generated reports)
-- ============================================================================

CREATE TABLE report_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_format VARCHAR(10) NOT NULL CHECK (file_format IN ('pdf', 'docx', 'xlsx')),
    file_size INTEGER NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by UUID NOT NULL REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_report_versions_report ON report_versions(report_id);
CREATE INDEX idx_report_versions_number ON report_versions(report_id, version_number);

-- ============================================================================
-- 15. AUDIT LOGS
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL
        CHECK (action IN (
            'create', 'update', 'delete', 'submit', 'approve', 'reject',
            'comment', 'status-change', 'export', 'login', 'logout',
            'calculate', 'report-generate', 'report-download'
        )),
    entity_type VARCHAR(50) NOT NULL
        CHECK (entity_type IN (
            'test-report', 'instrument', 'instrument-model', 'laboratory',
            'equipment', 'manufacturer', 'user', 'attachment', 'report-version'
        )),
    entity_id UUID NOT NULL,
    entity_label VARCHAR(255),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    notes TEXT
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================================================
-- TRIGGERS: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_laboratories_updated_at BEFORE UPDATE ON laboratories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manufacturers_updated_at BEFORE UPDATE ON manufacturers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instrument_models_updated_at BEFORE UPDATE ON instrument_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instruments_updated_at BEFORE UPDATE ON instruments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_rules_updated_at BEFORE UPDATE ON compliance_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_reports_updated_at BEFORE UPDATE ON test_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_conditions_updated_at BEFORE UPDATE ON test_conditions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_observations_updated_at BEFORE UPDATE ON test_observations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_results_updated_at BEFORE UPDATE ON test_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_equipment_updated_at BEFORE UPDATE ON test_equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Default compliance rules for OIML R-76
-- ============================================================================
--
-- The only authoritative numeric limits seeded here are the official
-- OIML R 76-1 Maximum Permissible Error (MPE) tables (Table 2), as
-- recorded in the rulebook. No random or invented limits are seeded.
-- Tests for which OIML provides no numeric criterion (e.g. repeatability)
-- are intentionally left without values so a reviewer supplies them.

INSERT INTO compliance_rules (standard, standard_version, rule_type, rule_name, rule_data, description, is_active)
VALUES
-- MPE Table for Class I instruments (OIML R 76-1 Table 2)
('OIML R-76', '2006', 'mpe_table', 'Class I MPE Table',
 '{"class": "I", "rules": [
   {"min_divisions": 0,    "max_divisions": 50000,  "multiplier": 0.5},
   {"min_divisions": 50000, "max_divisions": 200000, "multiplier": 1.0},
   {"min_divisions": 200000, "max_divisions": null,  "multiplier": 1.5}
 ]}',
 'Maximum Permissible Error table for Class I (OIML R 76-1 Table 2)', true),

-- MPE Table for Class II instruments (OIML R 76-1 Table 2)
('OIML R-76', '2006', 'mpe_table', 'Class II MPE Table',
 '{"class": "II", "rules": [
   {"min_divisions": 0,    "max_divisions": 5000,  "multiplier": 0.5},
   {"min_divisions": 5000, "max_divisions": 20000, "multiplier": 1.0},
   {"min_divisions": 20000, "max_divisions": null,  "multiplier": 1.5}
 ]}',
 'Maximum Permissible Error table for Class II (OIML R 76-1 Table 2)', true),

-- MPE Table for Class III instruments (OIML R 76-1 Table 2)
('OIML R-76', '2006', 'mpe_table', 'Class III MPE Table',
 '{"class": "III", "rules": [
   {"min_divisions": 0,    "max_divisions": 500,  "multiplier": 0.5},
   {"min_divisions": 500,  "max_divisions": 2000, "multiplier": 1.0},
   {"min_divisions": 2000, "max_divisions": null,  "multiplier": 1.5}
 ]}',
 'Maximum Permissible Error table for Class III (OIML R 76-1 Table 2). '
 'E.g. e=10g: ≤500e (5kg) ±0.5e=±5g; 500e-2000e ±1e; above 2000e ±1.5e.', true),

-- MPE Table for Class IIII instruments (OIML R 76-1 Table 2)
('OIML R-76', '2006', 'mpe_table', 'Class IIII MPE Table',
 '{"class": "IIII", "rules": [
   {"min_divisions": 0,   "max_divisions": 50,  "multiplier": 0.5},
   {"min_divisions": 50,  "max_divisions": 200, "multiplier": 1.0},
   {"min_divisions": 200, "max_divisions": null, "multiplier": 1.5}
 ]}',
 'Maximum Permissible Error table for Class IIII (OIML R 76-1 Table 2)', true),

-- Weighing (Gross Load) test rule — OIML R 76-2 error method
('OIML R-76', '2006', 'test_point', 'Weighing (Gross Load) Test',
 '{"test_code": "WGT",
   "formula": "E = I + 0.5*e - delta_L - L;  E_c = E - E0",
   "decision": "PASS if abs(E_c) <= MPE(L)",
   "mpe_source": "OIML R 76-1 Table 2",
   "points": ["Min", "0.1e", "0.25e", "0.5e", "0.75e", "1e"]}',
 'Gross load weighing test per OIML R 76-2. Error formula and MPE comparison.', true),

-- Eccentricity test rule — same error method as weighing, must meet MPE
('OIML R-76', '2006', 'test_point', 'Eccentricity Test',
 '{"test_code": "ECC",
   "formula": "E_i = I_i + 0.5*e - delta_L - L - E0_i",
   "decision": "PASS if all abs(E_c(i)) <= MPE(L)",
   "mpe_source": "OIML R 76-1 Table 2",
   "points_of_support": 4}',
 'Eccentricity test at multiple platter positions; each must meet MPE.', true),

-- Discrimination test rule — functional test per R 76-2 5.8
('OIML R-76', '2006', 'test_point', 'Discrimination Test',
 '{"test_code": "DIS",
   "rule": "Adding/removing a small weight must shift indication by >= 1 d",
   "decision": "PASS if abs(dI) >= e"}',
 'Discrimination test per OIML R 76-2 5.8. Functional, no numeric MPE.', true),

-- Repeatability — OIML gives NO numeric limit (R76-1 5.5.4)
('OIML R-76', '2006', 'test_point', 'Repeatability (limit not configured)',
 '{"test_code": "RPT",
   "limit": "RULE_NOT_CONFIGURED",
   "note": "OIML R-76 does not specify a numeric repeatability limit; "
           "must be set by national/regulatory rule."}',
 'Repeatability per R 76-1 5.5.4. No numeric limit in OIML — reviewer supplies value.', true),

-- Test point definitions as fractions of capacity
('OIML R-76', '2006', 'test_point', 'Standard Test Points',
 '{"test_points": [
   {"label": "Min", "fraction": "min", "description": "Minimum load"},
   {"label": "0.1e", "fraction": 0.1, "description": "10% of capacity"},
   {"label": "0.25e", "fraction": 0.25, "description": "25% of capacity"},
   {"label": "0.5e", "fraction": 0.5, "description": "50% of capacity"},
   {"label": "1e", "fraction": 1.0, "description": "100% of capacity"}
 ]}',
 'Standard test points for verification', true),

-- Environmental conditions
('OIML R-76', '2006', 'environmental', 'Operating Conditions',
 '{"temperature": {"min": -10, "max": 40, "unit": "°C"}, "humidity": {"min": 0, "max": 85, "unit": "%RH"}}',
 'Acceptable environmental conditions for testing', true);
