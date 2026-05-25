import React, { useState, useEffect } from 'react'
import AgentLayout from '../../components/agent/AgentLayout'
import AgentDeclarationDetail from './AgentDeclarationDetail'
import {
  ListFilter, Search, Clock, CheckCircle2,
  AlertTriangle, Filter, Loader2, ArrowUpDown, MapPin
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  haute: { label: 'Haute', color: '#dc2626', bg: '#fee2e2' },
  moyenne: { label: 'Moyenne', color: '#d97706', bg: '#fef3c7' },
  faible: { label: 'Faible', color: '#059669', bg: '#dcfce7' },
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  assignee_agent: { label: 'À Accepter', color: '#1d4ed8', bg: '#dbeafe' },
  en_cours:       { label: 'En cours', color: '#c2410c', bg: '#ffedd5' },
  resolue:        { label: 'Résolue', color: '#15803d', bg: '#dcfce7' },
}

export default function AgentDashboard() {
  const [declarations, setDeclarations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDecl, setSelectedDecl] = useState<string | null>(null)

  const fetchDecls = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/agent/declarations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` }
      })
      if (!res.ok) throw new Error('Erreur de chargement')
      const data = await res.json()
      setDeclarations(data.declarations || (Array.isArray(data) ? data : []))
    } catch (e) {
      toast.error('Impossible de charger vos missions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDecls()
  }, [])

  const safeDeclarations = Array.isArray(declarations) ? declarations : (declarations.declarations || [])

  const filtered = safeDeclarations.filter((d: any) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || 
                        d.ref_citoyen?.toLowerCase().includes(search.toLowerCase()) ||
                        d.address?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || d.status === statusFilter
    // Agent should only see relevant statuses (not already closed maybe, or everything assigned to them)
    // But backend should handle this mostly.
    return matchSearch && matchStatus
  })

  // Group by status for summary
  const counts = {
    total: safeDeclarations.length,
    a_accepter: safeDeclarations.filter((d: any) => d.status === 'assignee_agent').length,
    en_cours: safeDeclarations.filter((d: any) => d.status === 'en_cours').length,
    resolue: safeDeclarations.filter((d: any) => d.status === 'resolue').length,
  }

  return (
    <AgentLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mes Missions</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Gérez vos interventions sur le terrain.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Rechercher une mission..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#1557FF] focus:ring-2 focus:ring-[#1557FF]/20 transition-all w-64 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              <ListFilter size={20} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Assignées</p>
              <p className="text-2xl font-black text-slate-800">{counts.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">À Accepter</p>
              <p className="text-2xl font-black text-slate-800">{counts.a_accepter}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">En cours</p>
              <p className="text-2xl font-black text-slate-800">{counts.en_cours}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Résolues</p>
              <p className="text-2xl font-black text-slate-800">{counts.resolue}</p>
            </div>
          </div>
        </div>

        {/* FILTERS & TABLE */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Filter size={16} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-600 mr-2">Filtrer par statut:</span>
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'assignee_agent', label: 'À Accepter' },
              { id: 'en_cours', label: 'En cours' },
              { id: 'resolue', label: 'Résolues' }
            ].map(f => (
              <button 
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === f.id ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-4 text-[#1557FF]" />
                <p className="text-sm font-bold">Chargement de vos missions...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-600">Aucune mission trouvée.</p>
                <p className="text-xs mt-1">Vous n'avez pas de tâches correspondant à ces critères.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Réf</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Détails de la mission</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priorité</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(d => {
                    const prio = PRIORITY_CFG[d.priority?.toLowerCase()] || PRIORITY_CFG.moyenne
                    const stat = STATUS_CFG[d.status] || { label: d.status, color: '#64748b', bg: '#f1f5f9' }
                    
                    return (
                      <tr 
                        key={d.id} 
                        className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                        onClick={() => setSelectedDecl(d.id)}
                      >
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                            {d.ref_citoyen || `#${d.id.slice(-4)}`}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900 group-hover:text-[#1557FF] transition-colors line-clamp-1">{d.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin size={12} className="text-slate-400" />
                            <span className="text-xs text-slate-500 truncate max-w-[250px]">{d.address || 'Non spécifiée'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                            {d.category || 'Général'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span 
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                            style={{ color: prio.color, backgroundColor: prio.bg }}
                          >
                            {prio.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span 
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                            style={{ color: stat.color, backgroundColor: stat.bg }}
                          >
                            {stat.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 group-hover:bg-[#1557FF] group-hover:text-white flex items-center justify-center transition-all inline-flex ml-auto"
                            onClick={(e) => { e.stopPropagation(); setSelectedDecl(d.id); }}
                          >
                            <ArrowUpDown size={14} className="rotate-90" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {selectedDecl && (
        <AgentDeclarationDetail 
          tacheId={selectedDecl} 
          onClose={() => setSelectedDecl(null)} 
          onAccepted={() => { setSelectedDecl(null); fetchDecls(); }} 
          onRejected={() => { setSelectedDecl(null); fetchDecls(); }} 
        />
      )}
    </AgentLayout>
  )
}