import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react'
import Logo from '../../components/Logo'

const PHOTO = '/sousse-premium.png'
const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

const DELEGATIONS = [
  { id: 'a309fed2-6c50-49ae-b2be-a6e7ccd096df', name: 'Sousse Ville' },
  { id: '0ede6556-2f67-4a0d-a7cb-d0cdca4504a5', name: 'Sousse Jawhara' },
  { id: 'a1ca5994-b186-4970-91f6-c44925cfc4b4', name: 'Sousse Sidi Abdelhamid' },
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
    if (!form.delegation_id) { setError('Veuillez sélectionner une délégation'); return }
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
    <div className="flex h-screen w-full overflow-hidden">

      {/* ── Left: form ── */}
      <div className="flex-1 flex flex-col justify-between px-8 sm:px-14 py-10 bg-white overflow-y-auto">
        <Logo variant="dark" size="md" />

        <div className="max-w-sm w-full mx-auto py-6">
          <h1 className="text-4xl font-extrabold text-[#0A1628] mb-1">Rejoignez la communauté</h1>
          <p className="text-slate-500 text-sm mb-8">Créez votre compte pour commencer à améliorer votre ville.</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
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
                <option value="" disabled>Votre délégation</option>
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
                    className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all"
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
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center mt-2"
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

        <p className="text-xs text-slate-400 text-center">© 2026 FixMaCity — Municipalité de Sousse</p>
      </div>

      {/* ── Right: curved photo ── */}
      <div className="hidden lg:block w-[45%] relative overflow-hidden">
        <img src={PHOTO} alt="Sousse" className="absolute inset-0 w-full h-full object-cover"
          style={{ borderRadius: '60% 0 0 60% / 50% 0 0 50%' }} />
        <div className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(21,87,255,0.12) 0%, transparent 60%)',
            borderRadius: '60% 0 0 60% / 50% 0 0 50%',
          }} />
      </div>
    </div>
  )
}

export default Register