/**
 * NAWI TestFlow — AI / explanation client helpers.
 *
 * Two-tier strategy:
 *  - Tier 1 (default): rule-based explanations, computed locally AND/OR via
 *    backend /ai/explain-rule etc. No API key, zero AI cost.
 *  - Tier 2 (on-demand): Gemini "Enhance with AI", only when the user clicks
 *    explicitly AND a key is configured (personal key in user Settings, or
 *    admin global key). Personal key is sent per-request via X-Gemini-Key and
 *    never stored server-side for non-admins.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

export const PERSONAL_KEY_LS = 'nawi_gemini_personal_key';
export const AI_STATUS_LS = 'nawi_ai_admin_cache';

export interface AiStatus {
  rule_based_available: boolean;
  ai_enabled: boolean;
  ai_configured: boolean;
  ai_available: boolean;
  setup_required: boolean;
  model: string | null;
  masked_key?: string | null;
  usage_policy?: string;
}

export function getPersonalKey(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(PERSONAL_KEY_LS) || null;
}

export function setPersonalKey(key: string | null) {
  if (typeof window === 'undefined') return;
  if (!key) window.localStorage.removeItem(PERSONAL_KEY_LS);
  else window.localStorage.setItem(PERSONAL_KEY_LS, key.trim());
}

async function req(path: string, init?: RequestInit, personalKey?: string | null) {
  const key = personalKey ?? getPersonalKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (key) headers['X-Gemini-Key'] = key;
  const res = await fetch(`${API_BASE}/api/v1${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export async function fetchAiStatus(): Promise<AiStatus | null> {
  try {
    const data = await req('/ai/settings', { method: 'GET' });
    if (typeof window !== 'undefined')
      window.localStorage.setItem(AI_STATUS_LS, JSON.stringify(data));
    return data as AiStatus;
  } catch {
    // Offline/demo fallback: backend not running — rule-based still works.
    try {
      const cached =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(AI_STATUS_LS)
          : null;
      if (cached) return JSON.parse(cached) as AiStatus;
    } catch { /* ignore */ }
    const personal = getPersonalKey();
    return {
      rule_based_available: true,
      ai_enabled: true,
      ai_configured: !!personal,
      ai_available: !!personal,
      setup_required: !personal,
      model: personal ? 'gemini-3.8-flash' : null,
    };
  }
}

export async function explainRule(decisionData: Record<string, unknown>) {
  // Prefer backend (authoritative rules), fall back to local deterministic
  // rendering so the wizard works fully offline.
  try {
    const data = await req('/ai/explain-rule', {
      method: 'POST',
      body: JSON.stringify(decisionData),
    });
    return data.explanation;
  } catch {
    return localExplain(decisionData);
  }
}

export async function enhanceWithAi(
  decisionData: Record<string, unknown>,
): Promise<{ content: string; source: string; setupRequired?: boolean }> {
  const data = await req('/ai/explain-result', {
    method: 'POST',
    body: JSON.stringify({ ...decisionData, mode: 'ai', api_key: getPersonalKey() || undefined }),
  });
  if (data.assistance) {
    const a = data.assistance;
    return { content: a.content as string, source: (a.source as string) || 'gemini' };
  }
  if (data.explanation) {
    return {
      content: data.explanation.why || data.explanation.headline || 'See rule-based explanation.',
      source: 'rule-based',
      setupRequired: data._meta?.setup_required,
    };
  }
  throw new Error('Unexpected AI response');
}

// ── Local deterministic fallback (mirrors backend rule_explainer) ──

const FORMULAS: Record<string, { name: string; formula: string; decision: string; procedure: string }> = {
  WGT: {
    name: 'Weighing (Gross Load)',
    formula: 'E = I + ½·e − ΔL − L;  E_c = E − E0',
    decision: 'PASS if |E_c| ≤ MPE(L) for every load (MPE from OIML R 76-1 Table 2)',
    procedure: 'Apply load L → record I → find ΔL → compute E → correct by E0 → compare |E_c| vs MPE(L).',
  },
  RPT: {
    name: 'Repeatability',
    formula: 's = √(Σ(xi − x̄)²/(n−1)); compare s vs configured national limit',
    decision: 'PASS if s ≤ limit (OIML gives no numeric limit — must be configured)',
    procedure: 'Repeat same load ≥5× → mean + std-dev → compare vs limit.',
  },
  ECC: {
    name: 'Eccentricity',
    formula: 'E_i = I_i + ½·e − ΔL − L − E0 per position',
    decision: 'PASS if every position |E_c(i)| ≤ MPE(L)',
    procedure: 'Center → front/back/left/right → worst position within MPE(L).',
  },
  LIN: {
    name: 'Linearity',
    formula: 'err_i = |indicated − reference|; max_err = max(err_i)',
    decision: 'PASS if max error ≤ limit at each load',
    procedure: 'Min → 25% → 50% → 75% → Max → worst error within limit.',
  },
  DIS: {
    name: 'Discrimination',
    formula: 'ΔI = I_after − I_before; PASS if |ΔI| ≥ 1 d',
    decision: 'PASS if indication shifts ≥ 1 scale interval (R 76-2 §5.8)',
    procedure: 'Stable reading → add small weight → must shift ≥ 1 d.',
  },
  STB: {
    name: 'Stability',
    formula: 'drift = I_final − I_initial',
    decision: 'PASS if |drift| ≤ configured limit',
    procedure: 'Initial reading → wait → final reading → drift within limit.',
  },
};

export function localExplain(d: Record<string, unknown>) {
  const code = String(d.test_code ?? '').toUpperCase();
  const f = FORMULAS[code] ?? { name: String(d.test_name ?? code), formula: '—', decision: '—', procedure: '—' };
  const calc = d.calculated_value as number | null;
  const lim = d.applicable_limit as number | null;
  const decision = String(d.decision ?? 'unknown');
  const margin =
    typeof calc === 'number' && typeof lim === 'number' ? lim - calc : null;
  return {
    source: 'rule-based',
    ai_used: false,
    title: `${d.test_name ?? f.name} — ${decision.toUpperCase()} (rule-based)`,
    headline:
      decision === 'fail' && margin !== null
        ? `FAIL: ${calc} exceeds allowed ${lim} (excess ${Math.abs(margin).toFixed(4)}).`
        : decision === 'pass'
          ? `PASS: ${calc} within allowed ${lim}.`
          : String(d.reason ?? ''),
    why: String(d.reason ?? ''),
    test_code: code,
    test_name: (d.test_name as string) ?? f.name,
    decision,
    formula: f.formula,
    decision_rule: f.decision,
    procedure: f.procedure,
    steps: [
      `Computed ${calc} using: ${f.formula}.`,
      `Rule ${d.rule_id} v${d.rule_version} → limit ${lim}.`,
      `Verdict: ${decision.toUpperCase()} — ${d.reason ?? ''}`,
    ],
    comparison: [],
    calculated_value: calc,
    applicable_limit: lim,
    margin,
    excess: margin !== null && margin < 0 ? Math.abs(margin) : null,
    rule: { rule_id: d.rule_id, rule_version: d.rule_version },
    official_reason: d.reason,
    note: 'Local rule-based explanation (backend unreachable) — no AI used.',
  };
}
