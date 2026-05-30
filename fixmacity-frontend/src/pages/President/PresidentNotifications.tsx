// src/pages/President/PresidentNotifications.tsx
// Clean layout matching the reference screenshot:
// Left panel: list with search, category filter, date range, read/unread tabs, sort
// Right panel: Résumé counts + Categories breakdown + Quick date filters
// Backend required: see notifications.controller.js and notification.service.js patches

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PresidentLayout from '../../layouts/PresidentLayout'
import {
  Bell, CheckCheck, Trash2, Search, Filter,
  FileText, UserPlus, MessageSquare, CheckCircle2,
  AlertCircle, Calendar, ChevronDown, Clock,
  Eye, Inbox, Settings, Loader2, X, ChevronRight,
  Building2, MapPin, User, Image as ImageIcon, Check, Tag as TagIcon
} from 'lucide-react'

const API   = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok   = () => localStorage.getItem('fmc_token') || ''
const hdr   = () => ({ Authorization: `Bearer ${tok()}` })

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

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; dotColor: string }> = {
  NEW_DECLARATION:      { label: 'Nouvelle déclaration reçue', icon: <FileText    className="w-5 h-5"/>, color: '#16a34a', bg: '#f0fdf4', dotColor: '#16a34a' },
  STATUS_CHANGE:        { label: 'Changement de statut',       icon: <CheckCircle2 className="w-5 h-5"/>, color: '#16a34a', bg: '#f0fdf4', dotColor: '#16a34a' },
  DECLARATION_REJECTED: { label: 'Déclaration rejetée',        icon: <AlertCircle  className="w-5 h-5"/>, color: '#ef4444', bg: '#fef2f2', dotColor: '#ef4444' },
  ASSIGNED_CHEF:        { label: 'Nouvelle assignation',       icon: <UserPlus     className="w-5 h-5"/>, color: '#f97316', bg: '#fff7ed', dotColor: '#f97316' },
  ASSIGNED_AGENT:       { label: 'Assignation mise à jour',    icon: <UserPlus     className="w-5 h-5"/>, color: '#f97316', bg: '#fff7ed', dotColor: '#f97316' },
  INTERNAL_COMMENT:     { label: 'Nouveau commentaire',        icon: <MessageSquare className="w-5 h-5"/>, color: '#3b82f6', bg: '#eff6ff', dotColor: '#3b82f6' },
  DECLARATION_ACCEPTED: { label: 'Déclaration acceptée',       icon: <CheckCircle2 className="w-5 h-5"/>, color: '#16a34a', bg: '#f0fdf4', dotColor: '#16a34a' },
  DECLARATION_RESOLVED: { label: 'Déclaration résolue',        icon: <CheckCircle2 className="w-5 h-5"/>, color: '#16a34a', bg: '#f0fdf4', dotColor: '#16a34a' },
  SYSTEM:               { label: 'Système',                    icon: <Settings     className="w-5 h-5"/>, color: '#64748b', bg: '#f8fafc', dotColor: '#94a3b8' },
}
const getTypeCfg = (type: string) => TYPE_CFG[type] ?? TYPE_CFG['SYSTEM']

// ─── Category groups for sidebar ─────────────────────────────────────────────
const CATEGORIES: { key: string; label: string; icon: React.ReactNode; types: string[] }[] = [
  { key: 'declarations', label: 'Déclarations', icon: <FileText className="w-4 h-4"/>,     types: ['NEW_DECLARATION', 'STATUS_CHANGE', 'DECLARATION_ACCEPTED', 'DECLARATION_RESOLVED'] },
  { key: 'assignments',  label: 'Assignations', icon: <UserPlus className="w-4 h-4"/>,     types: ['ASSIGNED_CHEF', 'ASSIGNED_AGENT'] },
  { key: 'comments',     label: 'Commentaires', icon: <MessageSquare className="w-4 h-4"/>, types: ['INTERNAL_COMMENT'] },
  { key: 'rejections',   label: 'Missions',     icon: <AlertCircle className="w-4 h-4"/>,  types: ['DECLARATION_REJECTED'] },
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

const Sk = ({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) => (
  <div className={`${w} ${h} rounded-lg bg-slate-100 animate-pulse`} />
)

// ─── Detail drawer (right slide-in) ──────────────────────────────────────────
const DetailDrawer = ({
  notif,
  onClose,
  onDelete,
  onMarkRead,
}: {
  notif: Notif
  onClose: () => void
  onDelete: (id: string) => void
  onMarkRead: (id: string) => void
}) => {
  const [detail,   setDetail]   = useState<any>(null)
  const [photos,   setPhotos]   = useState<any[]>([])
  const [history,  setHistory]  = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [loading,  setLoading]  = useState(false)
  const [tab,      setTab]      = useState<'info' | 'history' | 'comments' | 'photos'>('info')
  const navigate = useNavigate()
  const cfg = getTypeCfg(notif.type)

  useEffect(() => {
    if (!notif.reference_id) return
    setLoading(true)
    fetch(`${API}/president/declarations/${notif.reference_id}`, { headers: hdr() })
      .then(r => r.json())
      .then(d => { setDetail(d.declaration); setPhotos(d.photos ?? []); setHistory(d.history ?? []); setComments(d.comments ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [notif.reference_id])

  const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {
    soumise:        { label: 'Soumise',         color: '#f59e0b', bg: '#fffbeb' },
    assignee_chef:  { label: 'Assignée chef',   color: '#6366f1', bg: '#eef2ff' },
    assignee_agent: { label: 'Assignée agent',  color: '#3b82f6', bg: '#eff6ff' },
    en_cours:       { label: 'En cours',        color: '#f97316', bg: '#fff7ed' },
    resolue:        { label: 'Résolue',         color: '#16a34a', bg: '#f0fdf4' },
    cloturee:       { label: 'Clôturée',        color: '#64748b', bg: '#f8fafc' },
    refusee_chef:   { label: 'Refusée chef',    color: '#ef4444', bg: '#fef2f2' },
    refusee_agent:  { label: 'Refusée agent',   color: '#ef4444', bg: '#fef2f2' },
  }

  // ── Extract context-specific info ──
  const rejectionEntry = history.find(h => h.new_status === 'refusee_chef' || h.new_status === 'refusee_agent')
  const rejectionReason = rejectionEntry?.raison || notif.body?.split('Motif :')[1]?.trim() || null
  const latestComment   = comments.filter(c => c.channel === 'president_chef').slice(-1)[0] || comments[0]
  const mainPhoto       = photos[0]

  // Panel accent colour based on notification type
  const panelAccent =
    notif.type === 'DECLARATION_REJECTED' ? { border: '#fca5a5', bg: '#fef2f2', dot: '#ef4444', label: 'Mission Refusée' } :
    notif.type === 'INTERNAL_COMMENT'     ? { border: '#c4b5fd', bg: '#f5f3ff', dot: '#8b5cf6', label: 'Nouveau Commentaire' } :
    notif.type === 'NEW_DECLARATION'      ? { border: '#86efac', bg: '#f0fdf4', dot: '#16a34a', label: 'Signalement Reçu' } :
    notif.type === 'ASSIGNED_CHEF'        ? { border: '#6ee7b7', bg: '#f0fdf4', dot: '#10b981', label: 'Mission Assignée' } :
    { border: '#e2e8f0', bg: '#f8fafc', dot: '#94a3b8', label: 'Notification' }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
        style={{ animation: 'slideRight .3s ease-out' }}>
        <style>{`@keyframes slideRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon}</div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{notif.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{timeAgo(notif.created_at)}</p>
                <span className="text-slate-300 dark:text-slate-700 text-[10px]">•</span>
                <div className="flex items-center gap-1.5">
                  <p className={`text-[10px] font-bold ${notif.is_read ? 'text-slate-400' : 'text-blue-600'}`}>
                    {notif.is_read ? 'Lue' : 'Non lue'}
                  </p>
                  {!notif.is_read && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onDelete(notif.id)}
              className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors group" title="Supprimer">
              <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-600" />
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* ── Intro Card ────────────────────────────────────────── */}
        <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="rounded-2xl border p-4 shadow-sm transition-all"
            style={{ 
              borderColor: panelAccent.border, 
              background: document.documentElement.classList.contains('dark') ? `${panelAccent.dot}10` : panelAccent.bg 
            }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${panelAccent.dot}18`, color: panelAccent.dot }}>
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: panelAccent.dot }}>{panelAccent.label}</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{notif.body}</p>

                {/* Specific motif for rejection */}
                {notif.type === 'DECLARATION_REJECTED' && rejectionReason && (
                  <div className="mt-3 px-3 py-2 bg-white/60 dark:bg-black/20 rounded-xl border border-red-100/50 dark:border-red-900/30">
                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Motif du refus</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 italic leading-relaxed">« {rejectionReason} »</p>
                  </div>
                )}

                {/* Snippet for comments */}
                {notif.type === 'INTERNAL_COMMENT' && latestComment && (
                  <div className="mt-3 px-3 py-2 bg-white/60 dark:bg-black/20 rounded-xl border border-violet-100/50 dark:border-violet-900/30">
                    <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Dernier message</p>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 line-clamp-2 italic">« {latestComment.content} »</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Declaration detail ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              <p className="text-xs font-bold text-slate-400">Chargement des détails...</p>
            </div>
          ) : !notif.reference_id ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
              <Bell className="w-12 h-12" />
              <p className="text-sm font-bold text-slate-400">Notification générale</p>
            </div>
          ) : detail ? (
            <div className="space-y-8">
              {/* Main Content Area: Fields + Photo */}
              <section>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-4">Détails de la déclaration</h3>
                <div className="flex gap-4">
                  {/* Left: Fields */}
                  <div className="flex-1 space-y-5">
                    {[
                      { icon: Building2, label: 'ID Déclaration', val: `#D-${new Date(detail.created_at).getFullYear()}-${detail.ref_citoyen || detail.id?.slice(0,4)}` },
                      { icon: TagIcon,   label: 'Catégorie',      val: detail.category?.name || detail.category_id || 'Éclairage public' },
                      { icon: MapPin,     label: 'Localisation',   val: detail.address || 'Non spécifiée' },
                    ].map(({ icon: Icon, label, val }) => (
                      <div key={label} className="flex items-start gap-3">
                        <div className="w-6 h-6 flex items-center justify-center text-slate-400 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{val}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Right: Primary Photo */}
                  {mainPhoto && (
                    <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-md rotate-2 hover:rotate-0 transition-transform flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                      <img src={mainPhoto.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Additional fields (Full width) */}
                <div className="mt-5 space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 flex items-center justify-center text-slate-400 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Description</p>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{detail.description || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 flex items-center justify-center text-slate-400 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Citoyen auteur</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{detail.citizen ? `${detail.citizen.first_name} ${detail.citizen.last_name}` : '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 flex items-center justify-center text-slate-400 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date de soumission</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{fmt(detail.created_at)}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Map Placeholder */}
              <div className="rounded-2xl h-32 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 overflow-hidden relative group">
                <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v10/static/pin-s+ff0000(0,0)/0,0,1/400x200?access_token=pk.placeholder')] bg-cover bg-center grayscale group-hover:grayscale-0 transition-all opacity-60 dark:opacity-40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Sousse, Tunisie</div>
              </div>

              {/* Actions Rapides */}
              <section className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-4">Actions rapides</h3>
                <button
                  onClick={() => {
                    if (notif.reference_id) {
                      onClose()
                      navigate('/president/declarations', { state: { openDeclarationId: notif.reference_id } })
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-900/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!notif.reference_id}
                >
                  <AlertCircle className="w-4 h-4" /> Cas prioritaire
                </button>
                <button
                  onClick={() => {
                    if (notif.reference_id) {
                      onClose()
                      navigate('/president/declarations', { state: { openDeclarationId: notif.reference_id } })
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!notif.reference_id}
                >
                  <Eye className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Voir la déclaration complète <span className="ml-2 text-slate-300 dark:text-slate-700">→ →</span>
                </button>
                <button
                  onClick={() => { onMarkRead(notif.id); onClose() }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-bold transition-all"
                >
                  <CheckCheck className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Marquer comme lue
                </button>
              </section>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300">
              <AlertCircle className="w-10 h-10" />
              <p className="text-xs font-bold text-slate-400">Données indisponibles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PresidentNotifications: React.FC = () => {
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
  const todayCount  = notifs.filter(n => isToday(n.created_at)).length

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
    <PresidentLayout title="Notifications">
      <div className="flex gap-5 max-w-7xl mx-auto min-h-[calc(100vh-5rem)]">

        {/* ── LEFT: Main panel ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Toolbar row 1: search + category filter + date range */}
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une notification..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 outline-none focus:border-green-300 focus:ring-2 focus:ring-green-50 dark:focus:ring-green-900/20 transition-all"
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
                className="appearance-none pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 outline-none focus:border-green-300 cursor-pointer">
                <option value="">Toutes les catégories</option>
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Date range (simple presets) */}
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select value={datePreset} onChange={e => setDatePreset(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 outline-none focus:border-green-300 cursor-pointer">
                <option value="">Toute période</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="30d">30 derniers jours</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Filters button (bulk delete when selection) */}
            {selected.size > 0 ? (
              <button onClick={deleteSelected}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100 transition-colors">
                <Trash2 className="w-4 h-4" /> Supprimer ({selected.size})
              </button>
            ) : (
             <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <Filter className="w-4 h-4" /> Filtres
              </button>
            )}
          </div>

          {/* Toolbar row 2: tabs + sort */}
          <div className="flex items-center justify-between">
            {/* Read filter tabs */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
              {([
                ['all',    'Toutes'],
                ['unread', 'Non lues'],
                ['read',   'Lues'],
              ] as const).map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    filter === k ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}>
                  {k === 'unread' && filter !== 'unread' && unreadCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  )}
                  {l}
                  {k === 'unread' && unreadCount > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${filter === 'unread' ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Sort + mark all */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Trier par :</span>
              <div className="relative">
                <select value={sortMode} onChange={e => setSortMode(e.target.value as any)}
                  className="appearance-none pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 outline-none cursor-pointer focus:border-green-300">
                  <option value="recent">Plus récentes</option>
                  <option value="oldest">Plus anciennes</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-green-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-green-200 dark:hover:border-green-800 transition-colors">
                  <CheckCheck className="w-3.5 h-3.5" /> Tout marquer lu
                </button>
              )}
            </div>
          </div>

          {/* ── List ─────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex-1">
            {loading && notifs.length === 0 ? (
              <div className="divide-y divide-slate-50">
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
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <Inbox className="w-7 h-7 text-slate-200" />
                </div>
                <p className="font-black text-slate-700">Aucune notification</p>
                <p className="text-sm text-slate-400">Modifiez les filtres ou revenez plus tard.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([dateLabel, items]) => (
                <div key={dateLabel}>
                  {/* Date group header */}
                  <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-800 first:border-t-0">
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
                            isSelected ? 'bg-green-50 dark:bg-green-900/10' : !n.is_read ? 'bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50/70 dark:hover:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}>

                          {/* Unread indicator */}
                          {!n.is_read && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
                          )}

                          {/* Checkbox */}
                          <div onClick={e => { e.stopPropagation(); setSelected(prev => { const s = new Set(prev); s.has(n.id) ? s.delete(n.id) : s.add(n.id); return s }) }}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 cursor-pointer transition-colors ${
                              isSelected ? 'bg-green-600 border-green-600' : 'border-slate-200 dark:border-slate-700 group-hover:border-slate-400 dark:group-hover:border-slate-500'
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
                            <p className={`text-sm leading-snug ${!n.is_read ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                              {n.title}
                            </p>
                            {n.body && (
                              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2 font-medium">
                                {n.body}
                              </p>
                            )}
                            {/* Action button for linked declarations */}
                            {n.reference_id && (
                              <button className="mt-2 flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:border-green-200 dark:hover:border-green-800 transition-colors opacity-0 group-hover:opacity-100">
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
                                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
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
              <div className="px-5 py-4 border-t border-slate-100 flex justify-center">
                <button onClick={() => { const next = page + 1; setPage(next); load(next) }}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
                  Charger plus de notifications <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Sidebar ───────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* Résumé */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">Résumé</span>
            </div>
            {[
              { label: 'Total notifications', value: total,        color: 'text-green-600' },
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
              <div className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Filter className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">Catégories</span>
            </div>
            {CATEGORIES.map(c => (
              <button key={c.key}
                onClick={() => setCatFilter(prev => prev === c.key ? '' : c.key)}
                className={`w-full flex items-center justify-between py-2.5 px-2 -mx-2 rounded-xl transition-colors border border-transparent ${
                  catFilter === c.key ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${catFilter === c.key ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                    {c.icon}
                  </div>
                  <span className={`text-sm font-medium ${catFilter === c.key ? 'text-green-700 font-bold' : 'text-slate-700'}`}>
                    {c.label}
                  </span>
                </div>
                <span className={`text-xs font-black ${catFilter === c.key ? 'text-green-600' : 'text-slate-500'}`}>
                  {catCounts[c.key] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Quick date filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
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
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold border-green-100 dark:border-green-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                }`}>
                <Calendar className={`w-4 h-4 ${datePreset === d.key ? 'text-green-600' : 'text-slate-400'}`} />
                {d.label}
              </button>
            ))}
            {datePreset && (
              <button onClick={() => setDatePreset('')}
                className="w-full mt-2 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                Effacer le filtre
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {drawer && <DetailDrawer notif={drawer} onClose={() => setDrawer(null)} onDelete={deleteOne} onMarkRead={markRead} />}
    </PresidentLayout>
  )
}

export default PresidentNotifications