// src/components/president/AIPriorityPanel.tsx
// Shows: AI analysis result, auto-computed priority (votes + AI + location),
// and lets the President approve or override it.

import React, { useState } from 'react'
import {
  Brain, Zap, MapPin, ThumbsUp, ShieldCheck, ChevronDown,
  Loader2, CheckCircle2, AlertTriangle, AlertCircle, Info,
  School, Building2, Star
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''
const hdr = () => ({ Authorization: `Bearer ${tok()}` })

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriorityData {
  // Stored on declaration
  priority:              string    // 'haute' | 'moyenne' | 'basse'
  priority_score:        number
  computed_priority:     string    // 'urgent' | 'normal' | 'faible'
  priority_approved:     boolean
  priority_approved_at?: string
  // AI fields
  used_ai_vision:        boolean
  ai_priority?:          string    // 'urgent' | 'normal' | 'faible'
  ai_priority_score?:    number
  ai_confidence?:        number
  ai_reasoning?:         string
  ai_visible_issues?:    string[]
  ai_severity_label?:    string
  ai_analyzed_at?:       string
  // Votes & location
  votes_count:           number
  is_sensitive:          boolean
  sensitive_type?:       string
}

interface Props {
  declarationId: string
  data: PriorityData
  onUpdated: (patch: Partial<PriorityData>) => void
  /** Pass true if analyzing inline on the detail page */
  showAnalyzeButton?: boolean
  /** Read-only mode for Chef/Agent viewers */
  readOnly?: boolean
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CFG = {
  urgent: { label: 'Urgent',  color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: AlertTriangle, ring: 'ring-red-200 dark:ring-red-900/30' },
  normal: { label: 'Normal',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: AlertCircle,   ring: 'ring-amber-200 dark:ring-amber-900/30' },
  faible: { label: 'Faible',  color: '#059669', bg: '#F0FDF4', border: '#A7F3D0', icon: CheckCircle2,  ring: 'ring-emerald-200 dark:ring-emerald-900/30' },
}

function priorityFromDb(p: string): keyof typeof PRIORITY_CFG {
  if (p === 'haute' || p === 'urgent')  return 'urgent'
  if (p === 'basse' || p === 'faible')  return 'faible'
  return 'normal'
}

function dbFromPriority(p: keyof typeof PRIORITY_CFG): string {
  return p === 'urgent' ? 'haute' : p === 'faible' ? 'basse' : 'moyenne'
}

// Mini score bar
function ScoreBar({ score, max = 20, color }: { score: number; max?: number; color: string }) {
  const pct = Math.min((score / max) * 100, 100)
  return (
    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

const AIPriorityPanel: React.FC<Props> = ({ declarationId, data, onUpdated, showAnalyzeButton = true, readOnly = false }) => {
  const [analyzing,   setAnalyzing]   = useState(false)
  const [approving,   setApproving]   = useState(false)
  const [overriding,  setOverriding]  = useState(false)
  const [showOverride,setShowOverride]= useState(false)
  const [aiResult,    setAIResult]    = useState<any>(null)

  // Derive current state
  const computedKey = priorityFromDb(data.computed_priority || data.priority)
  const cfg         = PRIORITY_CFG[computedKey]
  const Icon        = cfg.icon

  const sensitiveLabel = data.sensitive_type === 'hospital' ? 'Proximité hôpital'
    : data.sensitive_type === 'school' ? 'Proximité école'
    : data.sensitive_type ? `Zone sensible (${data.sensitive_type})`
    : null

  // ── Analyze with AI ──────────────────────────────────────────────

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch(`${API}/president/declarations/${declarationId}/analyze-image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...hdr() }
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur')
      const result = await res.json()
      setAIResult(result)
      // Map to our format and push upstream
      const aiKey = priorityFromDb(result.ai_priority || result.priority || 'normal')
      const scoreMap = { urgent: 10, normal: 5, faible: 1 }
      onUpdated({
        ai_priority:       aiKey,
        ai_priority_score: scoreMap[aiKey],
        ai_confidence:     result.confidence,
        ai_reasoning:      result.reasoning,
        ai_visible_issues: result.visible_issues || [],
        ai_severity_label: result.severity_label,
        ai_analyzed_at:    new Date().toISOString(),
        used_ai_vision:    true,
      })
    } catch (e: any) {
      console.error('[AIPriorityPanel] analyze error:', e)
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Approve current computed priority ────────────────────────────

  const handleApprove = async () => {
    setApproving(true)
    try {
      const res = await fetch(`${API}/president/declarations/${declarationId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({ priority: computedKey, ai_confirmed: true }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur')
      onUpdated({ priority_approved: true, priority_approved_at: new Date().toISOString() })
    } catch (e: any) {
      console.error('[AIPriorityPanel] approve error:', e)
    } finally {
      setApproving(false)
    }
  }

  // ── Manual override ──────────────────────────────────────────────

  const handleOverride = async (newPriority: keyof typeof PRIORITY_CFG) => {
    setOverriding(true)
    try {
      const res = await fetch(`${API}/president/declarations/${declarationId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({ priority: newPriority, ai_confirmed: false }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur')
      onUpdated({
        priority:          dbFromPriority(newPriority),
        computed_priority: newPriority,
        priority_approved: true,
        priority_approved_at: new Date().toISOString(),
      })
      setShowOverride(false)
    } catch (e: any) {
      console.error('[AIPriorityPanel] override error:', e)
    } finally {
      setOverriding(false)
    }
  }

  const scoreVoteBonus    = Math.min(data.votes_count || 0, 5)
  const scoreAI           = data.ai_priority_score || 0
  const scoreLocation     = data.is_sensitive
    ? (data.sensitive_type === 'hospital' ? 4 : data.sensitive_type === 'school' ? 3 : 2)
    : 0
  const totalScore        = data.priority_score || (scoreAI + scoreVoteBonus + scoreLocation)

  return (
    <div className="bg-white dark:bg-slate-900/40 rounded-[1.75rem] border border-slate-100 dark:border-slate-800/60 shadow-sm overflow-hidden">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">IA + Votes + Localisation</p>
            <h3 className="text-sm font-black text-[#0A1628] dark:text-white">Priorité automatique</h3>
          </div>
        </div>
        {data.priority_approved && (
          <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3 h-3" /> Approuvée
          </span>
        )}
      </div>

      <div className="p-5 space-y-5">

        {/* ── Computed priority badge ── */}
        <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 ring-4 ${cfg.ring}`}
          style={{ borderColor: cfg.border, background: cfg.bg }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: '#fff' }}>
            <Icon className="w-6 h-6" style={{ color: cfg.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: cfg.color }}>
              Priorité calculée
            </p>
            <p className="text-2xl font-black" style={{ color: cfg.color }}>{cfg.label}</p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: cfg.color, opacity: 0.7 }}>
              Score global: {totalScore}/20
            </p>
          </div>
          <div className="flex-shrink-0">
            <ScoreBar score={totalScore} color={cfg.color} />
          </div>
        </div>

        {/* ── Score breakdown ── */}
        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">Détail du calcul</p>

          {/* AI Vision */}
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${data.used_ai_vision ? 'bg-violet-50 dark:bg-violet-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <Brain className={`w-3.5 h-3.5 ${data.used_ai_vision ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Analyse IA</p>
                <span className={`text-[10px] font-black ${data.used_ai_vision ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}`}>
                  {data.used_ai_vision ? `+${scoreAI}` : 'Non utilisée'}
                </span>
              </div>
              {data.used_ai_vision && (
                <ScoreBar score={scoreAI} max={10} color="#7C3AED" />
              )}
              {data.ai_severity_label && (
                <p className="text-[9px] text-violet-500 dark:text-violet-400 font-bold mt-0.5">{data.ai_severity_label}</p>
              )}
            </div>
          </div>

          {/* Votes */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <ThumbsUp className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Votes citoyens</p>
                <span className="text-[10px] font-black text-blue-500">+{scoreVoteBonus} ({data.votes_count} votes)</span>
              </div>
              <ScoreBar score={scoreVoteBonus} max={5} color="#3B82F6" />
            </div>
          </div>

          {/* Sensitive location */}
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${data.is_sensitive ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
              {data.sensitive_type === 'hospital'
                ? <Building2 className={`w-3.5 h-3.5 ${data.is_sensitive ? 'text-red-500' : 'text-slate-400'}`} />
                : data.sensitive_type === 'school'
                  ? <School className={`w-3.5 h-3.5 ${data.is_sensitive ? 'text-orange-500' : 'text-slate-400'}`} />
                  : <MapPin className={`w-3.5 h-3.5 ${data.is_sensitive ? 'text-red-500' : 'text-slate-400'}`} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {data.is_sensitive ? sensitiveLabel : 'Zone standard'}
                </p>
                <span className={`text-[10px] font-black ${data.is_sensitive ? 'text-red-500' : 'text-slate-400'}`}>
                  {data.is_sensitive ? `+${scoreLocation}` : '+0'}
                </span>
              </div>
              {data.is_sensitive && <ScoreBar score={scoreLocation} max={4} color="#EF4444" />}
            </div>
          </div>
        </div>

        {/* ── AI reasoning ── */}
        {data.ai_reasoning && (
          <div className="bg-violet-50/60 dark:bg-violet-900/15 rounded-2xl p-4 border border-violet-100 dark:border-violet-800/30">
            <p className="text-[9px] font-black uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-2">Raisonnement IA</p>
            <p className="text-xs text-violet-800 dark:text-violet-300 font-medium leading-relaxed">{data.ai_reasoning}</p>
            {data.ai_visible_issues && data.ai_visible_issues.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.ai_visible_issues.map((issue, i) => (
                  <span key={i} className="text-[9px] font-bold px-2 py-0.5 bg-violet-100 dark:bg-violet-800/30 text-violet-700 dark:text-violet-300 rounded-full">{issue}</span>
                ))}
              </div>
            )}
            {data.ai_confidence !== undefined && (
              <div className="flex items-center gap-1.5 mt-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < Math.round((data.ai_confidence! / 100) * 5) ? 'fill-violet-400 text-violet-400' : 'text-slate-200 dark:text-slate-700'}`} />
                ))}
                <span className="text-[9px] font-black text-violet-500 dark:text-violet-400">{data.ai_confidence}% confiance</span>
              </div>
            )}
          </div>
        )}

        {/* ── Analyze button (if no AI result yet) ── */}
        {showAnalyzeButton && !data.used_ai_vision && (
          <button onClick={handleAnalyze} disabled={analyzing}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-black shadow-lg shadow-violet-100 transition-all disabled:opacity-50">
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {analyzing ? 'Analyse en cours…' : 'Analyser avec l\'IA'}
          </button>
        )}

        {/* ── President actions ── */}
        {!readOnly && (
          <div className="pt-1 space-y-2.5 border-t border-slate-100 dark:border-slate-800/60">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500 pt-1">Action présidentielle</p>

          {!data.priority_approved ? (
            <>
              <button onClick={handleApprove} disabled={approving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black shadow-lg shadow-emerald-100 transition-all disabled:opacity-50">
                {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Approuver — Priorité {cfg.label}
              </button>

              <button onClick={() => setShowOverride(!showOverride)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                Modifier la priorité <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showOverride ? 'rotate-180' : ''}`} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">Priorité approuvée</p>
                {data.priority_approved_at && (
                  <p className="text-[9px] text-emerald-500 dark:text-emerald-400">
                    {new Date(data.priority_approved_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </p>
                )}
              </div>
              <button onClick={() => setShowOverride(!showOverride)}
                className="ml-auto text-[9px] font-black text-emerald-600 dark:text-emerald-400 hover:underline">
                Modifier
              </button>
            </div>
          )}

          {/* Override selector */}
          {showOverride && (
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800" style={{ animation: 'fadeIn .15s ease' }}>
              <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Choisir la priorité</p>
              {(Object.entries(PRIORITY_CFG) as [keyof typeof PRIORITY_CFG, typeof PRIORITY_CFG['urgent']][]).map(([key, c]) => {
                const Ic = c.icon
                const isCurrent = key === computedKey
                return (
                  <button key={key} onClick={() => handleOverride(key)} disabled={overriding}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all disabled:opacity-50 ${isCurrent ? 'border-current' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                    style={isCurrent ? { borderColor: c.border, background: c.bg } : {}}>
                    <Ic className="w-4 h-4 flex-shrink-0" style={{ color: c.color }} />
                    <span className="text-sm font-black flex-1" style={{ color: c.color }}>{c.label}</span>
                    {isCurrent && <span className="text-[9px] font-black" style={{ color: c.color }}>Actuel</span>}
                    {overriding && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}

export default AIPriorityPanel
