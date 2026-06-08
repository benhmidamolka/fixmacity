// src/pages/Public/Login.tsx
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import Logo from '../../components/Logo'
import LanguageSwitcher from '../../components/shared/LanguageSwitcher'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || t('common.error'))

      localStorage.setItem('fmc_token', data.token)
      localStorage.setItem('fmc_refresh_token', data.refreshToken || '')
      localStorage.setItem('fmc_user', JSON.stringify(data.user))
      navigate(roleRedirect(data.user?.role))
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

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
      <div className="my-auto w-full max-w-[440px] bg-white rounded-3xl border border-slate-100 shadow-[0_25px_60px_rgba(8,112,184,0.06)] p-8 sm:p-10 relative z-10">
        
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo size="md" iconOnly={true} />
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-1.5 tracking-tight">
          {t('auth.loginTitle')}
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm text-center mb-8 font-normal leading-relaxed max-w-[280px] mx-auto">
          {t('auth.loginSubtitle')}
        </p>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 text-xs px-4 py-3.5 rounded-xl mb-6 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
              {t('auth.email')}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="hello@example.com"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] transition-all text-sm"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {t('auth.password')}
              </label>
              <Link to="/forgot-password" className="text-[#1557FF] text-[10px] sm:text-xs font-semibold hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
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
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0B132B] hover:bg-[#1C2541] active:scale-[0.98] text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 text-sm tracking-wide shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('common.loading')}</span>
              </>
            ) : (
              t('auth.login')
            )}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center text-slate-400 text-xs sm:text-sm mt-8">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-[#1557FF] font-semibold hover:underline">
            {t('auth.signUp')}
          </Link>
        </p>

      </div>

      {/* ── Footer ── */}
      <div className="w-full max-w-7xl mx-auto text-center py-2 relative z-10">
        <p className="text-[11px] text-slate-400">© 2026 FixMaCity — Municipalité de Sousse. Tous droits réservés.</p>
      </div>

    </div>
  )
}

export default Login