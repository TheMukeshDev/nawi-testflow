-- ============================================================================
-- NAWI Sahayak — Initial Schema Migration
-- Standard: OIML R-76 — Non-Automatic Weighing Instruments
-- Database: PostgreSQL 16+ (Supabase)
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
    role VARCHAR(50) NOT NULL DEFAULT 'viewer'
        CHECK (role IN ('admin', 'tester', 'reviewer', 'viewer')),
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
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Profiles: Users can read their own profile.
-- NOTE: Admin-wide profile access is provided by 002_rls_policies.sql via the
-- SECURITY DEFINER is_admin() helper, which avoids infinite recursion from a
-- self-referencing profiles subquery in a policy on the profiles table.
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = auth_user_id);

-- Laboratories: All authenticated users can read active labs
CREATE POLICY "Authenticated users can view active laboratories" ON laboratories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage laboratories" ON laboratories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Test Reports: Users can read reports in their lab (or all for admin)
CREATE POLICY "Users can view reports in their lab" ON test_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE auth_user_id = auth.uid()
            AND (
                role = 'admin'
                OR laboratory_id = test_reports.laboratory_id
            )
        )
    );

CREATE POLICY "Testers can create reports" ON test_reports
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'tester')
        )
    );

CREATE POLICY "Testers can update own draft reports" ON test_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE auth_user_id = auth.uid()
            AND (
                role = 'admin'
                OR (role = 'tester' AND created_by = id AND status IN ('draft', 'in-testing', 'revision-requested'))
                OR (role = 'reviewer' AND laboratory_id = test_reports.laboratory_id AND status = 'pending-review')
            )
        )
    );

-- Instruments: Users can read instruments in their lab
CREATE POLICY "Users can view instruments in their lab" ON instruments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE auth_user_id = auth.uid()
            AND (
                role = 'admin'
                OR laboratory_id = instruments.laboratory_id
            )
        )
    );

CREATE POLICY "Testers can manage instruments in their lab" ON instruments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE auth_user_id = auth.uid()
            AND (
                role = 'admin'
                OR (role = 'tester' AND laboratory_id = instruments.laboratory_id)
            )
        )
    );

-- Audit Logs: Admins can read all, others can read their own
CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (
        user_id = (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        )
    );

-- ============================================================================
-- SEED DATA: Default laboratories
-- ============================================================================

INSERT INTO laboratories (name, code, address, city, state, country, contact_person, phone, email, is_active)
VALUES
('Precision Metrics Testing Laboratory', 'PMTL-PUNE-01', '123 Instrumentation Park, Hinjewadi Phase III', 'Pune', 'Maharashtra', 'India', 'Dr. Priya Sharma', '+91-20-5555-0123', 'contact@pmtl-demo.example.in', true),
('National Instrumentation Test Centre', 'NITC-DEL-01', '456 Metro Station Road, Sector 15', 'New Delhi', 'Delhi', 'India', 'Dr. Rajesh Kumar', '+91-11-5555-0456', 'info@nitc-demo.example.in', true);
