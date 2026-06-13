// src/pages/Chef/ChefNotifications.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ChefLayout from '../../layouts/ChefLayout'
import {
  Bell, CheckCheck, Trash2, Search, Filter,
  FileText, UserPlus, MessageSquare, CheckCircle2,
  AlertCircle, Calendar, ChevronDown, Clock,
  Eye, Inbox, Settings, Loader2, X, ChevronRight,
  Building2, MapPin, User, Image as ImageIcon, Check, Tag as TagIcon, Lock,
  Camera, Shield, Activity, XCircle, UserCheck, Send, Brain, ThumbsUp, Mail, Phone, Hash, AlertTriangle, Zap,
  ArrowDown, Info
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const API   = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok   = () => localStorage.getItem('fmc_token') || ''
const hdr   = () => ({ Authorization: `Bearer ${tok()}` })
const hjson = () => ({ ...hdr(), 'Content-Type': 'application/json' })

// ─── Types ────────────────────────────────────────────────────────────────────
interface Notif {
  id: string
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
  reference_id: string | null
}

interface Decl {
  id: string; ref_citoyen: string; ref_service: string | null
  title: string; description: string; category: string
  status: string; priority: string; priority_score: number
  votes_count: number; created_at: string; assigned_at: string | null
  resolved_at: string | null; address: string | null
  agent_id: string | null; photo_avant: string | null; photo_url?: string | null
  citizen?: { first_name: string; last_name: string; email?: string; phone?: string } | null
  ai_reasoning?: string | null; used_ai_vision?: boolean
  is_sensitive?: boolean; sensitive_type?: string | null
  assigned_agent?: { first_name: string; last_name: string } | null
  latitude?: number | string
  longitude?: number | string
}

interface Agent {
  id: string; first_name: string; last_name: string
  is_active: boolean; workload: number; resolved_count: number; is_overloaded: boolean
}

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; dotColor: string }> = {
  NEW_DECLARATION:      { label: 'Nouvelle déclaration',       icon: <FileText    className="w-5 h-5"/>, color: '#16a34a', bg: '#f0fdf4', dotColor: '#16a34a' },
  STATUS_CHANGE:        { label: 'Changement de statut',       icon: <CheckCircle2 className="w-5 h-5"/>, color: '#16a34a', bg: '#f0fdf4', dotColor: '#16a34a' },
  DECLARATION_REJECTED: { label: 'Déclaration refusée',        icon: <AlertCircle  className="w-5 h-5"/>, color: '#ef4444', bg: '#fef2f2', dotColor: '#ef4444' },
  ASSIGNED_CHEF:        { label: 'Assignation Chef',           icon: <UserPlus     className="w-5 h-5"/>, color: '#f97316', bg: '#fff7ed', dotColor: '#f97316' },
  ASSIGNED_AGENT:       { label: 'Mission assignée à un agent',icon: <UserPlus     className="w-5 h-5"/>, color: '#f97316', bg: '#fff7ed', dotColor: '#f97316' },
  INTERNAL_COMMENT:     { label: 'Nouveau commentaire',        icon: <MessageSquare className="w-5 h-5"/>, color: '#3b82f6', bg: '#eff6ff', dotColor: '#3b82f6' },
  DECLARATION_ACCEPTED: { label: 'Mission acceptée',           icon: <CheckCircle2 className="w-5 h-5"/>, color: '#16a34a', bg: '#f0fdf4', dotColor: '#16a34a' },
  DECLARATION_RESOLVED: { label: 'Mission résolue',            icon: <CheckCircle2 className="w-5 h-5"/>, color: '#16a34a', bg: '#f0fdf4', dotColor: '#16a34a' },
  SYSTEM:               { label: 'Système',                    icon: <Settings     className="w-5 h-5"/>, color: '#64748b', bg: '#f8fafc', dotColor: '#94a3b8' },
}
const getTypeCfg = (type: string) => TYPE_CFG[type] ?? TYPE_CFG['SYSTEM']

// ─── Category groups for sidebar ─────────────────────────────────────────────
const CATEGORIES: { key: string; label: string; icon: React.ReactNode; types: string[] }[] = [
  { key: 'missions',     label: 'Missions',     icon: <FileText className="w-4 h-4"/>,     types: ['ASSIGNED_CHEF', 'DECLARATION_ACCEPTED', 'DECLARATION_RESOLVED', 'DECLARATION_REJECTED', 'NEW_DECLARATION'] },
  { key: 'comments',     label: 'Commentaires', icon: <MessageSquare className="w-4 h-4"/>, types: ['INTERNAL_COMMENT'] },
  { key: 'status',       label: 'Statut',       icon: <CheckCircle2 className="w-4 h-4"/>,  types: ['STATUS_CHANGE'] },
  { key: 'system',       label: 'Système',      icon: <Settings className="w-4 h-4"/>,     types: ['SYSTEM'] },
]

// ─── Date range presets ───────────────────────────────────────────────────────
const isToday    = (d: string) => new Date(d).toDateString() === new Date().toDateString()
const isThisWeek = (d: string) => { const n = new Date(); const s = new Date(n.getFullYear(), n.getMonth(), n.getDate() - n.getDay()); return new Date(d) >= s }
const isThisMonth= (d: string) => { const n = new Date(); return new Date(d).getMonth() === n.getMonth() && new Date(d).getFullYear() === n.getFullYear() }
const isLast30   = (d: string) => Date.now() - new Date(d).getTime() < 30 * 86400000

// ─── Helpers ─────────────────────────────────────────────────────────────────
const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1)  return "À l'instant"
  if (m < 60) return `Il y a ${m} min`
  if (h < 24) return `Il y a ${h}h`
  if (d === 1) return `Hier à ${new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const Sk = ({ w = 'w-full', h = 'h-4', r = 'rounded-xl' }: { w?: string; h?: string; r?: string }) => (
  <div className={`${w} ${h} ${r} bg-slate-100 dark:bg-slate-800 animate-pulse`} />
)

const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
const fmtFull = (d: string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const fmtTime = (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

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

const PriPill = ({ priority, score }: { priority: string; score?: number }) => {
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

const STEPS = ['soumise', 'assignee_chef', 'assignee_agent', 'resolue', 'cloturee']
const STEP_LABELS: Record<string, string> = {
  soumise: 'Soumise', assignee_chef: 'Assignée Chef', assignee_agent: 'Assignée Agent', resolue: 'Résolue', cloturee: 'Clôturée'
}

const AGENT_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ec4899','#8b5cf6','#ef4444','#14b8a6']

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

// ─── Detail drawer (right slide-in) ──────────────────────────────────────────
const DetailDrawer = ({
  notif,
  onClose,
  onDelete,
  onMarkRead,
  onRefreshed
}: {
  notif: Notif
  onClose: () => void
  onDelete: (id: string) => void
  onMarkRead: (id: string) => void
  onRefreshed: () => void
}) => {
  const [decl,    setDecl]    = useState<Decl | null>(null)
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
  const [agents, setAgents] = useState<Agent[]>([])
  const endRef = useRef<HTMLDivElement>(null)
  const me = JSON.parse(localStorage.getItem('fmc_user') || '{}')
  const cfg = getTypeCfg(notif.type)

  const fetchDetail = useCallback(() => {
    if (!notif.reference_id) return
    setLoading(true)
    fetch(`${API}/chef/declarations/${notif.reference_id}`, { headers: hdr() })
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(d => {
        setDecl(d.declaration || d)
        setPhotos(d.photos ?? [])
        setHistory(d.history ?? [])
        setComments(d.comments ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [notif.reference_id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  // Load agents list for the accept/assignment modal
  useEffect(() => {
    fetch(`${API}/chef/agents`, { headers: hdr() })
      .then(r => r.ok ? r.json() : [])
      .then(setAgents)
      .catch(() => [])
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments.length, channel])

  const sendMsg = async () => {
    if (!msg.trim()) return
    setSending(true)
    try {
      const res = await fetch(`${API}/chef/declarations/${notif.reference_id}/comments`, {
        method: 'POST',
        headers: hjson(),
        body: JSON.stringify({ content: msg.trim(), channel })
      })
      if (res.ok) {
        const newComment = await res.json()
        setComments(prev => [...prev, newComment])
        setMsg('')
      }
    } catch {}
    finally { setSending(false) }
  }

  const isIncoming = decl?.status === 'assignee_chef'
  const isCloturee = decl?.status === 'cloturee'

  const photoAvant  = photos.find(p => p.photo_type === 'photo_avant' || !p.photo_type) || (decl?.photo_avant ? { id: 'inline', url: decl.photo_avant, photo_type: 'photo_avant' } : null) || (decl?.photo_url ? { id: 'inline2', url: decl.photo_url, photo_type: 'photo_avant' } : null)
  const photosApres = photos.filter(p => p.photo_type === 'photo_apres')
  const allPhotos   = photos.length > 0 ? photos : [photoAvant].filter(Boolean)



  const filteredComments = comments.filter(c => !c.channel || c.channel === channel)
  const effectiveStatus = decl?.status === 'en_cours' ? 'assignee_agent' : (decl?.status || 'soumise')
  const stepIdx = STEPS.indexOf(effectiveStatus)

  const TABS = [
    { key: 'info',     label: 'Infos',      icon: Info        },
    { key: 'photos',   label: 'Médias',     icon: Camera      },
    { key: 'history',  label: 'Progression', icon: Activity   },
    { key: 'messages', label: 'Messages',   icon: MessageSquare, badge: comments.length },
  ]

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-[680px] bg-white dark:bg-slate-950 shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800"
        style={{ animation: 'slideRight .3s ease-out' }}>
        <style>{`@keyframes slideRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

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
            <button onClick={() => onDelete(notif.id)}
              className="w-9 h-9 rounded-2xl bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-all" title="Supprimer">
              <Trash2 className="w-4 h-4" />
            </button>
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
                        <div className={`h-1.5 w-full rounded-full transition-all ${done ? 'bg-[#1557FF]' : current ? 'bg-blue-300 dark:bg-blue-700 animate-pulse' : 'bg-slate-100 dark:bg-slate-800'}`} />
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
                          {decl.assigned_at && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">Assigné le {fmtDate(decl.assigned_at)}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══ PHOTOS TAB ══ */}
          {tab === 'photos' && (
            <div className="absolute inset-0 overflow-y-auto p-6 space-y-6">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[.18em] mb-3">Photo avant travaux</p>
                {photoAvant ? (
                  <div className="aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 relative">
                    <img src={photoAvant.url} alt="Avant" className="w-full h-full object-cover cursor-zoom-in"
                      onClick={() => window.open(photoAvant.url, '_blank')} />
                    <div className="absolute bottom-2 left-2 bg-[#1557FF] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                      Initial
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-2 text-slate-400 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <ImageIcon size={24} className="text-slate-300 dark:text-slate-650" />
                    <p className="text-xs font-bold">Aucun visuel fourni initialement.</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[.18em] mb-3">Photos de résolution (après intervention)</p>
                {photosApres.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {photosApres.map((p, i) => (
                      <div key={p.id || i} className="aspect-video rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 relative">
                        <img src={p.url} alt={`Après ${i + 1}`} className="w-full h-full object-cover cursor-zoom-in"
                          onClick={() => window.open(p.url, '_blank')} />
                        <div className="absolute bottom-2 left-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                          ✓ Après {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-2 text-slate-400 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
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
                  <Clock size={24} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-400">Aucun historique</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-slate-100 dark:bg-slate-800" />
                  {[...history].filter((h: any) => h.old_status !== h.new_status).reverse().map((h: any, i: number) => {
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
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 font-bold">Aucun message dans ce canal</p>
                    <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold">Commencez la conversation</p>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
const ChefNotifications: React.FC = () => {
  const [notifs,   setNotifs]   = useState<Notif[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'all' | 'unread' | 'read'>('all')
  const [search,   setSearch]   = useState('')
  const [catFilter,setCatFilter]= useState<string>('')         // category key
  const [datePreset,setDatePreset]=useState<string>('')        // today/week/month/30d
  const [sortMode, setSortMode] = useState<'recent' | 'oldest'>('recent')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [drawer,   setDrawer]   = useState<Notif | null>(null)
  const [page,     setPage]     = useState(1)
  const [total,    setTotal]    = useState(0)
  const LIMIT = 20

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (p = 1) => {
    if (p === 1) setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), page: String(p) })
      if (filter === 'unread') params.set('unreadOnly', 'true')
      const res  = await fetch(`${API}/notifications?${params}`, { headers: hdr() })
      const data = await res.json()
      const fresh: Notif[] = data.notifications || []
      setTotal(data.total || 0)
      setNotifs(prev => p === 1 ? fresh : [...prev, ...fresh])
    } catch {}
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { setPage(1); load(1) }, [load])

  // Real-time: listen to socket event injected by layout
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const n = e.detail as Notif
      setNotifs(prev => [{ ...n, is_read: false }, ...prev])
      setTotal(t => t + 1)
    }
    window.addEventListener('fmc:notification', handler as EventListener)
    return () => window.removeEventListener('fmc:notification', handler as EventListener)
  }, [])

  // ── Actions ───────────────────────────────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    await fetch(`${API}/notifications/${id}/read`, { method: 'PUT', headers: hdr() }).catch(() => {})
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    await fetch(`${API}/notifications/read-all`, { method: 'PUT', headers: hdr() }).catch(() => {})
  }, [])

  const deleteOne = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setNotifs(prev => prev.filter(n => n.id !== id))
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
    if (drawer?.id === id) setDrawer(null)
    await fetch(`${API}/notifications/${id}`, { method: 'DELETE', headers: hdr() }).catch(() => {})
  }, [drawer])

  const deleteSelected = useCallback(async () => {
    const ids = Array.from(selected)
    setNotifs(prev => prev.filter(n => !selected.has(n.id)))
    setSelected(new Set())
    await fetch(`${API}/notifications/bulk`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...hdr() },
      body: JSON.stringify({ ids }),
    }).catch(() => {})
  }, [selected])

  const openDrawer = useCallback((n: Notif) => {
    setDrawer(n)
    if (!n.is_read) markRead(n.id)
  }, [markRead])

  // ── Derived ───────────────────────────────────────────────────────────────
  const unreadCount = notifs.filter(n => !n.is_read).length

  // Category counts
  const catCounts: Record<string, number> = {}
  CATEGORIES.forEach(c => {
    catCounts[c.key] = notifs.filter(n => c.types.includes(n.type)).length
  })

  // Filter pipeline
  const filtered = notifs.filter(n => {
    if (filter === 'unread' && n.is_read)  return false
    if (filter === 'read'   && !n.is_read) return false
    if (catFilter) {
      const cat = CATEGORIES.find(c => c.key === catFilter)
      if (cat && !cat.types.includes(n.type)) return false
    }
    if (datePreset === 'today' && !isToday(n.created_at))        return false
    if (datePreset === 'week'  && !isThisWeek(n.created_at))     return false
    if (datePreset === 'month' && !isThisMonth(n.created_at))    return false
    if (datePreset === '30d'   && !isLast30(n.created_at))       return false
    if (search) {
      const q = search.toLowerCase()
      if (!n.title?.toLowerCase().includes(q) && !n.body?.toLowerCase().includes(q)) return false
    }
    return true
  }).sort((a, b) => {
    const ta = new Date(a.created_at).getTime()
    const tb = new Date(b.created_at).getTime()
    return sortMode === 'recent' ? tb - ta : ta - tb
  })

  // Group by date
  const grouped = filtered.reduce<Record<string, Notif[]>>((acc, n) => {
    const d = new Date(n.created_at)
    let key: string
    if (isToday(n.created_at)) key = "Aujourd'hui"
    else if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) key = 'Hier'
    else key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    ;(acc[key] = acc[key] || []).push(n)
    return acc
  }, {})

  return (
    <ChefLayout title="Notifications">
      <div className="flex flex-col lg:flex-row gap-5 max-w-7xl mx-auto min-h-[calc(100vh-5rem)] p-4 lg:p-8">

        {/* ── LEFT: Main panel ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Toolbar row 1: search + category filter + date range */}
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une notification..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 outline-none focus:border-emerald-350 focus:ring-2 focus:ring-emerald-50 dark:focus:ring-emerald-900/20 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category dropdown */}
            <div className="relative">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 outline-none focus:border-emerald-350 cursor-pointer">
                <option value="">Toutes les catégories</option>
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Date range */}
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select value={datePreset} onChange={e => setDatePreset(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 outline-none focus:border-emerald-350 cursor-pointer">
                <option value="">Toute période</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="30d">30 derniers jours</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Bulk Actions */}
            {selected.size > 0 ? (
              <button onClick={deleteSelected}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100 transition-colors">
                <Trash2 className="w-4 h-4" /> Supprimer ({selected.size})
              </button>
            ) : (
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <Filter className="w-4 h-4" /> Filtres
              </button>
            )}
          </div>

          {/* Toolbar row 2: tabs + sort */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
              {([
                ['all',    'Toutes'],
                ['unread', 'Non lues'],
                ['read',   'Lues'],
              ] as const).map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    filter === k ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}>
                  {k === 'unread' && filter !== 'unread' && unreadCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  )}
                  {l}
                  {k === 'unread' && unreadCount > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${filter === 'unread' ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Trier par :</span>
              <div className="relative">
                <select value={sortMode} onChange={e => setSortMode(e.target.value as any)}
                  className="appearance-none pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 outline-none cursor-pointer focus:border-emerald-350">
                  <option value="recent">Plus récentes</option>
                  <option value="oldest">Plus anciennes</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                  <CheckCheck className="w-3.5 h-3.5" /> Tout marquer lu
                </button>
              )}
            </div>
          </div>

          {/* List panel */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex-1">
            {loading && notifs.length === 0 ? (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-4">
                    <Sk w="w-10" h="h-10" />
                    <div className="flex-1 space-y-2 pt-1">
                      <Sk w="w-2/3" h="h-3" />
                      <Sk w="w-1/2" h="h-2.5" />
                    </div>
                    <Sk w="w-20" h="h-2.5" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                  <Inbox className="w-7 h-7 text-slate-200 dark:text-slate-700" />
                </div>
                <p className="font-black text-slate-700 dark:text-slate-300">Aucune notification</p>
                <p className="text-sm text-slate-400">Modifiez les filtres ou revenez plus tard.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([dateLabel, items]) => (
                <div key={dateLabel}>
                  <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800 border-y border-slate-100 dark:border-slate-800 first:border-t-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dateLabel}</span>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {items.map(n => {
                      const cfg = getTypeCfg(n.type)
                      const isSelected = selected.has(n.id)

                      return (
                        <div key={n.id}
                          onClick={() => openDrawer(n)}
                          className={`group flex items-start gap-4 px-5 py-4 cursor-pointer transition-all relative ${
                            isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : !n.is_read ? 'bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50/70 dark:hover:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}>

                          {!n.is_read && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
                          )}

                          {/* Checkbox */}
                          <div onClick={e => { e.stopPropagation(); setSelected(prev => { const s = new Set(prev); s.has(n.id) ? s.delete(n.id) : s.add(n.id); return s }) }}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 cursor-pointer transition-colors ${
                              isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-200 dark:border-slate-700 group-hover:border-slate-400 dark:group-hover:border-slate-500'
                            }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>

                          {/* Type icon */}
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${!n.is_read ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-650 dark:text-slate-400'}`}>
                              {n.title}
                            </p>
                            {n.body && (
                              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2 font-medium">
                                {n.body}
                              </p>
                            )}
                            {n.reference_id && (
                              <button className="mt-2 flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors opacity-0 group-hover:opacity-100">
                                <Eye className="w-3 h-3" /> Voir la mission
                              </button>
                            )}
                          </div>

                          {/* Timestamp + actions */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="text-[10px] font-medium whitespace-nowrap">{timeAgo(n.created_at)}</span>
                              {!n.is_read && (
                                <div className="w-2 h-2 rounded-full" style={{ background: cfg.dotColor }} />
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!n.is_read && (
                                <button onClick={e => { e.stopPropagation(); markRead(n.id) }} title="Marquer lu"
                                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={e => deleteOne(n.id, e)} title="Supprimer"
                                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Load more */}
            {!loading && notifs.length < total && (
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                <button onClick={() => { const next = page + 1; setPage(next); load(next) }}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
                  Charger plus de notifications <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Sidebar ───────────────────────────────────────── */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-4">

          {/* Résumé */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">Résumé</span>
            </div>
            {[
              { label: 'Total notifications', value: total,        color: 'text-emerald-600' },
              { label: 'Non lues',            value: unreadCount,  color: 'text-red-500'   },
              { label: 'Lues',                value: total - unreadCount, color: 'text-slate-500' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{r.label}</span>
                <span className={`text-sm font-black ${r.color}`}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Categories */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">Catégories</span>
            </div>
            {CATEGORIES.map(c => (
              <button key={c.key}
                onClick={() => setCatFilter(prev => prev === c.key ? '' : c.key)}
                className={`w-full flex items-center justify-between py-2.5 px-2 -mx-2 rounded-xl transition-colors border border-transparent ${
                  catFilter === c.key ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${catFilter === c.key ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                    {c.icon}
                  </div>
                  <span className={`text-sm font-medium ${catFilter === c.key ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {c.label}
                  </span>
                </div>
                <span className={`text-xs font-black ${catFilter === c.key ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {catCounts[c.key] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Quick date filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">Filtres rapides</span>
            </div>
            {[
              { key: 'today', label: "Aujourd'hui" },
              { key: 'week',  label: 'Cette semaine' },
              { key: 'month', label: 'Ce mois' },
              { key: '30d',   label: '30 derniers jours' },
            ].map(d => (
              <button key={d.key}
                onClick={() => setDatePreset(prev => prev === d.key ? '' : d.key)}
                className={`w-full flex items-center gap-2.5 py-2.5 px-2 -mx-2 rounded-xl text-sm font-medium transition-colors border ${
                  datePreset === d.key
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold border-emerald-100 dark:border-emerald-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                }`}>
                <Calendar className={`w-4 h-4 ${datePreset === d.key ? 'text-emerald-600' : 'text-slate-400'}`} />
                {d.label}
              </button>
            ))}
            {datePreset && (
              <button onClick={() => setDatePreset('')}
                className="w-full mt-2 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-655 hover:bg-slate-50 transition-colors">
                Effacer le filtre
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {drawer && (
        <DetailDrawer
          notif={drawer}
          onClose={() => setDrawer(null)}
          onDelete={deleteOne}
          onMarkRead={markRead}
          onRefreshed={() => {
            setDrawer(null)
            load(1)
          }}
        />
      )}
    </ChefLayout>
  )
}

export default ChefNotifications
