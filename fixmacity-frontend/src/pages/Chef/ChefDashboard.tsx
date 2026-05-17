// src/pages/Chef/ChefDashboard.tsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle, XCircle, User, Clock, MapPin, ThumbsUp,
  AlertTriangle, Send, ChevronRight, X, MessageSquare,
  ArrowRight, Loader, Users, RefreshCw, BarChart3, ShieldCheck
} from 'lucide-react'
import ChefLayout from '../../layouts/ChefLayout'
import { Toaster, toast } from 'react-hot-toast'
import DeclarationCommentsPanel from '../../components/president/DeclarationCommentsPanel'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

// ── Types ────────────────────────────────────────────────────────────────────
interface Decl {
  id: string
  ref_citoyen: string
  ref_service: string | null
  title: string
  category: string
  priority: string
  delegation: string
  votes: number
  submitted: string
  image?: string | null
}

interface Agent {
  id: string
  name: string
  initials: string
  color: string
  active_tasks: number
  max_tasks: number
  status: 'available' | 'busy' | 'overloaded' | 'offline'
  last_active: string
  resolved_total: number
  rating: number
  is_active?: boolean
}

const PRI: Record<string, { label: string; color: string; bg: string }> = {
  haute:   { label: 'Urgente', color: '#EF4444', bg: '#FEF2F2' },
  moyenne: { label: 'Moyenne', color: '#F59E0B', bg: '#FFFBEB' },
  basse:   { label: 'Normale', color: '#10B981', bg: '#F0FDF4' },
}

const AGENT_STATUS = {
  available:  { label: 'Disponible', color: '#10B981', dot: 'bg-green-500' },
  busy:       { label: 'En mission', color: '#1557FF', dot: 'bg-blue-500' },
  overloaded: { label: 'Surchargé',  color: '#EF4444', dot: 'bg-red-500 animate-pulse' },
  offline:    { label: 'Hors ligne', color: '#94A3B8', dot: 'bg-slate-300' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'à l\'instant'
  if (m < 60) return `il y a ${m} min`
  if (h < 24) return `il y a ${h}h`
  return `il y a ${d}j`
}

// ── Modals ──────────────────────────────────────────────────────────────────

function AssignAgentModal({
  decl, agents, onClose, onAssigned
}: {
  decl: Decl; agents: Agent[]; onClose: () => void; onAssigned: (declId: string, agentId: string) => void
}) {
  const [selected, setSelected] = useState<string>('')
  const [showWarning, setShowWarning] = useState(false)
  const [loading, setLoading] = useState(false)

  const selectedAgent = agents.find(a => a.id === selected)

  const handleChoose = (agentId: string) => {
    setSelected(agentId)
    const agent = agents.find(a => a.id === agentId)
    if (agent && agent.active_tasks >= agent.max_tasks) {
      setShowWarning(true)
    } else {
      setShowWarning(false)
    }
  }

  const doAssign = async () => {
    if (!selected) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/chef/declarations/${decl.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ agent_id: selected })
      })
      if (!res.ok) throw new Error('Erreur lors de l\'assignation')
      toast.success('Mission assignée avec succès')
      onAssigned(decl.id, selected)
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white dark:border-slate-800 transition-colors duration-300">
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-black text-[#0A1628] dark:text-white">Assigner une Mission</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest font-black">Agent Technique</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100/50 dark:border-purple-800/30 flex gap-4 shadow-sm">
             <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-xl shadow-sm shrink-0 overflow-hidden">
               {decl.image ? <img src={decl.image} className="w-full h-full object-cover" /> : '🏗️'}
             </div>
             <div className="min-w-0">
               <p className="text-xs font-black text-[#0A1628] dark:text-white truncate">{decl.title}</p>
               <p className="text-[10px] font-bold text-purple-500 dark:text-purple-400 uppercase tracking-widest mt-1">{decl.ref_citoyen}</p>
             </div>
          </div>
        </div>

        {showWarning && selectedAgent && (
          <div className="mx-8 mt-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase tracking-widest">Alerte Surcharge</p>
              <p className="text-[11px] text-red-600 dark:text-red-400 font-bold mt-1 leading-relaxed">
                {selectedAgent.name} a déjà {selectedAgent.active_tasks} tâches. 
                Forcer l'assignation ?
              </p>
            </div>
          </div>
        )}

        <div className="px-8 py-6 space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
          {agents.filter(a => a.status !== 'offline').map(agent => {
            const isSel = selected === agent.id
            const st = AGENT_STATUS[agent.status]
            return (
              <button 
                key={agent.id} 
                onClick={() => handleChoose(agent.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  isSel 
                    ? 'border-[#1557FF] bg-blue-50/30 dark:bg-blue-500/10' 
                    : 'border-slate-50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm" style={{ background: agent.color }}>
                    {agent.initials}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${st.dot}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate text-[#0A1628] dark:text-white">{agent.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: st.color }}>{st.label}</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">• {agent.active_tasks} tâches</span>
                  </div>
                </div>
                {isSel && <CheckCircle className="w-5 h-5 text-[#1557FF]" />}
              </button>
            )
          })}
        </div>

        <div className="px-8 pb-8 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-slate-100 text-sm font-black text-slate-500 hover:bg-slate-50 transition-all">
            Annuler
          </button>
          <button 
            onClick={doAssign}
            disabled={!selected || loading}
            className={`flex-[2] py-3.5 rounded-2xl text-white text-sm font-black shadow-lg transition-all flex items-center justify-center gap-2 ${
              showWarning ? 'bg-red-500 hover:bg-red-600 shadow-red-100' : 'bg-[#1557FF] hover:bg-blue-600 shadow-blue-100'
            }`}
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Confirmer l\'Assignation'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RefuseModal({ decl, onClose, onRefused }: { decl: Decl; onClose: () => void; onRefused: (id: string) => void }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const REASONS = [
    'Hors périmètre technique',
    'Informations insuffisantes',
    'Doublon détecté',
    'Matériel non disponible',
    'Autre'
  ]

  const doRefuse = async () => {
    if (!reason.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/chef/declarations/${decl.id}/refuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ reason })
      })
      if (!res.ok) throw new Error('Erreur lors du refus')
      toast.success('Signalement retourné au Président')
      onRefused(decl.id)
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white dark:border-slate-800 transition-colors duration-300">
        <div className="px-8 pt-8 pb-4 bg-red-50/50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20">
           <h2 className="text-xl font-black text-red-600 dark:text-red-500">Refuser la Mission</h2>
           <p className="text-xs text-red-500 dark:text-red-400/60 font-bold uppercase tracking-widest mt-1">Retour au cabinet présidentiel</p>
        </div>
        <div className="p-8 space-y-4">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Motif du refus</p>
          <div className="grid grid-cols-1 gap-2">
            {REASONS.map(r => (
              <button 
                key={r} 
                onClick={() => setReason(r)}
                className={`text-left px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                  reason === r 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                    : 'border-slate-50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea 
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30 min-h-[100px] resize-none transition-all dark:text-white"
            placeholder="Détails complémentaires..."
          />
        </div>
        <div className="px-8 pb-8 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm font-black text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Annuler
          </button>
          <button 
            onClick={doRefuse}
            disabled={!reason.trim() || loading}
            className="flex-1 py-3.5 rounded-2xl bg-red-600 text-white text-sm font-black shadow-lg shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-50"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmer le Refus'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

const ChefDashboard: React.FC = () => {
  const [decls, setDecls] = useState<Decl[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<Decl | null>(null)
  const [refusing, setRefusing] = useState<Decl | null>(null)
  const [chatDecl, setChatDecl] = useState<Decl | null>(null)
  const [search, setSearch] = useState('')
  const [filterPri, setFilterPri] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  const user = JSON.parse(localStorage.getItem('fmc_user') || '{}')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [dRes, aRes] = await Promise.all([
        fetch(`${API}/chef/declarations?status=assignee_chef`, { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${API}/chef/agents`, { headers: { Authorization: `Bearer ${token()}` } })
      ])

      if (dRes.ok) {
        const dData = await dRes.json()
        setDecls(dData.declarations || [])
      }
      if (aRes.ok) {
        const aData = await aRes.json()
        setAgents(aData.agents.map((a: any, i: number) => ({
          id: a.id,
          name: `${a.first_name} ${a.last_name}`,
          initials: `${a.first_name[0]}${a.last_name[0]}`,
          color: ['#1557FF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#0891B2'][i % 6],
          active_tasks: a.workload || 0,
          max_tasks: 7,
          status: !a.is_active ? 'offline' : (a.workload >= 7 ? 'overloaded' : (a.workload >= 4 ? 'busy' : 'available')),
          last_active: 'À l\'instant',
          resolved_total: a.resolved_count || 0,
          rating: a.avg_rating || 4.5,
          is_active: a.is_active
        })))
      }
    } catch (err) {
      toast.error('Erreur lors de la synchronisation')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filteredDecls = decls
    .filter(d => {
      const s = search.toLowerCase()
      const matchSearch = 
        d.title.toLowerCase().includes(s) || 
        d.ref_citoyen.toLowerCase().includes(s) ||
        d.category.toLowerCase().includes(s) ||
        d.delegation.toLowerCase().includes(s)
      const matchPri = filterPri === 'all' || d.priority === filterPri
      return matchSearch && matchPri
    })
    .sort((a, b) => {
      // Always put HIGH priority first regardless of date
      if (a.priority === 'haute' && b.priority !== 'haute') return -1
      if (a.priority !== 'haute' && b.priority === 'haute') return 1
      
      // Then sort by date
      const dateA = new Date(a.submitted).getTime()
      const dateB = new Date(b.submitted).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

  const onAssigned = (id: string) => setDecls(prev => prev.filter(d => d.id !== id))
  const onRefused = (id: string) => setDecls(prev => prev.filter(d => d.id !== id))

  return (
    <ChefLayout title="Mes Affectations">
      <Toaster position="top-right" />
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* ── Main Operations (Left 3/4) ── */}
        <div className="xl:col-span-3 space-y-8">
          
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900/40 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800/50 shadow-sm flex items-center gap-5 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-[#1557FF] flex items-center justify-center text-2xl shadow-inner">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Agents Actifs</p>
                <p className="text-3xl font-black text-[#0A1628] dark:text-white leading-none">{agents.filter(a => a.is_active).length}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900/40 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800/50 shadow-sm flex items-center gap-5 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center text-2xl shadow-inner">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">En Attente</p>
                <p className="text-3xl font-black text-[#0A1628] dark:text-white leading-none">{decls.length}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900/40 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800/50 shadow-sm flex items-center gap-5 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center text-2xl shadow-inner">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Missions du jour</p>
                <p className="text-3xl font-black text-[#0A1628] dark:text-white leading-none">12</p>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white dark:bg-slate-900/40 rounded-[2rem] p-4 border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-wrap items-center gap-4 transition-all duration-300">
            <div className="flex-1 min-w-[200px] relative">
              <input 
                type="text" 
                placeholder="Rechercher un signalement..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 shadow-sm transition-all dark:text-white dark:placeholder-slate-500"
              />
              <RefreshCw className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </div>
            
            <select 
              value={filterPri}
              onChange={e => setFilterPri(e.target.value)}
              className="px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none cursor-pointer shadow-sm transition-all dark:text-white"
            >
              <option value="all">Toutes Priorités</option>
              <option value="haute">Crucial / Haute</option>
              <option value="moyenne">Moyenne</option>
              <option value="basse">Normale</option>
            </select>

            <select 
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as any)}
              className="px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none cursor-pointer shadow-sm transition-all dark:text-white"
            >
              <option value="newest">Plus récent</option>
              <option value="oldest">Plus ancien</option>
            </select>

            <button onClick={fetchData} className="p-3 rounded-2xl bg-[#1557FF] text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Declarations List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-black text-[#0A1628] dark:text-white flex items-center gap-2 uppercase tracking-tight">
                Affectations Présidentielles
                <span className="text-[10px] font-black px-3 py-1 bg-[#1557FF] text-white rounded-full shadow-sm">{filteredDecls.length}</span>
              </h2>
            </div>

            {filteredDecls.length === 0 ? (
              <div className="bg-white dark:bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 p-20 text-center transition-colors">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-xl font-black text-[#0A1628] dark:text-white">File d'attente vide</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 font-medium">Toutes les missions du Président ont été traitées.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredDecls.map(d => {
                  const pri = PRI[d.priority] || PRI['moyenne']
                  return (
                    <div key={d.id} className="bg-white dark:bg-slate-900/40 rounded-[2rem] border border-slate-200 dark:border-slate-800/50 shadow-sm overflow-hidden group hover:shadow-xl dark:hover:bg-slate-900/60 transition-all duration-300">
                      <div className="p-6 flex gap-6">
                        <div className="w-24 h-24 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 overflow-hidden shrink-0 shadow-inner">
                          {d.image ? (
                            <img src={d.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">🏢</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{d.ref_citoyen}</span>
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm" style={{ background: pri.bg, color: pri.color }}>
                                {pri.label}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{timeAgo(d.submitted)}</span>
                          </div>
                          <h3 className="text-lg font-black text-[#0A1628] dark:text-white leading-tight mb-2 truncate group-hover:text-[#1557FF] transition-colors">{d.title}</h3>
                          <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-300 dark:text-slate-600" /> {d.delegation}</span>
                            <span className="flex items-center gap-1.5"><ThumbsUp className="w-4 h-4 text-slate-300 dark:text-slate-600" /> {d.votes} votes</span>
                          </div>
                        </div>
                      </div>
                      <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/50 flex items-center gap-3">
                        <button 
                          onClick={() => setChatDecl(d)}
                          className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs hover:border-[#1557FF] dark:hover:border-[#1557FF] hover:text-[#1557FF] transition-all flex items-center gap-2 shadow-sm"
                        >
                          <MessageSquare className="w-4 h-4" /> Discussions
                        </button>
                        <div className="flex-1" />
                        <button 
                          onClick={() => setRefusing(d)}
                          className="px-5 py-2.5 rounded-xl border border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 font-black text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        >
                          Renvoyer
                        </button>
                        <button 
                          onClick={() => setAssigning(d)}
                          className="px-6 py-2.5 rounded-xl bg-[#1557FF] text-white font-black text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center gap-2 active:scale-95"
                        >
                          Accepter & Assigner
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar: Team Workload (Right 1/4) ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-black text-[#0A1628] dark:text-white uppercase tracking-tight">État de l'Équipe</h2>
            <Link to="/chef/agents" className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[#1557FF] hover:scale-110 transition-all shadow-sm">
              <Users className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {agents.map(agent => {
              const st = AGENT_STATUS[agent.status]
              const workloadPct = (agent.active_tasks / 7) * 100
              return (
                <div key={agent.id} className="bg-white dark:bg-slate-900/40 rounded-[2rem] border border-slate-200 dark:border-slate-800/50 shadow-sm p-5 group hover:translate-x-1 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md" style={{ background: agent.color }}>
                        {agent.initials}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${st.dot}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black truncate text-[#0A1628] dark:text-white">{agent.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: st.color }}>{st.label}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                      <span>Charge de travail</span>
                      <span className={agent.active_tasks >= 7 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}>{agent.active_tasks}/7</span>
                    </div>
                    <div className="h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 shadow-sm ${
                          agent.active_tasks >= 7 ? 'bg-red-500' : agent.active_tasks >= 4 ? 'bg-[#1557FF]' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(workloadPct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-[#0A1628] dark:bg-slate-900 rounded-[2rem] p-6 text-white overflow-hidden relative shadow-xl shadow-blue-500/5 border border-white/5">
            <BarChart3 className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 dark:text-white/5" />
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">Performance Hebdo</h4>
            <p className="text-3xl font-black mb-4">98%</p>
            <div className="flex items-center gap-2 text-[10px] font-black text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full w-fit border border-green-400/20">
              <TrendingUp className="w-3 h-3" /> +12% cette semaine
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {assigning && (
        <AssignAgentModal 
          decl={assigning} 
          agents={agents} 
          onClose={() => setAssigning(null)} 
          onAssigned={onAssigned} 
        />
      )}
      {refusing && (
        <RefuseModal 
          decl={refusing} 
          onClose={() => setRefusing(null)} 
          onRefused={onRefused} 
        />
      )}

      {/* Slide-over Discussion Panel */}
      {chatDecl && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md" onClick={() => setChatDecl(null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-100 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-[#F8F9FD] dark:bg-slate-950/30">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-2xl">💬</div>
                <button onClick={() => setChatDecl(null)} className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-400 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <h2 className="text-2xl font-black text-[#0A1628] dark:text-white">Discussions Internes</h2>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 font-medium">{chatDecl.title}</p>
            </div>
            <div className="flex-1 overflow-hidden p-8 dark:bg-slate-900/50">
              <DeclarationCommentsPanel 
                declarationId={chatDecl.id}
                visibleChannels={['president_chef', 'chef_agent']}
                writableChannels={['president_chef', 'chef_agent']}
                role="chef"
                currentUserId={user.id}
              />
            </div>
          </div>
        </div>
      )}
    </ChefLayout>
  )
}

function TrendingUp(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

export default ChefDashboard
