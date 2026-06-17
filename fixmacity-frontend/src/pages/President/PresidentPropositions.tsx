import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import {
  Plus, Search, ThumbsUp, ThumbsDown, Users, Edit2, Trash2, Pencil,
  Calendar, CheckCircle2, X, Star, Tag, Activity, BarChart3,
  Clock, ChevronRight, Sparkles, AlertTriangle, RefreshCw,
  TrendingUp, MessageSquare, Filter, Upload, Award, Loader2
} from 'lucide-react'
import PresidentLayout from '../../layouts/PresidentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''

// ─── API helper ──────────────────────────────────────────────────────────────
const apiFetch = async (path: string, opts: RequestInit & { headers?: any } = {}) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${tok()}`,
    ...opts.headers,
  }
  if (!(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers,
  })
  if (!r.ok) {
    const err = await r.text()
    throw new Error(err || `HTTP ${r.status}`)
  }
  if (r.status === 204) return null
  return r.json()
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Prop {
  id: string
  title: string
  description: string
  category: string
  start_date: string
  end_date: string
  status: string
  votes_pour: number
  votes_contre: number
  total: number
  is_presidential: boolean
  citizen: string
  citizen_role?: string
  created_at: string
  president_response?: string
  image_url?: string
}

// ─── Config ───────────────────────────────────────────────────────────────────
const CATEGORIES = ['Voirie', 'Éclairage public', 'Propreté', 'Espaces Verts', 'Réseaux', 'Signalisation', 'Général']

const STATUS_LABEL: Record<string, string> = {
  active:     'Non traitée',
  closed:     'Clôturée',
  draft:      'Brouillon',
  Confirmer:  'Confirmée',
  Retenu:     'Retenue',
  // legacy
  en_attente: 'En attente', confirme: 'Confirmé', retenu: 'Retenu', rejete: 'Rejeté',
}

// No mapping needed — status IS the DB value now
const CITIZEN_STATUS_MAP: Record<string, string> = {}

const CAT_ICON: Record<string, string> = {
  'Voirie': '🛣️', 'Éclairage public': '💡', 'Propreté': '🗑️',
  'Espaces Verts': '🌿', 'Réseaux': '🔧', 'Signalisation': '🚦',
  'Général': '🏛️',
}

const fmt = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const daysLeft = (d: any) => d ? Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)) : null

// VoteBar removed

// ─── Status badge ──────────────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, string> = {
    active:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    closed:    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    draft:     'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    Confirmer: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    Retenu:    'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
    // legacy fallbacks
    en_attente:'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    confirme:  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    retenu:    'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
    rejete:    'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg[status] || cfg.active}`}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

// ─── Overlay Modal ────────────────────────────────────────────────────────────
const Overlay = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => {
  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div
        className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0 }}
      />
      <div
        className="relative bg-white dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-white dark:border-slate-800/50"
        style={{ maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
      >
        {children}
      </div>
    </div>
  )
  return createPortal(modal, document.body)
}

const DrawerOverlay = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => {
  const drawer = (
    <div className="fixed inset-0 z-[9999] flex justify-end" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md" onClick={onClose} style={{ position: 'absolute', inset: 0 }} />
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl h-full border-l border-slate-200 dark:border-slate-800/50 overflow-y-auto">
        {children}
      </div>
    </div>
  )
  return createPortal(drawer, document.body)
}

// ─── Confirm Delete ───────────────────────────────────────────────────────────
const ConfirmDelete = ({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) => (
  <Overlay onClose={onCancel}>
    <div className="p-8 text-center">
      <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <Trash2 className="w-7 h-7 text-red-500" />
      </div>
      <h3 className="text-lg font-black text-[#0A1628] dark:text-white mb-2">Supprimer cette proposition ?</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">«&nbsp;{title}&nbsp;»</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-8">Cette action est irréversible. Les votes associés seront également supprimés.</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
          Annuler
        </button>
        <button onClick={onConfirm} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-200 dark:shadow-none">
          Supprimer
        </button>
      </div>
    </div>
  </Overlay>
)

// ─── Proposition Form Modal ───────────────────────────────────────────────────
const PropForm = ({ initial, onSave, onClose }: { initial?: Prop | null; onSave: (f: any) => Promise<void>; onClose: () => void }) => {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    category: initial?.category || 'Général',
    start_date: initial?.start_date?.slice(0, 10) || '',
    end_date: initial?.end_date?.slice(0, 10) || '',
    status: initial?.status || 'active',
  })
  const [photo, setPhoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initial?.image_url
      ? (initial.image_url.startsWith('http') ? initial.image_url : `${API.replace('/api', '')}${initial.image_url}`)
      : null
  )
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPhoto(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const submit = async () => {
    if (!form.title.trim()) { setErr('Le titre est requis.'); return }
    if (!form.description.trim()) { setErr('La description est requise.'); return }
    if (form.start_date && form.end_date && new Date(form.end_date) <= new Date(form.start_date)) {
      setErr('La date de clôture doit être après le début.'); return
    }
    setLoading(true); setErr('')
    try {
      const formData = new FormData()
      formData.append('title', form.title)
      formData.append('description', form.description)
      formData.append('category', form.category)
      if (form.start_date) formData.append('start_date', form.start_date)
      if (form.end_date) formData.append('end_date', form.end_date)
      formData.append('status', form.status)
      if (photo) {
        formData.append('photo', photo)
      }
      await onSave(formData)
      onClose()
    }
    catch (e: any) { setErr(e.message || 'Erreur lors de l\'enregistrement.') }
    finally { setLoading(false) }
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>
      {children}
    </div>
  )

  const inputCls = "w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-[#0A1628] dark:text-white bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-[#1557FF]/20 focus:border-[#1557FF] transition-all"

  return (
    <DrawerOverlay onClose={onClose}>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1557FF] flex items-center justify-center">
              {initial ? <Edit2 className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h2 className="text-base font-black text-[#0A1628] dark:text-white">
                {initial ? 'Modifier la proposition' : 'Nouvelle proposition'}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Proposition présidentielle</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {err && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{err}
          </div>
        )}

        <div className="space-y-4">
          <Field label="Titre *">
            <input value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} placeholder="Titre de la proposition..." />
          </Field>

          <Field label="Catégorie *">
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
            </select>
          </Field>

          <Field label="Description *">
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} className={`${inputCls} resize-none`} placeholder="Description détaillée..." />
          </Field>

          <Field label="Image du Projet">
            <div className="flex flex-col gap-3">
              {previewUrl && (
                <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <img src={previewUrl} alt="Aperçu du projet" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null)
                      setPreviewUrl(null)
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-950/60 hover:bg-slate-950/80 backdrop-blur-sm text-white flex items-center justify-center transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-850 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-[#1557FF] dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                <Upload className="w-4.5 h-4.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {photo ? photo.name : (initial?.image_url ? 'Changer la photo' : 'Choisir une photo')}
                </span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date de début">
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Date de clôture">
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Statut">
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
              <option value="draft">Brouillon</option>
              <option value="active">Actif — ouvert au vote</option>
              <option value="closed">Clôturé</option>
            </select>
          </Field>
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Annuler
          </button>
          <button type="button" onClick={submit} disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-[#1557FF] text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-200 dark:shadow-none disabled:opacity-60">
            {loading ? 'Enregistrement...' : (initial ? 'Mettre à jour' : 'Publier')}
          </button>
        </div>
      </div>
    </DrawerOverlay>
  )
}

// ─── Citizen Decision Modal ────────────────────────────────────────────────────
const CitizenDecisionModal = ({ prop, onDecide, onClose }: {
  prop: Prop;
  onDecide: (p: Prop, d: string) => void;
  onClose: () => void;
}) => {
  const [loading, setLoading] = useState(false)
  // status IS the DB enum: 'active' | 'Confirmer' | 'Retenu' | 'closed'
  const isPending = prop.status === 'active'

  const decide = async (decision: string) => {
    setLoading(true)
    try { await onDecide(prop, decision); onClose() }
    catch (_) {}
    finally { setLoading(false) }
  }

  const loc = (prop as any).location
  const decidedAt = (prop as any).decided_at

  return (
    <DrawerOverlay onClose={onClose}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-black text-[#0A1628] dark:text-white">📋 Proposition citoyenne</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {/* Status + category row */}
          <div className="flex items-center justify-between">
            <StatusBadge status={prop.status} />
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Tag className="w-3 h-3" />{prop.category}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-black text-[#0A1628] dark:text-white leading-tight">{prop.title}</h3>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{prop.description}</p>

          {/* Location — only if present */}
          {loc && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="text-base">📍</span>
              <span>{loc}</span>
            </div>
          )}

          {/* Citizen info card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#1557FF] font-black text-xs shadow-sm">
                {prop.citizen?.[0] || 'C'}
              </div>
              <div>
                <p className="text-xs font-black text-[#0A1628] dark:text-white">{prop.citizen}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Soumis le {fmt(prop.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action area */}
        {isPending ? (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Prendre une décision</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => decide('confirme')} disabled={loading}
                className="py-3 rounded-2xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-all shadow-md shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-60">
                <CheckCircle2 className="w-4 h-4" /> Confirmer
              </button>
              <button onClick={() => decide('retenu')} disabled={loading}
                className="py-3 rounded-2xl bg-purple-500 text-white font-bold text-xs hover:bg-purple-600 transition-all shadow-md shadow-purple-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-60">
                <Star className="w-4 h-4" /> Retenu
              </button>
            </div>
          </div>
        ) : (
          <div className={`flex flex-col items-center gap-2 py-4 px-5 rounded-2xl border ${
            prop.status === 'Confirmer'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
              : prop.status === 'Retenu'
              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm">
              {prop.status === 'Confirmer' ? <CheckCircle2 className="w-4 h-4" /> : <Star className="w-4 h-4" />}
              Décision enregistrée — {STATUS_LABEL[prop.status] || prop.status}
            </div>
            {decidedAt && (
              <p className="text-[10px] opacity-75">Le {fmt(decidedAt)}</p>
            )}
          </div>
        )}
      </div>
    </DrawerOverlay>
  )
}


// ─── Presidential Prop Card ───────────────────────────────────────────────────
const PresCard = ({ prop, onEdit, onDelete }: { prop: Prop; onEdit: (p: Prop) => void; onDelete: (p: Prop) => void }) => {
  const remaining = daysLeft(prop.end_date)
  const isExpiring = remaining !== null && remaining <= 7 && remaining > 0
  const isExpired = prop.end_date && new Date(prop.end_date) < new Date()
  const pourPct = prop.total > 0 ? Math.round((prop.votes_pour / prop.total) * 100) : 0
  const resolvedImg = prop.image_url ? (prop.image_url.startsWith('http') ? prop.image_url : `${API.replace('/api', '')}${prop.image_url}`) : null

  return (
    <div className="group bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 p-7 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-1 transition-all duration-300 flex flex-col relative overflow-hidden">
      {/* Urgency stripe */}
      {isExpiring && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-t-3xl" />}

      {/* Image if exists */}
      {resolvedImg && (
        <div className="relative h-44 -mx-7 -mt-7 mb-5 overflow-hidden rounded-t-[2.5rem]">
          <img src={resolvedImg} alt={prop.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      {/* Category chip */}
      <div className="flex items-center justify-between mb-5">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-2.5 py-1 rounded-lg">
          <span>{CAT_ICON[prop.category] || '📋'}</span>{prop.category}
        </span>
        <StatusBadge status={prop.status} />
      </div>

      {/* Title & description */}
      <h3 className="font-black text-[#0A1628] dark:text-white text-base leading-tight mb-2 group-hover:text-[#1557FF] dark:group-hover:text-blue-400 transition-colors line-clamp-2">{prop.title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-5 flex-grow">{prop.description}</p>

      {/* Dates */}
      <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium mb-5">
        <Calendar className="w-3.5 h-3.5" />
        <span>{fmt(prop.start_date)} — {fmt(prop.end_date)}</span>
        {isExpiring && <span className="text-amber-500 dark:text-amber-400 font-black ml-auto">⏱ {remaining}j restants</span>}
        {isExpired && prop.status !== 'closed' && <span className="text-red-400 dark:text-red-500 font-black ml-auto">Expiré</span>}
      </div>

      {/* Vote bar */}
      {prop.total > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-[10px] font-black mb-1.5">
            <span className="text-emerald-500">✓ {prop.votes_pour} pour</span>
            <span className="text-rose-400">{prop.votes_contre} contre ✗</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pourPct}%` }} />
          </div>
        </div>
      )}

      {/* Edit / Delete */}
      <div className="flex gap-2 mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
        <button onClick={e => { e.stopPropagation(); onEdit(prop) }}
          className="flex-1 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-[#1557FF] hover:border-blue-200 dark:hover:border-blue-800 transition-all flex items-center justify-center gap-1.5">
          <Edit2 className="w-3.5 h-3.5" /> Modifier
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(prop) }}
          className="flex-1 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-800 transition-all flex items-center justify-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5" /> Supprimer
        </button>
      </div>
    </div>
  )
}

// ─── Citizen Prop Card ────────────────────────────────────────────────────────
const CitiCard = ({ prop, onOpen, onDelete }: { prop: Prop; onOpen: (p: Prop) => void; onDelete: (p: Prop) => void }) => {
  const isPending   = prop.status === 'active'
  const isConfirmed = prop.status === 'Confirmer'
  const isRetenu    = prop.status === 'Retenu'

  return (
    <div className="group bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 p-7 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-1 transition-all duration-300 flex flex-col relative overflow-hidden cursor-pointer"
      onClick={() => onOpen(prop)}>

      {isPending && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-t-3xl" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <StatusBadge status={prop.status} />
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <Tag className="w-3 h-3" />{prop.category}
        </span>
      </div>

      <h3 className="font-black text-[#0A1628] dark:text-white text-sm leading-tight mb-2 group-hover:text-[#1557FF] dark:group-hover:text-blue-400 transition-colors line-clamp-2">{prop.title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 mb-5 flex-grow">{prop.description}</p>

      {/* Citizen info */}
      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-3 mb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1557FF] to-blue-400 flex items-center justify-center text-white text-xs font-black shadow-sm">
          {prop.citizen?.[0] || 'C'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-[#0A1628] dark:text-white truncate">{prop.citizen}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{fmt(prop.created_at)}</p>
        </div>
      </div>

      {/* Action */}
      {isPending ? (
        <button className="w-full py-2.5 rounded-2xl bg-[#1557FF] text-white font-bold text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-200 dark:shadow-none">
          Prendre une décision <ChevronRight className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="flex gap-2">
          <div className={`flex-1 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 border ${
            isConfirmed ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' :
            isRetenu    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
          }`}>
            {isConfirmed ? <><CheckCircle2 className="w-3.5 h-3.5" />Confirmée</> :
             isRetenu    ? <><Star className="w-3.5 h-3.5" />Retenue</> :
                           <><Activity className="w-3.5 h-3.5" />Traitée</>}
          </div>
          {isConfirmed && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(prop); }}
              className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all dark:bg-rose-900/20 dark:border-rose-800"
              title="Supprimer cette suggestion"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub: string; icon: React.ElementType; color: string }) => (
  <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 p-6 flex items-center gap-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-none">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${color} shadow-sm`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-3xl font-black text-[#0A1628] dark:text-white leading-none">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1.5">{label}</p>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{sub}</p>
    </div>
  </div>
)

function MuniForm({ onSave, onClose, initial }: { onSave: (fd: FormData) => void; onClose: () => void; initial?: any }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    category: initial?.category || '',
    start_date: initial?.start_date?.split('T')[0] || '',
    end_date: initial?.end_date?.split('T')[0] || ''
  })
  const [image, setImage] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.title.trim()) { setErr('Titre requis.'); return }
    if (!form.description.trim()) { setErr('Description requise.'); return }
    if (!form.category) { setErr('Catégorie requise.'); return }
    setSaving(true); setErr('')
    const fd = new FormData()
    fd.append('title', form.title.trim())
    fd.append('description', form.description.trim())
    fd.append('category', form.category)
    // Default start_date to today if not provided
    fd.append('start_date', form.start_date || new Date().toISOString().split('T')[0])
    if (form.end_date) fd.append('end_date', form.end_date)
    if (image) fd.append('image', image)
    try { await onSave(fd) } catch { setErr('Erreur serveur.') } finally { setSaving(false) }
  }

  const CATS = ['Voirie & Routes','Éclairage Public','Propreté & Déchets','Espaces Verts','Réseaux & Drainage','Signalisation Routière','Administratif']
  const inputCls = "w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-[#0A1628] dark:text-white bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-[#1557FF]/20 focus:border-[#1557FF] transition-all"

  return (
    <DrawerOverlay onClose={onClose}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1557FF] flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#0A1628] dark:text-white">Nouveau projet municipal</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Ce projet apparaîtra dans "Travaux réalisés"</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {err && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{err}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Titre *</label>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Réfection de la route principale" />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Description *</label>
            <textarea className={`${inputCls} resize-none h-24`} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Décrivez le projet réalisé..." />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Catégorie *</label>
            <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">— Choisir —</option>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Date de début</label>
              <input type="date" className={inputCls} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Date de fin</label>
              <input type="date" className={inputCls} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Photo du projet</label>
            <input type="file" accept="image/*" onChange={e => setImage(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1557FF]/10 file:text-[#1557FF] hover:file:bg-[#1557FF]/20" />
            {image && <p className="text-xs text-green-600 font-medium">✓ {image.name}</p>}
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Annuler
          </button>
          <button type="button" onClick={submit} disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-[#1557FF] text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-200 dark:shadow-none disabled:opacity-60 flex justify-center items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publier'}
          </button>
        </div>
      </div>
    </DrawerOverlay>
  )
}

function MuniCard({ prop, onDelete, onOpen, onEdit }: {
  prop: Prop;
  onDelete: () => void;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const img = prop.image_url
    ? (prop.image_url.startsWith('http') ? prop.image_url : `${API.replace('/api','')}${prop.image_url}`)
    : 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'
  return (
    <div onClick={onOpen} className="group cursor-pointer bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 overflow-hidden hover:shadow-xl transition-all">
      <div className="relative h-44 overflow-hidden">
        <img src={img} alt={prop.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute top-3 left-3 bg-purple-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full">🏛️ Municipal</span>
        <button onClick={e => { e.stopPropagation(); onEdit() }}
          className="absolute top-3 right-12 w-7 h-7 bg-blue-500/80 hover:bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute top-3 right-3 w-7 h-7 bg-red-500/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div className="p-5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{prop.category}</span>
        <h3 className="font-bold text-[#0A1628] dark:text-white text-sm leading-tight mt-1 mb-2">{prop.title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{prop.description}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full">✓ Publié</span>
          {prop.created_at && <span className="text-[10px] text-slate-400 ml-auto">{new Date(prop.created_at).toLocaleDateString('fr-FR')}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PresidentPropositions() {
  const [tab, setTab] = useState<'president' | 'citizen' | 'municipal'>('president')
  const [presProps, setPresProps] = useState<Prop[]>([])
  const [citiProps, setCitiProps] = useState<Prop[]>([])
  const [muniProps, setMuniProps] = useState<Prop[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  // Modals
  const [showForm, setShowForm] = useState(false)
  const [showMuniForm, setShowMuniForm] = useState(false)
  const [editProp, setEditProp] = useState<Prop | null>(null)
  const [deleteProp, setDeleteProp] = useState<Prop | null>(null)
  const [decisionProp, setDecisionProp] = useState<Prop | null>(null)
  const [selectedMuni, setSelectedMuni] = useState<Prop | null>(null)
  const [editingMuni, setEditingMuni] = useState<Prop | null>(null)
  const [error, setError] = useState('')

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/president/propositions')
      if (data?.success) {
        setPresProps((data.presidential || []).filter((p: any) => p.type !== 'municipal').map((p: any) => ({
          ...p,
          votes_pour: p.pour || p.votes_pour || 0,
          votes_contre: p.contre || p.votes_contre || 0,
          total: p.total || 0,
          status: p.status || 'active',
          category: p.category || 'Général',
        })))
        setCitiProps((data.citizen || []).filter((p: any) => p.type !== 'municipal').map((p: any) => ({
          ...p,
          citizen: p.citizen || 'Anonyme',
          votes_pour: p.pour || p.votes_pour || 0,
          votes_contre: p.contre || p.votes_contre || 0,
          total: p.total || 0,
          status: p.status || 'active',   // trust DB status directly
          category: p.category || 'Général',
        })))
      }
      
      const muniData = await apiFetch('/propositions')
      const allProps = Array.isArray(muniData) ? muniData : muniData.propositions || []
      setMuniProps(allProps.filter((p: any) => p.type === 'municipal').map((p: any) => ({
        ...p,
        status: p.status || 'active',
        category: p.category || 'Général',
      })))
    } catch (e: any) {
      toast.error('Impossible de charger les propositions')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── CRUD president ─────────────────────────────────────────────────────────
  const saveProp = async (formData: FormData) => {
    if (editProp) {
      await apiFetch(`/president/propositions/${editProp.id}`, { method: 'PUT', body: formData })
      toast.success('Proposition mise à jour ✓')
    } else {
      await apiFetch('/president/propositions', { method: 'POST', body: formData })
      toast.success('Proposition publiée ✓')
    }
    setEditProp(null)
    setShowForm(false)
    fetchAll()
  }

  const saveMuniProp = async (formData: FormData) => {
    const token = localStorage.getItem('fmc_token')
    const res = await fetch(`${API}/president/projets-municipaux`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData  // NO Content-Type header — browser sets multipart boundary automatically
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erreur') }
    toast.success('Projet municipal publié ✓')
    setShowMuniForm(false)
    fetchAll()
  }

  const confirmDelete = async () => {
    if (!deleteProp) return
    try {
      await apiFetch(`/president/propositions/${deleteProp.id}`, { method: 'DELETE' })
      toast.success('Proposition supprimée')
      fetchAll()
    } catch {
      toast.error('Erreur lors de la suppression')
    }
    setDeleteProp(null)
  }

  // ── Citizen decision ───────────────────────────────────────────────────────
  const decideProp = async (prop: Prop, decision: string) => {
    // Map internal keys to DB enum values
    const dbDecision = decision === 'confirme' ? 'Confirmer' : 'Retenu'
    await apiFetch(`/president/propositions/${prop.id}/decide`, {
      method: 'PATCH',
      body: JSON.stringify({ decision: dbDecision }),
    })
    toast.success(
      dbDecision === 'Confirmer' ? 'Proposition confirmée ✅' : 'Proposition retenue 📌'
    )
    fetchAll()
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filter = (arr: Prop[], _isCitizen = false) => arr.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || p.title.toLowerCase().includes(q) || (p.citizen || '').toLowerCase().includes(q)
    if (!matchQ) return false
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    if (filterCategory !== 'all' && p.category !== filterCategory) return false
    return true
  })

  const filtered = tab === 'president' ? filter(presProps) : tab === 'municipal' ? filter(muniProps) : filter(citiProps, true)

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    totalPres: presProps.length,
    activePres: presProps.filter(p => p.status === 'active').length,
    totalVotes: presProps.reduce((s, p) => s + (p.total || 0), 0),
    pending:   citiProps.filter(p => p.status === 'active').length,
    confirmed: citiProps.filter(p => p.status === 'Confirmer').length,
    retained:  citiProps.filter(p => p.status === 'Retenu').length,
    totalCiti: citiProps.length,
  }

  const presFilters = [['all', 'Tous'], ['active', 'Actif'], ['closed', 'Clôturé'], ['draft', 'Brouillon']]
  const citiFilters = [['all', 'Tous'], ['active', 'Non traitées'], ['Confirmer', 'Confirmées'], ['Retenu', 'Retenues']]
  const muniFilters = [['all', 'Tous'], ['active', 'Publié'], ['closed', 'Clôturé']]

  return (
    <PresidentLayout title="Propositions">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 -m-6 p-8 transition-colors duration-500">
        <div className="max-w-[1600px] mx-auto space-y-10">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#0A1628] dark:text-white tracking-tight">Propositions</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">Gérez vos propositions et les suggestions citoyennes</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchAll}
              className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-[#1557FF] hover:border-blue-200 dark:hover:border-blue-900 transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
            {tab === 'president' && (
              <button onClick={() => { setEditProp(null); setShowForm(true) }}
                className="flex items-center gap-2 bg-[#1557FF] text-white px-5 py-2.5 rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none">
                <Plus className="w-4 h-4" />Nouvelle proposition
              </button>
            )}
            {tab === 'municipal' && (
              <button onClick={() => setShowMuniForm(true)}
                className="flex items-center gap-2 bg-[#1557FF] text-white px-5 py-2.5 rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none">
                <Plus className="w-4 h-4" />Nouveau projet
              </button>
            )}
          </div>
        </div>

        {/* ── KPIs ───────────────────────────────────────────────────────── */}
        {tab === 'president' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Total propositions" value={stats.totalPres} sub="Propositions présidentielles"
              icon={Activity} color="bg-[#1557FF]/10 text-[#1557FF]" />
            <KpiCard label="Propositions actives" value={stats.activePres} sub="Ouvertes au vote citoyen"
              icon={TrendingUp} color="bg-emerald-100 text-emerald-600" />
            <KpiCard label="Votes reçus" value={stats.totalVotes} sub="Sur toutes les propositions"
              icon={Users} color="bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <KpiCard label="Total" value={stats.totalCiti} sub="Suggestions citoyennes"
              icon={Sparkles} color="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" />
            <KpiCard label="En attente" value={stats.pending} sub="Nécessitent une décision"
              icon={Clock} color="bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400" />
            <KpiCard label="Confirmées" value={stats.confirmed} sub="Validées par le président"
              icon={CheckCircle2} color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400" />
            <KpiCard label="Retenues" value={stats.retained} sub="À traiter prochainement"
              icon={Star} color="bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400" />
          </div>
        )}

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2rem] p-1.5 flex gap-1 shadow-sm transition-all duration-300">
          {[
            { key: 'president' as const, label: '🏛️ Propositions présidentielles', count: presProps.length },
            { key: 'citizen' as const, label: '👥 Suggestions citoyennes', count: stats.pending, highlight: stats.pending > 0 },
            { key: 'municipal' as const, label: '🏗️ Projets municipaux', count: muniProps.length },
          ].map(t => (
            <button key={t.key}
              onClick={() => { setTab(t.key); setFilterStatus('all'); setSearch('') }}
              className={`flex-1 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${
                tab === t.key ? 'bg-[#1557FF] text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  tab === t.key ? 'bg-white/20 text-white' :
                  t.highlight ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-[#0A1628] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1557FF]/20 focus:border-[#1557FF] transition-all" />
          </div>

          {/* Category Dropdown Filter */}
          <div className="relative min-w-[180px]">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-[#0A1628] dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#1557FF]/20 focus:border-[#1557FF] transition-all cursor-pointer">
              <option value="all" className="font-bold text-slate-700 dark:text-slate-300 dark:bg-slate-900">Toutes catégories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c} className="font-bold text-slate-700 dark:text-slate-300 dark:bg-slate-900">
                  {CAT_ICON[c] || '📋'} {c}
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none transform rotate-90" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400 mr-1" />
            {(tab === 'president' ? presFilters : tab === 'municipal' ? muniFilters : citiFilters).map(([v, l]) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
                  filterStatus === v ? 'bg-[#1557FF] text-white shadow-lg shadow-blue-200 dark:shadow-none' : 'bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                }`}>
                {l}
              </button>
            ))}
          </div>

          <span className="ml-auto text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-3 border-slate-100 border-t-[#1557FF] rounded-full animate-spin" style={{ borderWidth: '3px' }} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-4xl">
              📭
            </div>
            <div className="text-center">
              <p className="font-black text-[#0A1628] dark:text-white text-lg mb-1">Aucune proposition trouvée</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {search ? 'Essayez avec d\'autres mots-clés' : 'Aucune proposition dans cette catégorie'}
              </p>
            </div>
            {tab === 'president' && !search && (
              <button onClick={() => { setEditProp(null); setShowForm(true) }}
                className="mt-2 flex items-center gap-2 bg-[#1557FF] text-white px-5 py-2.5 rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none">
                <Plus className="w-4 h-4" />Créer la première proposition
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {tab === 'citizen'
              ? filtered.map(p => (
                  <CitiCard key={p.id} prop={p} onOpen={prop => setDecisionProp(prop)} onDelete={prop => setDeleteProp(prop)} />
                ))
              : tab === 'municipal'
              ? filtered.map(p => (
                  <MuniCard key={p.id} prop={p}
                    onDelete={() => setDeleteProp(p)}
                    onOpen={() => setSelectedMuni(p)}
                    onEdit={() => setEditingMuni(p)}
                  />
                ))
              : filtered.map(p => (
                  <PresCard key={p.id} prop={p}
                    onEdit={prop => { setEditProp(prop); setShowForm(true) }}
                    onDelete={prop => setDeleteProp(prop)} />
                ))
            }
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showForm && (
        <PropForm
          initial={editProp}
          onSave={saveProp}
          onClose={() => { setShowForm(false); setEditProp(null) }} />
      )}
      {showMuniForm && (
        <MuniForm
          onSave={saveMuniProp}
          onClose={() => setShowMuniForm(false)} />
      )}
      {selectedMuni && (
        <div className="fixed inset-0 z-[130] flex"
          style={{background:'rgba(10,22,40,0.5)', backdropFilter:'blur(4px)'}}
          onClick={() => setSelectedMuni(null)}>
          <div className="ml-auto w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="relative h-52 overflow-hidden flex-shrink-0">
              <img
                src={selectedMuni.image_url
                  ? (selectedMuni.image_url.startsWith('http') ? selectedMuni.image_url : `${API.replace('/api','')}${selectedMuni.image_url}`)
                  : 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'}
                alt={selectedMuni.title}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' }}
              />
              <div className="absolute inset-0" style={{background:'linear-gradient(to top, rgba(10,22,40,0.8) 0%, transparent 60%)'}} />
              <button onClick={() => setSelectedMuni(null)}
                className="absolute top-4 right-4 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all">
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-4 left-5">
                <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">🏛️ Projet Municipal</span>
                <h2 className="text-white text-xl font-bold mt-2">{selectedMuni.title}</h2>
              </div>
            </div>
            <div className="p-6 space-y-4 flex-1">
              <div className="flex gap-2 flex-wrap">
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-full">{selectedMuni.category}</span>
                <span className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold px-3 py-1.5 rounded-full">✓ Publié</span>
                {selectedMuni.created_at && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    Publié le {new Date(selectedMuni.created_at).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{selectedMuni.description}</p>
              {(selectedMuni.start_date || selectedMuni.end_date) && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 grid grid-cols-2 gap-4">
                  {selectedMuni.start_date && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Début</p>
                      <p className="text-sm font-bold text-[#0A1628] dark:text-white">{new Date(selectedMuni.start_date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                  {selectedMuni.end_date && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Fin</p>
                      <p className="text-sm font-bold text-[#0A1628] dark:text-white">{new Date(selectedMuni.end_date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button onClick={() => { setEditingMuni(selectedMuni); setSelectedMuni(null) }}
                className="flex-1 py-3 rounded-xl bg-[#1557FF] text-white text-sm font-bold hover:bg-blue-700 transition-all">
                ✏️ Modifier
              </button>
              <button onClick={() => { setDeleteProp(selectedMuni); setSelectedMuni(null) }}
                className="py-3 px-5 rounded-xl border border-red-200 text-red-500 text-sm font-bold hover:bg-red-50 transition-all">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
      {editingMuni && (
        <MuniForm
          initial={editingMuni}
          onSave={async (fd) => {
            const token = localStorage.getItem('fmc_token')
            const res = await fetch(`${API}/president/propositions/${editingMuni.id}`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${token}` },
              body: fd
            })
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erreur') }
            toast.success('Projet mis à jour ✓')
            setEditingMuni(null)
            fetchAll()
          }}
          onClose={() => setEditingMuni(null)}
        />
      )}
      {deleteProp && (
        <ConfirmDelete
          title={deleteProp.title}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteProp(null)} />
      )}
      {decisionProp && (
        <CitizenDecisionModal
          prop={decisionProp}
          onDecide={decideProp}
          onClose={() => setDecisionProp(null)} />
      )}
      </div>
    </PresidentLayout>
  )
}