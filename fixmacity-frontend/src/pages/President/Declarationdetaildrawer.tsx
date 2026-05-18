// src/components/president/DeclarationDetailDrawer.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, MapPin, Calendar, User, Tag, ChevronRight,
  CheckCircle2, Clock, ImageIcon, Send, Loader2,
  Building2, FileText, AlertTriangle, ThumbsUp,
  MessageSquare, Camera, Hash, RefreshCw, Shield,
  UserCheck, History, ArrowLeft, Star
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''
const hdr = () => ({ Authorization: `Bearer ${tok()}` })

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : '—'
const fmtShort = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : '—'

// ─── Types ────────────────────────────────────────────────────────────────────
interface DeclDetail {
  id: string; ref_citoyen: string; ref_service: string | null
  title: string; description: string; category: string
  status: string; priority: string; created_at: string
  resolved_at?: string; assigned_at?: string
  address?: string; latitude?: number; longitude?: number
  votes_count: number; priority_score: number; image_url?: string
  citizen?: { id: string; first_name: string; last_name: string; email: string; phone?: string }
  department?: { id: string; name: string; name_fr: string; code: string }
  agent?: { id: string; first_name: string; last_name: string } | null
  chef?: { id: string; first_name: string; last_name: string; email: string } | null
  delegations?: { name: string; code: string }
  rating?: { score: number; comment?: string }
  photo_avant?: string; photo_avant_url?: string; photo_url?: string
  photo_apres?: string; photo_apres_url?: string
  citizen_id?: string
}
interface Photo { id: string; url: string; uploaded_by: string; created_at: string; photo_type?: string }
interface HistEntry { id: string; old_status: string; new_status: string; raison?: string; created_at: string; user?: { first_name: string; last_name: string; role: string } }
interface Comment { id: string; content: string; channel: string; created_at: string; user_id?: string; user?: { first_name: string; last_name: string; role: string } }

export interface Props {
  declarationId: string | null
  onClose: () => void
  onAssigned?: () => void
  departments: { id: string; name: string }[]
  currentUserId?: string
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  soumise:        { label: 'Soumise',          color: '#D97706', bg: '#FEF3C7', dot: '#F59E0B' },
  assignee_chef:  { label: 'Assignée — Chef',  color: '#7C3AED', bg: '#EDE9FE', dot: '#8B5CF6' },
  assignee_agent: { label: 'Assignée — Agent', color: '#1D4ED8', bg: '#DBEAFE', dot: '#3B82F6' },
  en_cours:       { label: 'En cours',         color: '#C2410C', bg: '#FFEDD5', dot: '#F97316' },
  resolue:        { label: 'Résolue',          color: '#15803D', bg: '#DCFCE7', dot: '#22C55E' },
  cloturee:       { label: 'Clôturée',         color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
  refusee_chef:   { label: 'Refusée — Chef',   color: '#DC2626', bg: '#FEE2E2', dot: '#EF4444' },
  refusee_agent:  { label: 'Refusée — Agent',  color: '#B91C1C', bg: '#FEE2E2', dot: '#EF4444' },
}

const PRIORITY: Record<string, { label: string; color: string; bg: string }> = {
  haute:   { label: '🔴 Urgent',  color: '#DC2626', bg: '#FEE2E2' },
  high:    { label: '🔴 Urgent',  color: '#DC2626', bg: '#FEE2E2' },
  moyenne: { label: '🟡 Normal',  color: '#D97706', bg: '#FEF3C7' },
  medium:  { label: '🟡 Normal',  color: '#D97706', bg: '#FEF3C7' },
  basse:   { label: '🟢 Faible',  color: '#16A34A', bg: '#DCFCE7' },
  low:     { label: '🟢 Faible',  color: '#16A34A', bg: '#DCFCE7' },
}

const ROLE_COLORS: Record<string, string> = {
  president: '#7C3AED', chef: '#1D4ED8', agent: '#15803D', citizen: '#0369A1',
}

const WORKFLOW_STEPS = [
  { key: 'soumise',        label: 'Soumis',    Icon: FileText     },
  { key: 'assignee_chef',  label: 'Chef',      Icon: Shield       },
  { key: 'assignee_agent', label: 'Agent',     Icon: UserCheck    },
  { key: 'en_cours',       label: 'En cours',  Icon: Clock        },
  { key: 'resolue',        label: 'Résolu',    Icon: CheckCircle2 },
  { key: 'cloturee',       label: 'Clôturé',   Icon: CheckCircle2 },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skel = ({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) => (
  <div className={`${w} ${h} rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse`} />
)

// ─── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon size={14} className="text-slate-500 dark:text-slate-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-0.5">{label}</p>
      {children}
    </div>
  </div>
)

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS[status] ?? STATUS.soumise
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
      style={{ color: s.color, background: s.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, role }: { name: string; role?: string }) => {
  const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const bg = role ? (ROLE_COLORS[role] ?? '#64748B') : '#64748B'
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
      style={{ background: bg }}>
      {ini}
    </div>
  )
}

// ─── Stars ───────────────────────────────────────────────────────────────────
const Stars = ({ score }: { score: number }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={13} className={i <= score ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'} />
    ))}
  </div>
)

// ─── Workflow Timeline ────────────────────────────────────────────────────────
const Timeline = ({ status, history }: { status: string; history: HistEntry[] }) => {
  const currentIdx = WORKFLOW_STEPS.findIndex(s => s.key === status)
  const active = currentIdx >= 0 ? currentIdx : 0
  return (
    <div className="relative">
      <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-slate-100 dark:bg-slate-800" />
      <div className="space-y-0">
        {WORKFLOW_STEPS.map(({ key, label, Icon }, idx) => {
          const done    = idx < active
          const current = idx === active
          const entry   = history.find(h => h.new_status === key)
          return (
            <div key={key} className="flex gap-3 pb-5 last:pb-0 relative">
              {/* Node */}
              <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 transition-all
                ${done    ? 'bg-emerald-500 border-emerald-500' :
                  current ? 'bg-white dark:bg-slate-900 border-blue-500 ring-4 ring-blue-50 dark:ring-blue-950/30' :
                             'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                {done    ? <CheckCircle2 size={13} className="text-white" /> :
                 current ? <Icon size={13} className="text-blue-500" /> :
                           <Icon size={13} className="text-slate-300 dark:text-slate-500" />}
              </div>
              {/* Content */}
              <div className="flex-1 pt-1 min-w-0">
                <p className={`text-xs font-bold
                  ${done ? 'text-emerald-700 dark:text-emerald-400' : current ? 'text-blue-700 dark:text-blue-400' : 'text-slate-300 dark:text-slate-600'}`}>
                  {label}
                </p>
                {entry && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[10px] text-slate-500 font-medium">{fmtShort(entry.created_at)}</p>
                    {entry.user && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        par <span className="font-bold">{entry.user.first_name} {entry.user.last_name}</span>
                        <span className="opacity-60"> ({entry.user.role})</span>
                      </p>
                    )}
                    {entry.raison && (
                      <div className="mt-1 px-2.5 py-1.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
                        <p className="text-[10px] text-red-600 dark:text-red-400 italic">«{entry.raison}»</p>
                      </div>
                    )}
                  </div>
                )}
                {!entry && current && (
                  <p className="text-[10px] text-blue-500 mt-0.5 font-semibold">En cours…</p>
                )}
                {!entry && !done && !current && (
                  <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">En attente</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Comments Tab ─────────────────────────────────────────────────────────────
const CommentsTab = ({
  comments, loading, sending,
  text, setText, onSend, currentUserId
}: {
  comments: Comment[]
  loading: boolean; sending: boolean
  text: string; setText: (v: string) => void
  onSend: () => void
  currentUserId?: string
}) => {
  const endRef = useRef<HTMLDivElement>(null)
  const sorted = [...comments].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sorted.length])

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skel key={i} h="h-12" />)}</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <MessageSquare size={18} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Aucun commentaire interne</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">Les échanges internes apparaissent ici une fois le dossier assigné</p>
          </div>
        ) : sorted.map(c => {
          const isMe = c.user_id === currentUserId || c.user?.role === 'president'
          const name = c.user ? `${c.user.first_name} ${c.user.last_name}` : 'Inconnu'
          const roleColor = c.user?.role ? (ROLE_COLORS[c.user.role] ?? '#94A3B8') : '#94A3B8'
          const ROLE_LABELS: Record<string,string> = {
            president:'Président', chef:'Chef', agent:'Agent', citizen:'Citoyen'
          }
          return (
            <div key={c.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-sm"
                style={{ background: roleColor }}>
                {name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div className={`flex flex-col max-w-[75%] gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{isMe ? 'Vous' : name}</span>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: roleColor }}>
                    {ROLE_LABELS[c.user?.role ?? ''] ?? c.user?.role ?? ''}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-400">
                    {new Date(c.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>
                <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed font-medium shadow-sm
                  ${isMe ? 'text-white rounded-tr-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'}`}
                  style={isMe ? { background: roleColor } : {}}>
                  {c.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex gap-2">
          <input
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            placeholder="Ajouter un commentaire interne…"
            className="flex-1 text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800 font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
          />
          <button onClick={onSend} disabled={sending || !text.trim()}
            className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white flex items-center justify-center flex-shrink-0 transition-all shadow-sm">
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
        <p className="text-[9px] text-slate-400 dark:text-slate-550 mt-1.5">Entrée pour envoyer · visible par le chef de service</p>
      </div>
    </div>
  )
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────
const DeclarationDetailDrawer: React.FC<Props> = ({
  declarationId, onClose, onAssigned, departments, currentUserId
}) => {
  const [detail,      setDetail]      = useState<DeclDetail | null>(null)
  const [photos,      setPhotos]      = useState<Photo[]>([])
  const [history,     setHistory]     = useState<HistEntry[]>([])
  const [comments,    setComments]    = useState<Comment[]>([])
  const [loading,     setLoading]     = useState(false)
  const [tab,         setTab]         = useState<'info' | 'history' | 'comments'>('info')
  const [commentText, setCommentText] = useState('')
  const [sending,     setSending]     = useState(false)
  const [assigning,   setAssigning]   = useState(false)
  const [selectedDept,setSelectedDept]= useState('')
  const [additionalDepts, setAdditionalDepts] = useState<string[]>([])
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null)
  const [imgExpanded, setImgExpanded] = useState<string | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    if (!declarationId) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/president/declarations/${declarationId}`, { headers: hdr() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDetail(data.declaration ?? null)
      setPhotos(data.photos ?? [])
      setHistory(data.history ?? [])
      setComments(data.comments ?? [])
    } catch { showToast('Erreur de chargement.', false) }
    finally { setLoading(false) }
  }, [declarationId])

  useEffect(() => {
    if (declarationId) {
      setDetail(null); setPhotos([]); setHistory([]); setComments([])
      setTab('info'); setCommentText(''); setSelectedDept(''); setAdditionalDepts([])
      load()
    }
  }, [declarationId, load])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleAssign = async () => {
    if (!detail || !selectedDept) return
    setAssigning(true)
    try {
      const ep = detail.status === 'soumise' ? 'assign' : 'reassign'
      const res = await fetch(`${API}/president/declarations/${detail.id}/${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({
          department_id: selectedDept,
          additional_department_ids: additionalDepts.filter(Boolean)
        }),
      })
      if (res.ok) {
        showToast('Déclaration assignée ✓')
        onAssigned?.()
        setTimeout(onClose, 1200)
      } else showToast('Erreur lors de l\'assignation.', false)
    } finally { setAssigning(false) }
  }

  const handleComment = async () => {
    if (!detail || !commentText.trim()) return
    setSending(true)
    try {
      const res = await fetch(`${API}/president/declarations/${detail.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({ content: commentText.trim(), channel: 'president_chef' }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments(prev => [...prev, data.comment])
        setCommentText('')
      }
    } finally { setSending(false) }
  }

  // Derived
  const s       = detail ? (STATUS[detail.status] ?? STATUS.soumise) : STATUS.soumise
  const p       = detail ? (PRIORITY[detail.priority] ?? PRIORITY.moyenne) : PRIORITY.moyenne
  const isRes   = detail && ['resolue','cloturee'].includes(detail.status)
  const canAss  = detail && ['soumise'].includes(detail.status)
  const canReas = detail && ['refusee_chef'].includes(detail.status)
  const showCom = detail && !['soumise'].includes(detail.status)

  const photosList = [...photos]
  const defaultBeforeUrl = detail?.photo_avant || detail?.photo_avant_url || detail?.photo_url || detail?.image_url
  const defaultAfterUrl = detail?.photo_apres || detail?.photo_apres_url

  if (defaultBeforeUrl && !photosList.some(ph => ph.url === defaultBeforeUrl)) {
    photosList.unshift({
      id: 'default_before',
      url: defaultBeforeUrl,
      photo_type: 'photo_avant',
      uploaded_by: detail?.citizen_id || '',
      created_at: detail?.created_at || ''
    })
  }

  if (defaultAfterUrl && !photosList.some(ph => ph.url === defaultAfterUrl)) {
    photosList.push({
      id: 'default_after',
      url: defaultAfterUrl,
      photo_type: 'photo_apres',
      uploaded_by: '',
      created_at: detail?.resolved_at || ''
    })
  }

  const beforePh = photosList.find(ph => !ph.photo_type || ph.photo_type === 'photo_avant') ?? photosList[0]
  const afterPh  = photosList.find(ph => ph.photo_type === 'photo_apres') ?? (isRes && photosList.length > 1 ? photosList[photosList.length - 1] : undefined)

  const TABS = [
    { key: 'info',    label: 'Informations', Icon: FileText,    count: 0 },
    { key: 'history', label: 'Progression',  Icon: History,     count: history.length },
    ...(showCom ? [{ key: 'comments', label: 'Commentaires', Icon: MessageSquare, count: comments.length }] : []),
  ] as const

  if (!declarationId) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        style={{ animation: 'fadeIn .2s ease' }}
        onClick={onClose} />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-bold ${toast.ok ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={{ animation: 'fadeInDown .2s ease' }}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Image lightbox */}
      {imgExpanded && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur flex items-center justify-center"
          onClick={() => setImgExpanded(null)}>
          <img src={imgExpanded} alt="Photo" className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain shadow-2xl" />
          <button className="absolute top-5 right-5 w-10 h-10 bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 rounded-full flex items-center justify-center text-white transition-all">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-[101] w-full max-w-[600px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800 overflow-hidden"
        style={{ animation: 'slideInRight .25s cubic-bezier(.22,1,.36,1)' }}>

        <style>{`
          @keyframes fadeIn        { from{opacity:0}                       to{opacity:1}                    }
          @keyframes fadeInDown    { from{opacity:0;transform:translate(-50%,-10px)} to{opacity:1;transform:translate(-50%,0)} }
          @keyframes slideInRight  { from{transform:translateX(100%)}      to{transform:translateX(0)}      }
        `}</style>

        {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/60 bg-transparent">
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <ArrowLeft size={14} /> Fermer
          </button>
          <div className="flex items-center gap-2">
            {detail && !loading && (
              <>
                <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">{detail.ref_citoyen}</span>
                <StatusBadge status={detail.status} />
              </>
            )}
            {loading && <Skel w="w-32" h="h-5" />}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={load}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-350 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-350 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* ── PHOTO STRIP ───────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 h-36 bg-slate-100 dark:bg-slate-800/50 overflow-hidden">
          {loading ? (
            <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ) : photosList.length > 0 ? (
            <div className="flex h-full gap-px">
              {/* Before */}
              <div className="flex-1 relative cursor-pointer" onClick={() => beforePh && setImgExpanded(beforePh.url)}>
                <img src={beforePh?.url} alt="Avant" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-red-500/90 text-white text-[9px] font-black uppercase tracking-wide">
                  AVANT
                </span>
              </div>
              {/* After */}
              <div className={`flex-1 relative ${afterPh ? 'cursor-pointer' : ''}`}
                onClick={() => afterPh && setImgExpanded(afterPh.url)}>
                {afterPh ? (
                  <>
                    <img src={afterPh.url} alt="Après" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-emerald-500/90 text-white text-[9px] font-black uppercase tracking-wide">
                      APRÈS
                    </span>
                  </>
                ) : (
                  <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex flex-col items-center justify-center gap-2">
                    <Camera size={20} className="text-slate-400 dark:text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 text-center px-2 leading-tight">Photo après résolution</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 dark:text-slate-500">
              <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                <ImageIcon size={16} className="text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider">Aucune photo jointe</p>
            </div>
          )}
        </div>

        {/* ── TITLE BLOCK ───────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
          {loading ? (
            <div className="space-y-2"><Skel h="h-5" w="w-3/4" /><Skel h="h-3" w="w-1/2" /></div>
          ) : detail && (
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">{detail.title}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {detail.category && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      <Tag size={9} /> {detail.category}
                    </span>
                  )}
                  {detail.delegations?.name && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      <MapPin size={9} /> {detail.delegations.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <Calendar size={9} /> {fmtShort(detail.created_at)}
                  </span>
                  {detail.votes_count > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-blue-500">
                      <ThumbsUp size={9} /> {detail.votes_count}
                    </span>
                  )}
                  {detail.priority_score > 0 && (
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                      Score: <span className="text-red-500">{detail.priority_score}</span>
                    </span>
                  )}
                </div>
              </div>
              <span className="flex-shrink-0 text-[10px] font-black px-3 py-1.5 rounded-xl"
                style={{ color: p.color, background: p.bg }}>
                {p.label}
              </span>
            </div>
          )}
        </div>

        {/* ── TABS ──────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex border-b border-slate-100 dark:border-slate-800/60">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                tab === t.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}>
              <t.Icon size={12} />
              {t.label}
              {t.count > 0 && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT (flex-1, scrollable) ─────────────────────────────── */}
        <div className="flex-1 overflow-hidden relative min-h-0">

          {/* INFO TAB */}
          {tab === 'info' && (
            <div className="absolute inset-0 overflow-y-auto bg-transparent">
              <div className="px-6 py-5 space-y-5">

                {/* Description */}
                <div className="bg-blue-50/55 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100/60 dark:border-blue-900/30">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 dark:text-blue-300 mb-2">Description du citoyen</p>
                  {loading ? (
                    <div className="space-y-1.5"><Skel /><Skel w="w-3/4" /></div>
                  ) : (
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                      {detail?.description || <span className="italic text-slate-400 dark:text-slate-500">Aucune description.</span>}
                    </p>
                  )}
                </div>

                {/* Key info rows */}
                {loading ? (
                  <div className="bg-white/85 dark:bg-slate-900/40 backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <Skel w="w-8" h="h-8" />
                        <div className="flex-1 space-y-1"><Skel h="h-2" w="w-16" /><Skel h="h-4" /></div>
                      </div>
                    ))}
                  </div>
                ) : detail && (
                  <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-1">
                    <InfoRow icon={Hash} label="Références">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-600">{detail.ref_citoyen}</span>
                        {detail.ref_service && <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{detail.ref_service}</span>}
                      </div>
                    </InfoRow>
                    <InfoRow icon={Calendar} label="Soumise le">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{fmt(detail.created_at)}</p>
                    </InfoRow>
                    <InfoRow icon={User} label="Citoyen déclarant">
                      {detail.citizen ? (
                        <div className="flex items-center gap-2.5 mt-0.5">
                          <Avatar name={`${detail.citizen.first_name} ${detail.citizen.last_name}`} role="citizen" />
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{detail.citizen.first_name} {detail.citizen.last_name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-400">{detail.citizen.email}</p>
                            {detail.citizen.phone && <p className="text-[10px] text-slate-400 dark:text-slate-400">{detail.citizen.phone}</p>}
                          </div>
                        </div>
                      ) : <p className="text-sm text-slate-400 dark:text-slate-400 italic">Non renseigné</p>}
                    </InfoRow>
                    <InfoRow icon={MapPin} label="Localisation">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{detail.address || detail.delegations?.name || '—'}</p>
                      {detail.latitude && detail.longitude && (
                        <p className="text-[10px] font-mono text-slate-400 dark:text-slate-400 mt-0.5">
                          {detail.latitude.toFixed(5)}, {detail.longitude.toFixed(5)}
                        </p>
                      )}
                    </InfoRow>
                  </div>
                )}

                {/* Assigned team card */}
                {!loading && detail && ['assignee_chef','assignee_agent','en_cours','resolue','cloturee'].includes(detail.status) && (
                  <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-3">Équipe assignée</p>
                    <div className="space-y-3">
                      {detail.department && (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-black text-[10px] border border-blue-100 dark:border-blue-900/30 flex-shrink-0">
                            {detail.department.code}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{detail.department.name_fr || detail.department.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">Département</p>
                          </div>
                          <Building2 size={14} className="text-slate-200 dark:text-slate-700 ml-auto" />
                        </div>
                      )}
                      {detail.chef && (
                        <div className="flex items-center gap-3">
                          <Avatar name={`${detail.chef.first_name} ${detail.chef.last_name}`} role="chef" />
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{detail.chef.first_name} {detail.chef.last_name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{detail.chef.email}</p>
                            <p className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">Chef de service</p>
                          </div>
                        </div>
                      )}
                      {detail.agent && (
                        <div className="flex items-center gap-3">
                          <Avatar name={`${detail.agent.first_name} ${detail.agent.last_name}`} role="agent" />
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{detail.agent.first_name} {detail.agent.last_name}</p>
                            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Agent terrain</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Resolved banner */}
                {!loading && isRes && detail?.resolved_at && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 p-4 flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">Intervention résolue</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{fmt(detail.resolved_at)}</p>
                    </div>
                  </div>
                )}

                {/* Citizen rating */}
                {!loading && detail?.status === 'cloturee' && detail.rating && (
                  <div className="bg-amber-50/50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">Évaluation du citoyen</p>
                    <Stars score={detail.rating.score} />
                    {detail.rating.comment && (
                      <p className="text-xs text-amber-800 dark:text-amber-300 italic mt-2 leading-relaxed">«{detail.rating.comment}»</p>
                    )}
                  </div>
                )}

                {/* Reject reason */}
                {!loading && detail && ['refusee_chef','refusee_agent'].includes(detail.status) && (() => {
                  const lastRefuse = history.find(h => ['refusee_chef','refusee_agent'].includes(h.new_status))
                  return lastRefuse?.raison ? (
                    <div className="bg-red-50/50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={14} className="text-red-500" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Motif du refus</p>
                      </div>
                      <p className="text-xs font-medium text-red-800 dark:text-red-300 leading-relaxed">«{lastRefuse.raison}»</p>
                      {lastRefuse.user && (
                        <p className="text-[10px] text-red-400 dark:text-red-500 mt-1">
                          par {lastRefuse.user.first_name} {lastRefuse.user.last_name} · {fmtShort(lastRefuse.created_at)}
                        </p>
                      )}
                    </div>
                  ) : null
                })()}

                {/* Assign / Reassign dropdown */}
                {!loading && (canAss || canReas) && (
                  <div className={`rounded-2xl border p-4 space-y-4 ${canAss ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800' : 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'}`}>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">
                        {canAss ? 'Affecter au département principal' : 'Réassigner vers le département principal'}
                      </p>
                      <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
                        className="w-full text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all">
                        <option value="">Choisir un département…</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>

                    {selectedDept && (
                      <div className="space-y-3 pt-3 border-t border-slate-200/55 dark:border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">
                            Départements additionnels (optionnel)
                          </p>
                          <button
                            type="button"
                            onClick={() => setAdditionalDepts(prev => [...prev, ''])}
                            className="text-[10px] font-black text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1"
                          >
                            + Ajouter un département
                          </button>
                        </div>
                        {additionalDepts.map((dId, idx) => (
                          <div key={idx} className="flex items-center gap-2 animate-fadeIn">
                            <select
                              value={dId}
                              onChange={e => {
                                const val = e.target.value;
                                setAdditionalDepts(prev => {
                                  const next = [...prev];
                                  next[idx] = val;
                                  return next;
                                });
                              }}
                              className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                            >
                              <option value="">Choisir un département…</option>
                              {departments
                                .filter(d => d.id !== selectedDept && !additionalDepts.some((id, i) => i !== idx && id === d.id))
                                .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                setAdditionalDepts(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center flex-shrink-0 transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {tab === 'history' && (
            <div className="absolute inset-0 overflow-y-auto bg-transparent">
              <div className="px-6 py-5">
                {loading ? (
                  <div className="space-y-4">{[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skel w="w-8" h="h-8" />
                      <div className="flex-1 space-y-1 pt-1"><Skel h="h-3" w="w-20" /><Skel h="h-2" w="w-40" /></div>
                    </div>
                  ))}</div>
                ) : (
                  <Timeline status={detail?.status ?? 'soumise'} history={history} />
                )}
              </div>
            </div>
          )}

          {/* COMMENTS TAB */}
          {tab === 'comments' && (
            <div className="absolute inset-0 flex flex-col bg-transparent">
              <CommentsTab
                comments={comments} loading={loading} sending={sending}
                text={commentText} setText={setCommentText}
                onSend={handleComment} currentUserId={currentUserId}
              />
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ─────────────────────────────────────────────────── */}
        {!loading && detail && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-955/40 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-400 leading-none">
                {detail.ref_service ?? detail.ref_citoyen}
              </p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                {detail.status === 'soumise' ? 'En attente d\'assignation' :
                 detail.status === 'refusee_chef' ? 'Nécessite réassignation' :
                 STATUS[detail.status]?.label ?? ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(canAss || canReas) ? (
                <button onClick={handleAssign} disabled={!selectedDept || assigning}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all disabled:opacity-40 shadow-lg shadow-blue-500/20">
                  {assigning ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  {canAss ? 'Assigner' : 'Réassigner'}
                </button>
              ) : (
                <button onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all">
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