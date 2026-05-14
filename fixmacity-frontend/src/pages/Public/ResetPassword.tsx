// src/pages/Public/ResetPassword.tsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, XCircle } from 'lucide-react'
import Logo from '../../components/Logo'

const API   = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const PHOTO = '/sousse-premium.png'

const ResetPassword: React.FC = () => {
  const navigate         = useNavigate()
  const [params]         = useSearchParams()
  const token            = params.get('token') || ''

  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState('')

  // Redirect to login after success
  useEffect(() => {
    if (done) {
      const t = setTimeout(() => navigate('/login'), 3000)
      return () => clearTimeout(t)
    }
  }, [done, navigate])

  const strength = (() => {
    if (!password) return 0
    let s = 0
    if (password.length >= 8) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  })()

  const strengthLabel = ['', 'Faible', 'Moyen', 'Bien', 'Fort'][strength]
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'][strength]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token)               { setError('Lien invalide ou expiré.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8)  { setError('Minimum 8 caractères.'); return }
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lien invalide ou expiré')
      setDone(true)
    } catch (err: any) {
      setError(err.message)
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

          {/* No token */}
          {!token && (
            <div className="text-center space-y-4">
              <XCircle className="w-16 h-16 text-red-400 mx-auto" />
              <h1 className="text-2xl font-extrabold text-[#0A1628]">Lien invalide</h1>
              <p className="text-slate-500 text-sm">
                Ce lien de réinitialisation est manquant ou invalide.
              </p>
              <Link to="/forgot-password"
                className="inline-block mt-4 px-6 py-3 bg-[#1557FF] text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
                Demander un nouveau lien
              </Link>
            </div>
          )}

          {/* Success */}
          {done && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-[#0A1628] mb-2">Mot de passe mis à jour !</h1>
                <p className="text-slate-500 text-sm">
                  Votre mot de passe a été réinitialisé avec succès.
                  <br />
                  Redirection vers la connexion dans 3 secondes…
                </p>
              </div>
              <Link to="/login"
                className="inline-block px-6 py-3 bg-[#1557FF] text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
                Aller à la connexion
              </Link>
            </div>
          )}

          {/* Form */}
          {token && !done && (
            <>
              <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-[#0A1628] leading-tight mb-2">
                  Nouveau<br />mot de passe
                </h1>
                <p className="text-slate-500 text-sm">
                  Choisissez un mot de passe sécurisé d'au moins 8 caractères.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password */}
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Nouveau mot de passe"
                    className="w-full bg-slate-100 rounded-xl px-4 py-3.5 pr-20 text-[#0A1628] placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1557FF]/40 focus:bg-white transition-all text-sm"
                  />
                  <Lock className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength bar */}
                {password && (
                  <div className="space-y-1 px-1">
                    <div className="flex gap-1 h-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`flex-1 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-slate-200'}`} />
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 font-bold">{strengthLabel}</p>
                  </div>
                )}

                {/* Confirm */}
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'} required value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Confirmer le mot de passe"
                    className="w-full bg-slate-100 rounded-xl px-4 py-3.5 pr-20 text-[#0A1628] placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1557FF]/40 focus:bg-white transition-all text-sm"
                  />
                  <Lock className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Match indicator */}
                {confirm && (
                  <p className={`text-xs font-bold flex items-center gap-1.5 ${password === confirm ? 'text-emerald-600' : 'text-red-500'}`}>
                    {password === confirm
                      ? <><CheckCircle className="w-3.5 h-3.5" /> Les mots de passe correspondent</>
                      : <><XCircle className="w-3.5 h-3.5" /> Les mots de passe ne correspondent pas</>
                    }
                  </p>
                )}

                <button type="submit" disabled={loading || password !== confirm || password.length < 8}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                  style={{ background: '#1557FF' }}>
                  {loading
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : 'Réinitialiser le mot de passe'
                  }
                </button>
              </form>
            </>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">© 2026 FixMaCity — Municipalité de Sousse</p>
        </div>
      </div>

      {/* ── Right: Sousse photo ── */}
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

export default ResetPassword
