import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, ArrowLeft, MapPin, Calendar, User, Tag, Activity,
  ChevronRight, CheckCircle2, Clock, Image as ImageIcon,
  Send, Loader2, Building2, Users, FileText, AlertTriangle,
  ThumbsUp, Star, History, MessageSquare, Camera
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''
const hdr = () => ({ Authorization: `Bearer ${tok()}` })
const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const fmtShort = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Status / priority config ─────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  soumise:        { label: 'Soumise',         color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B' },
  assignee_chef:  { label: 'Assignée — Chef', color: '#6366F1', bg: '#EEF2FF', dot: '#6366F1' },
  assignee_agent: { label: 'Assignée — Agent',color: '#3B82F6', bg: '#EFF6FF', dot: '#3B82F6' },
  en_cours:       { label: 'En cours',        color: '#F97316', bg: '#FFF7ED', dot: '#F97316' },
  resolue:        { label: 'Résolue',         color: '#10B981', bg: '#ECFDF5', dot: '#10B981' },
  cloturee:       { label: 'Clôturée',        color: '#64748B', bg: '#F8FAFC', dot: '#64748B' },
  refusee_chef:   { label: 'Refusée — Chef',  color: '#EF4444', bg: '#FEF2F2', dot: '#EF4444' },
  refusee_agent:  { label: 'Refusée — Agent', color: '#DC2626', bg: '#FEF2F2', dot: '#DC2626' },
}

const STEPS = [
  { key: 'soumise',        label: 'Soumis'     },
  { key: 'assignee_chef',  label: 'Assigné'    },
  { key: 'assignee_agent', label: 'En équipe'  },
  { key: 'en_cours',       label: 'En cours'   },
  { key: 'resolue',        label: 'Résolu'     },
  { key: 'cloturee',       label: 'Clôturé'    },
]

const CHANNEL_CFG: Record<string, { label: string; color: string; bg: string }> = {
  president_chef: { label: 'Président → Chef',  color: '#6366F1', bg: '#EEF2FF' },
  chef_agent:     { label: 'Chef → Agent',      color: '#0EA5E9', bg: '#E0F2FE' },
  agent_citizen:  { label: 'Agent → Citoyen',   color: '#10B981', bg: '#D1FAE5' },
}

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  haute:   { label: 'Urgente', color: '#EF4444', bg: '#FEF2F2' },
  high:    { label: 'Urgente', color: '#EF4444', bg: '#FEF2F2' },
  moyenne: { label: 'Normale', color: '#F59E0B', bg: '#FFFBEB' },
  medium:  { label: 'Normale', color: '#F59E0B', bg: '#FFFBEB' },
  basse:   { label: 'Basse',   color: '#10B981', bg: '#ECFDF5' },
  low:     { label: 'Basse',   color: '#10B981', bg: '#ECFDF5' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const Badge = ({ label, color, bg }: { label: string; color: string; bg: string }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
    style={{ color, background: bg }}>{label}</span>
)

const Skel = ({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) => (
  <div className={`${w} ${h} rounded-lg bg-slate-100 animate-pulse`} />
)

const InfoRow = ({ icon: Icon, label, value, children }: {
  icon: any; label: string; value?: string; children?: React.ReactNode
}) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
    <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon size={13} className="text-slate-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      {children ?? <p className="text-sm font-semibold text-slate-800 leading-tight">{value || '—'}</p>}
    </div>
  </div>
)

// ─── Timeline step ────────────────────────────────────────────────────────────
const TimelineStep = ({ step, idx, currentIdx, entry }: {
  step: typeof STEPS[0]; idx: number; currentIdx: number; entry?: HistoryEntry
}) => {
  const done    = idx < currentIdx
  const current = idx === currentIdx
  const future  = idx > currentIdx

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          done    ? 'bg-emerald-500 border-emerald-500' :
          current ? 'bg-white border-blue-500 ring-4 ring-blue-50 dark:bg-slate-900 dark:ring-blue-500/10' :
                    'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
        }`}>
          {done && <CheckCircle2 size={11} className="text-white" />}
          {current && <div className="w-2 h-2 rounded-full bg-blue-500" />}
        </div>
        {idx < STEPS.length - 1 && (
          <div className={`w-0.5 flex-1 min-h-[24px] mt-1 ${done ? 'bg-emerald-300' : 'bg-slate-100 dark:bg-slate-800'}`} />
        )}
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <p className={`text-xs font-black leading-none mb-0.5 ${
          done ? 'text-emerald-700' : current ? 'text-blue-700' : 'text-slate-300'
        }`}>{step.label}</p>
        {entry && (
          <div className="mt-1 space-y-0.5">
            <p className="text-[10px] text-slate-500 font-medium">{fmtShort(entry.created_at)}</p>
            {entry.user && (
              <p className="text-[10px] text-slate-400">
                par {entry.user.first_name} {entry.user.last_name}
              </p>
            )}
            {entry.raison && (
              <p className="text-[10px] text-red-500 font-medium italic">«{entry.raison}»</p>
            )}
          </div>
        )}
        {future && <p className="text-[10px] text-slate-300 font-medium">En attente</p>}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
const DeclarationDetailDrawer: React.FC<Props> = ({
  declarationId, onClose, onAssigned, departments, currentUserId
}) => {
  const [detail, setDetail]         = useState<DeclDetail | null>(null)
  const [photos, setPhotos]         = useState<Photo[]>([])
  const [history, setHistory]       = useState<HistoryEntry[]>([])
  const [comments, setComments]     = useState<Comment[]>([])
  const [loading, setLoading]       = useState(false)
  const [tab, setTab]               = useState<'info' | 'history' | 'comments'>('info')
  const [commentText, setCommentText] = useState('')
  const [commentChannel, setCommentChannel] = useState<'president_chef' | 'chef_agent' | 'agent_citizen'>('president_chef')
  const [sendingComment, setSendingComment] = useState(false)
  const [assigning, setAssigning]   = useState(false)
  const [selectedDept, setSelectedDept] = useState('')
  const [imgIdx, setImgIdx]         = useState(0)
  const commentsEndRef = useRef<HTMLDivElement>(null)

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
      // ignore
    } finally {
      setLoading(false)
    }
  }, [declarationId])

  useEffect(() => {
    if (declarationId) {
      setDetail(null); setPhotos([]); setHistory([]); setComments([])
      setTab('info'); setImgIdx(0); setCommentText('')
      load()
    }
  }, [declarationId, load])

  useEffect(() => {
    if (tab === 'comments') commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments, tab])

  const handleAssign = async () => {
    if (!detail || !selectedDept) return
    setAssigning(true)
    try {
      const res = await fetch(`${API}/president/declarations/${detail.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({ department_id: selectedDept }),
      })
      if (res.ok) { onAssigned?.(); onClose() }
    } finally { setAssigning(false) }
  }

  const handleComment = async () => {
    if (!detail || !commentText.trim()) return
    setSendingComment(true)
    try {
      const res = await fetch(`${API}/president/declarations/${detail.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({ content: commentText.trim(), channel: commentChannel }),
      })
      if (res.ok) {
        setCommentText('')
        await load()
      }
    } finally { setSendingComment(false) }
  }

  // Derived
  const s        = detail ? (STATUS[detail.status] || STATUS.soumise) : STATUS.soumise
  const p        = detail ? (PRIORITY_CFG[detail.priority] || PRIORITY_CFG.moyenne) : PRIORITY_CFG.moyenne
  const stepIdx  = detail ? STEPS.findIndex(st => st.key === detail.status) : 0
  const isAssigned = detail && ['assignee_chef', 'assignee_agent', 'en_cours', 'resolue', 'cloturee'].includes(detail.status)
  const isResolved = detail && ['resolue', 'cloturee'].includes(detail.status)
  const beforePhoto = photos.find(p => p.photo_type === 'before' || !p.photo_type) || photos[0]
  const afterPhoto  = photos.find(p => p.photo_type === 'after') || (isResolved ? photos[photos.length - 1] : undefined)
  const allPhotos   = photos.length > 0 ? photos : []

  return (
    <AnimatePresence>
      {declarationId && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer — slides from right */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[101] w-full max-w-2xl bg-white dark:bg-slate-950 shadow-2xl flex flex-col border-l dark:border-slate-800"
          >

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <button onClick={onClose}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors text-sm font-semibold">
                <ArrowLeft size={16} />
                Retour
              </button>
              {loading ? (
                <Skel w="w-36" h="h-4" />
              ) : detail && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {detail.ref_citoyen}
                  </span>
                  <Badge label={s.label} color={s.color} bg={s.bg} />
                </div>
              )}
              <button onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* ── Photos bar ──────────────────────────────────────── */}
            {loading ? (
              <div className="h-48 bg-slate-100 dark:bg-slate-900 animate-pulse flex-shrink-0" />
            ) : allPhotos.length > 0 ? (
              <div className="relative h-48 flex-shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-900">
                {/* Before / After two-panel */}
                <div className="flex h-full">
                  {beforePhoto && (
                    <div className="flex-1 relative">
                      <img src={beforePhoto.url} alt="Avant"
                        className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-red-500/90 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                        <X size={9} /> Avant
                      </div>
                    </div>
                  )}
                  {afterPhoto ? (
                    <>
                      <div className="flex items-center justify-center w-8 bg-white z-10 flex-shrink-0">
                        <ChevronRight size={16} className="text-slate-400" />
                      </div>
                      <div className="flex-1 relative">
                        <img src={afterPhoto.url} alt="Après"
                          className="w-full h-full object-cover" />
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle2 size={9} /> Après
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center w-8 bg-white z-10 flex-shrink-0">
                        <ChevronRight size={16} className="text-slate-300" />
                      </div>
                      <div className="flex-1 bg-slate-100 flex flex-col items-center justify-center text-slate-300 gap-2">
                        <Camera size={24} />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-center px-4">
                          Photo après<br />disponible à la résolution
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Photo count pill */}
                {allPhotos.length > 2 && (
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/50 text-white text-[9px] font-black">
                    +{allPhotos.length - 2} photos
                  </div>
                )}
              </div>
            ) : (
              <div className="h-32 bg-slate-50 flex items-center justify-center flex-shrink-0">
                <div className="flex flex-col items-center gap-2 text-slate-300">
                  <ImageIcon size={24} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Aucune photo</p>
                </div>
              </div>
            )}

            {/* ── Title block ─────────────────────────────────────── */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              {loading ? (
                <div className="space-y-2">
                  <Skel h="h-6" w="w-3/4" />
                  <Skel h="h-3" w="w-1/2" />
                </div>
              ) : detail && (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-slate-800 leading-tight">{detail.title}</h2>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {detail.delegations?.name && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                          <MapPin size={10} />{detail.delegations.name}
                        </span>
                      )}
                      <span className="text-slate-300">·</span>
                      <span className="text-[10px] font-semibold text-slate-400">{fmtShort(detail.created_at)}</span>
                      {detail.votes_count > 0 && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="flex items-center gap-1 text-[10px] font-black text-blue-500">
                            <ThumbsUp size={10} />{detail.votes_count} votes
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Badge label={p.label} color={p.color} bg={p.bg} />
                  </div>
                </div>
              )}
            </div>

            {/* ── Tabs ────────────────────────────────────────────── */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 flex-shrink-0 px-6">
              {[
                { key: 'info',     label: 'Informations', icon: FileText    },
                { key: 'history',  label: 'Progression',  icon: History     },
                { key: 'comments', label: 'Commentaires', icon: MessageSquare, count: comments.length },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as any)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                    tab === t.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <t.icon size={13} />
                  {t.label}
                  {t.count != null && t.count > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                      tab === t.key ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                    }`}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Scrollable content ──────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">

              {/* ── INFO TAB ── */}
              {tab === 'info' && (
                <div className="p-6 space-y-5">

                  {/* Description card */}
                  <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-500/20">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <MessageSquare size={11} /> Description du citoyen
                    </p>
                    {loading ? (
                      <div className="space-y-1.5"><Skel /><Skel w="w-3/4" /></div>
                    ) : (
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        {detail?.description || 'Aucune description fournie.'}
                      </p>
                    )}
                  </div>

                  {/* Info rows */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-1">
                    {loading ? (
                      <div className="space-y-4 py-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex gap-3"><Skel w="w-7" h="h-7" /><div className="flex-1 space-y-1.5"><Skel h="h-2" w="w-20" /><Skel h="h-3" /></div></div>
                        ))}
                      </div>
                    ) : detail && (
                      <>
                        <InfoRow icon={Calendar} label="Date de soumission" value={fmt(detail.created_at)} />
                        <InfoRow icon={Tag} label="Catégorie" value={detail.category} />
                        <InfoRow icon={User} label="Citoyen">
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              {detail.citizen ? `${detail.citizen.first_name} ${detail.citizen.last_name}` : '—'}
                            </p>
                            {detail.citizen?.email && (
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{detail.citizen.email}</p>
                            )}
                          </div>
                        </InfoRow>
                        <InfoRow icon={MapPin} label="Localisation">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {detail.address || detail.delegations?.name || '—'}
                            </p>
                            {detail.latitude && detail.longitude && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {detail.latitude.toFixed(5)}, {detail.longitude.toFixed(5)}
                              </p>
                            )}
                          </div>
                        </InfoRow>
                        <InfoRow icon={Activity} label="État actuel">
                          <Badge label={s.label} color={s.color} bg={s.bg} />
                        </InfoRow>
                      </>
                    )}
                  </div>

                  {/* Assigned-to card — only shows when assigned */}
                  {!loading && isAssigned && detail && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Building2 size={11} /> Assigné à
                      </p>
                      <div className="space-y-2.5">
                        {detail.department && (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs border border-blue-100">
                              {detail.department.code}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{detail.department.name_fr || detail.department.name}</p>
                              <p className="text-[10px] text-slate-400">Département</p>
                            </div>
                          </div>
                        )}
                        {detail.chef && (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-black text-xs border border-purple-100">
                              {detail.chef.first_name[0]}{detail.chef.last_name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {detail.chef.first_name} {detail.chef.last_name}
                              </p>
                              <p className="text-[10px] text-slate-400">Chef de service</p>
                            </div>
                          </div>
                        )}
                        {detail.agent && (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs border border-emerald-100">
                              {detail.agent.first_name[0]}{detail.agent.last_name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {detail.agent.first_name} {detail.agent.last_name}
                              </p>
                              <p className="text-[10px] text-slate-400">Agent terrain</p>
                            </div>
                          </div>
                        )}
                        {detail.assigned_at && (
                          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-50">
                            Assigné le {fmtShort(detail.assigned_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Resolved card */}
                  {!loading && isResolved && detail?.resolved_at && (
                    <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <p className="text-sm font-black text-emerald-800">Intervention résolue</p>
                      </div>
                      <p className="text-xs text-emerald-600">
                        Résolue le {fmt(detail.resolved_at)}
                      </p>
                    </div>
                  )}

                  {/* Assign panel — only for soumise */}
                  {!loading && detail?.status === 'soumise' && (
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Users size={11} /> Affecter au département
                      </p>
                      <select
                        value={selectedDept}
                        onChange={e => setSelectedDept(e.target.value)}
                        className="w-full text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">Choisir un département…</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleAssign}
                        disabled={!selectedDept || assigning}
                        className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-black disabled:opacity-40 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        {assigning ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
                        Affecter
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── HISTORY TAB ── */}
              {tab === 'history' && (
                <div className="p-6">
                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <Skel w="w-5" h="h-5" />
                          <div className="flex-1 space-y-1.5"><Skel h="h-3" w="w-24" /><Skel h="h-2" w="w-40" /></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="dark:text-slate-200">
                      {STEPS.map((step, idx) => {
                        const entry = history.find(h =>
                          h.new_status === step.key || h.old_status === step.key
                        )
                        return (
                          <TimelineStep
                            key={step.key}
                            step={step}
                            idx={idx}
                            currentIdx={stepIdx}
                            entry={entry}
                          />
                        )
                      })}

                      {/* Refusals */}
                      {history.filter(h => h.new_status.startsWith('refusee')).map(h => (
                        <div key={h.id} className="mt-2 ml-8 bg-red-50 rounded-xl p-3 border border-red-100">
                          <p className="text-[10px] font-black text-red-600 uppercase mb-1">
                            {STATUS[h.new_status]?.label || 'Refusée'}
                          </p>
                          <p className="text-[10px] text-red-500">{fmtShort(h.created_at)}</p>
                          {h.raison && <p className="text-xs text-red-700 mt-1 italic">«{h.raison}»</p>}
                          {h.user && (
                            <p className="text-[10px] text-red-400 mt-0.5">
                              par {h.user.first_name} {h.user.last_name}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── COMMENTS TAB ── */}
              {tab === 'comments' && (
                <div className="flex flex-col h-full">
                  {/* Channel selector */}
                  <div className="px-6 pt-4 pb-2 flex gap-2 border-b border-slate-50 dark:border-slate-800">
                    {(Object.keys(CHANNEL_CFG) as Array<keyof typeof CHANNEL_CFG>).map(ch => {
                      const cfg = CHANNEL_CFG[ch]
                      return (
                        <button
                          key={ch}
                          onClick={() => setCommentChannel(ch as any)}
                          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                            commentChannel === ch
                              ? 'border-transparent'
                              : 'border-slate-200 dark:border-slate-700 text-slate-400 bg-white dark:bg-slate-800 hover:border-slate-300'
                          }`}
                          style={commentChannel === ch ? { color: cfg.color, background: cfg.bg, borderColor: 'transparent' } : {}}
                        >
                          {cfg.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Comments list */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {loading ? (
                      <div className="space-y-3">{[...Array(3)].map((_, i) => <Skel key={i} h="h-16" />)}</div>
                    ) : comments.filter(c => c.channel === commentChannel).length === 0 ? (
                      <div className="flex flex-col items-center gap-3 py-10 text-center">
                        <MessageSquare size={28} className="text-slate-200" />
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                          Aucun commentaire dans ce canal
                        </p>
                      </div>
                    ) : (
                      comments
                        .filter(c => c.channel === commentChannel)
                        .map(c => {
                          const isMe = c.user?.role === 'president'
                          return (
                            <div key={c.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 flex-shrink-0">
                                {c.user ? `${c.user.first_name[0]}${c.user.last_name[0]}` : '?'}
                              </div>
                              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                <div className={`px-3.5 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${
                                  isMe
                                    ? 'bg-blue-600 text-white rounded-tr-sm shadow-lg shadow-blue-500/20'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                                }`}>
                                  {c.content}
                                </div>
                                <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-[9px] font-bold text-slate-400">
                                    {c.user ? `${c.user.first_name} ${c.user.last_name}` : '—'}
                                  </span>
                                  <span className="text-slate-300 text-[9px]">·</span>
                                  <span className="text-[9px] text-slate-400">{fmtShort(c.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })
                    )}
                    <div ref={commentsEndRef} />
                  </div>

                  {/* Comment input */}
                  <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-950">
                    <div className="flex gap-2">
                      <input
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                        placeholder={`Message — ${CHANNEL_CFG[commentChannel]?.label}…`}
                        className="flex-1 text-sm px-4 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 font-medium text-slate-700 dark:text-slate-200"
                      />
                      <button
                        onClick={handleComment}
                        disabled={sendingComment || !commentText.trim()}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors flex-shrink-0"
                      >
                        {sendingComment
                          ? <Loader2 size={15} className="animate-spin" />
                          : <Send size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ──────────────────────────────────────────── */}
            {!loading && detail && detail.status !== 'soumise' && (
              <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-950">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-medium">
                    Réf. service : <span className="font-black text-slate-600">{detail.ref_service || '—'}</span>
                  </span>
                  {detail.started_at && (
                    <span>Intervention débutée le {fmtShort(detail.started_at)}</span>
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
