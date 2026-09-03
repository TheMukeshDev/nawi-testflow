# NAWI TestFlow — Schema Verification

This document verifies that the database schema supports all required features.

---

## 1. Multiple Instruments

**Requirement:** System must support multiple instruments.

**Schema Support:**
```sql
CREATE TABLE instruments (
    id UUID PRIMARY KEY,
    model_id UUID REFERENCES instrument_models(id),
    serial_number VARCHAR(100),
    laboratory_id UUID REFERENCES laboratories(id),
    ...
);
```

**Verification:** ✅ PASS
- `instruments` table stores multiple instruments
- Each instrument has unique `serial_number` per `laboratory_id`
- `laboratory_id` foreign key links instruments to laboratories
- `model_id` foreign key links instruments to manufacturer models

---

## 2. Multiple Reports per Instrument

**Requirement:** System must support multiple reports per instrument.

**Schema Support:**
```sql
CREATE TABLE test_reports (
    id UUID PRIMARY KEY,
    report_number VARCHAR(50) UNIQUE,
    instrument_id UUID REFERENCES instruments(id),
    ...
);
```

**Verification:** ✅ PASS
- `test_reports` table stores multiple reports
- `instrument_id` foreign key links reports to instruments
- Multiple reports can reference the same `instrument_id`
- Each report has unique `report_number`

---

## 3. Multiple Tests per Report

**Requirement:** System must support multiple tests per report.

**Schema Support:**
```sql
CREATE TABLE test_cases (
    id UUID PRIMARY KEY,
    report_id UUID REFERENCES test_reports(id),
    case_type VARCHAR(50),
    test_point_label VARCHAR(50),
    ...
);
```

**Verification:** ✅ PASS
- `test_cases` table stores multiple test cases per report
- `report_id` foreign key links test cases to reports
- Multiple test cases can reference the same `report_id`
- Each test case has unique `case_type` + `test_point_label` combination

---

## 4. Historical Reports

**Requirement:** System must maintain historical reports.

**Schema Support:**
```sql
CREATE TABLE report_versions (
    id UUID PRIMARY KEY,
    report_id UUID REFERENCES test_reports(id),
    version_number INTEGER,
    file_path VARCHAR(500),
    checksum VARCHAR(64),
    ...
);
```

**Verification:** ✅ PASS
- `report_versions` table stores version history
- `report_id` foreign key links versions to reports
- `version_number` tracks version sequence
- `checksum` ensures tamper detection
- All versions retained for audit trail

---

## 5. Attachments

**Requirement:** System must support attachments.

**Schema Support:**
```sql
CREATE TABLE attachments (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50),
    entity_id UUID,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    category VARCHAR(50),
    ...
);
```

**Verification:** ✅ PASS
- `attachments` table stores file references
- `entity_type` + `entity_id` polymorphic association
- Supports: test-report, instrument, laboratory, equipment, user
- `file_path` references Supabase Storage
- `category` classifies attachment type

---

## 6. Future Rule Versions

**Requirement:** System must support future OIML recommendation updates.

**Schema Support:**
```sql
CREATE TABLE compliance_rules (
    id UUID PRIMARY KEY,
    standard VARCHAR(50),
    standard_version VARCHAR(50),
    rule_type VARCHAR(50),
    rule_data JSONB,
    is_active BOOLEAN,
    ...
);
```

**Verification:** ✅ PASS
- `compliance_rules` table stores configurable rules
- `standard` + `standard_version` supports multiple OIML versions
- `rule_data` JSONB allows flexible rule structures
- `is_active` flag enables version control
- New rules can be added without schema changes
- Old rules retained for historical reports

---

## 7. Auditability

**Requirement:** System must be auditable.

**Schema Support:**
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ,
    user_id UUID REFERENCES profiles(id),
    action VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    changes JSONB,
    ...
);
```

**Verification:** ✅ PASS
- `audit_logs` table records all actions
- `user_id` tracks who performed action
- `action` categorizes the action type
- `entity_type` + `entity_id` identifies affected record
- `changes` JSONB stores field-level changes
- `timestamp` records when action occurred
- All tables have `created_at` and `updated_at` timestamps
- Most tables have `created_by` and `updated_by` foreign keys

---

## Additional Schema Features

### Foreign Keys

| Table | Foreign Key | References |
|-------|-------------|------------|
| profiles | laboratory_id | laboratories(id) |
| instruments | model_id | instrument_models(id) |
| instruments | laboratory_id | laboratories(id) |
| instrument_models | manufacturer_id | manufacturers(id) |
| test_reports | instrument_id | instruments(id) |
| test_reports | laboratory_id | laboratories(id) |
| test_reports | assigned_technician_id | profiles(id) |
| test_reports | assigned_reviewer_id | profiles(id) |
| test_conditions | report_id | test_reports(id) |
| test_cases | report_id | test_reports(id) |
| test_observations | case_id | test_cases(id) |
| test_results | report_id | test_reports(id) |
| test_results | case_id | test_cases(id) |
| test_equipment | report_id | test_reports(id) |
| attachments | uploaded_by | profiles(id) |
| report_versions | report_id | test_reports(id) |
| report_versions | generated_by | profiles(id) |
| report_versions | approved_by | profiles(id) |
| audit_logs | user_id | profiles(id) |

### Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| profiles | auth_user_id | Auth lookup |
| profiles | laboratory_id | Lab filtering |
| instruments | model_id | Model lookup |
| instruments | laboratory_id | Lab filtering |
| instruments | serial_number | Search |
| test_reports | report_number | Search |
| test_reports | instrument_id | Instrument history |
| test_reports | status | Workflow filtering |
| test_cases | report_id | Report details |
| test_observations | case_id | Case details |
| test_results | report_id | Report results |
| attachments | entity_type, entity_id | Polymorphic lookup |
| audit_logs | timestamp | Time-based queries |
| audit_logs | entity_type, entity_id | Entity history |

### Constraints

| Table | Constraint | Purpose |
|-------|------------|---------|
| profiles | role CHECK | Valid roles only |
| laboratories | code UNIQUE | Unique lab codes |
| instrument_models | instrument_class CHECK | Valid classes |
| instrument_models | capacity_unit CHECK | Valid units |
| instruments | serial_number, laboratory_id UNIQUE | Unique per lab |
| test_reports | status CHECK | Valid statuses |
| test_reports | compliance_result CHECK | Valid verdicts |
| test_cases | case_type CHECK | Valid test types |
| test_observations | case_id, observation_number UNIQUE | Unique observations |
| test_results | report_id, case_id UNIQUE | One result per case |
| report_versions | file_format CHECK | Valid formats |
| audit_logs | action CHECK | Valid actions |
| audit_logs | entity_type CHECK | Valid entity types |

### Timestamps

All tables include:
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (via trigger)

### Audit Fields

Most tables include:
- `created_by UUID REFERENCES profiles(id)`
- `updated_by UUID REFERENCES profiles(id)`

---

## Conclusion

The database schema fully supports all required features:

| Requirement | Supported | Table(s) |
|-------------|-----------|----------|
| Multiple instruments | ✅ | instruments |
| Multiple reports per instrument | ✅ | test_reports |
| Multiple tests per report | ✅ | test_cases |
| Historical reports | ✅ | report_versions |
| Attachments | ✅ | attachments |
| Future rule versions | ✅ | compliance_rules |
| Auditability | ✅ | audit_logs + triggers |

The schema is normalized, properly constrained, and indexed for performance.
