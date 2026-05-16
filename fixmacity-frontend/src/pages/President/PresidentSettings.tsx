// src/pages/president/PresidentSettings.tsx
import React, { useState } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import {
  User, Bell, Shield, Globe, Save, Eye, EyeOff, Check,
  HelpCircle, ChevronRight, Mail, Phone, MapPin, Briefcase,
  Activity, Lock, Zap, RefreshCw, Key, LogOut
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

// ── UI Components ─────────────────────────────────────────────────────────────

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative w-14 h-7 rounded-full transition-all duration-300 flex-shrink-0 focus:outline-none ring-offset-2 dark:ring-offset-slate-950 focus:ring-2 focus:ring-blue-500/20 ${value ? 'bg-[#1557FF] shadow-[0_0_20px_rgba(21,87,255,0.3)]' : 'bg-slate-200 dark:bg-slate-800'}`}>
    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 transform ${value ? 'translate-x-8' : 'translate-x-1'}`} />
  </button>
)

const Section: React.FC<{ title: string; subtitle?: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, icon, children }) => (
  <div className="bg-slate-900/40 dark:bg-slate-950/90 rounded-[3rem] border border-slate-200/60 dark:border-slate-800/50 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.03)] overflow-hidden mb-10 group hover:border-[#1557FF]/20 dark:hover:border-[#1557FF]/40 transition-all duration-500 backdrop-blur-3xl">
    <div className="flex items-center gap-6 px-10 py-8 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/20">
      <div className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/50 text-[#1557FF] shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-black text-[#0A1628] dark:text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">{subtitle}</p>}
      </div>
    </div>
    <div className="p-10">{children}</div>
  </div>
)

const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string; icon?: React.ReactNode }> = ({ label, children, hint, icon }) => (
  <div className="flex items-center justify-between py-8 border-b border-slate-50 dark:border-slate-800/50 last:border-0 group/field">
    <div className="flex items-center gap-6 flex-1 mr-8">
      {icon && <div className="text-slate-300 dark:text-slate-600 group-hover/field:text-[#1557FF] transition-colors">{icon}</div>}
      <div>
        <p className="text-base font-black text-[#0A1628] dark:text-white tracking-tight">{label}</p>
        {hint && <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1.5 italic">{hint}</p>}
      </div>
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
)

const PresidentSettings: React.FC = () => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('fmc_user') || '{}'))

  const [profile, setProfile] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    phone: '+216 73 000 000',
    title: 'Président Municipal',
    municipality: 'Municipalité de Sousse',
  })

  const [passwords, setPasswords] = useState({
    current: '', newPwd: '', confirm: ''
  })
  const [showPwd, setShowPwd] = useState({ current: false, newPwd: false, confirm: false })

  const [notifSettings, setNotifSettings] = useState({
    new_declaration: true,
    status_change: true,
    rejection: true,
    proposition_vote: false,
    email_notifs: true,
    urgent_only: false,
    daily_digest: true,
  })

  const [privacy, setPrivacy] = useState({
    two_factor: false,
    session_timeout: '30',
    audit_log: true,
    ip_restriction: false,
  })

  const [language, setLanguage] = useState(user.lang_pref || 'fr')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          lang_pref: language
        })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          localStorage.setItem('fmc_user', JSON.stringify(data.user))
          setUser(data.user)
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
        }
      }
    } catch (_) { }
    setLoading(false)
  }

  const setN = (k: string, v: boolean) => setNotifSettings(p => ({ ...p, [k]: v }))
  const setP = (k: string, v: boolean | string) => setPrivacy(p => ({ ...p, [k]: v }))

  return (
    <PresidentLayout title="Paramètres">
      <div className="max-w-7xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Page Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-black text-[#0A1628] dark:text-white tracking-tight mb-3">Configuration Système</h1>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500 italic">Pilotage des accès, sécurité et préférences du portail présidentiel.</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => window.location.reload()} className="w-14 h-14 rounded-2xl bg-slate-900/10 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/50 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-[#1557FF] transition-all backdrop-blur-3xl">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={handleSave} disabled={loading}
              className={`h-14 px-10 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-2xl flex items-center gap-3 ${saved ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-900 dark:bg-[#1557FF] shadow-slate-900/10'
                }`}>
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <><Check className="w-5 h-5" /> Changements synchronisés</>
              ) : (
                <><Save className="w-5 h-5" /> Appliquer les modifications</>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">

          {/* Main Content */}
          <div className="xl:col-span-8 space-y-10">

            {/* PROFILE SECTION */}
            <Section title="Profil Présidentiel" subtitle="Identité Opérationnelle" icon={<User className="w-6 h-6" />}>
              <div className="flex flex-col md:flex-row items-center gap-10 mb-12 p-8 bg-slate-50/50 dark:bg-slate-950/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/50 border-dashed relative overflow-hidden group/avatar backdrop-blur-3xl">
                <div className="absolute inset-0 bg-blue-50/10 dark:bg-blue-500/5 translate-y-full group-hover/avatar:translate-y-0 transition-transform duration-700" />
                <div className="relative">
                  <div className="w-28 h-28 rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl transition-all group-hover/avatar:scale-105 group-hover/avatar:rotate-3"
                    style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1557FF 100%)' }}>
                    {(() => {
                      const a = (profile.first_name || '').trim()
                      const b = (profile.last_name || '').trim()
                      const s = [a[0], b[0]].filter(Boolean).join('')
                      return s || '—'
                    })()}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-[#1557FF] shadow-xl">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-center md:text-left flex-1 relative">
                  <p className="text-3xl font-black text-[#0A1628] dark:text-white tracking-tight leading-tight mb-2">{profile.first_name} {profile.last_name}</p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                    <span className="text-[9px] font-black text-[#1557FF] uppercase tracking-[0.2em] bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-900/30 px-4 py-1.5 rounded-xl">
                      ID: {user.id?.slice(0, 10).toUpperCase()}
                    </span>
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.2em] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/30 px-4 py-1.5 rounded-xl flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ACTIF
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-slate-400 dark:text-slate-500">
                    <span className="text-xs font-bold flex items-center gap-2.5"><MapPin className="w-4 h-4 text-slate-300 dark:text-slate-600" /> Sousse, Tunisie</span>
                    <span className="text-xs font-bold flex items-center gap-2.5"><Briefcase className="w-4 h-4 text-slate-300 dark:text-slate-600" /> Président de la Municipalité</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group/input">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3 block uppercase tracking-[0.2em] group-focus-within/input:text-[#1557FF] transition-colors">Prénom Civil</label>
                  <input value={profile.first_name}
                    onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
                    className="w-full h-16 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl px-8 text-base font-bold text-[#0A1628] dark:text-white focus:bg-white dark:focus:bg-slate-900/60 focus:ring-4 focus:ring-blue-500/10 focus:border-[#1557FF]/30 outline-none transition-all" />
                </div>
                <div className="group/input">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3 block uppercase tracking-[0.2em] group-focus-within/input:text-[#1557FF] transition-colors">Nom de famille</label>
                  <input value={profile.last_name}
                    onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
                    className="w-full h-16 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl px-8 text-base font-bold text-[#0A1628] dark:text-white focus:bg-white dark:focus:bg-slate-900/60 focus:ring-4 focus:ring-blue-500/10 focus:border-[#1557FF]/30 outline-none transition-all" />
                </div>
                <div className="md:col-span-2 group/input">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3 block uppercase tracking-[0.2em] group-focus-within/input:text-[#1557FF] transition-colors">Canal de communication principal</label>
                  <div className="relative">
                    <Mail className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600 group-focus-within/input:text-[#1557FF] transition-all" />
                    <input value={profile.email}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                      className="w-full h-16 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl pl-16 pr-8 text-base font-bold text-[#0A1628] dark:text-white focus:bg-white dark:focus:bg-slate-900/60 focus:ring-4 focus:ring-blue-500/10 focus:border-[#1557FF]/30 outline-none transition-all" />
                  </div>
                </div>
              </div>
            </Section>

            {/* SECURITY SECTION */}
            <Section title="Sécurité & Chiffrement" subtitle="Protocole de Protection" icon={<Lock className="w-6 h-6" />}>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-8 mb-12">
                {(['current', 'newPwd', 'confirm'] as const).map(k => (
                  <div key={k} className="group/input">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3 block uppercase tracking-[0.2em] group-focus-within/input:text-[#1557FF] transition-colors">
                      {k === 'current' ? 'Clé d\'accès actuelle' : k === 'newPwd' ? 'Nouveau code secret' : 'Confirmation du code'}
                    </label>
                    <div className="relative">
                      <Key className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600 group-focus-within/input:text-[#1557FF] transition-all" />
                      <input
                        type={showPwd[k] ? 'text' : 'password'}
                        value={passwords[k]}
                        onChange={e => setPasswords(p => ({ ...p, [k]: e.target.value }))}
                        placeholder="••••••••••••••••"
                        className="w-full h-16 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl pl-16 pr-16 text-base font-bold text-[#0A1628] dark:text-white focus:bg-white dark:focus:bg-slate-900/60 focus:ring-4 focus:ring-blue-500/10 focus:border-[#1557FF]/30 outline-none transition-all" />
                      <button
                        type="button"
                        onClick={() => setShowPwd(p => ({ ...p, [k]: !p[k] }))}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 hover:text-[#1557FF] transition-colors p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10">
                        {showPwd[k] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Field label="Double Authentification (2FA)" hint="Sécurisez vos accès via un protocole mobile OTP." icon={<Zap className="w-5 h-5" />}>
                  <Toggle value={privacy.two_factor} onChange={v => setP('two_factor', v)} />
                </Field>
                <Field label="Journal d'audit avancé" hint="Conserver une trace immuable de toutes les actions présidentielles." icon={<Activity className="w-5 h-5" />}>
                  <Toggle value={privacy.audit_log} onChange={v => setP('audit_log', v)} />
                </Field>
              </div>
            </Section>
          </div>

          {/* Sidebar Area */}
          <div className="xl:col-span-4 space-y-10">

            {/* LANGUAGE SECTION */}
            <Section title="Localisation" subtitle="Région & Dialecte" icon={<Globe className="w-6 h-6" />}>
              <div className="space-y-4">
                {[
                  { code: 'fr', label: 'Français Tunisien', flag: '🇫🇷', detail: 'Sousse (Par défaut)' },
                  { code: 'ar', label: 'العربية التونسية', flag: '🇹🇳', detail: 'سوسة (تونس)' },
                ].map(l => (
                  <button key={l.code} onClick={() => setLanguage(l.code)}
                    className={`w-full flex items-center justify-between p-6 rounded-[1.75rem] border-2 transition-all group ${language === l.code
                        ? 'border-[#1557FF] bg-blue-50/50 dark:bg-blue-500/10'
                        : 'border-slate-50 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-800/20 hover:border-slate-200 dark:hover:border-slate-700'
                      }`}>
                    <div className="flex items-center gap-5">
                      <span className="text-3xl group-hover:scale-125 group-hover:rotate-6 transition-transform duration-500">{l.flag}</span>
                      <div className="text-left">
                        <p className={`text-sm font-black tracking-tight leading-none mb-1.5 ${language === l.code ? 'text-[#1557FF]' : 'text-[#0A1628] dark:text-white'}`}>{l.label}</p>
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{l.detail}</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${language === l.code ? 'bg-[#1557FF] border-[#1557FF] shadow-lg shadow-blue-500/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}>
                      {language === l.code && <Check className="w-3.5 h-3.5 text-white stroke-[4]" />}
                    </div>
                  </button>
                ))}
              </div>
            </Section>

            {/* NOTIFICATIONS SECTION */}
            <Section title="Flux d'Alerte" subtitle="Notifications Push" icon={<Bell className="w-6 h-6" />}>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] font-black text-[#0A1628] dark:text-white uppercase tracking-widest">Signalements</span>
                  </div>
                  <Toggle value={notifSettings.new_declaration} onChange={v => setN('new_declaration', v)} />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-[11px] font-black text-[#0A1628] dark:text-white uppercase tracking-widest">Mises à jour</span>
                  </div>
                  <Toggle value={notifSettings.status_change} onChange={v => setN('status_change', v)} />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-violet-500" />
                    <span className="text-[11px] font-black text-[#0A1628] dark:text-white uppercase tracking-widest">Rapport Email</span>
                  </div>
                  <Toggle value={notifSettings.daily_digest} onChange={v => setN('daily_digest', v)} />
                </div>
              </div>
            </Section>

            {/* HELP CARD */}
            <div className="bg-slate-900/40 dark:bg-slate-950/90 rounded-[3rem] p-10 border border-slate-200/60 dark:border-slate-800/50 backdrop-blur-3xl relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 dark:bg-blue-500/5 blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
              <div className="w-16 h-16 rounded-[1.5rem] bg-[#1557FF]/10 flex items-center justify-center mb-8 backdrop-blur-md border border-[#1557FF]/10 group-hover:rotate-12 transition-transform duration-500">
                <HelpCircle className="w-8 h-8 text-[#1557FF]" />
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-4 text-[#0A1628] dark:text-white">Assistance FMC</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-10">
                L'équipe technique de FixMaCity est à votre disposition pour tout audit de sécurité ou configuration avancée.
              </p>
              <div className="space-y-4">
                <button className="w-full py-5 bg-[#1557FF] text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-[0.98]">
                  Contacter le Support
                </button>
                <button onClick={() => window.location.href = '/login'} className="w-full py-5 bg-slate-900/10 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800/50 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all flex items-center justify-center gap-3">
                  <LogOut className="w-4 h-4" /> Déconnexion Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PresidentLayout>
  )
}

export default PresidentSettings
