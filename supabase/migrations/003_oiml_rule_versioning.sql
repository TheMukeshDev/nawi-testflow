-- ============================================================================
-- 003: OIML Rule Versioning Lifecycle
-- ============================================================================
--
-- Supports the "future OIML revisions without code changes" contract.
-- New OIML recommendations are published as new rows (standard_version) that
-- the engine picks up automatically as the NEWEST version; legacy revisions
-- can be retired with superseded_by / is_active = false.
--
-- How to add a future OIML revision (e.g. R 76 ed.2 2028):
--   1. Do NOT edit existing DEMO-2026.01 rows. Add a new batch of rows with
--      standard_version = '2028' (or 'DEMO-2028.xx') covering the full rule
--      set: mpe_table (per class), test_point (RPT with max_cv_percent or the
--      canonical limit_key/limit_value/limit_unit trio), environmental.
--   2. Set effective_on = the publication date and supersede the old revision:
--         UPDATE compliance_rules
--            SET superseded_by = (SELECT id FROM compliance_rules
--                                  WHERE standard_version = '2028'
--                                  ORDER BY created_at LIMIT 1),
--                is_active = false
--          WHERE standard_version = 'DEMO-2026.01';
--   3. The engine (client rule-engine.ts + backend tests.py) normalises the
--      standard name and always selects the newest active version; no code
--      changes needed. Any NEW numeric parameter declared via the canonical
--      form  { "limit_key": <param>, "limit_value": <num>, "limit_unit": <u> }
--      is passed through verbatim into the resolver vocabulary.
--      Recognised units: % (cv), g/mg/kg/lb/t (absolute mass), d (scale
--      intervals), e (verification intervals), fraction.
-- ============================================================================

-- Version lifecycle: when a revision takes effect and which revision it
-- replaced (retirement tracking + audit).
ALTER TABLE compliance_rules
    ADD COLUMN IF NOT EXISTS effective_on DATE;

ALTER TABLE compliance_rules
    ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES compliance_rules(id) ON DELETE SET NULL;

ALTER TABLE compliance_rules
    ADD COLUMN IF NOT EXISTS revision_notes TEXT;

-- Version-sorted lookup used by rule loading (newest first).
DROP INDEX IF EXISTS idx_compliance_rules_standard_version;
CREATE INDEX idx_compliance_rules_standard_version
    ON compliance_rules (standard, standard_version DESC);

-- Partial index so "active, newest per standard family" scans stay cheap once
-- many retired revisions accumulate.
CREATE INDEX IF NOT EXISTS idx_compliance_rules_active_version
    ON compliance_rules (standard, standard_version DESC)
    WHERE is_active;

COMMENT ON COLUMN compliance_rules.effective_on IS
    'Date this rule revision takes legal/operational effect. NULL = in force now.';
COMMENT ON COLUMN compliance_rules.superseded_by IS
    'Id of the rule that replaced this row (retired revisions). Keeps audit-historicity.';
COMMENT ON COLUMN compliance_rules.revision_notes IS
    'Free-text notes describing the changes vs the superseded revision.';