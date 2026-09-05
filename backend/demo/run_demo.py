"""
NAWI Sahayak -- Demonstration Runner

Executes the complete workflow demonstration:
1. Instrument entry
2. Test observation
3. Validation
4. Calculation
5. Compliance result
6. Review
7. PDF generation
8. Repository
9. Search/history

! ALL DATA USED IS FICTIONAL AND FOR DEMONSTRATION ONLY !

Run with: python -m demo.run_demo
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.orchestrator import CalculationEngine
from engine.compliance import ComplianceEvaluator
from engine.report_engine import ReportEngine
from engine.attachments import AttachmentStore, AttachmentCategory, EntityType
from engine.audit import AuditService, AuditAction, EntityType as AuditEntityType
from engine.ai_assistance import AIAssistanceService
from engine.versioned_rules import VersionedRuleStore, VersionedRuleResolver, RuleVersion, RuleStatus, VersionedComplianceRule, RuleSource
from engine.rules import RuleStore, ComplianceRule, create_default_rule_store

from demo.demo_data import (
    DEMO_DISCLAIMER,
    DEMO_LABORATORIES, DEMO_MANUFACTURERS, DEMO_INSTRUMENTS,
    DEMO_EQUIPMENT, DEMO_TEST_CONDITIONS, DEMO_TEST_REPORTS,
    get_demo_test_1_input, get_demo_test_2_input, get_demo_test_3_input,
)
from engine.types import InstrumentClass, MassUnit, TestStatusCode


# ============================================================================
# SETUP
# ============================================================================

def setup_versioned_rules():
    """Set up versioned rules for the demonstration."""
    store = VersionedRuleStore()

    # Add 2009 version
    v2009 = RuleVersion(
        id="R76-2009",
        standard_code="OIML R-76",
        version_label="2009",
        effective_date=__import__('datetime').date(2009, 1, 1),
        status=RuleStatus.ACTIVE,
        source=RuleSource.VERIFIED,
        title="OIML R-76 Edition 2009 (Demo)",
        notes="Demonstration rules -- not official regulatory values",
    )
    store.add_version(v2009)

    # Add rules for 2009
    store.add_rule(VersionedComplianceRule(
        id="RPT-III-001-2009",
        rule_version_id="R76-2009",
        test_code="RPT",
        instrument_class=InstrumentClass.III,
        limit_key="max_std_dev",
        limit_value=0.5,
        limit_unit="d",
        description="Max standard deviation for Class III (Demo)",
    ))
    store.add_rule(VersionedComplianceRule(
        id="RPT-II-001-2009",
        rule_version_id="R76-2009",
        test_code="RPT",
        instrument_class=InstrumentClass.II,
        limit_key="max_std_dev",
        limit_value=0.5,
        limit_unit="d",
        description="Max standard deviation for Class II (Demo)",
    ))
    store.add_rule(VersionedComplianceRule(
        id="ECC-III-001-2009",
        rule_version_id="R76-2009",
        test_code="ECC",
        instrument_class=InstrumentClass.III,
        limit_key="max_eccentricity",
        limit_value=1.0,
        limit_unit="d",
        description="Max eccentricity for Class III (Demo)",
    ))

    return store


def print_header(title: str):
    """Print a formatted section header."""
    print("\n" + "=" * 72)
    print(f"  {title}")
    print("=" * 72)


def print_step(step: int, title: str):
    """Print a workflow step."""
    print(f"\n{'-' * 72}")
    print(f"  STEP {step}: {title}")
    print(f"{'-' * 72}")


def print_substep(title: str):
    """Print a sub-step."""
    print(f"\n   {title}")


# ============================================================================
# DEMONSTRATION WORKFLOW
# ============================================================================

def run_demo():
    """Execute the complete demonstration workflow."""
    print("\n" + "#" * 72)
    print("#" + " " * 70 + "#")
    print("#  NAWI Sahayak -- Complete Workflow Demonstration" + " " * 20 + "#")
    print("#  Smart India Hackathon (SIH) -- Problem Statement 26035" + " " * 14 + "#")
    # NOTE: All data below is fictional and for demonstration only
    print("#" + " " * 70 + "#")
    print("#" * 72)
    print(f"\n!  {DEMO_DISCLAIMER}\n")

    # Initialize engines
    calculation_engine = CalculationEngine()
    report_engine = ReportEngine()
    attachment_store = AttachmentStore()
    audit_service = AuditService()
    ai_service = AIAssistanceService(api_key=None)  # Unavailable for demo

    print_header("AVAILABLE DATA")
    print(f"  Laboratories:  {len(DEMO_LABORATORIES)}")
    print(f"  Manufacturers: {len(DEMO_MANUFACTURERS)}")
    print(f"  Instruments:   {len(DEMO_INSTRUMENTS)}")
    print(f"  Equipment:     {len(DEMO_EQUIPMENT)}")
    print(f"  Test Reports:  {len(DEMO_TEST_REPORTS)}")

    # -- DEMO 1: Successful Test (PASS) --
    demo_1_success(calculation_engine, report_engine, attachment_store, audit_service, ai_service)

    # -- DEMO 2: Failed Test (FAIL) --
    demo_2_failure(calculation_engine, report_engine, attachment_store, audit_service, ai_service)

    # -- DEMO 3: Pending Review --
    demo_3_pending(calculation_engine, audit_service, ai_service)

    # -- REPOSITORY --
    demo_repository(audit_service)

    # -- SUMMARY --
    demo_summary(audit_service)


def demo_1_success(engine, report_engine, attachment_store, audit_service, ai_service):
    """Demonstrate a successful test (PASS)."""
    print_header("DEMO 1: SUCCESSFUL TEST -- BWS-3000 Electronic Balance")

    # Step 1: Instrument Entry
    print_step(1, "INSTRUMENT ENTRY")
    instrument = DEMO_INSTRUMENTS[0]
    print_substep(f"Manufacturer: {DEMO_MANUFACTURERS[0].name}")
    print_substep(f"Model: {instrument.model_name}")
    print_substep(f"Serial: {instrument.serial_number}")
    print_substep(f"Class: {instrument.instrument_class}")
    print_substep(f"Capacity: {instrument.max_capacity} {instrument.max_capacity_unit}")
    print_substep(f"Scale Interval (d): {instrument.scale_interval} {instrument.scale_interval_unit}")

    # Record audit
    audit_service.record_instrument_created(
        actor_id="demo-user-001",
        actor_name="Mr. Suresh Patil",
        actor_role="tester",
        instrument_id=instrument.id,
        serial_number=instrument.serial_number,
    )

    # Step 2: Test Observation
    print_step(2, "TEST OBSERVATION")
    test_input = get_demo_test_1_input()
    print_substep(f"Test: Repeatability (RPT)")
    print_substep(f"Test Point: Max capacity ({test_input.test_points[0].reference_value} g)")
    print_substep(f"Observations:")
    for obs in test_input.test_points[0].observations:
        print(f"      #{obs.observation_number}: {obs.value} {obs.unit.value}")

    # Step 3: Validation
    print_step(3, "DATA VALIDATION")
    from engine.validation import InputValidator
    validator = InputValidator()
    validation = validator.validate_test_input(test_input)
    print_substep(f"Validation: {'PASS v' if validation.is_valid else 'FAIL x'}")
    print_substep(f"Errors: {len(validation.errors)}")
    print_substep(f"Warnings: {len(validation.warnings)}")

    # Record audit
    audit_service.record(
        actor_id="demo-user-001",
        actor_name="Mr. Suresh Patil",
        actor_role="tester",
        action=AuditAction.TEST_STARTED,
        entity_type=AuditEntityType.TEST_REPORT,
        entity_id="RPT-DEMO-001",
        entity_label="TST-2024-000001",
    )

    # Step 4: Calculation
    print_step(4, "CALCULATION")
    result = engine.execute(test_input)
    cv = result.calculation_result.calculated_values
    print_substep(f"Mean: {cv.get('mean', 'N/A'):.6f} g")
    print_substep(f"Std Deviation: {cv.get('std_deviation', 'N/A'):.6f} g")
    print_substep(f"Std Dev in d: {cv.get('std_deviation', 0) / test_input.scale_interval:.4f} d")
    print_substep(f"Calculation Status: {result.calculation_result.status.value}")

    # Record audit
    audit_service.record_calculation_executed(
        actor_id="system",
        actor_name="Calculation Engine",
        actor_role="system",
        report_id="RPT-DEMO-001",
        test_code="RPT",
        result={"status": result.calculation_result.status.value},
    )

    # Step 5: Compliance Result
    print_step(5, "COMPLIANCE EVALUATION")
    if result.compliance_result:
        decision = result.compliance_result.overall_status
        print_substep(f"Decision: {decision.value.upper()}")
        if result.compliance_result.decisions:
            for d in result.compliance_result.decisions:
                print_substep(f"  Rule: {d.rule_id} v{d.rule_version}")
                print_substep(f"  Reason: {d.reason}")
    else:
        print_substep(f"Decision: {result.calculation_result.status.value.upper()}")

    # Record audit
    audit_service.record_result_created(
        actor_id="system",
        actor_name="Compliance Engine",
        actor_role="system",
        report_id="RPT-DEMO-001",
        result_data={"decision": result.calculation_result.status.value},
    )

    # Step 6: Review
    print_step(6, "REVIEW")
    print_substep("Reviewer: Dr. Priya Sharma")
    print_substep("Review Status: APPROVED v")
    print_substep("Comments: All test results within OIML R-76 limits for Class III")

    audit_service.record_report_approved(
        actor_id="demo-user-002",
        actor_name="Dr. Priya Sharma",
        actor_role="reviewer",
        report_id="RPT-DEMO-001",
        report_number="TST-2024-000001",
        notes="All test results within OIML R-76 limits for Class III",
    )

    # Step 7: PDF Generation
    print_step(7, "REPORT GENERATION")
    print_substep("Generating PDF report...")
    print_substep("Report Number: TST-2024-000001")
    print_substep("Format: PDF (A4)")
    print_substep("Sections: Header, Instrument Info, Test Conditions, Observations, Calculations, Compliance, Signatures")
    print_substep("Status: Generated v")

    audit_service.record_report_exported(
        actor_id="demo-user-001",
        actor_name="Mr. Suresh Patil",
        actor_role="tester",
        report_id="RPT-DEMO-001",
        report_number="TST-2024-000001",
        format="pdf",
    )

    # Step 8: Attachment
    print_step(8, "ATTACHMENTS")
    att, _ = attachment_store.upload(
        file_name="test_photo_bws3000.jpg",
        file_data=b"fake photo data for demo",
        file_type="image/jpeg",
        entity_type=EntityType.TEST_REPORT,
        entity_id="RPT-DEMO-001",
        category=AttachmentCategory.PHOTO,
        uploaded_by="demo-user-001",
        description="Photo of BWS-3000 during testing",
    )
    print_substep(f"Attached: test_photo_bws3000.jpg")
    print_substep(f"Category: Photo")
    print_substep(f"Checksum: {att.checksum[:16]}...")

    audit_service.record_attachment_uploaded(
        actor_id="demo-user-001",
        actor_name="Mr. Suresh Patil",
        actor_role="tester",
        attachment_id=att.id,
        file_name="test_photo_bws3000.jpg",
        entity_type=AuditEntityType.TEST_REPORT,
        entity_id="RPT-DEMO-001",
    )

    # AI Assistance
    print_substep("\n  AI Assistance (Optional):")
    ai_response = ai_service.explain_compliance_result({
        "test_name": "Repeatability",
        "decision": "pass",
        "calculated_value": cv.get("std_deviation", 0) / test_input.scale_interval,
        "applicable_limit": 0.5,
        "rule_id": "RPT-III-001",
        "rule_version": "2009",
    })
    print_substep(f"  {ai_response.summary}")


def demo_2_failure(engine, report_engine, attachment_store, audit_service, ai_service):
    """Demonstrate a failed test (FAIL)."""
    print_header("DEMO 2: FAILED TEST -- ZPI-2200 Precision Scale")

    instrument = DEMO_INSTRUMENTS[1]
    print_step(1, "INSTRUMENT ENTRY")
    print_substep(f"Manufacturer: {DEMO_MANUFACTURERS[1].name}")
    print_substep(f"Model: {instrument.model_name}")
    print_substep(f"Serial: {instrument.serial_number}")
    print_substep(f"Class: {instrument.instrument_class}")
    print_substep(f"Capacity: {instrument.max_capacity} {instrument.max_capacity_unit}")
    print_substep(f"Scale Interval (d): {instrument.scale_interval} {instrument.scale_interval_unit}")

    print_step(2, "TEST OBSERVATION")
    test_input = get_demo_test_2_input()
    print_substep(f"Test: Repeatability (RPT)")
    print_substep(f"Observations:")
    for obs in test_input.test_points[0].observations:
        print(f"      #{obs.observation_number}: {obs.value} {obs.unit.value}")

    print_step(3, "DATA VALIDATION")
    from engine.validation import InputValidator
    validator = InputValidator()
    validation = validator.validate_test_input(test_input)
    print_substep(f"Validation: {'PASS v' if validation.is_valid else 'FAIL x'}")

    print_step(4, "CALCULATION")
    result = engine.execute(test_input)
    cv = result.calculation_result.calculated_values
    print_substep(f"Mean: {cv.get('mean', 'N/A'):.6f} g")
    print_substep(f"Std Deviation: {cv.get('std_deviation', 'N/A'):.6f} g")
    print_substep(f"Std Dev in d: {cv.get('std_deviation', 0) / test_input.scale_interval:.4f} d")
    print_substep(f"Calculation Status: {result.calculation_result.status.value}")

    print_step(5, "COMPLIANCE EVALUATION")
    if result.compliance_result:
        decision = result.compliance_result.overall_status
        print_substep(f"Decision: {decision.value.upper()}")
        if result.compliance_result.decisions:
            for d in result.compliance_result.decisions:
                print_substep(f"  Rule: {d.rule_id} v{d.rule_version}")
                print_substep(f"  Reason: {d.reason}")
    else:
        print_substep(f"Decision: {result.calculation_result.status.value.upper()}")

    print_step(6, "REVIEW")
    print_substep("Reviewer: Dr. Priya Sharma")
    print_substep("Review Status: REJECTED x")
    print_substep("Comments: Instrument fails repeatability test. std dev exceeds 0.5d limit.")
    print_substep("Action Required: Instrument needs recalibration or repair")

    audit_service.record_report_rejected(
        actor_id="demo-user-002",
        actor_name="Dr. Priya Sharma",
        actor_role="reviewer",
        report_id="RPT-DEMO-002",
        report_number="TST-2024-000002",
        reason="Instrument fails repeatability test. std dev exceeds 0.5d limit.",
    )


def demo_3_pending(engine, audit_service, ai_service):
    """Demonstrate a pending review test."""
    print_header("DEMO 3: PENDING REVIEW -- HRB-100 Mechanical Balance")

    instrument = DEMO_INSTRUMENTS[2]
    print_step(1, "INSTRUMENT ENTRY")
    print_substep(f"Manufacturer: {DEMO_MANUFACTURERS[2].name}")
    print_substep(f"Model: {instrument.model_name}")
    print_substep(f"Serial: {instrument.serial_number}")
    print_substep(f"Class: {instrument.instrument_class}")

    print_step(2, "TEST OBSERVATION")
    test_input = get_demo_test_3_input()
    print_substep(f"Test: Repeatability (RPT)")
    print_substep(f"Observations:")
    for obs in test_input.test_points[0].observations:
        print(f"      #{obs.observation_number}: {obs.value} {obs.unit.value}")

    print_step(3, "STATUS")
    print_substep("Report Status: PENDING REVIEW")
    print_substep("Technician: Ms. Kavita Deshmukh")
    print_substep("Reviewer: Dr. Rajesh Kumar (assigned)")
    print_substep("Waiting for review since: 2024-09-18 16:30 IST")

    audit_service.record_report_submitted(
        actor_id="demo-user-003",
        actor_name="Ms. Kavita Deshmukh",
        actor_role="tester",
        report_id="RPT-DEMO-003",
        report_number="TST-2024-000003",
    )


def demo_repository(audit_service):
    """Demonstrate repository and search."""
    print_header("DEMO 4: REPOSITORY & SEARCH")

    print_substep("Repository contains 3 test reports:")
    for report in DEMO_TEST_REPORTS:
        instrument = next((i for i in DEMO_INSTRUMENTS if i.id == report.instrument_id), None)
        inst_name = instrument.model_name if instrument else "Unknown"
        print(f"      {report.report_number}: {report.status.upper()} -- {inst_name}")

    print_substep("\nSearch Examples:")
    print_substep("  * Search by serial: 'BWS-2024-EL-00147'")
    print_substep("  * Search by manufacturer: 'Bharat'")
    print_substep("  * Filter by status: 'completed'")
    print_substep("  * Filter by result: 'compliant'")

    print_substep("\nInstrument History:")
    print_substep("  BWS-3000 (BWS-2024-EL-00147):")
    print_substep("    * TST-2024-000001: Completed -- Compliant")
    print_substep("    * Total tests: 1")
    print_substep("    * Last tested: 2024-09-15")


def demo_summary(audit_service):
    """Print demonstration summary."""
    print_header("DEMONSTRATION SUMMARY")

    print_substep("Workflow Steps Demonstrated:")
    print_substep("  1. v Instrument Entry")
    print_substep("  2. v Test Observation")
    print_substep("  3. v Data Validation")
    print_substep("  4. v Calculation")
    print_substep("  5. v Compliance Evaluation")
    print_substep("  6. v Review")
    print_substep("  7. v Report Generation")
    print_substep("  8. v Attachments")
    print_substep("  9. v Repository & Search")
    print_substep("  10. v Audit Trail")

    print_substep("\nTest Results:")
    print_substep("  * Demo 1: PASS v -- BWS-3000 Electronic Balance")
    print_substep("  * Demo 2: FAIL x -- ZPI-2200 Precision Scale")
    print_substep("  * Demo 3: PENDING -- HRB-100 Mechanical Balance")

    print_substep(f"\nAudit Events Recorded: {audit_service.event_count}")
    print_substep(f"Checksum Chain Valid: {audit_service.verify_chain()}")

    print("\n" + "=" * 72)
    print("  !  ALL DATA IN THIS DEMONSTRATION IS FICTIONAL")
    print("  Created for Smart India Hackathon (SIH) presentation only.")
    print("=" * 72 + "\n")


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    run_demo()
