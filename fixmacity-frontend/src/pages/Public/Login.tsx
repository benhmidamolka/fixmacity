// src/pages/Public/Login
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import Logo from '../../components/Logo'

const PHOTO = '/sousse-premium.png'
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
      if (!res.ok) throw new Error(data.error || data.message || 'Identifiants incorrects')

      localStorage.setItem('fmc_token',         data.token)
      localStorage.setItem('fmc_refresh_token', data.refreshToken || '')
      localStorage.setItem('fmc_user',          JSON.stringify(data.user))
      navigate(roleRedirect(data.user?.role))
    } catch (err: any) {
      setError(err.message || 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">

      {/* ── Left: form ── */}
      <div className="flex-1 flex flex-col justify-between px-8 sm:px-14 py-10 bg-white overflow-y-auto">
        <Logo variant="dark" size="md" />

        <div className="max-w-sm w-full mx-auto">
          <h1 className="text-4xl font-extrabold text-[#0A1628] mb-1 leading-tight">
            Connexion à votre<br />compte
          </h1>
          <p className="text-slate-500 text-sm mb-8">Heureux de vous revoir ! Accédez à vos signalements.</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-slate-100 rounded-xl px-4 py-3.5 pr-11 text-[#0A1628] placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1557FF]/40 focus:bg-white transition-all text-sm"
              />
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mot de passe"
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
                Mot de passe oublié ?
              </Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              style={{ background: '#1557FF' }}>
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Connexion…</>
                : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-[#1557FF] font-semibold hover:underline">S'inscrire</Link>
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">© 2026 FixMaCity — Municipalité de Sousse</p>
          <div className="flex gap-3">
            {['FR', 'AR', 'EN'].map(l => (
              <button key={l} className={`text-xs font-bold transition-colors ${l === 'FR' ? 'text-[#1557FF]' : 'text-slate-400 hover:text-slate-700'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: curved Sousse photo ── */}
      <div className="hidden lg:block w-[45%] relative overflow-hidden">
        <img src={PHOTO} alt="Sousse" className="absolute inset-0 w-full h-full object-cover"
          style={{ borderRadius: '60% 0 0 60% / 50% 0 0 50%' }} />
        <div className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(21,87,255,0.15) 0%, transparent 60%)',
            borderRadius: '60% 0 0 60% / 50% 0 0 50%',
          }} />
      </div>
    </div>
  )
}

export default Login;