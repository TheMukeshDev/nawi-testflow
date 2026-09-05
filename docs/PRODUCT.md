# NAWI Sahayak — Product Planning Document

**Project:** Smart India Hackathon 2026 — Problem Statement 26035
**Standard:** OIML Recommendation R-76 — Non-Automatic Weighing Instruments
**Version:** 1.0 (MVP Planning)
**Status:** Draft

---

## 1. Product Vision

### 1.1 What We Are Building

NAWI Sahayak is a laboratory software application that digitizes the complete lifecycle of Non-Automatic Weighing Instrument (NAWI) testing and certification. It replaces paper-based test records, manual calculations, and physical report filing with a structured digital workflow — from instrument registration through test execution, compliance evaluation, and standardized report generation.

### 1.2 Who Uses It

| Role | Primary Activity | Frequency |
|------|-----------------|-----------|
| **Technician** | Enters instrument data, records observations, attaches photos | Daily |
| **Reviewer / Lab Manager** | Reviews test data, approves or requests revisions, signs off on reports | Daily |
| **Administrator** | Manages users, laboratories, equipment registry | Weekly |
| **Auditor** | Reviews audit trail, searches historical records | Monthly |

### 1.3 Why It Exists

Laboratory testing for NAWI compliance under OIML R-76 currently involves:
- Manual entry of instrument specifications and observation data on paper forms
- Manual calculations of permissible errors, means, and standard deviations
- Risk of arithmetic errors in compliance determinations
- Difficulty retrieving historical test records
- Physical storage of reports with no search capability
- No standardized report format across laboratories

NAWI Sahayak eliminates these problems by providing a single system that captures structured data, performs calculations automatically, enforces compliance rules, and generates standardized reports — all with a complete audit trail.

### 1.4 What We Are NOT Building

- A general-purpose laboratory information management system (LIMS)
- An instrument management or asset tracking system (primary purpose)
- A customer portal or client-facing interface
- A billing or invoicing system
- An IoT sensor integration platform
- A cloud-hosted SaaS multi-tenant product (MVP is single-deployment)

---

## 2. Core User Journeys

### 2.1 Journey A: First-Time Setup (Administrator)

**Trigger:** System is deployed for the first time.
**Goal:** Laboratory and equipment data configured so testing can begin.

```
Admin logs in
  → Creates laboratory record (name, code, accreditation info)
  → Registers instruments (manufacturer, model, specifications)
  → Registers calibration weights and test equipment
  → Adds technician and reviewer user accounts
  → System is ready for test creation
```

### 2.2 Journey B: Complete Test Lifecycle (Technician → Reviewer)

**Trigger:** An instrument arrives at the laboratory for verification.
**Goal:** Test record created, observations entered, report generated.

```
Technician:
  → Creates new test record
  → Selects instrument (from registered instruments)
  → Selects verification type (initial / subsequent / type-approval)
  → Records environmental conditions (temperature, humidity)
  → Records observations:
      → Repeatability test (multiple load cycles)
      → Eccentricity test (off-center loading)
      → Other applicable tests per R-76
  → System calculates:
      → Mean, standard deviation for each test point
      → Maximum permissible error (MPE) per instrument class
      → Error at each test point
      → Pass/fail verdict per test point
      → Overall compliance verdict
  → System validates:
      → Required fields are complete
      → Observation counts meet minimum requirements
      → Environmental conditions are within acceptable range
      → Calculated values are consistent
  → Attaches supporting documents (photos, certificates)
  → Submits test for review

Reviewer:
  → Reviews test record and all observations
  → Reviews calculated results and compliance verdict
  → Approves → Test moves to "Completed"
  → Rejects → Test returns to technician with comments
  → Approved test can generate report
```

### 2.3 Journey C: Report Generation

**Trigger:** Test is approved and complete.
**Goal:** Standardized digital report generated in PDF format.

```
Technician or Reviewer:
  → Navigates to completed test
  → Clicks "Generate Report"
  → System produces standardized report containing:
      → Laboratory identification and accreditation
      → Manufacturer and instrument details
      → Test standard and conditions
      → All observation data
      → All calculated results
      → Compliance verdict
      → Technician and reviewer signatures (digital or printed)
  → Report available as PDF
  → Report stored in repository
  → Report number assigned (RPT-YYYY-NNNNNN)
```

### 2.4 Journey D: Search and Retrieval

**Trigger:** Any user needs to find a past test, instrument, or report.
**Goal:** Record located and displayed.

```
User:
  → Uses global search (by test number, instrument serial, report number)
  → OR navigates to Repository section
  → Applies filters (date range, laboratory, status, instrument class)
  → Views matching records
  → Opens specific record for full details
```

### 2.5 Journey E: Instrument History

**Trigger:** User needs to see all tests performed on a specific instrument.
**Goal:** Complete test history for one instrument displayed.

```
User:
  → Navigates to Instruments section
  → Selects specific instrument
  → Views instrument details and specifications
  → Views chronological list of all tests performed
  → Can open any individual test record from the history
```

---

## 3. Functional Modules

### Module 1: Instrument Management

| Function | Description | PS Req? |
|----------|-------------|---------|
| Register instrument | Capture manufacturer, model, serial number, specifications | Yes |
| Capture manufacturer details | Name, country, contact information | Yes |
| Capture instrument specifications | Class, capacity, scale division, verification scale divisions, device type, power supply, operating temperature range | Yes |
| Instrument search | Find instruments by serial number, model, manufacturer | Yes |
| Instrument history | View all tests performed on an instrument | Yes |
| Instrument status | Track condition (good / needs repair / out of service) | Our decision |

### Module 2: Laboratory & Equipment Management

| Function | Description | PS Req? |
|----------|-------------|---------|
| Register laboratory | Name, code, address, accreditation details | Yes |
| Record laboratory conditions | Environmental conditions during testing (temperature, humidity, air pressure) | Yes |
| Register equipment | Calibration weights, standard weights, accessories | Our decision |
| Equipment calibration tracking | Calibration dates, validity periods | Our decision |

### Module 3: Test Record Management

| Function | Description | PS Req? |
|----------|-------------|---------|
| Create test record | Select instrument, verification type, assign technician | Yes |
| Enter observations | Record measured values for each test procedure | Yes |
| Record environmental conditions | Temperature, humidity at time of testing | Yes |
| Attach photographs and documents | Photos of instrument, certificates, supporting files | Yes |
| Test status workflow | Draft → In Testing → Observations → Calculations → Review → Complete | Our decision |
| Validation of entered data | Ensure required fields present, values within expected ranges | Yes |

### Module 4: Calculations Engine

| Function | Description | PS Req? |
|----------|-------------|---------|
| Calculate permissible errors | Max permissible error (MPE) per OIML R-76 table | Yes |
| Calculate statistical values | Mean, standard deviation, deviation from reference | Yes |
| Determine pass/fail per test point | Compare observed error against MPE | Yes |
| Determine overall compliance | Aggregate test point verdicts into overall result | Yes |
| Automatic recalculation | Update results when observations are modified | Our decision |
| Calculation audit trail | Show what values produced what results | Our decision |

### Module 5: Compliance Evaluation

| Function | Description | PS Req? |
|----------|-------------|---------|
| Determine compliance | Compliant / Non-compliant / Conditional verdict | Yes |
| Configurable OIML R-76 rules | MPE tables, test point requirements by instrument class | Yes |
| Reviewer decision | Approve, reject, or request revision with comments | Our decision |

### Module 6: Report Generation

| Function | Description | PS Req? |
|----------|-------------|---------|
| Generate standardized report | Digital report per OIML R-76 format | Yes |
| PDF export | Downloadable PDF report | Yes |
| Editable report export | Editable format (XLSX or DOCX) | Yes |
| Report repository | Store and retrieve generated reports | Yes |
| Report numbering | Automatic sequential report numbers | Our decision |
| Digital signatures | Optional digital signatures on reports | Yes |

### Module 7: Search, Retrieval & Repository

| Function | Description | PS Req? |
|----------|-------------|---------|
| Search all records | Global search across tests, instruments, reports | Yes |
| Completed test report repository | Browse and access all generated reports | Yes |
| Filter and sort | Filter by date, laboratory, status, instrument class | Our decision |

### Module 8: Security & Access Control

| Function | Description | PS Req? |
|----------|-------------|---------|
| Secure user access | Login, authentication | Yes |
| Role-based permissions | Different access levels for different roles | Yes |
| Audit trail | Record of all actions performed in the system | Our decision |

### Module 9: Technical Documentation

| Function | Description | PS Req? |
|----------|-------------|---------|
| System documentation | Technical documentation of the application | Yes |

---

## 4. Non-Functional Requirements

### 4.1 Functional Correctness (Our Decision)

- **Calculation accuracy:** All permissible error calculations must produce results consistent with published OIML R-76 tables. Calculation results must be verifiable by hand.
- **Validation completeness:** No test record can be submitted for review with missing mandatory observations.
- **Compliance determinations:** The system's pass/fail verdict must match what a qualified technician would determine manually using the same data.

### 4.2 Reliability (Our Decision)

- **Data integrity:** Test records, once submitted, cannot be silently modified. All changes must create audit entries.
- **Report integrity:** Generated reports must include a checksum for tamper detection.
- **Offline resilience:** If the network connection drops during data entry, locally entered data must be preserved.

### 4.3 Usability (Our Decision)

- **Desktop-first:** Primary interface designed for desktop/laptop screens (1280px+). Functional on tablets (768px+). Not designed for mobile phones.
- **Data density:** Interface optimized for information-dense laboratory use, not consumer-app aesthetics.
- **Keyboard navigation:** All critical actions accessible via keyboard. Form tab order follows logical data entry sequence.
- **Minimal training:** A technician familiar with OIML R-76 test procedures should be able to use the system with less than 2 hours of orientation.

### 4.4 Performance (Our Decision)

- **Page load:** Primary pages render within 2 seconds on a local network.
- **Search:** Results returned within 1 second for repositories up to 10,000 records.
- **Report generation:** PDF generated within 5 seconds for a standard test report.
- **Concurrent users:** Support 20 concurrent users without degradation (single laboratory deployment).

### 4.5 Security (Our Decision)

- **Authentication:** Session-based authentication with role verification on every request.
- **Authorization:** Role-based access control (RBAC) enforced at both UI and API levels.
- **Audit logging:** Every create, update, delete, submit, approve, reject, and export action is logged with user, timestamp, and IP address.
- **No public access:** System is deployed on an internal network or VPN, not exposed to the public internet.

### 4.6 Maintainability (Our Decision)

- **Standard updates:** OIML R-76 rules (MPE tables, test point definitions, instrument class parameters) are stored as configuration data, not hardcoded. Updating a standard version requires updating configuration, not rewriting code.
- **Code architecture:** Clean separation between domain logic (calculations, compliance rules), data layer (persistence), and presentation (UI components).
- **No vendor lock-in:** Built on open-source frameworks (Next.js, React, Tailwind CSS). No proprietary runtime dependencies.

### 4.7 Portability (Our Decision)

- **Deployment:** Can be deployed as a Docker container on any Linux server, or run locally on a Windows/Mac workstation during development and demonstrations.
- **Database:** PostgreSQL for production. SQLite for development and demo mode.

---

## 5. MVP Scope

The MVP includes everything required to demonstrate a complete test lifecycle — from instrument registration through report generation — for a single laboratory deployment.

### 5.1 MVP Features (Included)

| Module | Feature | Priority |
|--------|---------|----------|
| **Setup** | Register laboratories | P0 |
| **Setup** | Register instruments with manufacturer details and specifications | P0 |
| **Setup** | Register calibration weights and test equipment | P1 |
| **Setup** | Create user accounts with roles | P0 |
| **Test** | Create new test record (select instrument, verification type) | P0 |
| **Test** | Record environmental conditions | P0 |
| **Test** | Enter repeatability observations (multiple load cycles) | P0 |
| **Test** | Enter eccentricity observations (off-center loading) | P0 |
| **Test** | Enter additional observation types as needed | P1 |
| **Test** | Attach photographs and documents | P1 |
| **Calculations** | Calculate mean and standard deviation | P0 |
| **Calculations** | Calculate maximum permissible error (MPE) | P0 |
| **Calculations** | Determine pass/fail per observation | P0 |
| **Calculations** | Determine overall compliance verdict | P0 |
| **Validation** | Required field validation | P0 |
| **Validation** | Observation count validation | P0 |
| **Validation** | Environmental condition warnings | P1 |
| **Review** | Submit test for review | P0 |
| **Review** | Approve / reject with comments | P0 |
| **Report** | Generate PDF report | P0 |
| **Report** | Generate editable (XLSX) report | P1 |
| **Report** | Store reports in repository | P0 |
| **Report** | Optional digital signature placeholder | P1 |
| **Search** | Global search by test number, serial number | P0 |
| **Search** | Repository with filters | P0 |
| **History** | Instrument-wise test history | P0 |
| **Security** | Login / logout | P0 |
| **Security** | Role-based access (4 roles: Admin, Lab Manager, Technician, Reviewer) | P0 |
| **Audit** | Audit log of all significant actions | P1 |
| **Dashboard** | Summary metrics (tests in progress, pending review, completed) | P1 |

### 5.2 MVP Exclusions (Deferred)

| Feature | Reason for Deferral |
|---------|-------------------|
| Multi-laboratory deployment | MVP is single-laboratory |
| Customer/client portal | No PS requirement for external users |
| Automated instrument data capture (serial port / IoT) | Not required by PS |
| Mobile phone interface | Desktop-first decision |
| Offline mode | Complex, not required for demo |
| Multi-language support | English only for MVP |
| Integration with external accreditation systems | No PS requirement |
| Bulk import / export | Not critical for MVP |
| Custom report templates | Standardized report only |
| Statistical process control charts | Not required by PS |

---

## 6. Future Scope

Features beyond MVP that are natural extensions, ordered by likely priority.

### 6.1 Near-Term (Post-MVP)

| Feature | Rationale |
|---------|-----------|
| Multi-laboratory support | Deploy across multiple lab sites with shared data |
| Additional observation types | Discrimination, stability, temperature effect tests |
| Batch test creation | Create multiple tests for an instrument simultaneously |
| Instrument calibration scheduling | Track calibration due dates and send reminders |
| Email notifications | Notify reviewers when tests are submitted, technicians when tests are approved/rejected |
| XLSX report customization | Allow laboratories to customize report headers and footers |

### 6.2 Medium-Term

| Feature | Rationale |
|---------|-----------|
| OIML R-76 edition management | Support multiple editions of the standard (2009, future revisions) |
| Additional OIML standards | Extend to R107, R111, or other weighing instrument standards |
| Automated MPE table configuration | Admin UI to upload/update MPE tables per standard edition |
| Digital signature integration | Actual cryptographic signatures (not just placeholders) |
| Barcode/QR code on reports | Scannable codes linking to digital records |
| Data export API | Allow external systems to query test results |

### 6.3 Long-Term

| Feature | Rationale |
|---------|-----------|
| Instrument data import from balances | RS-232/USB data capture from electronic instruments |
| Statistical process control | Trend charts for instrument performance over time |
| Multi-standard compliance | Test against multiple standards simultaneously |
| Accreditation body integration | Direct submission of reports to accreditation portals |
| White-label deployment | Allow laboratories to brand the application |

---

## 7. Feature Classification

Every feature is classified as either a **Problem Statement (PS) Requirement** — explicitly stated in the hackathon problem statement — or an **Implementation Decision** — a design/UX/workflow choice we made to satisfy the PS requirements.

### Legend

| Tag | Meaning |
|-----|---------|
| **PS** | Directly stated in the problem statement requirements |
| **Decision** | Our implementation choice to satisfy or enhance a PS requirement |
| **PS + Decision** | PS requirement where we chose a specific approach |

---

### 7.1 Complete Feature Classification

#### Instrument & Manufacturer Data

| Feature | Classification | Notes |
|---------|---------------|-------|
| Capture manufacturer details | **PS** | "Capture manufacturer details" — verbatim from PS |
| Capture instrument specifications | **PS** | "Capture instrument specifications and technical parameters" — verbatim from PS |
| Instrument search and listing | **Decision** | PS requires data capture; we chose to add search/listing for usability |
| Instrument status tracking (good/needs-repair/out-of-service) | **Decision** | Not in PS; useful for lab operations |
| Instrument history (all tests for one instrument) | **PS** | "Instrument-wise history" — stated in PS |
| Equipment registration (weights, accessories) | **Decision** | PS mentions environmental conditions and observations but not equipment registry; we added this because test procedures require calibrated weights |

#### Laboratory & Environmental Conditions

| Feature | Classification | Notes |
|---------|---------------|-------|
| Record laboratory information | **PS** | "Record laboratory and environmental conditions" — implied by "laboratory conditions" |
| Record environmental conditions (temp, humidity) | **PS** | "Record laboratory and environmental conditions" — verbatim from PS |
| Condition status indicators (in-range/out-of-range) | **Decision** | PS requires recording conditions; we chose to add range validation visual indicators |
| Air pressure recording | **Decision** | PS mentions environmental conditions generally; air pressure is sometimes relevant but not always required |

#### Test Record Management

| Feature | Classification | Notes |
|---------|---------------|-------|
| Enter observations from OIML R-76 test procedures | **PS** | "Enter observations from OIML R76 test procedures" — verbatim from PS |
| Validate entered test data | **PS** | "Validate entered test data" — verbatim from PS |
| Test status workflow (draft → review → complete) | **Decision** | PS requires validation but does not specify a workflow; we chose a multi-stage workflow to match laboratory practice |
| Revision-requested state | **Decision** | Allows reviewer feedback loop; not in PS but essential for real use |
| Test numbering (TST-YYYY-NNNNNN) | **Decision** | Systematic numbering for traceability |
| Attach photographs and supporting documents | **PS** | "Attach photographs and supporting documents" — verbatim from PS |

#### Calculations

| Feature | Classification | Notes |
|---------|---------------|-------|
| Automatically calculate permissible errors | **PS** | "Automatically calculate permissible errors and related calculations" — verbatim from PS |
| Calculate mean and standard deviation | **PS** | Part of "related calculations" in PS |
| Determine pass/fail based on configured requirements | **PS** | "Determine compliance/pass/fail based on configured OIML R76 requirements" — verbatim from PS |
| Real-time recalculation when observations change | **Decision** | PS requires calculation; we chose to auto-recalculate on every edit for immediate feedback |
| Calculation audit trail (showing how values were derived) | **Decision** | Not in PS; important for reviewer confidence |

#### Compliance Evaluation

| Feature | Classification | Notes |
|---------|---------------|-------|
| Compliant / Non-compliant / Conditional verdicts | **PS** | Part of "determine compliance/pass/fail" — we chose three verdict levels rather than binary |
| Configurable OIML R-76 rules | **PS** | "Based on configured OIML R-76 requirements" — implies configurability |
| Per-test-point verdicts (not just overall) | **Decision** | PS says "compliance/pass/fail"; we chose to show verdicts at both test-point and overall levels |

#### Report Generation

| Feature | Classification | Notes |
|---------|---------------|-------|
| Generate standardized digital test reports | **PS** | "Generate standardized digital test reports" — verbatim from PS |
| PDF export | **PS** | "PDF and editable report export" — stated in PS |
| Editable report export | **PS** | "PDF and editable report export" — stated in PS |
| Report repository | **PS** | "Maintain completed test report repository" — verbatim from PS |
| Digital signatures (optional) | **PS** | "Optional digital signatures" — stated in PS |
| Report numbering | **Decision** | Systematic numbering for traceability |
| Report version tracking | **Decision** | When reports are regenerated, track versions |
| Report checksum for tamper detection | **Decision** | Enhances report integrity beyond PS requirement |

#### Search & Retrieval

| Feature | Classification | Notes |
|---------|---------------|-------|
| Search and retrieval | **PS** | "Search and retrieval" — verbatim from PS |
| Global search across record types | **Decision** | PS says "search and retrieval"; we chose a single global search spanning all entities |
| Repository with filters and sorting | **Decision** | Enhances retrieval beyond basic search |

#### Security & Access

| Feature | Classification | Notes |
|---------|---------------|-------|
| Secure user access | **PS** | "Secure user access with role-based permissions" — verbatim from PS |
| Role-based permissions | **PS** | "Secure user access with role-based permissions" — verbatim from PS |
| Four roles (Admin, Lab Manager, Technician, Reviewer) | **Decision** | PS requires RBAC; we chose four roles based on laboratory workflow analysis |
| Session-based authentication | **Decision** | PS requires security; we chose session-based auth as implementation approach |
| Audit logging | **Decision** | Not explicitly in PS but implied by "secure access"; standard laboratory practice |

#### Dashboard

| Feature | Classification | Notes |
|---------|---------------|-------|
| Dashboard | **PS** | "Dashboard" — stated in PS |
| Summary metrics (tests in progress, pending, completed) | **Decision** | PS requires a dashboard; we chose to populate it with workflow-relevant metrics |
| Pending action queue | **Decision** | Shows items requiring the logged-in user's attention |

#### Documentation & Extensibility

| Feature | Classification | Notes |
|---------|---------------|-------|
| Technical documentation | **PS** | "Technical documentation" — stated in PS |
| Support future OIML recommendation updates | **PS** | "Support future OIML recommendation updates" — verbatim from PS |
| Configuration-driven standard rules | **Decision** | PS requires future update support; we chose to store rules as configuration data, not hardcoded logic |

---

### 7.2 Summary Counts

| Category | Count |
|----------|-------|
| PS Requirements (verbatim or near-verbatim) | 18 |
| Implementation Decisions (our choices) | 27 |
| **Total features in MVP scope** | **45** |

---

## Appendix A: Problem Statement Text (Reference)

For traceability, here is the complete list of requirements extracted from Problem Statement 26035:

1. Capture manufacturer details
2. Capture instrument specifications and technical parameters
3. Record laboratory and environmental conditions
4. Enter observations from OIML R76 test procedures
5. Automatically calculate permissible errors and related calculations
6. Validate entered test data
7. Determine compliance/pass/fail based on configured OIML R76 requirements
8. Generate standardized digital test reports
9. Maintain completed test report repository
10. Secure user access with role-based permissions
11. Support future OIML recommendation updates
12. PDF and editable report export
13. Instrument-wise history
14. Dashboard
15. Search and retrieval
16. Attach photographs and supporting documents
17. Optional digital signatures
18. Technical documentation

---

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **NAWI** | Non-Automatic Weighing Instrument — a weighing instrument that requires the intervention of an operator for weighing |
| **OIML** | Organisation Internationale de Métrologie Légale — International Organization of Legal Metrology |
| **R-76** | OIML Recommendation R-76 — the specific standard for NAWI testing |
| **MPE** | Maximum Permissible Error — the largest allowable difference between the indicated value and the true value |
| **Scale division (d)** | The smallest increment on the instrument's display |
| **Verification scale divisions (n)** | Number of scale divisions used during verification testing |
| **Initial verification** | First-time testing of a new instrument |
| **Subsequent verification** | Re-testing of an instrument after its initial verification period |
| **Type approval** | Testing of an instrument design/model for compliance before it can be manufactured and sold |
| **Repeatability** | Closeness of agreement between successive measurements under the same conditions |
| **Eccentricity** | Effect of off-center loading on the weighing result |
