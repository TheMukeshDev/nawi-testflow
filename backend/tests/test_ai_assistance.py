"""
Tests for AI Assistance Service

Tests cover:
- All assistance types (explain, summarize, extract, generate)
- Fallback when AI unavailable
- Disclaimer presence on all responses
- Invariants (AI never modifies calculations/compliance)
- Metadata extraction patterns
- Graceful degradation
"""

import pytest
from datetime import datetime

from engine.ai_assistance import (
    AIAssistanceService,
    AIAssistanceType,
    AIAssistanceResponse,
    AIConfidenceLevel,
    ExtractedMetadata,
    get_ai_service,
    reset_ai_service,
)


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def ai_service():
    """AI service without API key (unavailable)."""
    reset_ai_service()
    return AIAssistanceService(api_key=None)


@pytest.fixture
def ai_service_with_key():
    """AI service with API key (available)."""
    reset_ai_service()
    return AIAssistanceService(api_key="test-key-123")


@pytest.fixture
def sample_decision():
    """Sample compliance decision data."""
    return {
        "standard": "OIML R-76",
        "standard_version": "2009",
        "rule_id": "RPT-III-001",
        "rule_version": "2009",
        "test_code": "RPT",
        "test_name": "Repeatability",
        "calculated_value": 0.1633,
        "calculated_unit": "d",
        "applicable_limit": 0.5,
        "limit_unit": "d",
        "decision": "pass",
        "reason": "Standard deviation of 0.1633 d is within the maximum allowed 0.5 d.",
        "explanations": [
            {
                "parameter_name": "Standard Deviation (in scale intervals)",
                "observed_value": 0.1633,
                "observed_unit": "d",
                "allowed_value": 0.5,
                "allowed_unit": "d",
                "difference": -0.3367,
                "margin": 0.3367,
                "is_within_limit": True,
                "comparison_operator": "<=",
            }
        ],
    }


@pytest.fixture
def sample_report():
    """Sample report data."""
    return {
        "report_number": "RPT-2026-001234",
        "instrument": {
            "manufacturer": "Mettler Toledo",
            "model": "ICS685k-0.6",
            "serial_number": "WGH-2024-0891",
        },
        "overall_result": "compliant",
        "test_results": [
            {"test_name": "Repeatability", "decision": "pass"},
            {"test_name": "Eccentricity", "decision": "pass"},
            {"test_name": "Linearity", "decision": "pass"},
            {"test_name": "Discrimination", "decision": "pass"},
        ],
    }


@pytest.fixture
def sample_warning():
    """Sample validation warning."""
    return {
        "field": "serial_number",
        "message": "Serial number already exists",
        "code": "DUPLICATE_SERIAL",
        "severity": "warning",
        "value": "WGH-2024-0891",
    }


@pytest.fixture
def sample_test_data():
    """Sample test data for summary generation."""
    return {
        "test_name": "Repeatability",
        "observations": [
            {"point_label": "Max", "value": 100.002, "unit": "kg"},
            {"point_label": "Max", "value": 100.001, "unit": "kg"},
            {"point_label": "Max", "value": 100.003, "unit": "kg"},
        ],
        "calculations": {
            "mean": 100.002,
            "std_deviation": 0.001,
            "max_absolute_deviation": 0.001,
        },
        "result": "pass",
    }


# ============================================================================
# AVAILABILITY TESTS
# ============================================================================

class TestAIAvailability:
    """Test AI service availability and fallback."""

    def test_unavailable_without_key(self, ai_service):
        """Service should be unavailable without API key."""
        assert not ai_service.is_available

    def test_available_with_key(self, ai_service_with_key):
        """Service should be available with API key."""
        assert ai_service_with_key.is_available

    def test_fallback_on_unavailable_explain(self, ai_service):
        """Should return fallback when explaining with unavailable AI."""
        response = ai_service.explain_compliance_result({})
        assert response.assistance_type == AIAssistanceType.EXPLAIN_RESULT
        assert "not available" in response.content.lower()
        assert "not configured" in response.summary.lower()

    def test_fallback_on_unavailable_summarize(self, ai_service):
        """Should return fallback when summarizing with unavailable AI."""
        response = ai_service.summarize_report({})
        assert response.assistance_type == AIAssistanceType.SUMMARIZE_REPORT
        assert "not available" in response.content.lower()

    def test_fallback_on_unavailable_validation(self, ai_service):
        """Should return fallback when explaining validation with unavailable AI."""
        response = ai_service.explain_validation_warning({})
        assert response.assistance_type == AIAssistanceType.EXPLAIN_VALIDATION
        assert "not available" in response.content.lower()

    def test_fallback_on_unavailable_summary(self, ai_service):
        """Should return fallback when generating summary with unavailable AI."""
        response = ai_service.generate_test_summary({})
        assert response.assistance_type == AIAssistanceType.GENERATE_SUMMARY
        assert "not available" in response.content.lower()


# ============================================================================
# DISCLAIMER INVARIANT TESTS
# ============================================================================

class TestDisclaimerInvariant:
    """Every AI response MUST include a disclaimer."""

    def test_explain_has_disclaimer(self, ai_service_with_key, sample_decision):
        """Explain result must include disclaimer."""
        response = ai_service_with_key.explain_compliance_result(sample_decision)
        assert response.disclaimer is not None
        assert "disclaimer" in response.disclaimer.lower()
        assert "informational purposes" in response.disclaimer.lower()

    def test_summarize_has_disclaimer(self, ai_service_with_key, sample_report):
        """Summarize report must include disclaimer."""
        response = ai_service_with_key.summarize_report(sample_report)
        assert response.disclaimer is not None
        assert "disclaimer" in response.disclaimer.lower()

    def test_validation_has_disclaimer(self, ai_service_with_key, sample_warning):
        """Explain validation must include disclaimer."""
        response = ai_service_with_key.explain_validation_warning(sample_warning)
        assert response.disclaimer is not None
        assert "disclaimer" in response.disclaimer.lower()

    def test_summary_has_disclaimer(self, ai_service_with_key, sample_test_data):
        """Generate summary must include disclaimer."""
        response = ai_service_with_key.generate_test_summary(sample_test_data)
        assert response.disclaimer is not None
        assert "disclaimer" in response.disclaimer.lower()

    def test_extract_has_disclaimer(self, ai_service_with_key):
        """Extract metadata must include disclaimer."""
        metadata = ai_service_with_key.extract_metadata_from_document("test text")
        assert metadata.disclaimer is not None
        assert "disclaimer" in metadata.disclaimer.lower()
        assert "verified" in metadata.disclaimer.lower()

    def test_fallback_has_disclaimer(self, ai_service):
        """Even fallback responses must include disclaimer."""
        response = ai_service.explain_compliance_result({})
        assert response.disclaimer is not None
        assert "disclaimer" in response.disclaimer.lower()


# ============================================================================
# EXPLAIN RESULT TESTS
# ============================================================================

class TestExplainResult:
    """Test compliance result explanation."""

    def test_explain_pass_result(self, ai_service_with_key, sample_decision):
        """Should explain PASS result clearly."""
        response = ai_service_with_key.explain_compliance_result(sample_decision)
        assert response.assistance_type == AIAssistanceType.EXPLAIN_RESULT
        assert "pass" in response.title.lower()
        assert "repeatability" in response.title.lower()
        assert "0.1633" in response.content
        assert "0.5" in response.content

    def test_explain_fail_result(self, ai_service_with_key):
        """Should explain FAIL result clearly."""
        decision = {
            "test_name": "Eccentricity",
            "decision": "fail",
            "reason": "Exceeds limit",
            "calculated_value": 1.2,
            "applicable_limit": 1.0,
            "rule_id": "ECC-III-001",
            "explanations": [],
        }
        response = ai_service_with_key.explain_compliance_result(decision)
        assert "fail" in response.title.lower()
        assert "eccentricity" in response.title.lower()

    def test_explain_includes_sources(self, ai_service_with_key, sample_decision):
        """Explanation must reference authoritative sources."""
        response = ai_service_with_key.explain_compliance_result(sample_decision)
        assert len(response.sources) > 0
        assert any("compliance" in s.lower() for s in response.sources)

    def test_explain_does_not_modify_decision(self, ai_service_with_key, sample_decision):
        """AI explanation must not modify the original decision."""
        original_decision = sample_decision.copy()
        response = ai_service_with_key.explain_compliance_result(sample_decision)
        # Original decision unchanged
        assert sample_decision["decision"] == original_decision["decision"]
        assert sample_decision["calculated_value"] == original_decision["calculated_value"]

    def test_explain_confidence_level(self, ai_service_with_key, sample_decision):
        """Explanation should have appropriate confidence level."""
        response = ai_service_with_key.explain_compliance_result(sample_decision)
        assert response.confidence in [AIConfidenceLevel.LOW, AIConfidenceLevel.MEDIUM, AIConfidenceLevel.HIGH]


# ============================================================================
# SUMMARIZE REPORT TESTS
# ============================================================================

class TestSummarizeReport:
    """Test report summarization."""

    def test_summarize_report(self, ai_service_with_key, sample_report):
        """Should generate report summary."""
        response = ai_service_with_key.summarize_report(sample_report)
        assert response.assistance_type == AIAssistanceType.SUMMARIZE_REPORT
        assert "RPT-2026-001234" in response.title
        assert "4/4" in response.summary
        assert "compliant" in response.summary.lower()

    def test_summarize_includes_instrument(self, ai_service_with_key, sample_report):
        """Summary should include instrument information."""
        response = ai_service_with_key.summarize_report(sample_report)
        assert "Mettler Toledo" in response.content
        assert "ICS685k-0.6" in response.content

    def test_summarize_counts_results(self, ai_service_with_key):
        """Summary should correctly count pass/fail results."""
        report = {
            "report_number": "RPT-001",
            "instrument": {},
            "overall_result": "non-compliant",
            "test_results": [
                {"test_name": "Test A", "decision": "pass"},
                {"test_name": "Test B", "decision": "pass"},
                {"test_name": "Test C", "decision": "fail"},
            ],
        }
        response = ai_service_with_key.summarize_report(report)
        assert "2/3" in response.summary


# ============================================================================
# EXPLAIN VALIDATION TESTS
# ============================================================================

class TestExplainValidation:
    """Test validation warning explanation."""

    def test_explain_duplicate_serial(self, ai_service_with_key, sample_warning):
        """Should explain duplicate serial number warning."""
        response = ai_service_with_key.explain_validation_warning(sample_warning)
        assert response.assistance_type == AIAssistanceType.EXPLAIN_VALIDATION
        assert "serial" in response.title.lower()
        assert "duplicate" in response.content.lower()

    def test_explain_includes_action(self, ai_service_with_key, sample_warning):
        """Should include suggested action."""
        response = ai_service_with_key.explain_validation_warning(sample_warning)
        assert "action" in response.content.lower()

    def test_explain_with_different_codes(self, ai_service_with_key):
        """Should handle various validation codes."""
        codes = ["OUT_OF_RANGE", "MISSING_REQUIRED", "CALIBRATION_EXPIRING"]
        for code in codes:
            warning = {
                "field": "test_field",
                "message": "Test message",
                "code": code,
                "severity": "warning",
                "value": "test_value",
            }
            response = ai_service_with_key.explain_validation_warning(warning)
            assert response.assistance_type == AIAssistanceType.EXPLAIN_VALIDATION


# ============================================================================
# EXTRACT METADATA TESTS
# ============================================================================

class TestExtractMetadata:
    """Test document metadata extraction."""

    def test_extract_empty_document(self, ai_service_with_key):
        """Should handle empty document gracefully."""
        metadata = ai_service_with_key.extract_metadata_from_document("")
        assert isinstance(metadata, ExtractedMetadata)
        assert metadata.overall_confidence in [
            AIConfidenceLevel.LOW,
            AIConfidenceLevel.MEDIUM,
            AIConfidenceLevel.HIGH,
        ]

    def test_extract_manufacturer(self, ai_service_with_key):
        """Should extract manufacturer names."""
        doc = """
        Calibration Certificate
        Instrument: Mettler Toledo XPR226DR
        Serial Number: SN-2024-0891
        Maximum Capacity: 220 g
        """
        metadata = ai_service_with_key.extract_metadata_from_document(doc)
        assert metadata.manufacturer is not None
        assert "mettler" in metadata.manufacturer.lower() or "Mettler" in metadata.manufacturer

    def test_extract_serial_number(self, ai_service_with_key):
        """Should extract serial numbers."""
        doc = "Serial No: ABC-12345-XZ"
        metadata = ai_service_with_key.extract_metadata_from_document(doc)
        assert metadata.serial_number is not None
        assert "ABC-12345-XZ" in metadata.serial_number

    def test_extract_capacity(self, ai_service_with_key):
        """Should extract capacity values."""
        doc = "Maximum Capacity: 300 kg"
        metadata = ai_service_with_key.extract_metadata_from_document(doc)
        assert metadata.max_capacity is not None
        assert metadata.max_capacity == 300
        assert metadata.max_capacity_unit == "kg"

    def test_extract_returns_raw_text(self, ai_service_with_key):
        """Should return raw text for verification."""
        doc = "Some document content"
        metadata = ai_service_with_key.extract_metadata_from_document(doc)
        assert metadata.raw_text is not None
        assert "Some document" in metadata.raw_text

    def test_extract_field_confidence(self, ai_service_with_key):
        """Should include field-level confidence scores."""
        doc = "Manufacturer: Sartorius Serial No: SN-001"
        metadata = ai_service_with_key.extract_metadata_from_document(doc)
        assert isinstance(metadata.field_confidence, dict)

    def test_extract_includes_disclaimer(self, ai_service_with_key):
        """Must include verification disclaimer."""
        doc = "test"
        metadata = ai_service_with_key.extract_metadata_from_document(doc)
        assert "verified" in metadata.disclaimer.lower()
        assert "personnel" in metadata.disclaimer.lower()


# ============================================================================
# GENERATE TEST SUMMARY TESTS
# ============================================================================

class TestGenerateTestSummary:
    """Test test summary generation."""

    def test_generate_summary(self, ai_service_with_key, sample_test_data):
        """Should generate test summary."""
        response = ai_service_with_key.generate_test_summary(sample_test_data)
        assert response.assistance_type == AIAssistanceType.GENERATE_SUMMARY
        assert "repeatability" in response.title.lower()
        assert "pass" in response.summary.lower()

    def test_summary_includes_observations(self, ai_service_with_key, sample_test_data):
        """Summary should reference observations."""
        response = ai_service_with_key.generate_test_summary(sample_test_data)
        assert "observation" in response.content.lower()

    def test_summary_includes_calculations(self, ai_service_with_key, sample_test_data):
        """Summary should include calculated values."""
        response = ai_service_with_key.generate_test_summary(sample_test_data)
        assert "mean" in response.content.lower()

    def test_summary_includes_oiml_reference(self, ai_service_with_key, sample_test_data):
        """Summary should reference OIML R-76."""
        response = ai_service_with_key.generate_test_summary(sample_test_data)
        assert "OIML R-76" in response.content


# ============================================================================
# SERIALIZATION TESTS
# ============================================================================

class TestSerialization:
    """Test response serialization."""

    def test_response_to_dict(self, ai_service_with_key, sample_decision):
        """Response should serialize to dict correctly."""
        response = ai_service_with_key.explain_compliance_result(sample_decision)
        d = response.to_dict()
        assert "assistance_type" in d
        assert "content" in d
        assert "disclaimer" in d
        assert "generated_at" in d

    def test_metadata_to_dict(self, ai_service_with_key):
        """Metadata should serialize to dict correctly."""
        metadata = ai_service_with_key.extract_metadata_from_document("test")
        d = metadata.to_dict()
        assert "disclaimer" in d
        assert "overall_confidence" in d


# ============================================================================
# INVARIANT TESTS
# ============================================================================

class TestInvariants:
    """Test critical invariants about AI's role."""

    def test_ai_never_modifies_calculations(self, ai_service_with_key, sample_decision):
        """AI must NEVER modify calculation results."""
        original_value = sample_decision["calculated_value"]
        response = ai_service_with_key.explain_compliance_result(sample_decision)
        # Original value unchanged
        assert sample_decision["calculated_value"] == original_value

    def test_ai_never_modifies_compliance(self, ai_service_with_key, sample_decision):
        """AI must NEVER modify compliance decisions."""
        original_decision = sample_decision["decision"]
        response = ai_service_with_key.explain_compliance_result(sample_decision)
        # Original decision unchanged
        assert sample_decision["decision"] == original_decision

    def test_ai_never_invents_limits(self, ai_service_with_key):
        """AI must NEVER invent OIML limits."""
        # Pass empty data - AI should not generate limits
        response = ai_service_with_key.explain_compliance_result({})
        # Response should not contain invented limits
        assert "maximum permissible error" not in response.content.lower() or \
               "not available" in response.content.lower()

    def test_ai_never_overrides_rules(self, ai_service_with_key, sample_decision):
        """AI must NEVER override regulatory rules."""
        response = ai_service_with_key.explain_compliance_result(sample_decision)
        # Should reference the rule, not override it
        assert "rule" in response.content.lower() or "deterministic" in response.content.lower()

    def test_core_function_works_without_ai(self):
        """Core application must work without AI service."""
        # Create service without API key
        service = AIAssistanceService(api_key=None)
        assert not service.is_available

        # All methods should return fallback responses
        response = service.explain_compliance_result({})
        assert response.content is not None
        assert "not available" in response.content.lower()

        # Application continues to function
        response = service.summarize_report({})
        assert response.content is not None

        response = service.generate_test_summary({})
        assert response.content is not None

    def test_all_responses_labeled_as_ai(self, ai_service_with_key, sample_decision):
        """All AI responses must be clearly labeled as AI-generated."""
        response = ai_service_with_key.explain_compliance_result(sample_decision)
        # Content should indicate it's AI-generated
        assert "ai" in response.content.lower() or "assistance" in response.content.lower()


# ============================================================================
# SINGLETON TESTS
# ============================================================================

class TestSingleton:
    """Test AI service singleton."""

    def test_get_service_singleton(self):
        """get_ai_service should return same instance."""
        reset_ai_service()
        s1 = get_ai_service()
        s2 = get_ai_service()
        assert s1 is s2

    def test_reset_service(self):
        """Reset should create new instance."""
        reset_ai_service()
        s1 = get_ai_service()
        reset_ai_service()
        s2 = get_ai_service()
        assert s1 is not s2
