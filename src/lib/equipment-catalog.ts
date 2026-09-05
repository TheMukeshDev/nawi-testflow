/**
 * NAWI Sahayak — Static equipment catalog
 *
 * Equipment = calibration weights, standards, and test accessories.
 * NOTE: There is currently NO equipment catalog table in the database.
 * `test_equipment` is per-report equipment (FK to test_reports) and has no
 * rows. Until an `equipment` catalog table is added, this module is the
 * single source of truth so list/detail/edit pages always show consistent
 * data for the same record.
 */

export type EquipmentCondition = 'good' | 'needs-repair' | 'out-of-service';

export interface EquipmentRecord {
  id: string;
  equipmentId: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  calibrationDate: string;
  calibrationValidUntil: string;
  calibrationCertificateRef: string;
  laboratoryId: string;
  laboratoryCode: string;
  laboratoryName: string;
  condition: EquipmentCondition;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const EQUIPMENT_RECORDS: EquipmentRecord[] = [
  {
    id: '1',
    equipmentId: 'STD-E2-001',
    name: 'E2 Standard Weight Set',
    type: 'Standard Weight',
    manufacturer: 'Precision Weigh Systems',
    model: 'PWS-STD-E2',
    serialNumber: 'STD-E2-001',
    calibrationDate: '2026-03-15',
    calibrationValidUntil: '2027-03-15',
    calibrationCertificateRef: 'CAL-2026-00123',
    laboratoryId: '1',
    laboratoryCode: 'CMTL-PY-01',
    laboratoryName: 'Central Metrology Testing Lab',
    condition: 'good',
    notes: 'Primary E2 weight set used for calibrating Class II and Class III verification instruments.',
    createdAt: '2026-03-15',
    updatedAt: '2026-09-01',
  },
  {
    id: '2',
    equipmentId: 'STD-M2-003',
    name: 'M2 Calibration Weight Set',
    type: 'Standard Weight',
    manufacturer: 'ABC Instruments Pvt. Ltd.',
    model: 'ABC-STD-M2',
    serialNumber: 'STD-M2-003',
    calibrationDate: '2026-05-20',
    calibrationValidUntil: '2027-05-20',
    calibrationCertificateRef: 'CAL-2026-00456',
    laboratoryId: '1',
    laboratoryCode: 'CMTL-PY-01',
    laboratoryName: 'Central Metrology Testing Lab',
    condition: 'good',
    notes: 'M2 weight set used for routine Class III instrument verification.',
    createdAt: '2026-05-20',
    updatedAt: '2026-09-01',
  },
  {
    id: '3',
    equipmentId: 'ENV-001',
    name: 'Environmental Monitor',
    type: 'Measurement Device',
    manufacturer: 'MetroScale Technologies',
    model: 'MST-ENV-120',
    serialNumber: 'ENV-001',
    calibrationDate: '2026-01-10',
    calibrationValidUntil: '2026-07-10',
    calibrationCertificateRef: 'CAL-2026-00789',
    laboratoryId: '2',
    laboratoryCode: 'PITL-PR-02',
    laboratoryName: 'Prayagraj Instrument Testing Lab',
    condition: 'good',
    notes: 'Monitors temperature and humidity during verification tests.',
    createdAt: '2026-01-10',
    updatedAt: '2026-09-01',
  },
  {
    id: '4',
    equipmentId: 'STD-F1-002',
    name: 'F1 Standard Weight Set',
    type: 'Standard Weight',
    manufacturer: 'ABC Instruments Pvt. Ltd.',
    model: 'ABC-STD-F1',
    serialNumber: 'STD-F1-002',
    calibrationDate: '2025-12-01',
    calibrationValidUntil: '2026-12-01',
    calibrationCertificateRef: 'CAL-2025-01111',
    laboratoryId: '1',
    laboratoryCode: 'CMTL-PY-01',
    laboratoryName: 'Central Metrology Testing Lab',
    condition: 'good',
    notes: 'F1 weight set for high-accuracy Class II verifications.',
    createdAt: '2025-12-01',
    updatedAt: '2026-09-01',
  },
  {
    id: '5',
    equipmentId: 'TOOL-001',
    name: 'Forceps Set',
    type: 'Tool',
    manufacturer: '—',
    model: '—',
    serialNumber: 'TOOL-001',
    calibrationDate: '',
    calibrationValidUntil: '',
    calibrationCertificateRef: '',
    laboratoryId: '1',
    laboratoryCode: 'CMTL-PY-01',
    laboratoryName: 'Central Metrology Testing Lab',
    condition: 'good',
    notes: 'Stainless steel forceps for handling small weights. Not calibration-sensitive.',
    createdAt: '2024-06-15',
    updatedAt: '2026-09-01',
  },
];

export function getEquipmentRecords(): EquipmentRecord[] {
  return EQUIPMENT_RECORDS;
}

export function getEquipment(id: string): EquipmentRecord | undefined {
  return EQUIPMENT_RECORDS.find(e => e.id === id);
}