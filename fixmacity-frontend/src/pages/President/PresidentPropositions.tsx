import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, Search, ThumbsUp, ThumbsDown, Users, Edit2, Trash2,
  Calendar, CheckCircle2, X, Star, Tag, Activity, BarChart3,
  Clock, ChevronRight, Sparkles, AlertTriangle, RefreshCw,
  TrendingUp, MessageSquare, Filter
} from 'lucide-react'
import PresidentLayout from '../../layouts/PresidentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''

// ─── API helper ──────────────────────────────────────────────────────────────
const apiFetch = async (path: string, opts: RequestInit & { headers?: any } = {}) => {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${tok()}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
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
}

// ─── Config ───────────────────────────────────────────────────────────────────
const CATEGORIES = ['Voirie', 'Éclairage public', 'Propreté', 'Espaces Verts', 'Réseaux', 'Signalisation', 'Général']

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif', closed: 'Clôturé', draft: 'Brouillon',
  en_attente: 'En attente', confirme: 'Confirmé', retenu: 'Retenu', rejete: 'Rejeté',
}

const CITIZEN_STATUS_MAP: Record<string, string> = {
  active: 'en_attente',   // citizen proposals in "active" = awaiting president decision
  closed: 'retenu',       // closed citizen = retained
}

const CAT_ICON: Record<string, string> = {
  'Voirie': '🛣️', 'Éclairage public': '💡', 'Propreté': '🗑️',
  'Espaces Verts': '🌿', 'Réseaux': '🔧', 'Signalisation': '🚦',
  'Général': '🏛️',
}

const fmt = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const daysLeft = (d: any) => d ? Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)) : null

// ─── Vote bar ─────────────────────────────────────────────────────────────────
const VoteBar = ({ pour, contre, total }: { pour: number; contre: number; total: number }) => {
  const pct = total > 0 ? Math.round((pour / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-bold">
        <span className="text-emerald-600 flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{pour}</span>
        <span className="text-slate-400">{pct}% pour</span>
        <span className="text-rose-500 flex items-center gap-1">{contre}<ThumbsDown className="w-3 h-3" /></span>
      </div>
      <div className="h-1.5 bg-rose-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-400 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, string> = {
    active:     'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed:     'bg-slate-100 text-slate-600 border-slate-200',
    draft:      'bg-amber-50 text-amber-700 border-amber-200',
    en_attente: 'bg-blue-50 text-blue-700 border-blue-200',
    confirme:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    retenu:     'bg-purple-50 text-purple-700 border-purple-200',
    rejete:     'bg-red-50 text-red-600 border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg[status] || cfg.active}`}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

// ─── Overlay Modal ────────────────────────────────────────────────────────────
const Overlay = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-[#0A1628]/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      {children}
    </div>
  </div>
)

// ─── Confirm Delete ───────────────────────────────────────────────────────────
const ConfirmDelete = ({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) => (
  <Overlay onClose={onCancel}>
    <div className="p-8 text-center">
      <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <Trash2 className="w-7 h-7 text-red-500" />
      </div>
      <h3 className="text-lg font-black text-[#0A1628] mb-2">Supprimer cette proposition ?</h3>
      <p className="text-sm text-slate-500 mb-1">«&nbsp;{title}&nbsp;»</p>
      <p className="text-xs text-slate-400 mb-8">Cette action est irréversible. Les votes associés seront également supprimés.</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
          Annuler
        </button>
        <button onClick={onConfirm} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-200">
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
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const submit = async () => {
    if (!form.title.trim()) { setErr('Le titre est requis.'); return }
    if (!form.description.trim()) { setErr('La description est requise.'); return }
    if (form.start_date && form.end_date && new Date(form.end_date) <= new Date(form.start_date)) {
      setErr('La date de clôture doit être après le début.'); return
    }
    setLoading(true); setErr('')
    try { await onSave(form); onClose() }
    catch (e: any) { setErr(e.message || 'Erreur lors de l\'enregistrement.') }
    finally { setLoading(false) }
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  )

  const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0A1628] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1557FF]/20 focus:border-[#1557FF] transition-all"

  return (
    <Overlay onClose={onClose}>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1557FF] flex items-center justify-center">
              {initial ? <Edit2 className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h2 className="text-base font-black text-[#0A1628]">
                {initial ? 'Modifier la proposition' : 'Nouvelle proposition'}
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">Proposition présidentielle</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {err && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm">
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

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
            Annuler
          </button>
          <button onClick={submit} disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-[#1557FF] text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? <><RefreshCw className="w-4 h-4 animate-spin" />Enregistrement...</> : (initial ? 'Mettre à jour' : 'Publier')}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

// ─── Citizen Decision Modal ───────────────────────────────────────────────────
const CitizenDecisionModal = ({ prop, onDecide, onClose }: { prop: Prop; onDecide: (p: Prop, d: string, note: string) => void; onClose: () => void }) => {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const displayStatus = CITIZEN_STATUS_MAP[prop.status] || prop.status
  const isPending = displayStatus === 'en_attente'

  const decide = async (decision: string) => {
    setLoading(true)
    try { await onDecide(prop, decision, note); onClose() }
    catch (_) {}
    finally { setLoading(false) }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-black text-[#0A1628]">📋 Proposition citoyenne</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <StatusBadge status={displayStatus} />
            <span className="text-xs text-slate-400 font-medium">{prop.category}</span>
          </div>
          <h3 className="text-lg font-black text-[#0A1628] leading-tight">{prop.title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{prop.description}</p>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#1557FF] font-black text-xs shadow-sm">
                {prop.citizen?.[0] || 'C'}
              </div>
              <div>
                <p className="text-xs font-black text-[#0A1628]">{prop.citizen}</p>
                <p className="text-[10px] text-slate-400">Soumis le {fmt(prop.created_at)}</p>
              </div>
            </div>
            <VoteBar pour={prop.votes_pour || 0} contre={prop.votes_contre || 0} total={prop.total || 0} />
          </div>

          {prop.president_response && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
              <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-1">Réponse présidentielle</p>
              <p className="text-xs text-purple-700">{prop.president_response}</p>
            </div>
          )}
        </div>

        {isPending ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Note interne (optionnel)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1557FF]/20 focus:border-[#1557FF] transition-all resize-none"
                placeholder="Ajouter une note..." />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => decide('a_discuter')} disabled={loading}
                className="py-3 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-all flex flex-col items-center gap-1">
                <MessageSquare className="w-4 h-4" /> À discuter
              </button>
              <button onClick={() => decide('confirme')} disabled={loading}
                className="py-3 rounded-2xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-all shadow-md shadow-emerald-200 flex flex-col items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Confirmer
              </button>
              <button onClick={() => decide('retenu')} disabled={loading}
                className="py-3 rounded-2xl bg-purple-500 text-white font-bold text-xs hover:bg-purple-600 transition-all shadow-md shadow-purple-200 flex flex-col items-center gap-1">
                <Star className="w-4 h-4" /> Retenu
              </button>
            </div>
          </div>
        ) : (
          <div className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold border ${
            displayStatus === 'confirme' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
            displayStatus === 'retenu' ? 'bg-purple-50 text-purple-700 border-purple-100' :
            'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            {displayStatus === 'confirme' ? <CheckCircle2 className="w-4 h-4" /> : <Star className="w-4 h-4" />}
            {displayStatus === 'confirme' ? 'Proposition confirmée' : 'Proposition retenue'}
          </div>
        )}
      </div>
    </Overlay>
  )
}

// ─── Presidential Prop Card ───────────────────────────────────────────────────
const PresCard = ({ prop, onEdit, onDelete }: { prop: Prop; onEdit: (p: Prop) => void; onDelete: (p: Prop) => void }) => {
  const remaining = daysLeft(prop.end_date)
  const isExpiring = remaining !== null && remaining <= 7 && remaining > 0
  const isExpired = prop.end_date && new Date(prop.end_date) < new Date()
  const pourPct = prop.total > 0 ? Math.round((prop.votes_pour / prop.total) * 100) : 0

  return (
    <div className="group bg-white rounded-3xl border border-slate-100 p-6 hover:shadow-lg hover:shadow-slate-100 hover:-translate-y-0.5 transition-all duration-300 flex flex-col relative overflow-hidden">
      {/* Urgency stripe */}
      {isExpiring && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-t-3xl" />}

      {/* Category chip */}
      <div className="flex items-center justify-between mb-5">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
          <span>{CAT_ICON[prop.category] || '📋'}</span>{prop.category}
        </span>
        <StatusBadge status={prop.status} />
      </div>

      {/* Title & description */}
      <h3 className="font-black text-[#0A1628] text-base leading-tight mb-2 group-hover:text-[#1557FF] transition-colors line-clamp-2">{prop.title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-5 flex-grow">{prop.description}</p>

      {/* Dates */}
      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mb-5">
        <Calendar className="w-3.5 h-3.5" />
        <span>{fmt(prop.start_date)} — {fmt(prop.end_date)}</span>
        {isExpiring && <span className="text-amber-500 font-black ml-auto">⏱ {remaining}j restants</span>}
        {isExpired && prop.status !== 'closed' && <span className="text-red-400 font-black ml-auto">Expiré</span>}
      </div>

      {/* Vote stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-emerald-50/80 rounded-2xl p-3 border border-emerald-100/60 text-center">
          <ThumbsUp className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-black text-emerald-700">{prop.votes_pour}</p>
          <p className="text-[9px] font-bold text-emerald-500 uppercase">Pour</p>
        </div>
        <div className="bg-rose-50/80 rounded-2xl p-3 border border-rose-100/60 text-center">
          <ThumbsDown className="w-3.5 h-3.5 text-rose-500 mx-auto mb-1" />
          <p className="text-lg font-black text-rose-600">{prop.votes_contre}</p>
          <p className="text-[9px] font-bold text-rose-500 uppercase">Contre</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
          <Users className="w-3.5 h-3.5 text-slate-400 mx-auto mb-1" />
          <p className="text-lg font-black text-[#0A1628]">{prop.total}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase">Total</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
          <span className="text-emerald-600">{pourPct}% pour</span>
          <span className="text-rose-500">{100 - pourPct}% contre</span>
        </div>
        <div className="h-2 bg-rose-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${pourPct}%` }} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button onClick={() => onEdit(prop)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-[#0A1628] text-white text-xs font-bold hover:bg-[#1557FF] transition-all">
          <Edit2 className="w-3.5 h-3.5" />Modifier
        </button>
        <button onClick={() => onDelete(prop)}
          className="w-10 flex items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 transition-all">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Citizen Prop Card ────────────────────────────────────────────────────────
const CitiCard = ({ prop, onOpen }: { prop: Prop; onOpen: (p: Prop) => void }) => {
  const displayStatus = CITIZEN_STATUS_MAP[prop.status] || prop.status
  const isPending = displayStatus === 'en_attente'

  return (
    <div className="group bg-white rounded-3xl border border-slate-100 p-6 hover:shadow-lg hover:shadow-slate-100 hover:-translate-y-0.5 transition-all duration-300 flex flex-col relative overflow-hidden cursor-pointer"
      onClick={() => onOpen(prop)}>

      {isPending && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-t-3xl" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <StatusBadge status={displayStatus} />
        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
          <Tag className="w-3 h-3" />{prop.category}
        </span>
      </div>

      <h3 className="font-black text-[#0A1628] text-sm leading-tight mb-2 group-hover:text-[#1557FF] transition-colors line-clamp-2">{prop.title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-5 flex-grow">{prop.description}</p>

      {/* Citizen info */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 mb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1557FF] to-blue-400 flex items-center justify-center text-white text-xs font-black shadow-sm">
          {prop.citizen?.[0] || 'C'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-[#0A1628] truncate">{prop.citizen}</p>
          <p className="text-[10px] text-slate-400">{fmt(prop.created_at)}</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="text-emerald-600 flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{prop.votes_pour || 0}</span>
          <span className="text-rose-500 flex items-center gap-0.5"><ThumbsDown className="w-3 h-3" />{prop.votes_contre || 0}</span>
        </div>
      </div>

      {/* Action */}
      {isPending ? (
        <button className="w-full py-2.5 rounded-2xl bg-[#1557FF] text-white font-bold text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-200">
          Prendre une décision <ChevronRight className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className={`w-full py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 border ${
          displayStatus === 'confirme' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-purple-50 text-purple-700 border-purple-100'
        }`}>
          {displayStatus === 'confirme' ? <><CheckCircle2 className="w-3.5 h-3.5" />Confirmée</> : <><Star className="w-3.5 h-3.5" />Retenue</>}
        </div>
      )}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub: string; icon: React.ElementType; color: string }) => (
  <div className="bg-white rounded-3xl border border-slate-100 p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-2xl font-black text-[#0A1628] leading-none">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">{label}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  </div>
)

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PresidentPropositions() {
  const [tab, setTab] = useState<'president' | 'citizen'>('president')
  const [presProps, setPresProps] = useState<Prop[]>([])
  const [citiProps, setCitiProps] = useState<Prop[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Modals
  const [showForm, setShowForm] = useState(false)
  const [editProp, setEditProp] = useState<Prop | null>(null)
  const [deleteProp, setDeleteProp] = useState<Prop | null>(null)
  const [decisionProp, setDecisionProp] = useState<Prop | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/president/propositions')
      if (data?.success) {
        setPresProps((data.presidential || []).map((p: any) => ({
          ...p,
          votes_pour: p.pour || p.votes_pour || 0,
          votes_contre: p.contre || p.votes_contre || 0,
          total: p.total || 0,
          status: p.status || 'active',
          category: p.category || 'Général',
        })))
        setCitiProps((data.citizen || []).map((p: any) => ({
          ...p,
          citizen: p.citizen || 'Anonyme',
          votes_pour: p.pour || p.votes_pour || 0,
          votes_contre: p.contre || p.votes_contre || 0,
          total: p.total || 0,
          status: p.status || 'active',
          category: p.category || 'Général',
        })))
      }
    } catch (e: any) {
      toast.error('Impossible de charger les propositions')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── CRUD president ─────────────────────────────────────────────────────────
  const saveProp = async (form: any) => {
    if (editProp) {
      await apiFetch(`/president/propositions/${editProp.id}`, { method: 'PUT', body: JSON.stringify(form) })
      toast.success('Proposition mise à jour ✓')
    } else {
      await apiFetch('/president/propositions', { method: 'POST', body: JSON.stringify(form) })
      toast.success('Proposition publiée ✓')
    }
    setEditProp(null)
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
  const decideProp = async (prop: Prop, decision: string, note: string) => {
    const endpoint = decision === 'confirme'
      ? `/president/propositions/${prop.id}/confirmer`
      : decision === 'retenu'
      ? `/president/propositions/${prop.id}/retenu`
      : `/president/propositions/${prop.id}/respond`

    const body = decision === 'a_discuter' || decision === 'refuse'
      ? JSON.stringify({ status: decision, president_response: note })
      : JSON.stringify({ president_note: note })

    const method = (decision === 'a_discuter' || decision === 'refuse') ? 'PATCH' : 'POST'

    await apiFetch(endpoint, { method, body })
    toast.success(
      decision === 'confirme' ? 'Proposition confirmée ✅' :
      decision === 'retenu' ? 'Proposition retenue 📌' : 'Décision enregistrée'
    )
    fetchAll()
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filter = (arr: Prop[], isCitizen = false) => arr.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || p.title.toLowerCase().includes(q) || (p.citizen || '').toLowerCase().includes(q)
    if (!matchQ) return false
    if (filterStatus === 'all') return true
    const displayStatus = isCitizen ? (CITIZEN_STATUS_MAP[p.status] || p.status) : p.status
    return displayStatus === filterStatus
  })

  const filtered = tab === 'president' ? filter(presProps) : filter(citiProps, true)

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    totalPres: presProps.length,
    activePres: presProps.filter(p => p.status === 'active').length,
    totalVotes: presProps.reduce((s, p) => s + (p.total || 0), 0),
    pending: citiProps.filter(p => (CITIZEN_STATUS_MAP[p.status] || p.status) === 'en_attente').length,
    confirmed: citiProps.filter(p => (CITIZEN_STATUS_MAP[p.status] || p.status) === 'confirme').length,
    retained: citiProps.filter(p => (CITIZEN_STATUS_MAP[p.status] || p.status) === 'retenu').length,
    totalCiti: citiProps.length,
  }

  const presFilters = [['all', 'Tous'], ['active', 'Actif'], ['closed', 'Clôturé'], ['draft', 'Brouillon']]
  const citiFilters = [['all', 'Tous'], ['en_attente', 'En attente'], ['confirme', 'Confirmé'], ['retenu', 'Retenu']]

  return (
    <PresidentLayout title="Propositions">
      <div className="space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#0A1628] tracking-tight">Propositions</h1>
            <p className="text-sm text-slate-400 font-medium mt-1">Gérez vos propositions et les suggestions citoyennes</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchAll}
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1557FF] hover:border-blue-200 transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
            {tab === 'president' && (
              <button onClick={() => { setEditProp(null); setShowForm(true) }}
                className="flex items-center gap-2 bg-[#1557FF] text-white px-5 py-2.5 rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                <Plus className="w-4 h-4" />Nouvelle proposition
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
              icon={Users} color="bg-blue-50 text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <KpiCard label="Total" value={stats.totalCiti} sub="Suggestions citoyennes"
              icon={Sparkles} color="bg-slate-100 text-slate-500" />
            <KpiCard label="En attente" value={stats.pending} sub="Nécessitent une décision"
              icon={Clock} color="bg-blue-50 text-blue-500" />
            <KpiCard label="Confirmées" value={stats.confirmed} sub="Validées par le président"
              icon={CheckCircle2} color="bg-emerald-50 text-emerald-500" />
            <KpiCard label="Retenues" value={stats.retained} sub="À traiter prochainement"
              icon={Star} color="bg-purple-50 text-purple-500" />
          </div>
        )}

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-100 rounded-2xl p-1.5 flex gap-1 shadow-sm">
          {[
            { key: 'president' as const, label: '🏛️ Propositions présidentielles', count: presProps.length },
            { key: 'citizen' as const, label: '👥 Suggestions citoyennes', count: stats.pending, highlight: stats.pending > 0 },
          ].map(t => (
            <button key={t.key}
              onClick={() => { setTab(t.key); setFilterStatus('all'); setSearch('') }}
              className={`flex-1 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${
                tab === t.key ? 'bg-[#1557FF] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  tab === t.key ? 'bg-white/20 text-white' :
                  t.highlight ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-[#0A1628] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1557FF]/20 focus:border-[#1557FF] transition-all" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {(tab === 'president' ? presFilters : citiFilters).map(([v, l]) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  filterStatus === v ? 'bg-[#1557FF] text-white shadow-md shadow-blue-200' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                {l}
              </button>
            ))}
          </div>

          <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-wider">
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
            <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-4xl">
              📭
            </div>
            <div className="text-center">
              <p className="font-black text-[#0A1628] text-lg mb-1">Aucune proposition trouvée</p>
              <p className="text-sm text-slate-400">
                {search ? 'Essayez avec d\'autres mots-clés' : 'Aucune proposition dans cette catégorie'}
              </p>
            </div>
            {tab === 'president' && !search && (
              <button onClick={() => { setEditProp(null); setShowForm(true) }}
                className="mt-2 flex items-center gap-2 bg-[#1557FF] text-white px-5 py-2.5 rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                <Plus className="w-4 h-4" />Créer la première proposition
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {tab === 'president'
              ? filtered.map(p => (
                  <PresCard key={p.id} prop={p}
                    onEdit={prop => { setEditProp(prop); setShowForm(true) }}
                    onDelete={prop => setDeleteProp(prop)} />
                ))
              : filtered.map(p => (
                  <CitiCard key={p.id} prop={p} onOpen={prop => setDecisionProp(prop)} />
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
    </PresidentLayout>
  )
}