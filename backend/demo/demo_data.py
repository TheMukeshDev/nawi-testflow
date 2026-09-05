"""
NAWI Sahayak -- Demonstration Data

! ALL DATA IN THIS FILE IS FICTIONAL AND FOR DEMONSTRATION ONLY !

This module contains realistic but completely fictional data for showcasing
the NAWI Sahayak application at the Smart India Hackathon (SIH).

NO real regulatory data, laboratory data, or test results are represented.

Demonstration scenarios:
1. Successful test (PASS) -- Electronic balance, Class III
2. Failed test (FAIL) -- Precision scale, Class II
3. Pending review -- Mechanical balance, Class III
"""

from dataclasses import dataclass, field
from datetime import datetime, date, time
from typing import Optional

from engine.types import (
    TestInput, TestPointInput, RawObservation, MassUnit,
    InstrumentClass, TestStatusCode,
)


# ============================================================================
# DISCLAIMER
# ============================================================================

DEMO_DISCLAIMER = (
    "DEMONSTRATION DATA ONLY -- All data in this module is fictional. "
    "No real regulatory, laboratory, or test data is represented. "
    "Created for Smart India Hackathon (SIH) presentation purposes."
)


# ============================================================================
# FICTIONAL LABORATORIES
# ============================================================================

@dataclass
class DemoLaboratory:
    """Fictional laboratory for demonstration."""
    id: str
    name: str
    code: str
    address: str
    city: str
    state: str
    country: str
    accreditation_body: Optional[str]
    accreditation_number: Optional[str]
    accreditation_valid_until: Optional[str]
    contact_person: str
    phone: str
    email: str
    is_active: bool = True

DEMO_LABORATORIES = [
    DemoLaboratory(
        id="LAB-DEMO-001",
        name="Precision Metrics Testing Laboratory",
        code="PMTL-PUNE-01",
        address="123 Instrumentation Park, Hinjewadi Phase III",
        city="Pune",
        state="Maharashtra",
        country="India",
        accreditation_body="NABL (National Accreditation Board for Testing and Calibration Laboratories)",
        accreditation_number="NABL-T-2024-DEMO-001",
        accreditation_valid_until="2026-12-31",
        contact_person="Dr. Priya Sharma",
        phone="+91-20-5555-0123",
        email="contact@pmtl-demo.example.in",
    ),
    DemoLaboratory(
        id="LAB-DEMO-002",
        name="National Instrumentation Test Centre",
        code="NITC-DEL-01",
        address="456 Metro Station Road, Sector 15",
        city="New Delhi",
        state="Delhi",
        country="India",
        accreditation_body="NABL",
        accreditation_number="NABL-T-2024-DEMO-002",
        accreditation_valid_until="2027-06-30",
        contact_person="Dr. Rajesh Kumar",
        phone="+91-11-5555-0456",
        email="info@nitc-demo.example.in",
    ),
]


# ============================================================================
# FICTIONAL MANUFACTURERS
# ============================================================================

@dataclass
class DemoManufacturer:
    """Fictional manufacturer for demonstration."""
    id: str
    name: str
    country: str
    address: Optional[str]
    website: Optional[str]
    contact_person: Optional[str]
    phone: Optional[str]
    email: Optional[str]

DEMO_MANUFACTURERS = [
    DemoManufacturer(
        id="MFR-DEMO-001",
        name="Bharat Weigh Systems Pvt. Ltd.",
        country="India",
        address="789 Industrial Area, Peenya, Bangalore 560058",
        website="www.bws-demo.example.in",
        contact_person="Mr. Anand Patel",
        phone="+91-80-5555-0789",
        email="sales@bws-demo.example.in",
    ),
    DemoManufacturer(
        id="MFR-DEMO-002",
        name="Zenith Precision Instruments GmbH",
        country="Germany",
        address="Industriestrae 42, 71034 Bblingen",
        website="www.zpi-demo.example.de",
        contact_person="Herr Stefan Mueller",
        phone="+49-7031-5555-001",
        email="info@zpi-demo.example.de",
    ),
    DemoManufacturer(
        id="MFR-DEMO-003",
        name="Hindustan Scientific Equipment Co.",
        country="India",
        address="321 MIDC, Ambad, Nashik 422010",
        website="www.hse-demo.example.in",
        contact_person="Ms. Deepa Nair",
        phone="+91-253-5555-0321",
        email="enquiries@hse-demo.example.in",
    ),
]


# ============================================================================
# FICTIONAL INSTRUMENTS
# ============================================================================

@dataclass
class DemoInstrument:
    """Fictional instrument for demonstration."""
    id: str
    serial_number: str
    asset_tag: str
    manufacturer_id: str
    model_name: str
    model_number: str
    instrument_type: str  # electronic, mechanical, electromechanical
    instrument_class: str  # I, II, III, IIII, IIIIL
    max_capacity: float
    max_capacity_unit: str
    min_capacity: float
    min_capacity_unit: str
    scale_interval: float
    scale_interval_unit: str
    verification_scale_interval: Optional[float]
    verification_scale_interval_unit: Optional[str]
    number_of_verification_intervals: Optional[int]
    software_version: Optional[str]
    firmware_version: Optional[str]
    laboratory_id: str
    condition: str
    date_received: str
    last_calibration: Optional[str]
    next_calibration: Optional[str]

DEMO_INSTRUMENTS = [
    # Instrument 1: Class III Electronic Balance (will PASS)
    DemoInstrument(
        id="INST-DEMO-001",
        serial_number="BWS-2024-EL-00147",
        asset_tag="PMTL-IB-001",
        manufacturer_id="MFR-DEMO-001",
        model_name="BWS-3000 Electronic Balance",
        model_number="BWS-3000-III",
        instrument_type="electronic",
        instrument_class="III",
        max_capacity=3000,
        max_capacity_unit="g",
        min_capacity=0.1,
        min_capacity_unit="g",
        scale_interval=0.01,
        scale_interval_unit="g",
        verification_scale_interval=0.1,
        verification_scale_interval_unit="g",
        number_of_verification_intervals=30000,
        software_version="v2.4.1",
        firmware_version="FW-3.2.0",
        laboratory_id="LAB-DEMO-001",
        condition="good",
        date_received="2024-08-15",
        last_calibration="2024-07-20",
        next_calibration="2025-07-20",
    ),
    # Instrument 2: Class II Precision Scale (will FAIL)
    DemoInstrument(
        id="INST-DEMO-002",
        serial_number="ZPI-2024-PR-00089",
        asset_tag="PMTL-IB-002",
        manufacturer_id="MFR-DEMO-002",
        model_name="ZPI-2200 Precision Scale",
        model_number="ZPI-2200-II",
        instrument_type="electronic",
        instrument_class="II",
        max_capacity=2200,
        max_capacity_unit="g",
        min_capacity=0.01,
        min_capacity_unit="g",
        scale_interval=0.001,
        scale_interval_unit="g",
        verification_scale_interval=0.01,
        verification_scale_interval_unit="g",
        number_of_verification_intervals=220000,
        software_version="v4.1.0",
        firmware_version="FW-5.0.2",
        laboratory_id="LAB-DEMO-001",
        condition="good",
        date_received="2024-09-01",
        last_calibration="2024-08-10",
        next_calibration="2025-08-10",
    ),
    # Instrument 3: Class III Mechanical Balance (pending review)
    DemoInstrument(
        id="INST-DEMO-003",
        serial_number="HSE-2023-MC-00234",
        asset_tag="NITC-IB-001",
        manufacturer_id="MFR-DEMO-003",
        model_name="Hindustan Robatic Balance",
        model_number="HRB-100-III",
        instrument_type="mechanical",
        instrument_class="III",
        max_capacity=100,
        max_capacity_unit="kg",
        min_capacity=0.05,
        min_capacity_unit="kg",
        scale_interval=0.005,
        scale_interval_unit="kg",
        verification_scale_interval=0.05,
        verification_scale_interval_unit="kg",
        number_of_verification_intervals=2000,
        software_version=None,
        firmware_version=None,
        laboratory_id="LAB-DEMO-002",
        condition="good",
        date_received="2024-06-10",
        last_calibration="2024-05-15",
        next_calibration="2025-05-15",
    ),
]


# ============================================================================
# FICTIONAL TEST EQUIPMENT
# ============================================================================

@dataclass
class DemoEquipment:
    """Fictional test equipment for demonstration."""
    id: str
    equipment_id: str
    name: str
    equipment_type: str
    manufacturer: str
    model: str
    serial_number: str
    nominal_value: Optional[float]
    nominal_value_unit: Optional[str]
    calibration_date: Optional[str]
    calibration_valid_until: Optional[str]
    certificate_number: Optional[str]
    laboratory_id: str
    condition: str

DEMO_EQUIPMENT = [
    DemoEquipment(
        id="EQP-DEMO-001",
        equipment_id="STD-WT-A-001",
        name="Standard Weight Set A (E2 Class)",
        equipment_type="standard-weight",
        manufacturer="Hindustan Scientific Equipment Co.",
        model="HRW-E2-SET-A",
        serial_number="HSE-WT-2024-001",
        nominal_value=1000,
        nominal_value_unit="g",
        calibration_date="2024-06-01",
        calibration_valid_until="2025-06-01",
        certificate_number="NPL-CAL-2024-DEMO-001",
        laboratory_id="LAB-DEMO-001",
        condition="good",
    ),
    DemoEquipment(
        id="EQP-DEMO-002",
        equipment_id="STD-WT-B-001",
        name="Standard Weight Set B (M2 Class)",
        equipment_type="standard-weight",
        manufacturer="Bharat Weigh Systems Pvt. Ltd.",
        model="BWS-WT-M2-SET-B",
        serial_number="BWS-WT-2024-002",
        nominal_value=500,
        nominal_value_unit="kg",
        calibration_date="2024-05-15",
        calibration_valid_until="2025-05-15",
        certificate_number="NPL-CAL-2024-DEMO-002",
        laboratory_id="LAB-DEMO-001",
        condition="good",
    ),
    DemoEquipment(
        id="EQP-DEMO-003",
        equipment_id="ENV-MON-001",
        name="Environmental Monitor",
        equipment_type="measurement-device",
        manufacturer="Zenith Precision Instruments GmbH",
        model="ZPI-ENV-200",
        serial_number="ZPI-ENV-2024-001",
        nominal_value=None,
        nominal_value_unit=None,
        calibration_date="2024-07-01",
        calibration_valid_until="2025-07-01",
        certificate_number="ZPI-CAL-2024-DEMO-001",
        laboratory_id="LAB-DEMO-001",
        condition="good",
    ),
]


# ============================================================================
# FICTIONAL TEST CONDITIONS
# ============================================================================

@dataclass
class DemoTestConditions:
    """Fictional test conditions for demonstration."""
    id: str
    temperature: float
    temperature_unit: str
    humidity: float
    air_pressure: Optional[float]
    air_pressure_unit: Optional[str]
    test_location: str
    test_location_detail: str
    laboratory_id: str
    test_date: str
    test_start_time: str
    test_end_time: Optional[str]
    recorded_by_name: str
    notes: Optional[str]

DEMO_TEST_CONDITIONS = [
    # Conditions for test 1 (PASS)
    DemoTestConditions(
        id="TCOND-DEMO-001",
        temperature=23.2,
        temperature_unit="C",
        humidity=45.5,
        air_pressure=1013.2,
        air_pressure_unit="hPa",
        test_location="Calibration Laboratory A",
        test_location_detail="Bench 3, Zone 2",
        laboratory_id="LAB-DEMO-001",
        test_date="2024-09-15",
        test_start_time="09:30",
        test_end_time="11:45",
        recorded_by_name="Mr. Suresh Patil",
        notes="Environmental conditions within acceptable range per OIML R-76",
    ),
    # Conditions for test 2 (FAIL)
    DemoTestConditions(
        id="TCOND-DEMO-002",
        temperature=24.8,
        temperature_unit="C",
        humidity=52.3,
        air_pressure=1012.8,
        air_pressure_unit="hPa",
        test_location="Calibration Laboratory A",
        test_location_detail="Bench 5, Zone 1",
        laboratory_id="LAB-DEMO-001",
        test_date="2024-09-16",
        test_start_time="10:00",
        test_end_time="12:30",
        recorded_by_name="Mr. Suresh Patil",
        notes="Temperature slightly elevated but within operating range",
    ),
    # Conditions for test 3 (Pending)
    DemoTestConditions(
        id="TCOND-DEMO-003",
        temperature=22.5,
        temperature_unit="C",
        humidity=48.0,
        air_pressure=1013.5,
        air_pressure_unit="hPa",
        test_location="Metrology Laboratory B",
        test_location_detail="Main Hall, Station 2",
        laboratory_id="LAB-DEMO-002",
        test_date="2024-09-18",
        test_start_time="14:00",
        test_end_time=None,
        recorded_by_name="Ms. Kavita Deshmukh",
        notes="Testing in progress",
    ),
]


# ============================================================================
# FICTIONAL TEST OBSERVATIONS
# ============================================================================

# Test 1: Repeatability PASS (BWS-3000, Class III)
# Scale interval d = 0.01 g
# Observations at Max capacity (3000 g)
# Expected: PASS (std dev well within 0.5d limit)

TEST_1_RPT_OBSERVATIONS = [
    RawObservation(value=3000.002, unit=MassUnit.G, observation_number=1, notes="Initial reading"),
    RawObservation(value=3000.001, unit=MassUnit.G, observation_number=2, notes="Second reading"),
    RawObservation(value=3000.003, unit=MassUnit.G, observation_number=3, notes="Third reading"),
    RawObservation(value=3000.002, unit=MassUnit.G, observation_number=4, notes="Fourth reading"),
    RawObservation(value=3000.001, unit=MassUnit.G, observation_number=5, notes="Fifth reading"),
]

TEST_1_ECC_OBSERVATIONS = {
    "center": [
        RawObservation(value=3000.001, unit=MassUnit.G, observation_number=1),
    ],
    "front": [
        RawObservation(value=3000.005, unit=MassUnit.G, observation_number=1),
    ],
    "rear": [
        RawObservation(value=3000.003, unit=MassUnit.G, observation_number=1),
    ],
    "left": [
        RawObservation(value=3000.004, unit=MassUnit.G, observation_number=1),
    ],
    "right": [
        RawObservation(value=3000.002, unit=MassUnit.G, observation_number=1),
    ],
}

# Test 2: Repeatability FAIL (ZPI-2200, Class II)
# Scale interval d = 0.001 g
# Observations at Max capacity (2200 g)
# Expected: FAIL (std dev exceeds 0.5d limit)

TEST_2_RPT_OBSERVATIONS = [
    RawObservation(value=2200.005, unit=MassUnit.G, observation_number=1, notes="Reading 1"),
    RawObservation(value=2200.015, unit=MassUnit.G, observation_number=2, notes="Reading 2"),
    RawObservation(value=2200.008, unit=MassUnit.G, observation_number=3, notes="Reading 3"),
    RawObservation(value=2200.012, unit=MassUnit.G, observation_number=4, notes="Reading 4"),
    RawObservation(value=2200.010, unit=MassUnit.G, observation_number=5, notes="Reading 5"),
]

# Test 3: Pending Review (HRB-100, Class III)
# Scale interval d = 0.005 kg
# Observations at Max capacity (100 kg)
# Status: Incomplete (testing in progress)

TEST_3_RPT_OBSERVATIONS = [
    RawObservation(value=100.005, unit=MassUnit.KG, observation_number=1, notes="First load"),
    RawObservation(value=100.003, unit=MassUnit.KG, observation_number=2, notes="Second load"),
    RawObservation(value=100.006, unit=MassUnit.KG, observation_number=3, notes="Third load"),
]


# ============================================================================
# FICTIONAL TEST REPORTS
# ============================================================================

@dataclass
class DemoTestReport:
    """Fictional test report for demonstration."""
    id: str
    report_number: str
    instrument_id: str
    laboratory_id: str
    verification_type: str
    test_standard: str
    test_standard_version: str
    status: str
    compliance_result: Optional[str]
    assigned_technician_name: str
    assigned_reviewer_name: Optional[str]
    created_at: str
    submitted_at: Optional[str]
    reviewed_at: Optional[str]
    completed_at: Optional[str]

DEMO_TEST_REPORTS = [
    # Report 1: PASS
    DemoTestReport(
        id="RPT-DEMO-001",
        report_number="TST-2024-000001",
        instrument_id="INST-DEMO-001",
        laboratory_id="LAB-DEMO-001",
        verification_type="initial",
        test_standard="OIML R-76",
        test_standard_version="2009",
        status="completed",
        compliance_result="compliant",
        assigned_technician_name="Mr. Suresh Patil",
        assigned_reviewer_name="Dr. Priya Sharma",
        created_at="2024-09-15T09:30:00+05:30",
        submitted_at="2024-09-15T12:00:00+05:30",
        reviewed_at="2024-09-15T14:30:00+05:30",
        completed_at="2024-09-15T15:00:00+05:30",
    ),
    # Report 2: FAIL
    DemoTestReport(
        id="RPT-DEMO-002",
        report_number="TST-2024-000002",
        instrument_id="INST-DEMO-002",
        laboratory_id="LAB-DEMO-001",
        verification_type="subsequent",
        test_standard="OIML R-76",
        test_standard_version="2009",
        status="completed",
        compliance_result="non-compliant",
        assigned_technician_name="Mr. Suresh Patil",
        assigned_reviewer_name="Dr. Priya Sharma",
        created_at="2024-09-16T10:00:00+05:30",
        submitted_at="2024-09-16T12:45:00+05:30",
        reviewed_at="2024-09-16T15:00:00+05:30",
        completed_at="2024-09-16T15:30:00+05:30",
    ),
    # Report 3: Pending Review
    DemoTestReport(
        id="RPT-DEMO-003",
        report_number="TST-2024-000003",
        instrument_id="INST-DEMO-003",
        laboratory_id="LAB-DEMO-002",
        verification_type="initial",
        test_standard="OIML R-76",
        test_standard_version="2009",
        status="pending-review",
        compliance_result=None,
        assigned_technician_name="Ms. Kavita Deshmukh",
        assigned_reviewer_name="Dr. Rajesh Kumar",
        created_at="2024-09-18T14:00:00+05:30",
        submitted_at="2024-09-18T16:30:00+05:30",
        reviewed_at=None,
        completed_at=None,
    ),
]


# ============================================================================
# GOLDEN INPUTS FOR DEMONSTRATION
# ============================================================================

def get_demo_test_1_input() -> TestInput:
    """Get TestInput for demo test 1 (PASS case)."""
    return TestInput(
        test_code="RPT",
        instrument_class=InstrumentClass.III,
        max_capacity=3000,
        max_capacity_unit=MassUnit.G,
        scale_interval=0.01,
        scale_interval_unit=MassUnit.G,
        verification_scale_interval=0.1,
        verification_scale_interval_unit=MassUnit.G,
        test_points=[
            TestPointInput(
                point_label="Max (3000g)",
                reference_value=3000,
                unit=MassUnit.G,
                observations=TEST_1_RPT_OBSERVATIONS,
            ),
        ],
    )


def get_demo_test_2_input() -> TestInput:
    """Get TestInput for demo test 2 (FAIL case)."""
    return TestInput(
        test_code="RPT",
        instrument_class=InstrumentClass.II,
        max_capacity=2200,
        max_capacity_unit=MassUnit.G,
        scale_interval=0.001,
        scale_interval_unit=MassUnit.G,
        verification_scale_interval=0.01,
        verification_scale_interval_unit=MassUnit.G,
        test_points=[
            TestPointInput(
                point_label="Max (2200g)",
                reference_value=2200,
                unit=MassUnit.G,
                observations=TEST_2_RPT_OBSERVATIONS,
            ),
        ],
    )


def get_demo_test_3_input() -> TestInput:
    """Get TestInput for demo test 3 (Pending case)."""
    return TestInput(
        test_code="RPT",
        instrument_class=InstrumentClass.III,
        max_capacity=100,
        max_capacity_unit=MassUnit.KG,
        scale_interval=0.005,
        scale_interval_unit=MassUnit.KG,
        verification_scale_interval=0.05,
        verification_scale_interval_unit=MassUnit.KG,
        test_points=[
            TestPointInput(
                point_label="Max (100kg)",
                reference_value=100,
                unit=MassUnit.KG,
                observations=TEST_3_RPT_OBSERVATIONS,
            ),
        ],
    )


# ============================================================================
# SUMMARY
# ============================================================================

def print_demo_summary():
    """Print summary of all demo data."""
    print("\n" + "=" * 72)
    print("NAWI Sahayak -- Demonstration Data Summary")
    print("=" * 72)
    print(f"\n!  {DEMO_DISCLAIMER}\n")

    print(f"Laboratories:  {len(DEMO_LABORATORIES)}")
    print(f"Manufacturers: {len(DEMO_MANUFACTURERS)}")
    print(f"Instruments:   {len(DEMO_INSTRUMENTS)}")
    print(f"Equipment:     {len(DEMO_EQUIPMENT)}")
    print(f"Test Reports:  {len(DEMO_TEST_REPORTS)}")

    print("\n" + "-" * 72)
    print("Test Reports:")
    print("-" * 72)
    for report in DEMO_TEST_REPORTS:
        instrument = next((i for i in DEMO_INSTRUMENTS if i.id == report.instrument_id), None)
        inst_name = instrument.model_name if instrument else "Unknown"
        print(f"  {report.report_number}: {report.status.upper()} -- {inst_name}")
        print(f"    Compliance: {report.compliance_result or 'Pending'}")
        print(f"    Technician: {report.assigned_technician_name}")
        print()

    print("=" * 72)


if __name__ == "__main__":
    print_demo_summary()
