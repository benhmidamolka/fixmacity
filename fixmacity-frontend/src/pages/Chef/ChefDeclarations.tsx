import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, Filter, ChevronDown, ChevronRight, MoreHorizontal, 
  Clock, CheckCircle2, AlertCircle, PlayCircle, Loader2,
  Calendar, User, Tag, ArrowRight, LayoutGrid, List, MapPin,
  Image as ImageIcon, MoreVertical
} from 'lucide-react'
import ChefLayout from '../../layouts/ChefLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

interface Declaration {
  id: string
  title: string
  description: string
  status: string
  category: string
  created_at: string
  priority_score: number
  ref_service?: string
  ref_citoyen?: string
  citizen?: { first_name: string; last_name: string }
  agent?: { first_name: string; last_name: string }
  photo_url?: string
  location_name?: string
}

const STATUS_GROUPS = [
  { 
    id: 'todo',    
    label: 'À ASSIGNER',     
    icon: Clock,        
    color: '#F97316', 
    bg: '#FFF7ED', 
    border: '#FFEDD5',
    darkBg: 'rgba(249, 115, 22, 0.05)',
    darkBorder: 'rgba(249, 115, 22, 0.1)',
    statuses: ['en_attente', 'transmis', 'assignee_chef', 'soumis'] 
  },
  { 
    id: 'progress', 
    label: 'EN COURS',      
    icon: PlayCircle,   
    color: '#3B82F6', 
    bg: '#EFF6FF', 
    border: '#DBEAFE',
    darkBg: 'rgba(59, 130, 246, 0.05)',
    darkBorder: 'rgba(59, 130, 246, 0.1)',
    statuses: ['en_cours', 'assignee_agent'] 
  },
  { 
    id: 'done',     
    label: 'TERMINÉES',      
    icon: CheckCircle2, 
    color: '#10B981', 
    bg: '#F0FDF4', 
    border: '#DCFCE7',
    darkBg: 'rgba(16, 185, 129, 0.05)',
    darkBorder: 'rgba(16, 185, 129, 0.1)',
    statuses: ['resolue', 'cloture'] 
  },
  { 
    id: 'refused',  
    label: 'REFUSÉES',      
    icon: AlertCircle,  
    color: '#EF4444', 
    bg: '#FEF2F2', 
    border: '#FEE2E2',
    darkBg: 'rgba(239, 68, 68, 0.05)',
    darkBorder: 'rgba(239, 68, 68, 0.1)',
    statuses: ['refusee_chef', 'refusee_agent', 'refusee'] 
  },
]

const ChefDeclarations: React.FC = () => {
  const navigate = useNavigate()
  const [declarations, setDeclarations] = useState<Declaration[]>([])
  const [loading, setLoading] = useState(true)
  const [layoutMode, setLayoutMode] = useState<'LIST' | 'BOARD'>('BOARD')
  const [viewMode, setViewMode] = useState<'suivi' | 'incoming'>('suivi')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchDeclarations = async () => {
      try {
        const token = localStorage.getItem('fmc_token')
        const res = await fetch(`${API}/chef/declarations`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Erreur chargement signalements')
        const data = await res.json()
        setDeclarations(Array.isArray(data) ? data : (data.declarations || []))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDeclarations()
  }, [])

  const getPriorityInfo = (score: number) => {
    if (score >= 80) return { label: 'CRITIQUE', color: '#EF4444', bg: '#FEF2F2' }
    if (score >= 50) return { label: 'MOYENNE', color: '#F97316', bg: '#FFF7ED' }
    return { label: 'BASSE', color: '#64748B', bg: '#F8FAFC' }
  }

  const isDark = document.documentElement.classList.contains('dark')

  // Filter logic for "Suivi" vs "Incoming"
  // Incoming = only 'todo' statuses (en_attente, transmis, soumis)
  // Suivi = All statuses (ongoing management)
  const baseFiltered = viewMode === 'incoming' 
    ? declarations.filter(d => STATUS_GROUPS.find(g => g.id === 'todo')?.statuses.includes(d.status))
    : declarations

  const filtered = baseFiltered.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.ref_service && d.ref_service.toLowerCase().includes(search.toLowerCase())) ||
    (d.ref_citoyen && d.ref_citoyen.toLowerCase().includes(search.toLowerCase()))
  )

  const renderCard = (d: Declaration) => {
    const prio = getPriorityInfo(d.priority_score || 0)
    const statusGroup = STATUS_GROUPS.find(g => g.statuses.includes(d.status))
    
    return (
      <div 
        key={d.id}
        onClick={() => navigate(`/chef/declarations/${d.id}`)}
        className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md dark:hover:border-slate-700 transition-all cursor-pointer overflow-hidden group flex flex-col backdrop-blur-md"
      >
        <div className="h-40 bg-slate-100 dark:bg-slate-800 relative overflow-hidden shrink-0">
          {d.photo_url ? (
            <img src={d.photo_url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="" />
          ) : (
            <img src="https://images.unsplash.com/photo-1518005020453-6ce27d85040d?q=80&w=600" className="w-full h-full object-cover opacity-30 dark:opacity-20 grayscale" alt="" />
          )}
          <div className="absolute top-4 right-4">
            <span className="px-2.5 py-1 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-lg text-[10px] font-black tracking-tighter shadow-sm border border-white/20 dark:border-slate-700/50" style={{ color: prio.color }}>
              {prio.label}
            </span>
          </div>
        </div>
        
        <div className="p-5 flex-1 flex flex-col">
          <div className="mb-3">
            <p className="text-[10px] font-mono font-bold text-slate-300 dark:text-slate-600 tracking-wider">#{d.ref_citoyen || d.ref_service || d.id.slice(0,8)}</p>
            <h4 className="text-sm font-bold text-[#0A1628] dark:text-slate-100 leading-tight line-clamp-2 mt-1 min-h-[2.5rem]">{d.title}</h4>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[10px] font-bold mt-auto pb-4">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{d.location_name || 'Sousse Riadh'}</span>
          </div>

          <div className="pt-4 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full" style={{ background: statusGroup?.color || '#CBD5E1' }} />
               <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 capitalize">
                  {d.status.replace('_', ' ')}
               </span>
            </div>
            {d.agent && (
               <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-blue-600 dark:text-blue-400 border-2 border-white dark:border-slate-700 shadow-sm">
                  {d.agent.first_name?.[0]}{d.agent.last_name?.[0]}
               </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) return (
    <ChefLayout title="Signalements">
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#1557FF] animate-spin" />
      </div>
    </ChefLayout>
  )

  return (
    <ChefLayout title="Signalements de la Ville">
      <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
        
        {/* Connection View Toggle */}
        <div className="flex items-center gap-2 mb-2 p-1 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm w-fit backdrop-blur-md">
          <button 
            onClick={() => setViewMode('incoming')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'incoming' ? 'bg-[#F97316] text-white shadow-lg shadow-orange-100 dark:shadow-none' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            Arrivée (Incoming)
          </button>
          <button 
            onClick={() => setViewMode('suivi')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'suivi' ? 'bg-[#1557FF] text-white shadow-lg shadow-blue-100 dark:shadow-none' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            Suivi (Management)
          </button>
        </div>

        {/* Advanced Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-4">
             <div className="relative w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-300 dark:text-slate-600" />
                <input 
                  type="text" 
                  placeholder="Rechercher un signalement..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-[13px] font-semibold border-transparent dark:border-slate-700/50 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#1557FF]/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 text-[#0A1628] dark:text-slate-100"
                />
             </div>
             
             <div className="flex items-center gap-2">
                <button className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-[11px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-wider">
                  Toutes les catégories <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-[11px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-wider">
                  Tous les agents <ChevronDown className="w-3.5 h-3.5" />
                </button>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl">
                <button 
                  onClick={() => setLayoutMode('LIST')}
                  className={`p-2.5 rounded-xl transition-all ${layoutMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-[#1557FF] dark:text-blue-400 shadow-md' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  <List className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setLayoutMode('BOARD')}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all ${layoutMode === 'BOARD' ? 'bg-[#0A1628] dark:bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  <LayoutGrid className="w-4.5 h-4.5" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Board</span>
                </button>
             </div>
             <button className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-[#1557FF] dark:hover:text-blue-400 transition-all">
                <Filter className="w-5 h-5" />
             </button>
          </div>
        </div>

        {layoutMode === 'BOARD' ? (
          /* Kanban Board View */
          <div className="flex gap-8 overflow-x-auto pb-10 -mx-4 px-4 scrollbar-hide min-h-[600px]">
            {STATUS_GROUPS
              .filter(group => viewMode === 'suivi' || group.id === 'todo')
              .map(group => {
              const groupDecls = filtered.filter(d => group.statuses.includes(d.status))
              const groupBg = isDark ? group.darkBg : group.bg
              const groupBorder = isDark ? group.darkBorder : group.border
              
              return (
                <div 
                  key={group.id} 
                  className="flex-shrink-0 w-[340px] rounded-[2.5rem] p-6 flex flex-col gap-6 shadow-sm border backdrop-blur-sm"
                  style={{ background: groupBg, borderColor: groupBorder }}
                >
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                       <h3 className="font-black text-[12px] text-[#0A1628] dark:text-slate-100 tracking-widest uppercase">
                        {group.label}
                      </h3>
                      <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 shadow-sm">
                        {groupDecls.length}
                      </span>
                    </div>
                    <button className="p-1.5 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                       <MoreVertical className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-5 overflow-y-auto max-h-[calc(100vh-420px)] pr-2 custom-scrollbar">
                    {groupDecls.length > 0 ? (
                      groupDecls.map(d => renderCard(d))
                    ) : (
                      <div className="py-24 text-center">
                        <div className="w-14 h-14 bg-white/50 dark:bg-slate-800/30 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/50 dark:border-slate-700/30 shadow-inner">
                           <group.icon className="w-7 h-7 opacity-20 dark:opacity-10" style={{ color: group.color }} />
                        </div>
                        <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Aucun signalement</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* List View (Simplified) */
          <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-4 backdrop-blur-md">
             <table className="w-full text-left">
                <thead>
                   <tr>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50">Signalement</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50">Status</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50">Agent</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50">Date</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50 text-right">Action</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                   {filtered.map(d => {
                      const group = STATUS_GROUPS.find(g => g.statuses.includes(d.status))
                      return (
                        <tr 
                          key={d.id} 
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
                          onClick={() => navigate(`/chef/declarations/${d.id}`)}
                        >
                           <td className="px-8 py-6">
                              <div className="flex flex-col">
                                 <span className="text-[10px] font-black text-[#1557FF] dark:text-blue-400 mb-1 tracking-wider uppercase">#{d.ref_citoyen || d.ref_service || d.id.slice(0,8)}</span>
                                 <p className="text-[15px] font-bold text-[#0A1628] dark:text-slate-200 leading-tight">{d.title}</p>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                 <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: group?.color }} />
                                 <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">
                                    {d.status.replace('_', ' ')}
                                 </span>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              {d.agent ? (
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-[11px] font-black text-blue-600 dark:text-blue-400">
                                      {d.agent.first_name[0]}{d.agent.last_name[0]}
                                   </div>
                                   <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{d.agent.first_name} {d.agent.last_name}</span>
                                 </div>
                              ) : (
                                <span className="text-xs font-bold text-slate-200 dark:text-slate-700 italic tracking-widest">NON ASSIGNÉ</span>
                              )}
                           </td>
                           <td className="px-8 py-6">
                              <span className="text-[13px] font-bold text-slate-400 dark:text-slate-500">{new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:bg-[#1557FF] dark:group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-200 dark:group-hover:shadow-none transition-all ml-auto">
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                           </td>
                        </tr>
                      )
                   })}
                </tbody>
             </table>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.05);
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.1);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.1);
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
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

export default ChefDeclarations
