import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, Filter, ChevronDown, LayoutGrid, List, MapPin, Loader2, ArrowRight, ArrowDownUp, CheckCircle2
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

const ChefDeclarations: React.FC = () => {
  const navigate = useNavigate()
  const [declarations, setDeclarations] = useState<Declaration[]>([])
  const [loading, setLoading] = useState(true)
  const [layoutMode, setLayoutMode] = useState<'LIST' | 'BOARD'>('BOARD')
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

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

  // Filter incoming only (assigned to chef from president but not yet accepted)
  const incomingDecls = declarations.filter(d => 
    ['assignee_chef', 'soumise', 'en_attente'].includes(d.status)
  )

  const filtered = incomingDecls.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.ref_service && d.ref_service.toLowerCase().includes(search.toLowerCase())) ||
    (d.ref_citoyen && d.ref_citoyen.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => {
    const timeA = new Date(a.created_at).getTime()
    const timeB = new Date(b.created_at).getTime()
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
  })

  const renderCard = (d: Declaration) => {
    const prio = getPriorityInfo(d.priority_score || 0)
    
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
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono font-bold text-slate-300 dark:text-slate-600 tracking-wider">#{d.ref_citoyen || d.ref_service || d.id.slice(0,8)}</p>
              <span className="text-[9px] font-bold text-slate-400">{new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <h4 className="text-sm font-bold text-[#0A1628] dark:text-slate-100 leading-tight line-clamp-2 mt-1 min-h-[2.5rem]">{d.title}</h4>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[10px] font-bold mt-auto pb-4">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{d.location_name || 'Sousse'}</span>
          </div>

          <div className="pt-4 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full" style={{ background: '#F97316' }} />
               <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 capitalize">
                  À ASSIGNER
               </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) return (
    <ChefLayout title="Nouvelles Déclarations">
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#1557FF] animate-spin" />
      </div>
    </ChefLayout>
  )

  return (
    <ChefLayout title="Nouvelles Déclarations">
      <div className="max-w-[1600px] mx-auto space-y-6 pb-20 p-6 md:p-8">
        
        {/* Header Title */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-2">
          <div>
            <h1 className="text-3xl font-black text-[#0A1628] dark:text-white tracking-tight">
              Nouvelles Déclarations
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Les déclarations assignées à votre département par le Président
            </p>
          </div>
        </div>

        {/* Advanced Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto flex-1">
             <div className="relative w-full sm:w-72">
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
                <button 
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-[11px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all tracking-wider"
                >
                  <ArrowDownUp className="w-3.5 h-3.5" />
                  {sortOrder === 'desc' ? 'Plus récents d\'abord' : 'Plus anciens d\'abord'}
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
                  <span className="text-[11px] font-black uppercase tracking-widest">Grille</span>
                </button>
             </div>
          </div>
        </div>

        {layoutMode === 'BOARD' ? (
          /* Grid View */
          filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map(d => renderCard(d))}
            </div>
          ) : (
            <div className="py-24 text-center bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm backdrop-blur-md">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-sm font-black text-slate-700 dark:text-slate-300">Aucune nouvelle déclaration</p>
              <p className="text-xs font-bold text-slate-400 mt-1">Vous êtes à jour dans vos assignations</p>
            </div>
          )
        ) : (
          /* List View */
          <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-4 backdrop-blur-md">
             <table className="w-full text-left">
                <thead>
                   <tr>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50">Signalement</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50">Priorité</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50">Date</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800/50 text-right">Action</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                   {filtered.length > 0 ? filtered.map(d => {
                      const prio = getPriorityInfo(d.priority_score || 0)
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
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tighter" style={{ color: prio.color, backgroundColor: prio.bg }}>
                                {prio.label}
                              </span>
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
                   }) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-slate-400 text-sm font-bold">
                          Aucune nouvelle déclaration. Vous êtes à jour.
                        </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
        )}
      </div>
    </ChefLayout>
  )
}

export default ChefDeclarations
