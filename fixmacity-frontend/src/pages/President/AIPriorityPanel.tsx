/**
 * PriorityTab.tsx  (or PriorityTab.jsx)
 * ========================================
 * Drop-in replacement for the "PRIORITÉ IA" tab content in
 * your declaration details modal (president view).
 *
 * Handles 3 states:
 *   1. priority_label is null/missing  → "no data" + "Analyser IA" button
 *   2. priority_method = 'fallback'    → shows fallback breakdown
 *   3. priority_method = 'ai'          → shows full AI breakdown
 *
 * Props: { declaration: DeclarationDetail, onAnalyze?: () => void }
 */

import React, { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PriorityMeta {
  score?: number;
  method?: string;
  final_score?: number;
  vote_boost?: number;
  // AI path
  reasoning?: string;
  safety_risk?: number;
  service_impact?: number;
  population_impact?: number;
  temporal_urgency?: number;
  // Fallback path
  categoryScore?: number;
  proximityScore?: number;
  ageScore?: number;
  vBoost?: number;
}

interface DeclarationDetail {
  id: number;
  priority_score?: number | null;
  priority_label?: 'urgent' | 'normal' | 'faible' | null;
  priority_method?: 'ai' | 'fallback' | null;
  priority_meta?: PriorityMeta | null;
  votes_count?: number;
}

interface AIPriorityPanelProps {
  declarationId: string | number;
  data: any;
  onUpdated?: (patch: any) => void;
  readOnly?: boolean;
  showAnalyzeButton?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const LABEL_CONFIG: Record<string, { text: string; color: string; bg: string; bar: string }> = {
  urgent: { text: 'Urgent',  color: '#E24B4A', bg: '#FCEBEB', bar: '#E24B4A' },
  normal: { text: 'Normale', color: '#BA7517', bg: '#FAEEDA', bar: '#EF9F27' },
  faible: { text: 'Faible',  color: '#0F6E56', bg: '#E1F5EE', bar: '#1D9E75' },
};

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 12, color: '#6b7280', minWidth: 32, textAlign: 'right' }}>{value}/{max}</span>
    </div>
  );
}

function MetricCard({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', border: '0.5px solid #e5e7eb' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{label}</div>
      <ScoreBar value={value} max={max} color={color} />
    </div>
  );
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AIPriorityPanel({ declarationId, data, onUpdated, readOnly, showAnalyzeButton = true }: AIPriorityPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);

  const { priority_score, priority_label, priority_method, priority_meta } = data;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      // Determine if we should call the chef or president endpoint based on the URL
      const isChef = window.location.pathname.includes('/chef/');
      const basePath = isChef ? '/chef' : '/president';
      const token = localStorage.getItem('fmc_token');
      
      const res = await fetch(
        `${API}${basePath}/declarations/${declarationId}/recalculate-priority`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const resData = await res.json();
      if (resData.success && onUpdated) {
        onUpdated({
          priority_score:  resData.data.priority_score,
          priority_label:  resData.data.priority_label,
          priority_method: resData.data.priority_method,
          priority_meta:   resData.data.priority_meta,
        });
      }
    } catch (e) {
      console.error('Failed to recalculate priority', e);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── State 1: No priority data at all ──────────────────────────────────────
  let rawLabel = data.president_override || data.priority_label || data.priority;
  if (!rawLabel || priority_score == null) {
    return (
      <div style={{ padding: '16px 0' }}>
        <div style={{
          background: '#FFF3F3',
          border: '0.5px solid #fca5a5',
          borderRadius: 8,
          padding: '14px 16px',
          color: '#b91c1c',
          fontSize: 14,
          marginBottom: 16,
        }}>
          Données de priorité non disponibles pour cette déclaration.
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          La priorité n'a pas encore été calculée. Cliquez sur "Analyser IA" pour lancer l'analyse.
        </p>
        {showAnalyzeButton && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing || readOnly}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 8,
              background: (analyzing || readOnly) ? '#e5e7eb' : '#4f46e5',
              color: (analyzing || readOnly) ? '#9ca3af' : '#fff',
              border: 'none', fontSize: 14, cursor: (analyzing || readOnly) ? 'not-allowed' : 'pointer',
              fontWeight: 500, transition: 'background 0.2s',
            }}
          >
            {analyzing ? '⏳ Analyse en cours…' : '⚡ Analyser IA'}
          </button>
        )}
      </div>
    );
  }

  const dbToLevel: Record<string, string> = {
    haute: 'urgent', high: 'urgent', urgent: 'urgent', critique: 'urgent', critical: 'urgent',
    moyenne: 'normal', medium: 'normal', normal: 'normal',
    basse: 'faible', low: 'faible', faible: 'faible',
  }
  const finalLabel = dbToLevel[rawLabel.toLowerCase()] || 'normal';

  const cfg = LABEL_CONFIG[finalLabel] ?? LABEL_CONFIG.normal;
  const meta: any = priority_meta?.factors ?? priority_meta ?? {};
  const isAI = priority_method === 'ai' || priority_method === 'AI';

  // Score out of 10 for the visual bar (score is 0–100)
  const scoreOutOf10 = Math.round(priority_score / 10);

  return (
    <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header: label + method badge ── */}
      <div style={{
        background: cfg.bg, borderRadius: 10, padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: `0.5px solid ${cfg.color}33`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{isAI ? '🤖' : '⚙️'}</span>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>PRIORITÉ FINALE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                background: cfg.color, color: '#fff',
                borderRadius: 6, padding: '3px 12px',
                fontWeight: 600, fontSize: 14,
              }}>{cfg.text}</span>
              <span style={{
                background: '#f3f4f6', color: '#374151',
                borderRadius: 6, padding: '3px 10px',
                fontSize: 12,
              }}>
                {isAI ? '🤖 Analyse IA' : '⚙️ Calcul automatique'}
              </span>
            </div>
          </div>
        </div>
        {showAnalyzeButton && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing || readOnly}
            style={{
              padding: '6px 12px', borderRadius: 6,
              background: (analyzing || readOnly) ? '#e5e7eb' : 'transparent',
              color: (analyzing || readOnly) ? '#9ca3af' : '#4f46e5',
              border: `0.5px solid ${(analyzing || readOnly) ? '#e5e7eb' : '#4f46e5'}`,
              fontSize: 12, cursor: (analyzing || readOnly) ? 'not-allowed' : 'pointer', fontWeight: 500,
            }}
          >
            {analyzing ? '⏳' : '🔄 Recalculer'}
          </button>
        )}
      </div>

      {/* ── Score breakdown cards ── */}
      {isAI ? (
        // AI path: 4 sub-scores
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <MetricCard label="Risque danger (IA)"     value={meta.ai_danger_score ?? 0} max={40} color="#E24B4A" />
          <MetricCard label="Lieu sensible"          value={meta.sensitive_contribution ?? 0} max={20} color="#EF9F27" />
          <MetricCard label="Boost votes"            value={meta.vote_contribution ?? 0} max={15} color="#185FA5" />
          <MetricCard label="Ancienneté"             value={meta.age_contribution ?? 0} max={10} color="#0F6E56" />
        </div>
      ) : (
        // Fallback path: 4 sub-scores
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <MetricCard label="Lieu sensible"          value={meta.sensitive_contribution ?? meta.sensScore ?? 0} max={30} color="#E24B4A" />
          <MetricCard label="Boost votes"            value={meta.vote_contribution ?? meta.voteScore ?? 0} max={20} color="#185FA5" />
          <MetricCard label="Ancienneté"             value={meta.age_contribution ?? meta.ageScore ?? 0} max={15} color="#BA7517" />
          <MetricCard label="Photo jointe"           value={meta.photo_contribution ?? meta.photoScore ?? 0} max={10} color="#0F6E56" />
        </div>
      )}

      {/* ── AI reasoning text (only for AI path) ── */}
      {isAI && (priority_meta?.ai_description || meta.reasoning) && (
        <div style={{
          background: '#f0f9ff', borderRadius: 8, padding: '10px 14px',
          border: '0.5px solid #bae6fd', fontSize: 13, color: '#0369a1',
          lineHeight: 1.5,
        }}>
          💬 {priority_meta?.ai_description || meta.reasoning}
        </div>
      )}

      {/* ── Total score bar ── */}
      <div style={{
        background: '#f9fafb', borderRadius: 8, padding: '12px 16px',
        border: '0.5px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Score total</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: cfg.color }}>{priority_score}/100</span>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: cfg.color }} />
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
          <div style={{
            width: `${priority_score}%`, height: '100%',
            background: cfg.bar, borderRadius: 4, transition: 'width 0.8s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#9ca3af' }}>
          <span>Faible (0–39)</span>
          <span>Normale (40–69)</span>
          <span>Urgent (70–100)</span>
        </div>
      </div>

      {/* ── Vote count note ── */}
      {(data.votes_count ?? 0) > 0 && (
        <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
          👍 {data.votes_count} vote{(data.votes_count ?? 0) > 1 ? 's' : ''} citoyen(s) pris en compte
        </div>
      )}
    </div>
  );
}
