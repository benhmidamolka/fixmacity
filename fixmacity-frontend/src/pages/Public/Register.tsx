import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react'
import Logo from '../../components/Logo'
import LanguageSwitcher from '../../components/shared/LanguageSwitcher'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

const DELEGATIONS = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Sousse Médina (Vieux-Sousse)' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Sousse Sud' },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Sousse Nord' },
  { id: '44444444-4444-4444-8444-444444444444', name: 'Sousse Erriadh (Hay Riad)' },
]

function passwordStrength(p: string) {
  let s = 0
  if (p.length > 5) s++
  if (p.length > 8) s++
  if (/[A-Z]/.test(p) && /[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
}

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', delegation_id: '', lang_pref: 'fr',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const strength = passwordStrength(form.password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.delegation_id) { setError('Veuillez sélectionner un arrondissement'); return }
    if (form.password.length < 8) { setError('Mot de passe : minimum 8 caractères'); return }
    if (!/[A-Z]/.test(form.password)) { setError('Mot de passe : au moins une majuscule'); return }
    if (!/[0-9]/.test(form.password)) { setError('Mot de passe : au moins un chiffre'); return }

    setLoading(true)
    setError('')
    try {
      const r1 = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d1 = await r1.json()
      if (!r1.ok) throw new Error(d1.error || d1.message || "Erreur lors de l'inscription")

      if (d1.token) {
        localStorage.setItem('fmc_token', d1.token)
        localStorage.setItem('fmc_refresh_token', d1.refreshToken || '')
        localStorage.setItem('fmc_user', JSON.stringify(d1.user))
        navigate('/dashboard')
        return
      }

      // Fallback: login call
      const r2 = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const d2 = await r2.json()
      if (!r2.ok) throw new Error(d2.error || 'Connexion automatique échouée. Veuillez vous connecter manuellement.')
      
      localStorage.setItem('fmc_token', d2.token)
      localStorage.setItem('fmc_refresh_token', d2.refreshToken || '')
      localStorage.setItem('fmc_user', JSON.stringify(d2.user))
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between items-center p-6 bg-slate-50/50 overflow-x-hidden selection:bg-blue-500/10 selection:text-[#1557FF]">
      
      {/* ── Fluid Background Blobs ── */}
      <div className="absolute top-[-10%] left-[-15%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-blue-200/20 to-indigo-200/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-blue-400/30 to-cyan-300/20 blur-[150px] pointer-events-none transform rotate-12" />
      <div className="absolute top-[25%] right-[10%] w-[45%] h-[45%] rounded-full bg-indigo-200/15 blur-[120px] pointer-events-none" />

      {/* ── Top Navigation Bar ── */}
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center relative z-10 py-2">
        <Logo variant="dark" size="sm" />
        <LanguageSwitcher variant="compact" />
      </div>

      {/* ── Centered Card ── */}
      <div className="my-auto w-full max-w-[450px] bg-white rounded-3xl border border-slate-100 shadow-[0_25px_60px_rgba(8,112,184,0.06)] p-8 sm:p-10 relative z-10">
        
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo size="md" iconOnly={true} />
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-1.5 tracking-tight">
          {t('auth.signUpTitle')}
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm text-center mb-8 font-normal leading-relaxed max-w-[300px] mx-auto">
          {t('auth.signUpSubtitle')}
        </p>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 text-xs px-4 py-3.5 rounded-xl mb-6 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
                {t('auth.firstName')}
              </label>
              <input
                type="text"
                placeholder={t('auth.firstName')}
                required
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
                {t('auth.lastName')}
              </label>
              <input
                type="text"
                placeholder={t('auth.lastName')}
                required
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] transition-all text-sm"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
              {t('auth.email')}
            </label>
            <input
              type="email"
              placeholder="hello@example.com"
              required
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] transition-all text-sm"
            />
          </div>

          {/* Delegation */}
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
              {t('auth.delegation')}
            </label>
            <div className="relative">
              <select
                value={form.delegation_id}
                onChange={e => set('delegation_id', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] transition-all text-sm appearance-none rtl:pl-10 rtl:pr-4"
              >
                <option value="" disabled>{t('auth.delegation')}</option>
                {DELEGATIONS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rtl:left-3.5 rtl:right-auto" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••••••"
                required
                value={form.password}
                onChange={e => set('password', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] transition-all text-sm pr-12 rtl:pl-12 rtl:pr-4"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer rtl:left-3.5 rtl:right-auto"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength bar */}
            {form.password.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                {[1, 2, 3, 4].map(l => (
                  <div
                    key={l}
                    className="h-1.5 flex-1 rounded-full transition-all"
                    style={{
                      background: strength >= l
                        ? strength < 2 ? '#ef4444' : strength < 4 ? '#3b82f6' : '#10b981'
                        : '#f1f5f9'
                    }}
                  />
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
              Min 8 caractères, 1 majuscule, 1 chiffre
            </p>
          </div>

          {/* Language Preference */}
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
              {t('auth.langPref')}
            </label>
            <div className="flex gap-2">
              {[{ code: 'FR', flag: '🇫🇷' }, { code: 'AR', flag: '🇹🇳' }, { code: 'EN', flag: '🇬🇧' }].map(l => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => set('lang_pref', l.code.toLowerCase())}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-slate-50 active:scale-[0.98] cursor-pointer"
                  style={{
                    background: form.lang_pref === l.code.toLowerCase() ? '#0B132B' : 'white',
                    borderColor: form.lang_pref === l.code.toLowerCase() ? '#0B132B' : '#e2e8f0',
                    color: form.lang_pref === l.code.toLowerCase() ? 'white' : '#64748b',
                  }}
                >
                  {l.flag} {l.code}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0B132B] hover:bg-[#1C2541] active:scale-[0.98] text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 text-sm tracking-wide shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-4"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t('common.loading')}</span>
              </>
            ) : (
              t('auth.signUp')
            )}
          </button>
        </form>

        {/* Redirect */}
        <p className="text-center text-slate-500 text-xs sm:text-sm mt-6">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-[#1557FF] font-semibold hover:underline">
            {t('auth.login')}
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className="w-full max-w-7xl mx-auto flex justify-center items-center py-2 relative z-10 mt-4">
        <p className="text-[10px] sm:text-xs text-slate-400 text-center">
          © 2026 FixMaCity — Municipalité de Sousse
        </p>
      </div>
    </div>
  )
}

export default Register