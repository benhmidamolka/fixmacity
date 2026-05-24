// src/pages/Agent/AgentDashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Clock, CheckCircle, XCircle, AlertTriangle, MapPin,
  Loader2, RefreshCw, Search, ChevronUp, ChevronDown,
  Filter, X, Star, Camera, Users, Building2, User,
  Shield, Phone, Mail, Calendar, Hash, Tag, ThumbsUp,
  MessageSquare, Send, Check, Eye, ChevronRight, Zap,
  BarChart3, FileText, Navigation
} from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''
const hdr = () => ({ Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json' })
const me  = () => { try { return JSON.parse(localStorage.getItem('fmc_user') || '{}') } catch { return {} } }

// ─── Types ────────────────────────────────────────────────────────────────────
interface Decl {
  id: string
  ref_citoyen?: string; ref_service?: string
  title: string; description?: string
  status: string; category?: string; address?: string
  created_at: string; assigned_at?: string
  votes_count?: number
  priority?: string; priority_score?: number
  final_priority?: string; president_override?: string
  is_sensitive?: boolean; sensitive_type?: string
  ai_confidence?: number; ai_reasoning?: string
  citizen?: { first_name: string; last_name: string; email: string; phone?: string }
  delegations?: { name: string; code: string }
  department?: { name_fr: string; code: string }
  agent?: { id: string; first_name: string; last_name: string } | null
  photos?: Photo[]
  history?: HistEntry[]
  other_agents?: OtherAgent[]   // agents from other depts on same decl
}

interface Photo    { id: string; url: string; created_at: string; photo_type?: string }
interface HistEntry { id: string; old_status: string; new_status: string; raison?: string; created_at: string }
interface OtherAgent { agent_name: string; department_name: string }

// ─── Priority config ──────────────────────────────────────────────────────────
const PRIO_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  urgent:   { label: 'Critique', color: '#DC2626', bg: '#FEE2E2', dot: '#EF4444' },
  critical: { label: 'Critique', color: '#DC2626', bg: '#FEE2E2', dot: '#EF4444' },
  haute:    { label: 'Élevée',   color: '#EA580C', bg: '#FFF7ED', dot: '#F97316' },
  high:     { label: 'Élevée',   color: '#EA580C', bg: '#FFF7ED', dot: '#F97316' },
  moyenne:  { label: 'Moyenne',  color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  medium:   { label: 'Moyenne',  color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  normale:  { label: 'Normale',  color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  normal:   { label: 'Normale',  color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  basse:    { label: 'Basse',    color: '#16A34A', bg: '#DCFCE7', dot: '#22C55E' },
  faible:   { label: 'Basse',    color: '#16A34A', bg: '#DCFCE7', dot: '#22C55E' },
  low:      { label: 'Basse',    color: '#16A34A', bg: '#DCFCE7', dot: '#22C55E' },
}
const getPrio = (d: Decl) => {
  const key = (d.final_priority ?? d.president_override ?? d.priority ?? 'normale').toLowerCase()
  return PRIO_CFG[key] ?? PRIO_CFG.moyenne
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const avatarColor = (name: string) => {
  const colors = ['#1557FF','#10B981','#F59E0B','#8B5CF6','#EF4444','#0891B2']
  return colors[(name?.charCodeAt(0) ?? 0) % colors.length]
}
const initials = (fn?: string, ln?: string) =>
  `${fn?.[0] ?? ''}${ln?.[0] ?? ''}`.toUpperCase() || '??'

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast: React.FC<{ msg: string; type: 'ok'|'err'; onDone: ()=>void }> = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-bold ${type==='ok' ? 'bg-emerald-500' : 'bg-red-500'}`}
      style={{ animation: 'slideUp .3s ease' }}>
      {type==='ok' ? <Check className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
      {msg}
    </div>
  )
}

// ─── Status dot ───────────────────────────────────────────────────────────────
const StatusDot: React.FC<{ status: string }> = ({ status }) => {
  const MAP: Record<string,string> = {
    assignee_agent: 'bg-indigo-500', en_cours: 'bg-amber-500',
    resolue: 'bg-emerald-500', cloturee: 'bg-slate-400', refusee_agent: 'bg-red-500',
  }
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${MAP[status] ?? 'bg-slate-300'} ${status==='assignee_agent'?'animate-pulse':''}`}/>
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
const DetailPanel: React.FC<{
  decl: Decl | null
  onAccept:  () => void
  onRefuse:  (motif: string) => void
  accepting: boolean
  refusing:  boolean
  onClose:   () => void
}> = ({ decl, onAccept, onRefuse, accepting, refusing, onClose }) => {
  const [tab,       setTab]       = useState<'info'|'priority'|'media'>('info')
  const [motif,     setMotif]     = useState('')
  const [showRefuse,setShowRefuse]= useState(false)

  useEffect(() => { setTab('info'); setMotif(''); setShowRefuse(false) }, [decl?.id])

  if (!decl) return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
      <Eye className="w-10 h-10 opacity-30"/>
      <p className="font-bold text-sm">Sélectionnez une déclaration</p>
      <p className="text-xs opacity-60 text-center max-w-40">Cliquez sur une ligne pour afficher les détails ici</p>
    </div>
  )

  const prio          = getPrio(decl)
  const isPresidentPrio = !!(decl.final_priority || decl.president_override)
  const canDecide     = decl.status === 'assignee_agent'
  const photos        = decl.photos ?? []
  const otherAgents   = decl.other_agents ?? []

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-0.5">
              #{decl.ref_service ?? decl.ref_citoyen ?? decl.id.slice(0,8)}
            </p>
            <h3 className="font-black text-[#0A1628] dark:text-slate-100 text-sm leading-tight">{decl.title}</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 flex-shrink-0 transition-all">
            <X className="w-3.5 h-3.5"/>
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {/* President priority badge — prominent */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
            style={{ color: prio.color, background: prio.bg }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: prio.dot }}/>
            {isPresidentPrio ? '🏛 ' : ''}{prio.label}
          </span>
          {decl.category && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {decl.category}
            </span>
          )}
          {decl.is_sensitive && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-orange-50 dark:bg-orange-950/20 text-orange-600">
              {decl.sensitive_type === 'hospital' ? '🏥' : '🏫'} Zone sensible
            </span>
          )}
          {(decl.votes_count ?? 0) > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-600">
              <ThumbsUp className="w-3 h-3"/> {decl.votes_count}
            </span>
          )}
          {otherAgents.length > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-violet-50 dark:bg-violet-950/20 text-violet-600">
              <Users className="w-3 h-3"/> Multi-dept
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-slate-100 dark:border-slate-800">
        {([
          ['info',     'Informations', FileText  ],
          ['priority', 'Priorité Président', Shield],
          ['media',    `Médias (${photos.length})`, Camera],
        ] as const).map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${tab===k ? 'border-[#1557FF] text-[#1557FF] dark:text-blue-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>
            <Icon className="w-3 h-3"/>{l}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* INFO TAB */}
        {tab === 'info' && (
          <div className="p-5 space-y-4">
            {/* Description */}
            {decl.description && (
              <div className="bg-blue-50/60 dark:bg-blue-950/20 rounded-xl p-3.5 border border-blue-100 dark:border-blue-900/30">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-1.5">Description du citoyen</p>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{decl.description}</p>
              </div>
            )}

            {/* Info rows */}
            <div className="space-y-0 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              {[
                { Icon: Calendar, label: 'Soumis le',    val: `${fmtDate(decl.created_at)} à ${fmtTime(decl.created_at)}` },
                { Icon: MapPin,   label: 'Localisation', val: decl.address ?? decl.delegations?.name ?? '—' },
                { Icon: Hash,     label: 'Réf. citoyen', val: decl.ref_citoyen ?? '—' },
                { Icon: Hash,     label: 'Réf. service', val: decl.ref_service  ?? '—' },
              ].filter(r => r.val && r.val !== '—').map(row => (
                <div key={row.label} className="flex items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <row.Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400"/>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{row.label}</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{row.val}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Citizen info */}
            {decl.citizen && (
              <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Informations citoyen</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ background: avatarColor(decl.citizen.first_name) }}>
                    {initials(decl.citizen.first_name, decl.citizen.last_name)}
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {decl.citizen.first_name} {decl.citizen.last_name}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Phone className="w-3 h-3"/> {decl.citizen.phone ?? 'Non renseigné'}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Mail className="w-3 h-3"/> {decl.citizen.email}
                  </p>
                </div>
              </div>
            )}

            {/* Other agents on same declaration */}
            {otherAgents.length > 0 && (
              <div className="bg-violet-50/60 dark:bg-violet-950/20 rounded-xl border border-violet-100 dark:border-violet-900/30 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-violet-500 mb-3 flex items-center gap-1.5">
                  <Users className="w-3 h-3"/> Autres agents assignés ({otherAgents.length})
                </p>
                <div className="space-y-2">
                  {otherAgents.map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                        style={{ background: avatarColor(a.agent_name) }}>
                        {a.agent_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{a.agent_name}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5"/>{a.department_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRIORITY TAB */}
        {tab === 'priority' && (
          <div className="p-5 space-y-4">
            {isPresidentPrio ? (
              <>
                {/* President decision card */}
                <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: prio.dot }}>
                  <div className="px-4 py-3 flex items-center gap-3" style={{ background: prio.bg }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                      style={{ background: prio.color }}>
                      <Shield className="w-5 h-5"/>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: prio.color }}>
                        Décision du Président municipal
                      </p>
                      <p className="text-sm font-black" style={{ color: prio.color }}>
                        Priorité {prio.label}
                      </p>
                    </div>
                    {decl.priority_score !== undefined && (
                      <div className="ml-auto text-right">
                        <p className="text-[9px] text-slate-500 font-bold">Score de priorité</p>
                        <p className="text-xl font-black" style={{ color: prio.color }}>
                          {decl.priority_score} <span className="text-xs text-slate-400">/ 100</span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4">
                    {/* Breakdown */}
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Raisons de la priorité</p>
                    <div className="space-y-2">
                      {decl.ai_reasoning && (
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-md bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <BarChart3 className="w-3 h-3 text-violet-600"/>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Analyse IA photo</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">{decl.ai_reasoning}</p>
                            {decl.ai_confidence !== undefined && (
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div className="h-1.5 rounded-full bg-violet-500" style={{ width:`${decl.ai_confidence}%` }}/>
                                </div>
                                <span className="text-[9px] font-black text-violet-500">{decl.ai_confidence}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {decl.is_sensitive && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                          <span className="text-lg">{decl.sensitive_type === 'hospital' ? '🏥' : '🏫'}</span>
                          <div>
                            <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Zone sensible à proximité</p>
                            <p className="text-xs text-orange-500 font-semibold">
                              {decl.sensitive_type === 'hospital' ? 'Hôpital' : 'École'} situé à proximité du signalement
                            </p>
                          </div>
                        </div>
                      )}
                      {(decl.votes_count ?? 0) > 0 && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                          <ThumbsUp className="w-4 h-4 text-blue-500"/>
                          <div>
                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Votes de la communauté</p>
                            <p className="text-xs text-blue-500 font-semibold">{decl.votes_count} citoyen{(decl.votes_count??0)>1?'s':''} ont signalé ce problème</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                <Shield className="w-10 h-10 opacity-30"/>
                <p className="text-xs font-bold">Aucune priorité définie</p>
                <p className="text-[10px] text-center opacity-60">Le président n'a pas encore évalué la priorité de ce signalement</p>
              </div>
            )}
          </div>
        )}

        {/* MEDIA TAB */}
        {tab === 'media' && (
          <div className="p-5">
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                <Camera className="w-10 h-10 opacity-30"/>
                <p className="text-xs font-bold">Aucune photo</p>
                <p className="text-[10px] opacity-60">Aucun média joint à ce signalement</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {photos.map((ph, i) => (
                  <div key={ph.id ?? i} className="rounded-xl overflow-hidden aspect-square bg-slate-100 dark:bg-slate-800 cursor-pointer hover:opacity-90 transition-opacity relative">
                    <img src={ph.url} alt={`Photo ${i+1}`} className="w-full h-full object-cover"/>
                    {i === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[8px] font-black uppercase">
                        {photos.length > 1 ? 'Avant' : 'Photo'}
                      </span>
                    )}
                    {i > 0 && (
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600/80 text-white text-[8px] font-black uppercase">
                        Après
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Decision section ── */}
      {canDecide && (
        <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-slate-900/60">
          {!showRefuse ? (
            <>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
                5. Votre décision
              </p>
              <div className="flex gap-2">
                <button onClick={onAccept} disabled={accepting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50">
                  {accepting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                  Accepter la tâche
                </button>
                <button onClick={() => setShowRefuse(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 text-xs font-black hover:bg-red-50 dark:hover:bg-red-950/20 transition-all">
                  <X className="w-4 h-4"/> Refuser la tâche
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-widest text-red-500">Motif du refus *</p>
                <button onClick={() => { setShowRefuse(false); setMotif('') }}
                  className="text-[9px] text-slate-400 hover:text-slate-600 font-bold">Annuler</button>
              </div>
              <textarea value={motif} onChange={e => setMotif(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-red-400 resize-none h-20 font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400"
                placeholder="Expliquer la raison du refus au chef de service…"/>
              <button
                onClick={() => { if (motif.trim()) { onRefuse(motif.trim()); setShowRefuse(false); setMotif('') } }}
                disabled={!motif.trim() || refusing}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black transition-all disabled:opacity-40 shadow-md shadow-red-500/20">
                {refusing ? <Loader2 className="w-4 h-4 animate-spin"/> : <X className="w-4 h-4"/>}
                Confirmer le refus
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status info for non-pending */}
      {!canDecide && (
        <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-[10px] font-bold text-slate-400 text-center">
            {decl.status === 'en_cours'      ? '⚡ Intervention en cours' :
             decl.status === 'resolue'        ? '✅ Déclaration résolue'    :
             decl.status === 'refusee_agent'  ? '❌ Refus transmis au chef' :
             decl.status === 'cloturee'       ? '🔒 Déclaration clôturée'   : decl.status}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Sort arrow ────────────────────────────────────────────────────────────────
const SortArrow: React.FC<{ col: string; current: string; dir: 'asc'|'desc' }> = ({ col, current, dir }) => {
  if (col !== current) return <ChevronDown className="w-3 h-3 text-slate-300"/>
  return dir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#1557FF]"/> : <ChevronDown className="w-3 h-3 text-[#1557FF]"/>
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const AgentDashboard: React.FC = () => {
  const user        = me()
  const [decls,     setDecls]     = useState<Decl[]>([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState<Decl | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [refusing,  setRefusing]  = useState(false)
  const [toast,     setToast]     = useState<{msg:string;type:'ok'|'err'}|null>(null)

  // Filters
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [prioFilter,   setPrioFilter]   = useState('all')
  const [sortCol,      setSortCol]      = useState<'created_at'|'priority'>('created_at')
  const [sortDir,      setSortDir]      = useState<'asc'|'desc'>('desc')
  const [multiFilter,  setMultiFilter]  = useState(false)  // multi-dept filter
  const [page,         setPage]         = useState(1)
  const PER_PAGE = 8

  const flash = (msg: string, type: 'ok'|'err' = 'ok') => setToast({ msg, type })

  // ── Load declarations ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/agent/declarations`, { headers: hdr() })
      const data = await res.json()
      // Also try to load full detail for each to get photos/other_agents
      const raw: Decl[] = data.declarations ?? []
      setDecls(raw)
      // If selected is in list, refresh it
      if (selected) {
        const fresh = raw.find(d => d.id === selected.id)
        if (fresh) setSelected(fresh)
      }
    } catch { flash('Erreur de chargement.', 'err') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Load detail when selecting ─────────────────────────────────────────────
  const openDetail = async (decl: Decl) => {
    setSelected(decl) // show immediately
    try {
      const res  = await fetch(`${API}/agent/declarations/${decl.id}`, { headers: hdr() })
      const full = await res.json()
      setSelected(full)
      // patch into list
      setDecls(prev => prev.map(d => d.id === decl.id ? { ...d, ...full } : d))
    } catch {}
  }

  // ── Accept ─────────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!selected) return
    setAccepting(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${selected.id}/accept`, {
        method: 'POST', headers: hdr(),
      })
      const d   = await res.json()
      if (!res.ok) { flash(d.error ?? 'Erreur.', 'err'); return }
      flash('Déclaration acceptée — en cours d\'intervention.')
      setDecls(prev => prev.map(dec => dec.id===selected.id ? { ...dec, status:'en_cours' } : dec))
      setSelected(s => s ? { ...s, status:'en_cours' } : null)
    } catch { flash('Erreur serveur.', 'err') }
    finally   { setAccepting(false) }
  }

  // ── Refuse ─────────────────────────────────────────────────────────────────
  const handleRefuse = async (motif: string) => {
    if (!selected) return
    setRefusing(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${selected.id}/refuse`, {
        method: 'POST', headers: hdr(),
        body: JSON.stringify({ raison: motif }),
      })
      const d   = await res.json()
      if (!res.ok) { flash(d.error ?? 'Erreur.', 'err'); return }
      flash('Refus transmis au chef de service.')
      setDecls(prev => prev.map(dec => dec.id===selected.id ? { ...dec, status:'refusee_agent' } : dec))
      setSelected(s => s ? { ...s, status:'refusee_agent' } : null)
    } catch { flash('Erreur serveur.', 'err') }
    finally   { setRefusing(false) }
  }

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const PRIO_ORDER: Record<string,number> = { urgent:5, critical:5, haute:4, high:4, moyenne:3, medium:3, normale:3, normal:3, basse:1, faible:1, low:1 }
  const getPrioKey = (d: Decl) => (d.final_priority ?? d.president_override ?? d.priority ?? 'normale').toLowerCase()

  const filtered = decls.filter(d => {
    if (search && !`${d.title} ${d.ref_citoyen ?? ''} ${d.ref_service ?? ''} ${d.address ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    if (prioFilter   !== 'all' && !getPrioKey(d).includes(prioFilter)) return false
    if (multiFilter  && !(d.other_agents && d.other_agents.length > 0)) return false
    return true
  }).sort((a, b) => {
    if (sortCol === 'priority') {
      const pa = PRIO_ORDER[getPrioKey(a)] ?? 2, pb = PRIO_ORDER[getPrioKey(b)] ?? 2
      return sortDir === 'desc' ? pb - pa : pa - pb
    }
    const ta = new Date(a.created_at).getTime(), tb = new Date(b.created_at).getTime()
    return sortDir === 'desc' ? tb - ta : ta - tb
  })

  const pages     = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d==='asc'?'desc':'asc')
    else { setSortCol(col); setSortDir('desc') }
    setPage(1)
  }

  // ── KPI stats ──────────────────────────────────────────────────────────────
  const kpiPending  = decls.filter(d => d.status === 'assignee_agent').length
  const kpiAccepted = decls.filter(d => d.status === 'en_cours').length
  const kpiDone     = decls.filter(d => ['resolue','cloturee'].includes(d.status)).length
  const kpiTotal    = decls.length
  const kpiRate     = kpiTotal > 0 ? Math.round(((kpiDone) / kpiTotal) * 100) : 0

  const selCls = "h-8 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none focus:border-[#1557FF] transition-all cursor-pointer"

  return (
    <AgentLayout title="Tableau de bord">
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      <div className="flex flex-col gap-5 h-full">

        {/* ── Welcome + KPIs ── */}
        <div className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl font-black text-[#0A1628] dark:text-white">
                Bonjour, {user.first_name ?? 'Agent'} 👋
              </h1>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">
                Voici les déclarations qui vous ont été assignées par votre chef de service.
              </p>
            </div>
            <button onClick={() => load()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-400 dark:text-slate-400 hover:text-[#1557FF] hover:border-blue-300 transition-all shadow-sm">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}/> Actualiser
            </button>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Assignées à moi',  val: kpiTotal,    sub: 'Total reçues',             icon: '📋', color: '#1557FF', bg: '#EEF2FF' },
              { label: 'Acceptées',        val: kpiAccepted, sub: 'En cours de traitement',   icon: '⏰', color: '#F59E0B', bg: '#FFFBEB' },
              { label: 'Terminées',        val: kpiDone,     sub: 'Ce mois-ci',               icon: '✅', color: '#10B981', bg: '#ECFDF5' },
              { label: 'Taux de réussite', val: `${kpiRate}%`,sub: kpiRate>=80?'Excellent 🚀':'En progression',icon:'📈',color:'#8B5CF6',bg:'#F5F3FF' },
            ].map(k => (
              <div key={k.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: k.bg }}>
                  {k.icon}
                </div>
                <div>
                  <p className="text-2xl font-black text-[#0A1628] dark:text-white leading-none">{k.val}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest mt-0.5" style={{ color: k.color }}>{k.label}</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500">{k.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main split layout ── */}
        <div className="flex-1 min-h-0 flex gap-4">

          {/* LEFT: Table */}
          <div className="flex flex-col flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">

            {/* Table toolbar */}
            <div className="flex-shrink-0 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-black text-[#0A1628] dark:text-white">Tâches assignées</h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Liste des déclarations en attente de votre décision</p>
              </div>

              {/* Search */}
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
                  <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                    placeholder="Rechercher…"
                    className="pl-8 pr-3 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-[#1557FF] transition-all w-40"/>
                  {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-slate-400"/></button>}
                </div>

                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className={selCls}>
                  <option value="all">Tous statuts</option>
                  <option value="assignee_agent">À accepter</option>
                  <option value="en_cours">En cours</option>
                  <option value="resolue">Résolue</option>
                  <option value="refusee_agent">Refusée</option>
                </select>

                <select value={prioFilter} onChange={e => { setPrioFilter(e.target.value); setPage(1) }} className={selCls}>
                  <option value="all">Toutes priorités</option>
                  <option value="critique">Critique</option>
                  <option value="haute">Élevée</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="basse">Basse</option>
                </select>

                <button onClick={() => { setMultiFilter(m => !m); setPage(1) }}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${multiFilter ? 'bg-violet-600 text-white border-violet-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-violet-300'}`}>
                  <Users className="w-3 h-3"/> Multi-dept
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-7 h-7 text-[#1557FF] animate-spin"/>
                </div>
              ) : paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                  <p className="font-bold text-sm">Aucune déclaration</p>
                  <p className="text-xs mt-1">Modifiez vos filtres</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 dark:bg-slate-800/80">
                      {[
                        { label:'ID',          col:null,          w:'w-24'   },
                        { label:'Titre & Catégorie', col:null,    w:'flex-1' },
                        { label:'Localisation',col:null,          w:'w-32'   },
                        { label:'Priorité',    col:'priority' as const, w:'w-24' },
                        { label:'Assigné le',  col:'created_at' as const, w:'w-28' },
                        { label:'Action',      col:null,          w:'w-20'   },
                      ].map(h => (
                        <th key={h.label}
                          onClick={() => h.col && toggleSort(h.col as any)}
                          className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 ${h.col ? 'cursor-pointer hover:text-[#1557FF] select-none' : ''} ${h.w}`}>
                          <div className="flex items-center gap-1">
                            {h.label}
                            {h.col && <SortArrow col={h.col} current={sortCol} dir={sortDir}/>}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {paginated.map(d => {
                      const prio    = getPrio(d)
                      const isSel   = selected?.id === d.id
                      const isNew   = d.status === 'assignee_agent'
                      return (
                        <tr key={d.id}
                          onClick={() => openDetail(d)}
                          className={`cursor-pointer transition-colors ${isSel ? 'bg-blue-50/60 dark:bg-blue-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                          {/* ID */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <StatusDot status={d.status}/>
                              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                #{(d.ref_service ?? d.ref_citoyen ?? d.id).slice(0, 12)}
                              </span>
                            </div>
                          </td>
                          {/* Title + Category */}
                          <td className="px-4 py-3 max-w-0">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className={`font-bold text-xs truncate ${isNew ? 'text-[#0A1628] dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                  {d.title}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{d.category ?? '—'}</p>
                              </div>
                              {d.other_agents && d.other_agents.length > 0 && (
                                <span className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/20 text-violet-600 text-[8px] font-black">
                                  <Users className="w-2.5 h-2.5"/>{d.other_agents.length+1}
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Location */}
                          <td className="px-4 py-3">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0 opacity-60"/>
                              {d.address ?? d.delegations?.name ?? '—'}
                            </p>
                          </td>
                          {/* Priority */}
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black"
                              style={{ color: prio.color, background: prio.bg }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: prio.dot }}/>
                              {prio.label}
                            </span>
                          </td>
                          {/* Date */}
                          <td className="px-4 py-3">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{fmtDate(d.assigned_at ?? d.created_at)}</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-600">{fmtTime(d.assigned_at ?? d.created_at)}</p>
                          </td>
                          {/* Action */}
                          <td className="px-4 py-3">
                            {isNew ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={e => { e.stopPropagation(); openDetail(d) }}
                                  className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-all"
                                  title="Accepter">
                                  <Check className="w-3.5 h-3.5"/>
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); openDetail(d) }}
                                  className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all"
                                  title="Refuser">
                                  <X className="w-3.5 h-3.5"/>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); openDetail(d) }}
                                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-all">
                                <Eye className="w-3.5 h-3.5"/>
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400">
                  Affichage de {(page-1)*PER_PAGE+1} à {Math.min(page*PER_PAGE, filtered.length)} sur {filtered.length} résultats
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                    className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition-all">
                    <ChevronDown className="w-3.5 h-3.5 rotate-90"/>
                  </button>
                  {Array.from({length:pages},(_,i)=>i+1).filter(p=>p===1||p===pages||Math.abs(p-page)<=1).map((p,i,arr) => (
                    <React.Fragment key={p}>
                      {i>0 && arr[i-1]!==p-1 && <span className="text-slate-300 text-xs">…</span>}
                      <button onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-black transition-all ${page===p ? 'bg-[#1557FF] text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                  <button onClick={() => setPage(p => Math.min(pages,p+1))} disabled={page===pages}
                    className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition-all">
                    <ChevronDown className="w-3.5 h-3.5 -rotate-90"/>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Detail panel */}
          <div className="flex-shrink-0 w-80 xl:w-96">
            <div className="h-full">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-1">
                Détails de la déclaration
              </p>
              <div style={{ height: 'calc(100% - 24px)' }}>
                <DetailPanel
                  decl={selected}
                  onAccept={handleAccept}
                  onRefuse={handleRefuse}
                  accepting={accepting}
                  refusing={refusing}
                  onClose={() => setSelected(null)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}
    </AgentLayout>
  )
}

export default AgentDashboard