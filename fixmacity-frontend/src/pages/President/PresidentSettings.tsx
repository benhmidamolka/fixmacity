import React, { useState } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import { User, Bell, Shield, Globe, Save, Eye, EyeOff, Check, HelpCircle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
    style={{ background: value ? '#1557FF' : '#E2E8F0' }}>
    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? 'left-5' : 'left-0.5'}`}/>
  </button>
)

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-5">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm"
        style={{ background: '#1557FF' }}>
        {icon}
      </div>
      <h2 className="text-sm font-black text-[#0A1628] uppercase tracking-wide">{title}</h2>
    </div>
    <div className="p-6">{children}</div>
  </div>
)

const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
    <div className="flex-1 mr-8">
      <p className="text-sm font-semibold text-[#0A1628]">{label}</p>
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
)

const PresidentSettings: React.FC = () => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('fmc_user') || '{}'))

  const [profile, setProfile] = useState({
    first_name: user.first_name || '',
    last_name:  user.last_name  || '',
    email:      user.email      || '',
    phone:      '+216 73 000 000',
    title:      'Président Municipal',
    municipality: 'Municipalité de Sousse',
  })

  const [passwords, setPasswords] = useState({
    current: '', newPwd: '', confirm: ''
  })
  const [showPwd, setShowPwd] = useState({ current: false, newPwd: false, confirm: false })

  const [notifSettings, setNotifSettings] = useState({
    new_declaration:  true,
    status_change:    true,
    rejection:        true,
    proposition_vote: false,
    email_notifs:     true,
    urgent_only:      false,
    daily_digest:     true,
  })

  const [privacy, setPrivacy] = useState({
    two_factor:      false,
    session_timeout: '30',
    audit_log:       true,
    ip_restriction:  false,
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
          last_name:  profile.last_name,
          lang_pref:  language
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
    } catch (_) {}
    setLoading(false)
  }

  const setN = (k: string, v: boolean) => setNotifSettings(p => ({ ...p, [k]: v }))
  const setP = (k: string, v: boolean | string) => setPrivacy(p => ({ ...p, [k]: v }))

  return (
    <PresidentLayout title="Paramètres">
      <div className="max-w-4xl mx-auto pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-[#0A1628]">Configuration du Compte</h1>
            <p className="text-sm text-slate-400 font-medium">Gérez votre profil, la sécurité et vos préférences de notification.</p>
          </div>
          <button onClick={handleSave} disabled={loading}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl text-white font-bold text-sm shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            style={{ background: saved ? '#10B981' : '#1557FF' }}>
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            ) : saved ? (
              <><Check className="w-4 h-4"/> Modifications enregistrées</>
            ) : (
              <><Save className="w-4 h-4"/> Enregistrer tout</>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* PROFILE */}
            <Section title="Profil Public" icon={<User className="w-4 h-4"/>}>
              <div className="flex items-center gap-6 mb-8 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="relative group cursor-pointer">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black ring-4 ring-white shadow-lg transition-transform group-hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #1557FF 0%, #3B82F6 100%)' }}>
                    {profile.first_name[0]}{profile.last_name[0]}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <span className="text-[10px] text-white font-black uppercase tracking-widest">Éditer</span>
                  </div>
                </div>
                <div>
                  <p className="font-black text-[#0A1628] text-lg leading-tight">{profile.first_name} {profile.last_name}</p>
                  <p className="text-xs font-bold text-[#1557FF] uppercase tracking-widest mt-1">ID: #PRES-{user.id?.slice(0,4)}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{profile.municipality}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-widest">Prénom</label>
                  <input value={profile.first_name}
                    onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-[#0A1628] focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-widest">Nom</label>
                  <input value={profile.last_name}
                    onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-[#0A1628] focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"/>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-widest">Adresse Email</label>
                  <input value={profile.email}
                    onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-[#0A1628] focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"/>
                </div>
              </div>
            </Section>

            {/* PASSWORD */}
            <Section title="Sécurité & Authentification" icon={<Shield className="w-4 h-4"/>}>
              <div className="space-y-4 mb-6">
                {(['current','newPwd','confirm'] as const).map(k => (
                  <div key={k}>
                    <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-widest">
                      {k === 'current' ? 'Mot de passe actuel' : k === 'newPwd' ? 'Nouveau mot de passe' : 'Confirmer'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd[k] ? 'text' : 'password'}
                        value={passwords[k]}
                        onChange={e => setPasswords(p => ({ ...p, [k]: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-[#0A1628] focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"/>
                      <button
                        type="button"
                        onClick={() => setShowPwd(p => ({ ...p, [k]: !p[k] }))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                        {showPwd[k] ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 space-y-1">
                <Field label="Double authentification (2FA)" hint="Requis pour les actions critiques.">
                  <Toggle value={privacy.two_factor} onChange={v => setP('two_factor', v)}/>
                </Field>
                <Field label="Journalisation étendue" hint="Historique complet des connexions.">
                  <Toggle value={privacy.audit_log} onChange={v => setP('audit_log', v)}/>
                </Field>
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            {/* LANGUAGE */}
            <Section title="Langue du portail" icon={<Globe className="w-4 h-4"/>}>
              <div className="space-y-2">
                {[
                  { code: 'fr', label: 'Français', flag: '🇫🇷' },
                  { code: 'ar', label: 'العربية',  flag: '🇹🇳' },
                ].map(l => (
                  <button key={l.code} onClick={() => setLanguage(l.code)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: language === l.code ? '#1557FF' : 'transparent',
                      background:  language === l.code ? '#EEF2FF' : '#F8FAFC',
                    }}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{l.flag}</span>
                      <span className={`text-sm font-bold ${language === l.code ? 'text-[#1557FF]' : 'text-slate-500'}`}>{l.label}</span>
                    </div>
                    {language === l.code && <Check className="w-4 h-4 text-[#1557FF]"/>}
                  </button>
                ))}
              </div>
            </Section>

            {/* NOTIFICATIONS */}
            <Section title="Alertes Système" icon={<Bell className="w-4 h-4"/>}>
              <div className="space-y-1">
                <Field label="Déclarations">
                  <Toggle value={notifSettings.new_declaration} onChange={v => setN('new_declaration', v)}/>
                </Field>
                <Field label="Changements statut">
                  <Toggle value={notifSettings.status_change} onChange={v => setN('status_change', v)}/>
                </Field>
                <Field label="Email Digest">
                  <Toggle value={notifSettings.daily_digest} onChange={v => setN('daily_digest', v)}/>
                </Field>
              </div>
            </Section>

            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 mb-4 shadow-sm">
                <HelpCircle className="w-5 h-5"/>
              </div>
              <p className="text-sm font-black text-[#0A1628] mb-1">Besoin d'aide ?</p>
              <p className="text-[11px] text-slate-500 font-bold mb-4">Contactez le support technique de FixMaCity pour toute assistance.</p>
              <button className="w-full py-2.5 bg-white rounded-xl text-xs font-black text-blue-600 shadow-sm hover:shadow-md transition-all">
                CENTRE D'AIDE
              </button>
            </div>
          </div>
        </div>
      </div>
    </PresidentLayout>
  )
}

export default PresidentSettings
