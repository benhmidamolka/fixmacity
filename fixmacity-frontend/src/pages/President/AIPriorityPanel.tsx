
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Brain, ShieldCheck, ChevronDown, Loader2, CheckCircle2, Building2, School, MapPin, ThumbsUp, Star } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
type PriorityLevel = 'faible' | 'normal' | 'urgent';

interface PriorityData {
  id: string;
  ai_priority: PriorityLevel;
  ai_priority_score: number;
  ai_confidence: number;
  ai_reasoning: string | null;
  ai_visible_issues: string[] | null;
  is_sensitive: boolean;
  sensitive_type: string | null;
  sensitive_distance_m: number | null;
  votes_count: number;
  computed_priority: PriorityLevel;
  computed_score: number;
  final_priority: PriorityLevel;
  president_override: PriorityLevel | null;
  president_override_note: string | null;
  priority_approved: boolean;
  priority_approved_at: string | null;
  approved_by_name: string | null;
  score_ai: number;
  score_votes: number;
  score_location: number;
  score_total: number;
}

interface Props {
  declarationId: string;
  data?: any;
  onUpdated?: (patch: Partial<PriorityData>) => void;
  readOnly?: boolean;
  showAnalyzeButton?: boolean;
}

// ── Priority Meta ─────────────────────────────────────────────────────────
const PRIORITY_META: Record<PriorityLevel, {
  label: string; color: string; bg: string; border: string;
  icon: string; ring: string;
}> = {
  faible: {
    label: 'Faible',   icon: '🟢',
    color:  'text-green-700',
    bg:     'bg-green-50',
    border: 'border-green-200',
    ring:   'ring-green-400',
  },
  normal: {
    label: 'Normal',   icon: '🟡',
    color:  'text-amber-700',
    bg:     'bg-amber-50',
    border: 'border-amber-200',
    ring:   'ring-amber-400',
  },
  urgent: {
    label: 'Urgent',   icon: '🔴',
    color:  'text-red-700',
    bg:     'bg-red-50',
    border: 'border-red-200',
    ring:   'ring-red-400',
  },
};

const SENSITIVE_ICONS: Record<string, string> = {
  hospital: '🏥', school: '🏫', mosque: '🕌',
  market: '🛒', admin: '🏛️', police: '👮', fire_station: '🚒',
};

// ── Sub-components ────────────────────────────────────────────────────────
const ScoreBar = ({
  label, value, max = 10, color = 'bg-indigo-500',
}: {
  label: string; value: number; max?: number; color?: string;
}) => {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-gray-600">
        <span>{label}</span>
        <span className="font-bold text-gray-800">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const PriorityBadge = ({ level, size = 'md' }: { level: PriorityLevel; size?: 'sm' | 'md' | 'lg' }) => {
  const m = PRIORITY_META[level];
  const sz = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1', lg: 'text-base px-4 py-1.5' }[size];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${sz} ${m.bg} ${m.color} ${m.border}`}>
      {m.icon} {m.label}
    </span>
  );
};

// ── Main Component ────────────────────────────────────────────────────────
export default function AIPriorityPanel({ declarationId, data: initialData, onUpdated, readOnly = false, showAnalyzeButton = true }: Props) {
  const auth = useAuth();
  let user: any = auth?.user;
  if (!user) {
    try {
      const stored = localStorage.getItem('fmc_user');
      if (stored) user = JSON.parse(stored);
    } catch (e) {}
  }
  const [pdata,    setPdata]    = useState<PriorityData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Override form state
  const [override,     setOverride]     = useState<PriorityLevel | ''>('');
  const [overrideNote, setOverrideNote] = useState('');
  const [showForm,     setShowForm]     = useState(false);

  // ── Fetch priority data ─────────────────────────────────────────────────
  const fetchPriorityData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/president/declarations/${declarationId}/priority`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` }
      });
      if (!res.ok) {
        if (res.status === 404) {
          // It's possible the declaration doesn't have AI data yet
          return;
        }
        throw new Error('Erreur de chargement des données de priorité');
      }
      const data = await res.json();
      setPdata(data as PriorityData);
    } catch (e: any) {
      setError(e.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [declarationId]);

  useEffect(() => { fetchPriorityData(); }, [fetchPriorityData]);

  // Pre-populate override form when data loads
  useEffect(() => {
    if (pdata) {
      setOverride(pdata.president_override ?? '');
      setOverrideNote(pdata.president_override_note ?? '');
    }
  }, [pdata]);

  // ── Save president decision ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/president/declarations/${declarationId}/priority`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('fmc_token')}` 
        },
        body: JSON.stringify({
          president_override: override || null,
          president_override_note: overrideNote.trim() || null,
          president_id: user.id
        })
      });
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde');
      const data = await res.json();

      // Update local state
      const patch = data as Partial<PriorityData>;
      setPdata(prev => prev ? { ...prev, ...patch } : prev);
      onUpdated?.(patch);
      setShowForm(false);
      setSuccess(
        override
          ? `Priorité modifiée → ${PRIORITY_META[override as PriorityLevel].label}`
          : 'Priorité de l\'IA approuvée ✓'
      );
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // ── Reject override (revert to AI) ─────────────────────────────────────
  const handleRevertToAI = async () => {
    setOverride('');
    setOverrideNote('Revenir à la priorité calculée par l\'IA');
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/president/declarations/${declarationId}/priority`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('fmc_token')}` 
        },
        body: JSON.stringify({
          president_override: null,
          president_override_note: 'Revenir à la priorité calculée par l\'IA',
          president_id: user?.id
        })
      });
      if (!res.ok) throw new Error('Erreur de réinitialisation');
      const data = await res.json();
      
      setPdata(prev => prev ? { ...prev, ...(data as any), president_override: null } : prev);
      onUpdated?.(data as any);
      setSuccess('Priorité réinitialisée à la valeur calculée ✓');
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
      setShowForm(false);
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-indigo-50 rounded-xl animate-pulse" />
          <div className="h-5 bg-gray-100 rounded w-40 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-3 bg-gray-100 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!pdata) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm">
      {error ?? 'Données de priorité non disponibles'}
    </div>
  );

  const finalMeta    = PRIORITY_META[pdata.final_priority];
  const computedMeta = PRIORITY_META[pdata.computed_priority];
  const hasOverride  = !!pdata.president_override;
  const isApproved   = pdata.priority_approved;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className={`px-5 py-4 ${finalMeta.bg} border-b ${finalMeta.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl
              ${finalMeta.bg} border ${finalMeta.border}`}>
              🤖
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Priorité finale</p>
              <div className="flex items-center gap-2 mt-0.5">
                <PriorityBadge level={pdata.final_priority} size="lg" />
                {hasOverride && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                    ✏️ Modifiée par président
                  </span>
                )}
                {isApproved && !hasOverride && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                    ✅ Approuvée
                  </span>
                )}
                {!isApproved && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                    ⏳ En attente d'approbation
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-all"
          >
            {expanded ? '▲ Réduire' : '▼ Détails'}
          </button>
        </div>
      </div>

      {/* ── Score Summary (always visible) ── */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Score IA',     value: pdata.score_ai,       color: 'text-indigo-600', bg: 'bg-indigo-50', max: 10 },
            { label: 'Votes',        value: pdata.score_votes,    color: 'text-blue-600',   bg: 'bg-blue-50',   max: 5  },
            { label: 'Localisation', value: pdata.score_location, color: 'text-green-600',  bg: 'bg-green-50',  max: 4  },
          ].map(c => (
            <div key={c.label} className={`rounded-xl p-3 text-center ${c.bg}`}>
              <p className={`text-xl font-bold ${c.color}`}>+{c.value.toFixed(1)}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Total score bar */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-xs font-semibold text-gray-600">Score total</span>
              <span className="text-xs font-bold text-gray-800">{pdata.score_total.toFixed(1)} / 10</span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  pdata.score_total >= 7 ? 'bg-red-500' :
                  pdata.score_total >= 4 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((pdata.score_total / 10) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="text-2xl">{finalMeta.icon}</div>
        </div>

        {/* Sensitive location badge */}
        {pdata.is_sensitive && pdata.sensitive_type && (
          <div className="mt-3 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
            <span className="text-xl">{SENSITIVE_ICONS[pdata.sensitive_type] ?? '📍'}</span>
            <div>
              <p className="text-xs font-semibold text-orange-700">Zone sensible détectée</p>
              <p className="text-xs text-orange-600">
                {pdata.sensitive_type === 'hospital' ? 'Hôpital' :
                 pdata.sensitive_type === 'school'   ? 'École'   :
                 pdata.sensitive_type === 'mosque'   ? 'Mosquée' :
                 pdata.sensitive_type}
                {pdata.sensitive_distance_m && ` · ${Math.round(pdata.sensitive_distance_m)}m`}
              </p>
            </div>
            <span className="ml-auto text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
              +{pdata.score_location}pts
            </span>
          </div>
        )}
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div className="px-5 pb-4 space-y-4 border-t border-gray-50 pt-4">

          {/* AI Analysis */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">🤖 Analyse IA</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Priorité suggérée</span>
                <PriorityBadge level={pdata.ai_priority} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Confiance</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.round((pdata.ai_confidence ?? 0) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">
                    {Math.round((pdata.ai_confidence ?? 0) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {pdata.ai_reasoning && (
              <div className="mt-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-xs text-indigo-700 leading-relaxed">{pdata.ai_reasoning}</p>
              </div>
            )}

            {pdata.ai_visible_issues && pdata.ai_visible_issues.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {pdata.ai_visible_issues.map((issue, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full border border-gray-200">
                    {issue}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Score breakdown bars */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">📊 Détail du score</p>
            <div className="space-y-2">
              <ScoreBar label="Score IA (0–10)"             value={pdata.score_ai}       max={10} color="bg-indigo-500" />
              <ScoreBar label="Bonus votes (max 5)"         value={pdata.score_votes}    max={5}  color="bg-blue-400"   />
              <ScoreBar label="Bonus localisation (max 4)"  value={pdata.score_location} max={4}  color="bg-orange-400" />
              <div className="border-t border-gray-100 pt-2">
                <ScoreBar label="Score final (0–10)" value={pdata.score_total} max={10}
                  color={pdata.score_total >= 7 ? 'bg-red-500' : pdata.score_total >= 4 ? 'bg-amber-500' : 'bg-green-500'}
                />
              </div>
            </div>
          </div>

          {/* Computed vs final */}
          {hasOverride && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-purple-700 mb-2">✏️ Modification présidentielle</p>
              <div className="flex items-center gap-2 text-sm">
                <PriorityBadge level={pdata.computed_priority} size="sm" />
                <span className="text-gray-400">→</span>
                <PriorityBadge level={pdata.final_priority} size="sm" />
              </div>
              {pdata.president_override_note && (
                <p className="text-xs text-purple-600 mt-2 italic">"{pdata.president_override_note}"</p>
              )}
              {pdata.priority_approved_at && (
                <p className="text-xs text-gray-400 mt-1">
                  {pdata.approved_by_name ?? 'Président'} —{' '}
                  {new Date(pdata.priority_approved_at).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          )}

          {/* Votes info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Votes citoyens</span>
            <span className="font-bold text-blue-600">{pdata.votes_count} vote{pdata.votes_count !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* ── Success / Error messages ── */}
      {success && (
        <div className="mx-5 mb-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
          ✅ {success}
        </div>
      )}
      {error && (
        <div className="mx-5 mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
          ⚠️ {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── Presidential action panel ── */}
      {!readOnly && (
      <div className="px-5 pb-5 pt-2 border-t border-gray-50">
        {!showForm ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all"
            >
              {isApproved ? '✏️ Modifier la priorité' : '✅ Approuver / Modifier'}
            </button>
            {!isApproved && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl bg-green-50 text-green-700 border border-green-200 text-sm font-semibold hover:bg-green-100 transition-all disabled:opacity-60"
              >
                {saving ? '...' : '✓ Approuver l\'IA'}
              </button>
            )}
            {hasOverride && (
              <button
                onClick={handleRevertToAI}
                disabled={saving}
                className="px-3 py-2.5 rounded-xl bg-gray-50 text-gray-500 border border-gray-200 text-xs hover:bg-gray-100 transition-all disabled:opacity-60"
                title="Revenir à la priorité IA"
              >
                🔄
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-700">Définir la priorité finale</p>

            {/* Priority selector */}
            <div className="grid grid-cols-3 gap-2">
              {(['faible', 'normal', 'urgent'] as PriorityLevel[]).map(level => {
                const m = PRIORITY_META[level];
                const selected = override === level;
                return (
                  <button
                    key={level}
                    onClick={() => setOverride(level)}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all flex flex-col items-center gap-1
                      ${selected
                        ? `${m.bg} ${m.border} ${m.color} ring-2 ${m.ring}`
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      }`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Accept AI option */}
            <button
              onClick={() => setOverride('')}
              className={`w-full py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                ${override === ''
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-300'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
            >
              🤖 Accepter la priorité IA ({computedMeta.icon} {computedMeta.label})
            </button>

            {/* Note */}
            <textarea
              value={overrideNote}
              onChange={e => setOverrideNote(e.target.value)}
              placeholder="Note (optionnel) — raison de la modification..."
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none placeholder-gray-400"
            />

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-60"
              >
                {saving ? 'Enregistrement...' : '💾 Confirmer'}
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
