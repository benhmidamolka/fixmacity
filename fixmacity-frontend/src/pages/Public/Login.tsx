import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import Logo from '../../components/Logo'

const PHOTO = '/sousse-premium.png'
const API   = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Identifiants incorrects')
      localStorage.setItem('fmc_token', data.token)
      localStorage.setItem('fmc_user',  JSON.stringify(data.user))
      const role = data.user?.role
      if (role === 'citizen')   navigate('/dashboard')
      else if (role === 'agent')     navigate('/agent')
      else if (role === 'chef')      navigate('/chef')
      else if (role === 'president') navigate('/president')
      else navigate('/')
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
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center mt-2"
              style={{ background: '#1557FF' }}>
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Se connecter'}
            </button>
          </form>

          {/* Social divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-slate-400 text-xs font-semibold">Connexion sociale</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="flex justify-center gap-3">
            {/* Google */}
            <button className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>
            {/* Facebook */}
            <button className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
          </div>

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

export default Login
