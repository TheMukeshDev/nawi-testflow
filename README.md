# NAWI Test Report Management System

**Smart India Hackathon 2026 — Problem Statement 26035**

Development of a Software Program/Application for Generation of Test Reports for Non-Automatic Weighing Instruments (NAWI) as per OIML Recommendation R-76.

---

## About

NAWI TestFlow is a digital platform for recording Non-Automatic Weighing Instrument test observations, performing configured OIML R-76-based calculations and compliance evaluation, and generating standardized test reports.

The application replaces manual paper-based test report generation with a structured digital workflow covering instrument registration, test observation entry, automated calculation, compliance evaluation, report generation, and archival.

## Problem Statement

Laboratories performing verification of Non-Automatic Weighing Instruments currently rely on manual processes for:

- Recording instrument specifications
- Entering test observations
- Performing calculations
- Evaluating compliance against OIML R-76 requirements
- Generating test reports
- Maintaining report archives

This leads to inconsistent report formats, manual calculation errors, difficulty in retrieving historical records, and lack of standardized compliance evaluation.

## Solution

NAWI TestFlow provides a structured digital workflow:

```
Instrument Data
      ↓
Test Observations
      ↓
Validation
      ↓
Calculation
      ↓
Compliance Evaluation
      ↓
Review
      ↓
Test Report
      ↓
Repository
```

## Key Features

- **Instrument Management** — Register and track weighing instruments with full technical specifications
- **Test Workflow** — Multi-step wizard for creating test reports with structured observation entry
- **Automated Calculations** — Deterministic calculation engine for mean, standard deviation, and OIML R-76-derived values
- **Input Validation** — Multi-layer validation catching missing values, range errors, and impossible readings
- **Compliance Evaluation** — Versioned rule engine evaluating PASS/FAIL against configured OIML R-76 rules
- **Report Generation** — Professional PDF and editable DOCX test reports
- **Report Repository** — Searchable archive with instrument-wise history
- **Role-Based Access** — Four distinct roles with different permissions
- **Audit Trail** — Complete activity logging for all significant actions
- **Equipment Management** — Track calibration weights and test equipment with expiry warnings
- **Laboratory Management** — Record laboratory information and accreditation details
- **Attachments** — Upload photographs, calibration certificates, and supporting documents

## User Roles

> **Note:** These are proposed application roles for the MVP. They are not prescribed by the SIH problem statement.

### Administrator

- Manage users and role assignments
- Manage laboratories and system configuration
- View all records and audit logs
- Control demo data

### Tester

- Create test reports
- Enter instrument information
- Enter test observations
- Record laboratory conditions and equipment
- Upload evidence and supporting documents
- Run calculations and submit for review

### Reviewer

- Review submitted test reports
- Verify observations and calculations
- Review compliance results
- Approve or reject reports with comments

### Viewer

- Search and view permitted finalized reports
- View instrument history
- Download finalized reports
- Read-only access

## Workflow

```
1. Login
2. Dashboard (role-based)
3. Create New Test Report
4. Enter Instrument Details
5. Record Laboratory Conditions
6. Select Test Equipment
7. Choose Applicable Tests (RPT, ECC, LIN, DIS, STB)
8. Enter Observations
9. Validate Data
10. Calculate Results
11. Evaluate Compliance
12. Submit for Review
13. Reviewer Approves/Rejects
14. Generate Report (PDF/DOCX)
15. Finalize and Archive
```

### Report Status Flow

```
DRAFT → IN_TESTING → PENDING_REVIEW → APPROVED → FINAL
                                    ↘ REJECTED → IN_TESTING
```

## Documentation

Complete documentation is available within the application:

- **[Documentation Center](/documentation)** — Documentation landing page
- **[Technical Architecture](/documentation/technical-architecture)** — System design, database schema, API design, engines, security, deployment
- **[User Guide](/documentation/user-guide)** — Step-by-step instructions for Tester, Reviewer, Administrator, and Viewer roles
- **[OIML R-76 Reference](/documentation/oiml-r76-reference)** — Test procedures, calculations, compliance rules, and rule versioning

The documentation includes searchable content, sidebar navigation, and is responsive across devices.

## Technical Architecture

### Frontend

- **Framework:** Next.js 15 (React)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Context + Hooks

### Backend

- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL / Supabase
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage

### Engines

- **Calculation Engine** — Deterministic numeric calculations with unit awareness
- **Compliance Engine** — Versioned rule evaluation with PASS/FAIL determination
- **Report Engine** — PDF generation (ReportLab) and DOCX generation (python-docx)
- **AI Assistance** — Optional LLM-based explanations (never determines compliance)

## Project Structure

```
nawi-testflow/
├── src/                          # Next.js frontend
│   ├── app/                      # Next.js App Router pages
│   │   ├── page.tsx              # Landing page
│   │   ├── login/                # Login page
│   │   ├── about/                # About page
│   │   ├── admin/                # Admin dashboards
│   │   ├── tester/               # Tester dashboard
│   │   ├── reviewer/             # Reviewer dashboard
│   │   ├── viewer/               # Viewer dashboard
│   │   ├── tests/                # Test management
│   │   ├── instruments/          # Instrument management
│   │   ├── laboratories/         # Laboratory management
│   │   ├── equipment/            # Equipment management
│   │   ├── repository/           # Report repository
│   │   └── profile/              # User profile
│   ├── components/               # Reusable components
│   │   ├── layout/               # Layout components
│   │   ├── ui/                   # UI primitives
│   │   ├── auth/                 # Auth components
│   │   └── forms/                # Form components
│   └── lib/                      # Utilities and configuration
│       ├── auth.ts               # Role/permission definitions
│       ├── auth-context.tsx      # Auth context provider
│       └── supabase/             # Supabase client
│
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── main.py               # Application entry point
│   │   ├── api/                  # API routes
│   │   ├── core/                 # Configuration and exceptions
│   │   └── services/             # Business logic services
│   ├── engine/                   # Calculation and compliance engines
│   ├── demo/                     # Demonstration data and scripts
│   ├── tests/                    # Backend test suite (504+ tests)
│   └── requirements.txt          # Python dependencies
│
├── supabase/
│   └── migrations/               # Database schema migrations
│
├── public/
│   └── logo/                     # Application logo
│
├── docs/                         # Documentation
├── .env.example                  # Environment variable template
├── .gitignore                    # Git ignore rules
└── README.md                     # This file
```

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.10+
- npm or yarn

### Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at `http://localhost:8000/api/docs`.

### Running Backend Tests

```bash
cd backend
python -m pytest tests/ --tb=short -v
```

### Running the Demo

```bash
cd backend
python -m demo.run_demo
```

## Environment Variables

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (`.env`)

```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...
GEMINI_API_KEY=your-gemini-key  # Optional, for AI assistance
```

> **Important:** Never expose `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, or `DATABASE_URL` to the browser.

## Database Setup

### Schema

The database schema is defined in `supabase/migrations/001_initial_schema.sql`.

Key tables:

- `profiles` — User profiles with roles
- `laboratories` — Testing laboratory facilities
- `manufacturers` — Instrument manufacturers
- `instruments` — Registered weighing instruments
- `test_reports` — Test report records
- `test_conditions` — Environmental conditions during testing
- `test_cases` — Individual test cases within a report
- `test_observations` — Raw measurement observations
- `test_results` — Calculated results and compliance
- `test_equipment` — Calibration equipment records
- `attachments` — File attachments
- `compliance_rules` — Versioned compliance rules
- `audit_logs` — System activity log

### Row-Level Security (RLS)

All tables have RLS policies enforcing:

- Users can only access records within their permission scope
- Testers can only modify their own drafts
- Reviewers can only approve/reject submitted reports
- Viewers can only read finalized reports

## Demo Credentials

> **DEMO ONLY — CHANGE BEFORE ANY REAL DEPLOYMENT**

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@nawi-demo.local | Admin@123 |
| Tester | tester@nawi-demo.local | Tester@123 |
| Reviewer | reviewer@nawi-demo.local | Reviewer@123 |
| Viewer | viewer@nawi-demo.local | Viewer@123 |

These are fictional demo accounts for development and presentation purposes only.

## Demo Walkthrough

For SIH mentor demonstrations:

1. **Login as Tester** (`tester@nawi-demo.local` / `Tester@123`)
2. Navigate to **New Test** from the sidebar
3. Click **Fill Sample Data** to auto-populate realistic fictional data
4. Step through the wizard:
   - Instrument details (ABC-3000 Electronic Balance)
   - Laboratory conditions (temperature, humidity, etc.)
   - Select tests (Repeatability, Eccentricity)
   - Review pre-filled observations
5. Click **Calculate & Review** to see computed results
6. Click **Submit for Review**
7. **Logout** and login as **Reviewer** (`reviewer@nawi-demo.local` / `Reviewer@123`)
8. View the pending report in the dashboard
9. **Approve** or **Reject** the report

### Additional Demo Features

- **Instruments page** — View registered instruments with search and filters
- **Equipment page** — See calibration equipment with expiry warnings
- **Laboratories page** — View laboratory facilities
- **Repository** — Search and filter completed reports
- **Admin panel** — User management, audit log, system settings
- **Mobile responsive** — Try resizing the browser or use mobile view

## Deployment

### Frontend (Vercel)

1. Push repository to GitHub
2. Import the repository in Vercel
3. Set the root directory to the project root (or `frontend/` if using monorepo structure)
4. Add environment variables
5. Deploy
6. Set `NEXT_PUBLIC_API_URL` to your backend URL
7. Verify authentication flow

### Backend (Render / Railway)

1. Create a new web service
2. Connect your GitHub repository
3. Set the root directory to `backend/`
4. Add environment variables
5. Set the start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Deploy
7. Verify the `/api/health` endpoint returns `{"status": "healthy"}`

### Database & Auth (Supabase)

1. Create a new Supabase project
2. Run the migration in `supabase/migrations/001_initial_schema.sql`
3. Configure authentication providers
4. Set up storage buckets for attachments
5. Apply RLS policies

## Security

- **Authentication** — Supabase Auth with JWT tokens
- **Authorization** — Role-based permissions enforced at API and database level
- **Row-Level Security** — Database policies prevent unauthorized access
- **Audit Trail** — All significant actions are logged with actor, timestamp, and context
- **Secure Storage** — File uploads stored in Supabase Storage with access controls
- **Input Validation** — Multi-layer validation on all user inputs
- **No Secrets in Frontend** — Service role keys and secrets are never exposed to the browser

## Testing

### Backend Test Suite

504+ tests covering:

| Category | Tests | Description |
|----------|-------|-------------|
| Calculations | 43 | Pure numeric calculation functions |
| Validation | 16 | Input validation rules |
| Normalization | 22 | Unit conversion and normalization |
| Rule Engine | 22 | Rule store and resolver |
| Orchestrator | 30 | Full pipeline orchestration |
| Compliance | 29 | Compliance evaluation |
| Versioned Rules | 49 | Historical rule version support |
| Report Engine | 24 | PDF/DOCX generation |
| Repository | 39 | Report search and history |
| Attachments | 41 | File management |
| AI Assistance | 44 | AI layer with safety guards |
| Security & Audit | 53 | Authorization and audit trail |
| Adversarial | 66 | Edge cases and error handling |
| Golden Dataset | 42 | Known inputs → expected outputs |

### Key Properties Verified

- Same inputs + same rules = same outputs (determinism)
- PASS/FAIL correctly determined
- Missing data produces INCOMPLETE status
- Unknown rules produce RULE_NOT_CONFIGURED
- Historical rules preserved for old reports
- Finalized reports are reproducible
- Unit conversions are lossless

## OIML Rule Architecture

Rules are versioned and separated from the UI and calculation code:

```
Rule Repository
      ↓
Rule Resolver
      ↓
Calculation Engine
      ↓
Compliance Engine
      ↓
Result
```

### Key Properties

- Rules are stored with version and effective dates
- Finalized reports retain the exact rule version used
- Old rule versions are never modified
- New rule versions can be added without affecting existing reports
- If a required rule does not exist, the system returns `RULE_NOT_CONFIGURED`

### Demo Rules

> **DEMO RULE — NOT FOR REGULATORY USE**

The MVP includes demonstration rules for presentation purposes. These rules are clearly marked and must not be used for actual regulatory compliance decisions.

## AI Architecture

AI assistance is optional and provides:

- Explaining calculation results in plain language
- Summarizing test reports
- Extracting instrument metadata from uploaded documents
- Generating human-readable test summaries

**AI must never:**

- Calculate official compliance values
- Determine PASS/FAIL
- Invent OIML requirements
- Modify regulatory rules
- Override calculation results
- Approve reports

Every AI-generated output is clearly labeled as assistance, not a compliance determination.

## Limitations

This MVP has the following known limitations:

- **Demo rules** — Compliance rules are demonstration values, not verified OIML R-76 requirements
- **Mock authentication** — Frontend uses a mock Supabase client for development
- **Digital signatures** — Architecture is in place but no real signing mechanism is integrated
- **Offline capability** — Not available in this version
- **Multilingual** — English only in this version
- **Regulatory certification** — This software is a prototype and has not been certified by any regulatory authority

## Future Scope

- Additional OIML R-76 test coverage
- Official rule version updates as OIML publishes new recommendations
- Digital signature integration with compliant signing mechanisms
- Advanced analytics and trending
- Offline capability for field testing
- Multilingual support
- Integration with laboratory information management systems (LIMS)
- Barcode/QR code scanning for instrument identification
- Mobile app for field observations

## Disclaimer

This application is a software prototype developed for the Smart India Hackathon 2026 (Problem Statement 26035). It must be validated against authoritative OIML R-76 requirements and regulatory standards before any production use. The demo data, calculation rules, and compliance evaluations included in this prototype are for demonstration purposes only and do not represent official regulatory determinations.

## License

Developed for Smart India Hackathon 2026.
