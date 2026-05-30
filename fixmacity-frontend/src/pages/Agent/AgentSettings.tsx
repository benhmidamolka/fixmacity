// src/pages/Agent/AgentSettings.tsx
import React, { useState } from 'react'
import AgentLayout from '../../layouts/AgentLayout'
import {
  User, Save, Eye, EyeOff, Check, Mail, Lock, Camera, Shield, MapPin, Briefcase
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

const AgentSettings: React.FC = () => {
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('fmc_user') || '{}'))

  const [profile, setProfile] = useState({
    first_name: currentUser.first_name || '',
    last_name: currentUser.last_name || '',
    email: currentUser.email || '',
    phone: currentUser.phone || '+216 73 123 456',
    department: currentUser.department_name || 'Voirie & Routes',
  })

  const [passwords, setPasswords] = useState({
    current: '',
    newPwd: '',
    confirm: ''
  })

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSaveProfile = async () => {
    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      toast.error('Le prénom et le nom sont obligatoires.')
      return
    }

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
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          localStorage.setItem('fmc_user', JSON.stringify(data.user))
          setCurrentUser(data.user)
          setSaved(true)
          toast.success('Profil mis à jour avec succès !')
          setTimeout(() => setSaved(false), 3000)
        }
      } else {
        toast.error('Erreur lors de la mise à jour du profil')
      }
    } catch (_) {
      toast.error('Erreur de connexion avec le serveur')
    }
    setLoading(false)
  }

  const handleUpdatePassword = async () => {
    if (!passwords.current || !passwords.newPwd || !passwords.confirm) {
      toast.error('Veuillez remplir tous les champs de mot de passe.')
      return
    }

    if (passwords.newPwd !== passwords.confirm) {
      toast.error('Le nouveau mot de passe et sa confirmation ne correspondent pas.')
      return
    }

    if (passwords.newPwd.length < 6) {
      toast.error('Le nouveau mot de passe doit faire au moins 6 caractères.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({
          oldPassword: passwords.current,
          newPassword: passwords.newPwd
        })
      })

      if (res.ok) {
        toast.success('Mot de passe mis à jour avec succès !')
        setPasswords({ current: '', newPwd: '', confirm: '' })
      } else {
        const err = await res.json()
        toast.error(err.message || 'Mot de passe actuel incorrect')
      }
    } catch (_) {
      toast.error('Erreur lors du changement de mot de passe')
    }
    setLoading(false)
  }

  const initials = `${profile.first_name?.[0] ?? 'A'}${profile.last_name?.[0] ?? 'T'}`

  return (
    <AgentLayout title="Paramètres">
      <div className="max-w-4xl mx-auto pb-24 text-slate-100">
        
        {/* Header */}
        <div className="mb-10">
          <h2 className="text-3xl font-black text-white tracking-tight">Paramètres du Profil</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Gérez vos informations de compte, votre identité d'agent de terrain et vos options de sécurité.
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] shadow-xl overflow-hidden backdrop-blur-xl mb-8">
          <div className="h-32 bg-gradient-to-r from-emerald-600 to-teal-600 relative">
            <div className="absolute -bottom-10 left-10">
              <div className="relative group">
                <div className="w-24 h-24 rounded-[2rem] bg-slate-950 p-1.5 shadow-2xl">
                  <div className="w-full h-full rounded-[1.7rem] flex items-center justify-center text-white text-3xl font-black shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                    {initials}
                  </div>
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl shadow-lg hover:scale-110 transition-all">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-16 px-8 pb-8 space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-950/40 border border-emerald-900/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Agent de Terrain
              </span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Sousse
              </span>
              <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest bg-teal-950/40 border border-teal-900/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <Briefcase className="w-3 h-3" /> {profile.department}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                <input
                  type="text"
                  value={profile.first_name}
                  onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
                  className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-sm font-bold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                <input
                  type="text"
                  value={profile.last_name}
                  onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
                  className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-sm font-bold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full pl-11 pr-5 py-4 bg-slate-950/30 border border-slate-800 rounded-2xl text-sm font-bold text-slate-400 outline-none cursor-not-allowed"
                />
              </div>
              <span className="text-[10px] text-slate-500 italic ml-1">Pour changer votre adresse email professionnelle, veuillez contacter un administrateur.</span>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : saved ? (
                  <><Check className="w-4 h-4" /> Changements appliqués</>
                ) : (
                  <><Save className="w-4 h-4" /> Enregistrer le profil</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Security / Password Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] shadow-xl overflow-hidden backdrop-blur-xl">
          <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Sécurité du Compte</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Mise à jour du mot de passe</p>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mot de passe actuel</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={passwords.current}
                  onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                  className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-sm font-bold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Saisissez votre mot de passe actuel"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={passwords.newPwd}
                    onChange={e => setPasswords(p => ({ ...p, newPwd: e.target.value }))}
                    className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-sm font-bold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmer le nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={passwords.confirm}
                    onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                    className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-sm font-bold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleUpdatePassword}
                disabled={loading}
                className="px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-black border border-slate-700/60 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Modifier le mot de passe</>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </AgentLayout>
  )
}

export default AgentSettings
