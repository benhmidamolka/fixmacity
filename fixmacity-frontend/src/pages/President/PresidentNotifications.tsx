import React, { useState, useEffect } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import {
  Bell, Check, CheckCheck, Trash2, AlertTriangle,
  UserPlus, FileText, ThumbsUp, Settings, X,
  Zap, Activity, Shield, Info, Search, Clock,
  ArrowRight, MapPin, Calendar, User, Building2,
  ChevronRight, Loader2, Image as ImageIcon, MessageSquare
} from 'lucide-react'

const API   = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

// ─── Notification type config ─────────────────────────────────────────────────
const NOTIF_TYPES: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  URGENT_DECLARATION:   { icon: <AlertTriangle className="w-5 h-5"/>, color: '#EF4444', bg: 'bg-rose-50',    label: 'CRITIQUE'     },
  NEW_DECLARATION:      { icon: <FileText      className="w-5 h-5"/>, color: '#1557FF', bg: 'bg-blue-50',    label: 'SIGNALEMENT'  },
  STATUS_CHANGE:        { icon: <Zap           className="w-5 h-5"/>, color: '#F59E0B', bg: 'bg-amber-50',   label: 'WORKFLOW'     },
  ASSIGNED_CHEF:        { icon: <UserPlus      className="w-5 h-5"/>, color: '#10B981', bg: 'bg-emerald-50', label: 'MISSION'      },
  DECLARATION_REJECTED: { icon: <AlertTriangle className="w-5 h-5"/>, color: '#EF4444', bg: 'bg-rose-50',    label: 'ALERTE'       },
  INTERNAL_COMMENT:     { icon: <MessageSquare className="w-5 h-5"/>, color: '#8B5CF6', bg: 'bg-violet-50',  label: 'COMMENTAIRE'  },
  PROPOSITION_VOTE:     { icon: <ThumbsUp      className="w-5 h-5"/>, color: '#0891B2', bg: 'bg-cyan-50',    label: 'CONSULTATION' },
  SYSTEM:               { icon: <Settings      className="w-5 h-5"/>, color: '#64748B', bg: 'bg-slate-50',   label: 'SYSTÈME'      },
}
const getCfg = (type: string) => NOTIF_TYPES[type] ?? NOTIF_TYPES['SYSTEM']

// ─── Helpers ──────────────────────────────────────────────────────────────────
const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1)  return "À l'instant"
  if (m < 60) return `il y a ${m}min`
  if (h < 24) return `il y a ${h}h`
  return `il y a ${d}j`
}
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const isUrgent = (n: any) =>
  n.type === 'URGENT_DECLARATION' ||
  n.type === 'DECLARATION_REJECTED' ||
  (n.title ?? '').toLowerCase().includes('urgent') ||
  (n.title ?? '').toLowerCase().includes('crucial') ||
  (n.title ?? '').toLowerCase().includes('refusée')

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  soumise:        { label: 'Soumise',        color: '#64748B', bg: '#F8FAFC' },
  assignee_chef:  { label: 'Assignée chef',  color: '#F59E0B', bg: '#FFFBEB' },
  assignee_agent: { label: 'Assignée agent', color: '#3B82F6', bg: '#EFF6FF' },
  en_cours:       { label: 'En cours',       color: '#8B5CF6', bg: '#F5F3FF' },
  resolue:        { label: 'Résolue',        color: '#10B981', bg: '#ECFDF5' },
  cloturee:       { label: 'Clôturée',       color: '#059669', bg: '#D1FAE5' },
  refusee_chef:   { label: 'Refusée chef',   color: '#EF4444', bg: '#FEF2F2' },
  refusee_agent:  { label: 'Refusée agent',  color: '#EF4444', bg: '#FEF2F2' },
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{ label: string; value: number | string; color: string; icon: React.ReactNode; sub: string }> = ({ label, value, color, icon, sub }) => (
  <div className="group bg-white rounded-[2.5rem] p-8 border border-slate-200/60 hover:border-blue-400/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all duration-500 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-bl-[5rem] -mr-10 -mt-10 group-hover:bg-blue-50/50 transition-colors duration-500" />
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500"
             style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</p>
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{sub}</p>
        </div>
      </div>
      <div className="text-4xl font-black text-[#0A1628] tracking-tight">{value}</div>
    </div>
  </div>
)

// ─── Detail Drawer ────────────────────────────────────────────────────────────
const DetailDrawer: React.FC<{ notif: any; onClose: () => void }> = ({ notif, onClose }) => {
  const [detail,  setDetail]  = useState<any>(null)
  const [photos,  setPhotos]  = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [comments,setComments]= useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tab,     setTab]     = useState<'info'|'history'|'comments'|'photos'>('info')

  const cfg = getCfg(notif.type)

  useEffect(() => {
    const refId = notif.reference_id
    if (!refId) return
    setLoading(true)
    fetch(`${API}/president/declarations/${refId}`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        setDetail(d.declaration ?? null)
        setPhotos(d.photos ?? [])
        setHistory(d.history ?? [])
        setComments(d.comments ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [notif.reference_id])

  const statusMeta = detail ? (STATUS_META[detail.status] ?? { label: detail.status, color: '#64748B', bg: '#F8FAFC' }) : null

  return (
    <div className="fixed inset-0 z-[150] flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-[480px] bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'slideInRight .25s cubic-bezier(.22,1,.36,1) forwards' }}>

        {/* ── Drawer header ── */}
        <div className="flex-shrink-0 border-b border-slate-100 px-6 pt-6 pb-5">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
              style={{ color: cfg.color }}>
              {cfg.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-[#0A1628] text-base leading-tight">{notif.title}</h2>
                {isUrgent(notif) && (
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-lg bg-red-500 text-white flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5"/> URGENT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-1">{fmt(notif.created_at)}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 flex-shrink-0 transition-all">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Notification body */}
          <div className="mt-4 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-sm text-slate-600 font-semibold leading-relaxed">{notif.body || '—'}</p>
          </div>

          {/* Status read badge */}
          <div className="flex items-center gap-2 mt-3">
            <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg ${notif.is_read ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
              {notif.is_read ? '✓ Lu' : '● Non lu'}
            </span>
            <span className="text-[9px] font-black px-2.5 py-1 rounded-lg" style={{ background: `${cfg.color}15`, color: cfg.color }}>
              {cfg.label}
            </span>
          </div>
        </div>

        {/* ── Declaration detail section ── */}
        {notif.reference_id ? (
          loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[#1557FF] animate-spin" />
            </div>
          ) : detail ? (
            <>
              {/* Tabs */}
              <div className="flex-shrink-0 flex border-b border-slate-100">
                {([
                  ['info',     'Déclaration'],
                  ['history',  `Historique (${history.length})`],
                  ['comments', `Commentaires (${comments.length})`],
                  ['photos',   `Photos (${photos.length})`],
                ] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setTab(v as any)}
                    className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${tab === v ? 'border-[#1557FF] text-[#1557FF]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                    {l}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">

                {/* ── Info tab ── */}
                {tab === 'info' && (
                  <div className="space-y-4">
                    {/* Status badge */}
                    {statusMeta && (
                      <div className="flex items-center gap-3 p-4 rounded-2xl border"
                        style={{ background: statusMeta.bg, borderColor: `${statusMeta.color}30` }}>
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: statusMeta.color }} />
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: statusMeta.color }}>Statut actuel</p>
                          <p className="text-sm font-black text-[#0A1628]">{statusMeta.label}</p>
                        </div>
                      </div>
                    )}

                    {/* Key info rows */}
                    {[
                      { icon: FileText,  label: 'Titre',          val: detail.title },
                      { icon: FileText,  label: 'Réf. citoyen',   val: detail.ref_citoyen ?? '—' },
                      { icon: FileText,  label: 'Réf. service',   val: detail.ref_service  ?? '—' },
                      { icon: Building2, label: 'Département',     val: detail.department?.name ?? detail.department?.name_fr ?? '—' },
                      { icon: User,      label: 'Citoyen',         val: detail.citizen ? `${detail.citizen.first_name} ${detail.citizen.last_name}` : '—' },
                      { icon: User,      label: 'Agent assigné',   val: detail.agent   ? `${detail.agent.first_name} ${detail.agent.last_name}`   : 'Non assigné' },
                      { icon: MapPin,    label: 'Adresse',         val: detail.address ?? '—' },
                      { icon: Calendar,  label: 'Soumise le',      val: fmt(detail.created_at) },
                    ].map(({ icon: Icon, label, val }) => (
                      <div key={label} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5 break-words">{val}</p>
                        </div>
                      </div>
                    ))}

                    {detail.description && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Description</p>
                        <p className="text-xs text-slate-600 font-semibold leading-relaxed">{detail.description}</p>
                      </div>
                    )}

                    {/* Votes / score */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                        <p className="text-xl font-black text-blue-600">{detail.votes_count ?? 0}</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-blue-400">Votes</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                        <p className="text-xl font-black text-amber-600">{detail.priority_score ?? 0}</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-amber-400">Score urgence</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── History tab ── */}
                {tab === 'history' && (
                  history.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold">Aucun historique</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {history.map((h: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="w-2 h-2 rounded-full bg-[#1557FF] flex-shrink-0 mt-1.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-black text-slate-400 uppercase">{h.old_status}</span>
                              <ChevronRight className="w-3 h-3 text-slate-300" />
                              <span className="text-[9px] font-black text-[#1557FF] uppercase">{h.new_status}</span>
                            </div>
                            {h.raison && <p className="text-[10px] text-slate-500 font-semibold mt-0.5 italic">"{h.raison}"</p>}
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {h.user ? `${h.user.first_name} ${h.user.last_name}` : 'Système'} · {fmt(h.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* ── Comments tab ── */}
                {tab === 'comments' && (
                  comments.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold">Aucun commentaire interne</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c: any) => (
                        <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-6 h-6 rounded-lg bg-[#1557FF] flex items-center justify-center text-white text-[8px] font-black flex-shrink-0">
                              {c.user?.first_name?.[0]}{c.user?.last_name?.[0]}
                            </div>
                            <p className="text-[9px] font-black text-slate-500">
                              {c.user ? `${c.user.first_name} ${c.user.last_name}` : '—'}
                              <span className="ml-1 text-slate-300 font-semibold">·</span>
                              <span className="ml-1 font-semibold text-slate-400">{fmt(c.created_at)}</span>
                            </p>
                          </div>
                          <p className="text-xs text-slate-700 font-semibold leading-relaxed">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* ── Photos tab ── */}
                {tab === 'photos' && (
                  photos.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold">Aucune photo</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {photos.map((p: any) => (
                        <div key={p.id} className="rounded-2xl overflow-hidden border border-slate-100 aspect-square bg-slate-100">
                          <img src={p.url} alt={p.photo_type ?? 'Photo'}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
              <FileText className="w-8 h-8 opacity-30" />
              <p className="text-xs font-bold">Déclaration introuvable</p>
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 px-6">
            <Info className="w-8 h-8 opacity-30" />
            <p className="text-xs font-bold text-center">Cette notification n'est pas liée à une déclaration spécifique.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PresidentNotifications: React.FC = () => {
  const [notifs,   setNotifs]   = useState<any[]>([])
  const [filter,   setFilter]   = useState('all')
  const [typeF,    setTypeF]    = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [drawer,   setDrawer]   = useState<any | null>(null)

  // ── Load ──
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/notifications?limit=100`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.notifications) setNotifs(data.notifications)
        }
      } catch {}
      setLoading(false)
    }
    load()
    // Poll every 60s as fallback
    const poll = setInterval(() => {
      fetch(`${API}/notifications?limit=100`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json()).then(d => { if (d.notifications) setNotifs(d.notifications) }).catch(() => {})
    }, 60000)
    return () => clearInterval(poll)
  }, [])

  // ── Mark one read ── (calls API + updates state)
  const markRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    // Optimistic update
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    // Also update drawer if open
    setDrawer((d: any) => d?.id === id ? { ...d, is_read: true } : d)
    try {
      await fetch(`${API}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` }
      })
    } catch {}
  }

  // ── Mark all read ──
  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    try {
      await fetch(`${API}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` }
      })
    } catch {}
  }

  // ── Delete ──
  const deleteNotif = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setNotifs(prev => prev.filter(n => n.id !== id))
    setSelected(prev => prev.filter(s => s !== id))
    if (drawer?.id === id) setDrawer(null)
  }

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const deleteSelected = () => {
    setNotifs(prev => prev.filter(n => !selected.includes(n.id)))
    setSelected([])
  }

  // ── Open detail drawer + auto-mark read ──
  const openDrawer = (n: any) => {
    setDrawer(n)
    if (!n.is_read) markRead(n.id)
  }

  // ── Filter & sort ──
  const filtered = notifs.filter(n => {
    if (filter === 'unread' && n.is_read)   return false
    if (filter === 'read'   && !n.is_read)  return false
    if (typeF && n.type !== typeF)           return false
    if (search) {
      const q = search.toLowerCase()
      if (!(n.title ?? '').toLowerCase().includes(q) && !(n.body ?? '').toLowerCase().includes(q)) return false
    }
    return true
  }).sort((a, b) => {
    const ua = isUrgent(a), ub = isUrgent(b)
    if (ua && !ub) return -1
    if (!ua && ub)  return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const unreadCount = notifs.filter(n => !n.is_read).length
  const todayCount  = notifs.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString()).length
  const urgentCount = notifs.filter(isUrgent).length

  // ── Loading state ──
  if (loading) return (
    <PresidentLayout title="Centre de Notifications">
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-[3px] border-slate-100 border-t-[#1557FF] rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Chargement…</p>
      </div>
    </PresidentLayout>
  )

  return (
    <PresidentLayout title="Centre de Notifications">
      <style>{`
        @keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
      `}</style>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* ── Header ── */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-black text-[#0A1628] tracking-tight mb-3">Centre d'Alerte</h1>
            <p className="text-sm font-medium text-slate-400 italic">Pilotage temps réel des événements et urgences municipales.</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={markAllRead}
              className="h-14 px-8 rounded-2xl bg-white border border-slate-200 text-[#0A1628] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-[0.98]">
              <CheckCheck className="w-5 h-5 text-[#1557FF]" /> Tout marquer lu
            </button>
            {selected.length > 0 && (
              <button onClick={deleteSelected}
                className="h-14 px-8 rounded-2xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-[0.98] flex items-center gap-3">
                <Trash2 className="w-5 h-5" /> Supprimer ({selected.length})
              </button>
            )}
          </div>
        </div>

        {/* ── KPI row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-12">
          <KpiCard label="Non lues"    value={unreadCount}  sub="FLUX ACTIF"      color="#EF4444" icon={<Bell      className="w-6 h-6"/>} />
          <KpiCard label="Aujourd'hui" value={todayCount}   sub="SEGMENT 24H"     color="#1557FF" icon={<Activity  className="w-6 h-6"/>} />
          <KpiCard label="Urgentes"    value={urgentCount}  sub="ACTION REQUISE"  color="#F97316" icon={<AlertTriangle className="w-6 h-6"/>} />
          <KpiCard label="Total"       value={notifs.length}sub="ARCHIVE GLOBALE" color="#10B981" icon={<Shield    className="w-6 h-6"/>} />
        </div>

        {/* ── Main card ── */}
        <div className="bg-white rounded-[3.5rem] border border-slate-200/60 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.04)] overflow-hidden">

          {/* Toolbar */}
          <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/30 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            {/* Tab switcher */}
            <div className="flex items-center gap-1 bg-white p-1.5 rounded-[1.5rem] border border-slate-200 shadow-sm self-start">
              {([
                ['all',    `Toutes (${notifs.length})`],
                ['unread', `Non lues (${unreadCount})`],
                ['read',   'Lues'],
              ] as const).map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === k ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                  {l}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Search */}
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#1557FF] transition-colors" />
                <input type="text" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-12 pr-5 h-12 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-[#0A1628] placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#1557FF]/30 transition-all w-60" />
              </div>

              {/* Type filter */}
              <select value={typeF} onChange={e => setTypeF(e.target.value)}
                className="h-12 bg-white border border-slate-200 rounded-2xl px-5 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none cursor-pointer hover:border-[#1557FF]/30 transition-all">
                <option value="">Tous les types</option>
                <option value="NEW_DECLARATION">Signalements</option>
                <option value="URGENT_DECLARATION">Urgences</option>
                <option value="DECLARATION_REJECTED">Refus</option>
                <option value="STATUS_CHANGE">Workflows</option>
                <option value="INTERNAL_COMMENT">Commentaires</option>
                <option value="PROPOSITION_VOTE">Consultations</option>
                <option value="SYSTEM">Système</option>
              </select>
            </div>
          </div>

          {/* ── List ── */}
          <div className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <div className="py-32 text-center">
                <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center mx-auto mb-8 text-slate-200 shadow-inner">
                  <Bell className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-[#0A1628] tracking-tight">Signal Néant</h3>
                <p className="text-slate-400 font-medium mt-2 italic">Aucune alerte correspondante.</p>
              </div>
            ) : (
              filtered.map(n => {
                const cfg        = getCfg(n.type)
                const isSelected = selected.includes(n.id)
                const urgent     = isUrgent(n)

                return (
                  <div key={n.id}
                    onClick={() => openDrawer(n)}
                    className={`flex items-start gap-8 px-10 py-7 transition-all cursor-pointer group relative ${!n.is_read ? 'bg-blue-50/30' : 'hover:bg-slate-50'} ${isSelected ? 'bg-blue-50/60' : ''}`}>

                    {/* Unread left bar */}
                    {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1557FF]" />}

                    {/* Checkbox */}
                    <div
                      onClick={e => toggleSelect(n.id, e)}
                      className={`w-6 h-6 rounded-xl border-2 mt-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'border-[#1557FF] bg-[#1557FF] shadow-lg shadow-blue-500/20' : 'border-slate-200 group-hover:border-[#1557FF]/30 bg-white'}`}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>

                    {/* Type icon */}
                    <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-100 group-hover:scale-105 transition-transform duration-300 ${cfg.bg}`}
                      style={{ color: cfg.color }}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-start justify-between gap-4 mb-1.5">
                        <div className="flex items-center flex-wrap gap-3">
                          <h3 className={`text-base tracking-tight leading-snug ${!n.is_read ? 'font-black text-[#0A1628]' : 'font-bold text-slate-500'}`}>
                            {n.title}
                          </h3>
                          {/* Type label */}
                          <span className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${cfg.bg}`} style={{ color: cfg.color }}>
                            {cfg.label}
                          </span>
                          {/* Urgent badge */}
                          {urgent && (
                            <span className="px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-lg bg-rose-500 text-white shadow-lg shadow-rose-500/25 flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5" /> CRITIQUE
                            </span>
                          )}
                          {/* Unread badge */}
                          {!n.is_read && (
                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-[8px] font-black text-[#1557FF] flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1557FF]" /> NOUVEAU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300 flex-shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{timeAgo(n.created_at)}</span>
                        </div>
                      </div>

                      <p className={`text-sm leading-relaxed max-w-2xl ${!n.is_read ? 'text-slate-600 font-medium' : 'text-slate-400 italic'}`}>
                        {n.body}
                      </p>

                      {/* "Voir détails" hint */}
                      {n.reference_id && (
                        <p className="text-[9px] font-black text-[#1557FF] mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          Cliquer pour voir les détails <ArrowRight className="w-3 h-3" />
                        </p>
                      )}
                    </div>

                    {/* Row actions (hover) */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 translate-x-3 group-hover:translate-x-0 pt-2">
                      {/* Lu button — only shows when unread */}
                      {!n.is_read && (
                        <button
                          onClick={e => markRead(n.id, e)}
                          className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-[#1557FF] hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
                          title="Marquer comme lu">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {/* Delete button — always visible on hover */}
                      <button
                        onClick={e => deleteNotif(n.id, e)}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all shadow-sm"
                        title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-center gap-3">
            <Info className="w-4 h-4 text-slate-300" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
              Notifications synchronisées avec les pôles opérationnels
            </p>
          </div>
        </div>
      </div>

      {/* ── Detail Drawer ── */}
      {drawer && (
        <DetailDrawer notif={drawer} onClose={() => setDrawer(null)} />
      )}
    </PresidentLayout>
  )
}

export default PresidentNotifications