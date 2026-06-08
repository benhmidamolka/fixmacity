// src/pages/Chef/ChefDeclarations.tsx
// ── Rebuilt detail drawer: photos, inter-dept comments, priority, history ─────
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Search, Plus, X, ChevronUp, ChevronDown, ChevronsUpDown,
  ArrowUp, ArrowRight, ArrowDown, CheckCircle2, Clock,
  AlertCircle, XCircle, MoreHorizontal, UserCheck, RefreshCw,
  Download, Eye, Check, Loader2, Shield, AlertTriangle, Send,
  Brain, MapPin, ThumbsUp, Camera, Zap, Activity, Info,
  History, MessageSquare, Star, User, Building2, Hash,
  FileText, ChevronLeft, ChevronRight, ImageIcon, Phone,
  Mail, Calendar
} from 'lucide-react'
import ChefLayout from '../../layouts/ChefLayout'

const API   = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok   = () => localStorage.getItem('fmc_token') || ''
const hdr   = () => ({ Authorization: `Bearer ${tok()}` })
const hjson = () => ({ ...hdr(), 'Content-Type': 'application/json' })

// ── Types ─────────────────────────────────────────────────────────────────────
interface Decl {
  id: string; ref_citoyen: string; ref_service: string | null
  title: string; description: string; category: string
  status: string; priority: string; priority_score: number
  votes_count: number; created_at: string; assigned_at: string | null
  resolved_at: string | null; address: string | null
  agent_id: string | null; photo_avant: string | null; photo_url?: string | null
  citizen?: { first_name: string; last_name: string } | null
  ai_reasoning?: string | null; used_ai_vision?: boolean
  is_sensitive?: boolean; sensitive_type?: string | null
}
interface Agent {
  id: string; first_name: string; last_name: string
  is_active: boolean; workload: number; resolved_count: number; is_overloaded: boolean
}

// ── Config ────────────────────────────────────────────────────────────────────
const AGENT_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ec4899','#8b5cf6','#ef4444','#14b8a6']

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  soumise:        { label: 'Soumise',        color: '#d97706', bg: '#fffbeb', dot: '#f59e0b' },
  assignee_chef:  { label: 'À traiter',      color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
  assignee_agent: { label: 'Assignée agent', color: '#1d4ed8', bg: '#dbeafe', dot: '#3b82f6' },
  en_cours:       { label: 'En cours',       color: '#c2410c', bg: '#ffedd5', dot: '#f97316' },
  resolue:        { label: 'Résolue',        color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
  cloturee:       { label: 'Clôturée',       color: '#475569', bg: '#f1f5f9', dot: '#94a3b8' },
  refusee_chef:   { label: 'Refusée',        color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
  refusee_agent:  { label: 'Renvoyée agent', color: '#b91c1c', bg: '#fee2e2', dot: '#ef4444' },
}

const CHANNEL_CFG: Record<string, { label: string; color: string; bg: string; role: string }> = {
  president_chef: { label: 'Président ↔ Chef',     color: '#7c3aed', bg: '#ede9fe', role: 'Président' },
  chef_agent:     { label: 'Chef ↔ Agent',          color: '#1d4ed8', bg: '#dbeafe', role: 'Agent'    },
  interdept:      { label: 'Inter-département',     color: '#0891b2', bg: '#e0f2fe', role: 'Chef'     },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const Sk = ({ w = 'w-full', h = 'h-4', r = 'rounded-xl' }: { w?: string; h?: string; r?: string }) => (
  <div className={`${w} ${h} ${r} bg-slate-100 dark:bg-slate-800 animate-pulse`} />
)

const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
const fmtFull = (d: string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const fmtTime = (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

function getCatEmoji(cat?: string) {
  const m: Record<string, string> = {
    'Voirie': '🛣️', 'Éclairage Public': '💡', 'Propreté': '🗑️',
    'Espaces Verts': '🌿', 'Réseaux': '💧', 'Signalisation': '🚦',
    'Administratif': '🏢', 'Suggestions': '💬'
  }
  return cat ? (m[cat] || '📌') : '📌'
}

const StatusPill = ({ status }: { status: string }) => {
  const c = STATUS_CFG[status] || { label: status, color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap"
      style={{ color: c.color, background: c.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

const PriPill = ({ priority }: { priority: string }) => {
  const lo = priority?.toLowerCase()
  const isHigh = ['haute','high','urgent','urgente'].includes(lo)
  const isMed  = ['moyenne','medium'].includes(lo)
  const color  = isHigh ? '#dc2626' : isMed ? '#d97706' : '#059669'
  const bg     = isHigh ? '#fee2e2' : isMed ? '#fef3c7' : '#dcfce7'
  const label  = isHigh ? 'Urgent' : isMed ? 'Normal' : 'Faible'
  const Icon   = isHigh ? Zap : isMed ? Activity : ArrowDown
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap"
      style={{ color, background: bg }}>
      <Icon size={10} />
      {label}
    </span>
  )
}

function SortIcon({ col, sort }: { col: string; sort: { col: string; dir: 'asc' | 'desc' } }) {
  if (sort.col !== col) return <ChevronsUpDown size={12} className="text-slate-300 dark:text-slate-600" />
  return sort.dir === 'asc' ? <ChevronUp size={12} className="text-slate-600" /> : <ChevronDown size={12} className="text-slate-600" />
}

// ── Accept modal ──────────────────────────────────────────────────────────────
function AcceptModal({ decl, agents, onClose, onDone }: {
  decl: Decl; agents: Agent[]; onClose: () => void; onDone: () => void
}) {
  const [agentId, setAgentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const maxTasks = parseInt(localStorage.getItem('fmc_max_tasks') || '5')
  const active   = agents.filter(a => a.is_active)

  const go = async () => {
    if (!agentId) { setError('Sélectionnez un agent.'); return }
    setLoading(true); setError(null)
    const res = await fetch(`${API}/chef/declarations/${decl.id}/accept`, {
      method: 'POST', headers: hjson(), body: JSON.stringify({ agent_id: agentId })
    }).catch(() => null)
    if (!res) { setLoading(false); setError('Erreur réseau.'); return }
    const d = await res.json()
    if (!res.ok) { setLoading(false); setError(d.error || 'Erreur.'); return }
    if (d.warning) setWarning(d.warning)
    setTimeout(() => { onDone(); onClose() }, d.warning ? 1500 : 400)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,.6)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <UserCheck size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">Accepter & Assigner</p>
              <p className="text-[10px] text-slate-400 truncate max-w-52">{decl.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <X size={14} />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {active.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
              <p className="text-xs font-bold text-slate-400">Aucun agent actif disponible</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {active.map((a, i) => {
                const overloaded = a.workload >= maxTasks
                return (
                  <label key={a.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${agentId === a.id ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 bg-white dark:bg-slate-900'}`}>
                    <input type="radio" name="agent" value={a.id} checked={agentId === a.id} onChange={() => setAgentId(a.id)} className="sr-only" />
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white flex-shrink-0"
                      style={{ background: AGENT_COLORS[i % AGENT_COLORS.length] }}>
                      {a.first_name[0]}{a.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{a.first_name} {a.last_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (a.workload / maxTasks) * 100)}%`, background: overloaded ? '#ef4444' : a.workload >= Math.ceil(maxTasks / 2) ? '#f59e0b' : '#22c55e' }} />
                        </div>
                        <span className="text-[10px] text-slate-400">{a.workload}/{maxTasks}</span>
                      </div>
                    </div>
                    {overloaded && <span className="text-[9px] font-black text-red-500 border border-red-200 rounded-full px-1.5 py-0.5">Chargé</span>}
                    {agentId === a.id && <Check size={14} className="text-emerald-500 flex-shrink-0" />}
                  </label>
                )
              })}
            </div>
          )}
          {warning && <div className="flex gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700"><AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />{warning}</div>}
          {error   && <div className="flex gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700"><AlertCircle size={13} className="flex-shrink-0 mt-0.5" />{error}</div>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Annuler</button>
          <button onClick={go} disabled={loading || !agentId || active.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm disabled:opacity-40 transition-all">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <><UserCheck size={14} /> Assigner</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Refuse modal ──────────────────────────────────────────────────────────────
function RefuseModal({ decl, onClose, onDone }: { decl: Decl; onClose: () => void; onDone: () => void }) {
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const REASONS = ['Hors périmètre technique', 'Informations insuffisantes', 'Doublon détecté', 'Matériel non disponible', 'Autre']

  const go = async () => {
    if (!reason.trim()) { setError('Motif obligatoire.'); return }
    setLoading(true)
    const res = await fetch(`${API}/chef/declarations/${decl.id}/refuse`, {
      method: 'POST', headers: hjson(), body: JSON.stringify({ reason })
    }).catch(() => null)
    if (!res || !res.ok) { setLoading(false); setError('Erreur.'); return }
    onDone(); onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,.6)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 bg-red-50/60 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-red-100 flex items-center justify-center"><XCircle size={16} className="text-red-500" /></div>
            <p className="text-sm font-black text-red-700 dark:text-red-400">Refuser le dossier</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-400"><X size={14} /></button>
        </div>
        <div className="p-6 space-y-3">
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">Le Président sera notifié et pourra réassigner ce dossier.</div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motif *</p>
          {REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${reason === r ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200'}`}>
              {r}
            </button>
          ))}
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Précisions…" rows={3}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-400 resize-none text-slate-700 dark:text-slate-300 placeholder-slate-400" />
          {error && <div className="text-xs text-red-500 font-bold">{error}</div>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Annuler</button>
          <button onClick={go} disabled={loading || !reason.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-sm disabled:opacity-40 transition-all">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <><XCircle size={14} /> Confirmer</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL DRAWER — full implementation
// ─────────────────────────────────────────────────────────────────────────────
interface DetailDrawerProps {
  declId: string
  agents: Agent[]
  onClose: () => void
  onRefreshed: () => void
}

const STEPS = ['soumise', 'assignee_chef', 'assignee_agent', 'en_cours', 'resolue', 'cloturee']
const STEP_LABELS: Record<string, string> = {
  soumise: 'Soumis', assignee_chef: 'Chef', assignee_agent: 'Agent', en_cours: 'En cours', resolue: 'Résolu', cloturee: 'Clôturé'
}

function DetailDrawer({ declId, agents, onClose, onRefreshed }: DetailDrawerProps) {
  const [decl,    setDecl]    = useState<any | null>(null)
  const [photos,  setPhotos]  = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [comments,setComments]= useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<'info' | 'photos' | 'priority' | 'history' | 'messages'>('info')
  const [channel, setChannel] = useState<'president_chef' | 'chef_agent' | 'interdept'>('president_chef')
  const [msg,     setMsg]     = useState('')
  const [sending, setSending] = useState(false)
  const [showAccept, setShowAccept] = useState(false)
  const [showRefuse, setShowRefuse] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const me = JSON.parse(localStorage.getItem('fmc_user') || '{}')

  useEffect(() => {
    setLoading(true); setDecl(null); setPhotos([]); setHistory([]); setComments([])
    fetch(`${API}/chef/declarations/${declId}`, { headers: hdr() })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setDecl(d.declaration || d)
        setPhotos(d.photos || [])
        setHistory(d.history || [])
        setComments(d.comments || [])
      })
      .finally(() => setLoading(false))
  }, [declId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments.length, channel])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const sendMsg = async () => {
    if (!msg.trim() || !decl) return
    setSending(true)
    try {
      const r = await fetch(`${API}/chef/declarations/${declId}/comments`, {
        method: 'POST', headers: hjson(),
        body: JSON.stringify({ content: msg.trim(), channel })
      })
      if (r.ok) {
        const d = await r.json()
        const me_user = JSON.parse(localStorage.getItem('fmc_user') || '{}')
        setComments(p => [...p, { ...d.comment, user: { ...me_user, role: 'chef' } }])
        setMsg('')
      }
    } catch {} finally { setSending(false) }
  }

  const isIncoming = decl?.status === 'assignee_chef'
  const isCloturee = decl?.status === 'cloturee'

  // Separate photos by type
  const photoAvant  = photos.find(p => p.photo_type === 'photo_avant' || !p.photo_type) || (decl?.photo_avant ? { id: 'inline', url: decl.photo_avant, photo_type: 'photo_avant' } : null) || (decl?.image_url ? { id: 'inline2', url: decl.image_url, photo_type: 'photo_avant' } : null)
  const photosApres = photos.filter(p => p.photo_type === 'photo_apres')
  const allPhotos   = photos.length > 0 ? photos : [photoAvant].filter(Boolean)



  // Filter comments by channel
  const filteredComments = comments.filter(c => !c.channel || c.channel === channel)

  // Workflow step index
  const stepIdx = STEPS.indexOf(decl?.status || 'soumise')

  const TABS = [
    { key: 'info',     label: 'Infos',      icon: Info        },
    { key: 'photos',   label: 'Médias',     icon: Camera      },
    { key: 'history',  label: 'Progression', icon: Activity   },
    { key: 'messages', label: 'Messages',   icon: MessageSquare, badge: comments.length },
  ]

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-[680px] bg-white dark:bg-slate-950 shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800">

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {loading ? <Sk w="w-24" h="h-6" r="rounded-full" /> : <StatusPill status={decl?.status || 'soumise'} />}
            {!loading && decl?.ref_citoyen && (
              <span className="font-mono text-[10px] font-black text-blue-600 dark:text-blue-400">{decl.ref_citoyen}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!loading && isIncoming && (
              <>
                <button onClick={() => setShowAccept(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-sm transition-all">
                  <UserCheck size={13} /> Assigner
                </button>
                <button onClick={() => setShowRefuse(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black border border-red-200 transition-all">
                  <XCircle size={13} /> Refuser
                </button>
              </>
            )}
            <button onClick={onClose} className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-all">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── TITLE + PROGRESS BAR ────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          {loading ? (
            <div className="space-y-2"><Sk h="h-6" w="w-3/4" /><Sk h="h-3" w="w-1/2" /></div>
          ) : decl && (
            <>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                  {getCatEmoji(decl.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">{decl.title}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {decl.category && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{decl.category}</span>}
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5"><Calendar size={9} /> {fmtDate(decl.created_at)}</span>
                    <PriPill priority={decl.priority} />
                  </div>
                </div>
              </div>
              {/* Workflow stepper */}
              <div className="flex items-center gap-1">
                {STEPS.map((step, i) => {
                  const done    = i < stepIdx
                  const current = i === stepIdx
                  return (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-0.5 flex-1">
                        <div className={`h-1.5 w-full rounded-full transition-all ${done ? 'bg-[#1557FF]' : current ? 'bg-blue-300 dark:bg-blue-700' : 'bg-slate-100 dark:bg-slate-800'}`} />
                        <span className={`text-[8px] font-black whitespace-nowrap ${done || current ? 'text-[#1557FF] dark:text-blue-400' : 'text-slate-300 dark:text-slate-700'}`}>
                          {STEP_LABELS[step]}
                        </span>
                      </div>
                    </React.Fragment>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* ── TABS ─────────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex border-b border-slate-100 dark:border-slate-800 px-2 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-black border-b-2 transition-all whitespace-nowrap ${tab === t.key ? 'border-[#1557FF] text-[#1557FF] dark:text-blue-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              <t.icon size={13} />
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-blue-100 dark:bg-blue-500/20 text-[#1557FF]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ─────────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 relative">

          {/* ══ INFO TAB ══ */}
          {tab === 'info' && (
            <div className="absolute inset-0 overflow-y-auto p-6 space-y-5">
              {loading ? (
                <div className="space-y-4">{[...Array(5)].map((_, i) => <Sk key={i} h="h-20" r="rounded-2xl" />)}</div>
              ) : !decl ? (
                <div className="text-center py-12 text-slate-400">Déclaration introuvable.</div>
              ) : (
                <>
                  {/* 1. Description */}
                  <div className="bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-5">
                    <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[.18em] mb-2 flex items-center gap-1.5">
                      <FileText size={10} /> 1. Description du citoyen
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {decl.description || <span className="italic text-slate-400">Aucune description fournie.</span>}
                    </p>
                  </div>

                  {/* 2. Localisation */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[.18em] mb-3 flex items-center gap-1.5">
                      <MapPin size={10} /> 2. Localisation
                    </p>
                    {decl.address ? (
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                          <MapPin size={14} className="text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{decl.address}</p>
                          {decl.latitude && decl.longitude && (
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{Number(decl.latitude).toFixed(5)}°N, {Number(decl.longitude).toFixed(5)}°E</p>
                          )}
                        </div>
                      </div>
                    ) : decl.latitude ? (
                      <p className="font-mono text-sm text-slate-600 dark:text-slate-400">{Number(decl.latitude).toFixed(5)}°N, {Number(decl.longitude).toFixed(5)}°E</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Localisation non précisée.</p>
                    )}
                    {decl.is_sensitive && (
                      <div className="mt-2.5 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
                        <AlertTriangle size={12} /> Zone sensible : {decl.sensitive_type || 'détectée'}
                      </div>
                    )}
                  </div>

                  {/* 3. Informations citoyen */}
                  {decl.citizen && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[.18em] mb-3 flex items-center gap-1.5">
                        <User size={10} /> 3. Informations citoyen
                      </p>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center font-black text-sm text-blue-600 dark:text-blue-400 flex-shrink-0">
                          {decl.citizen.first_name?.[0]}{decl.citizen.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">{decl.citizen.first_name} {decl.citizen.last_name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(decl.created_at)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {decl.citizen.email && (
                          <div className="flex items-center gap-2 text-xs">
                            <Mail size={11} className="text-slate-400 flex-shrink-0" />
                            <span className="text-slate-600 dark:text-slate-400 truncate">{decl.citizen.email}</span>
                          </div>
                        )}
                        {decl.citizen.phone && (
                          <div className="flex items-center gap-2 text-xs">
                            <Phone size={11} className="text-slate-400 flex-shrink-0" />
                            <span className="text-slate-600 dark:text-slate-400">{decl.citizen.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          <ThumbsUp size={11} className="text-blue-400 flex-shrink-0" />
                          <span className="text-blue-600 dark:text-blue-400 font-bold">{decl.votes_count || 0} soutien{(decl.votes_count || 0) !== 1 ? 's' : ''}</span>
                        </div>
                        {decl.ref_citoyen && (
                          <div className="flex items-center gap-2 text-xs">
                            <Hash size={11} className="text-slate-400 flex-shrink-0" />
                            <span className="font-mono text-slate-600 dark:text-slate-400">{decl.ref_citoyen}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. Agent assigné */}
                  {decl.assigned_agent && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-5">
                      <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[.18em] mb-3 flex items-center gap-1.5">
                        <UserCheck size={10} /> 4. Agent assigné
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center font-black text-sm text-emerald-700 dark:text-emerald-400">
                          {decl.assigned_agent.first_name?.[0]}{decl.assigned_agent.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">{decl.assigned_agent.first_name} {decl.assigned_agent.last_name}</p>
                          {decl.assigned_at && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Assigné le {fmtDate(decl.assigned_at)}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Résolution banner */}
                  {isCloturee && decl.resolved_at && (
                    <div className="bg-slate-900 dark:bg-white/5 border border-slate-700 rounded-2xl p-5 flex items-center gap-3">
                      <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-black text-white dark:text-slate-100">Dossier clôturé</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Résolu le {fmtFull(decl.resolved_at)}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══ PHOTOS TAB ══ */}
          {tab === 'photos' && (
            <div className="absolute inset-0 overflow-y-auto p-6 space-y-5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[.18em]">Photos soumises par le citoyen</p>

              {/* Photo avant */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">Photo avant — Déclarée par le citoyen</p>
                </div>
                <div className="aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {photoAvant ? (
                    <img src={photoAvant.url} alt="Avant" className="w-full h-full object-cover cursor-zoom-in"
                      onClick={() => window.open(photoAvant.url, '_blank')} />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <ImageIcon size={28} className="text-slate-300" />
                      <p className="text-xs font-bold">Aucune photo soumise</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Photos après (agent) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">Photos après intervention — Par l'agent</p>
                </div>
                {photosApres.length > 0 ? (
                  <div className="grid grid-cols-2 gap-0.5">
                    {photosApres.map((p: any, i: number) => (
                      <div key={p.id || i} className="aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                        <img src={p.url} alt={`Après ${i + 1}`} className="w-full h-full object-cover cursor-zoom-in"
                          onClick={() => window.open(p.url, '_blank')} />
                        <div className="absolute bottom-2 left-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                          ✓ Après {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Clock size={24} className="text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-bold">
                      {isCloturee ? 'Aucune photo après clôture.' : "En attente de l'intervention de l'agent."}
                    </p>
                  </div>
                )}
              </div>

              {/* All other photos from declaration_photos */}
              {photos.filter(p => p.photo_type !== 'photo_avant' && p.photo_type !== 'photo_apres').length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[.18em] mb-3">Autres documents joints</p>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.filter(p => p.photo_type !== 'photo_avant' && p.photo_type !== 'photo_apres').map((p: any, i: number) => (
                      <div key={p.id || i} className="aspect-square rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(p.url, '_blank')}>
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}



          {/* ══ HISTORY TAB ══ */}
          {tab === 'history' && (
            <div className="absolute inset-0 overflow-y-auto p-6">
              {loading ? (
                <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="flex gap-3"><Sk w="w-7" h="h-7" r="rounded-full" /><div className="flex-1 space-y-1.5 pt-1"><Sk h="h-3" w="w-24" /><Sk h="h-2" w="w-40" /></div></div>)}</div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <History size={24} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-400">Aucun historique</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-slate-100 dark:bg-slate-800" />
                  {[...history].reverse().map((h: any, i: number) => {
                    const sc = STATUS_CFG[h.new_status]
                    return (
                      <div key={h.id || i} className="flex gap-4 pb-5 last:pb-0 relative">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0"
                          style={{ background: sc?.bg || '#f1f5f9', border: `2px solid ${sc?.dot || '#94a3b8'}` }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: sc?.dot || '#94a3b8' }} />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-xs font-black" style={{ color: sc?.color || '#64748b' }}>
                              {sc?.label || h.new_status}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{fmtFull(h.created_at)}</span>
                          </div>
                          {h.user && <p className="text-[10px] text-slate-400 dark:text-slate-500">par {h.user.first_name} {h.user.last_name} · <span className="font-bold">{h.user.role}</span></p>}
                          {(h.raison || h.comment) && (
                            <div className="mt-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl px-3 py-2 text-[10px] text-amber-700 dark:text-amber-400 italic">
                              «{h.raison || h.comment}»
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ MESSAGES TAB ══ */}
          {tab === 'messages' && (
            <div className="absolute inset-0 flex flex-col">
              {/* Channel selector */}
              <div className="flex-shrink-0 flex gap-2 p-4 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                {(['president_chef', 'chef_agent', 'interdept'] as const).map(ch => {
                  const cfg = CHANNEL_CFG[ch]
                  const active = channel === ch
                  const count = comments.filter(c => !c.channel || c.channel === ch).length
                  return (
                    <button key={ch} onClick={() => setChannel(ch)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[10px] font-black transition-all border"
                      style={active ? { background: cfg.color, color: 'white', borderColor: cfg.color } : { background: 'transparent', color: '#94a3b8', borderColor: '#e2e8f0' }}>
                      {cfg.label}
                      {count > 0 && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Channel description */}
              <div className="flex-shrink-0 px-5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold"
                  style={{ background: CHANNEL_CFG[channel].bg, color: CHANNEL_CFG[channel].color }}>
                  <MessageSquare size={11} />
                  {channel === 'president_chef' && 'Messages entre le Président Municipal et le Chef de Service'}
                  {channel === 'chef_agent' && 'Instructions du Chef vers l\'Agent terrain'}
                  {channel === 'interdept' && 'Communication inter-départements (autre Chef de Service assigné)'}
                </div>
              </div>

              {/* Messages list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
                {loading ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => <Sk key={i} h="h-16" r="rounded-2xl" />)}</div>
                ) : filteredComments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <MessageSquare size={18} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Aucun message dans ce canal</p>
                    <p className="text-[10px] text-slate-300 dark:text-slate-600">Commencez la conversation</p>
                  </div>
                ) : filteredComments.map((c: any, i: number) => {
                  const isMe = c.user_id === me.id || c.user?.role === 'chef'
                  const name = c.user ? `${c.user.first_name} ${c.user.last_name}` : '?'
                  const roleLabel = c.user?.role === 'president' ? 'Président'
                    : c.user?.role === 'chef' ? 'Chef'
                    : c.user?.role === 'agent' ? 'Agent'
                    : c.user?.role || ''
                  const cfg = CHANNEL_CFG[channel]
                  return (
                    <div key={c.id || i} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-sm"
                        style={{ background: isMe ? cfg.color : c.user?.role === 'president' ? '#7c3aed' : '#94a3b8' }}>
                        {isMe ? 'M' : name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                      </div>
                      <div className={`flex flex-col max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{isMe ? 'Vous' : name}</span>
                          {roleLabel && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{roleLabel}</span>
                          )}
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">{fmtTime(c.created_at)}</span>
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${isMe ? 'rounded-tr-sm text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'}`}
                          style={isMe ? { background: cfg.color } : {}}>
                          {c.content}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                <div className="flex gap-2.5">
                  <input value={msg} onChange={e => setMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
                    placeholder={`Message — ${CHANNEL_CFG[channel].label}…`}
                    className="flex-1 text-xs px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-[#1557FF] dark:focus:border-blue-400 font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 transition-all" />
                  <button onClick={sendMsg} disabled={sending || !msg.trim()}
                    className="w-10 h-10 rounded-2xl text-white disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-all shadow-sm"
                    style={{ background: CHANNEL_CFG[channel].color }}>
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-1.5 text-center">Entrée pour envoyer</p>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
        {!loading && decl && (
          <div className="flex-shrink-0 px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{decl.ref_service || decl.ref_citoyen}</span>
          </div>
        )}
      </div>

      {showAccept && decl && <AcceptModal decl={decl as Decl} agents={agents} onClose={() => setShowAccept(false)} onDone={() => { onRefreshed(); setShowAccept(false) }} />}
      {showRefuse && decl && <RefuseModal decl={decl as Decl} onClose={() => setShowRefuse(false)} onDone={() => { onRefreshed(); setShowRefuse(false) }} />}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
function getPriorityLabel(p: string) {
  const lo = p?.toLowerCase()
  if (['haute','high','urgent','urgente'].includes(lo)) return { label: 'HIGH',   color: '#dc2626', bg: '#fee2e2' }
  if (['moyenne','medium'].includes(lo))                return { label: 'MEDIUM', color: '#d97706', bg: '#fef3c7' }
  return                                                       { label: 'LOW',    color: '#16a34a', bg: '#dcfce7' }
}

const ChefDeclarations: React.FC = () => {
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id?: string }>()

  const [declarations, setDeclarations] = useState<Decl[]>([])
  const [agents,       setAgents]       = useState<Agent[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<'en_attente' | 'en_cours' | 'evaluee' | 'cloturee'>('en_attente')
  const [prioFilter,   setPrioFilter]   = useState('all')
  const [agentFilter,  setAgentFilter]  = useState('all')
  const [sort,         setSort]         = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'created_at', dir: 'desc' })
  const [selected,     setSelected]     = useState<string[]>([])
  const [acceptTarget, setAcceptTarget] = useState<Decl | null>(null)
  const [refuseTarget, setRefuseTarget] = useState<Decl | null>(null)
  const [actionMenu,   setActionMenu]   = useState<string | null>(null)
  const [page,         setPage]         = useState(1)
  const [rowsPerPage,  setRowsPerPage]  = useState(10)
  const [colsOpen,     setColsOpen]     = useState(false)
  const [visibleCols,  setVisibleCols]  = useState({ ref: true, assignee: true, dueDate: true, status: true, priority: true })

  const load = useCallback(async () => {
    setLoading(true)
    const [dRes, aRes] = await Promise.all([
      fetch(`${API}/chef/declarations?limit=200`, { headers: hdr() }),
      fetch(`${API}/chef/agents`, { headers: hdr() }),
    ])
    if (dRes.ok) { const d = await dRes.json(); setDeclarations(Array.isArray(d) ? d : d.declarations || []) }
    if (aRes.ok) { const d = await aRes.json(); setAgents(d.agents || []) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    const res = await fetch(`${API}/chef/export`, { headers: hdr() }).catch(() => null)
    if (!res?.ok) return
    const blob = await res.blob(); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `declarations-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const counts = {
    en_attente: declarations.filter(d => ['assignee_chef', 'soumise', 'refusee_agent'].includes(d.status?.toLowerCase())).length,
    en_cours:   declarations.filter(d => ['assignee_agent', 'en_cours'].includes(d.status?.toLowerCase())).length,
    evaluee:    declarations.filter(d => ['resolue', 'evaluee'].includes(d.status?.toLowerCase())).length,
    cloturee:   declarations.filter(d => ['cloturee'].includes(d.status?.toLowerCase())).length,
  }

  const filtered = declarations.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !(d.ref_citoyen || '').toLowerCase().includes(search.toLowerCase())) return false
    const n = d.status?.toLowerCase()
    if (statusFilter === 'en_attente' && !['assignee_chef', 'soumise', 'refusee_agent'].includes(n)) return false
    if (statusFilter === 'en_cours'   && !['assignee_agent', 'en_cours'].includes(n))                return false
    if (statusFilter === 'evaluee'    && !['resolue', 'evaluee'].includes(n))                        return false
    if (statusFilter === 'cloturee'   && n !== 'cloturee')                                           return false
    if (prioFilter !== 'all') {
      const lo = d.priority?.toLowerCase()
      if (prioFilter === 'haute'   && !['haute','high','urgent','urgente'].includes(lo)) return false
      if (prioFilter === 'moyenne' && !['moyenne','medium'].includes(lo))                return false
      if (prioFilter === 'basse'   && !['basse','low'].includes(lo))                    return false
    }
    if (agentFilter !== 'all') {
      if (agentFilter === 'unassigned' && d.agent_id) return false
      if (agentFilter !== 'unassigned' && d.agent_id !== agentFilter) return false
    }
    return true
  }).sort((a, b) => {
    let av: any = a[sort.col as keyof Decl] ?? ''; let bv: any = b[sort.col as keyof Decl] ?? ''
    if (typeof av === 'string') av = av.toLowerCase(); if (typeof bv === 'string') bv = bv.toLowerCase()
    return sort.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  const totalPages = Math.ceil(filtered.length / rowsPerPage)
  const paginated  = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)
  const anyActive  = prioFilter !== 'all' || agentFilter !== 'all' || search !== ''
  const toggleSort = (col: string) => setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  const agentName  = (d: Decl) => { if (d.citizen) return null; const a = agents.find(ag => ag.id === d.agent_id); return a ? `${a.first_name} ${a.last_name}` : null }
  const ini        = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const agentColor = (id: string) => AGENT_COLORS[agents.findIndex(a => a.id === id) % AGENT_COLORS.length] || '#6366f1'

  return (
    <ChefLayout title="Toutes les déclarations">
      <div className="flex flex-col h-full min-h-0 bg-white dark:bg-slate-950">

        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">Toutes les Déclarations</h1>
              <p className="text-sm text-slate-400 mt-0.5">Déclarations assignées à votre département.</p>
            </div>
            <button onClick={() => navigate('/chef/tasks')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 rounded-2xl text-sm font-black transition-all shadow-sm">
              <Plus size={15} /> Mes Tâches
            </button>
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {([
              { key: 'en_attente', label: 'En attente',   color: '#7c3aed' },
              { key: 'en_cours',   label: 'En cours',     color: '#1d4ed8' },
              { key: 'evaluee',    label: 'Évaluées',     color: '#15803d' },
              { key: 'cloturee',   label: 'Clôturées',    color: '#475569' },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border-2 transition-all ${statusFilter === tab.key ? 'font-black shadow-sm' : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 bg-transparent'}`}
                style={statusFilter === tab.key ? { borderColor: `${tab.color}30`, color: tab.color, background: `${tab.color}10` } : {}}>
                <span className="text-xs font-bold">{tab.label}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusFilter === tab.key ? 'bg-white/90 dark:bg-black/30 text-current' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex-shrink-0 px-6 py-3 flex items-center gap-2 flex-wrap border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Filtrer…"
              className="pl-8 pr-4 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full outline-none focus:border-slate-400 w-48 text-slate-700 dark:text-slate-300 placeholder-slate-400" />
          </div>

          {/* Priorité filter pills */}
          {['all','haute','moyenne','basse'].map(p => (
            <button key={p} onClick={() => { setPrioFilter(p); setPage(1) }}
              className={`px-3 py-1.5 rounded-full border text-[10px] font-black transition-all ${prioFilter === p ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'}`}>
              {p === 'all' ? 'Toutes priorités' : p === 'haute' ? '⬆ Urgent' : p === 'moyenne' ? '→ Normal' : '⬇ Faible'}
            </button>
          ))}

          {/* Agent filter */}
          <select value={agentFilter} onChange={e => { setAgentFilter(e.target.value); setPage(1) }}
            className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 outline-none text-slate-700 dark:text-slate-300">
            <option value="all">Tous les agents</option>
            <option value="unassigned">Non assigné</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
          </select>

          {anyActive && (
            <button onClick={() => { setPrioFilter('all'); setAgentFilter('all'); setSearch(''); setPage(1) }}
              className="flex items-center gap-1.5 pl-3 pr-3 py-1.5 rounded-full border border-slate-200 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 hover:border-slate-300">
              Reset <X size={11} />
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button onClick={load} className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 transition-all">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleExport} className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 transition-all">
              <Download size={13} />
            </button>
            <div className="relative">
              <button onClick={() => setColsOpen(!colsOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-400 hover:border-slate-300">
                Colonnes <ChevronDown size={11} />
              </button>
              {colsOpen && (
                <div className="absolute top-full mt-1.5 right-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-40 w-44 py-2">
                  {Object.entries({ ref: 'Référence', assignee: 'Agent assigné', dueDate: 'Date', status: 'Statut', priority: 'Priorité' }).map(([k, v]) => (
                    <label key={k} className="flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input type="checkbox" checked={visibleCols[k as keyof typeof visibleCols]} onChange={e => setVisibleCols(p => ({ ...p, [k]: e.target.checked }))} className="w-3.5 h-3.5 accent-blue-600 rounded" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{v}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox"
                    checked={selected.length === paginated.length && paginated.length > 0}
                    onChange={e => setSelected(e.target.checked ? paginated.map(d => d.id) : [])}
                    className="w-3.5 h-3.5 accent-blue-600 rounded" />
                </th>
                <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('title')}>
                  <div className="flex items-center gap-1">Déclaration <SortIcon col="title" sort={sort} /></div>
                </th>
                {visibleCols.ref      && <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('ref_citoyen')}><div className="flex items-center gap-1">Réf. <SortIcon col="ref_citoyen" sort={sort} /></div></th>}
                {visibleCols.assignee && <th className="px-4 py-3 text-left">Agent assigné</th>}
                {visibleCols.dueDate  && <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('created_at')}><div className="flex items-center gap-1">Date <SortIcon col="created_at" sort={sort} /></div></th>}
                {visibleCols.status   && <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('status')}><div className="flex items-center gap-1">Statut <SortIcon col="status" sort={sort} /></div></th>}
                {visibleCols.priority && <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('priority')}><div className="flex items-center gap-1">Priorité <SortIcon col="priority" sort={sort} /></div></th>}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="bg-white dark:bg-slate-950">
                    <td className="px-4 py-3.5"><Sk w="w-4" h="h-4" /></td>
                    <td className="px-4 py-3.5"><div className="space-y-1.5"><Sk h="h-4" w="w-48" /><Sk h="h-3" w="w-32" /></div></td>
                    {visibleCols.ref      && <td className="px-4 py-3.5"><Sk h="h-4" w="w-24" /></td>}
                    {visibleCols.assignee && <td className="px-4 py-3.5"><Sk h="h-6" w="w-20" r="rounded-full" /></td>}
                    {visibleCols.dueDate  && <td className="px-4 py-3.5"><Sk h="h-4" w="w-28" /></td>}
                    {visibleCols.status   && <td className="px-4 py-3.5"><Sk h="h-6" w="w-24" r="rounded-full" /></td>}
                    {visibleCols.priority && <td className="px-4 py-3.5"><Sk h="h-6" w="w-20" r="rounded-full" /></td>}
                    <td className="px-4 py-3.5"><Sk w="w-6" h="h-6" r="rounded-xl" /></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Search size={20} className="text-slate-300 dark:text-slate-600" /></div>
                    <p className="text-sm font-bold text-slate-400">Aucun résultat.</p>
                  </div>
                </td></tr>
              ) : paginated.map(d => {
                const sc   = STATUS_CFG[d.status] || { label: d.status, color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' }
                const pri  = getPriorityLabel(d.priority)
                const an   = agentName(d) || (d.citizen ? `${d.citizen.first_name} ${d.citizen.last_name}` : null)
                const sel  = selected.includes(d.id)
                return (
                  <tr key={d.id}
                    className={`group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer ${sel ? 'bg-blue-50/40 dark:bg-blue-500/5' : 'bg-white dark:bg-slate-950'}`}
                    onClick={() => navigate(`/chef/declarations/${d.id}`)}>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={sel} onChange={() => setSelected(p => p.includes(d.id) ? p.filter(x => x !== d.id) : [...p, d.id])} className="w-3.5 h-3.5 accent-blue-600 rounded" />
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm flex-shrink-0">
                          {(d.photo_avant || d.photo_url)
                            ? <img src={d.photo_avant || d.photo_url!} alt="" className="w-full h-full object-cover" />
                            : getCatEmoji(d.category)
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 transition-colors">{d.title}</p>
                          {d.category && <p className="text-[10px] text-slate-400 truncate">{d.category}</p>}
                        </div>
                      </div>
                    </td>
                    {visibleCols.ref && <td className="px-4 py-3.5"><span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">{d.ref_citoyen || '—'}</span></td>}
                    {visibleCols.assignee && (
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        {d.agent_id ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                              style={{ background: agentColor(d.agent_id) }}>
                              {an ? ini(an) : '?'}
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-28">{an}</span>
                          </div>
                        ) : d.status === 'assignee_chef' ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={e => { e.stopPropagation(); setAcceptTarget(d) }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black border border-emerald-100 hover:bg-emerald-100 transition-all">
                              <UserCheck size={10} /> Assigner
                            </button>
                            <button onClick={e => { e.stopPropagation(); setRefuseTarget(d) }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 text-[9px] font-black border border-red-100 hover:bg-red-100 transition-all">
                              <XCircle size={10} /> Refuser
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Non assigné</span>
                        )}
                      </td>
                    )}
                    {visibleCols.dueDate  && <td className="px-4 py-3.5"><span className="text-xs text-slate-600 dark:text-slate-400">{fmtDate(d.created_at)}</span></td>}
                    {visibleCols.status   && (
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full" style={{ color: sc.color, background: sc.bg }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />{sc.label}
                        </span>
                      </td>
                    )}
                    {visibleCols.priority && (
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full"
                          style={{ color: pri.color, background: pri.bg }}>
                          {pri.label}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/chef/declarations/${d.id}`)}
                        className="w-7 h-7 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
          <p className="text-xs text-slate-500 font-medium">
            {Math.min((page - 1) * rowsPerPage + 1, filtered.length)}–{Math.min(page * rowsPerPage, filtered.length)} sur {filtered.length}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Par page</span>
              <select value={rowsPerPage} onChange={e => { setRowsPerPage(+e.target.value); setPage(1) }}
                className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 outline-none text-slate-700 dark:text-slate-300">
                {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <span className="text-xs text-slate-500">Page {page} / {totalPages || 1}</span>
            <div className="flex items-center gap-1">
              {[
                { label: '«', onClick: () => setPage(1),                                disabled: page === 1 },
                { label: '‹', onClick: () => setPage(p => Math.max(1, p - 1)),          disabled: page === 1 },
                { label: '›', onClick: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page >= totalPages },
                { label: '»', onClick: () => setPage(totalPages),                       disabled: page >= totalPages },
              ].map((btn, i) => (
                <button key={i} onClick={btn.onClick} disabled={btn.disabled}
                  className="w-7 h-7 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all text-xs font-bold">
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {routeId && (
        <DetailDrawer
          declId={routeId}
          agents={agents}
          onClose={() => navigate('/chef/declarations')}
          onRefreshed={() => { load(); navigate('/chef/declarations') }}
        />
      )}

      {acceptTarget && <AcceptModal decl={acceptTarget} agents={agents} onClose={() => setAcceptTarget(null)} onDone={load} />}
      {refuseTarget && <RefuseModal decl={refuseTarget} onClose={() => setRefuseTarget(null)} onDone={load} />}
    </ChefLayout>
  )
}

export default ChefDeclarations