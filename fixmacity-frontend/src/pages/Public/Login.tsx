// src/pages/Public/Login
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, MapPin, ClipboardCheck } from 'lucide-react'
import Logo from '../../components/Logo'
import LanguageSwitcher from '../../components/shared/LanguageSwitcher'

// Image removed for CSS-only design
const API   = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function roleRedirect(role: string) {
  if (role === 'citizen')   return '/dashboard'
  if (role === 'agent')     return '/agent'
  if (role === 'chef')      return '/chef'
  if (role === 'president') return '/president'
  return '/'
}

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  // ── Standard email / password login ───────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || t('common.error'))

      localStorage.setItem('fmc_token',         data.token)
      localStorage.setItem('fmc_refresh_token', data.refreshToken || '')
      localStorage.setItem('fmc_user',          JSON.stringify(data.user))
      navigate(roleRedirect(data.user?.role))
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">

      {/* ── Left: form ── */}
      <div className="flex-1 flex flex-col justify-between px-8 sm:px-14 py-10 bg-white overflow-y-auto">
        <Logo variant="dark" size="md" />

        <div className="max-w-sm w-full mx-auto">
          <h1 className="text-4xl font-extrabold text-[#0A1628] mb-1 leading-tight tracking-tight">
            {t('auth.loginTitle')}
          </h1>
          <p className="text-slate-500 text-sm mb-8">{t('auth.loginSubtitle')}</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('auth.email')}
                className="w-full bg-slate-100 rounded-xl px-4 py-3.5 pr-11 text-[#0A1628] placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1557FF]/40 focus:bg-white transition-all text-sm"
              />
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('auth.password')}
                className="w-full bg-slate-100 rounded-xl px-4 py-3.5 pr-20 text-[#0A1628] placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1557FF]/40 focus:bg-white transition-all text-sm"
              />
              <Lock className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-[#1557FF] text-xs font-semibold hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              style={{ background: '#1557FF' }}>
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> {t('common.loading')}</>
                : t('auth.login')}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-[#1557FF] font-semibold hover:underline">{t('auth.signUp')}</Link>
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">© 2026 FixMaCity — Municipalité de Sousse</p>
          <LanguageSwitcher variant="compact" />
        </div>
      </div>

      {/* ── Right Panel: CSS-only Abstract & Interactive ── */}
      <div className="hidden lg:flex w-[45%] bg-[#060b19] relative overflow-hidden flex-col justify-between p-16 text-white border-l border-slate-900 select-none">
        {/* Glow Effects */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

        {/* Top brand accent */}
        <div className="relative z-10 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Plateforme Municipale</span>
        </div>

        {/* Mid section: Catchphrase & Glassmorphic stats */}
        <div className="relative z-10 space-y-8 my-auto">
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
              Rapprocher les citoyens de leur municipalité.
            </h2>
            <p className="text-slate-400 text-base max-w-md">
              Signalez les incidents, suivez les interventions en temps réel et participez activement à l'amélioration de votre cadre de vie.
            </p>
          </div>

          <div className="space-y-4">
            {/* Glass Card 1 */}
            <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.06] p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1] group">
              <div className="p-3 rounded-xl bg-blue-500/10 text-[#1557FF] group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Signalements Localisés</p>
                <p className="text-sm font-bold text-slate-200 mt-0.5">Géolocalisation précise des incidents pour intervention rapide.</p>
              </div>
            </div>

            {/* Glass Card 2 */}
            <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.06] p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1] group">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Suivi en Temps Réel</p>
                <p className="text-sm font-bold text-slate-200 mt-0.5">Restez informé à chaque étape, de la soumission à la résolution.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer brand info */}
        <div className="relative z-10 flex items-center justify-between border-t border-slate-900/60 pt-6">
          <span className="text-xs text-slate-500">Ville de Sousse — Tunisie</span>
          <span className="text-xs text-[#1557FF] font-semibold tracking-wider uppercase">FixMaCity 2026</span>
        </div>
      </div>
    </div>
  )
}

export default Login;