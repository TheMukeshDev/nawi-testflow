/**
 * NAWI Sahayak — Universal Deep-Search Utilities
 *
 * Search helper used by every table/dashboard across all roles. Unlike the old
 * per-page filters (which checked 2–4 hard-coded string fields and crashed on
 * null / nested values), these utilities recursively inspect ANY value inside a
 * record — nested objects, arrays, numbers, booleans — case-insensitively and
 * without ever throwing on null/undefined fields.
 *
 * Laboratory alias bridge: workflow records store the short lab CODE
 * (e.g. `CMTL-PY-01`) while users type the FULL NAME (e.g. "Central Metrology
 * Testing Lab") or partial words ("Central", "Testing"). The registry in
 * `./laboratories` lets either representation match.
 */

import { LAB_SEARCH_ALIASES } from './laboratories';

type AnyRecord = Record<string, unknown>;

function valueMatches(value: unknown, query: string): boolean {
  if (value === null || value === undefined) return false;

  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') {
    const s = String(value).toLowerCase();
    if (s.includes(query)) return true;

    // Code ⇄ full-name bridge for exact lab fields
    const alias = LAB_SEARCH_ALIASES[s];
    return !!alias && alias.includes(query);
  }

  if (Array.isArray(value)) {
    // Recurse into arrays (e.g. observations, readings lists)
    for (const item of value) {
      if (valueMatches(item, query)) return true;
    }
    return false;
  }

  if (type === 'object') {
    // Recurse into plain objects only (avoid React elements / class instances)
    const obj = value as AnyRecord;
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === 'function') continue;
      if (valueMatches(val, query)) return true;
    }
    return false;
  }

  return false;
}

/** True when a single record (row) matches the query on any nested field. */
export function rowMatchesQuery(row: unknown, rawQuery: string): boolean {
  const query = (rawQuery || '').trim().toLowerCase();
  if (!query) return true;
  return valueMatches(row, query);
}

/**
 * Filter a list of records by an insensitive, deep search across every field.
 * Returns the original list unchanged when the query is empty.
 */
export function deepSearch<T>(rows: T[], rawQuery: string): T[] {
  const query = (rawQuery || '').trim().toLowerCase();
  if (!query) return rows;
  return rows.filter(row => valueMatches(row, query));
}
