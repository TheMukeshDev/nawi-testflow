/**
 * NAWI TestFlow — New Test Report Wizard
 *
 * Multi-step form for creating a new test report.
 * Steps: Instrument → Conditions → Equipment → Tests → Observations → Calculate → Result
 * Includes "Fill Sample Data" button for demo purposes.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';

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
  testLocation: '', testDate: new Date().toISOString().split('T')[0],
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
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [instrument, setInstrument] = useState<InstrumentData>({ ...INITIAL_INSTRUMENT });
  const [conditions, setConditions] = useState<ConditionData>({ ...INITIAL_CONDITIONS });
  const [tests, setTests] = useState<TestSelection[]>(AVAILABLE_TESTS.map(t => ({ ...t })));
  const [observations, setObservations] = useState<ObservationEntry[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [calcResult, setCalcResult] = useState<{ test: string; mean: string; stddev: string; result: string }[] | null>(null);
  const calculatedRef = useRef<number>(-1);

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
  };

  const next = () => {
    if (step === 3) {
      // Build observations from selected tests — preserve existing data
      const selectedTests = tests.filter(t => t.selected);
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
        // Sync: keep existing observations, add new ones for newly selected tests
        const existingCodes = new Set(observations.map(o => o.testCode));
        const newObs: ObservationEntry[] = [...observations];
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

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Test Reports', href: '/tests' }, { label: 'New Test' }]}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[18px] font-semibold text-gray-900">New Test Report</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Create a new test record following OIML R-76 procedures</p>
        </div>
        <div className="flex items-center gap-2">
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
            <h2 className="text-[15px] font-semibold text-gray-900 mb-1">Test Observations</h2>
            <p className="text-[12px] text-gray-500 mb-5">Enter measured values for each test</p>
            {observations.length === 0 ? (
              <p className="text-[13px] text-gray-400 text-center py-8">No tests selected. Go back to select tests.</p>
            ) : (
              <div className="space-y-6">
                {observations.map((obs, oi) => (
                  <div key={obs.id} className="border border-gray-200 rounded-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[13px] font-semibold text-gray-900">{obs.testName}</span>
                      <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{obs.testCode}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {obs.measuredValues.map((val, vi) => (
                        <div key={vi}>
                          <label className="block text-[10px] text-gray-500 mb-1">Reading {vi + 1}</label>
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
              onClick={() => {
                alert('Test report submitted for review.\n\nIn production, this would:\n1. Save the complete test record\n2. Change status to PENDING_REVIEW\n3. Notify the reviewer\n4. Redirect to the test reports list');
                window.location.href = '/tests';
              }}
              className="px-5 py-2 bg-green-600 text-white text-[13px] font-medium rounded-sm hover:bg-green-700 transition-colors"
            >
              Submit for Review
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
