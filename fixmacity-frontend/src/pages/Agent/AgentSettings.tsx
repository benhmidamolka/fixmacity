import React, { useState } from 'react'
import { 
  User, Shield, Bell, Phone, Mail, 
  MapPin, Camera, Save, Lock, 
  ChevronRight, LogOut, Check
} from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'

const AgentSettings: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('fmc_user') || '{}')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const initials = `${user.first_name?.[0] ?? 'A'}${user.last_name?.[0] ?? 'T'}`

  const handleSave = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }, 1000)
  }

  return (
    <AgentLayout title="Paramètres">
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Profile Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 text-center shadow-sm">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-2xl ring-4 ring-white"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                  {initials}
                </div>
                <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-slate-500 shadow-xl hover:text-emerald-500 transition-all">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-xl font-black text-[#0A1628]">{user.first_name} {user.last_name}</h3>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Agent Terrain · {user.department_name || 'Voirie'}</p>
              
              <div className="mt-8 pt-8 border-t border-slate-50 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Missions réalisées</span>
                  <span className="text-[#0A1628]">128</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Ancienneté</span>
                  <span className="text-[#0A1628]">2 ans</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0A1628] rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -mr-16 -mt-16" />
              <h4 className="text-sm font-black mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" /> Sécurité
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Votre compte est protégé par une authentification sécurisée. Contactez le service IT pour tout changement de rôle.
              </p>
              <button className="w-full flex items-center justify-between px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all group">
                <span className="text-xs font-bold">Historique de connexion</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Settings Main */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* General Info */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-[#0A1628] flex items-center gap-3">
                  <User className="w-5 h-5 text-emerald-500" /> Informations Personnelles
                </h3>
                {success && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl animate-in fade-in slide-in-from-right duration-300">
                    <Check className="w-4 h-4" />
                    <span className="text-xs font-bold">Enregistré !</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prénom</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type="text" defaultValue={user.first_name} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-[#0A1628] outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nom</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type="text" defaultValue={user.last_name} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-[#0A1628] outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email professionnel</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type="email" defaultValue={user.email} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-400 cursor-not-allowed outline-none" disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type="tel" defaultValue="+216 73 000 000" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-[#0A1628] outline-none focus:ring-2 focus:ring-emerald-100 transition-all" />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-50 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Sauvegarder les modifications
                </button>
              </div>
            </div>

            {/* Notifications Settings */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
              <h3 className="text-lg font-black text-[#0A1628] mb-6 flex items-center gap-3">
                <Bell className="w-5 h-5 text-emerald-500" /> Préférences Notifications
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Nouvelles missions assignées', desc: 'Recevoir une alerte pour chaque nouvelle tâche' },
                  { label: 'Messages du Chef de service', desc: 'Être notifié lors d\'un nouvel échange interne' },
                  { label: 'Alertes urgentes', desc: 'Rappels pour les missions prioritaires en attente' }
                ].map((pref, i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0">
                    <div className="pr-8">
                      <p className="text-sm font-black text-[#0A1628]">{pref.label}</p>
                      <p className="text-xs text-slate-400 mt-1">{pref.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Password Reset */}
            <div className="bg-red-50/50 rounded-[2.5rem] border border-red-100 p-8 shadow-sm">
              <h3 className="text-lg font-black text-red-900 mb-6 flex items-center gap-3">
                <Lock className="w-5 h-5 text-red-500" /> Sécurité du compte
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm font-black text-red-900">Changer votre mot de passe</p>
                  <p className="text-xs text-red-600 mt-1">Dernière modification il y a 3 mois</p>
                </div>
                <button className="w-full sm:w-auto px-6 py-3 bg-white border border-red-200 text-red-600 rounded-2xl text-sm font-bold hover:bg-red-100 transition-all">
                  Réinitialiser
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AgentLayout>
  )
}

export default AgentSettings
