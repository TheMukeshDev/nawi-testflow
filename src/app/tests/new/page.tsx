/**
 * NAWI TestFlow — New Test Report Wizard
 *
 * Multi-step form for creating a new test report.
 * Steps: Instrument → Conditions → Equipment → Tests → Observations → Calculate → Result
 * Includes "Fill Sample Data" button for demo purposes.
 */

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import { AiAssistBox } from '@/components/ai/AiAssistBox';
import { localExplain } from '@/lib/ai';
import { todayISO } from '@/lib/dates';
import { workflowStore, type StoredTest } from '@/lib/workflow-store';
import { TestResultModal } from '@/components/workflow/TestResultModal';
import { downloadTestReportPDF, downloadTestReportDOCX } from '@/lib/report-generator';
import { SerialReaderModal } from '@/components/equipment/SerialReaderModal';

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

interface ObservationEntry {
  id: string;
  testName: string;
  testCode: string;
  measuredValues: string[];
  unit: string;
  notes: string;
}

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
  { id: 'sample-rpt-max', testName: 'Repeatability', testCode: 'RPT', measuredValues: ['3000.002', '3000.001', '3000.003', '3000.002', '3000.001'], unit: 'g', notes: 'Max capacity test point' },
  { id: 'sample-rpt-50', testName: 'Repeatability', testCode: 'RPT', measuredValues: ['1500.001', '1500.003', '1500.002', '1500.001', '1500.002'], unit: 'g', notes: '50% capacity test point' },
  { id: 'sample-ecc', testName: 'Eccentricity', testCode: 'ECC', measuredValues: ['3000.001', '3000.005', '3000.003', '3000.008', '3000.002'], unit: 'g', notes: 'Center, Front, Back, Left, Right' },
];

// ═══════════════════════════════════════════════════════════════
// STEP INDICATOR
// ═══════════════════════════════════════════════════════════════

const STEPS = [
  { label: 'Instrument', short: '1' },
  { label: 'Conditions', short: '2' },
  { label: 'Tests', short: '3' },
  { label: 'Observations', short: '4' },
  { label: 'Calculate', short: '5' },
  { label: 'Result', short: '6' },
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

export default function NewTestPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [instrument, setInstrument] = useState<InstrumentData>({ ...INITIAL_INSTRUMENT });
  const [conditions, setConditions] = useState<ConditionData>({ ...INITIAL_CONDITIONS });
  const [tests, setTests] = useState<TestSelection[]>(AVAILABLE_TESTS.map(t => ({ ...t })));
  const [observations, setObservations] = useState<ObservationEntry[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [calcResult, setCalcResult] = useState<{ test: string; mean: string; stddev: string; result: string }[] | null>(null);
  const [submittedTest, setSubmittedTest] = useState<StoredTest | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [serialTarget, setSerialTarget] = useState<{ oi: number; vi: number; label: string } | null>(null);
  const calculatedRef = useRef<number>(-1);

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
  }, [step, completed, instrument, conditions, tests, observations, submittedTest]);

  const discardDraft = () => {
    clearWizardDraft();
    setDraftSavedAt(null);
    setStep(0);
    setCompleted([]);
    setInstrument({ ...INITIAL_INSTRUMENT });
    setConditions({ ...INITIAL_CONDITIONS });
    setTests(AVAILABLE_TESTS.map(t => ({ ...t })));
    setObservations([]);
    setCalcResult(null);
  };

  const handleSubmitForReview = () => {
    const formattedObs = observations.map((obs, i) => {
      const calc = calcResult?.[i];
      return {
        testName: obs.testName,
        testCode: obs.testCode,
        readings: obs.measuredValues.filter(v => v.trim() !== ''),
        mean: calc?.mean || '0.00',
        stddev: calc?.stddev || '0.00',
        verdict: (calc?.result === 'FAIL' ? 'FAIL' : 'PASS') as 'PASS' | 'FAIL',
        unit: obs.unit,
        notes: obs.notes,
      };
    });

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
      technicianName: user?.full_name || 'Priya Mehta',
    });

    setSubmittedTest(newTest);
    // Submitted — the draft is no longer needed
    clearWizardDraft();
    setDraftSavedAt(null);
  };

  // Rule-based explanations (Tier 1 — no AI, computed from the actual
  // calculation values + demo rule reference). Gemini is only used when the
  // user clicks "Enhance with AI" inside AiAssistBox.
  const explanations = useMemo(() => {
    if (!calcResult) return [];
    return calcResult.map((r) => {
      const codeMatch = r.test.match(/\((\w+)\)/);
      const code = codeMatch ? codeMatch[1] : 'RPT';
      const decisionData: Record<string, unknown> = {
        test_code: code,
        test_name: r.test.replace(/\s*\(\w+\)\s*$/, ''),
        decision: r.result.toLowerCase(),
        reason:
          r.result === 'PASS'
            ? `Demo evaluation: std-dev ${r.stddev} within demo limit (mean ${r.mean}). Official evaluation uses the backend engine with versioned OIML R-76 rules.`
            : `Demo evaluation: value exceeds demo limit (mean ${r.mean}, std-dev ${r.stddev}). See backend compliance engine for the authoritative verdict.`,
        calculated_value: Number(r.stddev),
        calculated_unit: 'g',
        applicable_limit: 0.5,
        limit_unit: 'g',
        rule_id: `DEMO-${code}-001`,
        rule_version: 'demo',
        standard: 'OIML R-76',
        standard_version: 'demo',
        explanations: [],
      };
      return { decisionData, explanation: localExplain(decisionData) };
    });
  }, [calcResult]);

  // Auto-calculate when reaching step 4 (Calculate)
  useEffect(() => {
    if (step === 4 && calculatedRef.current !== completed.length) {
      calculatedRef.current = completed.length;
      const results: { test: string; mean: string; stddev: string; result: string }[] = [];
      observations.forEach(obs => {
        const vals = obs.measuredValues.map(Number).filter(v => !isNaN(v));
        if (vals.length === 0) return;
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
        const stddev = Math.sqrt(variance);
        results.push({
          test: `${obs.testName} (${obs.testCode})`,
          mean: mean.toFixed(6),
          stddev: stddev.toFixed(6),
          result: 'PASS',
        });
      });
      setCalcResult(results.length > 0 ? results : null);
    }
  }, [step, completed.length, observations]);

  const fillSample = () => {
    setInstrument({ ...SAMPLE_INSTRUMENT });
    setConditions({ ...SAMPLE_CONDITIONS });
    setTests(AVAILABLE_TESTS.map(t => ({
      ...t,
      selected: ['RPT', 'ECC'].includes(t.code),
    })));
    setObservations(SAMPLE_OBSERVATIONS.map(o => ({ ...o })));
  };

  const clearSample = () => {
    setInstrument({ ...INITIAL_INSTRUMENT });
    setConditions({ ...INITIAL_CONDITIONS });
    setTests(AVAILABLE_TESTS.map(t => ({ ...t, selected: t.code === 'RPT' })));
    setObservations([]);
    clearWizardDraft();
    setDraftSavedAt(null);
  };

  const next = () => {
    if (step === 2) {
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
            measuredValues: ['', '', '', '', ''],
            unit: 'g',
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
              measuredValues: ['', '', '', '', ''],
              unit: 'g',
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

  if (submittedTest) {
    return (
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
                <span className={`font-bold ${submittedTest.complianceResult === 'compliant' ? 'text-green-700' : 'text-red-700'}`}>
                  {submittedTest.complianceResult.toUpperCase()}
                </span>
              </div>
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
    );
  }

  return (
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

        {/* STEP 2: Test Selection */}
        {step === 2 && (
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

        {/* STEP 3: Observations */}
        {step === 3 && (
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Calculate */}
        {step === 4 && (
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900 mb-1">Calculation & Compliance</h2>
            <p className="text-[12px] text-gray-500 mb-5">Review calculated results and compliance evaluation</p>
            {calcResult && calcResult.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 text-[11px] uppercase">Test</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700 text-[11px] uppercase">Mean</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700 text-[11px] uppercase">Std Dev</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700 text-[11px] uppercase">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calcResult.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 px-3 font-medium text-gray-900">{r.test}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{r.mean}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{r.stddev}</td>
                        <td className="py-2 px-3 text-right">
                          <span className={`inline-flex px-1.5 py-0.5 rounded-sm text-[11px] font-semibold ${
                            r.result === 'PASS' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {r.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[13px] text-gray-400 text-center py-8">No observations to calculate. Go back and enter observations.</p>
            )}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-sm">
              <p className="text-[11px] text-amber-700">
                <strong>Note:</strong> These are demo calculations for demonstration purposes. Actual compliance evaluation uses the backend calculation engine with versioned OIML R-76 rules.
              </p>
            </div>
            {/* Rule-first explanations: why each result passed/failed (no AI).
                "Enhance with AI" inside each box is the ONLY Gemini call site. */}
            {calcResult && calcResult.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="text-[13px] font-semibold text-gray-900">Result explanations <span className="font-normal text-gray-400">— rule-based first, AI optional</span></h3>
                {explanations.map((e, i) => (
                  <AiAssistBox key={i} decisionData={e.decisionData} ruleExplanation={e.explanation as never} compact />
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Result */}
        {step === 5 && (
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
              {/* Results */}
              {calcResult && calcResult.length > 0 && (
                <div className="border border-gray-200 rounded-sm p-4">
                  <h3 className="text-[13px] font-semibold text-gray-900 mb-2">Results</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-1.5 font-semibold text-gray-700">Test</th>
                          <th className="text-right py-1.5 font-semibold text-gray-700">Mean</th>
                          <th className="text-right py-1.5 font-semibold text-gray-700">Std Dev</th>
                          <th className="text-right py-1.5 font-semibold text-gray-700">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calcResult.map((r, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-1.5 font-medium text-gray-900">{r.test}</td>
                            <td className="py-1.5 text-right font-mono">{r.mean}</td>
                            <td className="py-1.5 text-right font-mono">{r.stddev}</td>
                            <td className="py-1.5 text-right">
                              <span className="px-1.5 py-0.5 rounded-sm text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">{r.result}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
              {step === 4 ? 'Calculate & Review' : 'Next'}
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
  );
}
