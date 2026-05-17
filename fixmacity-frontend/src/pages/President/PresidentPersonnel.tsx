import React, { useState, useEffect, useCallback } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import {
  Plus, Search, X, Check, AlertTriangle, Loader2,
  Eye, EyeOff, Pencil, Trash2, CheckCircle, XCircle
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token')

// ─── Visual helpers ───────────────────────────────────────────────────────────
const PALETTE = ['#1557FF','#10B981','#F59E0B','#8B5CF6','#EF4444','#0891B2','#EC4899','#14B8A6']
const avatarColor = (name: string) => PALETTE[(name?.charCodeAt(0) ?? 0) % PALETTE.length]
const initials = (fn: string, ln: string) =>
  `${(fn?.[0] ?? '').toUpperCase()}${(ln?.[0] ?? '').toUpperCase()}`

const DELEGATIONS = [
  { id: 'a309fed2-6c50-49ae-b2be-a6e7ccd096df', name: 'Sousse Ville' },
  { id: '0ede6556-2f67-4a0d-a7cb-d0cdca4504a5', name: 'Sousse Jawhara' },
  { id: 'a1ca5994-b186-4970-91f6-c44925cfc4b4', name: 'Sousse Sidi Abdelhamid' },
]

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: string
  first_name: string; last_name: string
  email: string; phone: string
  role: 'agent' | 'chef'
  department_id: string | null; department_name: string
  delegation_id: string | null; location: string
  total_tasks: number; resolved_tasks: number; accepted_tasks: number
  is_active: boolean
}

interface Dept { id: string; name_fr: string; code: string }

// ─── API ──────────────────────────────────────────────────────────────────────
const apiFetch = (path: string, opts?: RequestInit) =>
  fetch(`${API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  }).then(r => r.json())

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast: React.FC<{ msg: string; type: 'ok'|'err'; onDone: () => void }> = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-bold ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}
      style={{ animation: 'slideUp .3s ease' }}>
      {type === 'ok' ? <Check className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
      {msg}
    </div>
  )
}

// ─── Confirm ─────────────────────────────────────────────────────────────────
const Confirm: React.FC<{ msg: string; onYes: () => void; onNo: () => void }> = ({ msg, onYes, onNo }) => (
  <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onNo}/>
    <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-2xl p-7 w-full max-w-xs text-center">
      <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6 text-red-500"/>
      </div>
      <p className="text-sm font-black text-[#0A1628] dark:text-white mb-6">{msg}</p>
      <div className="flex gap-3">
        <button onClick={onNo} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all bg-white dark:bg-transparent">Annuler</button>
        <button onClick={onYes} className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-all">Confirmer</button>
      </div>
    </div>
  </div>
)

// ─── Edit / Create Modal ──────────────────────────────────────────────────────
interface EditForm {
  first_name: string; last_name: string
  email: string; phone: string; password: string
  role: 'agent' | 'chef'
  department_id: string; delegation_id: string
}

const UserModal: React.FC<{
  user: User | null          // null = create mode
  departments: Dept[]
  onClose: () => void
  onSaved: (msg: string) => void
}> = ({ user, departments, onClose, onSaved }) => {
  const isEdit = !!user

  const [form, setForm] = useState<EditForm>({
    first_name:    user?.first_name    ?? '',
    last_name:     user?.last_name     ?? '',
    email:         user?.email         ?? '',
    phone:         user?.phone         ?? '',
    password:      '',
    role:          (user?.role as any) ?? 'agent',
    department_id: user?.department_id ?? '',
    delegation_id: user?.delegation_id ?? '',
  })
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')
  const [showPwd,  setShowPwd]  = useState(false)

  const set = (k: keyof EditForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    if (!form.first_name.trim()) return 'Le prénom est obligatoire.'
    if (!form.last_name.trim())  return 'Le nom est obligatoire.'
    if (!form.email.trim())      return 'L\'email est obligatoire.'
    if (!isEdit && !form.password) return 'Le mot de passe est obligatoire.'
    if (form.phone && !/^[+\d\s\-().]{6,20}$/.test(form.phone)) return 'Numéro de téléphone invalide.'
    return null
  }

  const save = async () => {
    const e = validate(); if (e) { setErr(e); return }
    setSaving(true); setErr('')
    try {
      let res
      if (isEdit) {
        // PATCH — send all editable fields
        const body: Record<string, any> = {
          first_name:    form.first_name.trim(),
          last_name:     form.last_name.trim(),
          email:         form.email.trim().toLowerCase(),
          role:          form.role,
          department_id: form.department_id || null,
          delegation_id: form.delegation_id || null,
        }
        // Only include phone if non-empty
        if (form.phone.trim()) body.phone = form.phone.trim()
        // Only include password if filled
        if (form.password.trim()) body.password = form.password.trim()

        res = await apiFetch(`/president/users/${user!.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      } else {
        res = await apiFetch('/president/users', {
          method: 'POST',
          body: JSON.stringify({
            first_name:    form.first_name.trim(),
            last_name:     form.last_name.trim(),
            email:         form.email.trim().toLowerCase(),
            password:      form.password,
            role:          form.role,
            department_id: form.department_id || null,
            delegation_id: form.delegation_id || null,
            ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
          }),
        })
      }

      if (res?.error || res?.errors) {
        setErr(res.error ?? res.errors?.[0]?.msg ?? 'Erreur')
        setSaving(false)
        return
      }
      onSaved(isEdit ? 'Compte mis à jour avec succès.' : 'Compte créé avec succès.')
    } catch {
      setErr('Erreur serveur.')
      setSaving(false)
    }
  }

  const inp = "w-full px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-[#1557FF] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-all bg-white dark:bg-slate-800/50 placeholder-slate-300 dark:placeholder-slate-600"

  const Field: React.FC<{ label: string; req?: boolean; children: React.ReactNode }> = ({ label, req, children }) => (
    <div>
      <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
        {label}{req && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-100 dark:border-slate-800/60 px-6 pt-6 pb-4 flex items-center justify-between bg-transparent">
          <div>
            <h2 className="text-lg font-black text-[#0A1628] dark:text-white">
              {isEdit ? 'Modifier le compte' : 'Nouveau compte'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-550 font-semibold mt-0.5">
              {isEdit
                ? `${user!.first_name} ${user!.last_name} · ${user!.role === 'chef' ? 'Chef de Service' : 'Agent Terrain'}`
                : 'Agent ou Chef de Service'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400"/>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-transparent">

          {err && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0"/>{err}
            </div>
          )}

          {/* Role selector (always shown — can change role in edit) */}
          <Field label="Rôle" req>
            <div className="grid grid-cols-2 gap-2">
              {(['agent','chef'] as const).map(r => (
                <button key={r} type="button" onClick={() => set('role', r)}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${form.role === r ? 'border-[#1557FF] dark:border-blue-500 bg-blue-50 dark:bg-blue-950/25 text-[#1557FF] dark:text-blue-400' : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                  {r === 'agent' ? '👷 Agent Terrain' : '👔 Chef de Service'}
                </button>
              ))}
            </div>
          </Field>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" req>
              <input className={inp} value={form.first_name}
                onChange={e => set('first_name', e.target.value)} placeholder="Karim"/>
            </Field>
            <Field label="Nom" req>
              <input className={inp} value={form.last_name}
                onChange={e => set('last_name', e.target.value)} placeholder="Mansour"/>
            </Field>
          </div>

          {/* Email */}
          <Field label="Email" req>
            <input className={inp} type="email" value={form.email}
              onChange={e => set('email', e.target.value)} placeholder="karim@sousse.tn"/>
          </Field>

          {/* Phone */}
          <Field label="Numéro de téléphone">
            <input className={inp} type="tel" value={form.phone}
              onChange={e => set('phone', e.target.value)} placeholder="+216 22 333 444"/>
          </Field>

          {/* Password */}
          <Field label={isEdit ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'} req={!isEdit}>
            <div className="relative">
              <input className={`${inp} pr-12`}
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder={isEdit ? '••••••••' : 'Min. 8 caractères'}/>
              <button type="button" onClick={() => setShowPwd(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPwd ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
              </button>
            </div>
          </Field>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"/>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-650">Affectation</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"/>
          </div>

          {/* Department */}
          <Field label="Département">
            <select className={inp} value={form.department_id} onChange={e => set('department_id', e.target.value)}>
              <option value="">— Sélectionner un département —</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name_fr} ({d.code})</option>
              ))}
            </select>
          </Field>

          {/* Delegation / Arrondissement */}
          <Field label="Arrondissement (Délégation)">
            <select className={inp} value={form.delegation_id} onChange={e => set('delegation_id', e.target.value)}>
              <option value="">— Sélectionner un arrondissement —</option>
              {DELEGATIONS.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800/60 px-6 py-4 flex gap-3 bg-transparent">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-100 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all bg-white dark:bg-transparent">
            Annuler
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#1557FF] text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25">
            {saving && <Loader2 className="w-4 h-4 animate-spin"/>}
            {isEdit ? 'Enregistrer les modifications' : 'Créer le compte'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Avatar component ─────────────────────────────────────────────────────────
const Avatar: React.FC<{ fn: string; ln: string; size?: number }> = ({ fn, ln, size = 48 }) => (
  <div className="rounded-2xl flex items-center justify-center text-white font-black flex-shrink-0"
    style={{ width: size, height: size, background: avatarColor(fn), fontSize: size * 0.35 }}>
    {initials(fn, ln)}
  </div>
)

// ─── Progress ring ────────────────────────────────────────────────────────────
const Ring: React.FC<{ value: number; color: string; size?: number }> = ({ value, color, size = 52 }) => {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(value, 100) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth="6" className="stroke-slate-100 dark:stroke-slate-800"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray .6s ease' }}/>
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
        fontSize="11" fontWeight="800" className="fill-[#0A1628] dark:fill-white">{value}%</text>
    </svg>
  )
}

const pct = (n: number, d: number) => (!d ? 0 : Math.round((n / d) * 100))

// ─── User Card ────────────────────────────────────────────────────────────────
const UserCard: React.FC<{
  user: User
  onEdit: () => void
  onToggle: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}> = ({ user, onEdit, onToggle, onDelete }) => {
  const color    = avatarColor(user.first_name)
  const total    = user.total_tasks    ?? 0
  const resolved = user.resolved_tasks ?? 0
  const accepted = user.accepted_tasks ?? 0
  const progress = pct(resolved, total)

  return (
    <div className="group bg-white/80 dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-100 dark:border-slate-800/80 p-5 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-xl hover:shadow-blue-500/8 dark:hover:shadow-blue-950/20 transition-all flex flex-col gap-4 relative overflow-hidden">
      {/* bg deco */}
      <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-[3rem] opacity-40"
        style={{ background: `${color}12` }}/>

      {/* Top: avatar + name + status toggle */}
      <div className="flex items-start gap-3 relative">
        <div className="relative">
          <Avatar fn={user.first_name} ln={user.last_name} size={46}/>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${user.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-[#0A1628] dark:text-white text-sm leading-tight truncate">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate mt-0.5">{user.email}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest text-white"
              style={{ background: color }}>
              {user.role === 'chef' ? 'Chef' : 'Agent'}
            </span>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate">{user.department_name}</span>
          </div>
        </div>
        {/* Toggle active */}
        <button onClick={onToggle}
          className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all ${user.is_active ? 'border-emerald-200 dark:border-emerald-900/50 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
          title={user.is_active ? 'Désactiver' : 'Réactiver'}>
          {user.is_active ? <CheckCircle className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label:'Tâches',   val:total,    bg:'bg-slate-50 dark:bg-slate-800/40',   tx:'text-[#0A1628] dark:text-slate-100',   border:'border-slate-100 dark:border-slate-800/60'   },
          { label:'Résolues', val:resolved, bg:'bg-emerald-50 dark:bg-emerald-950/20', tx:'text-emerald-600 dark:text-emerald-400', border:'border-emerald-100 dark:border-emerald-900/30' },
          { label:'Acceptées',val:accepted, bg:'bg-blue-50 dark:bg-blue-950/20',    tx:'text-blue-600 dark:text-blue-400',    border:'border-blue-100 dark:border-blue-900/30'    },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center border ${s.border}`}>
            <p className={`text-base font-black ${s.tx}`}>{s.val}</p>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <Ring value={progress} color={color} size={48}/>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Progression</span>
            <span className="text-[9px] font-black" style={{ color }}>{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: color }}/>
          </div>
          <p className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{user.location}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
        <button onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1557FF] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20">
          <Pencil className="w-3.5 h-3.5"/> Modifier
        </button>
        <button onClick={onDelete}
          className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-red-200 dark:border-red-900/40 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-all flex-shrink-0">
          <Trash2 className="w-4 h-4"/>
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PresidentPersonnel: React.FC = () => {
  const [tab,         setTab]         = useState<'agent'|'chef'>('agent')
  const [search,      setSearch]      = useState('')
  const [statusFilt,  setStatusFilt]  = useState('all')
  const [users,       setUsers]       = useState<User[]>([])
  const [departments, setDepts]       = useState<Dept[]>([])
  const [loading,     setLoading]     = useState(true)
  const [editTarget,  setEditTarget]  = useState<User | null>(null)
  const [showModal,   setShowModal]   = useState(false)
  const [createMode,  setCreateMode]  = useState(false)
  const [confirm,     setConfirm]     = useState<{ msg: string; onYes: () => void } | null>(null)
  const [toast,       setToast]       = useState<{ msg: string; type: 'ok'|'err' } | null>(null)

  const flash = (msg: string, type: 'ok'|'err' = 'ok') => setToast({ msg, type })

  // ── Load ──
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, dRes] = await Promise.all([
        apiFetch('/president/users?limit=200'),
        apiFetch('/president/departments'),
      ])
      if (uRes.users) {
        setUsers(uRes.users.map((u: any) => ({
          id:              u.id,
          first_name:      u.first_name ?? '',
          last_name:       u.last_name  ?? '',
          email:           u.email      ?? '',
          phone:           u.phone      ?? '',
          role:            u.role,
          department_id:   u.department_id   ?? null,
          department_name: u.department_name ?? 'N/A',
          delegation_id:   u.delegation_id   ?? null,
          location:        u.location        ?? 'Sousse',
          total_tasks:     u.total_tasks    ?? 0,
          resolved_tasks:  u.resolved_tasks ?? Math.floor((u.total_tasks ?? 0) * 0.6),
          accepted_tasks:  u.accepted_tasks ?? Math.floor((u.total_tasks ?? 0) * 0.8),
          is_active:       u.is_active ?? true,
        })))
      }
      if (dRes.departments) setDepts(dRes.departments)
    } catch { flash('Erreur lors du chargement.', 'err') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Toggle active ──
  const toggleUser = async (u: User, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const next = !u.is_active
    try {
      const res = await apiFetch(`/president/users/${u.id}`, {
        method: 'PATCH', body: JSON.stringify({ is_active: next }),
      })
      if (res.error) { flash(res.error, 'err'); return }
      setUsers(prev => prev.map(p => p.id === u.id ? { ...p, is_active: next } : p))
      flash(next ? 'Compte réactivé.' : 'Compte désactivé.')
    } catch { flash('Erreur serveur.', 'err') }
  }

  // ── Delete ──
  const deleteUser = (u: User, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setConfirm({
      msg: `Supprimer le compte de ${u.first_name} ${u.last_name} ? Cette action est irréversible.`,
      onYes: async () => {
        setConfirm(null)
        try {
          const res = await apiFetch(`/president/users/${u.id}`, { method: 'DELETE' })
          if (res.error) { flash(res.error, 'err'); return }
          setUsers(prev => prev.filter(p => p.id !== u.id))
          flash('Compte supprimé.')
        } catch { flash('Erreur serveur.', 'err') }
      },
    })
  }

  // ── Filtered ──
  const filtered = users.filter(u => {
    if (u.role !== tab) return false
    if (search && !`${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilt === 'active'   && !u.is_active) return false
    if (statusFilt === 'inactive' &&  u.is_active) return false
    return true
  })

  // ── KPIs ──
  const agents  = users.filter(u => u.role === 'agent')
  const chefs   = users.filter(u => u.role === 'chef')
  const activeA = agents.filter(u => u.is_active).length
  const activeC = chefs.filter(u => u.is_active).length
  const totalT  = users.reduce((s, u) => s + (u.total_tasks ?? 0), 0)

  return (
    <PresidentLayout title="Gestion du Personnel">
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      <div className="flex-1 bg-[#f8fafc] dark:bg-slate-950 p-6 min-h-screen">

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label:'Agents terrain',  val:agents.length, sub:`${activeA} actifs`, color:'#1557FF', icon:'👷' },
            { label:'Chefs de service',val:chefs.length,  sub:`${activeC} actifs`, color:'#F59E0B', icon:'👔' },
            { label:'Total tâches',    val:totalT,        sub:'Signalements',       color:'#10B981', icon:'📋' },
            { label:'Départements',    val:departments.length, sub:`${departments.filter((d:any)=>d.is_active).length} actifs`, color:'#8B5CF6', icon:'🏛️' },
          ].map(k => (
            <div key={k.label} className="group bg-white/80 dark:bg-slate-900/50 backdrop-blur-md rounded-3xl p-5 border border-slate-100 dark:border-slate-800/80 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg hover:shadow-blue-500/5 dark:hover:shadow-blue-950/20 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-[3rem]" style={{ background:`${k.color}0A` }}/>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">{k.icon}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
                    style={{ background:`${k.color}15`, color:k.color }}>{k.sub}</span>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{k.label}</p>
                <p className="text-3xl font-black text-[#0A1628] dark:text-white">{k.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Tab */}
          <div className="flex bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-100 dark:border-slate-800/80 rounded-2xl p-1 shadow-sm">
            {(['agent','chef'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab===t?'text-white shadow-md':'text-slate-400 dark:text-slate-550 hover:text-slate-600 dark:hover:text-slate-350'}`}
                style={tab===t?{background:'#1557FF'}:{}}>
                {t==='agent' ? '👷 Agents' : '👔 Chefs'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[240px] flex items-center gap-2.5 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-100 dark:border-slate-800/80 rounded-2xl px-4 py-2.5 shadow-sm focus-within:border-blue-400 dark:focus-within:border-blue-500 transition-all">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email…"
              className="flex-1 text-xs font-bold text-slate-600 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-650 outline-none bg-transparent"/>
            {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500"/></button>}
          </div>

          {/* Status filter */}
          <select value={statusFilt} onChange={e => setStatusFilt(e.target.value)}
            className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-100 dark:border-slate-800/80 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-all">
            <option value="all">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>

          {/* Create */}
          <button onClick={() => { setCreateMode(true); setEditTarget(null); setShowModal(true) }}
            className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/25 hover:shadow-xl active:scale-95 transition-all"
            style={{ background:'#1557FF' }}>
            <Plus className="w-4 h-4"/> Nouveau compte
          </button>
        </div>

        {/* Count */}
        <p className="text-xs font-bold text-slate-400 mb-5">
          {filtered.length} {tab==='agent'?'agent(s)':'chef(s)'} trouvé(s)
        </p>

        {/* Cards */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-[#1557FF] animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <p className="text-sm font-bold">Aucun résultat</p>
            <p className="text-xs mt-1">Modifiez vos filtres ou créez un nouveau compte</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtered.map(u => (
              <UserCard key={u.id} user={u}
                onEdit={() => { setEditTarget(u); setCreateMode(false); setShowModal(true) }}
                onToggle={e => toggleUser(u, e)}
                onDelete={e => deleteUser(u, e)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <UserModal
          user={createMode ? null : editTarget}
          departments={departments}
          onClose={() => { setShowModal(false); setEditTarget(null); setCreateMode(false) }}
          onSaved={msg => {
            setShowModal(false); setEditTarget(null); setCreateMode(false)
            flash(msg); load()
          }}
        />
      )}

      {/* Confirm */}
      {confirm && <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)}/>}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}
    </PresidentLayout>
  )
}

export default PresidentPersonnel