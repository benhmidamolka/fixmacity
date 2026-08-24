import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { 
  Users, UserPlus, Search, MoreVertical, Mail, Phone, MapPin, 
  CheckCircle2, Clock, AlertCircle, Loader2, X, Shield, 
  ShieldAlert, ShieldCheck, Edit3, Power, Trash2, ChevronRight,
  TrendingUp, Star, Plus
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

  return createPortal(
    <div className="fixed top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white dark:border-slate-800 transition-colors duration-300">
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
    </div>,
    document.body
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

const ChefAgents: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedAgentForAssign, setSelectedAgentForAssign] = useState<Agent | undefined>(undefined)

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
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Échec de la mise à jour du statut')
      }
      toast.success('Statut mis à jour')
      fetchAgents()
    } catch (err: any) {
      toast.error(err.message || 'Échec de la mise à jour du statut')
    }
  }

  const normalize = (s?: any) => s ? String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : ""

  const filtered = agents.filter(a => {
    if (!search) return true
    const q = normalize(search)
    return normalize(`${a.first_name} ${a.last_name}`).includes(q) || normalize(a.email).includes(q)
  })

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
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-lg font-black text-[#0A1628] dark:text-white">{agent.workload + agent.resolved_count}</p>
                  </div>
                  <div className="text-center border-x border-slate-200/50 dark:border-slate-700/50">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">En Cours</p>
                    <p className="text-lg font-black text-[#F59E0B]">{agent.workload}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Résolues</p>
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
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setEditingAgent(agent); setModalOpen(true) }}
                    className="flex-1 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#0A1628] dark:text-white font-black text-xs hover:border-[#1557FF] dark:hover:border-[#1557FF] hover:text-[#1557FF] transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Modifier
                  </button>
                  {agent.is_active && (
                    <button 
                      onClick={() => { setSelectedAgentForAssign(agent); setAssignModalOpen(true); }}
                      className="flex-1 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-[#1557FF] dark:text-blue-400 font-black text-xs hover:bg-[#1557FF] hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Affecter
                    </button>
                  )}
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

      {assignModalOpen && selectedAgentForAssign && (
        <AssignTaskModal 
          agent={selectedAgentForAssign}
          onClose={() => { setAssignModalOpen(false); setSelectedAgentForAssign(undefined); }}
          onSuccess={fetchAgents}
        />
      )}
    </ChefLayout>
  )
}

// ── Assign Task Modal ────────────────────────────────────────────────────────
function AssignTaskModal({
  agent, onClose, onSuccess
}: {
  agent: Agent, onClose: () => void, onSuccess: () => void
}) {
  const [declarations, setDeclarations] = useState<any[]>([])
  const [selectedDeclId, setSelectedDeclId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    const fetchDeclarations = async () => {
      try {
        const token = localStorage.getItem('fmc_token')
        const res = await fetch(`${API}/chef/declarations?limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.declarations) {
          // Filter only those that are assignee_chef or refusee_agent
          const pending = data.declarations.filter((d: any) => 
            d.status === 'assignee_chef' || d.status === 'refusee_agent'
          )
          setDeclarations(pending)
        }
      } catch (err) {
        toast.error('Erreur lors du chargement des tâches')
      } finally {
        setFetching(false)
      }
    }
    fetchDeclarations()
  }, [])

  const handleAssign = async () => {
    if (!selectedDeclId) return toast.error('Sélectionnez une tâche')
    setLoading(true)
    try {
      const token = localStorage.getItem('fmc_token')
      const res = await fetch(`${API}/chef/declarations/${selectedDeclId}/reassign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ agent_id: agent.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'affectation')

      toast.success('Mission affectée avec succès')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white dark:border-slate-800 transition-colors duration-300">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 bg-[#F8F9FD] dark:bg-slate-950/30">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-xl">
              🎯
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-400 dark:text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-2xl font-black text-[#0A1628] dark:text-white">
            Affecter une Mission
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Assigner directement une tâche à l'agent <span className="font-extrabold text-blue-600 dark:text-blue-400">{agent.first_name} {agent.last_name}</span>
          </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-5">
          {fetching ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Recherche des tâches en attente...</p>
            </div>
          ) : declarations.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <p className="text-sm font-bold">Aucune tâche en attente d'affectation.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 ml-1">
                Sélectionner une tâche ({declarations.length})
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {declarations.map((d) => {
                  const isSelected = selectedDeclId === d.id
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDeclId(d.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-[#1557FF] bg-blue-50/40 dark:bg-blue-500/10' 
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 bg-slate-50/50 dark:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                          d.status === 'refusee_agent' 
                            ? 'bg-red-100 dark:bg-red-900/20 text-red-600' 
                            : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600'
                        }`}>
                          {d.status === 'refusee_agent' ? 'Refusée par agent' : 'En attente'}
                        </span>
                        <h4 className="text-sm font-bold text-[#0A1628] dark:text-white truncate mt-1">
                          {d.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {d.category} • {d.ref_citoyen || d.ref_service}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-[#1557FF] flex-shrink-0" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm font-black text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={loading || !selectedDeclId}
              className="flex-[2] py-3.5 rounded-2xl bg-[#1557FF] text-white text-sm font-black shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Affecter Mission'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ChefAgents
