import React, { useEffect, useState } from 'react'
import { 
  Users, UserPlus, Search, MoreVertical, Mail, Phone, MapPin, 
  CheckCircle2, Clock, AlertCircle, Loader2, X, Shield, 
  ShieldAlert, ShieldCheck, Edit3, Power, Trash2, ChevronRight,
  TrendingUp, Star
} from 'lucide-react'
import ChefLayout from '../../layouts/ChefLayout'
import { Toaster, toast } from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

interface Agent {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  workload: number
  recent_tasks: number
  is_active: boolean
  is_overloaded: boolean
  resolved_count: number
  created_at: string
  // Calculated fields for UI
  status: 'available' | 'busy' | 'overloaded' | 'offline'
  rating?: number
}

// ── Modals ──────────────────────────────────────────────────────────────────

function AgentModal({ 
  agent, onClose, onSuccess 
}: { 
  agent?: Agent, onClose: () => void, onSuccess: () => void 
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: agent?.first_name || '',
    last_name: agent?.last_name || '',
    email: agent?.email || '',
    password: ''
  })

  const isEdit = !!agent

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem('fmc_token')
      const url = isEdit ? `${API}/chef/agents/${agent.id}` : `${API}/chef/agents`
      const method = isEdit ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'opération')

      toast.success(isEdit ? 'Profil mis à jour' : 'Agent ajouté avec succès')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white dark:border-slate-800 transition-colors duration-300">
        <div className="px-8 pt-8 pb-6 bg-[#F8F9FD] dark:bg-slate-950/30">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-xl">
              {isEdit ? '📝' : '👷'}
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-400 dark:text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-2xl font-black text-[#0A1628] dark:text-white">
            {isEdit ? 'Modifier l\'Agent' : 'Nouvel Agent'}
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            {isEdit ? 'Mettre à jour les informations du profil' : 'Ajouter un membre à votre équipe technique'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 ml-1">Prénom</label>
              <input 
                required
                type="text" 
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all dark:text-white"
                placeholder="Ex: Aymen"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 ml-1">Nom</label>
              <input 
                required
                type="text" 
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all dark:text-white"
                placeholder="Ex: Ben Ali"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 ml-1">Email Professionnel</label>
            <input 
              required
              type="email" 
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all dark:text-white"
              placeholder="agent@sousse.tn"
            />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 ml-1">Mot de Passe Temporaire</label>
              <input 
                required
                type="password" 
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all dark:text-white"
                placeholder="••••••••"
              />
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm font-black text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Annuler
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-[2] py-3.5 rounded-2xl bg-[#1557FF] text-white text-sm font-black shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? 'Enregistrer' : 'Créer le profil')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

const ChefAgents: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined)

  const fetchAgents = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('fmc_token')
      const res = await fetch(`${API}/chef/agents`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      
      if (data.agents) {
        setAgents(data.agents.map((a: any) => ({
          ...a,
          status: !a.is_active ? 'offline' : 
                  a.is_overloaded ? 'overloaded' : 
                  a.workload >= 4 ? 'busy' : 'available'
        })))
      }
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors du chargement de l\'équipe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  const toggleStatus = async (agentId: string) => {
    try {
      const token = localStorage.getItem('fmc_token')
      const res = await fetch(`${API}/chef/agents/${agentId}/toggle-status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        toast.success('Statut mis à jour')
        fetchAgents()
      }
    } catch (err) {
      toast.error('Échec de la mise à jour du statut')
    }
  }

  const filtered = agents.filter(a => 
    `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )

  const STATS = [
    { label: 'Total Équipe', value: agents.length, icon: Users, color: '#6366F1', bg: '#EEF2FF' },
    { label: 'Disponibles', value: agents.filter(a => a.status === 'available').length, icon: ShieldCheck, color: '#10B981', bg: '#F0FDF4' },
    { label: 'En Mission', value: agents.filter(a => a.status === 'busy' || a.status === 'overloaded').length, icon: Clock, color: '#F59E0B', bg: '#FFFBEB' },
  ]

  return (
    <ChefLayout title="Gestion de l'Équipe">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Quick Stats Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STATS.map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-900/40 rounded-[2rem] border border-white dark:border-slate-800/50 shadow-xl shadow-slate-100/50 dark:shadow-black/20 p-6 flex items-center gap-5 group hover:translate-y-[-4px] transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-colors" style={{ backgroundColor: s.bg, color: s.color }}>
                <s.icon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">{s.label}</p>
                <p className="text-3xl font-black text-[#0A1628] dark:text-white leading-none">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md p-4 rounded-[2rem] border border-white dark:border-slate-800/50 shadow-sm transition-all duration-300">
          <div className="relative w-full lg:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-600" />
            <input 
              type="text" 
              placeholder="Rechercher par nom ou email..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all shadow-sm dark:text-white dark:placeholder-slate-500"
            />
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-sm rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
              <TrendingUp className="w-4 h-4" /> Performance
            </button>
            <button 
              onClick={() => { setEditingAgent(undefined); setModalOpen(true) }}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-3.5 bg-[#1557FF] text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <UserPlus className="w-4 h-4" /> Ajouter un Agent
            </button>
          </div>
        </div>

        {/* Agents Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Synchronisation de l'équipe...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map(agent => (
              <div key={agent.id} className={`relative bg-white dark:bg-slate-900/40 rounded-[2.5rem] border-2 transition-all p-8 group transition-all duration-300 ${agent.is_active ? 'border-white dark:border-slate-800/50 shadow-xl shadow-slate-100/50 dark:shadow-black/20' : 'border-slate-100 dark:border-slate-800 opacity-75 grayscale bg-slate-50 dark:bg-slate-900/20'}`}>
                {/* Status Dot */}
                <div className="absolute top-8 right-8 flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    agent.status === 'available' ? 'bg-green-500 shadow-[0_0_10px_#10B981]' : 
                    agent.status === 'busy' ? 'bg-blue-500 shadow-[0_0_10px_#1557FF]' : 
                    agent.status === 'overloaded' ? 'bg-red-500 animate-pulse shadow-[0_0_10px_#EF4444]' : 
                    'bg-slate-300 dark:bg-slate-700'
                  }`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {agent.status === 'available' ? 'Disponible' : 
                     agent.status === 'busy' ? 'En mission' : 
                     agent.status === 'overloaded' ? 'Surchargé' : 'Inactif'}
                  </span>
                </div>

                {/* Avatar & Name */}
                <div className="flex flex-col items-center text-center mb-8">
                  <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl font-black mb-4 transition-all shadow-inner ${
                    agent.is_active 
                      ? 'bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 text-slate-700 dark:text-white' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                  }`}>
                    {agent.first_name[0]}{agent.last_name[0]}
                  </div>
                  <h3 className="text-xl font-black text-[#0A1628] dark:text-white leading-tight group-hover:text-[#1557FF] transition-colors">
                    {agent.first_name} {agent.last_name}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold text-xs mt-1.5 bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800/50 shadow-sm">
                    <Mail className="w-3 h-3" /> {agent.email}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 p-5 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100/50 dark:border-slate-800/50 mb-8 shadow-inner">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Actives</p>
                    <p className="text-lg font-black text-[#0A1628] dark:text-white">{agent.workload}</p>
                  </div>
                  <div className="text-center border-x border-slate-200/50 dark:border-slate-700/50">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Historique</p>
                    <p className={`text-lg font-black ${agent.is_overloaded ? 'text-red-500' : 'text-[#F59E0B]'}`}>{agent.recent_tasks}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Résolus</p>
                    <p className="text-lg font-black text-[#10B981]">{agent.resolved_count}</p>
                  </div>
                </div>

                {/* Workload Indicator */}
                <div className="mb-8">
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Charge de travail actuelle</p>
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                      agent.is_overloaded ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500' : 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-500'
                    }`}>
                      {agent.is_overloaded ? 'Élevée' : 'Normale'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => { setEditingAgent(agent); setModalOpen(true) }}
                    className="flex-1 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#0A1628] dark:text-white font-black text-xs hover:border-[#1557FF] dark:hover:border-[#1557FF] hover:text-[#1557FF] transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Modifier
                  </button>
                  <button 
                    onClick={() => toggleStatus(agent.id)}
                    className={`p-3.5 rounded-2xl border transition-all shadow-sm ${
                      agent.is_active 
                        ? 'border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                        : 'border-green-100 dark:border-green-900/30 text-green-500 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                    title={agent.is_active ? 'Désactiver' : 'Activer'}
                  >
                    <Power className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <AgentModal 
          agent={editingAgent} 
          onClose={() => setModalOpen(false)} 
          onSuccess={fetchAgents} 
        />
      )}
    </ChefLayout>
  )
}

export default ChefAgents
