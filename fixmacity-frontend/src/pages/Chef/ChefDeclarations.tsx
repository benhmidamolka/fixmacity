// src/pages/Chef/ChefDeclarations.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, RefreshCw, Eye, X, CheckCircle2, XCircle,
  Loader, Send, AlertTriangle, MapPin, Calendar, User,
  FileText, History, MessageSquare, ChevronLeft,
  ChevronRight, SlidersHorizontal, UserCheck, Clock,
  Building2, ThumbsUp, Camera, Hash, Download,
  ChevronDown, Filter, Zap, Activity, ArrowDown, Users
} from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import ChefLayout from '../../layouts/ChefLayout'

const API   = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok   = () => localStorage.getItem('fmc_token') || ''
const hdr   = () => ({ Authorization: `Bearer ${tok()}` })
const jsonH = () => ({ 'Content-Type': 'application/json', ...hdr() })
const ROWS  = 15

// ── Types ─────────────────────────────────────────────────────────────────────

interface Decl {
  id: string
  ref_citoyen: string
  ref_service: string | null
  title: string
  description: string
  category: string
  status: string
  priority: string
  votes_count: number
  created_at: string
  agent_id: string | null
  photo_avant: string | null
  image_url: string | null
  citizen?: { id: string; first_name: string; last_name: string; email?: string; phone?: string } | null
  assigned_agent?: { id: string; first_name: string; last_name: string } | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  shared_departments?: any[]
}

interface Agent {
  id: string
  first_name: string
  last_name: string
  is_active: boolean
  workload: number
  is_overloaded: boolean
}

interface DetailFull extends Decl {
  photos: any[]
  history: any[]
  comments: any[]
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  soumise:        { label: 'Soumise',       color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  assignee_chef:  { label: 'À traiter',     color: '#7C3AED', bg: '#EDE9FE', dot: '#8B5CF6' },
  assignee_agent: { label: 'Assignée',      color: '#1D4ED8', bg: '#DBEAFE', dot: '#3B82F6' },
  en_cours:       { label: 'En cours',      color: '#C2410C', bg: '#FFEDD5', dot: '#F97316' },
  resolue:        { label: 'Résolue',       color: '#15803D', bg: '#DCFCE7', dot: '#22C55E' },
  cloturee:       { label: 'Clôturée',      color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
  refusee_chef:   { label: 'Refusée',       color: '#DC2626', bg: '#FEE2E2', dot: '#EF4444' },
  refusee_agent:  { label: 'Renvoyée',      color: '#B91C1C', bg: '#FEE2E2', dot: '#EF4444' },
}

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  haute:   { label: 'Urgent', color: '#DC2626', bg: '#FEF2F2' },
  urgente: { label: 'Urgent', color: '#DC2626', bg: '#FEF2F2' },
  high:    { label: 'Urgent', color: '#DC2626', bg: '#FEF2F2' },
  moyenne: { label: 'Normal', color: '#D97706', bg: '#FFFBEB' },
  medium:  { label: 'Normal', color: '#D97706', bg: '#FFFBEB' },
  basse:   { label: 'Faible', color: '#059669', bg: '#F0FDF4' },
  low:     { label: 'Faible', color: '#059669', bg: '#F0FDF4' },
}

const AGENT_COLORS = ['#1557FF','#10B981','#F59E0B','#8B5CF6','#EC4899','#0891B2','#EF4444','#14B8A6']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtFull(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function getCatEmoji(c?: string) {
  const m: Record<string,string> = { 'Voirie':'🛣️','Éclairage Public':'💡','Propreté':'🗑️','Espaces Verts':'🌿','Réseaux':'💧','Signalisation':'🚦','Administratif':'🏢','Suggestions':'💬' }
  return c ? (m[c] || '📌') : '📌'
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function FilterDropdown({ label, icon: Icon, value, options, onChange, multi = false }: any) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  let activeLabel = label
  const isAll = multi ? value.length === 0 : value === 'all'
  
  if (!isAll) {
    if (multi) {
      if (value.length === 1) activeLabel = options.find((o:any) => o.value === value[0])?.label || label
      else activeLabel = `${value.length} sélectionnés`
    } else {
      activeLabel = options.find((o:any) => o.value === value)?.label || label
    }
  }

  const toggle = (val: string) => {
    if (!multi) {
      onChange(val)
      setOpen(false)
      return
    }
    if (val === 'all') {
      onChange([])
      setOpen(false)
      return
    }
    if (value.includes(val)) {
      onChange(value.filter((v: string) => v !== val))
    } else {
      onChange([...value, val])
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-full border transition-all text-[11px] font-bold ${!isAll ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {activeLabel}
        <ChevronDown className="w-3 h-3 ml-1 text-slate-400" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-[12rem] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-20 py-1 max-h-64 overflow-y-auto">
          {multi && (
            <button onClick={() => { onChange([]); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between">
              <span className="flex items-center gap-2.5">Toutes les options</span>
              {value.length === 0 && <CheckCircle2 className="w-3.5 h-3.5 text-[#1557FF]" />}
            </button>
          )}
          {options.map((o:any) => {
            if (multi && o.value === 'all') return null
            const isSelected = multi ? value.includes(o.value) : value === o.value
            return (
              <button key={o.value} onClick={(e) => { e.preventDefault(); toggle(o.value) }}
                className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between">
                <span className="flex items-center gap-2.5">
                  {o.icon && <o.icon className="w-3.5 h-3.5" style={{ color: o.color }} />}
                  {o.dot && <span className="w-2 h-2 rounded-full" style={{ background: o.dot }} />}
                  {o.label}
                </span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#1557FF]" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const Sk = ({ w='w-full', h='h-4', r='rounded-lg' }: { w?:string; h?:string; r?:string }) => (
  <div className={`${w} ${h} ${r} bg-slate-100 dark:bg-slate-800 animate-pulse`} />
)

function StatusPill({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, color: '#64748B', bg: '#F1F5F9', dot: '#94A3B8' }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{ color: c.color, background: c.bg }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

function PriorityPill({ priority }: { priority: string }) {
  const c = PRIORITY_CFG[priority?.toLowerCase()] || PRIORITY_CFG.moyenne
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{ color: c.color, background: c.bg }}>
      {c.label}
    </span>
  )
}

// ── Assign Agent Modal ────────────────────────────────────────────────────────

function AssignModal({ decl, agents, onClose, onDone }: {
  decl: Decl; agents: Agent[]; onClose: () => void; onDone: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [loading,  setLoading]  = useState(false)
  
  // Find all selected agents to check if any are overloaded
  const selectedAgents = agents.filter(a => selected.includes(a.id))
  const overloaded = selectedAgents.some(a => a.workload >= 5)
  const active   = agents.filter(a => a.is_active)

  const submit = async () => {
    if (selected.length === 0) return toast.error('Choisissez au moins un agent')
    setLoading(true)
    try {
      const res = await fetch(`${API}/chef/declarations/${decl.id}/accept`, {
        method: 'POST', headers: jsonH(),
        body: JSON.stringify({ agent_ids: selected }) // using agent_ids array
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur')
      toast.success('Mission assignée ✓')
      onDone(); onClose()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800 overflow-hidden">

        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Accepter & Assigner</p>
              <h2 className="text-lg font-black text-[#0A1628] dark:text-white">Choisir un Agent</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Decl summary */}
          <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center text-lg shadow-sm">
              {(decl.photo_avant || decl.image_url)
                ? <img src={decl.photo_avant || decl.image_url!} className="w-full h-full object-cover" alt="" />
                : getCatEmoji(decl.category)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-[#0A1628] dark:text-white truncate">{decl.title}</p>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{decl.ref_citoyen} · {decl.category}</p>
            </div>
          </div>
        </div>

        {overloaded && (
          <div className="mx-7 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              <span className="font-black">Attention:</span> Un ou plusieurs agents sélectionnés ont déjà 5 missions actives.
            </p>
          </div>
        )}

        {/* Agent list */}
        <div className="px-7 py-5 space-y-2 max-h-64 overflow-y-auto">
          {active.length === 0 ? (
            <div className="py-8 text-center">
              <UserCheck className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-400">Aucun agent disponible</p>
            </div>
          ) : active.map((a, idx) => {
            const isSel = selected.includes(a.id)
            const pct   = Math.min((a.workload / 5) * 100, 100)
            const bCol  = a.workload >= 5 ? '#EF4444' : a.workload >= 3 ? '#F59E0B' : '#10B981'
            const stLabel = a.workload >= 5 ? 'Surchargé' : a.workload >= 3 ? 'En mission' : 'Disponible'
            return (
              <button key={a.id} onClick={() => setSelected(p => p.includes(a.id) ? p.filter(x => x !== a.id) : [...p, a.id])}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  isSel
                    ? 'border-[#1557FF] bg-blue-50 dark:bg-blue-500/10'
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/30'
                }`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                  style={{ background: AGENT_COLORS[idx % AGENT_COLORS.length] }}>
                  {a.first_name[0]}{a.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-[#0A1628] dark:text-white truncate">{a.first_name} {a.last_name}</p>
                    <span className="text-[9px] font-black ml-2 flex-shrink-0" style={{ color: bCol }}>{stLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: bCol }} />
                    </div>
                    <span className="text-[9px] text-slate-400 flex-shrink-0">{a.workload}/5</span>
                  </div>
                </div>
                {isSel && <CheckCircle2 className="w-4 h-4 text-[#1557FF] flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        <div className="px-7 pb-7 flex gap-2.5">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-100 dark:border-slate-800 text-sm font-black text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Annuler
          </button>
          <button onClick={submit} disabled={selected.length === 0 || loading}
            className="flex-[2] py-3 rounded-xl text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-lg"
            style={{ background: overloaded ? '#F59E0B' : '#1557FF' }}>
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" />Confirmer</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Refuse Modal ──────────────────────────────────────────────────────────────

function RefuseModal({ decl, onClose, onDone }: {
  decl: Decl; onClose: () => void; onDone: () => void
}) {
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)
  const REASONS = ['Hors périmètre technique', 'Informations insuffisantes', 'Doublon détecté', 'Matériel non disponible', 'Autre']

  const submit = async () => {
    if (!reason.trim()) return toast.error('Le motif est obligatoire')
    setLoading(true)
    try {
      const res = await fetch(`${API}/chef/declarations/${decl.id}/refuse`, {
        method: 'POST', headers: jsonH(),
        body: JSON.stringify({ reason })
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur')
      toast.success('Signalement retourné au Président')
      onDone(); onClose()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md border border-red-100 dark:border-red-900/30 overflow-hidden">
        <div className="px-7 pt-7 pb-5 border-b border-red-100 dark:border-red-900/20 flex items-start justify-between bg-red-50/50 dark:bg-red-900/10">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">Motif obligatoire</p>
            <h2 className="text-lg font-black text-red-700 dark:text-red-400">Refuser la Mission</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-7 space-y-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Motif du refus *</p>
          {REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                reason === r
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-200'
              }`}>
              {r}
            </button>
          ))}
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Précisez si besoin…" rows={2}
            className="w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-100 resize-none dark:text-slate-200 dark:placeholder-slate-500" />
        </div>
        <div className="px-7 pb-7 flex gap-2.5">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-100 dark:border-slate-800 text-sm font-black text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Annuler
          </button>
          <button onClick={submit} disabled={!reason.trim() || loading}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-lg shadow-red-100">
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Refuser'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ decl, agents, onClose, onRefreshed }: {
  decl: Decl; agents: Agent[]; onClose: () => void; onRefreshed: () => void
}) {
  const [detail,     setDetail]     = useState<DetailFull | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState<'info' | 'history' | 'messages'>('info')
  const [msg,        setMsg]        = useState('')
  const [channel,    setChannel]    = useState<'president_chef' | 'chef_agent' | 'chef_chef'>('president_chef')
  const [sending,    setSending]    = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [showRefuse, setShowRefuse] = useState(false)

  // Wait, wait! DetailDrawer uses `decl` internally.
  const isIncoming = decl.status === 'assignee_chef'

  const CHAN_CFG: Record<string, any> = {
    president_chef: { label: 'Président ↔ Chef', color: '#7C3AED' },
    chef_agent:     { label: 'Chef ↔ Agent',     color: '#1D4ED8' },
    chef_chef:      { label: 'Espace Projet (Chefs)', color: '#059669' },
  }
  const endRef = useRef<HTMLDivElement>(null)
  const me = JSON.parse(localStorage.getItem('fmc_user') || '{}')

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/chef/declarations/${decl.id}`, { headers: hdr() })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setDetail({ ...(d.declaration || d), photos: d.photos || [], history: d.history || [], comments: d.comments || [] })
      })
      .finally(() => setLoading(false))
  }, [decl.id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [detail?.comments?.length])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const sendMsg = async () => {
    if (!msg.trim() || !detail) return
    setSending(true)
    try {
      const r = await fetch(`${API}/chef/declarations/${detail.id}/comments`, {
        method: 'POST', headers: jsonH(),
        body: JSON.stringify({ content: msg.trim(), channel })
      })
      if (r.ok) { const d = await r.json(); setDetail(p => p ? { ...p, comments: [...p.comments, d.comment] } : p); setMsg('') }
    } catch {} finally { setSending(false) }
  }

  const d       = detail || decl
  const photos  = detail?.photos  || []
  const history = detail?.history || []
  const comments= detail?.comments || []
  const filteredComments = comments.filter((c: any) => !c.channel || c.channel === channel)

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-xl bg-white dark:bg-slate-950 shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800"
        style={{ animation: 'slideIn .22s cubic-bezier(.22,1,.36,1)' }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Drawer header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <StatusPill status={decl.status} />
            <span className="font-mono text-[10px] font-black text-[#1557FF] dark:text-blue-400 truncate">{decl.ref_citoyen}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isIncoming && (
              <>
                <button onClick={() => setShowAssign(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-all">
                  <UserCheck className="w-3.5 h-3.5" /> Assigner
                </button>
                <button onClick={() => setShowRefuse(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-black border border-red-200 dark:border-red-800/30 transition-all">
                  <XCircle className="w-3.5 h-3.5" /> Refuser
                </button>
              </>
            )}
            {(decl.category === 'Projet' || (decl as any).shared_departments?.length > 0) && (
              <button onClick={() => { setTab('messages'); setChannel('chef_chef') }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-black border border-indigo-200 dark:border-indigo-800/30 transition-all">
                <Users className="w-3.5 h-3.5" /> Espace Projet
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Photo strip */}
        {photos.length > 0 && (
          <div className="flex-shrink-0 h-40 overflow-hidden bg-slate-100 dark:bg-slate-900 flex">
            {photos.slice(0, 2).map((p: any, i: number) => (
              <div key={p.id} className={`relative flex-1 ${i > 0 ? 'border-l-2 border-white dark:border-slate-950' : ''}`}>
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-black text-white"
                  style={{ background: p.photo_type === 'photo_apres' ? '#10B981' : '#1D4ED8' }}>
                  {p.photo_type === 'photo_apres' ? 'APRÈS' : 'AVANT'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Title */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          {loading
            ? <div className="space-y-2"><Sk h="h-5" w="w-3/4" /><Sk h="h-3" w="w-1/2" /></div>
            : <>
                <h2 className="text-base font-black text-[#0A1628] dark:text-white leading-snug">{d.title}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {d.category && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{getCatEmoji(d.category)} {d.category}</span>}
                  <PriorityPill priority={d.priority} />
                  {(d.votes_count || 0) > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500">
                      <ThumbsUp className="w-3 h-3" /> {d.votes_count}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-bold">{fmtDate(decl.created_at)}</span>
                </div>
              </>
          }
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-slate-100 dark:border-slate-800">
          {([
            { key: 'info',     label: 'Informations', icon: FileText     },
            { key: 'history',  label: 'Historique',   icon: History      },
            { key: 'messages', label: 'Messages',      icon: MessageSquare, badge: filteredComments.length },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black border-b-2 transition-all ${
                tab === t.key
                  ? 'border-[#1557FF] text-[#1557FF] dark:text-blue-400'
                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {'badge' in t && t.badge > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 relative">

          {/* INFO */}
          {tab === 'info' && (
            <div className="absolute inset-0 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="flex gap-3"><Sk w="w-8" h="h-8" r="rounded-xl" /><div className="flex-1 space-y-1.5 pt-1"><Sk h="h-2.5" w="w-20" /><Sk h="h-4" /></div></div>)}</div>
              ) : (
                <>
                  {/* Description */}
                  <div className="bg-blue-50/60 dark:bg-blue-900/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/20">
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-2">Description</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {d.description || <span className="italic text-slate-400">Aucune description.</span>}
                    </p>
                  </div>

                  {/* Details grid */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800">
                    {d.address && (
                      <div className="flex items-center gap-3 px-5 py-3.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Localisation</p>
                          <p className="text-sm font-bold text-[#0A1628] dark:text-white">{d.address}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Référence</p>
                        <p className="text-sm font-mono font-bold text-[#1557FF]">{d.ref_citoyen}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Soumis le</p>
                        <p className="text-sm font-bold text-[#0A1628] dark:text-white">{fmtFull(d.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Citizen */}
                  {d.citizen && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Citoyen déclarant</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0"
                          style={{ background: '#1557FF' }}>
                          {d.citizen.first_name?.[0]}{d.citizen.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#0A1628] dark:text-white">{d.citizen.first_name} {d.citizen.last_name}</p>
                          {d.citizen.email && <p className="text-[10px] text-slate-400 font-bold mt-0.5">{d.citizen.email}</p>}
                          {d.citizen.phone && <p className="text-[10px] text-slate-400 font-bold">{d.citizen.phone}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assigned agent */}
                  {d.assigned_agent && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Agent assigné</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0"
                          style={{ background: '#10B981' }}>
                          {d.assigned_agent.first_name?.[0]}{d.assigned_agent.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#0A1628] dark:text-white">{d.assigned_agent.first_name} {d.assigned_agent.last_name}</p>
                          <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">Agent terrain</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* HISTORY */}
          {tab === 'history' && (
            <div className="absolute inset-0 overflow-y-auto p-6">
              {loading ? (
                <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="flex gap-3"><Sk w="w-7" h="h-7" r="rounded-full" /><div className="flex-1 space-y-1.5 pt-1"><Sk h="h-3" w="w-24" /><Sk h="h-2.5" w="w-36" /></div></div>)}</div>
              ) : history.length === 0 ? (
                <div className="text-center py-16">
                  <History className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-400">Aucun historique</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-slate-100 dark:bg-slate-800" />
                  {[...history].reverse().map((h: any, i: number) => {
                    const sc = STATUS_CFG[h.new_status] || { label: h.new_status, color: '#64748B', bg: '#F1F5F9', dot: '#94A3B8' }
                    return (
                      <div key={h.id || i} className="flex gap-4 pb-5 last:pb-0 relative">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0 border-2"
                          style={{ background: sc.bg, borderColor: sc.dot }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: sc.dot }} />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-xs font-black" style={{ color: sc.color }}>{sc.label}</span>
                            <span className="text-[10px] text-slate-400">{fmtFull(h.created_at)}</span>
                          </div>
                          {h.user && <p className="text-[10px] text-slate-400">par {h.user.first_name} {h.user.last_name}</p>}
                          {h.raison && (
                            <div className="mt-1.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/20 rounded-xl px-3 py-2 text-[10px] text-amber-700 dark:text-amber-400 italic">
                              «{h.raison}»
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

          {/* MESSAGES */}
          {tab === 'messages' && (
            <div className="absolute inset-0 flex flex-col">
              {/* Channel selector */}
              <div className="flex-shrink-0 flex gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                {(() => {
                  const isProject = decl.category === 'Projet' || (decl.shared_departments && decl.shared_departments.length > 0);
                  const channels: Array<'president_chef' | 'chef_agent' | 'chef_chef'> = ['president_chef', 'chef_agent'];
                  if (isProject) channels.push('chef_chef');
                  
                  return channels.map(ch => {
                    const cfg = CHAN_CFG[ch]
                    const active = channel === ch
                    return (
                      <button key={ch} onClick={() => setChannel(ch)}
                        className="flex-1 py-2 rounded-xl text-[10px] font-black transition-all border"
                        style={active ? { background: cfg.color, color: '#fff', borderColor: cfg.color } : { color: '#94A3B8', borderColor: '#E2E8F0' }}>
                        {cfg.label}
                      </button>
                    )
                  })
                })()}
              </div>

              {/* Messages list */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
                {loading ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => <Sk key={i} h="h-14" r="rounded-2xl" />)}</div>
                ) : filteredComments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-xs font-bold text-slate-400">Aucun message dans ce canal</p>
                  </div>
                ) : filteredComments.map((c: any) => {
                  const isMe = c.user?.role === 'chef' || c.user_id === me.id
                  const name = c.user ? `${c.user.first_name?.[0] || ''}${c.user.last_name?.[0] || ''}` : '?'
                  const cfg  = CHAN_CFG[channel]
                  return (
                    <div key={c.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                        style={{ background: isMe ? cfg.color : '#94A3B8' }}>
                        {isMe ? 'M' : name.toUpperCase()}
                      </div>
                      <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{isMe ? 'Vous' : c.user ? `${c.user.first_name} ${c.user.last_name}` : '—'}</span>
                          <span className="text-[9px] text-slate-400">{new Date(c.created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}</span>
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
              <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex gap-2">
                  <input value={msg} onChange={e => setMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
                    placeholder={`${CHAN_CFG[channel].label}…`}
                    className="flex-1 text-xs px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1557FF] font-medium text-[#0A1628] dark:text-slate-200 placeholder-slate-400 transition-all" />
                  <button onClick={sendMsg} disabled={sending || !msg.trim()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all flex-shrink-0"
                    style={{ background: CHAN_CFG[channel].color }}>
                    {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <span className="font-mono text-[10px] text-slate-400">{decl.ref_service || decl.ref_citoyen}</span>
          <span className="text-[10px] text-slate-400">{fmtDate(decl.created_at)}</span>
        </div>
      </div>

      {showAssign && (
        <AssignModal decl={decl} agents={agents} onClose={() => setShowAssign(false)}
          onDone={() => { onRefreshed(); setShowAssign(false) }} />
      )}
      {showRefuse && (
        <RefuseModal decl={decl} onClose={() => setShowRefuse(false)}
          onDone={() => { onRefreshed(); setShowRefuse(false) }} />
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const ChefDeclarations: React.FC = () => {
  const [declarations, setDeclarations] = useState<Decl[]>([])
  const [agents,       setAgents]       = useState<Agent[]>([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [prioFilter,   setPrioFilter]   = useState<string[]>([])
  const [agentFilter,  setAgentFilter]  = useState<string[]>([])
  const [dateFilter,   setDateFilter]   = useState('all')
  const [page,         setPage]         = useState(1)
  const [selected,     setSelected]     = useState<Decl | null>(null)
  const [assigning,    setAssigning]    = useState<Decl | null>(null)
  const [refusing,     setRefusing]     = useState<Decl | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const [dRes, aRes] = await Promise.all([
        fetch(`${API}/chef/declarations?limit=500`, { headers: hdr() }),
        fetch(`${API}/chef/agents`,                  { headers: hdr() }),
      ])
      if (dRes.ok) { const d = await dRes.json(); setDeclarations(Array.isArray(d) ? d : d.declarations || []) }
      if (aRes.ok) { const d = await aRes.json(); setAgents(d.agents || []) }
    } catch { if (!silent) toast.error('Erreur de chargement') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const agentOf = (d: Decl) => {
    if (d.assigned_agent) return d.assigned_agent
    const a = agents.find(ag => ag.id === d.agent_id)
    return a ? { first_name: a.first_name, last_name: a.last_name } : null
  }

  // Filter
  const filtered = declarations.filter(d => {
    // Statut
    if (statusFilter.length > 0) {
      const matches = statusFilter.some(sf => {
        if (sf === 'refused') return ['refusee_chef','refusee_agent'].includes(d.status)
        if (sf === 'en_cours') return ['assignee_agent','en_cours'].includes(d.status)
        if (sf === 'resolue') return ['resolue','cloturee'].includes(d.status)
        return d.status === sf
      })
      if (!matches) return false
    }

    // Priorité
    if (prioFilter.length > 0) {
      const lo = d.priority?.toLowerCase() || ''
      const matches = prioFilter.some(pf => {
        if (pf === 'haute') return ['haute','high','urgent','urgente'].includes(lo)
        if (pf === 'moyenne') return ['moyenne','medium'].includes(lo)
        if (pf === 'basse') return ['basse','low'].includes(lo)
        return false
      })
      if (!matches) return false
    }

    // Agent
    if (agentFilter.length > 0) {
      const matches = agentFilter.some(af => {
        if (af === 'unassigned') return !d.agent_id
        return d.agent_id === af
      })
      if (!matches) return false
    }

    // Date
    if (dateFilter !== 'all') {
      const dDate = new Date(d.created_at)
      const now = new Date()
      if (dateFilter === 'today' && dDate.toDateString() !== now.toDateString()) return false
      if (dateFilter === 'week' && (now.getTime() - dDate.getTime()) > 7*24*3600*1000) return false
      if (dateFilter === 'month' && (now.getTime() - dDate.getTime()) > 30*24*3600*1000) return false
    }

    if (search) {
      const q = search.toLowerCase()
      return d.title.toLowerCase().includes(q)
          || d.ref_citoyen.toLowerCase().includes(q)
          || (d.category || '').toLowerCase().includes(q)
    }
    return true
  })

  // Counts for tab bar
  const counts = {
    all:           declarations.length,
    assignee_chef: declarations.filter(d => d.status === 'assignee_chef').length,
    en_cours:      declarations.filter(d => ['assignee_agent','en_cours'].includes(d.status)).length,
    resolue:       declarations.filter(d => ['resolue','cloturee'].includes(d.status)).length,
    refused:       declarations.filter(d => ['refusee_chef','refusee_agent'].includes(d.status)).length,
  }

  const totalPages = Math.ceil(filtered.length / ROWS)
  const rows       = filtered.slice((page - 1) * ROWS, page * ROWS)

  const STATUS_TABS = [
    { key: 'all',           label: 'Toutes',       count: counts.all           },
    { key: 'assignee_chef', label: 'À traiter',    count: counts.assignee_chef },
    { key: 'en_cours',      label: 'En cours',     count: counts.en_cours      },
    { key: 'resolue',       label: 'Terminées',    count: counts.resolue       },
    { key: 'refused',       label: 'Refusées',     count: counts.refused       },
  ]

  return (
    <ChefLayout title="Déclarations">
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: '1rem', fontWeight: 700, fontSize: 13 } }} />

      <div className="space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-[#0A1628] dark:text-white">Déclarations</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-0.5">
              {declarations.length} déclaration{declarations.length !== 1 ? 's' : ''} dans votre département
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => load(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black hover:border-slate-300 transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            <button onClick={() => {
              fetch(`${API}/chef/export`, { headers: hdr() })
                .then(r => r.ok ? r.blob() : null)
                .then(b => { if (!b) return; const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download=`declarations-${new Date().toISOString().slice(0,10)}.csv`; a.click() })
            }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1557FF] text-white rounded-xl text-xs font-black shadow-sm shadow-blue-100 hover:bg-blue-600 transition-all">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>

        {/* ── Table card ── */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">

          {/* Toolbar: status tabs + search */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <FilterDropdown multi label="Statuts" icon={Activity} value={statusFilter} onChange={(v:any) => { setStatusFilter(v); setPage(1) }} options={[
                { value: 'assignee_chef', label: 'À traiter', dot: '#F59E0B' },
                { value: 'en_cours', label: 'En cours', dot: '#1557FF' },
                { value: 'resolue', label: 'Résolue', dot: '#10B981' },
                { value: 'refused', label: 'Refusée', dot: '#EF4444' },
              ]} />
              <FilterDropdown multi label="Priorités" icon={Zap} value={prioFilter} onChange={(v:any) => { setPrioFilter(v); setPage(1) }} options={[
                { value: 'haute', label: 'Haute', dot: '#EF4444' },
                { value: 'moyenne', label: 'Moyenne', dot: '#F59E0B' },
                { value: 'basse', label: 'Basse', dot: '#10B981' },
              ]} />
              <FilterDropdown multi label="Agents" icon={User} value={agentFilter} onChange={(v:any) => { setAgentFilter(v); setPage(1) }} options={[
                { value: 'unassigned', label: 'Non assigné' },
                ...agents.map(a => ({ value: a.id, label: `${a.first_name} ${a.last_name}` }))
              ]} />
              <FilterDropdown label="Date" icon={Calendar} value={dateFilter} onChange={(v:any) => { setDateFilter(v); setPage(1) }} options={[
                { value: 'all', label: 'Toutes les dates' },
                { value: 'today', label: "Aujourd'hui" },
                { value: 'week', label: '7 derniers jours' },
                { value: 'month', label: '30 derniers jours' },
              ]} />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Rechercher…"
                className="w-52 pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:border-[#1557FF] font-medium text-[#0A1628] dark:text-white placeholder-slate-400 transition-all" />
            </div>
          </div>

          {/* ── Column headers ── */}
          <div className="grid items-center gap-4 px-5 py-2.5 bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800"
            style={{ gridTemplateColumns: '1fr 120px 130px 130px 150px 130px 130px' }}>
            {['Déclaration', 'Catégorie', 'Statut', 'Priorité', 'Agent assigné', 'Soumis le', 'Actions'].map(h => (
              <p key={h} className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{h}</p>
            ))}
          </div>

          {/* ── Rows ── */}
          {loading ? (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="grid gap-4 px-5 py-4 items-center"
                  style={{ gridTemplateColumns: '1fr 120px 130px 130px 150px 130px 130px' }}>
                  <div className="space-y-1.5"><Sk h="h-4" w="w-40" /><Sk h="h-2.5" w="w-24" /></div>
                  <Sk h="h-6" r="rounded-full" />
                  <Sk h="h-6" r="rounded-full" />
                  <Sk h="h-6" r="rounded-full" />
                  <Sk h="h-6" w="w-28" r="rounded-xl" />
                  <Sk h="h-3.5" w="w-20" />
                  <div className="flex gap-1.5"><Sk w="w-8" h="h-8" r="rounded-lg" /><Sk w="w-8" h="h-8" r="rounded-lg" /><Sk w="w-8" h="h-8" r="rounded-lg" /></div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center">
              <FileText className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500">
                {search || statusFilter.length > 0 ? 'Aucun résultat.' : 'Aucune déclaration.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/30">
              {rows.map((d, i) => {
                const agent     = agentOf(d)
                const canAction = d.status === 'assignee_chef'
                const imgSrc    = d.photo_avant || d.image_url

                return (
                  <div key={d.id}
                    onClick={() => setSelected(d)}
                    className={`grid gap-4 px-5 py-3.5 items-center cursor-pointer group hover:bg-slate-50/70 dark:hover:bg-slate-800/20 transition-colors ${i % 2 !== 0 ? 'bg-slate-50/30 dark:bg-slate-800/10' : ''}`}
                    style={{ gridTemplateColumns: '1fr 120px 130px 130px 150px 130px 130px' }}>

                    {/* Title + ref */}
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#0A1628] dark:text-white truncate group-hover:text-[#1557FF] transition-colors">
                        {d.title}
                      </p>
                      <p className="font-mono text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{d.ref_citoyen}</p>
                      {/* Project indicator */}
                      {(d.category === 'Projet' || (d as any).shared_departments?.length > 0) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/30 uppercase tracking-widest flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" /> Projet Partagé
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Category */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg whitespace-nowrap">
                        {d.category || '—'}
                      </span>
                    </div>

                    {/* Status */}
                    <div><StatusPill status={d.status} /></div>

                    {/* Priority — set by president, read-only here */}
                    <div><PriorityPill priority={d.priority} /></div>

                    {/* Assigned agent */}
                    <div>
                      {agent ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-black flex-shrink-0"
                            style={{ background: AGENT_COLORS[agents.findIndex(a => a.id === d.agent_id) % AGENT_COLORS.length] || '#1557FF' }}>
                            {agent.first_name[0]}{agent.last_name[0]}
                          </div>
                          <span className="text-[11px] font-bold text-[#0A1628] dark:text-slate-200 truncate">
                            {agent.first_name} {agent.last_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">
                          Non assigné
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div>
                      <p className="text-[11px] font-bold text-[#0A1628] dark:text-slate-300">{fmtDate(d.created_at)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>

                      {/* View */}
                      <button onClick={() => setSelected(d)}
                        title="Voir les détails"
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Accept — only when assignee_chef */}
                      {canAction && (
                        <button onClick={() => setAssigning(d)}
                          title="Accepter & Assigner"
                          className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Refuse — only when assignee_chef */}
                      {canAction && (
                        <button onClick={() => setRefusing(d)}
                          title="Refuser"
                          className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Pagination ── */}
          {!loading && filtered.length > ROWS && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                {(page-1)*ROWS+1}–{Math.min(page*ROWS, filtered.length)} sur {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const p = Math.max(1, Math.min(page-2, totalPages-4)) + i
                  if (p < 1 || p > totalPages) return null
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg border text-[11px] font-black transition-all ${
                        p === page
                          ? 'bg-[#1557FF] text-white border-[#1557FF] shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals / drawer */}
      {selected  && <DetailDrawer decl={selected} agents={agents} onClose={() => setSelected(null)} onRefreshed={() => { load(true); setSelected(null) }} />}
      {assigning && <AssignModal  decl={assigning} agents={agents} onClose={() => setAssigning(null)} onDone={() => load(true)} />}
      {refusing  && <RefuseModal  decl={refusing}  onClose={() => setRefusing(null)} onDone={() => load(true)} />}
    </ChefLayout>
  )
}

export default ChefDeclarations