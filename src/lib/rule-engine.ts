/**
 * NAWI Sahayak — Rule Engine (DB-backed, versioned OIML R-76)
 *
 * Loads compliance rules from the `compliance_rules` table via the /api/db
 * proxy and resolves applicable limits for calculations/compliance.
 *
 * Versioning: rules carry `standard` + `standard_version`; the most recent
 * active version is preferred. If the database has no rows (e.g. fresh
 * environment or DB unreachable), the engine falls back to the OIML R 76-1
 * (Table 2) defaults embedded below so calculations never silently produce
 * nonsense.
 */

export type InstrumentClass = 'I' | 'II' | 'III' | 'IIII';

export interface ComplianceRuleRow {
  id: string;
  standard: string;
  standard_version: string;
  rule_type: 'mpe_table' | 'test_point' | 'instrument_class' | 'environmental';
  rule_name: string;
  rule_data: Record<string, unknown>;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface MpeBand {
  min_divisions: number | null;
  max_divisions: number | null;
  multiplier: number;
}

export interface ResolvedLimit {
  limitKey: string;
  label: string;
  value: number;
  unit: string;
  mpe?: number;
  ruleId: string;
  ruleVersion: string;
  standard: string;
  standardVersion: string;
  description?: string;
  configured: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// DEFAULT OIML R 76-1 TABLE 2 (verification MPE, in units of e)
// Used only when the DB has no mpe_table row for the class.
// ─────────────────────────────────────────────────────────────────────────

const DEFAULT_MPE_TABLES: Record<InstrumentClass, MpeBand[]> = {
  I: [
    { min_divisions: 0, max_divisions: 50000, multiplier: 0.5 },
    { min_divisions: 50000, max_divisions: 200000, multiplier: 1.0 },
    { min_divisions: 200000, max_divisions: null, multiplier: 1.5 },
  ],
  II: [
    { min_divisions: 0, max_divisions: 5000, multiplier: 0.5 },
    { min_divisions: 5000, max_divisions: 20000, multiplier: 1.0 },
    { min_divisions: 20000, max_divisions: null, multiplier: 1.5 },
  ],
  III: [
    { min_divisions: 0, max_divisions: 500, multiplier: 0.5 },
    { min_divisions: 500, max_divisions: 2000, multiplier: 1.0 },
    { min_divisions: 2000, max_divisions: null, multiplier: 1.5 },
  ],
  IIII: [
    { min_divisions: 0, max_divisions: 50, multiplier: 0.5 },
    { min_divisions: 50, max_divisions: 200, multiplier: 1.0 },
    { min_divisions: 200, max_divisions: null, multiplier: 1.5 },
  ],
};

const DEFAULT_ENVIRONMENTAL = {
  temperature: { min: -10, max: 40, unit: '°C' },
  humidity: { min: 0, max: 85, unit: '%RH' },
};

// ─────────────────────────────────────────────────────────────────────────
// RULES CACHE
// ─────────────────────────────────────────────────────────────────────────

let rulesCache: ComplianceRuleRow[] | null = null;
let rulesCacheAt: number | null = null;
const RULES_TTL_MS = 60 * 1000;

export function invalidateRulesCache(): void {
  rulesCache = null;
  rulesCacheAt = null;
}

async function fetchRules(): Promise<ComplianceRuleRow[]> {
  const now = Date.now();
  if (rulesCache && rulesCacheAt !== null && now - rulesCacheAt < RULES_TTL_MS) {
    return rulesCache;
  }
  try {
    const res = await fetch('/api/db/compliance_rules?select=*&order=standard_version.desc');
    if (!res.ok) throw new Error(`compliance_rules fetch failed: ${res.status}`);
    const rows = (await res.json()) as ComplianceRuleRow[];
    rulesCache = Array.isArray(rows) ? rows.filter(r => r.is_active !== false) : [];
    rulesCacheAt = Date.now();
  } catch (err) {
    console.warn('[RuleEngine] Failed to load rules from DB, using defaults:', err);
    rulesCache = [];
    rulesCacheAt = Date.now();
  }
  return rulesCache;
}

const DEFAULT_STANDARD = 'OIML R-76';
const DEFAULT_VERSION = '2006';

/**
 * Normalise a standard name for identity comparison (e.g. "OIML-R76" and
 * "OIML R-76" are the same publication). Future revisions may be published
 * under slightly different spellings without breaking rule matching.
 */
export function normalizeStandard(standard: string | null | undefined): string {
  return String(standard ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function standardMatches(rowStandard: string, want?: string): boolean {
  return normalizeStandard(rowStandard) === normalizeStandard(want || DEFAULT_STANDARD);
}

/** Extract the first 4+-digit number in a version tag (publication year normally). */
function versionNumeric(v: string): number {
  const m = String(v).match(/\d{4}|\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

/**
 * Order versions so the newest revision always wins, including across mixed
 * naming conventions: consider the leading year number first, then the full
 * tag (numeric-aware) descending. E.g. "DEMO-2026.01" > "2006" > "1999".
 */
function byVersionDesc(a: string, b: string): number {
  const na = versionNumeric(a);
  const nb = versionNumeric(b);
  if (na !== nb) return nb - na;
  return b.localeCompare(a, undefined, { numeric: true });
}

export interface ActiveVersion {
  standard: string;
  standardVersion: string;
  source: 'db' | 'default';
  rowCount: number;
}

export interface VersionFilter {
  standard?: string;
  standardVersion?: string;
}

function configuredVersion(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem('nawi_admin_sys_settings');
    if (!raw) return undefined;
    const settings = JSON.parse(raw) as { key?: string; value?: string }[];
    const setting = settings.find(item => item.key === 'rule_version');
    return setting?.value?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function isMassUnit(unit: string): boolean {
  return ['g', 'mg', 'kg', 'lb', 't'].includes(String(unit).toLowerCase());
}

/**
 * Resolve which standard version is currently in force for the (default or
 * caller-provided) standard. Defaults to the newest published revision; a
 * caller can pin an exact `standardVersion`. Falls back to the built-in OIML
 * defaults when the database has no matching rows.
 */
export async function resolveActiveVersion(opts?: VersionFilter): Promise<ActiveVersion> {
  const rows = await fetchRules();
  const scoped = rows.filter(r => r.is_active !== false && standardMatches(r.standard, opts?.standard));
  const versions = [...new Set(scoped.map(r => r.standard_version).filter(Boolean))].sort(byVersionDesc);
  if (versions.length === 0) {
    return {
      standard: opts?.standard || DEFAULT_STANDARD,
      standardVersion: opts?.standardVersion || DEFAULT_VERSION,
      source: 'default',
      rowCount: 0,
    };
  }
  const selectedVersion = configuredVersion();
  const version =
    opts?.standardVersion && versions.includes(opts.standardVersion)
      ? opts.standardVersion
      : selectedVersion && versions.includes(selectedVersion)
        ? selectedVersion
        : versions[0];
  return { standard: opts?.standard || DEFAULT_STANDARD, standardVersion: version, source: 'db', rowCount: scoped.length };
}

function rowsForActive(rows: ComplianceRuleRow[], active: ActiveVersion): ComplianceRuleRow[] {
  return rows.filter(
    r => r.is_active !== false && standardMatches(r.standard, active.standard) && r.standard_version === active.standardVersion,
  );
}

function parseMultiplier(mpe: unknown): number | null {
  if (typeof mpe === 'number' && !Number.isNaN(mpe)) return mpe;
  if (typeof mpe === 'string') {
    const m = mpe.trim().match(/^([\d.]+)\s*e?$/i);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

function bandsFromRuleData(ruleData: Record<string, unknown>): MpeBand[] | null {
  // Fallback/seed shape: { class, rules: [{min_divisions, max_divisions, multiplier}] }
  const rules = ruleData.rules as MpeBand[] | undefined;
  if (Array.isArray(rules) && rules.length > 0) {
    const normalized = rules
      .map(r => ({
        min_divisions: r.min_divisions ?? 0,
        max_divisions: r.max_divisions ?? null,
        multiplier: Number(r.multiplier),
      }))
      .filter(r => !Number.isNaN(r.multiplier));
    if (normalized.length > 0) return normalized;
  }
  // Live shape: { instrument_class, mpe_ranges: [{min_load, max_load, mpe:"0.5e"}] }
  const ranges = ruleData.mpe_ranges as
    | { min_load?: number; max_load?: number | null; mpe?: number | string }[]
    | undefined;
  if (Array.isArray(ranges) && ranges.length > 0) {
    const normalized = ranges
      .map(r => ({
        min_divisions: Number(r.min_load) || 0,
        max_divisions: r.max_load == null ? null : Number(r.max_load),
        multiplier: parseMultiplier(r.mpe),
      }))
      .filter(r => r.multiplier !== null) as MpeBand[];
    if (normalized.length > 0) return normalized;
  }
  return null;
}

function mpeBandsForClass(rows: ComplianceRuleRow[], instrumentClass: InstrumentClass): MpeBand[] {
  const tableRows = rows.filter(
    r =>
      r.rule_type === 'mpe_table' &&
      String(r.rule_data?.instrument_class ?? r.rule_data?.class ?? '').toUpperCase() === String(instrumentClass),
  );
  if (tableRows.length > 0) {
    tableRows.sort((a, b) => byVersionDesc(a.standard_version, b.standard_version));
    const bands = bandsFromRuleData(tableRows[0].rule_data);
    if (bands && bands.length > 0) {
      return bands;
    }
  }
  return DEFAULT_MPE_TABLES[instrumentClass];
}

export interface MpeResolution {
  multiplier: number;
  mpe: number;
  unit: string;
  ruleId: string;
  ruleVersion: string;
  standard: string;
  standardVersion: string;
  configured: boolean;
  label: string;
  description?: string;
}

/**
 * Resolve the verification MPE for a load applied to the instrument.
 *
 * n = L/e (L and e in the same unit); the multiplier band is selected per
 * OIML R 76-1 Table 2. MPE is expressed in the *load unit* (multiplier × e).
 */
export async function resolveMpe(
  instrumentClass: InstrumentClass,
  load: number,
  e: number,
  unit: string,
  opts?: VersionFilter,
): Promise<MpeResolution> {
  const rows = await fetchRules();
  const active = await resolveActiveVersion(opts);
  const scoped = rowsForActive(rows, active);
  const bands = mpeBandsForClass(scoped, instrumentClass);

  if (!(e > 0)) {
    const row = scoped.find(r => r.rule_type === 'mpe_table');
    return {
      multiplier: 0,
      mpe: 0,
      unit,
      ruleId: row?.id ?? 'FALLBACK',
      ruleVersion: active.standardVersion,
      standard: active.standard,
      standardVersion: active.standardVersion,
      configured: true,
      label: 'Maximum Permissible Error',
    };
  }

  const divisions = load / e;
  const band = bands.find(
    b => divisions >= (b.min_divisions ?? 0) && (b.max_divisions === null || divisions < b.max_divisions),
  ) ?? bands[bands.length - 1];
  const multiplier = band?.multiplier ?? 1.0;
  const mpe = multiplier * e;

  const moduleRow = scoped.find(
    r => r.rule_type === 'mpe_table' && String(r.rule_data?.instrument_class ?? r.rule_data?.class ?? '').toUpperCase() === String(instrumentClass),
  );
  const standardVersion = active.source === 'db' ? active.standardVersion : moduleRow?.standard_version ?? DEFAULT_VERSION;

  return {
    multiplier,
    mpe,
    unit,
    ruleId: band ? moduleRow?.id ?? 'FALLBACK-MPE' : 'FALLBACK-MPE',
    ruleVersion: standardVersion,
    standard: active.standard,
    standardVersion,
    configured: true,
    label: `Maximum Permissible Error (${multiplier} × e, n ≤ ${band?.max_divisions ?? '∞'})`,
  };
}

export interface EnvironmentalLimits {
  temperature: { min: number; max: number; unit: string; configured: boolean };
  humidity: { min: number; max: number; unit: string; configured: boolean };
  standard: string;
  standardVersion: string;
}

export async function getEnvironmentalLimits(opts?: VersionFilter): Promise<EnvironmentalLimits> {
  const rows = await fetchRules();
  const active = await resolveActiveVersion(opts);
  const scoped = rowsForActive(rows, active);
  const envRows = scoped.filter(r => r.rule_type === 'environmental');
  envRows.sort((a, b) => byVersionDesc(a.standard_version, b.standard_version));
  const env = envRows[0]?.rule_data;

  const temperature = (env?.temperature as { min?: number; max?: number; unit?: string } | undefined) ?? null;
  const humidity = (env?.humidity as { min?: number; max?: number; unit?: string } | undefined) ?? null;

  return {
    temperature: {
      min: temperature?.min ?? DEFAULT_ENVIRONMENTAL.temperature.min,
      max: temperature?.max ?? DEFAULT_ENVIRONMENTAL.temperature.max,
      unit: temperature?.unit ?? DEFAULT_ENVIRONMENTAL.temperature.unit,
      configured: !!temperature,
    },
    humidity: {
      min: humidity?.min ?? DEFAULT_ENVIRONMENTAL.humidity.min,
      max: humidity?.max ?? DEFAULT_ENVIRONMENTAL.humidity.max,
      unit: humidity?.unit ?? DEFAULT_ENVIRONMENTAL.humidity.unit,
      configured: !!humidity,
    },
    standard: active.standard,
    standardVersion: envRows[0]?.standard_version ?? active.standardVersion,
  };
}

export interface TestPointRule {
  testCode: string;
  decision: string;
  mpeSource?: string;
  limitConfigured?: boolean;
  maxStdDev?: number;
  maxCvPercent?: number;
  maxDeviationFraction?: number;
  minScaleIntervals?: number;
  maxDriftFraction?: number;
  /** Canonical limit carried verbatim from the rule row (forward-compatible). */
  limit?: GenericRuleLimit | null;
  standard: string;
  standardVersion: string;
}

export interface GenericRuleLimit {
  key: string;
  value: number;
  unit: string;
  description?: string;
}

const DEFAULT_LIMIT_UNIT_BY_KEY: Record<string, string> = {
  max_std_dev: 'g',
  max_cv_percent: '%',
  max_deviation_fraction: 'fraction',
  min_scale_intervals: 'd',
  max_drift_fraction: 'fraction',
  max_linearity: 'e',
  max_eccentricity: 'e',
  min_discrimination: 'd',
};

/**
 * Extract a canonical numeric limit from a rule row.
 *
 * Two shapes are supported so future OIML revisions can express any limit
 * without engine changes:
 *   1. Explicit/canonical: { limit_key, limit_value, limit_unit }
 *   2. Known specific keys (max_std_dev, max_cv_percent, …) with an optional
 *      <key>_unit override.
 * Returns null when the rule is explicitly unconfigured (RULE_NOT_CONFIGURED)
 * or carries no numeric limit.
 */
export function extractRuleLimit(data: Record<string, unknown>): GenericRuleLimit | null {
  if ((data as { limit?: unknown }).limit === 'RULE_NOT_CONFIGURED') return null;

  const explicitValue = toNumber(data.limit_value);
  if (explicitValue != null) {
    return {
      key: String(data.limit_key ?? ''),
      value: explicitValue,
      unit: String(data.limit_unit ?? ''),
      description: data.description ? String(data.description) : undefined,
    };
  }

  for (const [key, defaultUnit] of Object.entries(DEFAULT_LIMIT_UNIT_BY_KEY)) {
    const v = toNumber(data[key]);
    if (v != null) {
      const override = data[`${key}_unit`];
      return {
        key,
        value: v,
        unit: String(override ?? defaultUnit),
        description: data.description ? String(data.description) : undefined,
      };
    }
  }
  return null;
}

function toNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Resolve the algorithm/limit rule for a specific test code (RPT, ECC, WGT,
 * LIN, DIS, STB). Prefers a class-specific rule, then an `all`-class rule.
 * RPT has no numeric limit under OIML R-76 — it returns limitConfigured=false
 * unless a configured test-point rule defines a limit (max_std_dev,
 * max_cv_percent, or the canonical limit_key/limit_value trio).
 *
 * `limitConfigured` is true whenever a numeric limit is present in any shape,
 * so UI/compliance never reports "not configured" for a rule that actually
 * carries a value under a future revision.
 */
export async function getTestPointRule(
  testCode: string,
  instrumentClass?: InstrumentClass,
  opts?: VersionFilter,
): Promise<TestPointRule> {
  const rows = await fetchRules();
  const active = await resolveActiveVersion(opts);
  const scoped = rowsForActive(rows, active);
  const matching = scoped.filter(r => r.rule_type === 'test_point' && r.rule_data?.test_code === testCode);
  matching.sort((a, b) => byVersionDesc(a.standard_version, b.standard_version));

  const rule =
    matching.find(
      r =>
        instrumentClass &&
        r.rule_data?.instrument_class !== 'all' &&
        String(r.rule_data?.instrument_class).toUpperCase() === String(instrumentClass).toUpperCase(),
    ) ??
    matching.find(r => !r.rule_data?.instrument_class || String(r.rule_data?.instrument_class) === 'all') ??
    matching[0];

  const fallback: TestPointRule = {
    testCode,
    decision: '',
    standard: active.standard,
    standardVersion: active.standardVersion,
    limitConfigured: false,
    limit: null,
  };

  if (!rule) return fallback;

  const data = rule.rule_data;
  const limit = extractRuleLimit(data);

  let maxStdDev = toNumber(data.max_std_dev);
  const explicitCv = toNumber(data.max_cv_percent);
  let maxCvPercent = explicitCv;
  let maxDeviationFraction = toNumber(data.max_deviation_fraction);
  let minScaleIntervals = toNumber(data.min_scale_intervals);
  let maxDriftFraction = toNumber(data.max_drift_fraction);

  // Map canonical limits onto typed fields only where the semantics are
  // unambiguous, so the existing calculation paths reuse future rules.
  if (limit) {
    const { key, unit } = limit;
    if (maxCvPercent == null && (key === 'max_cv_percent' || String(unit).toLowerCase() === '%')) {
      maxCvPercent = limit.value;
    }
    if (maxStdDev == null && (key === 'max_std_dev' || isMassUnit(unit))) {
      maxStdDev = limit.value;
    }
    if (maxDeviationFraction == null && key === 'max_deviation_fraction') {
      maxDeviationFraction = limit.value;
    }
    if (maxDriftFraction == null && key === 'max_drift_fraction') {
      maxDriftFraction = limit.value;
    }
    if (minScaleIntervals == null && key === 'min_scale_intervals') {
      minScaleIntervals = limit.value;
    }
  }

  return {
    testCode,
    decision: String(data.decision ?? ''),
    mpeSource: data.mpe_source ? String(data.mpe_source) : undefined,
    limitConfigured: limit != null,
    maxStdDev,
    maxCvPercent,
    maxDeviationFraction,
    minScaleIntervals,
    maxDriftFraction,
    limit,
    standard: rule.standard,
    standardVersion: rule.standard_version,
  };
}

export async function getRulesUsed(opts?: VersionFilter): Promise<{ standard: string; standardVersion: string; source: 'db' | 'default' }> {
  const active = await resolveActiveVersion(opts);
  if (active.source === 'default') {
    return { standard: active.standard, standardVersion: 'default', source: 'default' };
  }
  return { standard: active.standard, standardVersion: active.standardVersion, source: 'db' };
}

export interface SupportedVersion {
  standard: string;
  standardVersion: string;
  rowCount: number;
}

/** All rule revisions present in the database, newest first. */
export async function getSupportedVersions(): Promise<SupportedVersion[]> {
  const rows = await fetchRules();
  const groups = new Map<string, SupportedVersion>();
  for (const r of rows) {
    if (r.is_active === false || !r.standard_version) continue;
    const key = `${normalizeStandard(r.standard)}|${r.standard_version}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rowCount += 1;
    } else {
      groups.set(key, {
        standard: r.standard,
        standardVersion: r.standard_version,
        rowCount: 1,
      });
    }
  }
  return [...groups.values()].sort((a, b) => byVersionDesc(a.standardVersion, b.standardVersion));
}