// src/pages/Chef/ChefSettings.tsx
import React, { useState } from 'react'
import { 
  User, Shield, Bell, Eye, EyeOff, Save, 
  Camera, Lock, Globe, HardHat, Building2 
} from 'lucide-react'
import ChefLayout from '../../layouts/ChefLayout'
import { Toaster, toast } from 'react-hot-toast'

const ChefSettings: React.FC = () => {
  const [showPass, setShowPass] = useState(false)
  const user = JSON.parse(localStorage.getItem('fmc_user') || '{}')

  const [firstName, setFirstName] = useState(user.first_name || '')
  const [lastName, setLastName] = useState(user.last_name || '')
  const [email, setEmail] = useState(user.email || '')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSave = async () => {
    let hasChanges = false;
    let hasErrors = false;

    if (firstName !== user.first_name || lastName !== user.last_name || email !== user.email) {
      hasChanges = true;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('fmc_token')}` 
          },
          body: JSON.stringify({ first_name: firstName, last_name: lastName, email })
        });
        if (res.ok) {
          const updatedUser = { ...user, first_name: firstName, last_name: lastName, email };
          localStorage.setItem('fmc_user', JSON.stringify(updatedUser));
        } else {
          hasErrors = true;
          toast.error("Erreur lors de la mise à jour du profil");
        }
      } catch (err) {
        hasErrors = true;
        toast.error("Erreur de connexion");
      }
    }

    if (oldPassword || newPassword || confirmPassword) {
      hasChanges = true;
      if (newPassword !== confirmPassword) {
        toast.error("Les mots de passe ne correspondent pas");
        return;
      }
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/password`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('fmc_token')}` 
          },
          body: JSON.stringify({ current_password: oldPassword, new_password: newPassword })
        });
        if (res.ok) {
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          hasErrors = true;
          const data = await res.json();
          toast.error(data.error || "Erreur lors du changement de mot de passe");
        }
      } catch (err) {
        hasErrors = true;
        toast.error("Erreur de connexion");
      }
    }

    if (!hasChanges) {
      toast.error('Aucune modification à enregistrer');
    } else if (!hasErrors) {
      toast.success('Paramètres enregistrés avec succès')
    }
  }

  return (
    <ChefLayout title="Paramètres du Compte">
      <Toaster position="top-right" />
      <div className="max-w-5xl mx-auto pb-20">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Left: Navigation */}
           <div className="space-y-4">
              <div className="bg-white rounded-[2rem] p-4 border border-white shadow-xl shadow-slate-100 space-y-1">
                 <button className="w-full px-5 py-4 rounded-2xl bg-blue-50 text-[#1557FF] flex items-center gap-4 transition-all group">
                    <User className="w-5 h-5" />
                    <span className="text-sm font-black uppercase tracking-widest">Profil Personnel</span>
                 </button>
                 <button className="w-full px-5 py-4 rounded-2xl text-slate-400 hover:bg-slate-50 flex items-center gap-4 transition-all">
                    <Building2 className="w-5 h-5" />
                    <span className="text-sm font-black uppercase tracking-widest">Ma Direction</span>
                 </button>
                 <button className="w-full px-5 py-4 rounded-2xl text-slate-400 hover:bg-slate-50 flex items-center gap-4 transition-all">
                    <Bell className="w-5 h-5" />
                    <span className="text-sm font-black uppercase tracking-widest">Notifications</span>
                 </button>
                 <button className="w-full px-5 py-4 rounded-2xl text-slate-400 hover:bg-slate-50 flex items-center gap-4 transition-all">
                    <Shield className="w-5 h-5" />
                    <span className="text-sm font-black uppercase tracking-widest">Sécurité</span>
                 </button>
              </div>

              <div className="bg-[#0A1628] rounded-[2rem] p-8 text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16" />
                 <h4 className="text-sm font-black uppercase tracking-widest mb-4">Assistance Technique</h4>
                 <p className="text-xs text-slate-400 leading-relaxed mb-6">Besoin d'aide pour configurer votre service ? Contactez le support IT municipal.</p>
                 <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                   Ouvrir un ticket
                 </button>
              </div>
           </div>

           {/* Right: Forms */}
           <div className="lg:col-span-2 space-y-8">
              
              {/* Profile Card */}
              <div className="bg-white rounded-[2.5rem] border border-white shadow-2xl shadow-slate-100 overflow-hidden">
                 <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                    <div className="absolute -bottom-12 left-10">
                       <div className="relative group">
                          <div className="w-24 h-24 rounded-[2rem] bg-white p-1 shadow-xl">
                             <div className="w-full h-full rounded-[1.8rem] bg-slate-100 flex items-center justify-center text-3xl font-black text-blue-600">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                             </div>
                          </div>
                          <button className="absolute bottom-0 right-0 p-2 bg-[#1557FF] text-white rounded-xl shadow-lg hover:scale-110 transition-all">
                             <Camera className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                 </div>

                 <div className="pt-20 px-10 pb-10 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                          <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                          <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Professionnel</label>
                       <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                    </div>

                    <div className="pt-6 border-t border-slate-50">
                       <h3 className="text-sm font-black text-[#0A1628] uppercase tracking-widest mb-6 flex items-center gap-3">
                          <Lock className="w-4 h-4 text-slate-300" /> Sécurité
                       </h3>
                       <div className="space-y-4">
                           <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mot de passe actuel</label>
                             <div className="relative">
                                <input type={showPass ? 'text' : 'password'} value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                                <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                   {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nouveau mot de passe</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmer</label>
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                       <button className="px-8 py-3.5 rounded-2xl border border-slate-100 text-sm font-black text-slate-500 hover:bg-slate-50 transition-all">
                          Annuler
                       </button>
                       <button 
                         onClick={handleSave}
                         className="px-10 py-3.5 rounded-2xl bg-[#1557FF] text-white text-sm font-black shadow-lg shadow-blue-100 hover:bg-blue-600 hover:scale-105 transition-all flex items-center gap-2"
                       >
                          <Save className="w-4 h-4" /> Enregistrer les modifications
                       </button>
                    </div>
                 </div>
              </div>

           </div>
        </div>
      </div>
    </ChefLayout>
  )
}

export default ChefSettings
