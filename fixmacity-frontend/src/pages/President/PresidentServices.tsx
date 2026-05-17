import React, { useState, useEffect, useCallback } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import {
  Plus, X, Search, Pencil, Trash2, Eye, EyeOff, AlertTriangle,
  Check, Loader2, ChevronRight, Building2, Users, CheckCircle,
  XCircle, Clock, BarChart2, Shield, ArrowRight, UserCheck, UserX,
  FileText, Calendar, MapPin, Hash
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token')

// ─── Department icons & colors ────────────────────────────────────────────────
const ICONS: Record<string, string> = {
  VR: '🛣️', EP: '💡', PD: '🗑️', EV: '🌿',
  EA: '💧', ST: '🚦', BP: '🏛️', SG: '💬',
}
const getIcon = (code: string) => ICONS[code] ?? '🏢'

const COLORS: Record<string, string> = {
  VR: '#3B82F6', EP: '#F59E0B', PD: '#10B981',
  EV: '#22C55E', EA: '#6366F1', ST: '#F97316',
  BP: '#8B5CF6', SG: '#EC4899',
}
const EXTRA_COLORS = ['#06B6D4','#84CC16','#F43F5E','#A855F7','#0EA5E9']
const dynamicColor = (code: string, id: string) => {
  if (COLORS[code]) return COLORS[code]
  return EXTRA_COLORS[id.charCodeAt(0) % EXTRA_COLORS.length]
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Agent {
  id: string
  first_name: string
  last_name: string
  email: string
  is_active: boolean
  total_tasks?: number
  resolved_tasks?: number
}

interface Department {
  id: string
  name_fr: string
  name_ar: string | null
  name_en: string | null
  code: string
  description: string | null
  is_active: boolean
  chef_name: string | null
  chef_id:   string | null
  total:     number
  accepted:  number
  resolved:  number
  rejected:  number
  in_progress: number
  agents_count: number
  created_at?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const apiFetch = (path: string, opts?: RequestInit) =>
  fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${tok()}`,
      'Content-Type': 'application/json',
      ...(opts?.headers ?? {}),
    },
  }).then(r => r.json())

function pct(n: number, d: number) {
  if (!d) return 0
  return Math.round((n / d) * 100)
}

const initials = (name: string | null) => {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast: React.FC<{ msg: string; type: 'ok' | 'err'; onDone: () => void }> = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t) }, [onDone])
  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-bold ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}
      style={{ animation: 'slideUp .3s ease forwards' }}>
      {type === 'ok' ? <Check className="w-4 h-4 flex-shrink-0"/> : <AlertTriangle className="w-4 h-4 flex-shrink-0"/>}
      {msg}
    </div>
  )
}

// ─── Confirm ──────────────────────────────────────────────────────────────────
const Confirm: React.FC<{ msg: string; sub?: string; onYes: () => void; onNo: () => void; danger?: boolean }> = ({
  msg, sub, onYes, onNo, danger = true
}) => (
  <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onNo}/>
    <div className="relative bg-slate-950/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-10 w-full max-w-sm text-center border border-slate-800/80">
      <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center mx-auto mb-6 ${danger ? 'bg-red-50 dark:bg-red-500/10' : 'bg-amber-50 dark:bg-amber-500/10'}`}>
        <AlertTriangle className={`w-8 h-8 ${danger ? 'text-red-500' : 'text-amber-500'}`}/>
      </div>
      <p className="text-lg font-black text-white mb-2 leading-tight">{msg}</p>
      {sub && <p className="text-xs text-slate-400 font-semibold mb-8 leading-relaxed px-2">{sub}</p>}
      {!sub && <div className="mb-8"/>}
      <div className="flex gap-4">
        <button onClick={onNo} className="flex-1 py-3.5 rounded-2xl border border-slate-800 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800/50 transition-all">Annuler</button>
        <button onClick={onYes} className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}>Confirmer</button>
      </div>
    </div>
  </div>
)

// ─── Service Form Modal ───────────────────────────────────────────────────────
interface FormState {
  name_fr: string; name_ar: string; name_en: string
  code: string; description: string
}

const ICON_OPTIONS = [
  { emoji: '🛣️', label: 'Route' }, { emoji: '💡', label: 'Éclairage' },
  { emoji: '🗑️', label: 'Déchets' }, { emoji: '🌿', label: 'Espaces verts' },
  { emoji: '💧', label: 'Réseau' }, { emoji: '🚦', label: 'Signalisation' },
  { emoji: '🏛️', label: 'Admin' }, { emoji: '💬', label: 'Suggestions' },
  { emoji: '🔧', label: 'Technique' }, { emoji: '🏗️', label: 'Construction' },
  { emoji: '⚡', label: 'Énergie' }, { emoji: '🌊', label: 'Eau' },
]

const ServiceModal: React.FC<{
  dept: Department | null
  onClose: () => void
  onSaved: (msg: string) => void
}> = ({ dept, onClose, onSaved }) => {
  const isEdit = !!dept
  const [form, setForm] = useState<FormState>({
    name_fr:     dept?.name_fr     ?? '',
    name_ar:     dept?.name_ar     ?? '',
    name_en:     dept?.name_en     ?? '',
    code:        dept?.code        ?? '',
    description: dept?.description ?? '',
  })
  const [selectedIcon, setSelectedIcon] = useState(dept ? getIcon(dept.code) : '🏢')
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name_fr.trim()) { setErr('Le nom en français est obligatoire.'); return }
    if (!form.code.trim())    { setErr('Le code est obligatoire.'); return }
    if (form.code.length > 3) { setErr('Le code ne doit pas dépasser 3 caractères.'); return }
    setSaving(true); setErr('')
    try {
      let res
      if (isEdit) {
        res = await apiFetch(`/president/departments/${dept!.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name_fr:     form.name_fr.trim(),
            name_ar:     form.name_ar.trim() || null,
            name_en:     form.name_en.trim() || null,
            description: form.description.trim() || null,
          }),
        })
      } else {
        res = await apiFetch('/president/departments', {
          method: 'POST',
          body: JSON.stringify({
            name_fr:     form.name_fr.trim(),
            name_ar:     form.name_ar.trim() || null,
            name_en:     form.name_en.trim() || null,
            code:        form.code.toUpperCase().trim(),
            description: form.description.trim() || null,
          }),
        })
      }
      if (res.error || res.errors) { setErr(res.error || res.errors?.[0]?.msg || 'Erreur'); setSaving(false); return }
      onSaved(isEdit ? 'Service modifié avec succès.' : 'Service créé avec succès.')
    } catch { setErr('Erreur serveur.'); setSaving(false) }
  }

  const inputCls = "w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-[#1557FF] focus:ring-4 focus:ring-blue-500/5 transition-all bg-white dark:bg-slate-900/50 placeholder:text-slate-300 dark:placeholder:text-slate-700"

  const Field: React.FC<{ label: string; req?: boolean; children: React.ReactNode }> = ({ label, req, children }) => (
    <div>
      <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
        {label}{req && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose}/>
      <div className="relative bg-slate-950/95 backdrop-blur-3xl rounded-[3rem] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden border border-slate-800/80 flex flex-col animate-in zoom-in-95 duration-500">
        <div className="flex-shrink-0 border-b border-slate-800 px-8 pt-8 pb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">{isEdit ? 'Modifier le service' : 'Nouveau service'}</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
              {isEdit ? `Configuration de ${dept!.name_fr}` : 'Créer un département opérationnel'}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-800/50 flex items-center justify-center hover:bg-slate-700 transition-all">
            <X className="w-5 h-5 text-slate-400"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
          {err && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest px-5 py-4 rounded-2xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0"/>{err}
            </div>
          )}
          <Field label="Identité visuelle">
            <div className="grid grid-cols-6 gap-3">
              {ICON_OPTIONS.map(opt => (
                <button key={opt.emoji} type="button" onClick={() => setSelectedIcon(opt.emoji)}
                  className={`h-12 rounded-2xl text-xl flex items-center justify-center border-2 transition-all ${selectedIcon === opt.emoji ? 'border-[#1557FF] bg-blue-500/10' : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'}`}
                  title={opt.label}>{opt.emoji}</button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Field label="Nom français" req>
                <input className={inputCls} value={form.name_fr} onChange={e => set('name_fr', e.target.value)} placeholder="Ex: Voirie & Réseaux"/>
              </Field>
            </div>
            <Field label="Code ID" req>
              <input className={`${inputCls} uppercase font-black text-center tracking-widest text-lg`}
                value={form.code} onChange={e => set('code', e.target.value.toUpperCase().slice(0,3))}
                placeholder="VR" maxLength={3} disabled={isEdit}
                style={isEdit ? { opacity: 0.5, cursor: 'not-allowed' } : {}}/>
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nom arabe">
              <input className={`${inputCls} text-right`} value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="الاسم بالعربية" dir="rtl"/>
            </Field>
            <Field label="Nom anglais">
              <input className={inputCls} value={form.name_en} onChange={e => set('name_en', e.target.value)} placeholder="Name in English"/>
            </Field>
          </div>
          <Field label="Missions du service">
            <textarea className={`${inputCls} resize-none h-28`} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Décrivez les responsabilités de ce département…"/>
          </Field>
        </div>

        <div className="flex-shrink-0 border-t border-slate-800 px-8 py-6 flex gap-4 bg-slate-900/40">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl border border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:bg-slate-800/50 transition-all">Annuler</button>
          <button onClick={save} disabled={saving}
            className="flex-[1.5] py-4 rounded-2xl bg-[#1557FF] text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/25">
            {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-5 h-5"/>}
            {isEdit ? 'Enregistrer les modifications' : 'Confirmer la création'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── STATUS badge config ──────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  soumise:        { label: 'Soumise',     color: '#64748B', bg: '#F8FAFC' },
  assignee_chef:  { label: 'Assignée',    color: '#F59E0B', bg: '#FFFBEB' },
  assignee_agent: { label: 'En équipe',   color: '#3B82F6', bg: '#EFF6FF' },
  en_cours:       { label: 'En cours',    color: '#8B5CF6', bg: '#F5F3FF' },
  resolue:        { label: 'Résolue',     color: '#10B981', bg: '#ECFDF5' },
  cloturee:       { label: 'Clôturée',    color: '#059669', bg: '#D1FAE5' },
  refusee_chef:   { label: 'Ref. chef',   color: '#EF4444', bg: '#FEF2F2' },
  refusee_agent:  { label: 'Ref. agent',  color: '#EF4444', bg: '#FEF2F2' },
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
const DetailDrawer: React.FC<{
  dept: Department
  onClose: () => void
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}> = ({ dept, onClose, onEdit, onToggle, onDelete }) => {
  const color = dynamicColor(dept.code, dept.id)
  const icon  = getIcon(dept.code)

  const [agents,  setAgents]  = useState<Agent[]>([])
  const [decls,   setDecls]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dTab,    setDTab]    = useState<'agents' | 'decls'>('agents')
  const [declsPage, setDeclsPage] = useState(0)
  const PAGE = 10

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [aRes, dRes] = await Promise.all([
          // include inactive agents too — no is_active filter
          apiFetch(`/president/users?role=agent&department_id=${dept.id}&limit=100`),
          apiFetch(`/president/declarations?department_id=${dept.id}&limit=100`),
        ])
        if (aRes.users)        setAgents(aRes.users)
        if (dRes.declarations) setDecls(dRes.declarations)
      } catch {}
      setLoading(false)
    }
    load()
  }, [dept.id])

  const activeAgents   = agents.filter(a => a.is_active)
  const inactiveAgents = agents.filter(a => !a.is_active)

  const pagedDecls = decls.slice(declsPage * PAGE, declsPage * PAGE + PAGE)
  const totalPages = Math.ceil(decls.length / PAGE)

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative ml-auto h-full w-full max-w-[520px] bg-slate-950/95 backdrop-blur-3xl shadow-2xl flex flex-col overflow-hidden border-l border-slate-800/50"
        style={{ animation: 'slideInRight .4s cubic-bezier(.22,1,.36,1) forwards' }}>

        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b border-slate-800/50 px-6 pt-6 pb-5 bg-slate-900/40">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: `${color}20` }}>{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="font-black text-white text-base leading-tight truncate">{dept.name_fr}</h2>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest flex-shrink-0 text-white"
                  style={{ background: color }}>{dept.code}</span>
              </div>
              {dept.name_ar && <p className="text-xs text-slate-400 font-semibold" dir="rtl">{dept.name_ar}</p>}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`flex items-center gap-1 text-[10px] font-bold ${dept.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dept.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}/>
                  {dept.is_active ? 'Actif' : 'Inactif'}
                </span>
                {dept.description && <span className="text-[10px] text-slate-500 truncate">· {dept.description}</span>}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors flex-shrink-0">
              <X className="w-4 h-4 text-slate-400"/>
            </button>
          </div>
        </div>

        {/* ── Chef de service ── */}
        <div className="flex-shrink-0 px-6 py-3.5 border-b border-slate-800/50 flex items-center gap-3 bg-slate-900/30">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
            style={{ background: color }}>{initials(dept.chef_name)}</div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Chef de Service</p>
            <p className="text-sm font-black text-white">{dept.chef_name ?? 'Non assigné'}</p>
          </div>
          <Shield className="w-4 h-4 text-slate-700 ml-auto"/>
        </div>

        {/* ── Stats grid — NO taux de résolution ── */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-slate-800/50">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Statistiques</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total',      val: dept.total,       color: '#94A3B8', bg: 'bg-slate-800/40',    border: 'border-slate-700/50' },
              { label: 'En cours',   val: dept.in_progress, color: '#3B82F6', bg: 'bg-blue-500/10',     border: 'border-blue-500/20'  },
              { label: 'Résolues',   val: dept.resolved,    color: '#10B981', bg: 'bg-emerald-500/10',  border: 'border-emerald-500/20'},
              { label: 'Refusées',   val: dept.rejected,    color: '#EF4444', bg: 'bg-red-500/10',      border: 'border-red-500/20'   },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center border ${s.border}`}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex-shrink-0 flex border-b border-slate-800/50 px-6 bg-slate-900/40">
          <button onClick={() => setDTab('agents')}
            className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all flex items-center justify-center gap-2
              ${dTab === 'agents' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            <Users className="w-3.5 h-3.5"/>
            Agents
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${dTab === 'agents' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
              {agents.length}
            </span>
          </button>
          <button onClick={() => setDTab('decls')}
            className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all flex items-center justify-center gap-2
              ${dTab === 'decls' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            <FileText className="w-3.5 h-3.5"/>
            Déclarations
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${dTab === 'decls' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
              {decls.length}
            </span>
          </button>
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-[#1557FF] animate-spin"/>
            </div>
          ) : dTab === 'agents' ? (

            /* ── AGENTS TAB ── */
            agents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                <Users className="w-10 h-10 mb-3 opacity-30"/>
                <p className="text-xs font-bold">Aucun agent dans ce département</p>
              </div>
            ) : (
              <div className="px-6 py-4 space-y-5">

                {/* Active agents */}
                {activeAgents.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400"/>
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                        Actifs — {activeAgents.length}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {activeAgents.map(a => (
                        <div key={a.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/50 border border-slate-800/60 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                            style={{ background: dynamicColor('', a.id) }}>
                            {initials(`${a.first_name} ${a.last_name}`)}
                          </div>
                          {/* Name + email */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white leading-tight">
                              {a.first_name} {a.last_name}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{a.email}</p>
                          </div>
                          {/* Active badge */}
                          <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                            Actif
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inactive agents */}
                {inactiveAgents.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <UserX className="w-3.5 h-3.5 text-slate-500"/>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        Inactifs — {inactiveAgents.length}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {inactiveAgents.map(a => (
                        <div key={a.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/30 border border-slate-800/40 opacity-60">
                          {/* Avatar greyed */}
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 grayscale"
                            style={{ background: dynamicColor('', a.id) }}>
                            {initials(`${a.first_name} ${a.last_name}`)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-400 leading-tight">
                              {a.first_name} {a.last_name}
                            </p>
                            <p className="text-[10px] text-slate-600 truncate mt-0.5">{a.email}</p>
                          </div>
                          <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-slate-800 text-slate-500 border border-slate-700 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"/>
                            Inactif
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )

          ) : (

            /* ── DECLARATIONS TAB ── */
            decls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                <FileText className="w-10 h-10 mb-3 opacity-30"/>
                <p className="text-xs font-bold">Aucune déclaration dans ce département</p>
              </div>
            ) : (
              <div className="px-6 py-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">
                  {decls.length} déclaration{decls.length > 1 ? 's' : ''} au total
                </p>
                <div className="space-y-2">
                  {pagedDecls.map((d: any) => {
                    const meta = STATUS_META[d.status] ?? { label: d.status, color: '#64748B', bg: '#F8FAFC' }
                    return (
                      <div key={d.id}
                        className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/60 hover:border-slate-700 transition-all">
                        {/* Dept icon */}
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                          style={{ background: `${color}20` }}>{icon}</div>

                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <p className="text-xs font-black text-white leading-tight line-clamp-2 mb-1.5">
                            {d.title}
                          </p>
                          {/* Meta row */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {/* Ref */}
                            <span className="flex items-center gap-1 text-[10px] font-mono text-[#1557FF] font-bold">
                              <Hash className="w-2.5 h-2.5"/>
                              {d.ref_citoyen || d.id?.slice(0,8)}
                            </span>
                            {/* Date */}
                            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                              <Calendar className="w-2.5 h-2.5"/>
                              {d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </span>
                            {/* Address if present */}
                            {d.address && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold truncate max-w-[120px]">
                                <MapPin className="w-2.5 h-2.5 flex-shrink-0"/>
                                {d.address}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status badge */}
                        <span className="text-[9px] font-black px-2 py-1 rounded-lg flex-shrink-0 mt-0.5"
                          style={{ color: meta.color, background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}>
                          {meta.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                    <button
                      disabled={declsPage === 0}
                      onClick={() => setDeclsPage(p => p - 1)}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-30 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800 disabled:hover:bg-transparent">
                      ← Précédent
                    </button>
                    <span className="text-[10px] font-black text-slate-500">
                      {declsPage + 1} / {totalPages}
                    </span>
                    <button
                      disabled={declsPage >= totalPages - 1}
                      onClick={() => setDeclsPage(p => p + 1)}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-30 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800 disabled:hover:bg-transparent">
                      Suivant →
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex-shrink-0 border-t border-slate-800/50 px-6 py-5 space-y-3 bg-slate-900/60">
          <button onClick={onEdit}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-[#1557FF] text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20">
            <Pencil className="w-4 h-4"/> Modifier le service
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onToggle}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all
                ${dept.is_active
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}>
              {dept.is_active ? <><EyeOff className="w-4 h-4"/> Désactiver</> : <><Eye className="w-4 h-4"/> Réactiver</>}
            </button>
            <button onClick={onDelete}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-[10px] font-black uppercase tracking-[0.2em]">
              <Trash2 className="w-4 h-4"/> Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Service Card ─────────────────────────────────────────────────────────────
const ServiceCard: React.FC<{
  dept: Department
  onClick: () => void
  onToggle: (e: React.MouseEvent) => void
  onEdit: (e: React.MouseEvent) => void
}> = ({ dept, onClick, onToggle, onEdit }) => {
  const color = dynamicColor(dept.code, dept.id)
  const icon  = getIcon(dept.code)

  return (
    <div onClick={onClick}
      className={`group relative bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/80 overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 flex flex-col ${!dept.is_active ? 'opacity-50 hover:opacity-100 grayscale-[0.5] hover:grayscale-0' : 'hover:border-[#1557FF]/30'}`}>

      <div className="h-1.5 w-full" style={{ background: color }}/>

      {!dept.is_active && (
        <div className="absolute top-4 right-4 z-10">
          <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-700">Inactif</span>
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-105 transition-transform"
            style={{ background: `${color}12` }}>{icon}</div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-black text-[#0A1628] dark:text-white text-sm leading-tight truncate group-hover:text-blue-600 transition-colors">{dept.name_fr}</h3>
            {dept.name_ar && <p className="text-[10px] text-slate-400 truncate mt-0.5" dir="rtl">{dept.name_ar}</p>}
            <span className="inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest text-white" style={{ background: color }}>{dept.code}</span>
          </div>
          <button onClick={onEdit} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0" title="Modifier">
            <Pencil className="w-3.5 h-3.5"/>
          </button>
        </div>

        {/* Chef */}
        <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-800">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] font-black flex-shrink-0" style={{ background: color }}>
            {initials(dept.chef_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Chef de Service</p>
            <p className="text-xs font-black text-[#0A1628] dark:text-white truncate">{dept.chef_name ?? 'Non assigné'}</p>
          </div>
          <Shield className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 flex-shrink-0"/>
        </div>

        {/* Stats: 4 numbers, no resolution rate */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Total',    val: dept.total,       tx: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800/40' },
            { label: 'En cours', val: dept.in_progress, tx: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/10'   },
            { label: 'Résolues', val: dept.resolved,    tx: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
            { label: 'Refusées', val: dept.rejected,    tx: 'text-red-500 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/10'     },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center`}>
              <p className={`text-base font-black ${s.tx}`}>{s.val}</p>
              <p className="text-[7px] font-black uppercase tracking-wide text-slate-400 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${dept.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}/>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{dept.agents_count} agents</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-700 group-hover:text-[#1557FF] transition-all">
          Détails <ArrowRight className="w-3.5 h-3.5 translate-x-0 group-hover:translate-x-1 transition-transform"/>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
const PresidentServices: React.FC = () => {
  const [depts,        setDepts]      = useState<Department[]>([])
  const [loading,      setLoading]    = useState(true)
  const [search,       setSearch]     = useState('')
  const [statusFilter, setStatus]     = useState<'all'|'active'|'inactive'>('all')
  const [drawer,       setDrawer]     = useState<Department | null>(null)
  const [editTarget,   setEditTarget] = useState<Department | null>(null)
  const [showForm,     setShowForm]   = useState(false)
  const [confirm,      setConfirm]    = useState<{ msg: string; sub?: string; onYes: () => void } | null>(null)
  const [toast,        setToast]      = useState<{ msg: string; type: 'ok'|'err' } | null>(null)

  const flash = (msg: string, type: 'ok'|'err' = 'ok') => setToast({ msg, type })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/president/departments')
      if (res.departments) {
        setDepts(res.departments.map((d: any) => ({
          id:           d.id,
          name_fr:      d.name_fr || d.name,
          name_ar:      d.name_ar ?? null,
          name_en:      d.name_en ?? null,
          code:         d.code,
          description:  d.description ?? null,
          is_active:    d.is_active ?? true,
          chef_name:    d.chef_name ?? null,
          chef_id:      d.chef_id   ?? null,
          total:        d.total       ?? 0,
          accepted:     d.accepted    ?? 0,
          resolved:     d.resolved    ?? 0,
          rejected:     d.rejected    ?? 0,
          in_progress:  d.in_progress ?? 0,
          agents_count: d.agents_count ?? 0,
          created_at:   d.created_at,
        })))
      }
    } catch { flash('Erreur lors du chargement.', 'err') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleDept = async (d: Department, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const next = !d.is_active
    try {
      const res = await apiFetch(`/president/departments/${d.id}/status`, {
        method: 'PATCH', body: JSON.stringify({ is_active: next })
      })
      if (res.error) { flash(res.error, 'err'); return }
      setDepts(prev => prev.map(p => p.id === d.id ? { ...p, is_active: next } : p))
      if (drawer?.id === d.id) setDrawer(x => x ? { ...x, is_active: next } : null)
      flash(next ? 'Service réactivé.' : 'Service désactivé.')
    } catch { flash('Erreur serveur.', 'err') }
  }

  const deleteDept = (d: Department) => {
    setConfirm({
      msg: `Supprimer le service "${d.name_fr}" ?`,
      sub: 'Cette action est irréversible. Un service ne peut être supprimé que s\'il n\'a aucune déclaration active.',
      onYes: async () => {
        setConfirm(null)
        try {
          const res = await apiFetch(`/president/departments/${d.id}`, { method: 'DELETE' })
          if (res.error) { flash(res.error, 'err'); return }
          setDepts(prev => prev.filter(p => p.id !== d.id))
          setDrawer(null)
          flash('Service supprimé.')
        } catch { flash('Erreur serveur.', 'err') }
      }
    })
  }

  const filtered = depts.filter(d => {
    if (search && !`${d.name_fr} ${d.code} ${d.chef_name ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter === 'active'   && !d.is_active) return false
    if (statusFilter === 'inactive' &&  d.is_active) return false
    return true
  })

  const active    = depts.filter(d => d.is_active).length
  const totalDecl = depts.reduce((s, d) => s + d.total, 0)

  return (
    <PresidentLayout title="Gestion des Services Municipaux">
      <style>{`
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>

      <div className="flex-1 bg-transparent p-6 min-h-screen">
        <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-10 bg-[#1557FF] rounded-full shadow-[0_0_20px_rgba(21,87,255,0.4)]"/>
                <h1 className="text-4xl font-black text-[#0A1628] dark:text-white tracking-tight uppercase">Services Municipaux</h1>
              </div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] pl-6">Administration & Performance des pôles opérationnels</p>
            </div>
            <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl px-6 py-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xl">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"/>
              <span className="text-xs font-black text-[#0A1628] dark:text-white uppercase tracking-widest">{depts.length} Départements</span>
            </div>
          </div>

          {/* KPIs — removed taux résolution from here too */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total Services',  val: depts.length, sub: 'Départements',           color: '#1557FF', icon: '🏢' },
              { label: 'Services Actifs', val: active,       sub: `${depts.length - active} inactifs`, color: '#10B981', icon: '⚡' },
              { label: 'Déclarations',    val: totalDecl,    sub: 'Total reçues',            color: '#F59E0B', icon: '📋' },
            ].map(k => (
              <div key={k.label} className="group bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-slate-800 hover:border-[#1557FF]/30 hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-[5rem] group-hover:scale-110 transition-transform duration-700" style={{ background: `linear-gradient(135deg, ${k.color}10, transparent)`}}/>
                <div className="relative">
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl group-hover:rotate-6 transition-transform duration-500" style={{ background: `${k.color}15` }}>{k.icon}</div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-xl border border-white/20 dark:border-slate-800" style={{ background: `${k.color}10`, color: k.color }}>{k.sub}</span>
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">{k.label}</p>
                  <p className="text-4xl font-black text-[#0A1628] dark:text-white tracking-tighter">{k.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex-1 min-w-[320px] flex items-center gap-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-3.5 shadow-sm focus-within:border-[#1557FF]/50 transition-all">
              <Search className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un pôle, un code ou un responsable…"
                className="flex-1 text-sm font-bold text-slate-600 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 outline-none bg-transparent"/>
              {search && <button onClick={() => setSearch('')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X className="w-4 h-4 text-slate-400"/></button>}
            </div>

            <div className="flex bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm">
              {([['all','Tous'],['active','Actifs'],['inactive','Inactifs']] as const).map(([v,l]) => (
                <button key={v} onClick={() => setStatus(v)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${statusFilter === v ? 'bg-slate-900 dark:bg-[#1557FF] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                  {l}
                </button>
              ))}
            </div>

            <button onClick={() => { setEditTarget(null); setShowForm(true) }}
              className="flex items-center gap-3 px-8 h-[56px] rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white bg-[#1557FF] shadow-2xl shadow-blue-500/30 hover:bg-blue-600 hover:-translate-y-0.5 transition-all ml-auto">
              <Plus className="w-5 h-5"/> Nouveau service
            </button>
          </div>

          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-5">{filtered.length} service(s) trouvé(s)</p>

          {/* Cards */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-10 h-10 text-[#1557FF] animate-spin"/>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              <Building2 className="w-10 h-10 mb-3 opacity-30"/>
              <p className="text-sm font-bold">Aucun service trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {filtered.map(d => (
                <ServiceCard key={d.id} dept={d}
                  onClick={() => setDrawer(d)}
                  onToggle={e => toggleDept(d, e)}
                  onEdit={e => { e.stopPropagation(); setEditTarget(d); setShowForm(true) }}
                />
              ))}
            </div>
          )}
        </div>

        {drawer && (
          <DetailDrawer dept={drawer}
            onClose={() => setDrawer(null)}
            onEdit={() => { setEditTarget(drawer); setShowForm(true) }}
            onToggle={() => toggleDept(drawer)}
            onDelete={() => deleteDept(drawer)}
          />
        )}

        {showForm && (
          <ServiceModal dept={editTarget}
            onClose={() => { setShowForm(false); setEditTarget(null) }}
            onSaved={msg => { setShowForm(false); setEditTarget(null); setDrawer(null); flash(msg); load() }}
          />
        )}

        {confirm && <Confirm msg={confirm.msg} sub={confirm.sub} onYes={confirm.onYes} onNo={() => setConfirm(null)}/>}
        {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}
      </div>
    </PresidentLayout>
  )
}

export default PresidentServices