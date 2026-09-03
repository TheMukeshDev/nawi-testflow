"""
NAWI TestFlow — Report Snapshot

Creates immutable snapshots of report data before finalization.
Ensures finalized reports are reproducible and auditable.

Features:
- JSON serialization of complete report data
- SHA-256 checksums for tamper detection
- Snapshot storage with timestamps
- Reproducible report generation from snapshot
"""

import hashlib
import json
from datetime import datetime, date
from dataclasses import dataclass, field, asdict
from typing import Optional, Any
from io import BytesIO

from .report_models import (
    TestReport, TestResult, TestProcedure, Observation,
    ReportIdentification, LaboratoryInfo, InstrumentInfo,
    TestConditions, TestEquipment, ComplianceResult,
    Signature, Attachment, ReportMetadata
)


@dataclass
class ReportSnapshot:
    """Immutable snapshot of report data."""
    
    # Identification
    snapshot_id: str
    report_number: str
    
    # Data
    report_data: dict  # Serialized TestReport
    
    # Checksums
    data_checksum: str  # SHA-256 of report_data
    pdf_checksum: Optional[str] = None
    docx_checksum: Optional[str] = None
    
    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    finalized_at: Optional[datetime] = None
    
    # Metadata
    version: str = "1.0"
    status: str = "draft"  # draft, finalized, archived
    notes: Optional[str] = None


class ReportSnapshotManager:
    """
    Manages report snapshots for reproducibility and audit.
    
    When a report is finalized:
    1. Create a snapshot of the complete report data
    2. Calculate checksums for integrity verification
    3. Store the snapshot as an immutable record
    4. Any future generation must use this exact snapshot
    """
    
    def __init__(self):
        self._snapshots: dict[str, ReportSnapshot] = {}
    
    def create_snapshot(self, report: TestReport, report_number: str) -> ReportSnapshot:
        """
        Create a snapshot of report data.
        
        Args:
            report: Complete test report data
            report_number: Unique report number
            
        Returns:
            ReportSnapshot with checksums
        """
        # Serialize report data
        report_data = self._serialize_report(report)
        
        # Calculate data checksum
        data_json = json.dumps(report_data, sort_keys=True, default=str)
        data_checksum = hashlib.sha256(data_json.encode()).hexdigest()
        
        # Create snapshot
        snapshot = ReportSnapshot(
            snapshot_id="SNAP-{}-{}".format(report_number, datetime.utcnow().strftime("%Y%m%d%H%M%S")),
            report_number=report_number,
            report_data=report_data,
            data_checksum=data_checksum,
            created_at=datetime.utcnow(),
            status="draft",
        )
        
        self._snapshots[snapshot.snapshot_id] = snapshot
        
        return snapshot
    
    def finalize_snapshot(
        self,
        snapshot_id: str,
        pdf_checksum: Optional[str] = None,
        docx_checksum: Optional[str] = None,
    ) -> ReportSnapshot:
        """
        Finalize a snapshot (make it immutable).
        
        Args:
            snapshot_id: ID of the snapshot to finalize
            pdf_checksum: Checksum of generated PDF
            docx_checksum: Checksum of generated DOCX
            
        Returns:
            Finalized ReportSnapshot
        """
        snapshot = self._snapshots.get(snapshot_id)
        if snapshot is None:
            raise ValueError("Snapshot {} not found".format(snapshot_id))
        
        if snapshot.status == "finalized":
            raise ValueError("Snapshot {} is already finalized".format(snapshot_id))
        
        snapshot.status = "finalized"
        snapshot.finalized_at = datetime.utcnow()
        snapshot.pdf_checksum = pdf_checksum
        snapshot.docx_checksum = docx_checksum
        
        return snapshot
    
    def get_snapshot(self, snapshot_id: str) -> Optional[ReportSnapshot]:
        """Get a snapshot by ID."""
        return self._snapshots.get(snapshot_id)
    
    def get_snapshot_by_report(self, report_number: str) -> Optional[ReportSnapshot]:
        """Get the finalized snapshot for a report number."""
        for snapshot in self._snapshots.values():
            if snapshot.report_number == report_number and snapshot.status == "finalized":
                return snapshot
        return None
    
    def verify_checksum(self, snapshot_id: str) -> bool:
        """
        Verify snapshot data integrity.
        
        Returns:
            True if checksum matches
        """
        snapshot = self._snapshots.get(snapshot_id)
        if snapshot is None:
            return False
        
        data_json = json.dumps(snapshot.report_data, sort_keys=True, default=str)
        calculated_checksum = hashlib.sha256(data_json.encode()).hexdigest()
        
        return calculated_checksum == snapshot.data_checksum
    
    def recreate_report(self, snapshot_id: str) -> Optional[TestReport]:
        """
        Recreate a TestReport from a snapshot.
        
        This ensures reproducibility — the same snapshot always produces
        the same report.
        
        Args:
            snapshot_id: ID of the snapshot
            
        Returns:
            TestReport if snapshot exists, None otherwise
        """
        snapshot = self._snapshots.get(snapshot_id)
        if snapshot is None:
            return None
        
        # Verify integrity
        if not self.verify_checksum(snapshot_id):
            raise ValueError("Snapshot {} failed integrity check".format(snapshot_id))
        
        return self._deserialize_report(snapshot.report_data)
    
    def _serialize_report(self, report: TestReport) -> dict:
        """Serialize a TestReport to a dictionary."""
        return {
            'identification': {
                'report_number': report.identification.report_number,
                'report_date': report.identification.report_date.isoformat(),
                'standard': report.identification.standard,
                'standard_version': report.identification.standard_version,
                'revision': report.identification.revision,
            },
            'laboratory': {
                'name': report.laboratory.name,
                'address': report.laboratory.address,
                'city': report.laboratory.city,
                'state': report.laboratory.state,
                'country': report.laboratory.country,
                'postal_code': report.laboratory.postal_code,
                'phone': report.laboratory.phone,
                'email': report.laboratory.email,
                'accreditation_body': report.laboratory.accreditation_body,
                'accreditation_number': report.laboratory.accreditation_number,
                'accreditation_expiry': report.laboratory.accreditation_expiry.isoformat() if report.laboratory.accreditation_expiry else None,
            },
            'instrument': {
                'manufacturer': {
                    'name': report.instrument.manufacturer.name,
                    'country': report.instrument.manufacturer.country,
                    'address': report.instrument.manufacturer.address,
                },
                'model_name': report.instrument.model_name,
                'model_number': report.instrument.model_number,
                'serial_number': report.instrument.serial_number,
                'instrument_type': report.instrument.instrument_type,
                'instrument_class': report.instrument.instrument_class,
                'max_capacity': report.instrument.max_capacity,
                'max_capacity_unit': report.instrument.max_capacity_unit,
                'min_capacity': report.instrument.min_capacity,
                'min_capacity_unit': report.instrument.min_capacity_unit,
                'scale_interval': report.instrument.scale_interval,
                'scale_interval_unit': report.instrument.scale_interval_unit,
                'verification_scale_interval': report.instrument.verification_scale_interval,
                'verification_scale_interval_unit': report.instrument.verification_scale_interval_unit,
            },
            'conditions': {
                'conditions': [
                    {
                        'parameter': c.parameter,
                        'value': c.value,
                        'unit': c.unit,
                        'min_value': c.min_value,
                        'max_value': c.max_value,
                        'status': c.status,
                    }
                    for c in report.conditions.conditions
                ],
                'test_location': report.conditions.test_location,
                'location_detail': report.conditions.location_detail,
                'test_date': report.conditions.test_date.isoformat() if report.conditions.test_date else None,
                'start_time': report.conditions.start_time,
                'end_time': report.conditions.end_time,
            },
            'equipment': {
                'items': [
                    {
                        'equipment_id': e.equipment_id,
                        'name': e.name,
                        'equipment_type': e.equipment_type,
                        'serial_number': e.serial_number,
                        'calibration_date': e.calibration_date.isoformat() if e.calibration_date else None,
                        'calibration_valid_until': e.calibration_valid_until.isoformat() if e.calibration_valid_until else None,
                    }
                    for e in report.equipment.items
                ],
            },
            'results': [
                {
                    'procedure': {
                        'test_code': r.procedure.test_code,
                        'test_name': r.procedure.test_name,
                        'purpose': r.procedure.purpose,
                    },
                    'observations': [
                        {
                            'observation_number': o.observation_number,
                            'value': o.value,
                            'unit': o.unit,
                            'notes': o.notes,
                        }
                        for o in r.observations
                    ],
                    'mean': r.mean,
                    'min_value': r.min_value,
                    'max_value': r.max_value,
                    'range_value': r.range_value,
                    'standard_deviation': r.standard_deviation,
                    'calculated_in_d': r.calculated_in_d,
                    'limit_value': r.limit_value,
                    'limit_unit': r.limit_unit,
                    'rule_id': r.rule_id,
                    'rule_version': r.rule_version,
                    'status': r.status,
                    'reason': r.reason,
                }
                for r in report.results
            ],
            'compliance': {
                'overall_status': report.compliance.overall_status if report.compliance else None,
                'remarks': report.compliance.remarks if report.compliance else '',
            } if report.compliance else None,
            'remarks': report.remarks,
            'metadata': {
                'generated_at': report.metadata.generated_at.isoformat(),
                'generated_by': report.metadata.generated_by,
                'version': report.metadata.version,
            },
        }
    
    def _deserialize_report(self, data: dict) -> TestReport:
        """Deserialize a dictionary back to a TestReport."""
        # Identification
        identification = ReportIdentification(
            report_number=data['identification']['report_number'],
            report_date=date.fromisoformat(data['identification']['report_date']),
            standard=data['identification']['standard'],
            standard_version=data['identification']['standard_version'],
            revision=data['identification']['revision'],
        )
        
        # Laboratory
        lab_data = data['laboratory']
        laboratory = LaboratoryInfo(
            name=lab_data['name'],
            address=lab_data['address'],
            city=lab_data['city'],
            state=lab_data['state'],
            country=lab_data['country'],
            postal_code=lab_data['postal_code'],
            phone=lab_data['phone'],
            email=lab_data['email'],
            accreditation_body=lab_data['accreditation_body'],
            accreditation_number=lab_data['accreditation_number'],
            accreditation_expiry=date.fromisoformat(lab_data['accreditation_expiry']) if lab_data.get('accreditation_expiry') else None,
        )
        
        # Instrument
        inst_data = data['instrument']
        instrument = InstrumentInfo(
            manufacturer=ManufacturerInfo(
                name=inst_data['manufacturer']['name'],
                country=inst_data['manufacturer']['country'],
                address=inst_data['manufacturer']['address'],
            ),
            model_name=inst_data['model_name'],
            model_number=inst_data['model_number'],
            serial_number=inst_data['serial_number'],
            instrument_type=inst_data['instrument_type'],
            instrument_class=inst_data['instrument_class'],
            max_capacity=inst_data['max_capacity'],
            max_capacity_unit=inst_data['max_capacity_unit'],
            min_capacity=inst_data['min_capacity'],
            min_capacity_unit=inst_data['min_capacity_unit'],
            scale_interval=inst_data['scale_interval'],
            scale_interval_unit=inst_data['scale_interval_unit'],
            verification_scale_interval=inst_data.get('verification_scale_interval'),
            verification_scale_interval_unit=inst_data.get('verification_scale_interval_unit'),
        )
        
        # Conditions
        cond_data = data['conditions']
        conditions = TestConditions(
            conditions=[
                TestCondition(
                    parameter=c['parameter'],
                    value=c['value'],
                    unit=c['unit'],
                    min_value=c.get('min_value'),
                    max_value=c.get('max_value'),
                    status=c['status'],
                )
                for c in cond_data['conditions']
            ],
            test_location=cond_data['test_location'],
            location_detail=cond_data['location_detail'],
            test_date=date.fromisoformat(cond_data['test_date']) if cond_data.get('test_date') else None,
            start_time=cond_data.get('start_time'),
            end_time=cond_data.get('end_time'),
        )
        
        # Equipment
        equip_data = data['equipment']
        equipment = TestEquipment(
            items=[
                TestEquipmentItem(
                    equipment_id=e['equipment_id'],
                    name=e['name'],
                    equipment_type=e['equipment_type'],
                    serial_number=e['serial_number'],
                    calibration_date=date.fromisoformat(e['calibration_date']) if e.get('calibration_date') else None,
                    calibration_valid_until=date.fromisoformat(e['calibration_valid_until']) if e.get('calibration_valid_until') else None,
                )
                for e in equip_data['items']
            ],
        )
        
        # Results
        results = []
        for r in data.get('results', []):
            result = TestResult(
                procedure=TestProcedure(
                    test_code=r['procedure']['test_code'],
                    test_name=r['procedure']['test_name'],
                    purpose=r['procedure'].get('purpose', ''),
                ),
                observations=[
                    Observation(
                        observation_number=o['observation_number'],
                        value=o['value'],
                        unit=o['unit'],
                        notes=o.get('notes'),
                    )
                    for o in r.get('observations', [])
                ],
                mean=r.get('mean'),
                min_value=r.get('min_value'),
                max_value=r.get('max_value'),
                range_value=r.get('range_value'),
                standard_deviation=r.get('standard_deviation'),
                calculated_in_d=r.get('calculated_in_d'),
                limit_value=r.get('limit_value'),
                limit_unit=r.get('limit_unit', ''),
                rule_id=r.get('rule_id', ''),
                rule_version=r.get('rule_version', ''),
                status=r.get('status', ''),
                reason=r.get('reason', ''),
            )
            results.append(result)
        
        # Compliance
        compliance = None
        if data.get('compliance'):
            compliance = ComplianceResult(
                overall_status=data['compliance']['overall_status'],
                remarks=data['compliance'].get('remarks', ''),
            )
        
        # Metadata
        meta_data = data.get('metadata', {})
        metadata = ReportMetadata(
            generated_at=datetime.fromisoformat(meta_data['generated_at']) if meta_data.get('generated_at') else datetime.utcnow(),
            generated_by=meta_data.get('generated_by', 'system'),
            version=meta_data.get('version', '1.0'),
        )
        
        return TestReport(
            identification=identification,
            laboratory=laboratory,
            instrument=instrument,
            conditions=conditions,
            equipment=equipment,
            results=results,
            compliance=compliance,
            remarks=data.get('remarks', ''),
            metadata=metadata,
        )


# Import at module level to avoid circular imports
from .report_models import ManufacturerInfo, TestCondition, TestEquipmentItem
