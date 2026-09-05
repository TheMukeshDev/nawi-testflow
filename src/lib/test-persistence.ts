/**
 * NAWI TestFlow — Test Run Persistence
 *
 * Writes a completed wizard test run into the normalised Supabase schema
 * (test_reports → test_conditions → test_cases → test_observations →
 * test_results) via the /api/db proxy. Best-effort: if the instrument or
 * laboratory can't be resolved (or no technician profile exists), the row is
 * skipped with a warning while the local workflow-store copy still works.
 */

import { getInstruments, getLaboratoryOptions } from './catalog-db';
import type { EquipmentRecord } from './workflow-store';
import type { CalculationOutput } from './calculation-engine';
import type { InstrumentClass } from './rule-engine';

export interface PersistTestRunInput {
  instrument: {
    instrumentClass: string;
    model: string;
    serialNumber: string;
    maxCapacity: number;
    maxCapacityUnit: string;
  };
  conditions: {
    temperature: string;
    humidity: string;
    airPressure: string;
    testLocation: string;
    testDate: string;
    laboratoryName: string;
    notes?: string;
  };
  computations: CalculationOutput[];
  complianceVerdict: 'compliant' | 'non-compliant' | 'conditional' | 'pending';
  technicianName: string;
  equipment?: EquipmentRecord[];
}

export interface PersistTestRunResult {
  ok: boolean;
  reportNumber?: string;
  serverReportId?: string;
  warnings: string[];
}

const CASE_TYPE_MAP: Record<string, string> = {
  RPT: 'repeatability',
  ECC: 'eccentricity',
  LIN: 'linearity',
  WGT: 'weighing',
  DIS: 'discrimination',
  STB: 'stability',
};

const CASE_TYPE_CHECK = new Set([
  'weighing',
  'repeatability',
  'eccentricity',
  'linearity',
  'discrimination',
  'stability',
  'temperature-effect',
]);

function normalizeUnit(value: string): string {
  const u = (value || '').trim().toLowerCase();
  if (['mg', 'g', 'kg', 't'].includes(u)) return u;
  return 'g';
}

async function postRow(table: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/db/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`POST /api/db/${table} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data[0];
  return (data as { value?: unknown[] })?.value?.[0] ?? data;
}

function nextReportNumber(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const stamp = `${yyyy}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RPT-${stamp}-${rand}`;
}

export async function persistTestRun(input: PersistTestRunInput): Promise<PersistTestRunResult> {
  const warnings: string[] = [];
  const reportNumber = nextReportNumber();

  try {
    const [instruments, labs] = await Promise.all([getInstruments(), getLaboratoryOptions()]);

    const serial = input.instrument.serialNumber.trim();
    const instrument = instruments.find(
      i => i.serialNumber.toUpperCase() === serial.toUpperCase(),
    );
    if (!instrument) {
      return {
        ok: false,
        warnings: [
          `Instrument "${serial}" is not in the instrument registry — test record was saved to local reports only, not to the database.`,
        ],
      };
    }

    const lab = labs.find(
      l =>
        l.name.toLowerCase().includes(input.conditions.laboratoryName.trim().toLowerCase()) ||
        l.code.toLowerCase() === input.conditions.laboratoryName.trim().toLowerCase(),
    );
    if (!lab) {
      return {
        ok: false,
        reportNumber,
        warnings: [
          `Laboratory "${input.conditions.laboratoryName}" could not be resolved — test record was saved to local reports only.`,
        ],
      };
    }

    let profile: { id: string } | null = null;
    try {
      const res = await fetch('/api/db/profiles?select=id,full_name&limit=1');
      if (res.ok) {
        const rows = await res.json();
        const list = Array.isArray(rows) ? rows : (rows as { value?: { id: string }[] }).value ?? [];
        const named = list.find((r: { full_name?: string }) => r.full_name === input.technicianName) ||
          list.find((r: { full_name?: string }) => r.full_name) ||
          list[0];
        if (named?.id) profile = named;
      }
    } catch (err) {
      console.warn('[Persistence] profiles lookup failed:', err);
    }

    if (!profile) {
      warnings.push(
        'No technician profile could be resolved — test_reports rows require assigned_technician_id / created_by. Skipping DB save.',
      );
      return { ok: false, reportNumber, warnings };
    }

    const technicianId = profile.id;
    const env = input.conditions;
    const temp = parseFloat(env.temperature);
    const hum = parseFloat(env.humidity);
    const pressure = env.airPressure ? parseFloat(env.airPressure) || null : null;

    // 1. test_reports
    const report = await postRow('test_reports', {
      report_number: reportNumber,
      instrument_id: instrument.id,
      laboratory_id: lab.id,
      verification_type: 'subsequent',
      test_standard: 'OIML R-76',
      test_standard_version: '2009',
      status: 'pending-review',
      compliance_result: input.complianceVerdict,
      assigned_technician_id: technicianId,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: technicianId,
      updated_by: technicianId,
    });

    const reportId = report?.id as string | undefined;
    if (!reportId) {
      return { ok: false, reportNumber, warnings: ['Failed to create test_reports row.', ...warnings] };
    }

    // 2. test_conditions
    if (!Number.isNaN(temp) && !Number.isNaN(hum)) {
      await postRow('test_conditions', {
        report_id: reportId,
        temperature: temp,
        temperature_unit: '°C',
        humidity: hum,
        air_pressure: pressure,
        recorded_at: new Date().toISOString(),
        recorded_by: technicianId,
        temperature_status: 'normal',
        humidity_status: 'normal',
        air_pressure_status: pressure == null ? 'not-recorded' : 'normal',
        notes: env.notes || null,
      });
    } else {
      warnings.push('Temperature/humidity incomplete — test_conditions row skipped.');
    }

    // 3. test_cases → test_observations → test_results
    for (const calc of input.computations) {
      const caseTypeRaw = CASE_TYPE_MAP[calc.testCode];
      const caseType = CASE_TYPE_CHECK.has(caseTypeRaw) ? caseTypeRaw : 'repeatability';
      const unit = normalizeUnit(calc.unit);

      const testCase = await postRow('test_cases', {
        report_id: reportId,
        case_type: caseType,
        test_point_label: `${calc.testName} ${calc.nominalLoad ? `@ ${calc.nominalLoad} ${unit}` : ''}`.trim(),
        test_point_value: Number(calc.nominalLoad.toFixed(6)),
        unit,
        sort_order: 1,
        status: 'complete',
        notes: calc.note || null,
        created_by: technicianId,
        updated_by: technicianId,
      });
      const caseId = testCase?.id as string | undefined;
      if (!caseId) continue;

      await postRow('test_results', {
        report_id: reportId,
        case_id: caseId,
        mean_value: Number(calc.mean.toFixed(6)),
        std_deviation: Number(calc.stddev.toFixed(6)),
        deviation_from_reference: calc.worstError != null ? Number(calc.worstError.toFixed(6)) : null,
        calculated_error: calc.worstError != null ? Number(calc.worstError.toFixed(6)) : null,
        max_permissible_error: calc.mpe != null ? Number(calc.mpe.toFixed(6)) : null,
        verdict: calc.verdict === 'PASS' ? 'pass' : calc.verdict === 'FAIL' ? 'fail' : 'conditional',
        calculated_by: technicianId,
        calculation_version: calc.standardVersion,
        notes: calc.note || null,
      });
    }

    // 4. test_equipment — calibration weights / accessories used during testing
    const validTypes = new Set(['standard-weight', 'calibrated-weight', 'accessory', 'tool']);
    for (const eq of input.equipment ?? []) {
      const eqType = validTypes.has(eq.type) ? eq.type : 'accessory';
      await postRow('test_equipment', {
        report_id: reportId,
        equipment_name: eq.name || 'Unnamed equipment',
        equipment_type: eqType,
        serial_number: eq.serialNumber?.trim() || null,
        nominal_value: eq.nominalValue ? Number(eq.nominalValue) || null : null,
        nominal_value_unit: eq.nominalValueUnit?.trim() || null,
        calibration_date: eq.calibrationDate || null,
        calibration_valid_until: eq.calibrationValidUntil || null,
        certificate_number: eq.certificateNumber?.trim() || null,
        role_in_test: eq.roleInTest?.trim() || null,
      });
    }

    return { ok: true, reportNumber, serverReportId: reportId, warnings };
  } catch (err) {
    console.warn('[Persistence] persistTestRun failed:', err);
    return {
      ok: false,
      reportNumber,
      warnings: [`Database save failed: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

export type { InstrumentClass };