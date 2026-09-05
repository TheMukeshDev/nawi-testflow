/**
 * NAWI Sahayak — Calculation Engine
 *
 * Client-side OIML R-76 calculation + compliance evaluation. Consumes limits
 * resolved by `rule-engine.ts` (DB-backed + versioned with inline defaults).
 */

import {
  resolveMpe,
  getTestPointRule,
  getEnvironmentalLimits,
  getRulesUsed,
  type InstrumentClass,
} from './rule-engine';

export type ObservationVerdict = 'PASS' | 'FAIL' | 'NOT_CONFIGURED';

export interface ObservationInput {
  testCode: string;
  testName: string;
  measuredValues: string[];
  unit: string;
  notes?: string;
}

export interface InstrumentSpec {
  instrumentClass: InstrumentClass;
  maxCapacity: number;
  maxCapacityUnit: string;
  scaleInterval: number;
  scaleIntervalUnit: string;
  verificationScaleInterval?: number;
}

export interface CalculationOutput {
  testCode: string;
  testName: string;
  unit: string;
  count: number;
  nominalLoad: number;
  mean: number;
  stddev: number;
  min: number;
  max: number;
  range: number;
  worstError: number | null;
  mpe: number | null;
  multiplier: number | null;
  verdict: ObservationVerdict;
  standardVersion: string;
  ruleId: string;
  configured: boolean;
  note?: string;
  limitLabel?: string;
}

function gramFactor(unit: string): number {
  const u = (unit || '').trim().toLowerCase();
  switch (u) {
    case 'kg':
      return 1000;
    case 'mg':
      return 0.001;
    case 'lb':
      return 453.59237;
    case 't':
      return 1_000_000;
    default:
      return 1;
  }
}

/** Convert a value expressed in `fromUnit` into `toUnit`. */
export function convertToUnit(value: number, fromUnit: string, toUnit: string): number {
  return (value * gramFactor(fromUnit)) / gramFactor(toUnit);
}

function stats(vals: number[]): { mean: number; stddev: number; min: number; max: number; range: number } {
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  const stddev = Math.sqrt(variance);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return { mean, stddev, min, max, range: max - min };
}

/**
 * Compute per-reading error against the applied load. For eccentricity the
 * readings are center-first; error is referenced to the center reading.
 * For weighing/linearity/stability, error is |reading − nominalLoad|.
 */
function worstErrorFor(testCode: string, readings: number[], load: number): number {
  if (testCode === 'ECC' && readings.length >= 2) {
    const center = readings[0];
    return Math.max(...readings.slice(1).map(r => Math.abs(r - center)));
  }
  return Math.max(...readings.map(r => Math.abs(r - load)));
}

export interface EvaluateObservationInput {
  observation: ObservationInput;
  instrument: InstrumentSpec;
  nominalLoad: number;
}

export async function calculateObservation(
  input: EvaluateObservationInput,
): Promise<CalculationOutput> {
  const { observation, instrument, nominalLoad } = input;

  const rawVals = observation.measuredValues.map(Number).filter(v => !Number.isNaN(v));
  const outUnit = observation.unit || 'g';

  const base: CalculationOutput = {
    testCode: observation.testCode,
    testName: observation.testName,
    unit: outUnit,
    count: rawVals.length,
    nominalLoad,
    mean: 0,
    stddev: 0,
    min: 0,
    max: 0,
    range: 0,
    worstError: null,
    mpe: null,
    multiplier: null,
    verdict: 'NOT_CONFIGURED',
    standardVersion: 'default',
    ruleId: 'NO_DATA',
    configured: false,
  };

  if (rawVals.length === 0) {
    base.note = 'No measured values entered for this test point.';
    return base;
  }

  const s = stats(rawVals);
  base.mean = s.mean;
  base.stddev = s.stddev;
  base.min = s.min;
  base.max = s.max;
  base.range = s.range;

  // Convert scale interval (e) and nominal load into the observation unit.
  const eObs = convertToUnit(
    instrument.verificationScaleInterval ?? instrument.scaleInterval,
    instrument.scaleIntervalUnit || outUnit,
    outUnit,
  );
  const loadObs = convertToUnit(nominalLoad, outUnit, outUnit);

  // Codes that are evaluated numerically against MPE at the test point.
  const mpeCodes = new Set(['WGT', 'LIN', 'ECC', 'STB']);

  if (observation.testCode === 'RPT') {
    const rule = await getTestPointRule('RPT', instrument.instrumentClass);
    base.standardVersion = rule.standardVersion;
    base.ruleId = `RPT-${rule.standardVersion}`;

    if (rule.maxCvPercent != null && rule.maxCvPercent > 0 && s.mean !== 0) {
      // Coefficient-of-variation limit (national/configured rule).
      const cv = (s.stddev / Math.abs(s.mean)) * 100;
      base.configured = true;
      base.verdict = cv <= rule.maxCvPercent ? 'PASS' : 'FAIL';
      base.mpe = rule.maxCvPercent;
      base.limitLabel = `Repeatability CV limit (max ${rule.maxCvPercent}%)`;
      base.note = `Coefficient of variation ${cv.toFixed(4)}% (std-dev ${s.stddev.toFixed(6)} ${outUnit} over mean ${s.mean.toFixed(6)} ${outUnit}) vs configured limit ${rule.maxCvPercent}%.`;
      return base;
    }

    if (rule.maxStdDev != null && rule.maxStdDev > 0) {
      const limitObs = convertToUnit(rule.maxStdDev, 'g', outUnit);
      base.configured = true;
      base.mpe = limitObs;
      base.limitLabel = `Repeatability limit (max std-dev)`;
      base.verdict = s.stddev <= limitObs ? 'PASS' : 'FAIL';
      base.note = `Std-dev ${s.stddev.toFixed(6)} ${outUnit} vs configured limit ${limitObs.toFixed(6)} ${outUnit}.`;
      return base;
    }

    // Forward-compatible canonical limit: a future revision may declare the
    // repeatability limit via { limit_key, limit_value, limit_unit }.
    if (rule.limit && rule.limit.unit && rule.limit.value > 0) {
      const { key, value, unit } = rule.limit;
      const unitLower = unit.toLowerCase();
      const massUnit = ['g', 'mg', 'kg', 'lb', 't'].includes(unitLower);
      if (massUnit) {
        const limitObs = convertToUnit(value, unitLower, outUnit);
        base.configured = true;
        base.mpe = limitObs;
        base.limitLabel = `Repeatability limit (${key}, ${unitLower})`;
        base.verdict = s.stddev <= limitObs ? 'PASS' : 'FAIL';
        base.note = `Std-dev ${s.stddev.toFixed(6)} ${outUnit} vs configured limit ${limitObs.toFixed(6)} ${outUnit} (${key}).`;
        return base;
      }
      if (unitLower === 'd' && eObs > 0) {
        // std-dev limit expressed in scale intervals: d × e = mass equivalent.
        const limitObs = value * eObs;
        const stdInD = s.stddev / eObs;
        base.configured = true;
        base.mpe = limitObs;
        base.limitLabel = `Repeatability limit (${value} d = ${limitObs.toFixed(6)} ${outUnit})`;
        base.verdict = s.stddev <= limitObs ? 'PASS' : 'FAIL';
        base.note = `Std-dev ${stdInD.toFixed(4)} d (${s.stddev.toFixed(6)} ${outUnit}) vs configured limit ${value} d (${limitObs.toFixed(6)} ${outUnit}).`;
        return base;
      }
      base.verdict = 'NOT_CONFIGURED';
      base.note = `The active rule declares a repeatability limit "${key}" = ${value} ${unit} against OIML ${rule.standardVersion}, but the calculation engine has no procedure for that parameter. Update the limit's unit to a mass unit or "d" to enable numeric evaluation.`;
      return base;
    }

    base.verdict = 'NOT_CONFIGURED';
    base.note =
      'OIML R-76 defines no numeric repeatability limit (result depends on the internal-standard check). Awaiting a configured max_cv_percent / max_std_dev test-point rule.';
    return base;
  }

  if (observation.testCode === 'DIS') {
    const rule = await getTestPointRule('DIS');
    base.standardVersion = rule.standardVersion;
    base.ruleId = `DIS-${rule.standardVersion}`;
    base.verdict = 'NOT_CONFIGURED';
    base.note =
      'Discrimination is a functional check (adding ≈1.4×e must change the indication by ≥ e) and cannot be evaluated from a single column of readings.';
    return base;
  }

  if (mpeCodes.has(observation.testCode)) {
    const resolved = await resolveMpe(instrument.instrumentClass, loadObs, eObs, outUnit);
    base.standardVersion = resolved.standardVersion;
    base.ruleId = resolved.ruleId;
    base.configured = resolved.configured;
    base.mpe = resolved.mpe;
    base.multiplier = resolved.multiplier;
    base.limitLabel = resolved.label;

    const worst = worstErrorFor(observation.testCode, rawVals, loadObs);
    base.worstError = worst;

    let limit = resolved.mpe;
    let limitLabel = resolved.label;
    if (observation.testCode === 'ECC') {
      const erule = await getTestPointRule('ECC', instrument.instrumentClass);
      base.standardVersion = erule.standardVersion;
      if (erule.maxDeviationFraction != null) {
        // Off-center deviation must stay within a fraction of the MPE.
        limit = resolved.mpe * erule.maxDeviationFraction;
        limitLabel = `Eccentricity limit (${erule.maxDeviationFraction} × MPE = ${limit.toFixed(6)} ${outUnit})`;
      }
    }
    base.mpe = limit;
    base.limitLabel = limitLabel;

    base.note =
      `Nominal load ${loadObs.toFixed(6)} ${outUnit}; e = ${eObs.toFixed(6)} ${outUnit}; worst deviation = ${worst.toFixed(6)} ${outUnit}. ` +
      (worst <= limit
        ? `Within ${limitLabel} (${limit.toFixed(6)} ${outUnit}).`
        : `Exceeds ${limitLabel} (${limit.toFixed(6)} ${outUnit}).`);
    base.verdict = worst <= limit ? 'PASS' : 'FAIL';
    return base;
  }

  // Unknown test code — do not invent a verdict.
  base.verdict = 'NOT_CONFIGURED';
  base.note = `Test code "${observation.testCode}" is not handled by the calculation engine.`;
  return base;
}

export interface EnvironmentInput {
  temperature: string;
  humidity: string;
  airPressure: string;
}

export interface ComplianceCheck {
  title: string;
  verdict: 'PASS' | 'FAIL' | 'CONDITIONAL' | 'INFO';
  detail: string;
  standardVersion?: string;
}

export interface ComplianceOutput {
  verdict: 'compliant' | 'non-compliant' | 'conditional' | 'pending';
  checks: ComplianceCheck[];
  standard: string;
  standardVersion: string;
  rulesSource: 'db' | 'default';
  pendingTests: number;
}

export interface EvaluateComplianceInput {
  results: CalculationOutput[];
  environment: EnvironmentInput;
}

export async function evaluateCompliance(
  input: EvaluateComplianceInput,
): Promise<ComplianceOutput> {
  const checks: ComplianceCheck[] = [];
  const pendingTests = input.results.filter(r => r.verdict === 'NOT_CONFIGURED').length;

  const stars = [...new Set(input.results.map(r => r.standardVersion))].join(' / ');

  for (const r of input.results) {
    if (r.verdict === 'NOT_CONFIGURED') {
      checks.push({
        title: `${r.testName} (${r.testCode}) — not evaluated`,
        verdict: 'CONDITIONAL',
        detail:
          r.note ||
          'No applicable rule configured; awaiting rule definition before a firm verdict can be issued.',
        standardVersion: r.standardVersion,
      });
    } else {
      checks.push({
        title: `${r.testName} (${r.testCode})`,
        verdict: r.verdict,
        detail: r.note || '',
        standardVersion: r.standardVersion,
      });
    }
  }

  while (checks.length < input.results.length) {
    checks.push({ title: '—', verdict: 'INFO', detail: '' });
  }

  const envLimits = await getEnvironmentalLimits();
  const temp = parseFloat(input.environment.temperature);
  const hum = parseFloat(input.environment.humidity);

  let envOk = true;
  if (!Number.isNaN(temp)) {
    const inRange = temp >= envLimits.temperature.min && temp <= envLimits.temperature.max;
    envOk = envOk && inRange;
    checks.push({
      title: 'Ambient temperature',
      verdict: inRange ? 'PASS' : 'CONDITIONAL',
      detail: `${temp} °C vs configured range ${envLimits.temperature.min}…${envLimits.temperature.max} °C${
        envLimits.temperature.configured ? '' : ' (default OIML limits)'
      }`,
      standardVersion: envLimits.standardVersion,
    });
  } else {
    checks.push({
      title: 'Ambient temperature',
      verdict: 'INFO',
      detail: 'Not recorded — skipped.',
    });
  }

  if (!Number.isNaN(hum)) {
    const inRange = hum >= envLimits.humidity.min && hum <= envLimits.humidity.max;
    envOk = envOk && inRange;
    checks.push({
      title: 'Relative humidity',
      verdict: inRange ? 'PASS' : 'CONDITIONAL',
      detail: `${hum} %RH vs configured range ${envLimits.humidity.min}…${envLimits.humidity.max} %RH${
        envLimits.humidity.configured ? '' : ' (default OIML limits)'
      }`,
      standardVersion: envLimits.standardVersion,
    });
  } else {
    checks.push({
      title: 'Relative humidity',
      verdict: 'INFO',
      detail: 'Not recorded — skipped.',
    });
  }

  const rulesUsed = await getRulesUsed();
  const hasHardFail = input.results.some(r => r.verdict === 'FAIL');
  const hasConditional = checks.some(c => c.verdict === 'CONDITIONAL') || !envOk;

  const verdict: ComplianceOutput['verdict'] =
    hasHardFail ? 'non-compliant'
    : hasConditional || pendingTests > 0 ? 'conditional'
    : 'compliant';

  return {
    verdict,
    checks,
    standard: rulesUsed.standard,
    standardVersion: stars || rulesUsed.standardVersion,
    rulesSource: rulesUsed.source,
    pendingTests,
  };
}