// src/components/president/UserManagementDrawer.tsx
import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { 
  X, Shield, User as UserIcon, Mail, Phone, MapPin, 
  Briefcase, CheckCircle2, AlertCircle, Loader2, 
  Trash2, Power, PowerOff, Save, Key
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role: 'agent' | 'chef';
  department_id: string;
  delegation_id: string;
  is_active: boolean;
  department_name?: string;
  location?: string;
}

interface Props {
  user: User | null; // null for creation
  onClose: () => void;
  onSuccess: () => void;
  departments: any[];
  delegations: any[];
}

const UserManagementDrawer: React.FC<Props> = ({ user, onClose, onSuccess, departments, delegations }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'agent',
    department_id: user?.department_id || '',
    delegation_id: user?.delegation_id || '',
    password: '', // Only for creation
  })

  const isEdit = !!user

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = isEdit ? `${API}/president/users/${user.id}` : `${API}/president/users`
      const method = isEdit ? 'PATCH' : 'POST'
      
      const body: any = { ...formData }
      if (isEdit) delete body.password // Don't send empty password on edit
      if (!isEdit && !body.password) {
        setError('Le mot de passe est obligatoire pour la création.')
        setLoading(false)
        return
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Une erreur est survenue.')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/president/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ is_active: !user.is_active })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur status')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user) return
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?')) return
    
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/president/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur suppression')
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex justify-end">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#0A1628]/40 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xl font-black text-[#0A1628] tracking-tight">
                {isEdit ? 'Profil Collaborateur' : 'Nouveau Collaborateur'}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                {isEdit ? `ID: ${user.id.slice(0, 8).toUpperCase()}` : 'Création de compte municipal'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            {error && (
              <div className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-600 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <form id="user-form" onSubmit={handleSubmit} className="space-y-8">
              {/* Identity Section */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1557FF] mb-6 flex items-center gap-2">
                  <UserIcon size={14} /> Identité & Rôle
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Prénom</label>
                    <input 
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={e => setFormData({...formData, first_name: e.target.value})}
                      className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-[#0A1628] focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nom</label>
                    <input 
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={e => setFormData({...formData, last_name: e.target.value})}
                      className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-[#0A1628] focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Rôle Municipal</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, role: 'agent'})}
                      className={`h-14 rounded-2xl border flex items-center justify-center gap-3 transition-all ${formData.role === 'agent' ? 'bg-blue-50 border-blue-200 text-[#1557FF] shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                    >
                      <UserIcon size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Agent Terrain</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, role: 'chef'})}
                      className={`h-14 rounded-2xl border flex items-center justify-center gap-3 transition-all ${formData.role === 'chef' ? 'bg-blue-50 border-blue-200 text-[#1557FF] shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                    >
                      <Shield size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Chef de Service</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* Contact Section */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1557FF] mb-6 flex items-center gap-2">
                  <Mail size={14} /> Coordonnées & Accès
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Professionnel</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="email"
                        required
                        disabled={isEdit}
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full h-14 pl-12 pr-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-[#0A1628] focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                  {!isEdit && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mot de passe provisoire</label>
                      <div className="relative">
                        <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          type="password"
                          required={!isEdit}
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          placeholder="••••••••"
                          className="w-full h-14 pl-12 pr-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-[#0A1628] focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full h-14 pl-12 pr-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-[#0A1628] focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Affectation Section */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1557FF] mb-6 flex items-center gap-2">
                  <Briefcase size={14} /> Affectation Administrative
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pôle Technique / Service</label>
                    <select
                      value={formData.department_id}
                      onChange={e => setFormData({...formData, department_id: e.target.value})}
                      className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-[#0A1628] focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all"
                    >
                      <option value="">Sélectionner un service</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name_fr || d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Zone d'intervention (Délégation)</label>
                    <div className="relative">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <select
                        value={formData.delegation_id}
                        onChange={e => setFormData({...formData, delegation_id: e.target.value})}
                        className="w-full h-14 pl-12 pr-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-[#0A1628] focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all"
                      >
                        <option value="">Sélectionner une zone</option>
                        {delegations.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </section>
            </form>
          </div>

          {/* Footer Actions */}
          <div className="p-8 border-t border-slate-100 bg-slate-50/30">
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                form="user-form"
                disabled={loading}
                className="w-full h-16 rounded-[1.5rem] bg-[#1557FF] text-white text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isEdit ? 'Enregistrer les modifications' : 'Créer le compte'}
              </button>

              {isEdit && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleToggleActive}
                    disabled={loading}
                    className={`h-14 rounded-2xl border flex items-center justify-center gap-2 transition-all ${user.is_active ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                  >
                    {user.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                    <span className="text-[9px] font-black uppercase tracking-widest">{user.is_active ? 'Désactiver' : 'Activer'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="h-14 rounded-2xl border border-rose-100 bg-white text-rose-600 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Supprimer</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default UserManagementDrawer
