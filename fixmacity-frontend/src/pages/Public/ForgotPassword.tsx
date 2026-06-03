// src/pages/Public/ForgotPassword.tsx
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2, MapPin, ClipboardCheck } from 'lucide-react'
import Logo from '../../components/Logo'
import LanguageSwitcher from '../../components/shared/LanguageSwitcher'

const API  = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
// Image removed for CSS-only design

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
    <div className="flex h-screen w-full overflow-hidden bg-white">

      {/* ── Left: form ── */}
      <div className="flex-1 flex flex-col justify-between px-8 sm:px-14 py-10 bg-white overflow-y-auto">
        <Logo variant="dark" size="md" />

        <div className="max-w-sm w-full mx-auto my-auto py-6">

          {sent ? (
            /* ── Success state ── */
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-[#0A1628] mb-2 tracking-tight">Email envoyé !</h1>
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
                className="text-sm text-[#1557FF] font-semibold hover:underline mt-2">
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
                <h1 className="text-4xl font-extrabold text-[#0A1628] leading-tight mb-2 tracking-tight">
                  Mot de passe<br />oublié ?
                </h1>
                <p className="text-slate-500 text-sm">
                  Saisissez votre email — nous vous enverrons un lien de réinitialisation.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5 animate-shake">
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
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
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

export default ForgotPassword

