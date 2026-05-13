import React, { useState } from 'react'
import { User, Mail, Phone, MapPin, Lock, Eye, EyeOff, Save, Camera, CheckCircle } from 'lucide-react'
import CitizenLayout from '../../components/citizen/CitizenLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const Profile: React.FC = () => {
  const stored = JSON.parse(localStorage.getItem('fmc_user') || '{}')
  const token  = localStorage.getItem('fmc_token')

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    first_name: stored.first_name || '',
    last_name:  stored.last_name  || '',
    email:      stored.email      || '',
    phone:      stored.phone      || '',
    address:    stored.address    || '',
  })
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [showPwd,    setShowPwd]    = useState({ current: false, next: false, confirm: false })

  const [saving,   setSaving]   = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [savedPw,  setSavedPw]  = useState(false)
  const [error,    setError]    = useState('')
  const [pwError,  setPwError]  = useState('')

  const initials = `${form.first_name[0] || '?'}${form.last_name[0] || ''}`.toUpperCase()

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      localStorage.setItem('fmc_user', JSON.stringify({ ...stored, ...updated }))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Impossible de sauvegarder les modifications. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (passwords.next !== passwords.confirm) {
      setPwError('Les mots de passe ne correspondent pas.')
      return
    }
    if (passwords.next.length < 8) {
      setPwError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setSavingPw(true)
    try {
      const res = await fetch(`${API}/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: passwords.current, new_password: passwords.next }),
      })
      if (!res.ok) throw new Error()
      setPasswords({ current: '', next: '', confirm: '' })
      setSavedPw(true)
      setTimeout(() => setSavedPw(false), 3000)
    } catch {
      setPwError('Mot de passe actuel incorrect ou erreur serveur.')
    } finally {
      setSavingPw(false)
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────────
  return (
    <CitizenLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0A1628]">Mon profil</h1>
          <p className="text-slate-500 text-sm mt-1">Gérez vos informations personnelles et vos préférences de sécurité.</p>
        </div>

        {/* Avatar card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center gap-6 mb-6 shadow-sm">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1557FF] to-[#1040CC] flex items-center justify-center text-white text-2xl font-extrabold shadow-lg">
              {initials}
            </div>
            <button
              className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all"
              title="Modifier la photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <p className="text-xl font-bold text-[#0A1628]">{form.first_name} {form.last_name}</p>
            <p className="text-slate-400 text-sm mt-0.5">{form.email}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold px-2.5 py-1 rounded-full bg-[#eff6ff] text-[#1557FF]">
              Citoyen · Sousse
            </span>
          </div>
        </div>

        {/* ── Personal info form ── */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-100 p-6 mb-6 shadow-sm">
          <h2 className="text-base font-bold text-[#0A1628] mb-5 flex items-center gap-2">
            <User className="w-4 h-4 text-[#1557FF]" /> Informations personnelles
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <Field
              id="first_name" label="Prénom" value={form.first_name}
              onChange={handleField('first_name')} icon={<User className="w-4 h-4" />}
            />
            <Field
              id="last_name" label="Nom de famille" value={form.last_name}
              onChange={handleField('last_name')} icon={<User className="w-4 h-4" />}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <Field
              id="email" label="Adresse e-mail" type="email" value={form.email}
              onChange={handleField('email')} icon={<Mail className="w-4 h-4" />}
            />
            <Field
              id="phone" label="Téléphone" type="tel" value={form.phone}
              onChange={handleField('phone')} icon={<Phone className="w-4 h-4" />}
            />
          </div>

          <Field
            id="address" label="Adresse (optionnel)" value={form.address}
            onChange={handleField('address')} icon={<MapPin className="w-4 h-4" />}
            className="mb-5"
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl mb-4">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#1557FF] hover:bg-[#1040CC] disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Enregistrement…' : 'Sauvegarder'}
            </button>

            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-semibold">
                <CheckCircle className="w-4 h-4" /> Modifications enregistrées
              </span>
            )}
          </div>
        </form>

        {/* ── Change password form ── */}
        <form onSubmit={handleChangePassword} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#0A1628] mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#1557FF]" /> Changer le mot de passe
          </h2>
          <p className="text-xs text-slate-400 mb-5">Utilisez au moins 8 caractères avec des lettres et des chiffres.</p>

          <div className="space-y-4 mb-5">
            <PasswordField
              id="current_pwd" label="Mot de passe actuel"
              value={passwords.current}
              onChange={v => setPasswords(p => ({ ...p, current: v }))}
              show={showPwd.current}
              onToggle={() => setShowPwd(s => ({ ...s, current: !s.current }))}
            />
            <PasswordField
              id="new_pwd" label="Nouveau mot de passe"
              value={passwords.next}
              onChange={v => setPasswords(p => ({ ...p, next: v }))}
              show={showPwd.next}
              onToggle={() => setShowPwd(s => ({ ...s, next: !s.next }))}
            />
            <PasswordField
              id="confirm_pwd" label="Confirmer le nouveau mot de passe"
              value={passwords.confirm}
              onChange={v => setPasswords(p => ({ ...p, confirm: v }))}
              show={showPwd.confirm}
              onToggle={() => setShowPwd(s => ({ ...s, confirm: !s.confirm }))}
            />
          </div>

          {/* Strength indicator */}
          {passwords.next.length > 0 && (
            <div className="mb-5">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full transition-all"
                    style={{
                      background: i <= strengthScore(passwords.next)
                        ? strengthColor(passwords.next)
                        : '#e2e8f0',
                    }}
                  />
                ))}
              </div>
              <p className="text-xs font-medium" style={{ color: strengthColor(passwords.next) }}>
                {strengthLabel(passwords.next)}
              </p>
            </div>
          )}

          {pwError && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl mb-4">{pwError}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingPw || !passwords.current || !passwords.next || !passwords.confirm}
              className="flex items-center gap-2 bg-[#0A1628] hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all"
            >
              {savingPw ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {savingPw ? 'Mise à jour…' : 'Mettre à jour'}
            </button>

            {savedPw && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-semibold">
                <CheckCircle className="w-4 h-4" /> Mot de passe mis à jour
              </span>
            )}
          </div>
        </form>
      </div>
    </CitizenLayout>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────
function Field({
  id, label, value, onChange, type = 'text', icon, className = '',
}: {
  id: string; label: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string; icon: React.ReactNode; className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0A1628] placeholder-slate-400 outline-none focus:border-[#1557FF] focus:bg-white transition-all"
        />
      </div>
    </div>
  )
}

function PasswordField({
  id, label, value, onChange, show, onToggle,
}: {
  id: string; label: string; value: string
  onChange: (v: string) => void; show: boolean; onToggle: () => void
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0A1628] outline-none focus:border-[#1557FF] focus:bg-white transition-all"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

// ─── Password strength helpers ────────────────────────────────────────────────
function strengthScore(pwd: string) {
  let s = 0
  if (pwd.length >= 8)            s++
  if (/[A-Z]/.test(pwd))          s++
  if (/[0-9]/.test(pwd))          s++
  if (/[^A-Za-z0-9]/.test(pwd))  s++
  return s
}
function strengthColor(pwd: string) {
  const s = strengthScore(pwd)
  return s <= 1 ? '#e11d48' : s === 2 ? '#F59E0B' : s === 3 ? '#3b82f6' : '#16a34a'
}
function strengthLabel(pwd: string) {
  const s = strengthScore(pwd)
  return ['Trop faible', 'Faible', 'Moyen', 'Fort', 'Très fort'][s]
}

export default Profile
