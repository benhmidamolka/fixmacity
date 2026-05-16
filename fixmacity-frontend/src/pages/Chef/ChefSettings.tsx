import React, { useState } from 'react'
import { User, Mail, Lock, Eye, EyeOff, Save, Camera } from 'lucide-react'
import ChefLayout from '../../layouts/ChefLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

const ChefSettings: React.FC = () => {
  const [firstName, setFirstName] = useState('Ahmed')
  const [lastName, setLastName] = useState('Mansour')
  const [email, setEmail] = useState('a.mansour@sousse.tn')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [success, setSuccess] = useState(false)

  const user = { first_name: firstName, last_name: lastName }

  const handleSave = () => {
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <ChefLayout title="Paramètres">
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pt-8 pb-20 transition-colors">
        <div className="max-w-4xl mx-auto px-6">
           
           {success && (
              <div className="mb-8 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center gap-3 animate-fade-in">
                 <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Save className="w-4 h-4" />
                 </div>
                 <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Modifications enregistrées avec succès !</p>
              </div>
           )}

           <div className="space-y-8">
              {/* Header Card */}
              <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                   <div className="absolute -bottom-12 left-10">
                      <div className="relative group">
                          <div className="w-24 h-24 rounded-[2rem] bg-white dark:bg-slate-900 p-1 shadow-xl">
                             <div className="w-full h-full rounded-[1.8rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl font-black text-blue-600 dark:text-blue-400">
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
                         <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Prénom</label>
                         <input 
                           type="text" 
                           value={firstName} 
                           onChange={e => setFirstName(e.target.value)} 
                           className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all" 
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Nom</label>
                         <input 
                           type="text" 
                           value={lastName} 
                           onChange={e => setLastName(e.target.value)} 
                           className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all" 
                         />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Email Professionnel</label>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all" 
                      />
                   </div>

                   <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-black text-[#0A1628] dark:text-slate-100 uppercase tracking-widest mb-6 flex items-center gap-3">
                         <Lock className="w-4 h-4 text-slate-300 dark:text-slate-600" /> Sécurité
                      </h3>
                      <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Mot de passe actuel</label>
                            <div className="relative">
                               <input 
                                 type={showPass ? 'text' : 'password'} 
                                 value={oldPassword} 
                                 onChange={e => setOldPassword(e.target.value)} 
                                 className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all" 
                               />
                               <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 hover:text-slate-500 transition-colors">
                                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                               </button>
                            </div>
                         </div>
                         <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Nouveau mot de passe</label>
                               <input 
                                 type="password" 
                                 value={newPassword} 
                                 onChange={e => setNewPassword(e.target.value)} 
                                 placeholder="••••••••" 
                                 className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all" 
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Confirmer</label>
                               <input 
                                 type="password" 
                                 value={confirmPassword} 
                                 onChange={e => setConfirmPassword(e.target.value)} 
                                 placeholder="••••••••" 
                                 className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all" 
                               />
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="flex justify-end gap-3 pt-4">
                      <button className="px-8 py-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm font-black text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                         Annuler
                      </button>
                      <button 
                        onClick={handleSave}
                        className="px-10 py-3.5 rounded-2xl bg-[#1557FF] dark:bg-blue-600 text-white text-sm font-black shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-600 dark:hover:bg-blue-500 hover:scale-105 transition-all flex items-center gap-2"
                      >
                         <Save className="w-4 h-4" /> Enregistrer les modifications
                      </button>
                   </div>
                </div>
             </div>

           </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease forwards;
        }
      `}} />
    </ChefLayout>
  )
}

export default ChefSettings
