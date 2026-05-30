// src/pages/Agent/AgentNotifications.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AgentLayout from '../../layouts/AgentLayout'
import {
  Bell, CheckCheck, Trash2, Search, Filter,
  FileText, UserPlus, MessageSquare, CheckCircle2,
  AlertCircle, Calendar, ChevronDown, Clock,
  Eye, Inbox, Settings, Loader2, X, ChevronRight,
  Building2, MapPin, User, Image as ImageIcon, Check, Tag as TagIcon, Lock
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

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; dotColor: string }> = {
  NEW_DECLARATION:      { label: 'Nouvelle déclaration',       icon: <FileText    className="w-5 h-5"/>, color: '#16a34a', bg: '#f0fdf4', dotColor: '#16a34a' },
  STATUS_CHANGE:        { label: 'Changement de statut',       icon: <CheckCircle2 className="w-5 h-5"/>, color: '#16a34a', bg: '#f0fdf4', dotColor: '#16a34a' },
  DECLARATION_REJECTED: { label: 'Déclaration refusée',        icon: <AlertCircle  className="w-5 h-5"/>, color: '#ef4444', bg: '#fef2f2', dotColor: '#ef4444' },
  ASSIGNED_CHEF:        { label: 'Assignation Chef',           icon: <UserPlus     className="w-5 h-5"/>, color: '#f97316', bg: '#fff7ed', dotColor: '#f97316' },
  ASSIGNED_AGENT:       { label: 'Nouvelle mission assignée',  icon: <UserPlus     className="w-5 h-5"/>, color: '#f97316', bg: '#fff7ed', dotColor: '#f97316' },
  INTERNAL_COMMENT:     { label: 'Nouveau commentaire',        icon: <MessageSquare className="w-5 h-5"/>, color: '#3b82f6', bg: '#eff6ff', dotColor: '#3b82f6' },
  DECLARATION_ACCEPTED: { label: 'Mission acceptée',           icon: <CheckCircle2 className="w-5 h-5"/>, color: '#16a34a', bg: '#f0fdf4', dotColor: '#16a34a' },
  DECLARATION_RESOLVED: { label: 'Mission résolue',            icon: <CheckCircle2 className="w-5 h-5"/>, color: '#16a34a', bg: '#f0fdf4', dotColor: '#16a34a' },
  SYSTEM:               { label: 'Système',                    icon: <Settings     className="w-5 h-5"/>, color: '#64748b', bg: '#f8fafc', dotColor: '#94a3b8' },
}
const getTypeCfg = (type: string) => TYPE_CFG[type] ?? TYPE_CFG['SYSTEM']

// ─── Category groups for sidebar ─────────────────────────────────────────────
const CATEGORIES: { key: string; label: string; icon: React.ReactNode; types: string[] }[] = [
  { key: 'missions',     label: 'Missions',     icon: <FileText className="w-4 h-4"/>,     types: ['ASSIGNED_AGENT', 'DECLARATION_ACCEPTED', 'DECLARATION_RESOLVED', 'DECLARATION_REJECTED'] },
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

const Sk = ({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) => (
  <div className={`${w} ${h} rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse`} />
)

// ─── Status Stepper for Agent ───
const STATUS_STEPS = [
  { key: 'soumise', label: 'Soumise', color: '#D97706', bg: '#FEF3C7' },
  { key: 'assignee_chef', label: 'Chef assigné', color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'assignee_agent', label: 'Assignée', color: '#1D4ED8', bg: '#DBEAFE' },
  { key: 'en_cours', label: 'En cours', color: '#EA580C', bg: '#FFEDD5' },
  { key: 'resolue', label: 'Évaluée', color: '#15803D', bg: '#DCFCE7' },
  { key: 'cloturee', label: 'Clôturée', color: '#475569', bg: '#F1F5F9' },
]

function StatusStepper({ current }: { current: string }) {
  const activeIdx = STATUS_STEPS.findIndex(s => s.key === current)
  return (
    <div className="flex items-center gap-1.5 py-3 overflow-x-auto no-scrollbar">
      {STATUS_STEPS.map((step, i) => {
        const active = step.key === current
        const done = activeIdx > i
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                done ? 'bg-green-600 border-green-600 text-white' :
                active ? 'border-blue-600 bg-blue-50 text-blue-700 font-extrabold animate-pulse' :
                'border-slate-200 bg-slate-50 text-slate-400'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[9px] font-bold ${active ? 'text-blue-600' : done ? 'text-green-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`flex-1 h-[2px] min-w-[12px] -mt-4 transition-all ${done ? 'bg-green-500' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Detail drawer (right slide-in) ──────────────────────────────────────────
const DetailDrawer = ({
  notif,
  onClose,
  onDelete,
  onMarkRead,
  onAcceptMission,
  onRefuseMission,
  isDark
}: {
  notif: Notif
  onClose: () => void
  onDelete: (id: string) => void
  onMarkRead: (id: string) => void
  onAcceptMission: (referenceId: string) => Promise<void>
  onRefuseMission: (referenceId: string, reason: string) => Promise<void>
  isDark: boolean
}) => {
  const [detail,   setDetail]   = useState<any>(null)
  const [photos,   setPhotos]   = useState<any[]>([])
  const [history,  setHistory]  = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [loading,  setLoading]  = useState(false)
  const [tab,      setTab]      = useState<'info' | 'history' | 'comments' | 'photos'>('info')
  const [motif,    setMotif]    = useState('')
  const [showRefuse, setShowRefuse] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const cfg = getTypeCfg(notif.type)

  const fetchDetail = useCallback(() => {
    if (!notif.reference_id) return
    setLoading(true)
    fetch(`${API}/agent/declarations/${notif.reference_id}`, { headers: hdr() })
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(d => {
        setDetail(d)
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

  const handleAccept = async () => {
    if (!notif.reference_id) return
    setSubmitting(true)
    try {
      await onAcceptMission(notif.reference_id)
      fetchDetail()
    } catch {}
    finally { setSubmitting(false) }
  }

  const handleRefuse = async () => {
    if (!notif.reference_id) return
    if (!motif.trim() || motif.trim().length < 10) {
      toast.error('Le motif de refus doit faire au moins 10 caractères.')
      return
    }
    setSubmitting(true)
    try {
      await onRefuseMission(notif.reference_id, motif.trim())
      setShowRefuse(false)
      setMotif('')
      fetchDetail()
    } catch {}
    finally { setSubmitting(false) }
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // Panel accent colour
  const panelAccent =
    notif.type === 'DECLARATION_REJECTED' ? { border: '#fca5a5', bg: '#fef2f2', dot: '#ef4444', label: 'Mission Refusée' } :
    notif.type === 'INTERNAL_COMMENT'     ? { border: '#c4b5fd', bg: '#f5f3ff', dot: '#8b5cf6', label: 'Nouveau Commentaire' } :
    notif.type === 'NEW_DECLARATION'      ? { border: '#86efac', bg: '#f0fdf4', dot: '#16a34a', label: 'Signalement Reçu' } :
    notif.type === 'ASSIGNED_AGENT'       ? { border: '#6ee7b7', bg: '#f0fdf4', dot: '#10b981', label: 'Nouvelle Assignation' } :
    { border: '#e2e8f0', bg: '#f8fafc', dot: '#94a3b8', label: 'Notification' }

  const avantPhoto = photos.find(p => p.photo_type === 'avant')?.url || detail?.photo_avant
  const apresPhoto = photos.find(p => ['intervention', 'apres', 'after'].includes(p.photo_type))?.url

  const commentsLocked = detail && detail.status === 'assignee_agent'

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
              style={{ background: isDark ? `${cfg.color}15` : cfg.bg, color: cfg.color }}>{cfg.icon}</div>
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

        {/* Intro Card */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="rounded-2xl border p-4 shadow-sm"
            style={{ 
              borderColor: isDark ? `${panelAccent.dot}30` : panelAccent.border, 
              background: isDark ? `${panelAccent.dot}15` : panelAccent.bg 
            }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${panelAccent.dot}18`, color: panelAccent.dot }}>
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: panelAccent.dot }}>{panelAccent.label}</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">{notif.body}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-8 space-y-4">
              <Sk w="w-1/3" h="h-4" />
              <Sk w="w-full" h="h-24" />
              <Sk w="w-2/3" h="h-4" />
            </div>
          ) : detail ? (
            <div className="p-5 space-y-6">
              {/* Stepper */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Suivi mission</p>
                <StatusStepper current={detail.status || 'assignee_agent'} />
              </div>

              {/* Tabs selector */}
              <div className="flex border-b border-slate-100 dark:border-slate-800">
                {(['info', 'photos', 'comments', 'history'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-colors ${
                      tab === t
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}>
                    {t === 'info' ? 'Infos' : t === 'photos' ? 'Médias' : t === 'comments' ? 'Commentaires' : 'Historique'}
                  </button>
                ))}
              </div>

              {/* Tab Info */}
              {tab === 'info' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Référence Citoyen</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">{detail.ref_citoyen || '—'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Priorité</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 capitalize">{detail.priority || 'Moyenne'}</p>
                    </div>
                  </div>

                  <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3"/> Adresse</p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{detail.address || 'Non renseigné'}</p>
                    </div>
                    <div className="border-t border-slate-50 dark:border-slate-800/60 pt-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest"><FileText className="w-3 h-3 inline mr-1"/> Description</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">{detail.description || 'Aucune description'}</p>
                    </div>
                    <div className="border-t border-slate-50 dark:border-slate-800/60 pt-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><User className="w-3 h-3"/> Citoyen déclarant</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{detail.citizen ? `${detail.citizen.first_name} ${detail.citizen.last_name}` : 'Citoyen anonyme'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Photos */}
              {tab === 'photos' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Photo Avant</p>
                      {avantPhoto ? (
                        <div className="h-40 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-800/30">
                          <img src={avantPhoto} alt="Avant" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                          <ImageIcon className="w-8 h-8 mb-2" />
                          <span className="text-[10px] font-black">Aucune photo</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Photo Après</p>
                      {apresPhoto ? (
                        <div className="h-40 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-800/30">
                          <img src={apresPhoto} alt="Après" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                          <ImageIcon className="w-8 h-8 mb-2" />
                          <span className="text-[10px] font-black">Non résolue</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Comments */}
              {tab === 'comments' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {commentsLocked ? (
                    <div className="text-center py-10 px-4">
                      <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 border border-slate-200 dark:border-slate-700">
                        <Lock className="w-5 h-5 text-slate-300 dark:text-slate-500" />
                      </div>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Section verrouillée</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Vous devez accepter la mission avant de pouvoir déverrouiller et utiliser le fil de discussion.</p>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-bold">Aucun commentaire interne</div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c, i) => (
                        <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{c.author?.first_name} {c.author?.last_name}</span>
                            <span className="text-[9px] text-slate-400">{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab History */}
              {tab === 'history' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {history.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-bold">Aucun historique disponible</div>
                  ) : (
                    <div className="relative pl-4 border-l border-slate-100 dark:border-slate-800 space-y-4">
                      {history.map((h, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Status : <span className="text-emerald-600">{h.new_status || h.status}</span>
                          </p>
                          {h.raison && <p className="text-[11px] text-slate-500 italic mt-0.5">Motif: "{h.raison}"</p>}
                          <p className="text-[9px] text-slate-400 mt-0.5">{fmt(h.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center text-slate-400 font-bold text-sm">Déclaration introuvable ou inaccessible</div>
          )}
        </div>

        {/* Actions bar at bottom */}
        {detail && (
          <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col gap-2 flex-shrink-0">
            {/* If pending assignment, show Accept/Reject actions */}
            {detail.status === 'assignee_agent' && (
              <>
                {!showRefuse ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleAccept}
                      disabled={submitting}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : '✓ Accepter la mission'}
                    </button>
                    <button
                      onClick={() => setShowRefuse(true)}
                      disabled={submitting}
                      className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors border border-red-200 flex items-center justify-center gap-1"
                    >
                      ✕ Refuser
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-red-100 dark:border-red-900/30">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Motif du refus (10 chars min)</p>
                    <textarea
                      value={motif}
                      onChange={e => setMotif(e.target.value)}
                      placeholder="Indiquez clairement le motif de votre refus..."
                      className="w-full text-xs p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-xl outline-none focus:border-red-300 min-h-[70px] resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleRefuse}
                        disabled={submitting || motif.trim().length < 10}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider disabled:opacity-50 transition-colors"
                      >
                        Confirmer le refus
                      </button>
                      <button
                        onClick={() => { setShowRefuse(false); setMotif('') }}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* General context actions */}
            <div className="flex gap-2 mt-1">
              {notif.reference_id && (
                <button
                  onClick={() => {
                    onClose()
                    navigate(`/agent/board?open=${notif.reference_id}`)
                  }}
                  className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> Ouvrir dans le Kanban
                </button>
              )}
              {!notif.is_read && (
                <button
                  onClick={() => onMarkRead(notif.id)}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-850 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Marquer lu
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const AgentNotifications: React.FC = () => {
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

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

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

  // ── Agent assignment actions ──
  const acceptMission = async (id: string) => {
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/accept`, {
        method: 'POST', headers: hjson(),
      })
      if (!res.ok) throw new Error()
      toast.success('✅ Mission acceptée — intervention démarrée')
    } catch {
      toast.error("Erreur lors de l'acceptation")
      throw new Error()
    }
  }

  const refuseMission = async (id: string, reason: string) => {
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/refuse`, {
        method: 'POST',
        headers: hjson(),
        body: JSON.stringify({ raison: reason }),
      })
      if (!res.ok) throw new Error()
      toast.success('✕ Mission refusée')
    } catch {
      toast.error('Erreur lors du refus de la mission')
      throw new Error()
    }
  }

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
    <AgentLayout title="Notifications">
      <div className="flex flex-col lg:flex-row gap-5 max-w-7xl mx-auto min-h-[calc(100vh-5rem)] p-4 lg:p-8">

        {/* ── LEFT: Main panel ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Toolbar row 1: search + category filter + date range */}
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une notification..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 outline-none focus:border-emerald-350 focus:ring-2 focus:ring-emerald-50 dark:focus:ring-emerald-900/20 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
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
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900 rounded-xl text-sm font-bold text-red-650 hover:bg-red-100 transition-colors">
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
                  className="appearance-none pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-450 outline-none cursor-pointer focus:border-emerald-350">
                  <option value="recent">Plus récentes</option>
                  <option value="oldest">Plus anciennes</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
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
                <p className="text-sm text-slate-400 dark:text-slate-500">Modifiez les filtres ou revenez plus tard.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([dateLabel, items]) => (
                <div key={dateLabel}>
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
                            isSelected ? 'bg-emerald-50 dark:bg-emerald-955/10' : !n.is_read ? 'bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50/70 dark:hover:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
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
                            style={{ background: isDark ? `${cfg.color}15` : cfg.bg, color: cfg.color }}>
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
                            {n.reference_id && (
                              <button className="mt-2 flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-650 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors opacity-0 group-hover:opacity-100">
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
                className="w-full mt-2 py-2 rounded-xl text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
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
          onAcceptMission={acceptMission}
          onRefuseMission={refuseMission}
          isDark={isDark}
        />
      )}
    </AgentLayout>
  )
}

export default AgentNotifications
