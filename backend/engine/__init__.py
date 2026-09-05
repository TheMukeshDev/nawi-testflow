"""
NAWI Sahayak — Calculation Engine

Standalone Python calculation and validation engine for OIML R-76.
Completely independent from UI and HTTP layer.

Architecture:
    Raw Observation
    → Input Validation
    → Normalization
    → Calculation
    → Rule Resolution
    → Compliance Evaluation
    → Result
    → Report Generation
    → Report Repository

IMPORTANT: This engine does NOT use AI/LLM for calculations.
All calculations are deterministic and reproducible.

Modules:
    types.py              — Data types for inputs, outputs, and rules
    validation.py         — Input validation before calculation
    normalization.py      — Unit conversion and normalization
    calculations.py       — Pure calculation functions
    rules.py              — Rule store and resolver
    compliance.py         — Deterministic compliance evaluation
    orchestrator.py       — Pipeline orchestration
    report_models.py      — Report data models
    report_pdf.py         — PDF generation (ReportLab)
    report_docx.py        — DOCX generation (python-docx)
    report_snapshot.py    — Report snapshots for reproducibility
    report_engine.py      — Main report generation engine
    report_repository.py  — Digital report repository with search/history
"""

from engine.attachments import (
    Attachment,
    AttachmentCategory,
    AttachmentStore,
    EntityType,
    SignaturePlaceholder,
    SignatureStatus,
    compute_checksum,
    verify_checksum,
    validate_file,
    get_attachment_store,
)

from engine.ai_assistance import (
    AIAssistanceService,
    AIAssistanceType,
    AIConfidenceLevel,
    AIAssistanceResponse,
    ExtractedMetadata,
    get_ai_service,
)

__version__ = "1.0.0"
