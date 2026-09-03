# NAWI TestFlow — Role Definitions

## ⚠️ Important Disclaimer

**The roles defined below are proposed application roles for our implementation.**
**They are NOT specified by the Smart India Hackathon Problem Statement 26035.**

The problem statement requires:
> "Secure user access with role-based permissions"

It does NOT prescribe specific role names, responsibilities, or permission structures.
We have designed these roles based on typical laboratory workflows for NAWI testing.

---

## Proposed Roles

### 1. ADMIN

**Purpose:** System and laboratory administration.

**Responsibilities:**
- Manage user accounts (create, update, deactivate)
- Manage laboratory configuration
- Manage system configuration and compliance rules
- View all records across the system
- Access audit logs
- No direct involvement in testing workflow

**Typical User:** System administrator, laboratory director.

---

### 2. TESTER

**Purpose:** Execute tests and record observations.

**Responsibilities:**
- Create new test reports
- Enter instrument information
- Record environmental conditions
- Enter test observations (measured values)
- Upload evidence (photos, certificates)
- Run calculations on observations
- Submit test reports for review
- View own test reports

**Cannot:**
- Approve or reject reports
- Manage users
- Modify compliance rules

**Typical User:** Laboratory technician, testing officer.

---

### 3. REVIEWER

**Purpose:** Review and approve test reports.

**Responsibilities:**
- Review test results and observations
- Verify calculation accuracy
- Approve compliant reports
- Reject non-compliant reports with comments
- Request revisions from testers
- View all test reports in their laboratory
- Generate final reports

**Cannot:**
- Create test reports
- Enter observations
- Manage users
- Modify compliance rules

**Typical User:** Quality manager, senior testing officer, laboratory manager.

---

### 4. VIEWER

**Purpose:** Read-only access to finalized reports.

**Responsibilities:**
- View finalized (completed) test reports
- Search and retrieve reports
- Download generated reports
- View instrument history
- Read-only access to laboratory information

**Cannot:**
- Create or modify any records
- Enter observations
- Approve or reject reports
- Manage users

**Typical User:** External auditor, client representative, management.

---

## Role Hierarchy

```
ADMIN (highest)
  ↓
TESTER / REVIEWER (equal, different responsibilities)
  ↓
VIEWER (lowest)
```

**Key Separation:**
- TESTER creates content, REVIEWER approves it
- No single person can both create AND approve a report
- This enforces separation of duties required by laboratory accreditation

---

## Permission Matrix

| Action | ADMIN | TESTER | REVIEWER | VIEWER |
|--------|-------|--------|----------|--------|
| **Users** | | | | |
| Create user | ✅ | ❌ | ❌ | ❌ |
| Update user | ✅ | ❌ | ❌ | ❌ |
| Deactivate user | ✅ | ❌ | ❌ | ❌ |
| **Laboratory** | | | | |
| Manage lab config | ✅ | ❌ | ❌ | ❌ |
| View lab info | ✅ | ✅ | ✅ | ✅ |
| **Instruments** | | | | |
| Register instrument | ✅ | ✅ | ❌ | ❌ |
| Update instrument | ✅ | ✅ | ❌ | ❌ |
| View instruments | ✅ | ✅ | ✅ | ✅ |
| **Test Reports** | | | | |
| Create test report | ❌ | ✅ | ❌ | ❌ |
| Enter observations | ❌ | ✅ | ❌ | ❌ |
| Upload evidence | ❌ | ✅ | ❌ | ❌ |
| Run calculations | ❌ | ✅ | ❌ | ❌ |
| Submit for review | ❌ | ✅ | ❌ | ❌ |
| View draft reports | ✅ | ✅ | ❌ | ❌ |
| View pending reports | ✅ | ❌ | ✅ | ❌ |
| Review test report | ❌ | ❌ | ✅ | ❌ |
| Approve report | ❌ | ❌ | ✅ | ❌ |
| Reject report | ❌ | ❌ | ✅ | ❌ |
| View completed reports | ✅ | ✅ | ✅ | ✅ |
| **Reports** | | | | |
| Generate report | ✅ | ✅ | ✅ | ❌ |
| Download report | ✅ | ✅ | ✅ | ✅ |
| **System** | | | | |
| View audit logs | ✅ | ❌ | ❌ | ❌ |
| Manage compliance rules | ✅ | ❌ | ❌ | ❌ |
| System configuration | ✅ | ❌ | ❌ | ❌ |

---

## Implementation Notes

1. **Backend Authorization:** All permission checks happen in the API layer.
   Frontend route hiding is for UX only, NOT security.

2. **Database Row-Level Security (RLS):** Supabase RLS policies enforce
   permissions at the database level, even if API bypass is attempted.

3. **Separation of Duties:** The same user cannot be both assigned_technician_id
   and assigned_reviewer_id on the same test report.

4. **Audit Trail:** All permission-denied attempts are logged for security review.
