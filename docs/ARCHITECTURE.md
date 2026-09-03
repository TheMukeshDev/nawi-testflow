# NAWI TestFlow — Production Architecture

**Version:** 1.0
**Stack:** Next.js + FastAPI + PostgreSQL/Supabase
**Standard:** OIML R-76 — Non-Automatic Weighing Instruments

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Dashboard │ │ Tests    │ │Instruments│ │ Reports  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS (REST)
┌─────────────────────────────▼───────────────────────────────────┐
│                        API LAYER                                │
│  FastAPI (Python 3.11+)                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Auth     │ │ Tests    │ │Calc Engine│ │Report Gen│          │
│  │ Routes   │ │ Routes   │ │          │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Validation│ │Calc      │ │Compliance│ │Audit     │          │
│  │Service   │ │Service   │ │Service   │ │Service   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                     DATA LAYER                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │PostgreSQL│ │Supabase  │ │Supabase  │ │Redis     │          │
│  │Database  │ │Auth      │ │Storage   │ │(Cache)   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Clean Architecture Layers

### 2.1 UI Layer (Next.js)

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Authentication pages
│   ├── dashboard/          # Dashboard
│   ├── tests/              # Test management
│   ├── instruments/        # Instrument registry
│   ├── laboratories/       # Laboratory management
│   ├── equipment/          # Equipment registry
│   ├── reports/            # Report generation
│   ├── repository/         # Document repository
│   ├── admin/              # User administration
│   └── settings/           # System settings
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives
│   ├── forms/              # Form components
│   ├── tables/             # Table components
│   └── layout/             # Layout components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and API client
│   ├── api/                # API client functions
│   └── utils.ts            # Utility functions
└── types/                  # TypeScript types (generated from API)
```

**Rules:**
- NO business logic in components
- NO direct database access
- ALL data fetching through API client
- Types generated from OpenAPI spec

### 2.2 API Layer (FastAPI)

```
backend/
├── app/
│   ├── api/                # Route handlers
│   │   ├── v1/             # API version 1
│   │   │   ├── auth.py     # Authentication endpoints
│   │   │   ├── tests.py    # Test CRUD endpoints
│   │   │   ├── instruments.py
│   │   │   ├── laboratories.py
│   │   │   ├── equipment.py
│   │   │   ├── reports.py  # Report generation
│   │   │   ├── users.py    # User management
│   │   │   └── admin.py    # System admin
│   │   └── deps.py         # Dependency injection
│   ├── core/               # Core configuration
│   │   ├── config.py       # Settings
│   │   ├── security.py     # Auth utilities
│   │   └── exceptions.py   # Custom exceptions
│   ├── models/             # SQLAlchemy models
│   ├── schemas/            # Pydantic schemas
│   ├── services/           # Business logic
│   │   ├── validation.py   # Input validation
│   │   ├── calculation.py  # Calculation engine
│   │   ├── compliance.py   # Compliance engine
│   │   ├── report.py       # Report generation
│   │   └── audit.py        # Audit logging
│   └── utils/              # Utilities
├── migrations/             # Alembic migrations
├── tests/                  # Test suite
└── requirements.txt
```

**Rules:**
- Routes handle HTTP only (request/response)
- Services contain business logic
- Models map to database tables
- Schemas validate API input/output

### 2.3 Business Logic Layer

```
backend/app/services/
├── calculation_engine.py   # OIML R-76 calculations
├── compliance_engine.py    # Compliance evaluation
├── validation_service.py   # Data validation
├── report_engine.py        # PDF/DOCX generation
├── audit_service.py        # Audit trail logging
├── notification_service.py # Email notifications
└── rule_engine.py          # Configurable rules
```

**Rules:**
- NO HTTP dependencies
- NO database dependencies (use repositories)
- Pure functions where possible
- All calculations versioned and traceable

### 2.4 Data Layer

```
backend/app/
├── models/                 # SQLAlchemy ORM models
├── repositories/           # Data access objects
├── migrations/             # Alembic migrations
└── db.py                   # Database connection
```

**Rules:**
- Models map 1:1 to database tables
- Repositories abstract database access
- Migrations are reversible
- All tables have UUID primary keys

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   profiles   │     │ laboratories │     │manufacturers │
│──────────────│     │──────────────│     │──────────────│
│ id (UUID)    │◄──┐ │ id (UUID)    │◄──┐ │ id (UUID)    │
│ auth_user_id │   │ │ name         │   │ │ name         │
│ full_name    │   │ │ code         │   │ │ country      │
│ role         │   │ │ address      │   │ │ contact      │
│ lab_id (FK)  │───┘ │ accreditation│   │ └──────────────┘
└──────────────┘     └──────────────┘   │
                                         │
┌──────────────┐     ┌──────────────┐   │
│  instruments │     │instrument_   │   │
│──────────────│     │  models      │   │
│ id (UUID)    │◄──┐ │──────────────│   │
│ model_id(FK) │───┘ │ id (UUID)    │───┘
│ serial_no    │     │ manufacturer │
│ lab_id (FK)  │     │ model_name   │
│ condition    │     │ instrument_  │
└──────┬───────┘     │   class      │
       │             └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ test_reports │────▶│test_conditions│    │test_cases    │
│──────────────│     │──────────────│     │──────────────│
│ id (UUID)    │     │ id (UUID)    │     │ id (UUID)    │
│ report_no    │     │ report_id(FK)│     │ report_id(FK)│
│ instrument_id│     │ temperature  │     │ case_type    │
│ status       │     │ humidity     │     │ test_point   │
│ compliance   │     │ recorded_by  │     │ status       │
└──────┬───────┘     └──────────────┘     └──────┬───────┘
       │                                          │
       │             ┌──────────────┐             │
       │             │test_         │             │
       │             │ observations │             │
       │             │──────────────│             │
       │             │ id (UUID)    │◄────────────┘
       │             │ case_id (FK) │
       │             │ measured_val │
       │             │ calculated_  │
       │             └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│test_results  │     │test_equipment│     │ attachments  │
│──────────────│     │──────────────│     │──────────────│
│ id (UUID)    │     │ id (UUID)    │     │ id (UUID)    │
│ report_id(FK)│     │ report_id(FK)│     │ entity_type  │
│ case_id (FK) │     │ equipment_id │     │ entity_id    │
│ verdict      │     │ role         │     │ file_path    │
│ mpe_value    │     └──────────────┘     └──────────────┘
└──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│compliance_   │     │report_       │     │ audit_logs   │
│   rules      │     │  versions    │     │──────────────│
│──────────────│     │──────────────│     │ id (UUID)    │
│ id (UUID)    │     │ id (UUID)    │     │ user_id      │
│ standard     │     │ report_id(FK)│     │ action       │
│ version      │     │ version_no   │     │ entity_type  │
│ rule_data    │     │ file_path    │     │ entity_id    │
│ is_active    │     │ checksum     │     │ changes      │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 3.2 Table Definitions

See `backend/migrations/` for complete SQL definitions.

---

## 4. API Design

### 4.1 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Email/password login |
| POST | `/api/v1/auth/logout` | Invalidate session |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/refresh` | Refresh token |

### 4.2 Tests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tests` | List tests (with filters) |
| POST | `/api/v1/tests` | Create new test |
| GET | `/api/v1/tests/{id}` | Get test details |
| PUT | `/api/v1/tests/{id}` | Update test |
| DELETE | `/api/v1/tests/{id}` | Delete test |
| POST | `/api/v1/tests/{id}/submit` | Submit for review |
| POST | `/api/v1/tests/{id}/approve` | Approve test |
| POST | `/api/v1/tests/{id}/reject` | Reject test |
| POST | `/api/v1/tests/{id}/calculate` | Run calculations |
| GET | `/api/v1/tests/{id}/compliance` | Get compliance result |

### 4.3 Instruments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/instruments` | List instruments |
| POST | `/api/v1/instruments` | Register instrument |
| GET | `/api/v1/instruments/{id}` | Get instrument details |
| PUT | `/api/v1/instruments/{id}` | Update instrument |
| GET | `/api/v1/instruments/{id}/history` | Get test history |

### 4.4 Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/reports/generate` | Generate report |
| GET | `/api/v1/reports` | List reports |
| GET | `/api/v1/reports/{id}` | Get report details |
| GET | `/api/v1/reports/{id}/download` | Download PDF |
| GET | `/api/v1/reports/{id}/download-docx` | Download DOCX |
| GET | `/api/v1/reports/{id}/versions` | List versions |

### 4.5 Laboratories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/laboratories` | List laboratories |
| POST | `/api/v1/laboratories` | Create laboratory |
| GET | `/api/v1/laboratories/{id}` | Get laboratory |
| PUT | `/api/v1/laboratories/{id}` | Update laboratory |

### 4.6 Equipment

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/equipment` | List equipment |
| POST | `/api/v1/equipment` | Register equipment |
| GET | `/api/v1/equipment/{id}` | Get equipment |
| PUT | `/api/v1/equipment/{id}` | Update equipment |

### 4.7 Users & Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users (admin) |
| POST | `/api/v1/users` | Create user (admin) |
| PUT | `/api/v1/users/{id}` | Update user |
| GET | `/api/v1/audit` | Get audit log |

### 4.8 AI Assistance (Two-Tier: Rule-First, Gemini On-Demand)

Tier 1 needs no key and makes no AI calls. Tier 2 fires one Gemini call
per explicit user click, only when a key is configured in Settings.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ai/explain-rule` | Rule-based verdict explanation (no AI) |
| POST | `/api/v1/ai/summarize-rule` | Rule-based report summary (no AI) |
| GET | `/api/v1/ai/process/{test_code}` | Rule-based test walkthrough (no AI) |
| POST | `/api/v1/ai/explain-result` | Explain result (`mode=rule` default, `mode=ai` for Gemini) |
| POST | `/api/v1/ai/summarize-report` | Summarize report (rule-first, optional AI) |
| POST | `/api/v1/ai/explain-validation` | Explain validation warning (rule-first, optional AI) |
| POST | `/api/v1/ai/generate-summary` | Test summary (rule-first, optional AI) |
| POST | `/api/v1/ai/extract-metadata` | Document extraction (key required) |
| GET | `/api/v1/ai/settings` | AI status, key masked (any authenticated user) |
| PUT | `/api/v1/ai/settings` | Global key / enabled / model (admin only) |
| DELETE | `/api/v1/ai/settings/key` | Clear global key (admin only) |
| GET | `/api/v1/ai/status` | Rule-based + Gemini availability |

Key modules: `backend/engine/rule_explainer.py` (Tier 1, deterministic),
`backend/engine/ai_settings.py` (gating: global key, enabled flag, model
allow-list), `backend/engine/ai_assistance.py` (Tier 2, prompts grounded in
the actual resolved rule — never invents limits or verdicts).
Personal keys are supplied per-request via the `X-Gemini-Key` header (user
Settings page, browser-local) and take precedence over the admin global key.

---

## 5. Calculation Engine

The calculation engine is a standalone Python module with NO HTTP or database dependencies.

```python
# backend/app/services/calculation_engine.py

class CalculationEngine:
    """OIML R-76 calculation engine."""
    
    def calculate_mean(self, values: list[float]) -> float:
        """Calculate arithmetic mean."""
        return sum(values) / len(values)
    
    def calculate_std_dev(self, values: list[float]) -> float:
        """Calculate sample standard deviation."""
        mean = self.calculate_mean(values)
        variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
        return variance ** 0.5
    
    def calculate_mpe(
        self, 
        instrument_class: str,
        scale_divisions: int,
        test_point: float
    ) -> float:
        """Calculate maximum permissible error per OIML R-76."""
        # Lookup MPE from rule table
        pass
    
    def evaluate_test_point(
        self,
        measured_values: list[float],
        reference_value: float,
        mpe: float
    ) -> dict:
        """Evaluate a single test point."""
        mean = self.calculate_mean(measured_values)
        error = abs(mean - reference_value)
        return {
            "mean": mean,
            "std_dev": self.calculate_std_dev(measured_values),
            "error": error,
            "mpe": mpe,
            "verdict": "pass" if error <= mpe else "fail"
        }
```

---

## 6. Compliance Engine

```python
# backend/app/services/compliance_engine.py

class ComplianceEngine:
    """Evaluate overall compliance per OIML R-76."""
    
    def evaluate_report(self, test_cases: list[TestCase]) -> ComplianceVerdict:
        """Evaluate all test cases and determine overall compliance."""
        verdicts = [case.verdict for case in test_cases]
        
        if all(v == "pass" for v in verdicts):
            return "compliant"
        elif any(v == "fail" for v in verdicts):
            return "non-compliant"
        else:
            return "conditional"
```

---

## 7. Report Engine

```python
# backend/app/services/report_engine.py

class ReportEngine:
    """Generate standardized test reports."""
    
    def generate_pdf(self, report_data: dict) -> bytes:
        """Generate PDF report using ReportLab."""
        pass
    
    def generate_docx(self, report_data: dict) -> bytes:
        """Generate editable DOCX report using python-docx."""
        pass
    
    def calculate_checksum(self, file_bytes: bytes) -> str:
        """Calculate SHA-256 checksum for tamper detection."""
        pass
```

---

## 8. Audit System

Every mutation in the system creates an audit log entry:

```sql
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
VALUES ($1, $2, $3, $4, $5);
```

**Audited actions:**
- CREATE, UPDATE, DELETE on all entities
- SUBMIT, APPROVE, REJECT on test reports
- LOGIN, LOGOUT
- REPORT_GENERATE, REPORT_DOWNLOAD

---

## 9. Security

### 9.1 Authentication Flow

```
1. User enters email/password
2. Frontend calls /api/v1/auth/login
3. Backend verifies against Supabase Auth
4. Backend returns JWT token
5. Frontend stores token in httpOnly cookie
6. All subsequent requests include token
7. Backend verifies token on each request
```

### 9.2 Authorization (RBAC)

| Role | Permissions |
|------|-------------|
| admin | Full access to all resources |
| lab-manager | Manage lab, approve tests, manage users in lab |
| technician | Create/edit tests, view instruments |
| reviewer | Review/approve tests, view reports |
| auditor | Read-only access to all data and audit logs |
| viewer | Read-only access to assigned lab data |

---

## 10. Deployment

### 10.1 Development

```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && uvicorn app.main:app --reload

# Database
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16
```

### 10.2 Production

```
Frontend: Vercel (Next.js)
Backend: Railway / Fly.io (FastAPI)
Database: Supabase (PostgreSQL)
Auth: Supabase Auth
Storage: Supabase Storage
```

---

## 11. Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (.env)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/nawi_testflow
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
STORAGE_BUCKET=nawi-attachments
```
