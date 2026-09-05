/**
 * NAWI Sahayak — New Test Report Wizard
 *
 * Multi-step form for creating a new test report.
 * Steps: Instrument → Conditions → Equipment → Tests → Observations → Calculate → Result
 * Includes "Fill Sample Data" button for demo purposes.
 */

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { useAuth } from '@/lib/auth-context';
import { localExplain } from '@/lib/ai';
import { todayISO } from '@/lib/dates';
import { workflowStore, type StoredTest } from '@/lib/workflow-store';
import { TestResultModal } from '@/components/workflow/TestResultModal';
import { downloadTestReportPDF, downloadTestReportDOCX } from '@/lib/report-generator';
import { SerialReaderModal } from '@/components/equipment/SerialReaderModal';
import {
  calculateObservation,
  evaluateCompliance,
  convertToUnit,
  type CalculationOutput,
  type ComplianceOutput,
  type InstrumentSpec,
} from '@/lib/calculation-engine';
import { persistTestRun } from '@/lib/test-persistence';
import type { InstrumentClass } from '@/lib/rule-engine';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface InstrumentData {
  manufacturer: string;
  model: string;
  serialNumber: string;
  instrumentType: string;
  instrumentClass: string;
  maxCapacity: string;
  maxCapacityUnit: string;
  scaleInterval: string;
  scaleIntervalUnit: string;
  verificationScaleInterval: string;
  softwareVersion: string;
  notes: string;
}

interface ConditionData {
  temperature: string;
  humidity: string;
  airPressure: string;
  testLocation: string;
  testDate: string;
  laboratoryName: string;
  notes: string;
}

interface ObservationPhoto {
  name: string;
  src: string;
}

interface ObservationEntry {
  id: string;
  testName: string;
  testCode: string;
  nominalLoad: string;
  measuredValues: string[];
  unit: string;
  notes: string;
  photos?: ObservationPhoto[];
}

interface EquipmentItem {
  id: string;
  name: string;
  type: 'standard-weight' | 'calibrated-weight' | 'accessory' | 'tool';
  serialNumber: string;
  nominalValue: string;
  nominalValueUnit: string;
  calibrationDate: string;
  calibrationValidUntil: string;
  certificateNumber: string;
  roleInTest: string;
}

const EQUIPMENT_TYPES: { value: EquipmentItem['type']; label: string }[] = [
  { value: 'standard-weight', label: 'Standard Weight' },
  { value: 'calibrated-weight', label: 'Calibrated Weight' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'tool', label: 'Tool' },
];

const EMPTY_EQUIPMENT: EquipmentItem = {
  id: '',
  name: '',
  type: 'standard-weight',
  serialNumber: '',
  nominalValue: '',
  nominalValueUnit: 'g',
  calibrationDate: '',
  calibrationValidUntil: '',
  certificateNumber: '',
  roleInTest: '',
};

type CalcRow = {
  test: string;
  unit: string;
  load: string;
  mean: string;
  stddev: string;
  error: string;
  mpe: string;
  result: 'PASS' | 'FAIL' | 'NOT_CONFIGURED';
  standardVersion: string;
  note?: string;
  limitLabel?: string;
};

interface TestSelection {
  code: string;
  name: string;
  selected: boolean;
}

const INITIAL_INSTRUMENT: InstrumentData = {
  manufacturer: '', model: '', serialNumber: '', instrumentType: 'electronic',
  instrumentClass: 'III', maxCapacity: '', maxCapacityUnit: 'kg',
  scaleInterval: '', scaleIntervalUnit: 'g', verificationScaleInterval: '',
  softwareVersion: '', notes: '',
};

const INITIAL_CONDITIONS: ConditionData = {
  temperature: '', humidity: '', airPressure: '',
  testLocation: '', testDate: todayISO(),
  laboratoryName: '', notes: '',
};

const AVAILABLE_TESTS: TestSelection[] = [
  { code: 'RPT', name: 'Repeatability', selected: true },
  { code: 'ECC', name: 'Eccentricity', selected: false },
  { code: 'LIN', name: 'Linearity', selected: false },
  { code: 'DIS', name: 'Discrimination', selected: false },
  { code: 'STB', name: 'Stability', selected: false },
];

const SAMPLE_INSTRUMENT: InstrumentData = {
  manufacturer: 'ABC Instruments Pvt. Ltd.',
  model: 'ABC-3000 Electronic Balance',
  serialNumber: 'ABC-2026-EL-00412',
  instrumentType: 'electronic',
  instrumentClass: 'III',
  maxCapacity: '3000',
  maxCapacityUnit: 'g',
  scaleInterval: '0.01',
  scaleIntervalUnit: 'g',
  verificationScaleInterval: '0.1',
  softwareVersion: 'v2.4.1',
  notes: 'Standard laboratory electronic balance. Last calibrated 2026-01-10.',
};

const SAMPLE_CONDITIONS: ConditionData = {
  temperature: '22.5',
  humidity: '48',
  airPressure: '1013',
  testLocation: 'Room 204, Precision Measurement Wing',
  testDate: '2026-01-15',
  laboratoryName: 'Central Metrology Testing Lab',
  notes: 'Normal laboratory conditions. HVAC operational.',
};

const SAMPLE_OBSERVATIONS: ObservationEntry[] = [
  { id: 'sample-rpt-max', testName: 'Repeatability', testCode: 'RPT', nominalLoad: '3000', measuredValues: ['3000.002', '3000.001', '3000.003', '3000.002', '3000.001'], unit: 'g', notes: 'Max capacity test point' },
  { id: 'sample-rpt-50', testName: 'Repeatability', testCode: 'RPT', nominalLoad: '1500', measuredValues: ['1500.001', '1500.003', '1500.002', '1500.001', '1500.002'], unit: 'g', notes: '50% capacity test point' },
  { id: 'sample-ecc', testName: 'Eccentricity', testCode: 'ECC', nominalLoad: '3000', measuredValues: ['3000.001', '3000.005', '3000.003', '3000.008', '3000.002'], unit: 'g', notes: 'Center, Front, Back, Left, Right' },
];

const SAMPLE_EQUIPMENT: EquipmentItem[] = [
  { id: 'sample-eq-1', name: 'E2 standard weight set (1 g – 200 g)', type: 'standard-weight', serialNumber: 'SW-2026-118', nominalValue: '200', nominalValueUnit: 'g', calibrationDate: '2026-01-05', calibrationValidUntil: '2027-01-04', certificateNumber: 'WCC/2026/0147', roleInTest: 'Test loads for RPT & ECC' },
  { id: 'sample-eq-2', name: 'Cast iron calibration weight 2 kg', type: 'calibrated-weight', serialNumber: 'CW-2026-042', nominalValue: '2000', nominalValueUnit: 'g', calibrationDate: '2025-11-20', calibrationValidUntil: '2026-11-19', certificateNumber: 'WCC/2025/0891', roleInTest: 'Max capacity load' },
  { id: 'sample-eq-3', name: 'Precision tweezers', type: 'accessory', serialNumber: '', nominalValue: '', nominalValueUnit: 'g', calibrationDate: '', calibrationValidUntil: '', certificateNumber: '', roleInTest: 'Weight handling' },
];

// ═══════════════════════════════════════════════════════════════
// STEP INDICATOR
// ═══════════════════════════════════════════════════════════════

const STEPS = [
  { label: 'Instrument', short: '1' },
  { label: 'Conditions', short: '2' },
  { label: 'Equipment', short: '3' },
  { label: 'Tests', short: '4' },
  { label: 'Observations', short: '5' },
  { label: 'Calculate', short: '6' },
  { label: 'Result', short: '7' },
];

// ─────────────────────────────────────────────────────────────
// DRAFT AUTO-SAVE (refresh-safe resume)
//
// A half-completed test (non-submitted) is persisted to localStorage with a
// short debounce so a browser refresh / accidental navigation never wipes out
// instrument, environmental, selection or observation data. The draft is
// cleared on successful submit or explicit "Discard & start fresh".
// ─────────────────────────────────────────────────────────────

const WIZARD_DRAFT_KEY = 'nawi_new_test_wizard_draft_v1';

interface WizardDraft {
  step: number;
  completed: number[];
  instrument: InstrumentData;
  conditions: ConditionData;
  equipment: EquipmentItem[];
  tests: TestSelection[];
  observations: ObservationEntry[];
  savedAt: number;
}

function isDraftMeaningful(d: WizardDraft): boolean {
  return (
    d.step > 0 ||
    d.observations.length > 0 ||
    !!(d.instrument?.model || '').trim() ||
    !!(d.instrument?.serialNumber || '').trim()
  );
}

function loadWizardDraft(): WizardDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WIZARD_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveWizardDraft(d: WizardDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* storage full / private mode — autosave is best-effort */
  }
}

function clearWizardDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(WIZARD_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function StepIndicator({ current, completed }: { current: number; completed: number[] }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.label}>
          {i > 0 && <div className={`h-[1px] w-4 sm:w-8 shrink-0 ${i <= completed.length ? 'bg-[#1e3a5f]' : 'bg-gray-200'}`} />}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`flex items-center justify-center w-[24px] h-[24px] rounded-full text-[11px] font-bold border-2 ${
              i === current ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' :
              completed.includes(i) ? 'bg-green-50 text-green-700 border-green-300' :
              'bg-white text-gray-400 border-gray-200'
            }`}>
              {completed.includes(i) ? '✓' : i + 1}
            </div>
            <span className={`text-[11px] sm:text-[12px] font-medium hidden sm:inline ${
              i === current ? 'text-[#1e3a5f]' : completed.includes(i) ? 'text-green-700' : 'text-gray-400'
            }`}>
              {step.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FORM FIELD
// ═══════════════════════════════════════════════════════════════

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, unit, type = 'text', disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; unit?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div className="flex">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 h-[34px] px-3 border border-gray-300 rounded-l-sm text-[13px] text-gray-900 font-mono focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500"
      />
      {unit && (
        <span className="flex items-center px-2 h-[34px] bg-gray-50 border border-l-0 border-gray-300 rounded-r-sm text-[12px] text-gray-500 font-mono shrink-0">
          {unit}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN WIZARD
// ═══════════════════════════════════════════════════════════════

async function fileToThumbnailDataURL(file: File, maxDim = 1024, quality = 0.72): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('decode failed'));
      i.src = raw;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return raw;
  }
}

export default function NewTestPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [instrument, setInstrument] = useState<InstrumentData>({ ...INITIAL_INSTRUMENT });
  const [conditions, setConditions] = useState<ConditionData>({ ...INITIAL_CONDITIONS });
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [tests, setTests] = useState<TestSelection[]>(AVAILABLE_TESTS.map(t => ({ ...t })));
  const [observations, setObservations] = useState<ObservationEntry[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [calcResult, setCalcResult] = useState<CalcRow[] | null>(null);
  const [calcOutputs, setCalcOutputs] = useState<CalculationOutput[] | null>(null);
  const [compliance, setCompliance] = useState<ComplianceOutput | null>(null);
  const [dbSave, setDbSave] = useState<{ saved: boolean; reportNumber?: string; warnings: string[] } | null>(null);
  const [submittedTest, setSubmittedTest] = useState<StoredTest | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [serialTarget, setSerialTarget] = useState<{ oi: number; vi: number; label: string } | null>(null);

  // ── Draft auto-save: restore a half-completed test after refresh / navigation ──
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const draftRestoredRef = useRef<boolean>(false);

  // Restore once on mount
  useEffect(() => {
    if (draftRestoredRef.current) return;
    const draft = loadWizardDraft();
    if (draft && isDraftMeaningful(draft)) {
      draftRestoredRef.current = true;
      if (typeof draft.step === 'number' && draft.step >= 0 && draft.step < STEPS.length) {
        setStep(draft.step);
      }
      if (Array.isArray(draft.completed)) setCompleted(draft.completed);
      if (draft.instrument) setInstrument({ ...INITIAL_INSTRUMENT, ...draft.instrument });
      if (draft.conditions) setConditions({ ...INITIAL_CONDITIONS, ...draft.conditions });
      if (Array.isArray(draft.equipment)) setEquipment(draft.equipment);
      if (Array.isArray(draft.tests) && draft.tests.length > 0) setTests(draft.tests);
      if (Array.isArray(draft.observations)) setObservations(draft.observations);
      setDraftSavedAt(draft.savedAt || Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave with a short debounce whenever wizard state changes
  useEffect(() => {
    if (submittedTest) return;
    const timer = window.setTimeout(() => {
      const draft: WizardDraft = {
        step,
        completed,
        instrument,
        conditions,
        equipment,
        tests,
        observations,
        savedAt: Date.now(),
      };
      if (isDraftMeaningful(draft)) {
        saveWizardDraft(draft);
        setDraftSavedAt(draft.savedAt);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [step, completed, instrument, conditions, equipment, tests, observations, submittedTest]);

  const discardDraft = () => {
    clearWizardDraft();
    setDraftSavedAt(null);
    setStep(0);
    setCompleted([]);
    setInstrument({ ...INITIAL_INSTRUMENT });
    setConditions({ ...INITIAL_CONDITIONS });
    setEquipment([]);
    setTests(AVAILABLE_TESTS.map(t => ({ ...t })));
    setObservations([]);
    setCalcResult(null);
    setCalcOutputs(null);
    setCompliance(null);
    setDbSave(null);
  };

  const buildFormattedObservations = () =>
    observations.map((obs, i) => {
      const calc = calcOutputs?.[i];
      const notEvaluated = calc?.verdict === 'NOT_CONFIGURED';
      const notes = notEvaluated
        ? `[Not evaluated — rule pending] ${obs.notes}`.trim()
        : obs.notes;
      return {
        testName: obs.testName,
        testCode: obs.testCode,
        readings: obs.measuredValues.filter(v => v.trim() !== ''),
        mean: calc ? calc.mean.toFixed(6) : '0.00',
        stddev: calc ? calc.stddev.toFixed(6) : '0.00',
        verdict: (calc?.verdict === 'FAIL' ? 'FAIL' : 'PASS') as 'PASS' | 'FAIL',
        unit: obs.unit,
        notes,
        photos: obs.photos && obs.photos.length > 0 ? obs.photos : undefined,
      } satisfies StoredTest['observations'][number];
    });

  // Snapshot of the current wizard state as a StoredTest — used for live
  // PDF/DOCX downloads from the Result step (before final submission).
  const buildPreviewTest = (): StoredTest | null => {
    const formattedObs = buildFormattedObservations();
    return {
      id: 'draft-preview',
      testNumber: `DRAFT-${new Date().toISOString().slice(0, 10)}`,
      instrumentSerial: instrument.serialNumber || 'DRAFT-SN',
      instrumentModel: instrument.model || 'Standard Digital Balance',
      instrumentManufacturer: instrument.manufacturer || 'Metrology Standards Corp',
      instrumentClass: instrument.instrumentClass || 'III',
      maxCapacity: instrument.maxCapacity || '3000',
      maxCapacityUnit: instrument.maxCapacityUnit || 'g',
      scaleInterval: instrument.scaleInterval || '0.01',
      scaleIntervalUnit: instrument.scaleIntervalUnit || 'g',
      verificationScaleInterval: instrument.verificationScaleInterval || instrument.scaleInterval || '0.1',
      softwareVersion: instrument.softwareVersion || '—',
      laboratory: conditions.laboratoryName || 'Not specified',
      verificationType: 'Initial',
      status: 'in-testing',
      complianceResult: compliance?.verdict ?? 'pending',
      technician: user?.full_name || 'Priya Mehta',
      temperature: conditions.temperature,
      humidity: conditions.humidity,
      airPressure: conditions.airPressure,
      testLocation: conditions.testLocation,
      testDate: conditions.testDate || new Date().toISOString().slice(0, 10),
      observations: formattedObs,
      equipment: equipment.map(e => ({
        name: e.name,
        type: e.type,
        serialNumber: e.serialNumber || undefined,
        nominalValue: e.nominalValue || undefined,
        nominalValueUnit: e.nominalValueUnit || undefined,
        calibrationDate: e.calibrationDate || undefined,
        calibrationValidUntil: e.calibrationValidUntil || undefined,
        certificateNumber: e.certificateNumber || undefined,
        roleInTest: e.roleInTest || undefined,
      })),
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
  };

  const handleSubmitForReview = async () => {
    const formattedObs = buildFormattedObservations();

    const newTest = workflowStore.submitNewTest({
      instrument: {
        manufacturer: instrument.manufacturer,
        model: instrument.model,
        serialNumber: instrument.serialNumber,
        instrumentClass: instrument.instrumentClass,
        maxCapacity: instrument.maxCapacity,
        maxCapacityUnit: instrument.maxCapacityUnit,
        scaleInterval: instrument.scaleInterval,
        scaleIntervalUnit: instrument.scaleIntervalUnit,
        verificationScaleInterval: instrument.verificationScaleInterval,
        softwareVersion: instrument.softwareVersion,
      },
      conditions: {
        temperature: conditions.temperature,
        humidity: conditions.humidity,
        airPressure: conditions.airPressure,
        testLocation: conditions.testLocation,
        testDate: conditions.testDate,
        laboratoryName: conditions.laboratoryName,
      },
      observations: formattedObs,
      equipment: equipment.map(e => ({
        name: e.name,
        type: e.type,
        serialNumber: e.serialNumber || undefined,
        nominalValue: e.nominalValue || undefined,
        nominalValueUnit: e.nominalValueUnit || undefined,
        calibrationDate: e.calibrationDate || undefined,
        calibrationValidUntil: e.calibrationValidUntil || undefined,
        certificateNumber: e.certificateNumber || undefined,
        roleInTest: e.roleInTest || undefined,
      })),
      technicianName: user?.full_name || 'Priya Mehta',
      complianceResult: compliance?.verdict ?? 'pending',
    });

    setSubmittedTest(newTest);
    // Submitted — the draft is no longer needed
    clearWizardDraft();
    setDraftSavedAt(null);

    // Best-effort DB persistence (real normalised schema via /api/db proxy).
    if (calcOutputs && calcOutputs.length > 0) {
      const pers = await persistTestRun({
        instrument: {
          instrumentClass: instrument.instrumentClass || 'III',
          model: instrument.model,
          serialNumber: instrument.serialNumber,
          maxCapacity: parseFloat(instrument.maxCapacity) || 0,
          maxCapacityUnit: instrument.maxCapacityUnit,
        },
        conditions: {
          temperature: conditions.temperature,
          humidity: conditions.humidity,
          airPressure: conditions.airPressure,
          testLocation: conditions.testLocation,
          testDate: conditions.testDate,
          laboratoryName: conditions.laboratoryName,
          notes: conditions.notes,
        },
        computations: calcOutputs,
        complianceVerdict: compliance?.verdict ?? 'pending',
        technicianName: user?.full_name || 'Priya Mehta',
        equipment: equipment.map(e => ({
          name: e.name,
          type: e.type,
          serialNumber: e.serialNumber || undefined,
          nominalValue: e.nominalValue || undefined,
          nominalValueUnit: e.nominalValueUnit || undefined,
          calibrationDate: e.calibrationDate || undefined,
          calibrationValidUntil: e.calibrationValidUntil || undefined,
          certificateNumber: e.certificateNumber || undefined,
          roleInTest: e.roleInTest || undefined,
        })),
      });
      setDbSave({
        saved: pers.ok,
        reportNumber: pers.reportNumber,
        warnings: pers.warnings,
      });
      if (!pers.ok && pers.warnings.length > 0) {
        console.warn('[New Test] DB persistence skipped:', pers.warnings);
      }
    }
  };

  // Deterministic explanations computed from the real engine values and rule.
  const explanations = useMemo(() => {
    if (!calcResult) return [];
    return calcResult.map((r) => {
      const codeMatch = r.test.match(/\((\w+)\)/);
      const code = codeMatch ? codeMatch[1] : 'RPT';
      const decisionData: Record<string, unknown> = {
        test_code: code,
        test_name: r.test.replace(/\s*\(\w+\)\s*$/, ''),
        decision: r.result === 'FAIL' ? 'fail' : r.result === 'PASS' ? 'pass' : 'conditional',
        reason:
          r.note ||
          `${r.test.replace(/\s*\(\w+\)\s*$/, '')} evaluated against OIML R-76 (${r.standardVersion}).`,
        calculated_value: parseFloat(r.stddev) || 0,
        calculated_unit: r.unit,
        applicable_limit: r.mpe ? parseFloat(r.mpe) : 0,
        limit_unit: r.unit,
        rule_id: `${code}-${r.standardVersion}`,
        rule_version: r.standardVersion,
        standard: 'OIML R-76',
        standard_version: r.standardVersion,
        explanations: [],
      };
      return { explanation: localExplain(decisionData) };
    });
  }, [calcResult]);

  // Recalculate when any value consumed by the calculation engine changes.
  // Using completed.length here caused stale results after observations were edited.
  const calculationKey = useMemo(
    () => JSON.stringify({
      instrument: {
        instrumentClass: instrument.instrumentClass,
        maxCapacity: instrument.maxCapacity,
        maxCapacityUnit: instrument.maxCapacityUnit,
        scaleInterval: instrument.scaleInterval,
        scaleIntervalUnit: instrument.scaleIntervalUnit,
        verificationScaleInterval: instrument.verificationScaleInterval,
      },
      observations,
      conditions: {
        temperature: conditions.temperature,
        humidity: conditions.humidity,
        airPressure: conditions.airPressure,
      },
    }),
    [instrument, observations, conditions],
  );

  // Auto-calculate on step 5 and whenever its inputs change — real OIML R-76
  // engine (DB-backed rules when available, default tables otherwise).
  useEffect(() => {
    if (step !== 5) return;

    let cancelled = false;
    (async () => {
        const spec: InstrumentSpec = {
          instrumentClass: (instrument.instrumentClass || 'III') as InstrumentClass,
          maxCapacity: parseFloat(instrument.maxCapacity) || 0,
          maxCapacityUnit: instrument.maxCapacityUnit || 'g',
          scaleInterval: parseFloat(instrument.scaleInterval) || 0,
          scaleIntervalUnit: instrument.scaleIntervalUnit || 'g',
          verificationScaleInterval: instrument.verificationScaleInterval
            ? parseFloat(instrument.verificationScaleInterval) || undefined
            : undefined,
        };

        const outputs: CalculationOutput[] = [];
        for (const obs of observations) {
          const unit = obs.unit || 'g';
          const enteredLoad = parseFloat(obs.nominalLoad);
          const nominalLoad =
            !Number.isNaN(enteredLoad)
              ? enteredLoad
              : spec.maxCapacity > 0
                ? convertToUnit(spec.maxCapacity, spec.maxCapacityUnit || unit, unit)
                : 0;
          const out = await calculateObservation({
            observation: {
              testCode: obs.testCode,
              testName: obs.testName,
              measuredValues: obs.measuredValues,
              unit,
              notes: obs.notes,
            },
            instrument: spec,
            nominalLoad,
          });
          outputs.push(out);
        }

        const comp = await evaluateCompliance({
          results: outputs,
          environment: {
            temperature: conditions.temperature,
            humidity: conditions.humidity,
            airPressure: conditions.airPressure,
          },
        });

        if (cancelled) return;
        const rows: CalcRow[] = outputs.map(o => ({
          test: `${o.testName} (${o.testCode})`,
          unit: o.unit,
          load: o.nominalLoad ? `${o.nominalLoad.toFixed(6)} ${o.unit}` : '—',
          mean: o.count ? o.mean.toFixed(6) : '—',
          stddev: o.count ? o.stddev.toFixed(6) : '—',
          error: o.worstError != null ? `${o.worstError.toFixed(6)} ${o.unit}` : '—',
          mpe: o.mpe != null ? `${o.mpe.toFixed(6)} ${o.unit}` : '—',
          result: o.verdict,
          standardVersion: o.standardVersion,
          note: o.note,
          limitLabel: o.limitLabel,
        }));
        setCalcOutputs(outputs);
        setCalcResult(rows.length > 0 ? rows : null);
        setCompliance(comp);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, calculationKey]);

  const fillSample = () => {
    setInstrument({ ...SAMPLE_INSTRUMENT });
    setConditions({ ...SAMPLE_CONDITIONS });
    setEquipment(SAMPLE_EQUIPMENT.map(e => ({ ...e })));
    setTests(AVAILABLE_TESTS.map(t => ({
      ...t,
      selected: ['RPT', 'ECC'].includes(t.code),
    })));
    setObservations(SAMPLE_OBSERVATIONS.map(o => ({ ...o })));
  };

  const clearSample = () => {
    setInstrument({ ...INITIAL_INSTRUMENT });
    setConditions({ ...INITIAL_CONDITIONS });
    setEquipment([]);
    setTests(AVAILABLE_TESTS.map(t => ({ ...t, selected: t.code === 'RPT' })));
    setObservations([]);
    clearWizardDraft();
    setDraftSavedAt(null);
    setCalcOutputs(null);
    setCompliance(null);
    setDbSave(null);
  };

  const next = () => {
    if (step === 3) {
      // Leaving Test Selection → build observation blocks so they are
      // visible immediately on the Observations screen. Preserve entered data.
      const selectedTests = tests.filter(t => t.selected);
      const selectedCodes = new Set(selectedTests.map(t => t.code));
      if (observations.length === 0) {
        // Create one observation per selected test
        const newObs: ObservationEntry[] = [];
        let obsIdx = 0;
        selectedTests.forEach((t) => {
          obsIdx++;
          newObs.push({
            id: `obs-${obsIdx}-${t.code}-${Date.now()}`,
            testName: t.name,
            testCode: t.code,
            nominalLoad: instrument.maxCapacity,
            measuredValues: ['', '', '', '', ''],
            unit: instrument.scaleIntervalUnit || 'g',
            notes: '',
          });
        });
        setObservations(newObs);
      } else {
        // Sync: keep entered values, add blocks for newly selected tests,
        // drop blocks for deselected tests
        const newObs: ObservationEntry[] = observations.filter(o =>
          selectedCodes.has(o.testCode),
        );
        const existingCodes = new Set(newObs.map(o => o.testCode));
        selectedTests.forEach(t => {
          if (!existingCodes.has(t.code)) {
            newObs.push({
              id: `obs-${Date.now()}-${t.code}`,
              testName: t.name,
              testCode: t.code,
              nominalLoad: instrument.maxCapacity,
              measuredValues: ['', '', '', '', ''],
              unit: instrument.scaleIntervalUnit || 'g',
              notes: '',
            });
          }
        });
        setObservations(newObs);
      }
    }
    setCompleted([...new Set([...completed, step])]);
    setStep(Math.min(step + 1, STEPS.length - 1));
  };

  const prev = () => setStep(Math.max(step - 1, 0));

  const toggleTest = (code: string) => {
    setTests(tests.map(t => t.code === code ? { ...t, selected: !t.selected } : t));
  };

  const addEquipmentItem = () => {
    setEquipment([...equipment, { ...EMPTY_EQUIPMENT, id: `eq-${Date.now()}-${equipment.length}` }]);
  };

  const updateEquipmentItem = (idx: number, patch: Partial<EquipmentItem>) => {
    setEquipment(equipment.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const removeEquipmentItem = (idx: number) => {
    setEquipment(equipment.filter((_, i) => i !== idx));
  };

  const attachPhotos = async (oi: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newObs = [...observations];
    const added: ObservationPhoto[] = [];
    for (const file of Array.from(files)) {
      const src = await fileToThumbnailDataURL(file);
      added.push({ name: file.name, src });
    }
    newObs[oi] = { ...newObs[oi], photos: [...(newObs[oi].photos ?? []), ...added] };
    setObservations(newObs);
  };

  const removePhoto = (oi: number, photoIdx: number) => {
    const newObs = [...observations];
    const photos = (newObs[oi].photos ?? []).filter((_, i) => i !== photoIdx);
    newObs[oi] = { ...newObs[oi], photos };
    setObservations(newObs);
  };

  if (submittedTest) {
    return (
      <RouteGuard requiredRoles={['admin', 'tester']}>
      <DashboardLayout breadcrumbs={[{ label: 'Test Reports', href: '/tests' }, { label: 'Submitted' }]}>
        <div className="max-w-2xl mx-auto py-6">
          <div className="bg-white border border-gray-200 rounded-md p-6 sm:p-8 text-center shadow-xs">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1 className="text-[20px] font-bold text-gray-900 mb-1">
              Test Report Successfully Submitted
            </h1>
            <p className="text-[13px] text-gray-500 mb-5">
              Record ref: <span className="font-mono font-bold text-gray-900">{submittedTest.testNumber}</span> &bull; {submittedTest.instrumentModel}
            </p>

            <div className="bg-blue-50/70 border border-blue-200 rounded-sm p-4 mb-6 text-left text-[12.5px] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">Workflow Status:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  PENDING REVIEW
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">Compliance Verdict:</span>
                <span className={`font-bold ${submittedTest.complianceResult === 'compliant' ? 'text-green-700' : submittedTest.complianceResult === 'conditional' ? 'text-amber-700' : 'text-red-700'}`}>
                  {submittedTest.complianceResult.toUpperCase()}
                </span>
              </div>
              {dbSave && dbSave.warnings.length === 0 && dbSave.saved && (
                <div className="flex items-center justify-between text-gray-600">
                  <span className="font-medium">Database Record:</span>
                  <span className="font-mono text-gray-900">{dbSave.reportNumber ?? '—'}</span>
                </div>
              )}
              {dbSave && dbSave.warnings.length > 0 && (
                <div className="pt-2 border-t border-blue-200/60 text-amber-800 leading-relaxed">
                  <strong>DB save skipped:</strong> {dbSave.warnings.join(' ')}
                </div>
              )}
              <div className="pt-2 border-t border-blue-200/60 text-blue-900 leading-relaxed">
                🔔 <strong>Notification dispatched:</strong> Reviewer (Dr. K. Sharma) has been notified. This report is now waiting in the Review Queue on the Reviewer Dashboard for verification and approval.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
              <button
                onClick={() => setShowResultModal(true)}
                className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-[13px] font-medium rounded-sm transition-colors shadow-xs"
              >
                View Complete Results
              </button>

              <button
                onClick={() => downloadTestReportPDF(submittedTest)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-[13px] font-medium rounded-sm transition-colors inline-flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 1.5v8m0 0L4 6.5m3 3l3-3M2 11.5h10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Download PDF
              </button>

              <button
                onClick={() => downloadTestReportDOCX(submittedTest)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-[13px] font-medium rounded-sm transition-colors"
              >
                Download DOCX
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-4 text-[12px]">
              <Link href="/tests" className="text-primary-600 hover:underline font-medium">
                ← Go to Test Reports List
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/reviewer" className="text-primary-600 hover:underline font-medium">
                Open Reviewer Dashboard →
              </Link>
            </div>
          </div>
        </div>

        <TestResultModal
          open={showResultModal}
          onClose={() => setShowResultModal(false)}
          test={submittedTest}
        />
      </DashboardLayout>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requiredRoles={['admin', 'tester']}>
    <DashboardLayout breadcrumbs={[{ label: 'Test Reports', href: '/tests' }, { label: 'New Test' }]}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[18px] font-semibold text-gray-900">New Test Report</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Create a new test record following OIML R-76 procedures</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fillSample}
            className="px-3 py-1.5 bg-blue-50 text-[#1e3a5f] text-[12px] font-medium rounded-sm border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            Fill Sample Data
          </button>
          <button
            onClick={clearSample}
            className="px-3 py-1.5 bg-gray-50 text-gray-600 text-[12px] font-medium rounded-sm border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* Draft auto-save indicator */}
      {draftSavedAt && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-sm text-[12px] text-amber-900">
          <span className="flex items-center gap-1.5 font-medium">
            💾 Draft auto-saved · refresh-safe
            <span className="text-amber-700/90 font-normal">
              (last saved {new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
            </span>
          </span>
          <button
            onClick={discardDraft}
            className="underline hover:text-amber-950 font-medium cursor-pointer self-start sm:self-auto"
          >
            Discard & start fresh
          </button>
        </div>
      )}

      {/* Step indicator */}
      <div className="bg-white border border-gray-200 rounded-sm px-4 py-3 mb-4">
        <StepIndicator current={step} completed={completed} />
      </div>

      {/* Step content */}
      <div className="bg-white border border-gray-200 rounded-sm p-5 min-h-[400px]">
        {/* STEP 0: Instrument */}
        {step === 0 && (
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900 mb-1">Instrument Details</h2>
            <p className="text-[12px] text-gray-500 mb-5">Enter manufacturer and instrument information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Manufacturer" required>
                <Input value={instrument.manufacturer} onChange={v => setInstrument({ ...instrument, manufacturer: v })} placeholder="e.g. ABC Instruments" />
              </Field>
              <Field label="Model" required>
                <Input value={instrument.model} onChange={v => setInstrument({ ...instrument, model: v })} placeholder="e.g. ABC-3000" />
              </Field>
              <Field label="Serial Number" required>
                <Input value={instrument.serialNumber} onChange={v => setInstrument({ ...instrument, serialNumber: v })} placeholder="e.g. ABC-2026-00412" />
              </Field>
              <Field label="Instrument Type" required>
                <select
                  value={instrument.instrumentType}
                  onChange={e => setInstrument({ ...instrument, instrumentType: e.target.value })}
                  className="w-full h-[34px] px-3 border border-gray-300 rounded-sm text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200"
                >
                  <option value="electronic">Electronic</option>
                  <option value="mechanical">Mechanical</option>
                  <option value="electromechanical">Electromechanical</option>
                </select>
              </Field>
              <Field label="Instrument Class" required>
                <select
                  value={instrument.instrumentClass}
                  onChange={e => setInstrument({ ...instrument, instrumentClass: e.target.value })}
                  className="w-full h-[34px] px-3 border border-gray-300 rounded-sm text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200"
                >
                  <option value="I">Class I</option>
                  <option value="II">Class II</option>
                  <option value="III">Class III</option>
                  <option value="IIII">Class IIII</option>
                </select>
              </Field>
              <Field label="Max Capacity" required>
                <Input value={instrument.maxCapacity} onChange={v => setInstrument({ ...instrument, maxCapacity: v })} placeholder="3000" unit={instrument.maxCapacityUnit} />
              </Field>
              <Field label="Scale Interval (d)" required>
                <Input value={instrument.scaleInterval} onChange={v => setInstrument({ ...instrument, scaleInterval: v })} placeholder="0.01" unit={instrument.scaleIntervalUnit} />
              </Field>
              <Field label="Verification Scale Interval (e)">
                <Input value={instrument.verificationScaleInterval} onChange={v => setInstrument({ ...instrument, verificationScaleInterval: v })} placeholder="0.1" unit={instrument.scaleIntervalUnit} />
              </Field>
              <Field label="Software / Firmware">
                <Input value={instrument.softwareVersion} onChange={v => setInstrument({ ...instrument, softwareVersion: v })} placeholder="v2.4.1" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Notes">
                <textarea
                  value={instrument.notes}
                  onChange={e => setInstrument({ ...instrument, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200 resize-none"
                  placeholder="Additional instrument notes..."
                />
              </Field>
            </div>
          </div>
        )}

        {/* STEP 1: Conditions */}
        {step === 1 && (
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900 mb-1">Laboratory Conditions</h2>
            <p className="text-[12px] text-gray-500 mb-5">Record environmental conditions during testing</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Temperature" required>
                <Input value={conditions.temperature} onChange={v => setConditions({ ...conditions, temperature: v })} placeholder="22.5" unit="°C" type="number" />
              </Field>
              <Field label="Relative Humidity" required>
                <Input value={conditions.humidity} onChange={v => setConditions({ ...conditions, humidity: v })} placeholder="48" unit="%RH" type="number" />
              </Field>
              <Field label="Atmospheric Pressure">
                <Input value={conditions.airPressure} onChange={v => setConditions({ ...conditions, airPressure: v })} placeholder="1013" unit="hPa" type="number" />
              </Field>
              <Field label="Laboratory" required>
                <Input value={conditions.laboratoryName} onChange={v => setConditions({ ...conditions, laboratoryName: v })} placeholder="e.g. Central Metrology Lab" />
              </Field>
              <Field label="Test Location">
                <Input value={conditions.testLocation} onChange={v => setConditions({ ...conditions, testLocation: v })} placeholder="e.g. Room 204" />
              </Field>
              <Field label="Test Date" required>
                <Input value={conditions.testDate} onChange={v => setConditions({ ...conditions, testDate: v })} type="date" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Notes">
                <textarea
                  value={conditions.notes}
                  onChange={e => setConditions({ ...conditions, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200 resize-none"
                  placeholder="Environmental notes..."
                />
              </Field>
            </div>
          </div>
        )}

        {/* STEP 2: Equipment */}
        {step === 2 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900">Equipment & Calibration Weights</h2>
                <p className="text-[12px] text-gray-500 mt-0.5">Record reference weights and accessories used during testing</p>
              </div>
              <button
                type="button"
                onClick={addEquipmentItem}
                className="px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-[12px] font-medium rounded-sm inline-flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
                  <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                </svg>
                Add Equipment Item
              </button>
            </div>
            {equipment.length === 0 ? (
              <p className="text-[13px] text-gray-400 text-center py-8">
                No equipment recorded yet. Reference weights are required for OIML R-76 load application — add them here.
              </p>
            ) : (
              <div className="space-y-4 mt-3">
                {equipment.map((eq, i) => (
                  <div key={eq.id} className="border border-gray-200 rounded-sm p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[13px] font-semibold text-gray-900">Equipment {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeEquipmentItem(i)}
                        className="text-[11px] text-red-600 hover:text-red-700 font-medium cursor-pointer inline-flex items-center gap-1"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <Field label="Equipment Name" required>
                        <Input value={eq.name} onChange={v => updateEquipmentItem(i, { name: v })} placeholder="e.g. E2 weight set 1–200 g" />
                      </Field>
                      <Field label="Type" required>
                        <select
                          value={eq.type}
                          onChange={e => updateEquipmentItem(i, { type: e.target.value as EquipmentItem['type'] })}
                          className="w-full h-[34px] px-3 border border-gray-300 rounded-sm text-[13px] text-gray-900 bg-white focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200"
                        >
                          {EQUIPMENT_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Serial Number">
                        <Input value={eq.serialNumber} onChange={v => updateEquipmentItem(i, { serialNumber: v })} placeholder="e.g. SW-2026-118" />
                      </Field>
                      <Field label="Nominal Value">
                        <Input value={eq.nominalValue} onChange={v => updateEquipmentItem(i, { nominalValue: v })} placeholder="200" unit={eq.nominalValueUnit} type="number" />
                      </Field>
                      <Field label="Nominal Value Unit">
                        <select
                          value={eq.nominalValueUnit}
                          onChange={e => updateEquipmentItem(i, { nominalValueUnit: e.target.value })}
                          className="w-full h-[34px] px-3 border border-gray-300 rounded-sm text-[13px] text-gray-900 bg-white focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200"
                        >
                          {['g', 'kg', 'mg', 't'].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </Field>
                      <Field label="Calibration Date">
                        <Input value={eq.calibrationDate} onChange={v => updateEquipmentItem(i, { calibrationDate: v })} type="date" />
                      </Field>
                      <Field label="Valid Until">
                        <Input value={eq.calibrationValidUntil} onChange={v => updateEquipmentItem(i, { calibrationValidUntil: v })} type="date" />
                      </Field>
                      <Field label="Certificate Number">
                        <Input value={eq.certificateNumber} onChange={v => updateEquipmentItem(i, { certificateNumber: v })} placeholder="e.g. WCC/2026/0147" />
                      </Field>
                      <Field label="Role in Test">
                        <Input value={eq.roleInTest} onChange={v => updateEquipmentItem(i, { roleInTest: v })} placeholder="e.g. Max capacity load" />
                      </Field>
                    </div>
                    {(eq.calibrationValidUntil && !eq.calibrationDate) || (eq.certificateNumber && !eq.calibrationDate) ? (
                      <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-2 py-1.5">
                        Reference weights should carry a calibration certificate with a valid (unexpired) calibration date to be used as test loads.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Test Selection */}
        {step === 3 && (
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900 mb-1">Select Applicable Tests</h2>
            <p className="text-[12px] text-gray-500 mb-5">Choose which OIML R-76 tests to perform</p>
            <div className="space-y-2">
              {tests.map(t => (
                <label
                  key={t.code}
                  className={`flex items-center gap-3 p-3 rounded-sm border cursor-pointer transition-colors ${
                    t.selected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={t.selected}
                    onChange={() => toggleTest(t.code)}
                    className="w-4 h-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-blue-200"
                  />
                  <div>
                    <span className="text-[13px] font-semibold text-gray-900">{t.name}</span>
                    <span className="ml-2 text-[11px] font-mono text-gray-500">{t.code}</span>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-4">
              Selected: {tests.filter(t => t.selected).length} of {tests.length} tests
            </p>
          </div>
        )}

        {/* STEP 4: Observations */}
        {step === 4 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 mb-0.5">Test Observations</h2>
                <p className="text-[12px] text-gray-500">Enter measured values manually or stream directly via digital scale</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (observations.length > 0) {
                    setSerialTarget({ oi: 0, vi: 0, label: `${observations[0].testName} - Reading 1` });
                  }
                }}
                className="px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-[12px] font-medium rounded-sm inline-flex items-center gap-1.5 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3" />
                  <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3" />
                </svg>
                Connect Digital Scale (RS-232 / USB)
              </button>
            </div>
            {observations.length === 0 ? (
              <p className="text-[13px] text-gray-400 text-center py-8">No tests selected. Go back to select tests.</p>
            ) : (
              <div className="space-y-6">
                {observations.map((obs, oi) => (
                  <div key={obs.id} className="border border-gray-200 rounded-sm p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-gray-900">{obs.testName}</span>
                        <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{obs.testCode}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                      <Field label="Nominal Load (L)">
                        <Input
                          value={obs.nominalLoad}
                          onChange={v => {
                            const newObs = [...observations];
                            newObs[oi].nominalLoad = v;
                            setObservations(newObs);
                          }}
                          placeholder="Test load applied"
                          unit={obs.unit}
                          type="number"
                        />
                      </Field>
                      <Field label="Readings Unit">
                        <select
                          value={obs.unit}
                          onChange={e => {
                            const newObs = [...observations];
                            newObs[oi].unit = e.target.value;
                            setObservations(newObs);
                          }}
                          className="w-full h-[34px] px-3 border border-gray-300 rounded-sm text-[13px] text-gray-900 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-blue-200 bg-white"
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="mg">mg</option>
                          <option value="lb">lb</option>
                          <option value="t">t</option>
                        </select>
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {obs.measuredValues.map((val, vi) => (
                        <div key={vi}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] text-gray-500">Reading {vi + 1}</label>
                            <button
                              type="button"
                              onClick={() => setSerialTarget({ oi, vi, label: `${obs.testName} (${obs.testCode}) - Reading ${vi + 1}` })}
                              className="text-[9.5px] text-[#1e3a5f] hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                              title="Capture directly from digital scale via RS-232"
                            >
                              ⚡ Scale
                            </button>
                          </div>
                          <Input
                            value={val}
                            onChange={v => {
                              const newObs = [...observations];
                              newObs[oi].measuredValues[vi] = v;
                              setObservations(newObs);
                            }}
                            placeholder={`Reading ${vi + 1}`}
                            unit={obs.unit}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <Input
                        value={obs.notes}
                        onChange={v => {
                          const newObs = [...observations];
                          newObs[oi].notes = v;
                          setObservations(newObs);
                        }}
                        placeholder="Notes for this test..."
                      />
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Supporting Photographs</span>
                        <label className="text-[10px] text-[#1e3a5f] hover:underline cursor-pointer font-medium">
                          + Attach photos
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={e => {
                              void attachPhotos(oi, e.target.files);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      {obs.photos && obs.photos.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {obs.photos.map((p, pi) => (
                            <div key={`${p.name}-${pi}`} className="relative">
                              <img src={p.src} alt={p.name} className="w-20 h-20 object-cover rounded-sm border border-gray-200" />
                              <button
                                type="button"
                                onClick={() => removePhoto(oi, pi)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] leading-none cursor-pointer flex items-center justify-center shadow-sm"
                                title={`Remove ${p.name}`}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400">No photos attached. Photos are embedded in the downloaded report.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Calculate */}
        {step === 5 && (
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900 mb-1">Calculation & Compliance</h2>
            <p className="text-[12px] text-gray-500 mb-5">Review calculated results and compliance evaluation</p>
            {calcResult && calcResult.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 text-[11px] uppercase">Test</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700 text-[11px] uppercase">Load</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700 text-[11px] uppercase">Mean</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700 text-[11px] uppercase">Std Dev</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700 text-[11px] uppercase">Worst Err</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700 text-[11px] uppercase">MPE</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700 text-[11px] uppercase">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calcResult.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100" title={r.limitLabel}>
                        <td className="py-2 px-3 font-medium text-gray-900">{r.test}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{r.load}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{r.mean}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{r.stddev}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{r.error}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{r.mpe}</td>
                        <td className="py-2 px-3 text-right">
                          {r.result === 'NOT_CONFIGURED' ? (
                            <span className="inline-flex px-1.5 py-0.5 rounded-sm text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200" title={r.note}>
                              NOT CONFIGURED
                            </span>
                          ) : (
                            <span className={`inline-flex px-1.5 py-0.5 rounded-sm text-[11px] font-semibold ${
                              r.result === 'PASS' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {r.result}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[13px] text-gray-400 text-center py-8">No observations to calculate. Go back and enter observations.</p>
            )}

            {/* Compliance panel */}
            {compliance && (
              <div className={`mt-4 border rounded-sm p-4 ${compliance.verdict === 'non-compliant' ? 'border-red-200 bg-red-50/60' : compliance.verdict === 'conditional' ? 'border-amber-200 bg-amber-50/60' : 'border-green-200 bg-green-50/60'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="text-[13px] font-semibold text-gray-900">Compliance Evaluation</h3>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-bold border ${
                    compliance.verdict === 'non-compliant' ? 'bg-red-100 text-red-800 border-red-300' : compliance.verdict === 'conditional' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-green-100 text-green-800 border-green-300'
                  }`}>
                    {compliance.verdict.toUpperCase()}
                  </span>
                </div>
                <ul className="space-y-1.5 text-[12px]">
                  {compliance.checks.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                        c.verdict === 'PASS' ? 'bg-green-500' : c.verdict === 'FAIL' ? 'bg-red-500' : c.verdict === 'CONDITIONAL' ? 'bg-amber-400' : 'bg-gray-300'
                      }`} />
                      <span>
                        <span className="font-medium text-gray-800">{c.title}:</span>{' '}
                        <span className="text-gray-600">{c.detail}</span>
                        {c.standardVersion && <span className="text-gray-400"> (rule v{c.standardVersion})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 pt-2 border-t border-black/5 text-[11px] text-gray-500">
                  Standard <strong>{compliance.standard}</strong> &bull; rules {compliance.rulesSource === 'db' ? 'loaded from database (versioned)' : 'inline defaults (DB rules unavailable)'} &bull;{' '}
                  {compliance.pendingTests > 0
                    ? `${compliance.pendingTests} test(s) pending rule configuration.`
                    : 'All evaluated tests resolved.'}
                </p>
              </div>
            )}
            {/* Deterministic rule explanations for each result. */}
            {calcResult && calcResult.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="text-[13px] font-semibold text-gray-900">Result explanations <span className="font-normal text-gray-400">— based on the active rule</span></h3>
                {explanations.map((e, i) => (
                  <div key={i} className="border border-gray-200 rounded-sm p-3">
                    <p className="text-[12px] font-medium text-gray-900">{e.explanation?.headline}</p>
                    <p className="text-[12px] text-gray-600 leading-relaxed mt-1">{e.explanation?.why}</p>
                    <div className="mt-2 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-sm p-2 font-mono">
                      <div>Formula: {e.explanation?.formula}</div>
                      <div className="mt-1">Rule: {e.explanation?.decision_rule}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 6: Result */}
        {step === 6 && (
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900 mb-1">Test Report Summary</h2>
            <p className="text-[12px] text-gray-500 mb-5">Review the complete test record before submission</p>
            <div className="space-y-4">
              {/* Instrument summary */}
              <div className="border border-gray-200 rounded-sm p-4">
                <h3 className="text-[13px] font-semibold text-gray-900 mb-2">Instrument</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[12px]">
                  <div><span className="text-gray-500">Manufacturer:</span> <span className="font-medium text-gray-900">{instrument.manufacturer || '—'}</span></div>
                  <div><span className="text-gray-500">Model:</span> <span className="font-medium text-gray-900">{instrument.model || '—'}</span></div>
                  <div><span className="text-gray-500">Serial:</span> <span className="font-mono text-gray-900">{instrument.serialNumber || '—'}</span></div>
                  <div><span className="text-gray-500">Class:</span> <span className="font-medium text-gray-900">{instrument.instrumentClass}</span></div>
                  <div><span className="text-gray-500">Capacity:</span> <span className="font-mono text-gray-900">{instrument.maxCapacity} {instrument.maxCapacityUnit}</span></div>
                  <div><span className="text-gray-500">Scale Interval:</span> <span className="font-mono text-gray-900">{instrument.scaleInterval} {instrument.scaleIntervalUnit}</span></div>
                </div>
              </div>
              {/* Conditions summary */}
              <div className="border border-gray-200 rounded-sm p-4">
                <h3 className="text-[13px] font-semibold text-gray-900 mb-2">Conditions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[12px]">
                  <div><span className="text-gray-500">Temperature:</span> <span className="font-mono text-gray-900">{conditions.temperature} °C</span></div>
                  <div><span className="text-gray-500">Humidity:</span> <span className="font-mono text-gray-900">{conditions.humidity} %RH</span></div>
                  <div><span className="text-gray-500">Date:</span> <span className="font-mono text-gray-900">{conditions.testDate}</span></div>
                  <div><span className="text-gray-500">Location:</span> <span className="text-gray-900">{conditions.testLocation || '—'}</span></div>
                  <div><span className="text-gray-500">Laboratory:</span> <span className="text-gray-900">{conditions.laboratoryName || '—'}</span></div>
                </div>
              </div>
              {/* Equipment summary */}
              {equipment.length > 0 && (
                <div className="border border-gray-200 rounded-sm p-4">
                  <h3 className="text-[13px] font-semibold text-gray-900 mb-2">Equipment & Calibration Weights</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-1.5 pr-3 font-semibold text-gray-700">Equipment</th>
                          <th className="text-left py-1.5 pr-3 font-semibold text-gray-700">Type</th>
                          <th className="text-left py-1.5 pr-3 font-semibold text-gray-700">Serial</th>
                          <th className="text-left py-1.5 pr-3 font-semibold text-gray-700">Nominal</th>
                          <th className="text-left py-1.5 pr-3 font-semibold text-gray-700">Cert. Valid Until</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipment.map(eq => (
                          <tr key={eq.id} className="border-b border-gray-100">
                            <td className="py-1.5 pr-3 font-medium text-gray-900">{eq.name || '—'}</td>
                            <td className="py-1.5 pr-3 capitalize text-gray-600">{eq.type.replace(/-/g, ' ')}</td>
                            <td className="py-1.5 pr-3 font-mono text-gray-700">{eq.serialNumber || '—'}</td>
                            <td className="py-1.5 pr-3 font-mono text-gray-700">{eq.nominalValue ? `${eq.nominalValue} ${eq.nominalValueUnit}` : '—'}</td>
                            <td className="py-1.5 pr-3 font-mono text-gray-700">{eq.calibrationValidUntil || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Results */}
              {calcResult && calcResult.length > 0 && (
                <div className="border border-gray-200 rounded-sm p-4">
                  <h3 className="text-[13px] font-semibold text-gray-900 mb-2">Results</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-1.5 font-semibold text-gray-700">Test</th>
                          <th className="text-right py-1.5 font-semibold text-gray-700">Load</th>
                          <th className="text-right py-1.5 font-semibold text-gray-700">Mean</th>
                          <th className="text-right py-1.5 font-semibold text-gray-700">Std Dev</th>
                          <th className="text-right py-1.5 font-semibold text-gray-700">Worst Err</th>
                          <th className="text-right py-1.5 font-semibold text-gray-700">MPE</th>
                          <th className="text-right py-1.5 font-semibold text-gray-700">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calcResult.map((r, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-1.5 font-medium text-gray-900">{r.test}</td>
                            <td className="py-1.5 text-right font-mono">{r.load}</td>
                            <td className="py-1.5 text-right font-mono">{r.mean}</td>
                            <td className="py-1.5 text-right font-mono">{r.stddev}</td>
                            <td className="py-1.5 text-right font-mono">{r.error}</td>
                            <td className="py-1.5 text-right font-mono">{r.mpe}</td>
                            <td className="py-1.5 text-right">
                              {r.result === 'NOT_CONFIGURED' ? (
                                <span className="px-1.5 py-0.5 rounded-sm text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">NOT CONFIGURED</span>
                              ) : (
                                <span className={`px-1.5 py-0.5 rounded-sm text-[11px] font-semibold border ${
                                  r.result === 'PASS' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                }`}>{r.result}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Compliance summary */}
              {compliance && (
                <div className={`border rounded-sm p-4 ${compliance.verdict === 'non-compliant' ? 'border-red-200 bg-red-50/60' : compliance.verdict === 'conditional' ? 'border-amber-200 bg-amber-50/60' : 'border-green-200 bg-green-50/60'}`}>
                  <h3 className="text-[13px] font-semibold text-gray-900 mb-2">Compliance Verdict</h3>
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span className={`font-bold uppercase ${
                      compliance.verdict === 'non-compliant' ? 'text-red-700' : compliance.verdict === 'conditional' ? 'text-amber-700' : 'text-green-700'
                    }`}>{compliance.verdict}</span>
                    <span className="text-gray-500">per {compliance.standard} (rules v{compliance.standardVersion || 'default'})</span>
                    {compliance.pendingTests > 0 && (
                      <span className="text-amber-700">{compliance.pendingTests} test(s) pending rule configuration</span>
                    )}
                  </div>
                </div>
              )}

              {/* Download report (draft preview from the current wizard state) */}
              <div className="border border-gray-200 rounded-sm p-4">
                <h3 className="text-[13px] font-semibold text-gray-900 mb-2">Generate Report</h3>
                <p className="text-[12px] text-gray-500 mb-3">
                  Download a printable certificate of the current test data. Equipment and observation photographs are embedded automatically.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { const t = buildPreviewTest(); if (t) downloadTestReportPDF(t); }}
                    className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-[13px] font-medium rounded-sm inline-flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M7 1.5v8m0 0L4 6.5m3 3l3-3M2 11.5h10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Download PDF
                  </button>
                  <button
                    onClick={() => { const t = buildPreviewTest(); if (t) downloadTestReportDOCX(t); }}
                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-[13px] font-medium rounded-sm transition-colors"
                  >
                    Download DOCX
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={prev}
          disabled={step === 0}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-[13px] font-medium rounded-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <div className="flex items-center gap-2">
          <Link
            href="/tests"
            className="px-4 py-2 text-gray-500 text-[13px] font-medium hover:text-gray-700 transition-colors"
          >
            Save Draft
          </Link>
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="px-5 py-2 bg-[#1e3a5f] text-white text-[13px] font-medium rounded-sm hover:bg-[#162d4a] transition-colors"
            >
              {step === 5 ? 'Calculate & Review' : 'Next'}
            </button>
          ) : (
            <button
              onClick={handleSubmitForReview}
              className="px-5 py-2 bg-green-600 text-white text-[13px] font-medium rounded-sm hover:bg-green-700 transition-colors shadow-xs"
            >
              Submit for Review
            </button>
          )}
        </div>
      </div>

      <SerialReaderModal
        open={serialTarget !== null}
        onClose={() => setSerialTarget(null)}
        targetFieldLabel={serialTarget?.label}
        expectedCapacity={instrument.maxCapacity || '3000'}
        onCaptureWeight={(weight, capturedUnit) => {
          if (!serialTarget) return;
          const newObs = [...observations];
          const target = newObs[serialTarget.oi];

          // Normalize the scale's streamed unit into the observation column unit
          // (e.g. an RS-232 scale reporting kg must not be written into a gram column).
          let value = weight;
          const to = (target.unit || 'g').trim().toLowerCase();
          const from = (capturedUnit || 'g').trim().toLowerCase();
          if (from !== to) {
            const num = parseFloat(weight);
            if (!Number.isNaN(num)) {
              const toGrams = (n: number, u: string): number =>
                u === 'kg' ? n * 1000 : u === 'mg' ? n / 1000 : u === 'lb' ? n * 453.59237 : n;
              const fromGrams = (n: number, u: string): number =>
                u === 'kg' ? n / 1000 : u === 'mg' ? n * 1000 : u === 'lb' ? n / 453.59237 : n;
              const grams = toGrams(num, from);
              value = String(parseFloat(fromGrams(grams, to).toFixed(6)));
            }
          }

          target.measuredValues[serialTarget.vi] = value;
          setObservations(newObs);
        }}
      />
    </DashboardLayout>
    </RouteGuard>
  );
}
