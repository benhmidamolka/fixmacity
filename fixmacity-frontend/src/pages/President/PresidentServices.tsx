import React, { useState, useEffect, useCallback } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import {
  Plus, X, Search, Pencil, Trash2, Eye, EyeOff, AlertTriangle,
  Check, Loader2, ChevronRight, Building2, Users, CheckCircle,
  XCircle, Clock, TrendingUp, BarChart2, Shield, User
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
const getColor = (code: string) => COLORS[code] ?? '#1557FF'

// palette for custom departments
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
  total:     number   // total declarations
  accepted:  number   // accepted (not soumise/refusee_chef)
  resolved:  number   // resolue + cloturee
  rejected:  number   // refusee_chef + refusee_agent
  in_progress: number // en_cours
  agents_count: number
  created_at?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Ring chart ───────────────────────────────────────────────────────────────
const Ring: React.FC<{ value: number; color: string; size?: number; label?: string }> = ({
  value, color, size = 64, label
}) => {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(value, 100) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="6"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray .7s ease' }}/>
      <text x="50%" y={label ? '44%' : '54%'} dominantBaseline="middle" textAnchor="middle"
        fontSize="12" fontWeight="800" className="fill-slate-900 dark:fill-white">{value}%</text>
      {label && (
        <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle"
          fontSize="7" fontWeight="700" className="fill-slate-400 dark:fill-slate-500">{label}</text>
      )}
    </svg>
  )
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
    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-7 w-full max-w-xs text-center border border-transparent dark:border-slate-800">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
        <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`}/>
      </div>
      <p className="text-sm font-black text-[#0A1628] dark:text-white mb-1">{msg}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mb-6">{sub}</p>}
      {!sub && <div className="mb-6"/>}
      <div className="flex gap-3">
        <button onClick={onNo} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Annuler</button>
        <button onClick={onYes} className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}>Confirmer</button>
      </div>
    </div>
  </div>
)

// ─── Service Form Modal (Create / Edit) ───────────────────────────────────────
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
      if (res.error || res.errors) {
        setErr(res.error || res.errors?.[0]?.msg || 'Erreur')
        setSaving(false)
        return
      }
      onSaved(isEdit ? 'Service modifié avec succès.' : 'Service créé avec succès.')
    } catch {
      setErr('Erreur serveur.')
      setSaving(false)
    }
  }

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-white outline-none focus:border-[#1557FF] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all bg-white dark:bg-slate-900"

  const Field: React.FC<{ label: string; req?: boolean; children: React.ReactNode }> = ({ label, req, children }) => (
    <div>
      <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
        {label}{req && <span className="text-red-400 dark:text-red-500">*</span>}
      </label>
      {children}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-transparent dark:border-slate-800">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 pt-6 pb-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-[#0A1628] dark:text-white">
              {isEdit ? 'Modifier le service' : 'Nouveau service municipal'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
              {isEdit ? dept!.name_fr : 'Créer un département opérationnel'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700">
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400"/>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {err && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0"/>{err}
            </div>
          )}

          {/* Icon picker */}
          <Field label="Icône représentative">
            <div className="grid grid-cols-6 gap-2">
              {ICON_OPTIONS.map(opt => (
                <button key={opt.emoji} type="button"
                  onClick={() => setSelectedIcon(opt.emoji)}
                  className={`h-10 rounded-xl text-xl flex items-center justify-center border-2 transition-all ${selectedIcon === opt.emoji ? 'border-[#1557FF] bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
                  title={opt.label}>
                  {opt.emoji}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Nom français" req>
                <input className={inputCls} value={form.name_fr}
                  onChange={e => set('name_fr', e.target.value)} placeholder="Voirie & Routes"/>
              </Field>
            </div>
            <Field label="Code" req>
              <input className={`${inputCls} uppercase font-black text-center tracking-widest`}
                value={form.code} onChange={e => set('code', e.target.value.toUpperCase().slice(0,3))}
                placeholder="VR" maxLength={3} disabled={isEdit}
                style={isEdit ? { background: 'transparent', color: '#94A3B8' } : {}}/>
              {isEdit && <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">Non modifiable</p>}
            </Field>
          </div>

          <Field label="Nom arabe">
            <input className={inputCls} value={form.name_ar}
              onChange={e => set('name_ar', e.target.value)} placeholder="الطرق والأرصفة" dir="rtl"/>
          </Field>

          <Field label="Nom anglais">
            <input className={inputCls} value={form.name_en}
              onChange={e => set('name_en', e.target.value)} placeholder="Roads & Pavements"/>
          </Field>

          <Field label="Description">
            <textarea className={`${inputCls} resize-none h-20`}
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Description du service et de ses missions…"/>
          </Field>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
            Annuler
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#1557FF] text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 dark:shadow-none">
            {saving && <Loader2 className="w-4 h-4 animate-spin"/>}
            {isEdit ? 'Enregistrer' : 'Créer le service'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
const DetailDrawer: React.FC<{
  dept: Department
  onClose: () => void
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}> = ({ dept, onClose, onEdit, onToggle, onDelete }) => {
  const color   = dynamicColor(dept.code, dept.id)
  const icon    = getIcon(dept.code)
  const resRate = pct(dept.resolved, dept.total)
  const accRate = pct(dept.accepted, dept.total)

  const [agents,  setAgents]  = useState<Agent[]>([])
  const [decls,   setDecls]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dTab,    setDTab]    = useState<'agents'|'decls'>('agents')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [aRes, dRes] = await Promise.all([
          apiFetch(`/president/users?role=agent&department_id=${dept.id}&limit=50`),
          apiFetch(`/president/declarations?department_id=${dept.id}&limit=10`),
        ])
        if (aRes.users) setAgents(aRes.users)
        if (dRes.declarations) setDecls(dRes.declarations)
      } catch {}
      setLoading(false)
    }
    load()
  }, [dept.id])

  const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    soumise:         { label: 'SOUMISE',    color: '#64748B', bg: '#F8FAFC' },
    assignee_chef:   { label: 'CHEF',       color: '#F59E0B', bg: '#FFFBEB' },
    assignee_agent:  { label: 'AGENT',      color: '#3B82F6', bg: '#EFF6FF' },
    en_cours:        { label: 'EN COURS',   color: '#8B5CF6', bg: '#F5F3FF' },
    resolue:         { label: 'RÉSOLUE',    color: '#10B981', bg: '#ECFDF5' },
    cloturee:        { label: 'CLÔTURÉE',   color: '#059669', bg: '#D1FAE5' },
    refusee_chef:    { label: 'REF. CHEF',  color: '#EF4444', bg: '#FEF2F2' },
    refusee_agent:   { label: 'REF. AGENT', color: '#EF4444', bg: '#FEF2F2' },
  }

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative ml-auto h-full w-full max-w-md bg-white dark:bg-slate-950 shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'slideInRight .25s cubic-bezier(.22,1,.36,1) forwards' }}>

        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-100 dark:border-slate-800 px-6 pt-6 pb-5 bg-white dark:bg-slate-900">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-sm"
              style={{ background: `${color}15` }}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="font-black text-[#0A1628] dark:text-white text-base leading-tight truncate">{dept.name_fr}</h2>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest flex-shrink-0 text-white"
                  style={{ background: color }}>{dept.code}</span>
              </div>
              {dept.name_ar && <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold" dir="rtl">{dept.name_ar}</p>}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`flex items-center gap-1 text-[10px] font-bold ${dept.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dept.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}/>
                  {dept.is_active ? 'Actif' : 'Inactif'}
                </span>
                {dept.description && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate">· {dept.description}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 flex-shrink-0 transition-colors">
              <X className="w-4 h-4 text-slate-500 dark:text-slate-400"/>
            </button>
          </div>
        </div>

        {/* Chef de service */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
            style={{ background: color }}>
            {initials(dept.chef_name)}
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Chef de Service</p>
            <p className="text-sm font-black text-[#0A1628] dark:text-white">{dept.chef_name ?? 'Non assigné'}</p>
          </div>
          <Shield className="w-4 h-4 text-slate-300 dark:text-slate-700 ml-auto"/>
        </div>

        {/* Stats grid */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Statistiques</p>
          <div className="flex items-center gap-4 mb-4">
            <Ring value={resRate} color={color} size={72} label="résolution"/>
            <div className="flex-1 grid grid-cols-2 gap-2">
              {[
                { label: 'Total',     val: dept.total,       bg: 'bg-slate-50 dark:bg-slate-800/50',   tx: 'text-[#0A1628] dark:text-white', border: 'border-slate-100 dark:border-slate-800' },
                { label: 'En cours',  val: dept.in_progress, bg: 'bg-blue-50 dark:bg-blue-900/10',    tx: 'text-blue-600 dark:text-blue-400',  border: 'border-blue-100 dark:border-blue-900/20'  },
                { label: 'Acceptées', val: dept.accepted,    bg: 'bg-amber-50 dark:bg-amber-900/10',   tx: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/20' },
                { label: 'Résolues',  val: dept.resolved,    bg: 'bg-emerald-50 dark:bg-emerald-900/10', tx: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900/20' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center border ${s.border}`}>
                  <p className={`text-lg font-black ${s.tx}`}>{s.val}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Accepted & Rejected bars */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tâches acceptées</span>
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">{dept.accepted}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 rounded-full bg-amber-400 transition-all duration-700"
                  style={{ width: `${accRate}%` }}/>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tâches rejetées</span>
                <span className="text-[10px] font-black text-red-500 dark:text-red-400">{dept.rejected}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 rounded-full bg-red-400 transition-all duration-700"
                  style={{ width: `${pct(dept.rejected, dept.total)}%` }}/>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Taux de résolution</span>
                <span className="text-[10px] font-black" style={{ color }}>{resRate}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${resRate}%`, background: color }}/>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs — Agents / Déclarations */}
        <div className="flex-shrink-0 flex border-b border-slate-100 dark:border-slate-800 px-6 bg-white dark:bg-slate-900">
          {(['agents','decls'] as const).map(t => (
            <button key={t} onClick={() => setDTab(t)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${dTab === t ? 'border-[#1557FF] text-[#1557FF]' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              {t === 'agents' ? `👷 Agents (${agents.length})` : `📋 Déclarations récentes`}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-white dark:bg-slate-950">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-6 h-6 text-[#1557FF] animate-spin"/>
            </div>
          ) : dTab === 'agents' ? (
            agents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-600">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30"/>
                <p className="text-xs font-bold">Aucun agent assigné</p>
              </div>
            ) : (
              <div className="space-y-2">
                {agents.map(a => {
                  const total    = a.total_tasks    ?? 0
                  const resolved = a.resolved_tasks ?? 0
                  const prog     = pct(resolved, total)
                  const agColor  = dynamicColor('', a.id)
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: agColor }}>
                        {initials(`${a.first_name} ${a.last_name}`)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-black text-[#0A1628] dark:text-white truncate">{a.first_name} {a.last_name}</p>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${a.is_active ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                            {a.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                            <div className="h-1 rounded-full transition-all duration-500"
                              style={{ width: `${prog}%`, background: agColor }}/>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 flex-shrink-0">{resolved}/{total}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            decls.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-600">
                <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30"/>
                <p className="text-xs font-bold">Aucune déclaration</p>
              </div>
            ) : (
              <div className="space-y-2">
                {decls.map((d: any) => {
                  const meta = STATUS_META[d.status] ?? { label: d.status, color: '#64748B', bg: '#F8FAFC' }
                  return (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{ background: `${color}15` }}>{icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#0A1628] dark:text-white truncate">{d.title}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">
                          {d.ref_citoyen} · {new Date(d.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className="text-[8px] font-black px-2 py-1 rounded-lg flex-shrink-0"
                        style={{ color: meta.color, background: meta.bg }}>
                        {meta.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 px-6 py-5 space-y-2.5 bg-white dark:bg-slate-900">
          <button onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1557FF] text-white text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 dark:shadow-none">
            <Pencil className="w-4 h-4"/> Modifier le service
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={onToggle}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black border-2 transition-all ${dept.is_active ? 'border-amber-300 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'border-emerald-300 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>
              {dept.is_active ? <><EyeOff className="w-4 h-4"/> Désactiver</> : <><Eye className="w-4 h-4"/> Réactiver</>}
            </button>
            <button onClick={onDelete}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
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
  const color   = dynamicColor(dept.code, dept.id)
  const icon    = getIcon(dept.code)
  const resRate = pct(dept.resolved, dept.total)

  return (
    <div onClick={onClick}
      className={`group relative bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl border overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-blue-500/8 dark:hover:shadow-none hover:-translate-y-0.5 flex flex-col ${dept.is_active ? 'border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50' : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-80'}`}>

      {/* Color band top */}
      <div className="h-1.5 w-full" style={{ background: color }}/>

      {/* Inactive badge */}
      {!dept.is_active && (
        <div className="absolute top-4 right-4 z-10">
          <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-slate-700">
            Inactif
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Icon + Name + Code */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform"
            style={{ background: `${color}12` }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-black text-[#0A1628] dark:text-white text-sm leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {dept.name_fr}
            </h3>
            {dept.name_ar && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate mt-0.5" dir="rtl">{dept.name_ar}</p>
            )}
            <span className="inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest text-white"
              style={{ background: color }}>{dept.code}</span>
          </div>
          {/* Quick edit */}
          <button onClick={onEdit}
            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 dark:hover:text-blue-400 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
            title="Modifier">
            <Pencil className="w-3.5 h-3.5"/>
          </button>
        </div>

        {/* Chef de service */}
        <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-800">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] font-black flex-shrink-0"
            style={{ background: color }}>
            {initials(dept.chef_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Chef de Service</p>
            <p className="text-xs font-black text-[#0A1628] dark:text-white truncate">{dept.chef_name ?? 'Non assigné'}</p>
          </div>
          <Shield className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 flex-shrink-0"/>
        </div>

        {/* Stats: Acceptées / Rejetées */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-2.5 text-center border border-amber-100 dark:border-amber-900/20">
            <p className="text-lg font-black text-amber-600 dark:text-amber-400">{dept.accepted}</p>
            <p className="text-[8px] font-black uppercase tracking-widest text-amber-400 dark:text-amber-500">Acceptées</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-2.5 text-center border border-red-100 dark:border-red-900/20">
            <p className="text-lg font-black text-red-500 dark:text-red-400">{dept.rejected}</p>
            <p className="text-[8px] font-black uppercase tracking-widest text-red-400 dark:text-red-500">Rejetées</p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Taux résolution</span>
            <span className="text-[10px] font-black" style={{ color }}>{resRate}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${resRate}%`, background: color }}/>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] font-semibold text-slate-400">{dept.resolved} résolues</span>
            <span className="text-[8px] font-semibold text-slate-400">{dept.total} total</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 transition-colors">
        <div className="flex items-center gap-1.5">
          {/* Toggle active btn */}
          <button onClick={onToggle}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black border transition-all ${dept.is_active ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-slate-200 text-slate-400 hover:bg-slate-100'}`}
            title={dept.is_active ? 'Désactiver' : 'Réactiver'}>
            {dept.is_active ? <CheckCircle className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}
            {dept.is_active ? 'Actif' : 'Inactif'}
          </button>
          <span className="text-[9px] font-bold text-slate-400">{dept.agents_count} agents</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 group-hover:text-[#1557FF] transition-colors">
          Détails <ChevronRight className="w-3.5 h-3.5"/>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
const PresidentServices: React.FC = () => {
  const [depts,       setDepts]      = useState<Department[]>([])
  const [loading,     setLoading]    = useState(true)
  const [search,      setSearch]     = useState('')
  const [statusFilter,setStatus]     = useState<'all'|'active'|'inactive'>('all')
  const [drawer,      setDrawer]     = useState<Department | null>(null)
  const [editTarget,  setEditTarget] = useState<Department | null>(null)
  const [showForm,    setShowForm]   = useState(false)
  const [confirm,     setConfirm]    = useState<{ msg: string; sub?: string; onYes: () => void } | null>(null)
  const [toast,       setToast]      = useState<{ msg: string; type: 'ok'|'err' } | null>(null)

  const flash = (msg: string, type: 'ok'|'err' = 'ok') => setToast({ msg, type })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/president/departments')
      if (res.departments) {
        // Fetch per-dept accepted/rejected counts via enriched listDepartments
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

  // ── Toggle active ──
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
  const totalDecl = depts.reduce((s,d) => s + d.total, 0)
  const totalRes  = depts.reduce((s,d) => s + d.resolved, 0)
  const avgRate   = totalDecl > 0 ? pct(totalRes, totalDecl) : 0

  return (
    <PresidentLayout title="Gestion des Services Municipaux">
      <style>{`
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>

      <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 min-h-screen">
        <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-6 bg-[#1557FF] rounded-full"/>
              <h1 className="text-2xl font-black text-[#0A1628] dark:text-white uppercase tracking-tight">Services Municipaux</h1>
            </div>
            <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest pl-4">Gestion des départements opérationnels de Sousse</p>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
            <span className="text-[10px] font-black text-[#0A1628] dark:text-white uppercase tracking-widest">{depts.length} Services</span>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Services',    val: depts.length, sub: 'Départements',    color: '#1557FF', icon: '🏢' },
            { label: 'Services Actifs',   val: active,       sub: `${depts.length - active} inactifs`, color: '#10B981', icon: '⚡' },
            { label: 'Déclarations',      val: totalDecl,    sub: 'Total reçues',    color: '#F59E0B', icon: '📋' },
            { label: 'Taux Résolution',   val: `${avgRate}%`,sub: 'Moyenne globale', color: '#8B5CF6', icon: '✅' },
          ].map(k => (
            <div key={k.label} className="group bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-lg hover:shadow-blue-500/5 dark:hover:shadow-none transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-[3rem]" style={{ background: `${k.color}0A` }}/>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">{k.icon}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
                    style={{ background: `${k.color}15`, color: k.color }}>{k.sub}</span>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{k.label}</p>
                <p className="text-3xl font-black text-[#0A1628] dark:text-white">{k.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="flex-1 min-w-[260px] flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-sm focus-within:border-blue-400 dark:focus-within:border-blue-500 transition-all">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, code, chef…"
              className="flex-1 text-xs font-bold text-slate-600 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 outline-none bg-transparent"/>
            {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500"/></button>}
          </div>

          {/* Status filter */}
          <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-sm">
            {([['all','Tous'],['active','Actifs'],['inactive','Inactifs']] as const).map(([v,l]) => (
              <button key={v} onClick={() => setStatus(v)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === v ? 'text-white shadow-md' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                style={statusFilter === v ? { background: '#1557FF' } : {}}>
                {l}
              </button>
            ))}
          </div>

          {/* Create btn */}
          <button onClick={() => { setEditTarget(null); setShowForm(true) }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 transition-all ml-auto"
            style={{ background: '#1557FF' }}>
            <Plus className="w-4 h-4"/> Nouveau service
          </button>
        </div>

        {/* ── Count ── */}
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-5">
          {filtered.length} service(s) trouvé(s)
        </p>

        {/* ── Cards grid ── */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-[#1557FF] animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600">
            <Building2 className="w-10 h-10 mb-3 opacity-30"/>
            <p className="text-sm font-bold">Aucun service trouvé</p>
            <p className="text-xs mt-1">Créez un nouveau service ou modifiez vos filtres</p>
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

      {/* ── Detail Drawer ── */}
      {drawer && (
        <DetailDrawer dept={drawer}
          onClose={() => setDrawer(null)}
          onEdit={() => { setEditTarget(drawer); setShowForm(true) }}
          onToggle={() => toggleDept(drawer)}
          onDelete={() => deleteDept(drawer)}
        />
      )}

      {/* ── Create / Edit form ── */}
      {showForm && (
        <ServiceModal
          dept={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onSaved={msg => {
            setShowForm(false); setEditTarget(null); setDrawer(null)
            flash(msg); load()
          }}
        />
      )}

      {/* ── Confirm ── */}
      {confirm && (
        <Confirm msg={confirm.msg} sub={confirm.sub}
          onYes={confirm.onYes} onNo={() => setConfirm(null)}/>
      )}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}
    </PresidentLayout>
  )
}

export default PresidentServices