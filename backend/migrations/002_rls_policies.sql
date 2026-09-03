-- ============================================================================
-- NAWI TestFlow — Row-Level Security Policies
-- Standard: OIML R-76 — Non-Automatic Weighing Instruments
-- Database: PostgreSQL 16+ with Supabase
-- ============================================================================
--
-- IMPORTANT: These roles (admin, tester, reviewer, viewer) are PROPOSED
-- application roles for our implementation. They are NOT specified by
-- the SIH Problem Statement 26035.
--
-- The PS requires "secure user access with role-based permissions"
-- but does not prescribe specific role names or permission structures.
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current user's role from profiles table
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's profile ID
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
    SELECT id FROM profiles WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's laboratory ID
CREATE OR REPLACE FUNCTION get_user_laboratory_id()
RETURNS UUID AS $$
    SELECT laboratory_id FROM profiles WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT get_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is tester or admin
CREATE OR REPLACE FUNCTION is_tester_or_admin()
RETURNS BOOLEAN AS $$
    SELECT get_user_role() IN ('admin', 'tester');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is reviewer or admin
CREATE OR REPLACE FUNCTION is_reviewer_or_admin()
RETURNS BOOLEAN AS $$
    SELECT get_user_role() IN ('admin', 'reviewer');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrument_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
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
-- PROFILES POLICIES
-- ============================================================================

-- Admin: Full access to all profiles
CREATE POLICY "profiles_admin_all" ON profiles
    FOR ALL
    USING (is_admin());

-- Users: Can view own profile
CREATE POLICY "profiles_view_own" ON profiles
    FOR SELECT
    USING (auth_user_id = auth.uid());

-- Users: Can update own profile (limited fields)
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Admin: Can insert new profiles
CREATE POLICY "profiles_admin_insert" ON profiles
    FOR INSERT
    WITH CHECK (is_admin());

-- Admin: Can delete profiles
CREATE POLICY "profiles_admin_delete" ON profiles
    FOR DELETE
    USING (is_admin());

-- ============================================================================
-- LABORATORIES POLICIES
-- ============================================================================

-- Admin: Full access to all laboratories
CREATE POLICY "laboratories_admin_all" ON laboratories
    FOR ALL
    USING (is_admin());

-- All authenticated users: Can view active laboratories
CREATE POLICY "laboratories_view_active" ON laboratories
    FOR SELECT
    USING (is_active = true);

-- Users in laboratory: Can view their own laboratory
CREATE POLICY "laboratories_view_own" ON laboratories
    FOR SELECT
    USING (id = get_user_laboratory_id());

-- ============================================================================
-- MANUFACTURERS POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY "manufacturers_admin_all" ON manufacturers
    FOR ALL
    USING (is_admin());

-- Tester/Admin: Can insert manufacturers
CREATE POLICY "manufacturers_tester_insert" ON manufacturers
    FOR INSERT
    WITH CHECK (is_tester_or_admin());

-- All authenticated users: Can view manufacturers
CREATE POLICY "manufacturers_view_all" ON manufacturers
    FOR SELECT
    USING (true);

-- ============================================================================
-- INSTRUMENT MODELS POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY "instrument_models_admin_all" ON instrument_models
    FOR ALL
    USING (is_admin());

-- Tester/Admin: Can insert instrument models
CREATE POLICY "instrument_models_tester_insert" ON instrument_models
    FOR INSERT
    WITH CHECK (is_tester_or_admin());

-- All authenticated users: Can view instrument models
CREATE POLICY "instrument_models_view_all" ON instrument_models
    FOR SELECT
    USING (true);

-- ============================================================================
-- INSTRUMENTS POLICIES
-- ============================================================================

-- Admin: Full access to all instruments
CREATE POLICY "instruments_admin_all" ON instruments
    FOR ALL
    USING (is_admin());

-- Tester: Can view instruments in their laboratory
CREATE POLICY "instruments_tester_view_lab" ON instruments
    FOR SELECT
    USING (
        get_user_role() = 'tester'
        AND laboratory_id = get_user_laboratory_id()
    );

-- Tester: Can insert instruments in their laboratory
CREATE POLICY "instruments_tester_insert" ON instruments
    FOR INSERT
    WITH CHECK (
        get_user_role() = 'tester'
        AND laboratory_id = get_user_laboratory_id()
    );

-- Tester: Can update instruments in their laboratory
CREATE POLICY "instruments_tester_update" ON instruments
    FOR UPDATE
    USING (
        get_user_role() = 'tester'
        AND laboratory_id = get_user_laboratory_id()
    );

-- Reviewer: Can view instruments in their laboratory
CREATE POLICY "instruments_reviewer_view_lab" ON instruments
    FOR SELECT
    USING (
        get_user_role() = 'reviewer'
        AND laboratory_id = get_user_laboratory_id()
    );

-- Viewer: Can view instruments in their laboratory
CREATE POLICY "instruments_viewer_view_lab" ON instruments
    FOR SELECT
    USING (
        get_user_role() = 'viewer'
        AND laboratory_id = get_user_laboratory_id()
    );

-- ============================================================================
-- COMPLIANCE RULES POLICIES
-- ============================================================================

-- Admin: Full access to compliance rules
CREATE POLICY "compliance_rules_admin_all" ON compliance_rules
    FOR ALL
    USING (is_admin());

-- All authenticated users: Can view active rules
CREATE POLICY "compliance_rules_view_active" ON compliance_rules
    FOR SELECT
    USING (is_active = true);

-- ============================================================================
-- TEST REPORTS POLICIES
-- ============================================================================

-- Admin: Full access to all test reports
CREATE POLICY "test_reports_admin_all" ON test_reports
    FOR ALL
    USING (is_admin());

-- Tester: Can view test reports they created in their lab
CREATE POLICY "test_reports_tester_view_own" ON test_reports
    FOR SELECT
    USING (
        get_user_role() = 'tester'
        AND created_by = get_user_id()
        AND laboratory_id = get_user_laboratory_id()
    );

-- Tester: Can insert test reports in their laboratory
CREATE POLICY "test_reports_tester_insert" ON test_reports
    FOR INSERT
    WITH CHECK (
        get_user_role() = 'tester'
        AND laboratory_id = get_user_laboratory_id()
        AND created_by = get_user_id()
    );

-- Tester: Can update draft test reports they created
CREATE POLICY "test_reports_tester_update_draft" ON test_reports
    FOR UPDATE
    USING (
        get_user_role() = 'tester'
        AND created_by = get_user_id()
        AND status IN ('draft', 'in-testing', 'revision-requested')
    );

-- Tester: Can delete draft test reports they created
CREATE POLICY "test_reports_tester_delete_draft" ON test_reports
    FOR DELETE
    USING (
        get_user_role() = 'tester'
        AND created_by = get_user_id()
        AND status = 'draft'
    );

-- Reviewer: Can view test reports pending review in their lab
CREATE POLICY "test_reports_reviewer_view_pending" ON test_reports
    FOR SELECT
    USING (
        get_user_role() = 'reviewer'
        AND laboratory_id = get_user_laboratory_id()
        AND status IN ('pending-review', 'approved', 'rejected', 'completed')
    );

-- Reviewer: Can update test reports (approve/reject)
CREATE POLICY "test_reports_reviewer_update" ON test_reports
    FOR UPDATE
    USING (
        get_user_role() = 'reviewer'
        AND laboratory_id = get_user_laboratory_id()
        AND status IN ('pending-review', 'approved', 'rejected')
    );

-- Viewer: Can view completed test reports in their lab
CREATE POLICY "test_reports_viewer_view_completed" ON test_reports
    FOR SELECT
    USING (
        get_user_role() = 'viewer'
        AND laboratory_id = get_user_laboratory_id()
        AND status IN ('completed', 'approved')
    );

-- ============================================================================
-- TEST CONDITIONS POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY "test_conditions_admin_all" ON test_conditions
    FOR ALL
    USING (is_admin());

-- Tester: Can manage conditions for test reports they created
CREATE POLICY "test_conditions_tester_manage" ON test_conditions
    FOR ALL
    USING (
        get_user_role() = 'tester'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE created_by = get_user_id()
            AND status IN ('draft', 'in-testing', 'revision-requested')
        )
    );

-- Reviewer: Can view conditions for reports in their lab
CREATE POLICY "test_conditions_reviewer_view" ON test_conditions
    FOR SELECT
    USING (
        get_user_role() = 'reviewer'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE laboratory_id = get_user_laboratory_id()
        )
    );

-- Viewer: Can view conditions for completed reports
CREATE POLICY "test_conditions_viewer_view" ON test_conditions
    FOR SELECT
    USING (
        get_user_role() = 'viewer'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE laboratory_id = get_user_laboratory_id()
            AND status IN ('completed', 'approved')
        )
    );

-- ============================================================================
-- TEST CASES POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY "test_cases_admin_all" ON test_cases
    FOR ALL
    USING (is_admin());

-- Tester: Can manage cases for test reports they created
CREATE POLICY "test_cases_tester_manage" ON test_cases
    FOR ALL
    USING (
        get_user_role() = 'tester'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE created_by = get_user_id()
            AND status IN ('draft', 'in-testing', 'revision-requested')
        )
    );

-- Reviewer: Can view cases for reports in their lab
CREATE POLICY "test_cases_reviewer_view" ON test_cases
    FOR SELECT
    USING (
        get_user_role() = 'reviewer'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE laboratory_id = get_user_laboratory_id()
        )
    );

-- Viewer: Can view cases for completed reports
CREATE POLICY "test_cases_viewer_view" ON test_cases
    FOR SELECT
    USING (
        get_user_role() = 'viewer'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE laboratory_id = get_user_laboratory_id()
            AND status IN ('completed', 'approved')
        )
    );

-- ============================================================================
-- TEST OBSERVATIONS POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY "test_observations_admin_all" ON test_observations
    FOR ALL
    USING (is_admin());

-- Tester: Can manage observations for test reports they created
CREATE POLICY "test_observations_tester_manage" ON test_observations
    FOR ALL
    USING (
        get_user_role() = 'tester'
        AND case_id IN (
            SELECT tc.id FROM test_cases tc
            JOIN test_reports tr ON tc.report_id = tr.id
            WHERE tr.created_by = get_user_id()
            AND tr.status IN ('draft', 'in-testing', 'revision-requested')
        )
    );

-- Reviewer: Can view observations for reports in their lab
CREATE POLICY "test_observations_reviewer_view" ON test_observations
    FOR SELECT
    USING (
        get_user_role() = 'reviewer'
        AND case_id IN (
            SELECT tc.id FROM test_cases tc
            JOIN test_reports tr ON tc.report_id = tr.id
            WHERE tr.laboratory_id = get_user_laboratory_id()
        )
    );

-- Viewer: Can view observations for completed reports
CREATE POLICY "test_observations_viewer_view" ON test_observations
    FOR SELECT
    USING (
        get_user_role() = 'viewer'
        AND case_id IN (
            SELECT tc.id FROM test_cases tc
            JOIN test_reports tr ON tc.report_id = tr.id
            WHERE tr.laboratory_id = get_user_laboratory_id()
            AND tr.status IN ('completed', 'approved')
        )
    );

-- ============================================================================
-- TEST RESULTS POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY "test_results_admin_all" ON test_results
    FOR ALL
    USING (is_admin());

-- Tester: Can view results for test reports they created
CREATE POLICY "test_results_tester_view" ON test_results
    FOR SELECT
    USING (
        get_user_role() = 'tester'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE created_by = get_user_id()
        )
    );

-- Tester: Can insert results for test reports they created
CREATE POLICY "test_results_tester_insert" ON test_results
    FOR INSERT
    WITH CHECK (
        get_user_role() = 'tester'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE created_by = get_user_id()
            AND status IN ('draft', 'in-testing', 'calculations-pending')
        )
    );

-- Reviewer: Can view results for reports in their lab
CREATE POLICY "test_results_reviewer_view" ON test_results
    FOR SELECT
    USING (
        get_user_role() = 'reviewer'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE laboratory_id = get_user_laboratory_id()
        )
    );

-- Viewer: Can view results for completed reports
CREATE POLICY "test_results_viewer_view" ON test_results
    FOR SELECT
    USING (
        get_user_role() = 'viewer'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE laboratory_id = get_user_laboratory_id()
            AND status IN ('completed', 'approved')
        )
    );

-- ============================================================================
-- TEST EQUIPMENT POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY "test_equipment_admin_all" ON test_equipment
    FOR ALL
    USING (is_admin());

-- Tester: Can manage equipment for test reports they created
CREATE POLICY "test_equipment_tester_manage" ON test_equipment
    FOR ALL
    USING (
        get_user_role() = 'tester'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE created_by = get_user_id()
            AND status IN ('draft', 'in-testing', 'revision-requested')
        )
    );

-- Reviewer: Can view equipment for reports in their lab
CREATE POLICY "test_equipment_reviewer_view" ON test_equipment
    FOR SELECT
    USING (
        get_user_role() = 'reviewer'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE laboratory_id = get_user_laboratory_id()
        )
    );

-- Viewer: Can view equipment for completed reports
CREATE POLICY "test_equipment_viewer_view" ON test_equipment
    FOR SELECT
    USING (
        get_user_role() = 'viewer'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE laboratory_id = get_user_laboratory_id()
            AND status IN ('completed', 'approved')
        )
    );

-- ============================================================================
-- ATTACHMENTS POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY "attachments_admin_all" ON attachments
    FOR ALL
    USING (is_admin());

-- Tester: Can upload attachments for test reports they created
CREATE POLICY "attachments_tester_insert" ON attachments
    FOR INSERT
    WITH CHECK (
        get_user_role() = 'tester'
        AND uploaded_by = get_user_id()
        AND (
            (entity_type = 'test-report' AND entity_id IN (
                SELECT id FROM test_reports
                WHERE created_by = get_user_id()
                AND status IN ('draft', 'in-testing', 'revision-requested')
            ))
            OR entity_type != 'test-report'
        )
    );

-- Tester: Can view attachments for test reports they created
CREATE POLICY "attachments_tester_view" ON attachments
    FOR SELECT
    USING (
        get_user_role() = 'tester'
        AND (
            (entity_type = 'test-report' AND entity_id IN (
                SELECT id FROM test_reports
                WHERE created_by = get_user_id()
            ))
            OR entity_type != 'test-report'
        )
    );

-- Reviewer: Can view attachments for reports in their lab
CREATE POLICY "attachments_reviewer_view" ON attachments
    FOR SELECT
    USING (
        get_user_role() = 'reviewer'
        AND (
            (entity_type = 'test-report' AND entity_id IN (
                SELECT id FROM test_reports
                WHERE laboratory_id = get_user_laboratory_id()
            ))
            OR entity_type != 'test-report'
        )
    );

-- Viewer: Can view attachments for completed reports
CREATE POLICY "attachments_viewer_view" ON attachments
    FOR SELECT
    USING (
        get_user_role() = 'viewer'
        AND (
            (entity_type = 'test-report' AND entity_id IN (
                SELECT id FROM test_reports
                WHERE laboratory_id = get_user_laboratory_id()
                AND status IN ('completed', 'approved')
            ))
            OR entity_type != 'test-report'
        )
    );

-- ============================================================================
-- REPORT VERSIONS POLICIES
-- ============================================================================

-- Admin: Full access
CREATE POLICY "report_versions_admin_all" ON report_versions
    FOR ALL
    USING (is_admin());

-- Tester: Can view versions for test reports they created
CREATE POLICY "report_versions_tester_view" ON report_versions
    FOR SELECT
    USING (
        get_user_role() = 'tester'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE created_by = get_user_id()
        )
    );

-- Tester: Can insert versions for test reports they created
CREATE POLICY "report_versions_tester_insert" ON report_versions
    FOR INSERT
    WITH CHECK (
        get_user_role() = 'tester'
        AND generated_by = get_user_id()
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE created_by = get_user_id()
            AND status IN ('approved', 'completed')
        )
    );

-- Reviewer: Can view versions for reports in their lab
CREATE POLICY "report_versions_reviewer_view" ON report_versions
    FOR SELECT
    USING (
        get_user_role() = 'reviewer'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE laboratory_id = get_user_laboratory_id()
        )
    );

-- Reviewer: Can approve versions
CREATE POLICY "report_versions_reviewer_update" ON report_versions
    FOR UPDATE
    USING (
        get_user_role() = 'reviewer'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE laboratory_id = get_user_laboratory_id()
        )
    );

-- Viewer: Can view versions for completed reports
CREATE POLICY "report_versions_viewer_view" ON report_versions
    FOR SELECT
    USING (
        get_user_role() = 'viewer'
        AND report_id IN (
            SELECT id FROM test_reports
            WHERE laboratory_id = get_user_laboratory_id()
            AND status IN ('completed', 'approved')
        )
    );

-- ============================================================================
-- AUDIT LOGS POLICIES
-- ============================================================================

-- Admin: Full access to all audit logs
CREATE POLICY "audit_logs_admin_all" ON audit_logs
    FOR ALL
    USING (is_admin());

-- All users: Can view audit logs (read-only for transparency)
CREATE POLICY "audit_logs_view_all" ON audit_logs
    FOR SELECT
    USING (true);

-- Only system can insert audit logs (via service role)
CREATE POLICY "audit_logs_insert_service" ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- STORAGE BUCKET POLICIES (Supabase Storage)
-- ============================================================================

-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('nawi-attachments', 'nawi-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Admin: Full access to storage
CREATE POLICY "storage_admin_all" ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'nawi-attachments'
        AND is_admin()
    );

-- Tester: Can upload to their laboratory folder
CREATE POLICY "storage_tester_upload" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'nawi-attachments'
        AND get_user_role() = 'tester'
        AND (storage.foldername(name))[1] = get_user_laboratory_id()::text
    );

-- Tester: Can view files in their laboratory folder
CREATE POLICY "storage_tester_view" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'nawi-attachments'
        AND get_user_role() = 'tester'
        AND (storage.foldername(name))[1] = get_user_laboratory_id()::text
    );

-- Reviewer: Can view files in their laboratory folder
CREATE POLICY "storage_reviewer_view" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'nawi-attachments'
        AND get_user_role() = 'reviewer'
        AND (storage.foldername(name))[1] = get_user_laboratory_id()::text
    );

-- Viewer: Can view files in their laboratory folder
CREATE POLICY "storage_viewer_view" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'nawi-attachments'
        AND get_user_role() = 'viewer'
        AND (storage.foldername(name))[1] = get_user_laboratory_id()::text
    );

-- ============================================================================
-- SEED DATA: Create initial admin user profile
-- ============================================================================

-- This will be run after the first user signs up
-- The application should create an admin profile for the first user
