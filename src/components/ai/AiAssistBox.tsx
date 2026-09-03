/**
 * NAWI TestFlow — AiAssistBox (rule-first, on-demand AI).
 *
 * Shows the deterministic rule-based explanation by default (zero AI cost).
 * A secondary "Enhance with AI" button calls Gemini ONLY on explicit click
 * and only when a key is configured; otherwise it links to Settings.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { enhanceWithAi, fetchAiStatus } from '@/lib/ai';

interface Props {
  decisionData: Record<string, unknown>;
  ruleExplanation: {
    title: string;
    headline: string;
    why: string;
    formula: string;
    decision_rule: string;
    procedure: string;
    steps: string[];
    calculated_value?: unknown;
    applicable_limit?: unknown;
    margin?: number | null;
    excess?: number | null;
    rule?: { rule_id?: unknown; rule_version?: unknown };
    official_reason?: unknown;
  } | null;
  compact?: boolean;
}

export function AiAssistBox({ decisionData, ruleExplanation, compact }: Props) {
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);

  const onEnhance = async () => {
    setLoading(true);
    setError(null);
    setNeedsKey(false);
    try {
      const status = await fetchAiStatus().catch(() => null);
      if (status && status.setup_required) {
        setNeedsKey(true);
        setLoading(false);
        return;
      }
      const r = await enhanceWithAi(decisionData);
      if (r.setupRequired) {
        setNeedsKey(true);
      } else {
        setAiText(r.content);
        setAiSource(r.source);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-sm">
      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-gray-900">Why this result?</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-green-50 text-green-700 border border-green-200">
            Rule-based · no AI used
          </span>
        </div>
        {!compact && (
          <span className="text-[10px] text-gray-400 font-mono">
            {String(ruleExplanation?.rule?.rule_id ?? '')} v{String(ruleExplanation?.rule?.rule_version ?? '')}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        {ruleExplanation ? (
          <>
            <p className="text-[12px] font-medium text-gray-900">{ruleExplanation.headline}</p>
            <p className="text-[12px] text-gray-600 leading-relaxed">{ruleExplanation.why}</p>
            <div className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-sm p-2 font-mono">
              <div>Formula: {ruleExplanation.formula}</div>
              <div className="mt-1">Rule: {ruleExplanation.decision_rule}</div>
              <div className="mt-1">Process: {ruleExplanation.procedure}</div>
            </div>
            {!compact && ruleExplanation.steps?.length > 0 && (
              <ol className="text-[11px] text-gray-500 list-decimal ml-4 space-y-0.5">
                {ruleExplanation.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            )}
          </>
        ) : (
          <p className="text-[12px] text-gray-400">No explanation available yet — run calculation first.</p>
        )}

        {/* On-demand AI */}
        {aiText && (
          <div className="mt-2 border border-blue-200 bg-blue-50/50 rounded-sm p-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-800 border border-blue-200">
                AI-enhanced ({aiSource ?? 'gemini'})
              </span>
              <span className="text-[10px] text-gray-400">Informational only — verdict unchanged</span>
            </div>
            <p className="text-[12px] text-gray-700 whitespace-pre-wrap leading-relaxed">{aiText}</p>
          </div>
        )}
        {needsKey && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-sm text-[11px] text-amber-800">
            AI enhancement needs a Gemini API key.{' '}
            <Link href="/settings" className="underline font-semibold">Add it in Settings</Link>
            {' '}or ask an admin to configure the global key in System Settings. Rule-based explanation above is complete without AI.
          </div>
        )}
        {error && <p className="text-[11px] text-red-600">{error}</p>}

        <div>
          <button
            onClick={onEnhance}
            disabled={loading || !ruleExplanation}
            className="px-3 py-1.5 text-[12px] font-medium rounded-sm border border-blue-200 bg-blue-50 text-[#1e3a5f] hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Asking Gemini…' : aiText ? 'Regenerate AI explanation' : 'Enhance with AI (optional)'}
          </button>
          <span className="ml-2 text-[10px] text-gray-400">AI used only on this click · key required</span>
        </div>
      </div>
    </div>
  );
}
