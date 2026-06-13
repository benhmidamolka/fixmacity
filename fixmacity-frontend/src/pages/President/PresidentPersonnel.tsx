import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import PresidentLayout from '../../layouts/PresidentLayout'
import {
  Plus, Search, X, Check, AlertTriangle, Loader2,
  Eye, EyeOff, Pencil, Trash2, CheckCircle, XCircle,
  ChevronUp, ChevronDown, MoreVertical,
  RefreshCw, Users, Briefcase, ClipboardList,
  CheckSquare, Building2, Filter, UserCheck
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token')

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const PALETTE = ['#0A1628', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#0891B2', '#EC4899', '#14B8A6']
const avatarColor = (name: string) => PALETTE[(name?.charCodeAt(0) ?? 0) % PALETTE.length]
const initials = (fn: string, ln: string) =>
  `${(fn?.[0] ?? '').toUpperCase()}${(ln?.[0] ?? '').toUpperCase()}`

const DELEGATIONS = [
  { id: 'a309fed2-6c50-49ae-b2be-a6e7ccd096df', name: 'Sousse Ville' },
  { id: '0ede6556-2f67-4a0d-a7cb-d0cdca4504a5', name: 'Sousse Jawhara' },
  { id: 'a1ca5994-b186-4970-91f6-c44925cfc4b4', name: 'Sousse Sidi Abdelhamid' },
]

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  role: 'agent' | 'chef'
  department_id: string | null
  department_name: string
  delegation_id: string | null
  location: string
  is_active: boolean
  // Agent-specific stats
  assigned_tasks: number
  in_progress_tasks: number
  resolved_tasks: number
  refused_tasks: number
  // Chef-specific stats
  nb_agents: number
  total_signalements: number
  accepted_signalements: number
  refused_signalements: number
}

interface Dept { id: string; name_fr: string; code: string; name?: string; is_active?: boolean }

/* ─── API ────────────────────────────────────────────────────────────────── */
const apiFetch = (path: string, opts?: RequestInit) =>
  fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${tok()}`,
      'Content-Type': 'application/json',
      ...(opts?.headers ?? {}),
    },
  }).then(r => r.json())

/* ─── Toast ──────────────────────────────────────────────────────────────── */
const Toast: React.FC<{ msg: string; type: 'ok' | 'err'; onDone: () => void }> = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t) }, [onDone])
  return (
    <div
      className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-bold ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}
      style={{ animation: 'slideUp .3s ease' }}
    >
      {type === 'ok' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {msg}
    </div>
  )
}

/* ─── Confirm ────────────────────────────────────────────────────────────── */
const Confirm: React.FC<{ msg: string; onYes: () => void; onNo: () => void }> = ({ msg, onYes, onNo }) => (
  <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onNo} />
    <div className="relative bg-white dark:bg-slate-900 shadow-sm rounded-2xl shadow-2xl p-7 w-full max-w-xs text-center">
      <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <p className="text-sm font-black text-slate-800 dark:text-white mb-6">{msg}</p>
      <div className="flex gap-3">
        <button onClick={onNo} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
          Annuler
        </button>
        <button onClick={onYes} className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-all">
          Confirmer
        </button>
      </div>
    </div>
  </div>
)

/* ─── User Modal (create / edit) ─────────────────────────────────────────── */
interface EditForm {
  first_name: string; last_name: string
  email: string; phone: string; password: string
  role: 'agent' | 'chef'
  department_id: string; delegation_id: string
}

interface ConflictChef { id: string; prenom: string; nom: string; email: string }

const UserModal: React.FC<{
  user: User | null
  departments: Dept[]
  onClose: () => void
  onSaved: (msg: string) => void
}> = ({ user, departments, onClose, onSaved }) => {
  const isEdit = !!user
  const [form, setForm] = useState<EditForm>({
    first_name: user?.first_name ?? '', last_name: user?.last_name ?? '',
    email: user?.email ?? '', phone: user?.phone ?? '', password: '',
    role: (user?.role as any) ?? 'agent',
    department_id: user?.department_id ?? '', delegation_id: user?.delegation_id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [bannerErr, setBannerErr] = useState('')
  const [conflict, setConflict] = useState<ConflictChef | null>(null)
  const [showPwd, setShowPwd] = useState(false)
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const FIELD_ORDER = ['role','first_name','last_name','email','phone','password','department_id','delegation_id']

  const set = (k: keyof EditForm, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (fieldErrors[k]) setFieldErrors(e => ({ ...e, [k]: '' }))
    if (k === 'department_id') setConflict(null)
    setBannerErr('')
  }

  const scrollToFirst = (errs: Record<string, string>) => {
    const first = FIELD_ORDER.find(k => errs[k])
    if (first && fieldRefs.current[first]) {
      fieldRefs.current[first]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleSubmit = async (force = false) => {
    setFieldErrors({})
    setConflict(null)
    setBannerErr('')
    setSaving(true)
    try {
      let res: any
      if (isEdit) {
        const body: Record<string, any> = {
          first_name: form.first_name.trim(), last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(), role: form.role,
          department_id: form.department_id || null, delegation_id: form.delegation_id || null,
        }
        if (form.phone.trim()) body.phone = form.phone.trim()
        if (form.password.trim()) body.password = form.password.trim()
        if (force) body.force = true
        res = await apiFetch(`/president/users/${user!.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        res = await apiFetch('/president/users', {
          method: 'POST',
          body: JSON.stringify({
            prenom: form.first_name.trim(), nom: form.last_name.trim(),
            email: form.email.trim().toLowerCase(), password: form.password,
            role: form.role, department_id: form.department_id || null,
            delegation_id: form.delegation_id || null,
            ...(form.phone.trim() ? { telephone: form.phone.trim() } : {}),
            force,
          }),
        })
      }

      // ── 201 success ──
      if (res?.success || res?.message) {
        onSaved(isEdit ? 'Compte mis à jour avec succès.' : res.message ?? 'Compte créé avec succès.')
        return
      }

      // ── 400 field errors ──
      if (res?.fields && !res?.conflictType) {
        const errs: Record<string,string> = {}
        if (res.fields.prenom)        errs.first_name    = res.fields.prenom
        if (res.fields.nom)           errs.last_name     = res.fields.nom
        if (res.fields.email)         errs.email         = res.fields.email
        if (res.fields.password)      errs.password      = res.fields.password
        if (res.fields.department_id) errs.department_id = res.fields.department_id
        if (res.fields.delegation_id) errs.delegation_id = res.fields.delegation_id
        setFieldErrors(errs)
        scrollToFirst(errs)
        return
      }

      // ── 409 EMAIL_EXISTS ──
      if (res?.conflictType === 'EMAIL_EXISTS') {
        const errs = { email: res.fields?.email ?? 'Cette adresse email est déjà utilisée par un compte existant.' }
        setFieldErrors(errs)
        scrollToFirst(errs)
        return
      }

      // ── 409 DEPT_HAS_CHEF ──
      if (res?.conflictType === 'DEPT_HAS_CHEF') {
        setConflict(res.existingChef)
        fieldRefs.current['department_id']?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }

      setBannerErr(res?.error ?? 'Erreur serveur. Veuillez réessayer.')
    } catch {
      setBannerErr('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  const save = () => handleSubmit(false)

  const inp = (err: boolean) => `w-full px-4 py-2.5 rounded-xl border text-sm font-semibold outline-none transition-all ${err ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:bg-red-950/20 dark:border-red-900 dark:text-red-200 dark:focus:ring-red-900' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:border-primary focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 bg-white dark:bg-slate-800 placeholder-slate-300'}`

  const Field: React.FC<{ fkey: string; label: string; req?: boolean; children: (hasErr: boolean) => React.ReactNode }> = ({ fkey, label, req, children }) => {
    const err = fieldErrors[fkey]
    return (
      <div ref={el => { fieldRefs.current[fkey] = el }}>
        <label className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest mb-1.5 ${err ? 'text-red-500' : 'text-slate-400'}`}>
          {label}{req && <span className="text-red-400">*</span>}
        </label>
        {children(!!err)}
        {err && <p className="text-red-500 text-[10px] font-bold mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>{err}</p>}
      </div>
    )
  }

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" style={{ animation: 'fadeIn .2s ease' }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[201] w-full max-w-[480px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800 overflow-hidden" style={{ animation: 'slideInRight .25s cubic-bezier(.22,1,.36,1)' }}>
        <style>{`
          @keyframes slideInRight {from{transform:translateX(100%)} to{transform:translateX(0)}}
          @keyframes fadeIn {from{opacity:0} to{opacity:1}}
        `}</style>
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-100 dark:border-slate-800 px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white">
              {isEdit ? 'Modifier le compte' : 'Nouveau compte'}
            </h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {isEdit
                ? `${user!.first_name} ${user!.last_name} · ${user!.role === 'chef' ? 'Chef de Service' : 'Agent Terrain'}`
                : 'Agent ou Chef de Service'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {bannerErr && (
            <div className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-600 text-xs font-bold px-4 py-3 rounded-xl border flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1">{bannerErr}</div>
            </div>
          )}
          <Field fkey="role" label="Rôle" req>
            {(hasErr) => (
              <div className="grid grid-cols-2 gap-2">
                {(['agent', 'chef'] as const).map(r => (
                  <button key={r} type="button" onClick={() => set('role', r)}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${form.role === r ? 'border-primary bg-blue-50 dark:bg-blue-950/25 text-primary' : hasErr ? 'border-red-200 bg-red-50 text-red-400' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}>
                    {r === 'agent' ? '👷 Agent Terrain' : '👔 Chef de Service'}
                  </button>
                ))}
              </div>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field fkey="first_name" label="Prénom" req>
              {(hasErr) => <input className={inp(hasErr)} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Karim" />}
            </Field>
            <Field fkey="last_name" label="Nom" req>
              {(hasErr) => <input className={inp(hasErr)} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Mansour" />}
            </Field>
          </div>
          <Field fkey="email" label="Email" req>
            {(hasErr) => <input className={inp(hasErr)} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="karim@sousse.tn" />}
          </Field>
          <Field fkey="phone" label="Téléphone">
            {(hasErr) => <input className={inp(hasErr)} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+216 22 333 444" />}
          </Field>
          <Field fkey="password" label={isEdit ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'} req={!isEdit}>
            {(hasErr) => (
              <div className="relative">
                <input className={`${inp(hasErr)} pr-12`} type={showPwd ? 'text' : 'password'} value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder={isEdit ? '••••••••' : 'Min. 8 caractères'} />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}
          </Field>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-500">Affectation</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
          </div>
          <Field fkey="department_id" label="Département" req>
            {(hasErr) => (
              <select className={inp(hasErr)} value={form.department_id} onChange={e => set('department_id', e.target.value)}>
                <option value="">— Sélectionner un département —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name_fr} ({d.code})</option>)}
              </select>
            )}
          </Field>

          {/* Bandeau conflit DEPT_HAS_CHEF */}
          {conflict && form.role === 'chef' && (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-950/10 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Ce département possède déjà un chef de service actif.</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Chef actuel : <span className="font-bold text-amber-800 dark:text-amber-200">{conflict.prenom} {conflict.nom}</span>
                  </p>
                  <p className="text-xs text-amber-500">{conflict.email}</p>
                  <p className="text-xs text-amber-500/70 mt-1">Confirmer le remplacement désassignera ce chef de son département.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setConflict(null); set('department_id', '') }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  Choisir un autre département
                </button>
                <button type="button" onClick={() => handleSubmit(true)} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  Confirmer le remplacement
                </button>
              </div>
            </div>
          )}

          {form.role === 'agent' && (
            <Field fkey="delegation_id" label="Arrondissement" req>
              {(hasErr) => (
                <select className={inp(hasErr)} value={form.delegation_id} onChange={e => set('delegation_id', e.target.value)}>
                  <option value="">— Sélectionner un arrondissement —</option>
                  {DELEGATIONS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
            </Field>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Annuler
          </button>
          <button onClick={save} disabled={saving || !!conflict}
            className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-sm font-black text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Créer le compte'}
          </button>
        </div>
      </div>
    </>, document.body
  )
}


/* ─── Avatar ─────────────────────────────────────────────────────────────── */
const Avatar: React.FC<{ fn: string; ln: string; size?: number }> = ({ fn, ln, size = 36 }) => (
  <div
    className="rounded-xl flex items-center justify-center text-white font-black flex-shrink-0"
    style={{ width: size, height: size, background: avatarColor(fn), fontSize: size * 0.36 }}
  >
    {initials(fn, ln)}
  </div>
)

/* ─── Stat cell ──────────────────────────────────────────────────────────── */
const StatCell: React.FC<{ val: number; color: string; bg: string }> = ({ val, color, bg }) => (
  <td className="py-2.5 px-3 text-center bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 border-y border-slate-150 dark:border-slate-800/40 transition-colors">
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${bg}`} style={{ color }}>
      {val}
    </span>
  </td>
)

/* ─── Inline Actions ───────────────────────────────────────────────────────── */
const RowActions: React.FC<{
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}> = ({ onView, onEdit, onDelete }) => {
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <button onClick={onView} title="Voir le profil"
        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all">
        <Eye className="w-4 h-4" />
      </button>
      <button onClick={onEdit} title="Modifier"
        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all">
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={onDelete} title="Supprimer"
        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

/* ─── Sortable TH ────────────────────────────────────────────────────────── */
type AgentSortKey = 'name' | 'department' | 'assigned' | 'inprogress' | 'resolved' | 'refused'
type ChefSortKey = 'name' | 'department' | 'agents' | 'signalements' | 'accepted' | 'refused'

function SortTh<T extends string>({ label, sk, current, dir, onClick, className = '' }: {
  label: string; sk: T; current: T; dir: 'asc' | 'desc'; onClick: () => void; className?: string
}) {
  const active = current === sk
  return (
    <th onClick={onClick}
      className={`pb-3 pt-2 px-3 text-left text-[10px] font-black uppercase tracking-widest cursor-pointer select-none transition-colors group ${active ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'} ${className}`}>
      <div className="flex items-center gap-1">
        {label}
        <span className={active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}>
          {active && dir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </div>
    </th>
  )
}

/* ─── Column header legend pill ──────────────────────────────────────────── */
const ColLegend: React.FC<{ label: string; color: string; bg: string }> = ({ label, color, bg }) => (
  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${bg}`} style={{ color }}>{label}</span>
)

/* ─── Main Page ──────────────────────────────────────────────────────────── */
const PresidentPersonnel: React.FC = () => {
  const [tab, setTab] = useState<'agent' | 'chef'>('agent')
  const [search, setSearch] = useState('')
  const [deptFilt, setDeptFilt] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepts] = useState<Dept[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [viewTarget, setViewTarget] = useState<User | null>(null)
  const [createMode, setCreateMode] = useState(false)
  const [confirm, setConfirm] = useState<{ msg: string; onYes: () => void } | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [agentSort, setAgentSort] = useState<{ key: AgentSortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' })
  const [chefSort, setChefSort] = useState<{ key: ChefSortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' })

  const flash = (msg: string, type: 'ok' | 'err' = 'ok') => setToast({ msg, type })

  /* ── Load ──────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, dRes] = await Promise.all([
        apiFetch('/president/users?limit=200'),
        apiFetch('/president/departments'),
      ])
      if (uRes.users) {
        setUsers(uRes.users.map((u: any) => ({
          id: u.id,
          first_name: u.first_name ?? '',
          last_name: u.last_name ?? '',
          email: u.email ?? '',
          phone: u.phone ?? '',
          role: u.role,
          department_id: u.department_id ?? null,
          department_name: u.department_name ?? '—',
          delegation_id: u.delegation_id ?? null,
          location: u.location ?? 'Sousse',
          is_active: u.is_active ?? true,
          // Agent stats — use what the API returns, fallback to derived values
          assigned_tasks: u.assigned_tasks ?? u.total_tasks ?? 0,
          in_progress_tasks: u.in_progress_tasks ?? u.accepted_tasks ?? 0,
          resolved_tasks: u.resolved_tasks ?? 0,
          refused_tasks: u.refused_tasks ?? 0,
          // Chef stats
          nb_agents: u.nb_agents ?? 0,
          total_signalements: u.total_signalements ?? u.total_tasks ?? 0,
          accepted_signalements: u.accepted_signalements ?? 0,
          refused_signalements: u.refused_signalements ?? 0,
        })))
      }
      if (dRes.departments) setDepts(dRes.departments)
    } catch { flash('Erreur lors du chargement.', 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  /* ── Actions ───────────────────────────────────────────────────────────── */
  const toggleUser = async (u: User) => {
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

  const deleteUser = (u: User) => {
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

  const openModal = (user?: User) => {
    setEditTarget(user ?? null)
    setCreateMode(!user)
    setShowModal(true)
  }

  const viewProfile = (u: User) => {
    setViewTarget(u)
  }

  /* ── Sort helpers ──────────────────────────────────────────────────────── */
  const handleAgentSort = (key: AgentSortKey) => setAgentSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
  const handleChefSort = (key: ChefSortKey) => setChefSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))

  /* ── Filtered + sorted ─────────────────────────────────────────────────── */
  const baseFilter = (u: User) => {
    if (u.role !== tab) return false
    if (deptFilt && u.department_id !== deptFilt) return false
    if (search) {
      const s = search.toLowerCase()
      // For agents: also search chef name of their dept
      const chef = u.role === 'agent' && u.department_id
        ? users.find(c => c.role === 'chef' && c.department_id === u.department_id)
        : null
      const hay = [u.first_name, u.last_name, u.email, u.phone, u.department_name,
      chef?.first_name, chef?.last_name].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(s)
    }
    return true
  }

  const agents: User[] = users
    .filter(u => u.role === 'agent' && baseFilter(u))
    .sort((a, b) => {
      const { key, dir } = agentSort
      let v = 0
      if (key === 'name') v = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      else if (key === 'department') v = a.department_name.localeCompare(b.department_name)
      else if (key === 'assigned') v = a.assigned_tasks - b.assigned_tasks
      else if (key === 'inprogress') v = a.in_progress_tasks - b.in_progress_tasks
      else if (key === 'resolved') v = a.resolved_tasks - b.resolved_tasks
      else if (key === 'refused') v = a.refused_tasks - b.refused_tasks
      return dir === 'asc' ? v : -v
    })

  const chefs: User[] = users
    .filter(u => u.role === 'chef' && baseFilter(u))
    .sort((a, b) => {
      const { key, dir } = chefSort
      let v = 0
      if (key === 'name') v = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      else if (key === 'department') v = a.department_name.localeCompare(b.department_name)
      else if (key === 'agents') v = a.nb_agents - b.nb_agents
      else if (key === 'signalements') v = a.total_signalements - b.total_signalements
      else if (key === 'accepted') v = a.accepted_signalements - b.accepted_signalements
      else if (key === 'refused') v = a.refused_signalements - b.refused_signalements
      return dir === 'asc' ? v : -v
    })

  const displayed = tab === 'agent' ? agents : chefs

  /* ── KPIs ──────────────────────────────────────────────────────────────── */
  const allAgents = users.filter(u => u.role === 'agent')
  const allChefs = users.filter(u => u.role === 'chef')
  const activeA = allAgents.filter(u => u.is_active).length
  const activeC = allChefs.filter(u => u.is_active).length
  const totalAssig = allAgents.reduce((s, u) => s + u.assigned_tasks, 0)
  const totalResol = allAgents.reduce((s, u) => s + u.resolved_tasks, 0)

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <PresidentLayout title="Gestion du Personnel">
      <style>{`
        @keyframes slideUp { from { transform:translateY(16px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>

      <div className="space-y-6" style={{ animation: 'fadeIn .4s ease' }}>

        {/* ── KPI Row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Agents terrain', val: allAgents.length, sub: `${activeA} actifs`, color: '#0A1628', icon: <Users className="w-5 h-5" /> },
            { label: 'Chefs de service', val: allChefs.length, sub: `${activeC} actifs`, color: '#F59E0B', icon: <Briefcase className="w-5 h-5" /> },
            { label: 'Tâches assignées', val: totalAssig, sub: 'agents terrain', color: '#10B981', icon: <ClipboardList className="w-5 h-5" /> },
            { label: 'Tâches résolues', val: totalResol, sub: `${totalAssig ? Math.round(totalResol / totalAssig * 100) : 0}% résolution`, color: '#8B5CF6', icon: <CheckSquare className="w-5 h-5" /> },
          ].map(k => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg hover:shadow-blue-500/5 transition-all relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10" style={{ background: k.color }} />
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${k.color}15`, color: k.color }}>{k.icon}</div>
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg" style={{ background: `${k.color}12`, color: k.color }}>{k.sub}</span>
              </div>
              <p className="text-3xl font-black text-slate-800 dark:text-white">{k.val}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-3 flex flex-wrap items-center gap-3">

          {/* Role tab */}
          <div className="flex bg-slate-50 dark:bg-slate-800 rounded-xl p-1 gap-1">
            {(['agent', 'chef'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                {t === 'agent' ? '👷 Agents' : '👔 Chefs de service'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 border border-transparent focus-within:border-blue-300 dark:focus-within:border-blue-700 transition-all">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'agent' ? 'Nom, email, chef, département…' : 'Nom, email, département…'}
              className="flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 outline-none bg-transparent"
            />
            {search && <button onClick={() => setSearch('')}><X className="w-3 h-3 text-slate-400" /></button>}
          </div>

          {/* Dept filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select value={deptFilt} onChange={e => setDeptFilt(e.target.value)}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 outline-none bg-transparent cursor-pointer">
              <option value="">Tous les départements</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name_fr} ({d.code})</option>)}
            </select>
          </div>

          {/* Refresh */}
          <button onClick={load} className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-all" title="Rafraîchir">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Create */}
          <button onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-md shadow-primary/20 hover:shadow-lg active:scale-95 transition-all bg-primary">
            <Plus className="w-3.5 h-3.5" /> Nouveau compte
          </button>
        </div>

        {/* ── Result count + reset ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold text-slate-400">
            <span className="text-slate-700 dark:text-slate-200 font-black">{displayed.length}</span>{' '}
            {tab === 'agent' ? 'agent(s)' : 'chef(s) de service'} trouvé(s)
          </p>
          {(search || deptFilt) && (
            <button onClick={() => { setSearch(''); setDeptFilt('') }}
              className="text-[10px] font-black text-primary hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* ── Table ────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <Users className="w-10 h-10 mb-3 text-slate-200 dark:text-slate-700" />
            <p className="text-sm font-bold">Aucun résultat trouvé</p>
            <p className="text-xs mt-1">Modifiez vos filtres ou créez un nouveau compte</p>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-900 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto select-none" style={{ animation: 'fadeIn .25s ease' }}>

              {/* ═══════════════════════════════════════════════════
                  AGENTS TABLE
              ═══════════════════════════════════════════════════ */}
              {tab === 'agent' && (
                <table className="w-full min-w-[860px] border-separate border-spacing-y-1.5 px-0.5">
                  <thead>
                    <tr className="bg-[#0A1628] dark:bg-slate-900">
                      <th className="py-3.5 pl-5 pr-3 text-left text-[10px] font-black uppercase tracking-wider text-white w-10 rounded-tl-2xl">#</th>
                      <th className="py-3.5 px-3 text-left text-[10px] font-black uppercase tracking-wider text-white min-w-[200px]">Nom</th>
                      <th className="py-3.5 px-3 text-left text-[10px] font-black uppercase tracking-wider text-white min-w-[150px]">Département</th>
                      <th className="py-3.5 px-3 text-center text-[10px] font-black uppercase tracking-wider text-white">Assignées</th>
                      <th className="py-3.5 px-3 text-center text-[10px] font-black uppercase tracking-wider text-white">En cours</th>
                      <th className="py-3.5 px-3 text-center text-[10px] font-black uppercase tracking-wider text-white">Résolues</th>
                      <th className="py-3.5 px-3 text-center text-[10px] font-black uppercase tracking-wider text-white">Refusées</th>
                      <th className="py-3.5 pl-2 pr-5 text-right text-[10px] font-black uppercase tracking-wider text-white rounded-tr-2xl">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((u, i) => (
                      <tr key={u.id} className="group transition-colors">
                        {/* # */}
                        <td className="py-2.5 pl-5 pr-3 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 border-y border-l border-slate-150 dark:border-slate-800/40 rounded-l-2xl transition-colors">
                          <span className="text-[10px] font-mono font-bold text-slate-350 dark:text-slate-600">
                            {String(i + 1).padStart(3, '0')}
                          </span>
                        </td>
                        {/* Name */}
                        <td className="py-2.5 px-3 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 border-y border-slate-150 dark:border-slate-800/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              <Avatar fn={u.first_name} ln={u.last_name} size={36} />
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${u.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{u.first_name} {u.last_name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                              {u.phone && <p className="text-[10px] text-slate-300 dark:text-slate-600">{u.phone}</p>}
                            </div>
                          </div>
                        </td>
                        {/* Department */}
                        <td className="py-2.5 px-3 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 border-y border-slate-150 dark:border-slate-800/40 transition-colors">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{u.department_name}</p>
                            {/* Show chef */}
                            {(() => {
                              const chef = users.find(c => c.role === 'chef' && c.department_id === u.department_id)
                              return chef ? (
                                <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                  <UserCheck className="w-2.5 h-2.5 flex-shrink-0" />
                                  {chef.first_name} {chef.last_name}
                                </p>
                              ) : null
                            })()}
                          </div>
                        </td>
                        {/* Stats */}
                        <StatCell val={u.assigned_tasks} color="#1557FF" bg="bg-blue-50 dark:bg-blue-950/25" />
                        <StatCell val={u.in_progress_tasks} color="#F59E0B" bg="bg-amber-50 dark:bg-amber-950/25" />
                        <StatCell val={u.resolved_tasks} color="#10B981" bg="bg-emerald-50 dark:bg-emerald-950/25" />
                        <StatCell val={u.refused_tasks} color="#EF4444" bg="bg-red-50 dark:bg-red-950/25" />
                        <td className="py-2.5 pl-2 pr-5 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 border-y border-r border-slate-150 dark:border-slate-800/40 rounded-r-2xl transition-colors">
                          <RowActions
                            onView={() => viewProfile(u)}
                            onEdit={() => openModal(u)}
                            onDelete={() => deleteUser(u)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* ═══════════════════════════════════════════════════
                  CHEFS TABLE
              ═══════════════════════════════════════════════════ */}
              {tab === 'chef' && (
                <table className="w-full min-w-[860px] border-separate border-spacing-y-1.5 px-0.5">
                  <thead>
                    <tr className="bg-[#0A1628] dark:bg-slate-900">
                      <th className="py-3.5 pl-5 pr-3 text-left text-[10px] font-black uppercase tracking-wider text-white w-10 rounded-tl-2xl">#</th>
                      <th className="py-3.5 px-3 text-left text-[10px] font-black uppercase tracking-wider text-white min-w-[200px]">Nom</th>
                      <th className="py-3.5 px-3 text-left text-[10px] font-black uppercase tracking-wider text-white min-w-[150px]">Département</th>
                      <th className="py-3.5 px-3 text-center text-[10px] font-black uppercase tracking-wider text-white">Nb Agents</th>
                      <th className="py-3.5 px-3 text-center text-[10px] font-black uppercase tracking-wider text-white">Signalements</th>
                      <th className="py-3.5 px-3 text-center text-[10px] font-black uppercase tracking-wider text-white">Acceptés</th>
                      <th className="py-3.5 px-3 text-center text-[10px] font-black uppercase tracking-wider text-white">Refusés</th>
                      <th className="py-3.5 pl-2 pr-5 text-right text-[10px] font-black uppercase tracking-wider text-white rounded-tr-2xl">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chefs.map((u, i) => {
                      const agentCount = users.filter(a => a.role === 'agent' && a.department_id === u.department_id).length
                      return (
                        <tr key={u.id} className="group transition-colors">
                          {/* # */}
                          <td className="py-2.5 pl-5 pr-3 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 border-y border-l border-slate-150 dark:border-slate-800/40 rounded-l-2xl transition-colors">
                            <span className="text-[10px] font-mono font-bold text-slate-350 dark:text-slate-655">
                              {String(i + 1).padStart(3, '0')}
                            </span>
                          </td>
                          {/* Name */}
                          <td className="py-2.5 px-3 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 border-y border-slate-150 dark:border-slate-800/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <Avatar fn={u.first_name} ln={u.last_name} size={36} />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${u.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{u.first_name} {u.last_name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                                {u.phone && <p className="text-[10px] text-slate-300 dark:text-slate-600">{u.phone}</p>}
                              </div>
                            </div>
                          </td>
                          {/* Department */}
                          <td className="py-2.5 px-3 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 border-y border-slate-150 dark:border-slate-800/40 transition-colors">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{u.department_name}</p>
                          </td>
                          {/* Stats */}
                          <StatCell val={agentCount} color="#1557FF" bg="bg-blue-50 dark:bg-blue-950/25" />
                          <StatCell val={u.total_signalements} color="#8B5CF6" bg="bg-purple-50 dark:bg-purple-950/25" />
                          <StatCell val={u.accepted_signalements} color="#10B981" bg="bg-emerald-50 dark:bg-emerald-950/25" />
                          <StatCell val={u.refused_signalements} color="#EF4444" bg="bg-red-50 dark:bg-red-950/25" />
                          {/* Actions */}
                          <td className="py-2.5 pl-2 pr-5 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 border-y border-r border-slate-150 dark:border-slate-800/40 rounded-r-2xl transition-colors">
                            <RowActions
                              onView={() => viewProfile(u)}
                              onEdit={() => openModal(u)}
                              onDelete={() => deleteUser(u)} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Table footer */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-5 py-3 mt-3 flex items-center justify-between flex-wrap gap-3 shadow-sm">
              <p className="text-xs text-slate-400 font-semibold">
                {displayed.length} résultat(s)
              </p>
              {/* Legend strip */}
              <div className="flex items-center gap-3 flex-wrap">
                {tab === 'agent' ? (
                  <>
                    <ColLegend label="Assignées" color="#1557FF" bg="bg-blue-50 dark:bg-blue-950/20" />
                    <ColLegend label="En cours" color="#F59E0B" bg="bg-amber-50 dark:bg-amber-950/20" />
                    <ColLegend label="Résolues" color="#10B981" bg="bg-emerald-50 dark:bg-emerald-950/20" />
                    <ColLegend label="Refusées" color="#EF4444" bg="bg-red-50 dark:bg-red-950/20" />
                  </>
                ) : (
                  <>
                    <ColLegend label="Nb Agents" color="#1557FF" bg="bg-blue-50 dark:bg-blue-950/20" />
                    <ColLegend label="Signalements" color="#8B5CF6" bg="bg-purple-50 dark:bg-purple-950/20" />
                    <ColLegend label="Acceptés" color="#10B981" bg="bg-emerald-50 dark:bg-emerald-950/20" />
                    <ColLegend label="Refusés" color="#EF4444" bg="bg-red-50 dark:bg-red-950/20" />
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals — portalled to body to escape layout stacking context */}
      {showModal && ReactDOM.createPortal(
        <UserModal
          user={createMode ? null : editTarget}
          departments={departments}
          onClose={() => { setShowModal(false); setEditTarget(null); setCreateMode(false) }}
          onSaved={msg => { setShowModal(false); setEditTarget(null); setCreateMode(false); flash(msg); load() }}
        />,
        document.body
      )}

      {/* Profile Detail Modal — portalled to body */}
      {viewTarget && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewTarget(null)} />
          <div className="relative bg-white dark:bg-slate-900 shadow-sm rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden" style={{ animation: 'slideUp .3s ease' }}>
            <div className="flex-shrink-0 border-b border-slate-100 dark:border-slate-800 px-6 pt-6 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md" style={{ background: avatarColor(viewTarget.first_name) }}>
                  {initials(viewTarget.first_name, viewTarget.last_name)}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                    {viewTarget.first_name} {viewTarget.last_name}
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold">
                    {viewTarget.role === 'chef' ? '👔 Chef de Service' : '👷 Agent Terrain'}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewTarget(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Informations de contact</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Email</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{viewTarget.email || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Téléphone</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{viewTarget.phone || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Affectation</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Département</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{viewTarget.department_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Localisation</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{viewTarget.location || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Statistiques</h3>
                {viewTarget.role === 'agent' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Tâches assignées</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white mt-1">{viewTarget.assigned_tasks}</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl shadow-sm border border-amber-100 dark:border-amber-900/30">
                      <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-500">En traitement</p>
                      <p className="text-lg font-black text-amber-700 dark:text-amber-400 mt-1">{viewTarget.in_progress_tasks}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                      <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-500">Terminées</p>
                      <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1">{viewTarget.resolved_tasks}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30">
                      <p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-500">Rejetées</p>
                      <p className="text-lg font-black text-red-700 dark:text-red-400 mt-1">{viewTarget.refused_tasks}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Agents supervisés</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white mt-1">{viewTarget.nb_agents}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-xl shadow-sm border border-blue-100 dark:border-blue-900/30">
                      <p className="text-[10px] uppercase font-bold text-primary">Signalements reçus</p>
                      <p className="text-lg font-black text-primary mt-1">{viewTarget.total_signalements}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                      <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-500">Transmis</p>
                      <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1">{viewTarget.accepted_signalements}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30">
                      <p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-500">Rejetés</p>
                      <p className="text-lg font-black text-red-700 dark:text-red-400 mt-1">{viewTarget.refused_signalements}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setViewTarget(null)} className="w-full py-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                Fermer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {confirm && ReactDOM.createPortal(<Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />, document.body)}
      {toast && ReactDOM.createPortal(<Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />, document.body)}
    </PresidentLayout>
  )
}

export default PresidentPersonnel