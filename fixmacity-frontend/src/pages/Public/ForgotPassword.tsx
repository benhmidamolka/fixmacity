// src/pages/Public/ForgotPassword.tsx
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Logo from '../../components/Logo'

const API  = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const PHOTO = '/sousse-premium.png'

const ForgotPassword: React.FC = () => {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`${API}/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setSent(true)
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

          {sent ? (
            /* ── Success state ── */
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-[#0A1628] mb-2">Email envoyé !</h1>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Un lien de réinitialisation a été envoyé à{' '}
                  <span className="font-bold text-[#0A1628]">{email}</span>.
                  <br />
                  Vérifiez votre boîte de réception (et vos spams).
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-left space-y-1">
                <p className="text-xs font-bold text-blue-700">Instructions :</p>
                <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                  <li>Ouvrez l'email de FixMaCity</li>
                  <li>Cliquez sur "Réinitialiser le mot de passe"</li>
                  <li>Le lien expire dans <strong>1 heure</strong></li>
                </ul>
              </div>
              <button onClick={() => { setSent(false); setEmail('') }}
                className="text-sm text-[#1557FF] font-semibold hover:underline">
                Renvoyer l'email
              </button>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-8">
                <Link to="/login"
                  className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#1557FF] transition-colors mb-6">
                  <ArrowLeft className="w-4 h-4" /> Retour à la connexion
                </Link>
                <h1 className="text-4xl font-extrabold text-[#0A1628] leading-tight mb-2">
                  Mot de passe<br />oublié ?
                </h1>
                <p className="text-slate-500 text-sm">
                  Saisissez votre email — nous vous enverrons un lien de réinitialisation.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Votre adresse email"
                    className="w-full bg-slate-100 rounded-xl px-4 py-3.5 pr-11 text-[#0A1628] placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1557FF]/40 focus:bg-white transition-all text-sm"
                  />
                  <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>

                <button type="submit" disabled={loading || !email}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: '#1557FF' }}>
                  {loading
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : 'Envoyer le lien de réinitialisation'
                  }
                </button>
              </form>

              <p className="text-center text-slate-500 text-sm mt-6">
                Vous vous souvenez ?{' '}
                <Link to="/login" className="text-[#1557FF] font-semibold hover:underline">
                  Se connecter
                </Link>
              </p>
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

export default ForgotPassword
