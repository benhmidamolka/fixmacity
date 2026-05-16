import React, { useState, useEffect, useRef } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import {
  Plus, Search, X, ChevronDown, CheckCircle, XCircle,
  Pencil, Trash2, Eye, EyeOff, Building2, User, Mail,
  Phone, Shield, BarChart2, TrendingUp, Loader2, AlertTriangle,
  Check, ChevronRight, Lock
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token')

// ─── Helpers ────────────────────────────────────────────────────────────────
const PALETTE = ['#1557FF', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#0891B2', '#EC4899', '#14B8A6']
const avatarColor = (name: string) => PALETTE[(name?.charCodeAt(0) ?? 0) % PALETTE.length]
const initials = (fn: string, ln: string) => {
  const a = (fn?.trim()?.[0] ?? '').toUpperCase()
  const b = (ln?.trim()?.[0] ?? '').toUpperCase()
  const s = `${a}${b}`
  return s || '—'
}

function pct(done: number, total: number) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Personnel {
  id: string
  first_name: string
  last_name: string
  email: string
  role: 'agent' | 'chef'
  department_id: string | null
  department_name: string
  department_code: string
  delegation_id: string | null
  location: string
  phone: string
  is_active: boolean
  total_tasks: number
  resolved_tasks: number
  accepted_tasks: number
  created_at: string
}

interface Department {
  id: string
  name_fr: string
  name_ar?: string
  name_en?: string
  code: string
  is_active: boolean
  chef_name?: string | null
}

// ─── API helpers ─────────────────────────────────────────────────────────────
const apiFetch = (path: string, opts?: RequestInit) =>
  fetch(`${API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  }).then(r => r.json())

// ─── Progress Ring ───────────────────────────────────────────────────────────
const Ring: React.FC<{ value: number; color: string; size?: number }> = ({ value, color, size = 52 }) => {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(value, 100) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-slate-800" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray .6s ease' }} />
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle"
        fontSize="11" fontStyle="italic" fontWeight="900" fill="currentColor" className="text-[#0A1628] dark:text-white">{value}%</text>
    </svg>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar: React.FC<{ fn: string; ln: string; size?: number; ring?: boolean }> = ({ fn, ln, size = 44, ring }) => (
  <div className={`rounded-xl flex items-center justify-center text-white font-black flex-shrink-0 ${ring ? 'ring-2 ring-white' : ''}`}
    style={{ width: size, height: size, background: avatarColor(fn), fontSize: size * 0.36 }}>
    {initials(fn, ln)}
  </div>
)

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast: React.FC<{ msg: string; type: 'ok' | 'err'; onDone: () => void }> = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-bold animate-slide-up ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {type === 'ok' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {msg}
    </div>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
const Confirm: React.FC<{ msg: string; onYes: () => void; onNo: () => void }> = ({ msg, onYes, onNo }) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md" onClick={onNo} />
    <div className="relative bg-white dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 w-full max-w-sm border border-white dark:border-slate-800/50">
      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-8 text-center leading-relaxed">{msg}</p>
      <div className="flex gap-3">
        <button onClick={onNo} className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Annuler</button>
        <button onClick={onYes} className="flex-1 py-3 rounded-2xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-200 dark:shadow-none">Confirmer</button>
      </div>
    </div>
  </div>
)

// ─── User Form Modal (Create / Edit) ─────────────────────────────────────────
interface FormState {
  first_name: string; last_name: string; email: string
  password: string; role: 'agent' | 'chef'
  department_id: string; delegation_id: string; phone: string
}

const DELEGATIONS = [
  { id: 'a309fed2-6c50-49ae-b2be-a6e7ccd096df', name: 'Sousse Ville' },
  { id: '0ede6556-2f67-4a0d-a7cb-d0cdca4504a5', name: 'Sousse Jawhara' },
  { id: 'a1ca5994-b186-4970-91f6-c44925cfc4b4', name: 'Sousse Sidi Abdelhamid' },
]

const UserModal: React.FC<{
  user: Personnel | null
  departments: Department[]
  onClose: () => void
  onSaved: (msg: string) => void
}> = ({ user, departments, onClose, onSaved }) => {
  const isEdit = !!user
  const [form, setForm] = useState<FormState>({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
    password: '',
    role: (user?.role as any) ?? 'agent',
    department_id: user?.department_id ?? '',
    delegation_id: user?.delegation_id ?? '',
    phone: user?.phone ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.first_name || !form.last_name || !form.email) { setErr('Prénom, nom et email requis.'); return }
    if (!isEdit && !form.password) { setErr('Mot de passe requis.'); return }
    setSaving(true); setErr('')
    try {
      let res
      if (isEdit) {
        const body: any = {
          role: form.role,
          department_id: form.department_id || null,
          delegation_id: form.delegation_id || null,
        }
        // also allow updating name/email/phone if backend supports
        res = await apiFetch(`/president/users/${user!.id}`, {
          method: 'PATCH', body: JSON.stringify(body)
        })
      } else {
        const body: any = {
          first_name: form.first_name, last_name: form.last_name,
          email: form.email, password: form.password,
          role: form.role,
          department_id: form.department_id || null,
          delegation_id: form.delegation_id || null,
        }
        res = await apiFetch('/president/users', { method: 'POST', body: JSON.stringify(body) })
      }
      if (res.error || res.errors) { setErr(res.error || res.errors?.[0]?.msg || 'Erreur'); setSaving(false); return }
      onSaved(isEdit ? 'Compte mis à jour.' : 'Compte créé avec succès.')
    } catch {
      setErr('Erreur serveur.')
      setSaving(false)
    }
  }

  const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  )

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-white outline-none focus:border-[#1557FF] dark:focus:border-[#1557FF] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all bg-white dark:bg-slate-950"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-white dark:border-slate-800/50">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 pt-6 pb-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-[#0A1628] dark:text-white">
              {isEdit ? 'Modifier le compte' : 'Nouveau compte'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
              {isEdit ? `${user!.first_name} ${user!.last_name}` : 'Agent ou Chef de Service'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {err && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />{err}
            </div>
          )}

          {/* Role selector */}
          <Field label="Rôle">
            <div className="flex gap-2">
              {(['agent', 'chef'] as const).map(r => (
                <button key={r} onClick={() => set('role', r)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${form.role === r ? 'border-[#1557FF] bg-blue-50 dark:bg-blue-900/20 text-[#1557FF]' : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                  {r === 'agent' ? '👷 Agent' : '👔 Chef'}
                </button>
              ))}
            </div>
          </Field>

          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom">
                <input className={inputCls} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Karim" />
              </Field>
              <Field label="Nom">
                <input className={inputCls} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Mansour" />
              </Field>
            </div>
          )}

          {!isEdit && (
            <Field label="Email">
              <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="karim@sousse.tn" />
            </Field>
          )}

          {!isEdit && (
            <Field label="Mot de passe">
              <div className="relative">
                <input className={`${inputCls} pr-12`} type={showPwd ? 'text' : 'password'}
                  value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 caractères" />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
          )}

          <Field label="Département">
            <select className={inputCls} value={form.department_id} onChange={e => set('department_id', e.target.value)}>
              <option value="">— Sélectionner —</option>
              {departments.filter(d => d.is_active).map(d => (
                <option key={d.id} value={d.id}>{d.name_fr} ({d.code})</option>
              ))}
            </select>
          </Field>

          <Field label="Délégation">
            <select className={inputCls} value={form.delegation_id} onChange={e => set('delegation_id', e.target.value)}>
              <option value="">— Sélectionner —</option>
              {DELEGATIONS.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Annuler
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#1557FF] text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Créer le compte'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail / Profile Drawer ──────────────────────────────────────────────────
const ProfileDrawer: React.FC<{
  user: Personnel
  departments: Department[]
  onClose: () => void
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}> = ({ user, departments, onClose, onEdit, onToggle, onDelete }) => {
  const color = avatarColor(user.first_name)
  const fullName = `${user.first_name} ${user.last_name}`.trim() || '—'
  const done = user.resolved_tasks ?? 0
  const total = user.total_tasks ?? 0
  const accepted = user.accepted_tasks ?? 0
  const progress = pct(done, total)
  const dept = departments.find(d => d.id === user.department_id)

  return (
    <div className="fixed inset-0 z-[90] flex">
      <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      {/* Drawer slides in from right */}
      <div className="relative ml-auto h-full w-full max-w-md bg-white dark:bg-slate-950/90 backdrop-blur-xl shadow-2xl flex flex-col overflow-y-auto animate-slide-in-right border-l border-white dark:border-slate-800/50">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Fiche Personnel</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Profile card */}
        <div className="px-6 py-6 flex items-start gap-4 border-b border-slate-100 dark:border-slate-800">
          <Avatar fn={user.first_name} ln={user.last_name} size={56} />
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-[#0A1628] dark:text-white text-lg leading-tight">{fullName}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest text-white"
                style={{ background: color }}>
                {user.role === 'chef' ? 'Chef de Service' : 'Agent Terrain'}
              </span>
              <span className={`flex items-center gap-1 text-[10px] font-bold ${user.is_active ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-400 dark:text-slate-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                {user.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="px-6 py-5 space-y-3 border-b border-slate-100 dark:border-slate-800">
          {[
            { icon: Mail, label: 'Email', val: user.email },
            { icon: Phone, label: 'Téléphone', val: user.phone || '—' },
            { icon: Building2, label: 'Département', val: user.department_name || '—' },
            { icon: Shield, label: 'Délégation', val: user.location || '—' },
          ].map(({ icon: Icon, label, val }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5 break-all">{val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Performance</p>

          {user.role === 'agent' ? (
            <>
              {/* Progress bar block */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">Tâches</p>
                    <p className="text-2xl font-black text-[#0A1628] dark:text-white leading-none mt-0.5">{total}</p>
                  </div>
                  <Ring value={progress} color={color} />
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, background: color }} />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5">{done} résolues sur {total} total</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-900/20">
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-500">{done}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 dark:text-emerald-600">Résolues</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-900/20">
                  <p className="text-xl font-black text-[#1557FF] dark:text-blue-400">{accepted}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 dark:text-blue-600">Acceptées</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">Tâches du service</p>
                    <p className="text-2xl font-black text-[#0A1628] dark:text-white leading-none mt-0.5">{total}</p>
                  </div>
                  <Ring value={progress} color={color} />
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, background: color }} />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5">{done} résolues sur {total} total</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 text-center border border-amber-100 dark:border-amber-900/20">
                  <p className="text-xl font-black text-amber-600 dark:text-amber-500">{accepted}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 dark:text-amber-600">Acceptées</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-3 text-center border border-purple-100 dark:border-purple-900/20">
                  <p className="text-xl font-black text-purple-600 dark:text-purple-500">{dept ? '✓' : '—'}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-purple-400 dark:text-purple-600">Chef dept.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-5 space-y-2.5 mt-auto">
          <button onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1557FF] text-white text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
            <Pencil className="w-4 h-4" /> Modifier le compte
          </button>
          <button onClick={onToggle}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black border-2 transition-all ${user.is_active ? 'border-amber-300 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10' : 'border-emerald-300 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'}`}>
            {user.is_active ? <><EyeOff className="w-4 h-4" /> Désactiver</> : <><Eye className="w-4 h-4" /> Réactiver</>}
          </button>
          <button onClick={onDelete}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 dark:border-red-900/40 text-red-500 text-sm font-black hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
            <Trash2 className="w-4 h-4" /> Supprimer le compte
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Personnel Card ───────────────────────────────────────────────────────────
const PersonCard: React.FC<{
  user: Personnel
  onClick: () => void
  onToggle: (e: React.MouseEvent) => void
  onDelete: (u: Personnel) => void
}> = ({ user, onClick, onToggle, onDelete }) => {
  const color = avatarColor(user.first_name)
  const done = user.resolved_tasks ?? 0
  const total = user.total_tasks ?? 0
  const accepted = user.accepted_tasks ?? 0
  const progress = pct(done, total)

  return (
    <div onClick={onClick}
      className="group bg-white dark:bg-slate-900/40 rounded-[2rem] border border-slate-200 dark:border-slate-800/60 p-6 hover:border-blue-400 dark:hover:border-blue-700 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer flex flex-col gap-5 relative overflow-hidden backdrop-blur-xl">
      {/* subtle bg deco */}
      <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-[3rem] opacity-50"
        style={{ background: `${color}0D` }} />

      {/* Top row */}
      <div className="flex items-start gap-3 relative">
        <div className="relative">
          <Avatar fn={user.first_name} ln={user.last_name} size={48} />
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${user.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-[#0A1628] dark:text-white text-sm leading-tight truncate">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate mt-0.5">{user.email}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest text-white"
              style={{ background: color }}>
              {user.role === 'chef' ? 'Chef' : 'Agent'}
            </span>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate">{user.department_name}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button onClick={onToggle}
            className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all ${user.is_active ? 'border-emerald-200 dark:border-emerald-900/40 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            title={user.is_active ? 'Désactiver' : 'Réactiver'}>
            {user.is_active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(user); }}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border-2 border-red-100 dark:border-red-900/40 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
            title="Supprimer">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 text-center border border-slate-100 dark:border-slate-800">
          <p className="text-base font-black text-[#0A1628] dark:text-white">{total}</p>
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tâches</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-2.5 text-center border border-emerald-100 dark:border-emerald-800/40">
          <p className="text-base font-black text-emerald-600 dark:text-emerald-500">{done}</p>
          <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400 dark:text-emerald-600">Résolues</p>
        </div>
        <div className={`rounded-xl p-2.5 text-center border ${user.role === 'chef' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/40' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/40'}`}>
          <p className={`text-base font-black ${user.role === 'chef' ? 'text-amber-600 dark:text-amber-500' : 'text-[#1557FF] dark:text-blue-400'}`}>{accepted}</p>
          <p className={`text-[8px] font-black uppercase tracking-widest ${user.role === 'chef' ? 'text-amber-400 dark:text-amber-600' : 'text-blue-400 dark:text-blue-600'}`}>Acceptées</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Progression</p>
          <p className="text-[10px] font-black dark:text-white" style={{ color }}>{progress}%</p>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: color }} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{user.location || 'Sousse'}</p>
        <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 dark:text-slate-500 group-hover:text-[#1557FF] transition-colors">
          Voir profil <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  )
}

// ─── Department creation modal ────────────────────────────────────────────────
const DeptModal: React.FC<{ onClose: () => void; onSaved: (msg: string) => void }> = ({ onClose, onSaved }) => {
  const [form, setForm] = useState({ name_fr: '', name_ar: '', name_en: '', code: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:border-[#1557FF] focus:ring-2 focus:ring-blue-100 transition-all"

  const save = async () => {
    if (!form.name_fr || !form.code) { setErr('Nom (FR) et code requis.'); return }
    setSaving(true); setErr('')
    try {
      const res = await apiFetch('/president/departments', {
        method: 'POST', body: JSON.stringify(form)
      })
      if (res.error) { setErr(res.error); setSaving(false); return }
      onSaved('Département créé avec succès.')
    } catch { setErr('Erreur serveur.'); setSaving(false) }
  }

  const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-md border border-white dark:border-slate-800/50 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800 px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-[#0A1628] dark:text-white">Nouveau département</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Créer un service municipal</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {err && <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{err}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom français *">
              <input className={inputCls} value={form.name_fr} onChange={e => set('name_fr', e.target.value)} placeholder="Voirie & Routes" />
            </Field>
            <Field label="Code *">
              <input className={`${inputCls} uppercase`} value={form.code} onChange={e => set('code', e.target.value.toUpperCase().slice(0, 3))} placeholder="VR" maxLength={3} />
            </Field>
          </div>
          <Field label="Nom arabe">
            <input className={inputCls} value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="الطرق والأرصفة" dir="rtl" />
          </Field>
          <Field label="Nom anglais">
            <input className={inputCls} value={form.name_en} onChange={e => set('name_en', e.target.value)} placeholder="Roads & Pavements" />
          </Field>
          <Field label="Description">
            <textarea className={`${inputCls} resize-none h-20`} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description du service..." />
          </Field>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Annuler</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#1557FF] text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Créer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PresidentPersonnel: React.FC = () => {
  const [tab, setTab] = useState<'agent' | 'chef'>('agent')
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [users, setUsers] = useState<Personnel[]>([])
  const [departments, setDepts] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<Personnel | null>(null)
  const [editTarget, setEditTarget] = useState<Personnel | null>(null)
  const [showUserModal, setUserModal] = useState(false)
  const [showDeptModal, setDeptModal] = useState(false)
  const [confirm, setConfirm] = useState<{ msg: string; onYes: () => void } | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => setToast({ msg, type })

  // ── Load ──
  const load = async () => {
    setLoading(true)
    try {
      const [uRes, dRes] = await Promise.all([
        apiFetch('/president/users?limit=200'),
        apiFetch('/president/departments'),
      ])
      if (uRes.users) {
        // Enrich with fake resolved/accepted counts from total (placeholder if backend doesn't return them)
        setUsers(uRes.users.map((u: any) => ({
          ...u,
          department_name: u.department_name || 'N/A',
          department_code: u.department_code || '—',
          location: u.location || 'Sousse',
          phone: u.phone || '—',
          total_tasks: typeof u.total_tasks === 'object' ? (u.total_tasks?.total ?? 0) : (u.total_tasks ?? 0),
          resolved_tasks: typeof u.total_tasks === 'object' ? (u.total_tasks?.resolved ?? 0) : (u.resolved_tasks ?? 0),
          accepted_tasks: typeof u.total_tasks === 'object' ? (u.total_tasks?.accepted ?? 0) : (u.accepted_tasks ?? 0),
          is_active: u.is_active ?? true,
        })))
      }
      if (dRes.departments) setDepts(dRes.departments)
    } catch (e) {
      showToast('Erreur lors du chargement.', 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Toggle active ──
  const toggleUser = async (u: Personnel, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const newStatus = !u.is_active
    try {
      const res = await apiFetch(`/president/users/${u.id}`, {
        method: 'PATCH', body: JSON.stringify({ is_active: newStatus })
      })
      if (res.error) { showToast(res.error, 'err'); return }
      setUsers(prev => prev.map(p => p.id === u.id ? { ...p, is_active: newStatus } : p))
      if (drawer?.id === u.id) setDrawer(d => d ? { ...d, is_active: newStatus } : null)
      showToast(newStatus ? 'Compte réactivé.' : 'Compte désactivé.')
    } catch { showToast('Erreur serveur.', 'err') }
  }

  // ── Delete ──
  const deleteUser = (u: Personnel) => {
    setConfirm({
      msg: `Supprimer le compte de ${u.first_name} ${u.last_name} ? Cette action est irréversible.`,
      onYes: async () => {
        setConfirm(null)
        try {
          const res = await apiFetch(`/president/users/${u.id}`, { method: 'DELETE' })
          if (res.error) { showToast(res.error, 'err'); return }
          setUsers(prev => prev.filter(p => p.id !== u.id))
          setDrawer(null)
          showToast('Compte supprimé.')
        } catch { showToast('Erreur serveur.', 'err') }
      }
    })
  }

  const deleteDepartment = (d: Department) => {
    setConfirm({
      msg: `Supprimer le département "${d.name_fr}" ? Cela peut affecter les agents qui y sont rattachés.`,
      onYes: async () => {
        setConfirm(null)
        try {
          const res = await apiFetch(`/president/departments/${d.id}`, { method: 'DELETE' })
          if (res.error) { showToast(res.error, 'err'); return }
          setDepts(prev => prev.filter(p => p.id !== d.id))
          showToast('Département supprimé.')
        } catch { showToast('Erreur serveur.', 'err') }
      }
    })
  }

  // ── Filtered list ──
  const filtered = users.filter(u => {
    if (u.role !== tab) return false
    if (search && !`${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())) return false
    if (deptFilter !== 'all' && u.department_id !== deptFilter) return false
    if (statusFilter === 'active' && !u.is_active) return false
    if (statusFilter === 'inactive' && u.is_active) return false
    return true
  })

  // ── KPIs ──
  const agents = users.filter(u => u.role === 'agent')
  const chefs = users.filter(u => u.role === 'chef')
  const activeA = agents.filter(u => u.is_active).length
  const activeC = chefs.filter(u => u.is_active).length
  const totalTasks = users.reduce((s, u) => s + (u.total_tasks ?? 0), 0)

  const KPIS = [
    { label: 'Agents terrain', value: agents.length, sub: `${activeA} actifs`, color: '#1557FF', icon: '👷' },
    { label: 'Chefs de service', value: chefs.length, sub: `${activeC} actifs`, color: '#F59E0B', icon: '👔' },
    { label: 'Total tâches', value: totalTasks, sub: 'Signalements', color: '#10B981', icon: '📋' },
    { label: 'Départements', value: departments.length, sub: `${departments.filter(d => d.is_active).length} actifs`, color: '#8B5CF6', icon: '🏛️' },
  ]

  return (
    <PresidentLayout title="Gestion du Personnel">
      <style>{`
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes slide-in-right { from { transform: translateX(100%) } to { transform: translateX(0) } }
        .animate-slide-up { animation: slide-up .3s ease forwards }
        .animate-slide-in-right { animation: slide-in-right .25s cubic-bezier(.22,1,.36,1) forwards }
      `}</style>

      <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 min-h-screen transition-colors duration-300">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {KPIS.map(k => (
            <div key={k.label} className="group bg-white dark:bg-slate-900/40 rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-800/60 hover:border-blue-400 dark:hover:border-blue-700 hover:shadow-2xl hover:shadow-blue-500/10 transition-all relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[4rem]" style={{ background: `${k.color}10` }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-2xl shadow-inner">
                    {k.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm"
                    style={{ background: `${k.color}20`, color: k.color }}>{k.sub}</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">{k.label}</p>
                <p className="text-4xl font-black text-[#0A1628] dark:text-white leading-none">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Tab switcher */}
          <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-sm">
            {(['agent', 'chef'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? 'text-white shadow-md' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                style={tab === t ? { background: '#1557FF' } : {}}>
                {t === 'agent' ? '👷 Agents' : '👔 Chefs'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[240px] flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 shadow-sm focus-within:border-blue-400 dark:focus-within:border-blue-600 transition-all">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-600 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email…"
              className="flex-1 text-xs font-bold text-slate-600 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-700 outline-none bg-transparent" />
            {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" /></button>}
          </div>

          {/* Dept filter */}
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-all">
            <option value="all">Tous les depts</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name_fr}</option>)}
          </select>

          {/* Status filter */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-all">
            <option value="all">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>

          {/* Actions */}
          <div className="flex gap-2 ml-auto">
            <button onClick={() => setDeptModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-[#1557FF] text-[#1557FF] hover:bg-blue-50 transition-all">
              <Building2 className="w-4 h-4" /> Département
            </button>
            <button onClick={() => { setEditTarget(null); setUserModal(true) }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 transition-all"
              style={{ background: '#1557FF' }}>
              <Plus className="w-4 h-4" /> Nouveau compte
            </button>
          </div>
        </div>

        {/* ── Results count ── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-slate-400">
            {filtered.length} {tab === 'agent' ? 'agent(s)' : 'chef(s)'} trouvé(s)
          </p>
        </div>

        {/* ── Cards grid ── */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-[#1557FF] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <User className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-bold">Aucun résultat</p>
            <p className="text-xs mt-1">Modifiez vos filtres ou créez un nouveau compte</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtered.map(u => (
              <PersonCard key={u.id} user={u}
                onClick={() => setDrawer(u)}
                onToggle={e => toggleUser(u, e)}
                onDelete={deleteUser} />
            ))}
          </div>
        )}
      </div>

      {/* ── Profile Drawer ── */}
      {drawer && (
        <ProfileDrawer
          user={drawer}
          departments={departments}
          onClose={() => setDrawer(null)}
          onEdit={() => { setEditTarget(drawer); setUserModal(true) }}
          onToggle={() => toggleUser(drawer)}
          onDelete={() => deleteUser(drawer)}
        />
      )}

      {/* ── User Create/Edit Modal ── */}
      {showUserModal && (
        <UserModal
          user={editTarget}
          departments={departments}
          onClose={() => { setUserModal(false); setEditTarget(null) }}
          onSaved={msg => { setUserModal(false); setEditTarget(null); setDrawer(null); showToast(msg); load() }}
        />
      )}

      {/* ── Department creation Modal ── */}
      {showDeptModal && (
        <DeptModal
          onClose={() => setDeptModal(false)}
          onSaved={msg => { setDeptModal(false); showToast(msg); load() }}
        />
      )}

      {/* ── Confirm dialog ── */}
      {confirm && <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </PresidentLayout>
  )
}

export default PresidentPersonnel