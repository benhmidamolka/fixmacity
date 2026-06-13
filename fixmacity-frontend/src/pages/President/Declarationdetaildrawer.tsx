// src/pages/President/Declarationdetaildrawer.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, MapPin, Calendar, User, Tag, ChevronRight,
  CheckCircle2, Clock, ImageIcon, Send, Loader2,
  Building2, FileText, AlertTriangle, ThumbsUp,
  MessageSquare, Camera, Hash, RefreshCw, Shield,
  UserCheck, History, ArrowLeft, Star, Brain,
  Sparkles, Hospital, School, Flame, TrendingUp,
  Vote, Zap, CheckCheck, RotateCcw, ChevronDown,
  Info, BarChart3, Navigation
} from 'lucide-react'
import AIPriorityPanel from './AIPriorityPanel';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''
const hdr = () => ({ Authorization: `Bearer ${tok()}` })

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : '—'
const fmtShort = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ─── Types ────────────────────────────────────────────────────────────────────
interface DeclDetail {
  id: string; ref_citoyen: string; ref_service: string | null
  title: string; description: string; category: string
  status: string; priority: string; created_at: string
  resolved_at?: string; assigned_at?: string
  address?: string; latitude?: number; longitude?: number
  votes_count: number; priority_score: number
  image_url?: string; photo_avant?: string; photo_avant_url?: string
  photo_url?: string; photo_apres?: string; photo_apres_url?: string
  citizen_id?: string
  is_sensitive?: boolean; sensitive_type?: string | null
  sensitive_distance_m?: number | null;
  ai_priority?: string; ai_priority_score?: number; ai_confidence?: number;
  ai_reasoning?: string | null; ai_visible_issues?: string[] | null;
  computed_priority?: string; computed_score?: number; final_priority?: string;
  president_override?: string | null; president_override_note?: string | null;
  priority_approved?: boolean; priority_approved_at?: string | null;
  ai_priority_confirmed?: boolean
  citizen?: { id: string; first_name: string; last_name: string; email: string; phone?: string }
  department?: { id: string; name: string; name_fr: string; code: string }
  agent?: { id: string; first_name: string; last_name: string } | null
  chef?: { id: string; first_name: string; last_name: string; email: string } | null
  delegations?: { name: string; code: string }
  rating?: { score: number; comment?: string }
}
interface Photo { id: string; url: string; uploaded_by: string; created_at: string; photo_type?: string }
interface HistEntry {
  id: string; old_status: string; new_status: string
  raison?: string; created_at: string
  user?: { first_name: string; last_name: string; role: string }
}
interface Comment {
  id: string; content: string; channel: string; created_at: string
  user_id?: string; user?: { first_name: string; last_name: string; role: string }
}
interface AIResult {
  ai_priority: 'urgent' | 'normal' | 'faible'
  confidence: number; severity_label: string
  reasoning: string; visible_issues: string[]
}

export interface Props {
  declarationId: string | null
  onClose: () => void
  onAssigned?: () => void
  departments: { id: string; name: string }[]
  currentUserId?: string
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  soumise: { label: 'Soumise', color: '#D97706', bg: '#FEF3C7', dot: '#F59E0B' },
  assignee_chef: { label: 'Assignée — Chef', color: '#7C3AED', bg: '#EDE9FE', dot: '#8B5CF6' },
  assignee_agent: { label: 'Assignée — Agent', color: '#1D4ED8', bg: '#DBEAFE', dot: '#3B82F6' },
  en_cours: { label: 'En cours', color: '#C2410C', bg: '#FFEDD5', dot: '#F97316' },
  resolue: { label: 'Résolue', color: '#15803D', bg: '#DCFCE7', dot: '#22C55E' },
  cloturee: { label: 'Clôturée', color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
  refusee_chef: { label: 'Refusée — Chef', color: '#DC2626', bg: '#FEE2E2', dot: '#EF4444' },
  refusee_agent: { label: 'Refusée — Agent', color: '#B91C1C', bg: '#FEE2E2', dot: '#EF4444' },
}

const PRIORITY_DB: Record<string, { label: string; color: string; bg: string }> = {
  haute: { label: 'Haute', color: '#DC2626', bg: '#FEE2E2' },
  high: { label: 'Haute', color: '#DC2626', bg: '#FEE2E2' },
  moyenne: { label: 'Normale', color: '#D97706', bg: '#FEF3C7' },
  medium: { label: 'Normale', color: '#D97706', bg: '#FEF3C7' },
  basse: { label: 'Faible', color: '#16A34A', bg: '#DCFCE7' },
  low: { label: 'Faible', color: '#16A34A', bg: '#DCFCE7' },
}

const AI_LEVELS: Record<string, any> = {
  urgent: { label: 'URGENTE', color: '#EF4444', bg: '#FEF2F2', border: '#FEE2E2', icon: '🚨' },
  normal: { label: 'NORMALE', color: '#F59E0B', bg: '#FFFBEB', border: '#FEF3C7', icon: '⚡' },
  faible: { label: 'FAIBLE', color: '#3B82F6', bg: '#EFF6FF', border: '#DBEAFE', icon: 'ℹ️' },
}

const ROLE_COLORS: Record<string, string> = {
  president: '#7C3AED', chef: '#1D4ED8', agent: '#15803D', citizen: '#0369A1',
}

const WORKFLOW_STEPS = [
  { key: 'soumise', label: 'Soumis', Icon: FileText },
  { key: 'assignee_chef', label: 'Chef', Icon: Shield },
  { key: 'assignee_agent', label: 'Agent', Icon: UserCheck },
  { key: 'en_cours', label: 'En cours', Icon: Clock },
  { key: 'resolue', label: 'Résolu', Icon: CheckCircle2 },
  { key: 'cloturee', label: 'Clôturé', Icon: CheckCircle2 },
]

// ─── Tiny atoms ───────────────────────────────────────────────────────────────
const Skel = ({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) => (
  <div className={`${w} ${h} rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse`} />
)

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS[status] ?? STATUS.soumise
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
      style={{ color: s.color, background: s.bg }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

const Avatar = ({ name, role }: { name: string; role?: string }) => {
  const ini = name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
  const bg = role ? (ROLE_COLORS[role] ?? '#64748B') : '#64748B'
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
      style={{ background: bg }}>{ini}
    </div>
  )
}

const Stars = ({ score }: { score: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={13} className={i <= score ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'} />
    ))}
  </div>
)

// ─── Priority Score Widget ────────────────────────────────────────────────────
// Shows breakdown: AI photo analysis + Location sensitivity + Community votes
// President final decision controls the actual priority
const PriorityScoreCard: React.FC<{
  decl: DeclDetail
  aiResult: AIResult | null
  aiLoading: boolean
  aiError: string | null
  onAnalyze: () => void
  onOverride: (level: 'urgent' | 'normal' | 'faible') => void
  overriding: boolean
  finalPriority: 'urgent' | 'normal' | 'faible' | null
}> = ({ decl, aiResult, aiLoading, aiError, onAnalyze, onOverride, overriding, finalPriority }) => {

  const hasImage = !!(decl.image_url || decl.photo_avant || decl.photo_url)
  const hasSensitive = !!(decl.is_sensitive && decl.sensitive_type && decl.sensitive_type !== 'none')
  const votes = decl.votes_count ?? 0

  // Score components (each 0–100, weighted)
  const aiScore = aiResult ? AI_LEVELS[aiResult.ai_priority]?.score ?? 50 : null
  const locScore = hasSensitive ? 90 : 10
  const voteScore = Math.min(votes * 15, 100)

  const weights = { ai: 0.50, location: 0.30, votes: 0.20 }
  const totalScore = aiScore !== null
    ? Math.round(aiScore * weights.ai + locScore * weights.location + voteScore * weights.votes)
    : null

  const scoreColor = totalScore === null ? '#94A3B8'
    : totalScore >= 70 ? '#DC2626'
      : totalScore >= 40 ? '#D97706'
        : '#16A34A'

  const scoreLabel = totalScore === null ? '—'
    : totalScore >= 70 ? 'CRITIQUE'
      : totalScore >= 40 ? 'MODÉRÉE'
        : 'FAIBLE'

  const confirmedLevel = finalPriority ?? (decl.ai_priority_confirmed && aiResult ? aiResult.ai_priority : null)

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <BarChart3 size={14} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Score de priorité</p>
            <p className="text-[9px] text-indigo-500/70 dark:text-indigo-400/60">IA + Localisation + Votes</p>
          </div>
        </div>
        {/* Composite score circle */}
        {totalScore !== null && (
          <div className="flex flex-col items-center">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#F1F5F9" strokeWidth="5" />
                <circle cx="28" cy="28" r="22" fill="none" stroke={scoreColor} strokeWidth="5"
                  strokeDasharray={`${(totalScore / 100) * 138.2} 138.2`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-black" style={{ color: scoreColor }}>{totalScore}</span>
                <span className="text-[7px] font-black text-slate-400">/100</span>
              </div>
            </div>
            <span className="text-[8px] font-black mt-0.5 uppercase tracking-widest" style={{ color: scoreColor }}>
              {scoreLabel}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4 bg-white dark:bg-slate-900/50">

        {/* ── Factor 1: AI Photo Analysis ─────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <Brain size={12} className="text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Analyse IA photo
              </span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400">50%</span>
            </div>

            {hasImage ? (
              <button onClick={onAnalyze} disabled={aiLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border ${aiResult
                  ? 'bg-violet-600 text-white border-violet-700 hover:bg-violet-700'
                  : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'} disabled:opacity-50`}>
                {aiLoading ? <Loader2 size={11} className="animate-spin" /> :
                  aiResult ? <><RefreshCw size={11} /> Réanalyser</> :
                    <><Sparkles size={11} /> Analyser</>}
              </button>
            ) : (
              <span className="text-[9px] text-slate-400 dark:text-slate-500 italic">Aucune photo</span>
            )}
          </div>

          {/* AI result */}
          {aiError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30">
              <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />
              <p className="text-[10px] text-red-600 dark:text-red-400 font-bold">{aiError}</p>
            </div>
          )}

          {aiLoading && (
            <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-950/20 rounded-xl">
              <Loader2 size={12} className="text-violet-500 animate-spin flex-shrink-0" />
              <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">Analyse de la photo en cours…</p>
            </div>
          )}

          {aiResult && (() => {
            const lv = AI_LEVELS[aiResult.ai_priority]
            return (
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: lv.border }}>
                {/* Verdict bar */}
                <div className="flex items-center gap-3 px-3 py-2.5" style={{ background: `${lv.bg}` }}>
                  <span className="text-xl flex-shrink-0">{lv.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black" style={{ color: lv.color }}>
                        {lv.label} — {aiResult.severity_label}
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-lg" style={{ color: lv.color, background: `${lv.color}20` }}>
                        {aiResult.confidence}% confiance
                      </span>
                    </div>
                    <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                      <div className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${aiResult.confidence}%`, background: lv.color }} />
                    </div>
                  </div>
                </div>
                {/* Reasoning */}
                <div className="px-3 py-2.5 bg-white dark:bg-slate-900/60">
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">{aiResult.reasoning}</p>
                  {aiResult.visible_issues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {aiResult.visible_issues.map((iss, i) => (
                        <span key={i} className="text-[9px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {iss}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {!hasImage && !aiResult && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <Camera size={12} className="text-slate-400 flex-shrink-0" />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Aucune photo fournie — facteur IA non calculable</p>
            </div>
          )}
        </div>

        {/* ── Factor 2: Location Sensitivity ──────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${hasSensitive ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <Navigation size={12} className={hasSensitive ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'} />
              </div>
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Zone sensible
              </span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400">30%</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black ${hasSensitive ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20' : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
              {hasSensitive ? (
                <>
                  {decl.sensitive_type === 'hospital' ? <Hospital size={10} /> : <School size={10} />}
                  {decl.sensitive_type === 'hospital' ? 'Hôpital à proximité' : 'École à proximité'}
                </>
              ) : (
                <>Zone standard</>
              )}
            </div>
          </div>
          {/* Location bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${locScore}%`, background: hasSensitive ? '#F97316' : '#94A3B8' }} />
            </div>
            <span className="text-[10px] font-black w-10 text-right" style={{ color: hasSensitive ? '#F97316' : '#94A3B8' }}>
              {locScore}/100
            </span>
          </div>
        </div>

        {/* ── Factor 3: Community Votes ────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${votes > 0 ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <ThumbsUp size={12} className={votes > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
              </div>
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Votes citoyens
              </span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400">20%</span>
            </div>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl ${votes > 0 ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
              {votes} vote{votes !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(voteScore, 100)}%`, background: '#3B82F6' }} />
            </div>
            <span className="text-[10px] font-black text-blue-500 w-10 text-right">
              {Math.min(voteScore, 100)}/100
            </span>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          {/* President's final decision */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <Shield size={12} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                Décision finale — Président
              </span>
            </div>

            {confirmedLevel ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border-2"
                style={{ borderColor: AI_LEVELS[confirmedLevel].border, background: `${AI_LEVELS[confirmedLevel].bg}` }}>
                <span className="text-2xl">{AI_LEVELS[confirmedLevel].emoji}</span>
                <div className="flex-1">
                  <p className="text-xs font-black" style={{ color: AI_LEVELS[confirmedLevel].color }}>
                    Priorité {AI_LEVELS[confirmedLevel].label}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Confirmée par le président</p>
                </div>
                <button onClick={() => onOverride(confirmedLevel === 'urgent' ? 'normal' : 'urgent')}
                  className="text-[9px] font-bold text-slate-400 hover:text-slate-600 underline transition-colors">
                  Modifier
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 italic">
                  {aiResult ? 'L\'IA a suggéré une priorité. Confirmez ou modifiez.' : 'Définissez manuellement la priorité de cette déclaration.'}
                </p>
                <div className="flex gap-2">
                  {(['urgent', 'normal', 'faible'] as const).map(level => {
                    const lv = AI_LEVELS[level]
                    const isAI = aiResult?.ai_priority === level
                    return (
                      <button key={level} onClick={() => onOverride(level)} disabled={overriding}
                        className="flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-[10px] font-black border-2 transition-all hover:scale-105 disabled:opacity-50"
                        style={{ color: lv.color, background: lv.bg, borderColor: lv.border }}>
                        {overriding ? <Loader2 size={13} className="animate-spin" /> : <span className="text-lg leading-none">{lv.emoji}</span>}
                        <span>{lv.label}</span>
                        {isAI && <span className="text-[7px] opacity-60 font-bold">IA</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Timeline (Compact Ribbon) ────────────────────────────────────────────────
const Timeline: React.FC<{ status: string; history: HistEntry[] }> = ({ status, history }) => {
  const active = Math.max(0, WORKFLOW_STEPS.findIndex(s => s.key === status))

  return (
    <div className="space-y-4">

      {/* ── Horizontal progress ribbon ── */}
      <div className="relative flex items-center">
        {/* connecting line behind pills */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 dark:bg-slate-800 z-0" />

        {WORKFLOW_STEPS.map(({ key, label, Icon }, idx) => {
          const done = idx < active
          const current = idx === active
          return (
            <div key={key} className="flex-1 flex flex-col items-center gap-1.5 relative z-10">
              {/* Dot */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all
                ${done ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/40'
                  : current ? 'bg-white dark:bg-slate-900 border-blue-500 ring-3 ring-blue-50 dark:ring-blue-950/40'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                {done && <CheckCircle2 size={12} className="text-white" />}
                {current && <Icon size={12} className="text-blue-500 dark:text-blue-400" />}
                {!done && !current && <Icon size={12} className="text-slate-300 dark:text-slate-600" />}
              </div>
              {/* Label */}
              <span className={`text-[8px] font-black uppercase tracking-wide text-center leading-tight px-0.5
                ${done ? 'text-emerald-600 dark:text-emerald-400'
                  : current ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-300 dark:text-slate-600'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Condensed history log ── */}
      {history.length > 0 && (
        <div className="space-y-1.5">
          {[...history]
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map(h => {
              const isRefusal = h.new_status?.startsWith('refusee')
              return (
                <div key={h.id} className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border transition-colors
                  ${isRefusal
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30'
                    : 'bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'}`}>
                  {/* dot */}
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0
                    ${isRefusal ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black ${isRefusal ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {STATUS[h.new_status]?.label ?? h.new_status}
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500">{fmtShort(h.created_at)}</span>
                      {h.user && (
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">
                          · {h.user.first_name} {h.user.last_name}
                        </span>
                      )}
                    </div>
                    {h.raison && (
                      <p className="text-[10px] text-red-600 dark:text-red-400 italic mt-0.5 leading-snug">
                        «{h.raison}»
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

// ─── Comments Tab ─────────────────────────────────────────────────────────────
const CommentsTab: React.FC<{
  comments: Comment[]; loading: boolean; sending: boolean
  text: string; setText: (v: string) => void
  onSend: () => void; currentUserId?: string
}> = ({ comments, loading, sending, text, setText, onSend, currentUserId }) => {
  const endRef = useRef<HTMLDivElement>(null)
  const sorted = [...comments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [sorted.length])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
        {loading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <Skel key={i} h="h-12" />)}</div>
          : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <MessageSquare size={18} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Aucun commentaire interne</p>
            </div>
          ) : sorted.map(c => {
            const isMe = c.user_id === currentUserId || c.user?.role === 'president'
            const name = c.user ? `${c.user.first_name} ${c.user.last_name}` : 'Inconnu'
            const roleColor = c.user?.role ? (ROLE_COLORS[c.user.role] ?? '#94A3B8') : '#94A3B8'
            const ROLE_LABELS: Record<string, string> = { president: 'Président', chef: 'Chef', agent: 'Agent', citizen: 'Citoyen' }
            return (
              <div key={c.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-sm"
                  style={{ background: roleColor }}>
                  {name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()}
                </div>
                <div className={`flex flex-col max-w-[75%] gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{isMe ? 'Vous' : name}</span>
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: roleColor }}>
                      {ROLE_LABELS[c.user?.role ?? ''] ?? c.user?.role ?? ''}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(c.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed font-medium shadow-sm ${isMe ? 'text-white rounded-tr-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'}`}
                    style={isMe ? { background: roleColor } : {}}>
                    {c.content}
                  </div>
                </div>
              </div>
            )
          })}
        <div ref={endRef} />
      </div>
      <div className="flex-shrink-0 px-5 py-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            placeholder="Commentaire interne (chef de service / agents)…"
            className="flex-1 text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800 font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 transition-all" />
          <button onClick={onSend} disabled={sending || !text.trim()}
            className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white flex items-center justify-center flex-shrink-0 transition-all">
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────
const DeclarationDetailDrawer: React.FC<Props> = ({
  declarationId, onClose, onAssigned, departments, currentUserId
}) => {
  const [detail, setDetail] = useState<DeclDetail | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [history, setHistory] = useState<HistEntry[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'info' | 'priority' | 'history' | 'comments'>('info')
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignments, setAssignments] = useState<{ department_id: string, chef_id: string }[]>([{ department_id: '', chef_id: '' }])
  const [chefs, setChefs] = useState<any[]>([])
  const [replacementWarning, setReplacementWarning] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [imgExpanded, setImgExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/president/users?role=chef&limit=500`, { headers: hdr() })
      .then(r => r.json())
      .then(d => { if (d.users) setChefs(d.users) })
      .catch(() => { })
  }, [])

  // AI state
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [overriding, setOverriding] = useState(false)
  const [finalPriority, setFinalPriority] = useState<'urgent' | 'normal' | 'faible' | null>(null)

  const flash = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3200) }

  const load = useCallback(async () => {
    if (!declarationId) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/president/declarations/${declarationId}`, { headers: hdr() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const decl = data.declaration ?? null
      setDetail(decl)
      setPhotos(data.photos ?? [])
      setHistory(data.history ?? [])
      setComments(data.comments ?? [])
      // ── Priority resolution (same hierarchy as the dashboard) ──────────────
      // 1. president_override  → manual decision, always wins
      // 2. priority_label      → computed by backend (AI or heuristic)
      // 3. priority (DB enum)  → legacy column fallback
      // 4. default: 'normal'
      const dbToLevel: Record<string, 'urgent' | 'normal' | 'faible'> = {
        haute: 'urgent', high: 'urgent', urgent: 'urgent', critique: 'urgent', critical: 'urgent',
        moyenne: 'normal', medium: 'normal', normal: 'normal',
        basse: 'faible', low: 'faible', faible: 'faible',
      }
      const rawPriority =
        decl?.president_override ||
        decl?.priority_label ||
        decl?.priority ||
        'normal'
      const resolved = dbToLevel[rawPriority.toLowerCase()] ?? 'normal'
      setFinalPriority(resolved)
    } catch { flash('Erreur de chargement.', false) }
    finally { setLoading(false) }
  }, [declarationId])

  useEffect(() => {
    if (declarationId) {
      setDetail(null); setPhotos([]); setHistory([]); setComments([])
      setTab('info'); setCommentText(''); setAssignments([{ department_id: '', chef_id: '' }]); setReplacementWarning(null);
      setAiResult(null); setAiError(null); setFinalPriority(null)
      load()
    }
  }, [declarationId, load])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleAnalyze = async () => {
    if (!detail) return
    setAiLoading(true); setAiError(null); setAiResult(null)
    try {
      const res = await fetch(`${API}/president/declarations/${detail.id}/analyze-image`, {
        method: 'POST', headers: hdr()
      })
      const data = await res.json()
      if (!res.ok) { setAiError(data.error ?? 'Erreur IA.'); return }
      setAiResult(data)
      // Auto-switch to priority tab to show results
      setTab('priority')
    } catch { setAiError('Erreur réseau lors de l\'analyse.') }
    finally { setAiLoading(false) }
  }

  const handleOverride = async (level: 'urgent' | 'normal' | 'faible') => {
    if (!detail) return
    setOverriding(true)
    try {
      const res = await fetch(`${API}/president/declarations/${detail.id}/priority`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({ priority: level, ai_confirmed: level === aiResult?.ai_priority }),
      })
      if (res.ok) {
        setFinalPriority(level)
        flash(`Priorité ${AI_LEVELS[level].label} confirmée ✓`)
        load() // Refresh detail state to reflect new president_override
        onAssigned?.()
      } else flash('Erreur lors de la mise à jour.', false)
    } catch { flash('Erreur serveur.', false) }
    finally { setOverriding(false) }
  }

  const handleAssign = async (forceConfirm = false) => {
    if (!detail) return
    const validAssignments = assignments.filter(a => a.department_id);
    if (validAssignments.length === 0) {
      flash('Veuillez choisir au moins un département.', false);
      return;
    }

    setAssigning(true)
    try {
      const ep = detail.status === 'soumise' ? 'assign' : 'reassign'
      const res = await fetch(`${API}/president/declarations/${detail.id}/${ep}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({ assignments: validAssignments.map(a => ({ department_id: a.department_id, chef_id: a.chef_id || null })), confirm_replacement: forceConfirm }),
      })
      const data = await res.json()

      if (res.status === 409 && data.state === 'exception') {
        setReplacementWarning(data.message_fr || 'Un conflit a été détecté.');
        return;
      }

      if (res.ok) {
        flash('Déclaration assignée ✓');
        setReplacementWarning(null);
        onAssigned?.();
        setTimeout(onClose, 1200);
      }
      else flash(data.error || 'Erreur lors de l\'assignation.', false)
    } catch {
      flash('Erreur serveur.', false)
    } finally { setAssigning(false) }
  }

  const handleComment = async () => {
    if (!detail || !commentText.trim()) return
    setSending(true)
    try {
      const res = await fetch(`${API}/president/declarations/${detail.id}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({ content: commentText.trim(), channel: 'president_chef' }),
      })
      if (res.ok) { const d = await res.json(); setComments(prev => [...prev, d.comment]); setCommentText('') }
    } finally { setSending(false) }
  }

  // Derived
  const s = detail ? (STATUS[detail.status] ?? STATUS.soumise) : STATUS.soumise
  const p = finalPriority ? AI_LEVELS[finalPriority] : AI_LEVELS.normal
  const isRes = detail && ['resolue', 'cloturee'].includes(detail.status)
  const canAss = detail && ['soumise'].includes(detail.status)
  const canReas = detail && ['refusee_chef'].includes(detail.status)
  const showCom = detail && !['soumise'].includes(detail.status)

  // Photo list
  const photosList = [...photos]
  const defaultBefore = detail?.photo_avant || detail?.photo_avant_url || detail?.photo_url || detail?.image_url
  const defaultAfter = detail?.photo_apres || detail?.photo_apres_url
  if (defaultBefore && !photosList.some(ph => ph.url === defaultBefore))
    photosList.unshift({ id: 'default_before', url: defaultBefore, photo_type: 'photo_avant', uploaded_by: detail?.citizen_id || '', created_at: detail?.created_at || '' })
  if (defaultAfter && !photosList.some(ph => ph.url === defaultAfter))
    photosList.push({ id: 'default_after', url: defaultAfter, photo_type: 'photo_apres', uploaded_by: '', created_at: detail?.resolved_at || '' })
  const beforePh = photosList.find(ph => !ph.photo_type || ph.photo_type === 'photo_avant') ?? photosList[0]
  const afterPh = photosList.find(ph => ph.photo_type === 'photo_apres') ?? (isRes && photosList.length > 1 ? photosList[photosList.length - 1] : undefined)

  const TABS = [
    { key: 'info', label: 'Infos', Icon: FileText, count: 0 },
    { key: 'priority', label: 'Priorité IA', Icon: Brain, count: 0 },
    { key: 'history', label: 'Progression', Icon: History, count: history.length },
    ...(showCom ? [{ key: 'comments', label: 'Commentaires', Icon: MessageSquare, count: comments.length }] : []),
  ] as const

  if (!declarationId) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" style={{ animation: 'fadeIn .2s ease' }} onClick={onClose} />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-bold ${toast.ok ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={{ animation: 'fadeInDown .2s ease' }}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Lightbox */}
      {imgExpanded && (
        <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur flex items-center justify-center" onClick={() => setImgExpanded(null)}>
          <img src={imgExpanded} alt="Photo" className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain shadow-2xl" />
          <button className="absolute top-5 right-5 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"><X size={18} /></button>
        </div>
      )}

      {/* Drawer */}
      <div className="pres-drawer fixed right-0 top-0 bottom-0 z-[101] w-full max-w-[580px] bg-white/98 dark:bg-slate-950/98 backdrop-blur-md shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800 overflow-hidden"
        style={{ animation: 'slideInRight .25s cubic-bezier(.22,1,.36,1)' }}>

        <style>{`
          @keyframes fadeIn       {from{opacity:0}                              to{opacity:1}}
          @keyframes fadeInDown   {from{opacity:0;transform:translate(-50%,-10px)} to{opacity:1;transform:translate(-50%,0)}}
          @keyframes slideInRight {from{transform:translateX(100%)}             to{transform:translateX(0)}}

          /* ── Minimalist dark scrollbar ─────────────────────────────── */
          .pres-drawer ::-webkit-scrollbar        { width: 4px; height: 4px; }
          .pres-drawer ::-webkit-scrollbar-track  { background: transparent; }
          .pres-drawer ::-webkit-scrollbar-thumb  {
            background: rgba(148,163,184,0.25);
            border-radius: 99px;
            transition: background .2s;
          }
          .pres-drawer ::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.55); }
          /* Firefox */
          .pres-drawer * { scrollbar-width: thin; scrollbar-color: rgba(148,163,184,0.25) transparent; }
        `}</style>

        {/* ── TOP BAR ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-150/10 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md">
          <button onClick={onClose} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <ArrowLeft size={13} /> Retour
          </button>
          <div className="flex items-center gap-2">
            {detail && !loading && (
              <>
                <span className="font-mono text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">{detail.ref_citoyen}</span>
                <StatusBadge status={detail.status} />
              </>
            )}
            {loading && <Skel w="w-32" h="h-5" />}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={load} className="w-8 h-8 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 flex items-center justify-center text-slate-400 hover:text-slate-650 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all border border-slate-200/20 dark:border-slate-700/30">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all border border-slate-200/20 dark:border-slate-700/30">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* ── PHOTO STRIP ── */}
        <div className="flex-shrink-0 px-5 pt-3 pb-1">
          <div className="h-28 bg-slate-50 dark:bg-slate-900/30 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800/80 relative shadow-sm">
            {loading ? (
              <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ) : photosList.length > 0 ? (
              <div className="flex h-full gap-[2px]">
                <div className="flex-1 relative overflow-hidden group cursor-pointer" onClick={() => beforePh && setImgExpanded(beforePh.url)}>
                  <img src={beforePh?.url} alt="Avant" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl bg-red-650/95 text-white text-[8px] font-black uppercase tracking-widest shadow-md">AVANT</span>
                </div>
                <div className={`flex-1 relative overflow-hidden group ${afterPh ? 'cursor-pointer' : ''}`} onClick={() => afterPh && setImgExpanded(afterPh.url)}>
                  {afterPh ? (
                    <>
                      <img src={afterPh.url} alt="Après" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                      <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl bg-emerald-650/95 text-white text-[8px] font-black uppercase tracking-widest shadow-md">APRÈS</span>
                    </>
                  ) : (
                    <div className="w-full h-full bg-slate-100/60 dark:bg-slate-900/20 flex flex-col items-center justify-center gap-1.5 border-l border-slate-100/80 dark:border-slate-800/80">
                      <div className="w-8 h-8 rounded-xl bg-slate-200/50 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500">
                        <Camera size={14} />
                      </div>
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center px-4 leading-tight">En cours de traitement</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 dark:text-slate-500">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200/30 dark:border-slate-850">
                  <ImageIcon size={16} />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest">Aucun visuel disponible</p>
              </div>
            )}
          </div>
        </div>

        {/* ── TITLE BLOCK ── */}
        <div className="flex-shrink-0 px-5 pt-1 pb-2">
          {loading ? (
            <div className="space-y-2"><Skel h="h-5" w="w-3/4" /><Skel h="h-3" w="w-1/2" /></div>
          ) : detail && (
            <div className="space-y-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white leading-tight tracking-tight line-clamp-2">{detail.title}</h2>
              <div className="flex flex-wrap items-center gap-1.5">
                {detail.category && (
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                    <Tag size={9} /> {detail.category}
                  </span>
                )}
                {detail.delegations?.name && (
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 px-2.5 py-1 rounded-xl">
                    <MapPin size={9} /> {detail.delegations.name}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-455 bg-slate-50 dark:bg-slate-900/50 border border-slate-100/60 dark:border-slate-800/40 px-2.5 py-1 rounded-xl">
                  <Calendar size={9} /> {fmtShort(detail.created_at)}
                </span>
                {(detail.votes_count ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 px-2.5 py-1 rounded-xl">
                    <ThumbsUp size={9} /> {detail.votes_count} vote{detail.votes_count > 1 ? 's' : ''}
                  </span>
                )}
                {detail.is_sensitive && detail.sensitive_type && detail.sensitive_type !== 'none' && (
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border border-orange-100/50 dark:border-orange-900/30 px-2.5 py-1 rounded-xl">
                    {detail.sensitive_type === 'hospital' ? <Hospital size={9} /> : <School size={9} />}
                    {detail.sensitive_type === 'hospital' ? 'Hôpital' : 'École'}
                  </span>
                )}
                {finalPriority && (() => {
                  const cp = AI_LEVELS[finalPriority] || AI_LEVELS.normal;
                  return (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ml-auto"
                      style={{ color: cp.color, background: cp.bg, borderColor: cp.border }}
                    >
                      <span className="text-[8px]">{cp.icon}</span>
                      {cp.label}
                      {detail.ai_priority_confirmed && (
                        <span title="Confirmé par le Président">
                          <Shield className="w-2.5 h-2.5 ml-0.5" />
                        </span>
                      )}
                    </span>
                  )
                })()}
              </div>
            </div>
          )}
        </div>

        {/* ── TABS ── */}
        <div className="flex-shrink-0 px-5 py-2">
          <div className="bg-slate-100/70 dark:bg-slate-900/60 p-1 rounded-xl flex gap-1 border border-slate-200/20 dark:border-slate-800/40">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${tab === t.key
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/10 dark:border-slate-700/30'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350'
                  }`}
              >
                <t.Icon size={12} />
                <span>{t.label}</span>
                {t.count > 0 && (
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg ${tab === t.key ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="flex-1 overflow-hidden relative min-h-0">

          {/* INFO */}
          {tab === 'info' && (
            <div className="absolute inset-0 overflow-y-auto px-5 py-3 space-y-3">
              {loading ? (
                <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="flex gap-3"><Skel w="w-8" h="h-8" /><div className="flex-1 space-y-1"><Skel h="h-2" w="w-16" /><Skel h="h-4" /></div></div>)}
                </div>
              ) : detail && (
                <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-1">
                  {[
                    ...(detail.description ? [{ Icon: FileText, label: 'Description', content: <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{detail.description}</p> }] : []),
                    { Icon: Hash, label: 'Références', content: <div className="flex gap-3 flex-wrap"><span className="font-mono text-xs font-bold text-blue-600">{detail.ref_citoyen}</span>{detail.ref_service && <span className="font-mono text-xs text-slate-500">{detail.ref_service}</span>}</div> },
                    { Icon: Calendar, label: 'Soumise le', content: <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{fmt(detail.created_at)}</p> },
                    { Icon: User, label: 'Citoyen', content: detail.citizen ? <div className="flex items-center gap-2.5 mt-0.5"><Avatar name={`${detail.citizen.first_name} ${detail.citizen.last_name}`} role="citizen" /><div><p className="text-xs font-bold text-slate-800 dark:text-slate-100">{detail.citizen.first_name} {detail.citizen.last_name}</p><p className="text-[10px] text-slate-400">{detail.citizen.email}</p></div></div> : <p className="text-xs text-slate-400 italic">—</p> },
                    { Icon: MapPin, label: 'Localisation', content: <><p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{detail.address || detail.delegations?.name || '—'}</p>{detail.latitude && detail.longitude && <p className="text-[10px] font-mono text-slate-400 mt-0.5">{detail.latitude.toFixed(5)}, {detail.longitude.toFixed(5)}</p>}</> },
                  ].map(row => (
                    <div key={row.label} className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <row.Icon size={13} className="text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{row.label}</p>
                        {row.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Assigned team */}
              {!loading && detail && ['assignee_chef', 'assignee_agent', 'en_cours', 'resolue', 'cloturee'].includes(detail.status) && (
                <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Équipe assignée</p>
                  <div className="space-y-3">
                    {detail.department && <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-black text-[10px] border border-blue-100 dark:border-blue-900/30 flex-shrink-0">{detail.department.code}</div><div><p className="text-xs font-bold text-slate-800 dark:text-slate-200">{detail.department.name_fr || detail.department.name}</p><p className="text-[10px] text-slate-400">Département</p></div><Building2 size={14} className="text-slate-200 dark:text-slate-700 ml-auto" /></div>}
                    {detail.chef && <div className="flex items-center gap-3"><Avatar name={`${detail.chef.first_name} ${detail.chef.last_name}`} role="chef" /><div><p className="text-xs font-bold text-slate-800 dark:text-slate-200">{detail.chef.first_name} {detail.chef.last_name}</p><p className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">Chef de service</p></div></div>}
                    {detail.agent && <div className="flex items-center gap-3"><Avatar name={`${detail.agent.first_name} ${detail.agent.last_name}`} role="agent" /><div><p className="text-xs font-bold text-slate-800 dark:text-slate-200">{detail.agent.first_name} {detail.agent.last_name}</p><p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Agent terrain</p></div></div>}
                  </div>
                </div>
              )}

              {/* Resolved banner */}
              {!loading && isRes && detail?.resolved_at && (
                <div className="bg-emerald-50/50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 p-4 flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                  <div><p className="text-xs font-black text-emerald-800 dark:text-emerald-300">Intervention résolue</p><p className="text-[10px] text-emerald-600 dark:text-emerald-400">{fmt(detail.resolved_at)}</p></div>
                </div>
              )}

              {/* Rating */}
              {!loading && detail?.status === 'cloturee' && detail.rating && (
                <div className="bg-amber-50/50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-2">Évaluation citoyen</p>
                  <Stars score={detail.rating.score} />
                  {detail.rating.comment && <p className="text-xs text-amber-800 dark:text-amber-300 italic mt-2 leading-relaxed">«{detail.rating.comment}»</p>}
                </div>
              )}

              {/* Refusal reason */}
              {!loading && detail && ['refusee_chef', 'refusee_agent'].includes(detail.status) && (() => {
                const r = history.find(h => ['refusee_chef', 'refusee_agent'].includes(h.new_status))
                return r?.raison ? (
                  <div className="bg-red-50/50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30 p-4">
                    <div className="flex items-center gap-2 mb-2"><AlertTriangle size={14} className="text-red-500" /><p className="text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Motif du refus</p></div>
                    <p className="text-xs font-medium text-red-800 dark:text-red-300 leading-relaxed">«{r.raison}»</p>
                    {r.user && <p className="text-[10px] text-red-400 mt-1">par {r.user.first_name} {r.user.last_name} · {fmtShort(r.created_at)}</p>}
                  </div>
                ) : null
              })()}

              {/* Assign/Reassign */}
              {!loading && (canAss || canReas) && (
                <div className={`rounded-2xl border p-4 space-y-3 ${canAss ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800' : 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {canAss ? 'Affecter la déclaration' : 'Réassigner la déclaration'}
                    </p>
                    <button
                      onClick={() => setAssignments(prev => [...prev, { department_id: '', chef_id: '' }])}
                      className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2 py-1 rounded-lg transition-colors"
                    >
                      + Ajouter un service
                    </button>
                  </div>

                  {assignments.map((ass, i) => (
                    <div key={i} className="flex gap-2">
                      <select
                        value={ass.department_id}
                        onChange={e => {
                          const newAss = [...assignments];
                          newAss[i].department_id = e.target.value;
                          const autoChef = chefs.find(c => c.department_id === e.target.value);
                          newAss[i].chef_id = autoChef?.id || '';
                          setAssignments(newAss);

                        }}
                        className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      >
                        <option value="">Département…</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <select
                        value={ass.chef_id}
                        onChange={e => {
                          const newAss = [...assignments];
                          newAss[i].chef_id = e.target.value;
                          setAssignments(newAss);
                        }}
                        className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                      >
                        <option value="">👨‍💼 Chef (Auto si vide)…</option>
                        {chefs
                          .filter(c => !ass.department_id || c.department_id === ass.department_id)
                          .map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                      </select>
                      {assignments.length > 1 && (
                        <button
                          onClick={() => setAssignments(prev => prev.filter((_, idx) => idx !== i))}
                          className="w-10 flex-shrink-0 flex items-center justify-center bg-red-50 dark:bg-red-950/30 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PRIORITY AI TAB */}
          {tab === 'priority' && (
            <div className="absolute inset-0 overflow-y-auto px-5 py-5 pb-24">
              {detail && (
                <>
                  <AIPriorityPanel
                    declarationId={detail.id}
                    data={detail}
                    onUpdated={(patch: any) => {
                      setDetail((prev: any) => prev ? { ...prev, ...patch } : prev);
                      // Trigger load to refresh top-level data
                      load();
                    }}
                  />

                  {/* President Override Section */}
                  <div className="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-500" />
                      Décision Présidentielle
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                      Vous pouvez modifier manuellement le niveau de priorité de cette déclaration. Votre décision prévaut sur le calcul automatique de l'IA et de l'heuristique.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['urgent', 'normal', 'faible'] as const).map(lvl => (
                        <button
                          key={lvl}
                          onClick={() => handleOverride(lvl)}
                          disabled={overriding}
                          className={`py-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${finalPriority === lvl
                            ? "bg-slate-50 dark:bg-slate-800/50 border-[#1557FF] ring-1 ring-[#1557FF] shadow-sm"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30 opacity-80 hover:opacity-100"
                            }`}
                        >
                          <span className="text-[12px]">{AI_LEVELS[lvl].icon}</span>
                          <span className="text-[10px] font-black" style={{ color: AI_LEVELS[lvl].color }}>
                            {AI_LEVELS[lvl].label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {!detail && <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-blue-500" size={24} /></div>}
            </div>
          )}

          {/* HISTORY TAB */}
          {tab === 'history' && (
            <div className="absolute inset-0 overflow-y-auto px-5 py-5">
              {loading ? <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="flex gap-3"><Skel w="w-8" h="h-8" /><div className="flex-1 space-y-1 pt-1"><Skel h="h-3" w="w-20" /><Skel h="h-2" w="w-40" /></div></div>)}</div>
                : <Timeline status={detail?.status ?? 'soumise'} history={history} />}
            </div>
          )}

          {/* COMMENTS TAB */}
          {tab === 'comments' && (
            <div className="absolute inset-0 flex flex-col">
              <CommentsTab comments={comments} loading={loading} sending={sending}
                text={commentText} setText={setCommentText}
                onSend={handleComment} currentUserId={currentUserId} />
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        {!loading && detail && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold text-slate-400 leading-none">{detail.ref_service ?? detail.ref_citoyen}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{STATUS[detail.status]?.label ?? ''}</p>
            </div>
            <div className="flex items-center gap-2">

              {(canAss || canReas) ? (
                <>
                  {replacementWarning && (
                    <div className="flex-1 mr-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 flex flex-col items-start">
                      <p className="text-[10px] text-amber-800 dark:text-amber-400 font-bold leading-tight">{replacementWarning}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => { handleAssign(true) }} disabled={assigning}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[9px] font-bold transition-all">Confirmer le remplacement</button>
                        <button onClick={() => setReplacementWarning(null)} disabled={assigning}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[9px] font-bold transition-all">Annuler</button>
                      </div>
                    </div>
                  )}
                  {!replacementWarning && (
                    <button onClick={() => handleAssign()} disabled={assignments.every(a => !a.department_id) || assigning}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all disabled:opacity-40 shadow-lg shadow-blue-500/20">
                      {assigning ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      {canAss ? 'Assigner' : 'Réassigner'}
                    </button>
                  )}
                </>
              ) : (
                <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all">
                  Fermer
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>,
    document.body
  )
}

export default DeclarationDetailDrawer

