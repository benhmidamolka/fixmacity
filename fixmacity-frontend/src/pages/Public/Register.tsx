import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, ChevronDown, MapPin, ClipboardCheck } from 'lucide-react'
import Logo from '../../components/Logo'
import LanguageSwitcher from '../../components/shared/LanguageSwitcher'

// Image removed for CSS-only design
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

    setLoading(true); setError('')
    try {
      const r1 = await fetch(`${API}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d1 = await r1.json()
      if (!r1.ok) throw new Error(d1.error || d1.message || "Erreur lors de l'inscription")

      // Register already returns a token — use it directly
      if (d1.token) {
        localStorage.setItem('fmc_token', d1.token)
        localStorage.setItem('fmc_refresh_token', d1.refreshToken || '')
        localStorage.setItem('fmc_user', JSON.stringify(d1.user))
        navigate('/dashboard')
        return
      }

      // Fallback: do a login call
      const r2 = await fetch(`${API}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    <div className="flex h-screen w-full overflow-hidden bg-white">

      {/* ── Left: form ── */}
      <div className="flex-1 flex flex-col justify-between px-8 sm:px-14 py-10 bg-white overflow-y-auto">
        <Logo variant="dark" size="md" />

        <div className="max-w-sm w-full mx-auto py-6">
          <h1 className="text-4xl font-extrabold text-[#0A1628] mb-1 tracking-tight">Rejoignez la communauté</h1>
          <p className="text-slate-500 text-sm mb-8">Créez votre compte pour commencer à améliorer votre ville.</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Prénom" required value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                className="bg-slate-100 rounded-xl px-4 py-3.5 text-[#0A1628] placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1557FF]/40 focus:bg-white transition-all text-sm" />
              <input placeholder="Nom" required value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                className="bg-slate-100 rounded-xl px-4 py-3.5 text-[#0A1628] placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1557FF]/40 focus:bg-white transition-all text-sm" />
            </div>

            {/* Email */}
            <input type="email" placeholder="Email" required value={form.email}
              onChange={e => set('email', e.target.value)}
              className="w-full bg-slate-100 rounded-xl px-4 py-3.5 text-[#0A1628] placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1557FF]/40 focus:bg-white transition-all text-sm" />

            {/* Delegation */}
            <div className="relative">
              <select value={form.delegation_id} onChange={e => set('delegation_id', e.target.value)}
                className="w-full bg-slate-100 rounded-xl px-4 py-3.5 pr-10 text-[#0A1628] outline-none focus:ring-2 focus:ring-[#1557FF]/40 focus:bg-white transition-all text-sm appearance-none">
                <option value="" disabled>Votre arrondissement</option>
                {DELEGATIONS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} placeholder="Mot de passe" required
                  value={form.password} onChange={e => set('password', e.target.value)}
                  className="w-full bg-slate-100 rounded-xl px-4 py-3.5 pr-11 text-[#0A1628] placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1557FF]/40 focus:bg-white transition-all text-sm" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {form.password.length > 0 && (
                <div className="flex gap-1.5 mt-2">
                  {[1, 2, 3, 4].map(l => (
                    <div key={l} className="h-1.5 flex-1 rounded-full transition-all"
                      style={{
                        background: strength >= l
                          ? strength < 2 ? '#f59e0b' : strength < 4 ? '#3b82f6' : '#16a34a'
                          : '#e2e8f0'
                      }} />
                  ))}
                </div>
              )}
              <p className="text-slate-400 text-xs mt-1">Min 8 caractères, 1 majuscule, 1 chiffre</p>
            </div>

            {/* Language */}
            <div>
              <p className="text-sm font-semibold text-[#0A1628] mb-2">Langue préférée</p>
              <div className="flex gap-2">
                {[{ code: 'FR', flag: '🇫🇷' }, { code: 'AR', flag: '🇹🇳' }, { code: 'EN', flag: '🇬🇧' }].map(l => (
                  <button key={l.code} type="button" onClick={() => set('lang_pref', l.code.toLowerCase())}
                    className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-slate-50 active:scale-[0.98]"
                    style={{
                      background: form.lang_pref === l.code.toLowerCase() ? '#0A1628' : 'transparent',
                      borderColor: form.lang_pref === l.code.toLowerCase() ? '#0A1628' : '#e2e8f0',
                      color: form.lang_pref === l.code.toLowerCase() ? 'white' : '#64748b',
                    }}>
                    {l.flag} {l.code}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center mt-2"
              style={{ background: '#1557FF' }}>
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : "S'inscrire"}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-5">
            Vous avez déjà un compte ?{' '}
            <Link to="/login" className="text-[#1557FF] font-semibold hover:underline">Se connecter</Link>
          </p>
        </div>

        <div className="flex items-center justify-between w-full">
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

export default Register