// src/pages/Agent/AgentDashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Clock, CheckCircle, XCircle, AlertTriangle, MapPin,
  Loader2, RefreshCw, Search, ChevronUp, ChevronDown,
  X, Users, User, Phone, Mail, Calendar,
  MessageSquare, Send, Check, Eye, Zap, FileText,
  Camera, Image as ImageIcon, History, ArrowLeft,
  CheckCheck, Upload, Navigation, Shield, Hash
} from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''
const hdr = () => ({ Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json' })
const me  = () => { try { return JSON.parse(localStorage.getItem('fmc_user') || '{}') } catch { return {} } }

// ─── Types ────────────────────────────────────────────────────────────────────
interface Decl {
  id: string
  ref_citoyen?: string
  ref_service?: string
  title: string
  description?: string
  status: string
  category?: string
  address?: string
  arrondissement?: string
  latitude?: number
  longitude?: number
  created_at: string
  assigned_at?: string
  updated_at?: string
  votes_count?: number
  priority?: string
  priority_score?: number
  final_priority?: string
  president_override?: string
  citizen?: { first_name: string; last_name: string; email?: string; phone?: string }
  citizen_name?: string
  citizen_email?: string
  citizen_phone?: string
  delegations?: { name: string; code: string }
  delegation_name?: string
  department?: { name_fr: string; code: string }
  service_name?: string
  service_code?: string
  photos?: Photo[]
  status_history?: HistEntry[]
  comments?: Comment[]
  other_agents?: OtherAgent[]
}

interface Photo     { id: string; url: string; created_at: string; photo_type?: string }
interface HistEntry { id: string; old_status?: string; new_status: string; raison?: string; created_at: string; changed_by_name?: string }
interface Comment   { id: string; content: string; created_at: string; author_name?: string; author_role?: string }
interface OtherAgent { agent_name: string; department_name: string }

// ─── Priority config ──────────────────────────────────────────────────────────
const PRIO_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  urgent:   { label: 'Critique', color: '#A32D2D', bg: '#FCEBEB', dot: '#E24B4A' },
  critical: { label: 'Critique', color: '#A32D2D', bg: '#FCEBEB', dot: '#E24B4A' },
  haute:    { label: 'Élevée',   color: '#633806', bg: '#FAEEDA', dot: '#EF9F27' },
  high:     { label: 'Élevée',   color: '#633806', bg: '#FAEEDA', dot: '#EF9F27' },
  moyenne:  { label: 'Moyenne',  color: '#3C3489', bg: '#EEEDFE', dot: '#7F77DD' },
  medium:   { label: 'Moyenne',  color: '#3C3489', bg: '#EEEDFE', dot: '#7F77DD' },
  normale:  { label: 'Normale',  color: '#3C3489', bg: '#EEEDFE', dot: '#7F77DD' },
  normal:   { label: 'Normale',  color: '#3C3489', bg: '#EEEDFE', dot: '#7F77DD' },
  basse:    { label: 'Basse',    color: '#27500A', bg: '#EAF3DE', dot: '#639922' },
  faible:   { label: 'Basse',    color: '#27500A', bg: '#EAF3DE', dot: '#639922' },
  low:      { label: 'Basse',    color: '#27500A', bg: '#EAF3DE', dot: '#639922' },
}
const getPrio = (d: Decl) => {
  const key = (d.final_priority ?? d.president_override ?? d.priority ?? 'normale').toLowerCase()
  return PRIO_CFG[key] ?? PRIO_CFG.moyenne
}

const STATUS_MAP: Record<string, { label: string; dot: string; color: string; bg: string }> = {
  assignee_agent: { label: 'Assignée',  dot: '#378ADD', color: '#0C447C', bg: '#E6F1FB' },
  en_cours:       { label: 'En cours',  dot: '#EF9F27', color: '#633806', bg: '#FAEEDA' },
  resolue:        { label: 'Résolue',   dot: '#1D9E75', color: '#085041', bg: '#E1F5EE' },
  cloturee:       { label: 'Clôturée',  dot: '#888780', color: '#444441', bg: '#F1EFE8' },
  refusee_agent:  { label: 'Refusée',   dot: '#E24B4A', color: '#791F1F', bg: '#FCEBEB' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const fmtFull = (iso: string) => `${fmtDate(iso)} à ${fmtTime(iso)}`

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast: React.FC<{ msg: string; type: 'ok' | 'err'; onDone: () => void }> = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t) }, [onDone])
  return (
    <div
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-bold ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}
      style={{ animation: 'slideUp .3s ease' }}
    >
      {type === 'ok' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {msg}
    </div>
  )
}

// ─── Status dot ───────────────────────────────────────────────────────────────
const StatusDot: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_MAP[status]
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${status === 'assignee_agent' ? 'animate-pulse' : ''}`}
      style={{ background: cfg?.dot ?? '#888780' }}
    />
  )
}

// ─── Sort arrow ───────────────────────────────────────────────────────────────
const SortArrow: React.FC<{ col: string; current: string; dir: 'asc' | 'desc' }> = ({ col, current, dir }) => {
  if (col !== current) return <ChevronDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
  return dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-[#1557FF]" />
    : <ChevronDown className="w-3 h-3 text-[#1557FF]" />
}

// ─── Image lightbox ───────────────────────────────────────────────────────────
const Lightbox: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80" onClick={onClose}>
    <img
      src={url}
      alt="Photo agrandie"
      className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain"
      onClick={e => e.stopPropagation()}
    />
    <button
      onClick={onClose}
      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
)

// ─── Declaration Detail Panel ─────────────────────────────────────────────────
interface DetailPanelProps {
  decl: Decl
  onClose: () => void
  onAccepted: () => void
  onRejected: () => void
}

const DeclarationDetailPanel: React.FC<DetailPanelProps> = ({ decl: initial, onClose, onAccepted, onRejected }) => {
  const [decl, setDecl]             = useState<Decl>(initial)
  const [loading, setLoading]       = useState(true)
  const [accepting, setAccepting]   = useState(false)
  const [refusing, setRefusing]     = useState(false)
  const [resolving, setResolving]   = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [refuseOpen, setRefuseOpen] = useState(false)
  const [motif, setMotif]           = useState('')
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [lightbox, setLightbox]     = useState<string | null>(null)
  const [toast, setToast]           = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const flash = (msg: string, type: 'ok' | 'err' = 'ok') => setToast({ msg, type })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res  = await fetch(`${API}/agent/declarations/${initial.id}`, { headers: hdr() })
        const data = await res.json()
        if (res.ok) setDecl(data.data ?? data)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [initial.id])

  const refresh = async () => {
    try {
      const res  = await fetch(`${API}/agent/declarations/${decl.id}`, { headers: hdr() })
      const data = await res.json()
      if (res.ok) setDecl(data.data ?? data)
    } catch {}
  }

  const handleAccept = async () => {
    setAccepting(true)
    try {
      const res  = await fetch(`${API}/agent/declarations/${decl.id}/accept`, { method: 'POST', headers: hdr() })
      const data = await res.json()
      if (!res.ok) { flash(data.message ?? data.error ?? 'Erreur.', 'err'); return }
      flash('Mission acceptée — statut : en cours.')
      setDecl(d => ({ ...d, status: 'en_cours' }))
      onAccepted()
    } catch { flash('Erreur réseau.', 'err') }
    finally { setAccepting(false) }
  }

  const handleRefuse = async () => {
    if (motif.trim().length < 10) return
    setRefusing(true)
    try {
      const res  = await fetch(`${API}/agent/declarations/${decl.id}/refuse`, {
        method: 'POST', headers: hdr(), body: JSON.stringify({ motif }),
      })
      const data = await res.json()
      if (!res.ok) { flash(data.message ?? 'Erreur.', 'err'); return }
      flash('Refus transmis au chef de service.')
      setDecl(d => ({ ...d, status: 'refusee_agent' }))
      setRefuseOpen(false)
      onRejected()
    } catch { flash('Erreur réseau.', 'err') }
    finally { setRefusing(false) }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('photo', file)
    try {
      const res  = await fetch(`${API}/agent/declarations/${decl.id}/photo`, {
        method: 'POST', headers: { Authorization: `Bearer ${tok()}` }, body: form,
      })
      const data = await res.json()
      if (!res.ok) { flash(data.message ?? 'Erreur upload.', 'err'); return }
      flash('Photo preuve téléversée !')
      await refresh()
    } catch { flash('Erreur réseau.', 'err') }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleResolve = async () => {
    setResolving(true)
    try {
      const res  = await fetch(`${API}/agent/declarations/${decl.id}/resolve`, { method: 'POST', headers: hdr() })
      const data = await res.json()
      if (!res.ok) { flash(data.message ?? 'Erreur.', 'err'); return }
      flash('Déclaration marquée comme résolue !')
      setDecl(d => ({ ...d, status: 'resolue' }))
    } catch { flash('Erreur réseau.', 'err') }
    finally { setResolving(false) }
  }

  const handleSendComment = async () => {
    if (!newComment.trim()) return
    setSendingComment(true)
    try {
      const res  = await fetch(`${API}/agent/declarations/${decl.id}/comments`, {
        method: 'POST', headers: hdr(), body: JSON.stringify({ content: newComment }),
      })
      const data = await res.json()
      if (!res.ok) { flash(data.message ?? 'Erreur.', 'err'); return }
      setNewComment('')
      await refresh()
    } catch { flash('Erreur réseau.', 'err') }
    finally { setSendingComment(false) }
  }

  const st             = STATUS_MAP[decl.status]
  const prio           = getPrio(decl)
  const hasProofPhoto  = (decl.photos ?? []).some(p => p.photo_type === 'preuve')
  const citizenName    = decl.citizen_name ?? (decl.citizen ? `${decl.citizen.first_name} ${decl.citizen.last_name}` : null)
  const citizenEmail   = decl.citizen_email ?? decl.citizen?.email
  const citizenPhone   = decl.citizen_phone ?? decl.citizen?.phone
  const locationName   = decl.address ?? decl.delegation_name ?? decl.delegations?.name ?? decl.arrondissement

  return (
    <>
      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="fixed inset-0 z-[100] flex" style={{ animation: 'fadeIn .2s ease' }}>
        <div className="flex-1 bg-black/40" onClick={onClose} />
        <div
          className="w-full max-w-2xl bg-white dark:bg-slate-900 flex flex-col overflow-hidden"
          style={{ animation: 'slideInRight .25s ease' }}
        >
          {/* Header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start gap-3">
            <button
              onClick={onClose}
              className="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-base text-[#0A1628] dark:text-white truncate">{decl.title}</h2>
                {st && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black flex-shrink-0"
                    style={{ background: st.bg, color: st.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                    {st.label}
                  </span>
                )}
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black flex-shrink-0"
                  style={{ background: prio.bg, color: prio.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: prio.dot }} />
                  {prio.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                  {decl.ref_service ?? decl.ref_citoyen ?? `#${decl.id.slice(0, 8)}`}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {fmtFull(decl.assigned_at ?? decl.created_at)}
                </span>
              </div>
            </div>
          </div>

          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-[#1557FF] animate-spin" />
            </div>
          )}

          {!loading && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Action banner — assignee_agent */}
              {decl.status === 'assignee_agent' && (
                <div className="rounded-2xl border border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex items-center gap-3 flex-wrap">
                  <Zap className="w-4 h-4 text-[#1557FF] flex-shrink-0" />
                  <p className="text-sm font-bold text-[#0A1628] dark:text-white flex-1">Action requise</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setRefuseOpen(r => !r)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-black hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Refuser
                    </button>
                    <button
                      onClick={handleAccept}
                      disabled={accepting}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black hover:bg-emerald-600 transition-all disabled:opacity-50"
                    >
                      {accepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Accepter la mission
                    </button>
                  </div>
                </div>
              )}

              {/* Refuse form inline */}
              {refuseOpen && decl.status === 'assignee_agent' && (
                <div className="rounded-2xl border border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4 space-y-3">
                  <p className="text-sm font-black text-[#0A1628] dark:text-white">Motif du refus</p>
                  <textarea
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    rows={3}
                    placeholder="Expliquez la raison du refus (min. 10 caractères)…"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-red-400 resize-none transition-all"
                  />
                  <p className={`text-[10px] ${motif.trim().length < 10 ? 'text-slate-400' : 'text-emerald-500'}`}>
                    {motif.trim().length} / 10 min
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRefuseOpen(false)}
                      className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleRefuse}
                      disabled={motif.trim().length < 10 || refusing}
                      className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-black hover:bg-red-600 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      {refusing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Confirmer le refus
                    </button>
                  </div>
                </div>
              )}

              {/* Action banner — en_cours */}
              {decl.status === 'en_cours' && (
                <div className="rounded-2xl border border-amber-100 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex items-center gap-3 flex-wrap">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-[#0A1628] dark:text-white">Mission en cours</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {hasProofPhoto ? 'Photo preuve reçue. Vous pouvez résoudre.' : 'Téléversez une photo preuve avant de résoudre.'}
                    </p>
                  </div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-black hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? 'Envoi…' : 'Photo preuve'}
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={!hasProofPhoto || resolving}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1557FF] text-white text-xs font-black hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    title={!hasProofPhoto ? 'Photo preuve obligatoire' : ''}
                  >
                    {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                    Marquer résolu
                  </button>
                </div>
              )}

              {/* Description */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Description</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  {decl.description
                    ? decl.description
                    : <span className="italic text-slate-400">Aucune description fournie.</span>
                  }
                </p>
                <div className="flex gap-2 flex-wrap">
                  {decl.category && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400">
                      <Hash className="w-3 h-3" /> {decl.category}
                    </span>
                  )}
                  {(decl.service_name ?? decl.department?.name_fr) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400">
                      <Shield className="w-3 h-3" /> {decl.service_name ?? decl.department?.name_fr}
                    </span>
                  )}
                </div>
              </section>

              {/* Location */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Localisation</h3>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#0A1628] dark:text-white">{locationName ?? '—'}</p>
                    {decl.delegations?.name && locationName !== decl.delegations.name && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{decl.delegations.name}</p>
                    )}
                    {decl.latitude && decl.longitude && (
                      <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        {decl.latitude.toFixed(5)}, {decl.longitude.toFixed(5)}
                      </p>
                    )}
                  </div>
                  {decl.latitude && decl.longitude && (
                    <a
                      href={`https://maps.google.com/?q=${decl.latitude},${decl.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-all flex-shrink-0"
                    >
                      <Navigation className="w-3 h-3" /> Google Maps
                    </a>
                  )}
                </div>
              </section>

              {/* Photos */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Photos ({(decl.photos ?? []).length})
                  </h3>
                </div>
                {(decl.photos ?? []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl gap-1.5">
                    <ImageIcon className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Aucune photo</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {(decl.photos ?? []).map(photo => (
                      <div key={photo.id} className="relative group cursor-pointer" onClick={() => setLightbox(photo.url)}>
                        <img
                          src={photo.url}
                          alt={photo.photo_type ?? 'photo'}
                          className="w-full h-24 object-cover rounded-xl bg-slate-100 dark:bg-slate-800"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-xl flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        {photo.photo_type === 'preuve' && (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-black">
                            Preuve
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Citoyen */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Citoyen déclarant</h3>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E6F1FB] dark:bg-[#0C447C]/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#0C447C] dark:text-[#B5D4F4] text-xs font-black">
                      {citizenName
                        ? citizenName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                        : '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#0A1628] dark:text-white">{citizenName ?? '—'}</p>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {citizenEmail ? (
                        <a
                          href={`mailto:${citizenEmail}`}
                          className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 hover:text-[#1557FF] transition-colors"
                        >
                          <Mail className="w-3 h-3" /> {citizenEmail}
                        </a>
                      ) : null}
                      {citizenPhone ? (
                        <a
                          href={`tel:${citizenPhone}`}
                          className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 hover:text-[#1557FF] transition-colors"
                        >
                          <Phone className="w-3 h-3" /> {citizenPhone}
                        </a>
                      ) : null}
                      {!citizenEmail && !citizenPhone && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Aucune coordonnée disponible.</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Status history */}
              {(decl.status_history ?? []).length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Historique</h3>
                  </div>
                  <div className="space-y-2">
                    {(decl.status_history ?? []).map((ev, i) => {
                      const evSt = STATUS_MAP[ev.new_status]
                      return (
                        <div key={ev.id ?? i} className="flex gap-3 items-start">
                          <div className="flex flex-col items-center mt-1 flex-shrink-0">
                            <span className="w-2 h-2 rounded-full" style={{ background: evSt?.dot ?? '#888' }} />
                            {i < (decl.status_history ?? []).length - 1 && (
                              <span className="w-px flex-1 bg-slate-100 dark:bg-slate-800 my-1 min-h-[12px]" />
                            )}
                          </div>
                          <div className="pb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[#0A1628] dark:text-white">{evSt?.label ?? ev.new_status}</span>
                              {ev.changed_by_name && (
                                <span className="text-[9px] text-slate-400 dark:text-slate-500">par {ev.changed_by_name}</span>
                              )}
                            </div>
                            {ev.raison && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 italic">{ev.raison}</p>}
                            <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-0.5">{fmtFull(ev.created_at)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Internal comments */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Commentaires internes
                  </h3>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(decl.comments ?? []).length === 0 ? (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 italic px-1">Aucun commentaire.</p>
                  ) : (
                    (decl.comments ?? []).map(c => (
                      <div key={c.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-[#0A1628] dark:text-white">{c.author_name ?? 'Agent'}</span>
                          {c.author_role && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-[9px] font-black text-slate-500 dark:text-slate-400">
                              {c.author_role}
                            </span>
                          )}
                          <span className="ml-auto text-[9px] text-slate-400 dark:text-slate-600">{fmtFull(c.created_at)}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
                    placeholder="Ajouter une note interne…"
                    className="flex-1 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-[#1557FF] transition-all"
                  />
                  <button
                    onClick={handleSendComment}
                    disabled={!newComment.trim() || sendingComment}
                    className="w-9 h-9 rounded-xl bg-[#1557FF] text-white flex items-center justify-center hover:bg-blue-700 transition-all disabled:opacity-40"
                  >
                    {sendingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </section>

            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const AgentDashboard: React.FC = () => {
  const user = me()
  const [decls,    setDecls]    = useState<Decl[]>([])
  const [loading,  setLoading]  = useState(true)
  const [detail,   setDetail]   = useState<Decl | null>(null)
  const [toast,    setToast]    = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [prioFilter,   setPrioFilter]   = useState('all')
  const [sortCol,      setSortCol]      = useState<'created_at' | 'priority'>('created_at')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc')
  const [page,         setPage]         = useState(1)
  const PER_PAGE = 8

  const flash = (msg: string, type: 'ok' | 'err' = 'ok') => setToast({ msg, type })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/agent/declarations`, { headers: hdr() })
      const data = await res.json()
      setDecls(data.data ?? data.declarations ?? [])
    } catch { flash('Erreur de chargement.', 'err') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const PRIO_ORDER: Record<string, number> = {
    urgent: 5, critical: 5, haute: 4, high: 4,
    moyenne: 3, medium: 3, normale: 3, normal: 3,
    basse: 1, faible: 1, low: 1,
  }
  const getPrioKey = (d: Decl) =>
    (d.final_priority ?? d.president_override ?? d.priority ?? 'normale').toLowerCase()

  const filtered = decls.filter(d => {
    if (search && !`${d.title} ${d.ref_citoyen ?? ''} ${d.ref_service ?? ''} ${d.address ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    if (prioFilter   !== 'all' && !getPrioKey(d).includes(prioFilter)) return false
    return true
  }).sort((a, b) => {
    if (sortCol === 'priority') {
      const pa = PRIO_ORDER[getPrioKey(a)] ?? 2, pb = PRIO_ORDER[getPrioKey(b)] ?? 2
      return sortDir === 'desc' ? pb - pa : pa - pb
    }
    const ta = new Date(a.created_at).getTime(), tb = new Date(b.created_at).getTime()
    return sortDir === 'desc' ? tb - ta : ta - tb
  })

  const pages     = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
    setPage(1)
  }

  const kpiPending    = decls.filter(d => d.status === 'assignee_agent').length
  const kpiInProgress = decls.filter(d => d.status === 'en_cours').length
  const kpiDone       = decls.filter(d => ['resolue', 'cloturee'].includes(d.status)).length
  const kpiTotal      = decls.length
  const kpiRate       = kpiTotal > 0 ? Math.round((kpiDone / kpiTotal) * 100) : 0

  const selCls = "h-8 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none focus:border-[#1557FF] transition-all cursor-pointer"

  return (
    <AgentLayout title="Tableau de bord">
      <style>{`
        @keyframes slideUp      { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes fadeIn       { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>

      {detail && (
        <DeclarationDetailPanel
          decl={detail}
          onClose={() => setDetail(null)}
          onAccepted={() => { setDetail(null); load() }}
          onRejected={() => { setDetail(null); load() }}
        />
      )}

      <div className="flex flex-col gap-5 h-full">

        {/* Welcome + KPIs */}
        <div className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl font-black text-[#0A1628] dark:text-white">
                Bonjour, {user.first_name ?? 'Agent'} 👋
              </h1>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">
                Déclarations assignées par votre chef de service.
              </p>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-400 hover:text-[#1557FF] hover:border-blue-300 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total assignées',    val: kpiTotal,       sub: 'Toutes',                       icon: '📋', color: '#1557FF', bg: '#E6F1FB' },
              { label: 'À accepter',         val: kpiPending,     sub: 'En attente de votre décision', icon: '⏳', color: '#BA7517', bg: '#FAEEDA' },
              { label: 'En cours',           val: kpiInProgress,  sub: 'Intervention active',          icon: '⚡', color: '#185FA5', bg: '#E6F1FB' },
              { label: 'Taux de résolution', val: `${kpiRate}%`,  sub: kpiRate >= 80 ? 'Excellent !' : 'En progression', icon: '📈', color: '#0F6E56', bg: '#E1F5EE' },
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

        {/* Table card */}
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex-shrink-0 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-black text-[#0A1628] dark:text-white">Tâches assignées</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{filtered.length} déclaration(s)</p>
            </div>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Rechercher…"
                  className="pl-8 pr-3 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-[#1557FF] transition-all w-40"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
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
                <option value="urgent">Critique</option>
                <option value="haute">Élevée</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-7 h-7 text-[#1557FF] animate-spin" />
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 dark:text-slate-500 gap-2">
                <FileText className="w-8 h-8 opacity-30" />
                <p className="font-bold text-sm">Aucune déclaration</p>
                <p className="text-xs">Modifiez vos filtres ou actualisez</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse table-fixed">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[26%]" />
                  <col className="w-[13%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                  <col className="w-[9%]"  />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 dark:bg-slate-800/80">
                    <th onClick={() => toggleSort('created_at')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:text-[#1557FF] select-none">
                      <div className="flex items-center gap-1">Titre <SortArrow col="created_at" current={sortCol} dir={sortDir} /></div>
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      Description
                    </th>
                    <th onClick={() => toggleSort('created_at')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:text-[#1557FF] select-none">
                      <div className="flex items-center gap-1">Assigné le <SortArrow col="created_at" current={sortCol} dir={sortDir} /></div>
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      En équipe
                    </th>
                    <th onClick={() => toggleSort('priority')} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:text-[#1557FF] select-none">
                      <div className="flex items-center gap-1">Priorité <SortArrow col="priority" current={sortCol} dir={sortDir} /></div>
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {paginated.map(d => {
                    const prio = getPrio(d)
                    const otherDeptAgents = (d.other_agents ?? []).filter(
                      a => a.department_name !== (d.department?.name_fr ?? d.service_name ?? '')
                    )
                    const sameDeptOnly = otherDeptAgents.length === 0
                    const totalPeople  = (d.other_agents?.length ?? 0) + 1
                    return (
                      <tr key={d.id} onClick={() => setDetail(d)} className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <StatusDot status={d.status} />
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-[#0A1628] dark:text-white truncate">{d.title}</p>
                              <p className="font-mono text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                {d.ref_service ?? d.ref_citoyen ?? `#${d.id.slice(0, 8)}`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed"
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {d.description ?? '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">{fmtDate(d.assigned_at ?? d.created_at)}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">{fmtTime(d.assigned_at ?? d.created_at)}</p>
                        </td>
                        <td className="px-4 py-3">
                          {sameDeptOnly ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400">
                              <User className="w-3 h-3" /> Même dép.
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#EEEDFE] dark:bg-[#26215C]/40 text-[10px] font-black text-[#3C3489] dark:text-[#AFA9EC]">
                              <Users className="w-3 h-3" /> Multi-dép. ({totalPeople})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black"
                            style={{ color: prio.color, background: prio.bg }}>
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: prio.dot }} />
                            {prio.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); setDetail(d) }}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                            title="Voir le détail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
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
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} sur {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all">
                  <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === pages || Math.abs(p - page) <= 1)
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-300 dark:text-slate-600 text-xs">…</span>}
                      <button onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-black transition-all ${page === p ? 'bg-[#1557FF] text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all">
                  <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </AgentLayout>
  )
}

export default AgentDashboard