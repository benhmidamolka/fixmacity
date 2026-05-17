// src/components/president/DeclarationDetailDrawer.tsx
// ── Fixed: infinite scroll, unclear icons/text, dark mode, fully functional ──
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, ArrowLeft, MapPin, Calendar, User, Tag, Activity,
  ChevronRight, CheckCircle2, Clock, ImageIcon,
  Send, Loader2, Building2, Users, FileText, AlertTriangle,
  ThumbsUp, History, MessageSquare, Camera, Hash,
  RefreshCw, Shield, UserCheck
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''
const hdr = () => ({ Authorization: `Bearer ${tok()}` })

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : '—'

const fmtShort = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : '—'

// ── Types ────────────────────────────────────────────────────────────────────
interface DeclDetail {
  id: string
  ref_citoyen: string
  ref_service: string | null
  title: string
  description: string
  category: string
  status: string
  priority: string
  created_at: string
  assigned_at?: string
  started_at?: string
  resolved_at?: string
  address?: string
  latitude?: number
  longitude?: number
  votes_count: number
  priority_score: number
  citizen?: { id: string; first_name: string; last_name: string; email: string; phone?: string }
  department?: { id: string; name: string; name_fr: string; code: string }
  agent?: { id: string; first_name: string; last_name: string } | null
  chef?: { id: string; first_name: string; last_name: string; email: string } | null
  delegations?: { name: string; code: string }
}

interface Photo {
  id: string; url: string; uploaded_by: string; created_at: string; photo_type?: string
}

interface HistoryEntry {
  id: string; old_status: string; new_status: string
  raison?: string; created_at: string
  user?: { first_name: string; last_name: string; role: string }
}

interface Comment {
  id: string; content: string; channel: string; created_at: string
  user?: { first_name: string; last_name: string; role: string }
}

interface Props {
  declarationId: string | null
  onClose: () => void
  onAssigned?: () => void
  departments: { id: string; name: string }[]
  currentUserId?: string
}

// ── Status / Priority config ─────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string; dot: string; darkBg: string }> = {
  soumise:        { label: 'Soumise',          color: '#d97706', bg: '#fef3c7', dot: '#f59e0b', darkBg: 'rgba(245,158,11,0.15)' },
  assignee_chef:  { label: 'Assignée — Chef',  color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6', darkBg: 'rgba(139,92,246,0.15)' },
  assignee_agent: { label: 'Assignée — Agent', color: '#1d4ed8', bg: '#dbeafe', dot: '#3b82f6', darkBg: 'rgba(59,130,246,0.15)' },
  en_cours:       { label: 'En cours',         color: '#c2410c', bg: '#ffedd5', dot: '#f97316', darkBg: 'rgba(249,115,22,0.15)' },
  resolue:        { label: 'Résolue',          color: '#15803d', bg: '#dcfce7', dot: '#22c55e', darkBg: 'rgba(34,197,94,0.15)'  },
  cloturee:       { label: 'Clôturée',         color: '#475569', bg: '#f1f5f9', dot: '#94a3b8', darkBg: 'rgba(148,163,184,0.12)'},
  refusee_chef:   { label: 'Refusée — Chef',   color: '#dc2626', bg: '#fee2e2', dot: '#ef4444', darkBg: 'rgba(239,68,68,0.15)'  },
  refusee_agent:  { label: 'Refusée — Agent',  color: '#b91c1c', bg: '#fee2e2', dot: '#ef4444', darkBg: 'rgba(239,68,68,0.15)'  },
}

const STEPS = [
  { key: 'soumise',        label: 'Soumis',      icon: FileText     },
  { key: 'assignee_chef',  label: 'Assigné',     icon: Shield       },
  { key: 'assignee_agent', label: 'En équipe',   icon: UserCheck    },
  { key: 'en_cours',       label: 'En cours',    icon: Clock        },
  { key: 'resolue',        label: 'Résolu',      icon: CheckCircle2 },
  { key: 'cloturee',       label: 'Clôturé',     icon: CheckCircle2 },
]

const PRIORITY: Record<string, { label: string; color: string; bg: string }> = {
  haute:   { label: 'Urgent',  color: '#dc2626', bg: '#fee2e2' },
  high:    { label: 'Urgent',  color: '#dc2626', bg: '#fee2e2' },
  moyenne: { label: 'Normal',  color: '#d97706', bg: '#fef3c7' },
  medium:  { label: 'Normal',  color: '#d97706', bg: '#fef3c7' },
  basse:   { label: 'Faible',  color: '#16a34a', bg: '#dcfce7' },
  low:     { label: 'Faible',  color: '#16a34a', bg: '#dcfce7' },
}

const CHANNELS: Record<string, { label: string; short: string; color: string; bg: string }> = {
  president_chef: { label: 'Président → Chef de service', short: 'Président → Chef', color: '#7c3aed', bg: '#ede9fe' },
  chef_agent:     { label: 'Chef de service → Agent',     short: 'Chef → Agent',     color: '#0369a1', bg: '#e0f2fe' },
  agent_citizen:  { label: 'Agent → Citoyen',             short: 'Agent → Citoyen',  color: '#15803d', bg: '#dcfce7' },
}

// ── Reusable atoms ───────────────────────────────────────────────────────────
const Skel = ({ w = 'w-full', h = 'h-4', r = 'rounded-xl' }: { w?: string; h?: string; r?: string }) => (
  <div className={`${w} ${h} ${r} bg-slate-100 dark:bg-slate-800 animate-pulse`} />
)

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS[status] || STATUS.soumise
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
      style={{ color: s.color, background: s.bg }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

// ── Info row atom ─────────────────────────────────────────────────────────────
const Row = ({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon size={14} className="text-slate-500 dark:text-slate-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  </div>
)

const RowText = ({ icon, label, value }: { icon: any; label: string; value?: string }) => (
  <Row icon={icon} label={label}>
    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">{value || '—'}</p>
  </Row>
)

// ── Section heading ──────────────────────────────────────────────────────────
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
    {children}
  </p>
)

// ── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, color = '#6366f1', size = 9 }: { name: string; color?: string; size?: number }) => {
  const parts = name.trim().split(' ')
  const ini   = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return (
    <div
      className={`w-${size} h-${size} rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0`}
      style={{ background: color }}>
      {ini.toUpperCase()}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Timeline
// ─────────────────────────────────────────────────────────────────────────────
const Timeline = ({ status, history }: { status: string; history: HistoryEntry[] }) => {
  const currentIdx = STEPS.findIndex(s => s.key === status)
  const active     = currentIdx >= 0 ? currentIdx : 0

  return (
    <div className="space-y-0 relative">
      {/* vertical line */}
      <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-slate-100 dark:bg-slate-800" />
      {STEPS.map((step, idx) => {
        const done    = idx < active
        const current = idx === active
        const entry   = history.find(h => h.new_status === step.key)
        const StepIcon = step.icon

        return (
          <div key={step.key} className="flex gap-4 relative pb-5 last:pb-0">
            {/* dot */}
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2
              ${done    ? 'bg-emerald-500 border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600' :
                current ? 'bg-white border-blue-500 dark:bg-slate-900 dark:border-blue-400 ring-4 ring-blue-50 dark:ring-blue-500/10' :
                          'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700'}
            `}>
              {done    && <CheckCircle2 size={14} className="text-white" />}
              {current && <StepIcon size={14} className="text-blue-500 dark:text-blue-400" />}
              {!done && !current && <StepIcon size={14} className="text-slate-300 dark:text-slate-600" />}
            </div>

            {/* content */}
            <div className="flex-1 min-w-0 pt-1">
              <p className={`text-sm font-bold leading-tight ${
                done    ? 'text-emerald-700 dark:text-emerald-400' :
                current ? 'text-blue-700 dark:text-blue-400' :
                          'text-slate-300 dark:text-slate-600'
              }`}>{step.label}</p>
              {entry ? (
                <div className="mt-1 space-y-0.5">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {fmtShort(entry.created_at)}
                  </p>
                  {entry.user && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      par {entry.user.first_name} {entry.user.last_name}
                      {' '}<span className="opacity-60">({entry.user.role})</span>
                    </p>
                  )}
                  {entry.raison && (
                    <div className="mt-1.5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-3 py-2">
                      <p className="text-[11px] text-red-600 dark:text-red-400 italic">«{entry.raison}»</p>
                    </div>
                  )}
                </div>
              ) : !done && !current ? (
                <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-0.5">En attente</p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION: Comments tab — correctly constrained, never grows infinitely
// ─────────────────────────────────────────────────────────────────────────────
const CommentsTab = ({
  declarationId, comments, loading, sending,
  commentText, setCommentText,
  commentChannel, setCommentChannel,
  onSend, currentUserId
}: {
  declarationId: string
  comments: Comment[]
  loading: boolean
  sending: boolean
  commentText: string
  setCommentText: (v: string) => void
  commentChannel: 'president_chef' | 'chef_agent' | 'agent_citizen'
  setCommentChannel: (v: any) => void
  onSend: () => void
  currentUserId?: string
}) => {
  const endRef = useRef<HTMLDivElement>(null)
  const filtered = comments.filter(c => c.channel === commentChannel)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filtered.length, commentChannel])

  return (
    // KEY FIX: absolute inset — no flex-1 or h-full on children that scroll
    <div className="absolute inset-0 flex flex-col">
      {/* Channel tabs */}
      <div className="flex-shrink-0 flex gap-2 px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex-wrap">
        {(Object.entries(CHANNELS) as [string, typeof CHANNELS[string]][]).map(([ch, cfg]) => (
          <button key={ch}
            onClick={() => setCommentChannel(ch)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all whitespace-nowrap ${
              commentChannel === ch
                ? 'border-transparent text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
            }`}
            style={commentChannel === ch ? { background: cfg.color, borderColor: cfg.color } : {}}>
            {cfg.short}
          </button>
        ))}
      </div>

      {/* Channel badge */}
      <div className="flex-shrink-0 px-6 pt-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ color: CHANNELS[commentChannel].color, background: CHANNELS[commentChannel].bg }}>
          <MessageSquare size={13} />
          Canal : <span className="font-bold">{CHANNELS[commentChannel].label}</span>
        </div>
      </div>

      {/* Scrollable message list — flex-1 + overflow-y-auto = safe */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skel key={i} h="h-16" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <MessageSquare size={22} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Aucun message dans ce canal</p>
            <p className="text-xs text-slate-300 dark:text-slate-600">Soyez le premier à envoyer un message</p>
          </div>
        ) : filtered.map(c => {
          const isMe  = c.user?.role === 'president'
          const name  = c.user ? `${c.user.first_name} ${c.user.last_name}` : '?'
          const ini   = c.user ? `${c.user.first_name?.[0] || ''}${c.user.last_name?.[0] || ''}` : '?'
          const roleLabel = c.user?.role ? ({
            president: 'Président', chef: 'Chef', agent: 'Agent', citizen: 'Citoyen'
          }[c.user.role] || c.user.role) : ''

          return (
            <div key={c.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0 shadow-sm ${isMe ? 'bg-blue-600' : 'bg-slate-400 dark:bg-slate-600'}`}>
                {ini.toUpperCase()}
              </div>
              <div className={`flex flex-col max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{isMe ? 'Vous' : name}</span>
                  {roleLabel && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{roleLabel}</span>
                  )}
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {new Date(c.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed font-medium ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-200 dark:shadow-blue-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                }`}>
                  {c.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Input — flex-shrink-0, never grows */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex gap-2">
          <input
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            placeholder={`Message — ${CHANNELS[commentChannel].short}…`}
            className="flex-1 text-sm px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 transition-all"
          />
          <button
            onClick={onSend}
            disabled={sending || !commentText.trim()}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center flex-shrink-0 transition-all shadow-sm"
          >
            {sending
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1.5">Entrée pour envoyer</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const DeclarationDetailDrawer: React.FC<Props> = ({
  declarationId, onClose, onAssigned, departments, currentUserId
}) => {
  const [detail,         setDetail]         = useState<DeclDetail | null>(null)
  const [photos,         setPhotos]         = useState<Photo[]>([])
  const [history,        setHistory]        = useState<HistoryEntry[]>([])
  const [comments,       setComments]       = useState<Comment[]>([])
  const [loading,        setLoading]        = useState(false)
  const [tab,            setTab]            = useState<'info' | 'history' | 'comments'>('info')
  const [commentText,    setCommentText]    = useState('')
  const [commentChannel, setCommentChannel] = useState<'president_chef' | 'chef_agent' | 'agent_citizen'>('president_chef')
  const [sending,        setSending]        = useState(false)
  const [assigning,      setAssigning]      = useState(false)
  const [selectedDept,   setSelectedDept]   = useState('')
  const [toast,          setToast]          = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    if (!declarationId) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/president/declarations/${declarationId}`, { headers: hdr() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDetail(data.declaration)
      setPhotos(data.photos || [])
      setHistory(data.history || [])
      setComments(data.comments || [])
    } catch {
      showToast('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [declarationId])

  useEffect(() => {
    if (declarationId) {
      setDetail(null); setPhotos([]); setHistory([]); setComments([])
      setTab('info'); setCommentText(''); setSelectedDept('')
      load()
    }
  }, [declarationId, load])

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleAssign = async () => {
    if (!detail || !selectedDept) return
    setAssigning(true)
    try {
      const res = await fetch(`${API}/president/declarations/${detail.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({ department_id: selectedDept }),
      })
      if (res.ok) { showToast('Déclaration assignée ✓'); onAssigned?.(); setTimeout(onClose, 1200) }
      else showToast('Erreur lors de l\'assignation')
    } finally { setAssigning(false) }
  }

  const handleComment = async () => {
    if (!detail || !commentText.trim()) return
    setSending(true)
    try {
      const res = await fetch(`${API}/president/declarations/${detail.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({ content: commentText.trim(), channel: commentChannel }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments(prev => [...prev, data.comment])
        setCommentText('')
      }
    } finally { setSending(false) }
  }

  // Derived
  const s         = detail ? (STATUS[detail.status] || STATUS.soumise) : STATUS.soumise
  const p         = detail ? (PRIORITY[detail.priority] || PRIORITY.moyenne) : PRIORITY.moyenne
  const isAssigned= detail && ['assignee_chef','assignee_agent','en_cours','resolue','cloturee'].includes(detail.status)
  const isResolved= detail && ['resolue','cloturee'].includes(detail.status)
  const beforePh  = photos.find(ph => ph.photo_type === 'before' || !ph.photo_type) || photos[0]
  const afterPh   = photos.find(ph => ph.photo_type === 'after') || (isResolved && photos.length > 1 ? photos[photos.length - 1] : undefined)

  const TABS = [
    { key: 'info',     label: 'Infos',      icon: FileText },
    { key: 'history',  label: 'Progression', icon: History },
    { key: 'comments', label: 'Messages',    icon: MessageSquare, count: comments.length },
  ]

  return (
    <AnimatePresence>
      {declarationId && (
        <>
          {/* Backdrop */}
          <motion.div key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={onClose} />

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div key="toast"
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 dark:bg-slate-700 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-2xl">
                {toast}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drawer */}
          <motion.div key="drawer"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 z-[101] w-full max-w-2xl bg-white dark:bg-slate-950 shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800"
          >

            {/* ── HEADER — flex-shrink-0 ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <button onClick={onClose}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors">
                <ArrowLeft size={16} />
                Retour
              </button>
              <div className="flex items-center gap-3">
                {detail && !loading && (
                  <>
                    <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500">
                      {detail.ref_citoyen}
                    </span>
                    <StatusBadge status={detail.status} />
                  </>
                )}
                {loading && <Skel w="w-32" h="h-6" />}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={load}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── PHOTO STRIP — flex-shrink-0, h-44 ── */}
            <div className="flex-shrink-0 h-44 bg-slate-100 dark:bg-slate-900 overflow-hidden">
              {loading ? (
                <div className="w-full h-full animate-pulse bg-slate-200 dark:bg-slate-800" />
              ) : photos.length > 0 ? (
                <div className="flex h-full">
                  <div className="flex-1 relative">
                    <img src={beforePh?.url} alt="Avant"
                      className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-red-500/90 text-white text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
                      <X size={9} /> Avant
                    </div>
                  </div>
                  <div className="w-px bg-white/40 flex-shrink-0" />
                  {afterPh ? (
                    <div className="flex-1 relative">
                      <img src={afterPh.url} alt="Après"
                        className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
                        <CheckCircle2 size={9} /> Après
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-2">
                      <Camera size={20} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 text-center px-4 leading-snug">
                        Photo après résolution
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <ImageIcon size={20} className="text-slate-400 dark:text-slate-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Aucune photo</p>
                </div>
              )}
            </div>

            {/* ── TITLE BLOCK — flex-shrink-0 ── */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              {loading ? (
                <div className="space-y-2"><Skel h="h-6" w="w-3/4" /><Skel h="h-3" w="w-1/2" /></div>
              ) : detail && (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
                      {detail.title}
                    </h2>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {detail.category && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          <Tag size={10} /> {detail.category}
                        </span>
                      )}
                      {detail.delegations?.name && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <MapPin size={10} /> {detail.delegations.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                        <Calendar size={10} /> {fmtShort(detail.created_at)}
                      </span>
                      {detail.votes_count > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-black text-blue-500 dark:text-blue-400">
                          <ThumbsUp size={10} /> {detail.votes_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ color: p.color, background: p.bg }}>
                    {p.label}
                  </span>
                </div>
              )}
            </div>

            {/* ── TABS — flex-shrink-0 ── */}
            <div className="flex-shrink-0 flex border-b border-slate-100 dark:border-slate-800 px-2">
              {TABS.map(t => (
                <button key={t.key}
                  onClick={() => setTab(t.key as any)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[12px] font-bold border-b-2 transition-all ${
                    tab === t.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}>
                  <t.icon size={14} />
                  {t.label}
                  {t.count != null && t.count > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                      tab === t.key
                        ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── TAB CONTENT — flex-1 with relative positioning ── */}
            {/* KEY FIX: position: relative on the container, absolute inset on comments */}
            <div className="flex-1 min-h-0 relative">

              {/* INFO TAB */}
              {tab === 'info' && (
                <div className="absolute inset-0 overflow-y-auto">
                  <div className="p-6 space-y-5">

                    {/* Description */}
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-500/20">
                      <SectionTitle>Description du citoyen</SectionTitle>
                      {loading
                        ? <div className="space-y-2"><Skel /><Skel w="w-3/4" /></div>
                        : <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                            {detail?.description || <span className="italic text-slate-400">Aucune description.</span>}
                          </p>
                      }
                    </div>

                    {/* Info rows */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-1">
                      {loading ? (
                        <div className="space-y-4 py-3">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-3">
                              <Skel w="w-8" h="h-8" r="rounded-xl" />
                              <div className="flex-1 space-y-1.5"><Skel h="h-2" w="w-20" /><Skel h="h-4" /></div>
                            </div>
                          ))}
                        </div>
                      ) : detail && (
                        <>
                          <RowText icon={Calendar} label="Date de soumission" value={fmt(detail.created_at)} />
                          <RowText icon={Tag}      label="Catégorie"          value={detail.category} />
                          <Row icon={User} label="Citoyen déclarant">
                            {detail.citizen ? (
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                  {detail.citizen.first_name} {detail.citizen.last_name}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                  {detail.citizen.email}
                                </p>
                              </div>
                            ) : <p className="text-sm text-slate-400">—</p>}
                          </Row>
                          <Row icon={MapPin} label="Localisation">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {detail.address || detail.delegations?.name || '—'}
                            </p>
                            {detail.latitude && detail.longitude && (
                              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                                {detail.latitude.toFixed(5)}, {detail.longitude.toFixed(5)}
                              </p>
                            )}
                          </Row>
                          <Row icon={Hash} label="Références">
                            <div className="space-y-1">
                              <p className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                                {detail.ref_citoyen}
                              </p>
                              {detail.ref_service && (
                                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  {detail.ref_service}
                                </p>
                              )}
                            </div>
                          </Row>
                          <Row icon={Activity} label="État actuel">
                            <StatusBadge status={detail.status} />
                          </Row>
                        </>
                      )}
                    </div>

                    {/* Assigned-to card */}
                    {!loading && isAssigned && detail && (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                        <SectionTitle>Équipe assignée</SectionTitle>
                        <div className="space-y-3">
                          {detail.department && (
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-700 dark:text-blue-400 font-black text-xs border border-blue-100 dark:border-blue-500/20">
                                {detail.department.code}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                  {detail.department.name_fr || detail.department.name}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">Département</p>
                              </div>
                            </div>
                          )}
                          {detail.chef && (
                            <div className="flex items-center gap-3">
                              <Avatar name={`${detail.chef.first_name} ${detail.chef.last_name}`} color="#7c3aed" />
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                  {detail.chef.first_name} {detail.chef.last_name}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">Chef de service</p>
                              </div>
                            </div>
                          )}
                          {detail.agent && (
                            <div className="flex items-center gap-3">
                              <Avatar name={`${detail.agent.first_name} ${detail.agent.last_name}`} color="#15803d" />
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                  {detail.agent.first_name} {detail.agent.last_name}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">Agent terrain</p>
                              </div>
                            </div>
                          )}
                          {detail.assigned_at && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                              Assigné le {fmtShort(detail.assigned_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Resolved banner */}
                    {!loading && isResolved && detail?.resolved_at && (
                      <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                          <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">Intervention résolue</p>
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">{fmt(detail.resolved_at)}</p>
                      </div>
                    )}

                    {/* Assign panel */}
                    {!loading && detail?.status === 'soumise' && (
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                        <SectionTitle>Affecter au département</SectionTitle>
                        <select
                          value={selectedDept}
                          onChange={e => setSelectedDept(e.target.value)}
                          className="w-full text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition-all">
                          <option value="">Choisir un département…</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Reassign panel */}
                    {!loading && detail?.status === 'refusee_chef' && (
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                        <SectionTitle>Réassigner</SectionTitle>
                        <select
                          value={selectedDept}
                          onChange={e => setSelectedDept(e.target.value)}
                          className="w-full text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition-all">
                          <option value="">Choisir un autre département…</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* HISTORY TAB */}
              {tab === 'history' && (
                <div className="absolute inset-0 overflow-y-auto">
                  <div className="p-6">
                    {loading ? (
                      <div className="space-y-4">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="flex gap-4">
                            <Skel w="w-8" h="h-8" r="rounded-full" />
                            <div className="flex-1 space-y-1.5 pt-1">
                              <Skel h="h-3" w="w-24" /><Skel h="h-2" w="w-40" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <Timeline status={detail?.status || 'soumise'} history={history} />

                        {/* Refusal details */}
                        {history.filter(h => h.new_status?.startsWith('refusee')).map(h => (
                          <div key={h.id} className="mt-4 bg-red-50 dark:bg-red-500/10 rounded-2xl p-4 border border-red-100 dark:border-red-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle size={14} className="text-red-500 dark:text-red-400" />
                              <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wider">
                                {STATUS[h.new_status]?.label || 'Refusée'}
                              </p>
                            </div>
                            <p className="text-[11px] text-red-500 dark:text-red-400">{fmtShort(h.created_at)}</p>
                            {h.raison && (
                              <p className="text-sm text-red-700 dark:text-red-300 mt-2 italic bg-red-100/50 dark:bg-red-500/10 rounded-xl px-3 py-2">
                                «{h.raison}»
                              </p>
                            )}
                            {h.user && (
                              <p className="text-[11px] text-red-400 dark:text-red-500 mt-1">
                                par {h.user.first_name} {h.user.last_name}
                              </p>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* COMMENTS TAB — uses absolute inset pattern for safe scroll */}
              {tab === 'comments' && (
                <CommentsTab
                  declarationId={declarationId!}
                  comments={comments}
                  loading={loading}
                  sending={sending}
                  commentText={commentText}
                  setCommentText={setCommentText}
                  commentChannel={commentChannel}
                  setCommentChannel={setCommentChannel}
                  onSend={handleComment}
                  currentUserId={currentUserId}
                />
              )}
            </div>

            {/* ── FOOTER — flex-shrink-0 ── */}
            {!loading && detail && (
              <div className="flex-shrink-0 px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  {detail.ref_service || detail.ref_citoyen}
                </span>
                <div className="flex items-center gap-4">
                  {detail.priority_score > 0 && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Score priorité: <span className="font-black text-slate-600 dark:text-slate-300">{detail.priority_score}</span>
                    </span>
                  )}
                  {['soumise', 'refusee_chef'].includes(detail.status) ? (
                    <button
                      onClick={handleAssign}
                      disabled={!selectedDept || assigning}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      {assigning ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Enregistrer
                    </button>
                  ) : (
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-black transition-all"
                    >
                      Fermer
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default DeclarationDetailDrawer