/**
 * NAWI TestFlow — Catalog Database Client
 *
 * Fetches real records from Supabase (via the /api/db proxy) and joins the
 * normalized tables (instruments + instrument_models + manufacturers +
 * laboratories) into the shapes the list/detail pages expect.
 */

// ─────────────────────────────────────────────────────────────────────────
// LOW-LEVEL FETCH HELPERS
// ─────────────────────────────────────────────────────────────────────────

interface DbResult<T = Record<string, unknown>> {
  value: T[];
  Count?: number;
  count?: number;
}

const API_ERROR_PREFIX = 'catalog-db:';

function logError(message: string, err: unknown): void {
  console.warn(`${API_ERROR_PREFIX} ${message}`, err);
}

async function fetchRows<T = Record<string, unknown>>(table: string, query = ''): Promise<T[]> {
  const url = `/api/db/${table}${query ? `?${query}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`GET ${url} failed (${res.status})`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data as T[];
  const wrapper = data as DbResult<T>;
  return (wrapper.value || []) as T[];
}

// ─────────────────────────────────────────────────────────────────────────
// RAW ROW TYPES (matching the database schema)
// ─────────────────────────────────────────────────────────────────────────

export interface InstrumentRow {
  id: string;
  model_id: string;
  serial_number: string;
  laboratory_id: string;
  date_received: string | null;
  last_calibration: string | null;
  next_calibration: string | null;
  condition: 'good' | 'needs-repair' | 'out-of-service';
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface InstrumentModelRow {
  id: string;
  manufacturer_id: string;
  model_name: string;
  model_number: string;
  instrument_class: 'I' | 'II' | 'III' | 'IIII' | 'IIIIL' | null;
  capacity: number;
  capacity_unit: string;
  min_capacity: number;
  min_capacity_unit: string;
  division: number;
  division_unit: string;
  verification_scale_divisions: number;
  accuracy_class: string | null;
  power_supply: string | null;
  operating_temp_min: number | null;
  operating_temp_max: number | null;
  device_type: string;
  year_of_manufacture: number | null;
}

export interface ManufacturerRow {
  id: string;
  name: string;
  country: string;
  address: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
}

export interface LaboratoryRow {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  accreditation_body: string | null;
  accreditation_number: string | null;
  accreditation_valid_until: string | null;
  contact_person: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────
// JOINED VIEW MODELS
// ─────────────────────────────────────────────────────────────────────────

export interface InstrumentListRecord {
  id: string;
  serialNumber: string;
  modelName: string;
  modelNumber: string;
  manufacturerName: string;
  instrumentClass: InstrumentModelRow['instrument_class'];
  maxCapacity: number;
  maxCapacityUnit: string;
  scaleInterval: number;
  scaleIntervalUnit: string;
  laboratoryCode: string;
  laboratoryName: string;
  condition: InstrumentRow['condition'];
  lastCalibration: string | null;
  testCount: number;
  dateReceived: string | null;
  notes: string | null;
}

export interface InstrumentDetailRecord extends InstrumentListRecord {
  assetTag: string;
  manufacturerCountry: string;
  instrumentType: string;
  accuracyClass: string | null;
  minCapacity: number;
  minCapacityUnit: string;
  verificationScaleInterval: number | null;
  verificationScaleIntervalUnit: string | null;
  numberOfVerificationIntervals: number | null;
  softwareVersion: string | null;
  firmwareVersion: string | null;
  powerSupply: string | null;
  laboratoryId: string;
  nextCalibration: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface LabRecord {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
  accreditationBody: string | null;
  accreditationNumber: string | null;
  accreditationValidUntil: string | null;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
  instrumentCount: number;
  activeTests: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────
// SHARED CACHE (per navigation session)
// ─────────────────────────────────────────────────────────────────────────

let catalogCache: {
  instruments: InstrumentRow[] | null;
  models: InstrumentModelRow[] | null;
  manufacturers: ManufacturerRow[] | null;
  laboratories: LaboratoryRow[] | null;
} = {
  instruments: null,
  models: null,
  manufacturers: null,
  laboratories: null,
};

async function loadCatalog(): Promise<void> {
  const [instruments, models, manufacturers, laboratories] = await Promise.all([
    catalogCache.instruments
      ? Promise.resolve(catalogCache.instruments)
      : fetchRows<InstrumentRow>('instruments', 'select=*&order=created_at.asc'),
    catalogCache.models
      ? Promise.resolve(catalogCache.models)
      : fetchRows<InstrumentModelRow>('instrument_models', 'select=*'),
    catalogCache.manufacturers
      ? Promise.resolve(catalogCache.manufacturers)
      : fetchRows<ManufacturerRow>('manufacturers', 'select=*'),
    catalogCache.laboratories
      ? Promise.resolve(catalogCache.laboratories)
      : fetchRows<LaboratoryRow>('laboratories', 'select=*'),
  ]);

  catalogCache = { instruments, models, manufacturers, laboratories };
}

export function invalidateCatalogCache(): void {
  catalogCache = {
    instruments: null,
    models: null,
    manufacturers: null,
    laboratories: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// INSTRUMENTS
// ─────────────────────────────────────────────────────────────────────────

function joinInstrument(
  row: InstrumentRow,
  models: InstrumentModelRow[],
  manufacturers: ManufacturerRow[],
  labs: LaboratoryRow[],
): InstrumentListRecord {
  const model = models.find(m => m.id === row.model_id);
  const manufacturer = model
    ? manufacturers.find(mf => mf.id === model.manufacturer_id)
    : undefined;
  const lab = labs.find(l => l.id === row.laboratory_id);

  return {
    id: row.id,
    serialNumber: row.serial_number,
    modelName: model?.model_name || 'Unknown Model',
    modelNumber: model?.model_number || '—',
    manufacturerName: manufacturer?.name || '—',
    instrumentClass: model?.instrument_class || null,
    maxCapacity: model?.capacity ?? 0,
    maxCapacityUnit: model?.capacity_unit || '',
    scaleInterval: model?.division ?? 0,
    scaleIntervalUnit: model?.division_unit || '',
    laboratoryCode: lab?.code || '—',
    laboratoryName: lab?.name || '—',
    condition: row.condition,
    lastCalibration: row.last_calibration,
    testCount: 0,
    dateReceived: row.date_received,
    notes: row.notes,
  };
}

export async function getInstruments(): Promise<InstrumentListRecord[]> {
  try {
    await loadCatalog();
    return catalogCache.instruments!.map(row => joinInstrument(
      row,
      catalogCache.models!,
      catalogCache.manufacturers!,
      catalogCache.laboratories!,
    ));
  } catch (err) {
    logError('getInstruments failed', err);
    return [];
  }
}

export async function getInstrument(id: string): Promise<InstrumentDetailRecord | null> {
  try {
    await loadCatalog();
    const row = catalogCache.instruments?.find(i => i.id === id);
    if (!row) return null;

    const base = joinInstrument(
      row,
      catalogCache.models!,
      catalogCache.manufacturers!,
      catalogCache.laboratories!,
    );
    const model = catalogCache.models!.find(m => m.id === row.model_id);
    const manufacturer = model
      ? catalogCache.manufacturers!.find(mf => mf.id === model.manufacturer_id)
      : undefined;
    const lab = catalogCache.laboratories!.find(l => l.id === row.laboratory_id);

    const detail: InstrumentDetailRecord = {
      ...base,
      assetTag: `${lab?.code || 'LAB'}-INST-${row.serial_number.slice(-4)}`,
      manufacturerCountry: manufacturer?.country || '—',
      instrumentType: model?.device_type || '—',
      accuracyClass: model?.accuracy_class || null,
      minCapacity: model?.min_capacity ?? 0,
      minCapacityUnit: model?.min_capacity_unit || '',
      verificationScaleInterval: model?.division ?? null,
      verificationScaleIntervalUnit: model?.division_unit || null,
      numberOfVerificationIntervals: model?.verification_scale_divisions ?? null,
      softwareVersion: null,
      firmwareVersion: null,
      powerSupply: model?.power_supply || null,
      laboratoryId: row.laboratory_id,
      nextCalibration: row.next_calibration,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: null,
    };

    return detail;
  } catch (err) {
    logError(`getInstrument(${id}) failed`, err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// INSTRUMENT TEST HISTORY
// ─────────────────────────────────────────────────────────────────────────

export interface TestReportRow {
  id: string;
  report_number: string;
  instrument_id: string;
  verification_type: string;
  status: string;
  compliance_result: string | null;
  assigned_technician_id: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface InstrumentTestHistoryRecord {
  id: string;
  testNumber: string;
  verificationType: string;
  status: TestStatusCompatible;
  complianceResult: ComplianceVerdictCompatible;
  technician: string;
  submittedAt: string | null;
  completedAt: string | null;
}

export type TestStatusCompatible = 'draft' | 'in-testing' | 'pending-review' | 'approved' | 'rejected' | 'completed' | 'revision-requested';
export type ComplianceVerdictCompatible = 'compliant' | 'non-compliant' | 'conditional' | 'pending' | 'not-applicable';

const STATUS_MAP: Record<string, TestStatusCompatible> = {
  'observations-complete': 'in-testing',
  'calculations-pending': 'in-testing',
  'calculations-complete': 'pending-review',
  'pending-review': 'pending-review',
  'revision-requested': 'revision-requested',
  approved: 'approved',
  rejected: 'rejected',
  completed: 'completed',
  draft: 'draft',
  'in-testing': 'in-testing',
};

const COMPLIANCE_MAP: Record<string, ComplianceVerdictCompatible> = {
  compliant: 'compliant',
  'non-compliant': 'non-compliant',
  conditional: 'conditional',
  pending: 'pending',
  'not-applicable': 'not-applicable',
};

export async function getInstrumentTestHistory(instrumentId: string): Promise<InstrumentTestHistoryRecord[]> {
  try {
    const rows = await fetchRows<TestReportRow>(
      'test_reports',
      `select=*&instrument_id=eq.${instrumentId}&order=created_at.desc`,
    );
    return rows.map(r => ({
      id: r.id,
      testNumber: r.report_number,
      verificationType: r.verification_type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      status: STATUS_MAP[r.status] || 'in-testing',
      complianceResult: COMPLIANCE_MAP[r.compliance_result || ''] || 'pending',
      technician: r.assigned_technician_id || '',
      submittedAt: r.submitted_at,
      completedAt: r.completed_at,
    }));
  } catch (err) {
    logError(`getInstrumentTestHistory(${instrumentId}) failed`, err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────
// LOOKUPS FOR FORMS
// ─────────────────────────────────────────────────────────────────────────

export interface FormManufacturer {
  id: string;
  name: string;
  country: string;
}

export interface FormLaboratory {
  id: string;
  name: string;
  code: string;
}

export async function getManufacturers(): Promise<FormManufacturer[]> {
  try {
    await loadCatalog();
    return (catalogCache.manufacturers ?? []).map(mf => ({
      id: mf.id,
      name: mf.name,
      country: mf.country,
    }));
  } catch (err) {
    logError('getManufacturers failed', err);
    return [];
  }
}

export async function getLaboratoryOptions(): Promise<FormLaboratory[]> {
  try {
    await loadCatalog();
    return (catalogCache.laboratories ?? []).map(l => ({
      id: l.id,
      name: l.name,
      code: l.code,
    }));
  } catch (err) {
    logError('getLaboratoryOptions failed', err);
    return [];
  }
}

export async function isSerialNumberRegistered(serialNumber: string, laboratoryId: string): Promise<boolean> {
  try {
    await loadCatalog();
    return (catalogCache.instruments ?? []).some(
      i => i.laboratory_id === laboratoryId && i.serial_number.toUpperCase() === serialNumber.trim().toUpperCase(),
    );
  } catch (err) {
    logError('isSerialNumberRegistered failed', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// LABORATORIES
// ─────────────────────────────────────────────────────────────────────────

export async function getLaboratories(): Promise<LabRecord[]> {
  try {
    await loadCatalog();
    const labs = catalogCache.laboratories ?? [];
    const instruments = catalogCache.instruments ?? [];

    const counts = new Map<string, number>();
    for (const inst of instruments) {
      counts.set(inst.laboratory_id, (counts.get(inst.laboratory_id) || 0) + 1);
    }

    return labs.map(l => ({
      id: l.id,
      name: l.name,
      code: l.code,
      city: l.city,
      state: l.state,
      country: l.country,
      accreditationBody: l.accreditation_body,
      accreditationNumber: l.accreditation_number,
      accreditationValidUntil: l.accreditation_valid_until,
      contactPerson: l.contact_person,
      phone: l.phone,
      email: l.email,
      address: l.address,
      isActive: l.is_active,
      instrumentCount: counts.get(l.id) || 0,
      activeTests: 0,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    }));
  } catch (err) {
    logError('getLaboratories failed', err);
    return [];
  }
}

export async function getLaboratory(id: string): Promise<LabRecord | null> {
  try {
    await loadCatalog();
    const all = await getLaboratories();
    return all.find(l => l.id === id) ?? null;
  } catch (err) {
    logError(`getLaboratory(${id}) failed`, err);
    return null;
  }
}

export interface LabInstrumentSummary {
  id: string;
  serialNumber: string;
  modelName: string;
  modelNumber: string;
  manufacturer: string;
  manufacturerCountry: string;
  condition: InstrumentRow['condition'];
  lastCalibration: string | null;
  maxCapacity: number;
  maxCapacityUnit: string;
}

const ACTIVE_TEST_STATUSES = ['draft', 'observations-complete', 'calculations-pending', 'calculations-complete', 'pending-review'];

export async function getInstrumentsByLaboratory(labId: string): Promise<LabInstrumentSummary[]> {
  try {
    await loadCatalog();
    const instruments = (catalogCache.instruments ?? []).filter(i => i.laboratory_id === labId);
    return instruments.map(row => {
      const model = catalogCache.models!.find(m => m.id === row.model_id);
      const manufacturer = model
        ? catalogCache.manufacturers!.find(mf => mf.id === model.manufacturer_id)
        : undefined;
      return {
        id: row.id,
        serialNumber: row.serial_number,
        modelName: model?.model_name || 'Unknown Model',
        modelNumber: model?.model_number || '—',
        manufacturer: manufacturer?.name || '—',
        manufacturerCountry: manufacturer?.country || '—',
        condition: row.condition,
        lastCalibration: row.last_calibration,
        maxCapacity: model?.capacity ?? 0,
        maxCapacityUnit: model?.capacity_unit || '',
      };
    });
  } catch (err) {
    logError(`getInstrumentsByLaboratory(${labId}) failed`, err);
    return [];
  }
}

export async function getActiveTestsByLaboratory(labId: string): Promise<number> {
  try {
    await loadCatalog();
    const instrIds = new Set(
      (catalogCache.instruments ?? []).filter(i => i.laboratory_id === labId).map(i => i.id),
    );
    if (instrIds.size === 0) return 0;
    const reports = await fetchRows<TestReportRow>(
      'test_reports',
      'select=*&order=created_at.desc',
    );
    return reports.filter(r => instrIds.has(r.instrument_id) && ACTIVE_TEST_STATUSES.includes(r.status)).length;
  } catch (err) {
    logError(`getActiveTestsByLaboratory(${labId}) failed`, err);
    return 0;
  }
}