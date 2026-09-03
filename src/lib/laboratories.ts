/**
 * NAWI TestFlow — Laboratory Registry
 *
 * Canonical mapping between laboratory codes (e.g. `CMTL-PY-01`) and their full
 * display names (e.g. `Central Metrology Testing Lab`).
 *
 * Records in the workflow store keep the short CODE (`test.laboratory`), while
 * users search by the full name — the search engine uses this registry to match
 * either representation. Keep this list in sync with the mock data shown on the
 * Laboratories / Equipment pages.
 */

export interface LaboratoryRecord {
  code: string;
  name: string;
  city?: string;
}

export const LABORATORIES: LaboratoryRecord[] = [
  { code: 'CMTL-PY-01', name: 'Central Metrology Testing Lab', city: 'Prayagraj' },
  { code: 'PITL-PR-02', name: 'Prayagraj Instrument Testing Lab', city: 'Prayagraj' },
  { code: 'NZCL-DL-03', name: 'North Zone Calibration Laboratory', city: 'New Delhi' },
];

export const LAB_BY_CODE: Record<string, LaboratoryRecord> = Object.fromEntries(
  LABORATORIES.map(lab => [lab.code.toLowerCase(), lab])
);

/** Resolve a stored lab code (or full name) into the canonical full name. */
export function labNameFor(value?: string | null): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  if (LAB_BY_CODE[key]) return LAB_BY_CODE[key].name;
  const byName = LABORATORIES.find(lab => lab.name.toLowerCase() === key);
  return byName ? byName.name : null;
}

/**
 * Alias expansion map used by the deep-search engine:
 * code → full name AND full name → code (both lowercase).
 */
export const LAB_SEARCH_ALIASES: Record<string, string> = {};
for (const lab of LABORATORIES) {
  const code = lab.code.toLowerCase();
  const name = lab.name.toLowerCase();
  LAB_SEARCH_ALIASES[code] = name;
  LAB_SEARCH_ALIASES[name] = code;
}
