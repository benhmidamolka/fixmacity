// src/pages/Agent/AgentDeclarations.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, ChevronRight, MapPin, Loader2,
  RefreshCw, ClipboardList, Filter
} from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok  = () => localStorage.getItem('fmc_token') || ''

interface Mission {
  id: string
  title: string
  description: string
  status: string
  priority: string
  address?: string
  location_name?: string
  category?: string
  created_at: string
  ref_citoyen?: string
}

import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../constants/declarations'

const relTime = (d: string) => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 60)  return `Il y a ${mins} min`
  if (mins < 1440) return `Il y a ${Math.floor(mins / 60)}h`
  return `Il y a ${Math.floor(mins / 1440)}j`
}

const AgentDeclarations: React.FC = () => {
  const navigate = useNavigate()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch]     = useState('')
  const [statusF, setStatusF]   = useState('all')
  const [priorityF, setPriorityF] = useState('all')

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res  = await fetch(`${API}/agent/declarations`, {
        headers: { Authorization: `Bearer ${tok()}` }
      })
      const data = await res.json()
      const sorted = ((data.declarations || []) as Mission[]).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setMissions(sorted)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = missions.filter(m => {
    if (statusF !== 'all' && m.status !== statusF) return false
    if (priorityF !== 'all' && m.priority !== priorityF) return false
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) &&
        !(m.ref_citoyen || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <AgentLayout title="Toutes mes missions">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#0A1628]">Mes Missions</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">
              {missions.length} mission{missions.length > 1 ? 's' : ''} au total
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-emerald-600 transition-colors px-3 py-2 rounded-xl hover:bg-emerald-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3 items-center shadow-sm">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une mission..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 transition-colors placeholder:text-slate-400"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusF}
              onChange={e => setStatusF(e.target.value)}
              className="text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <select
            value={priorityF}
            onChange={e => setPriorityF(e.target.value)}
            className="text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400 cursor-pointer"
          >
            <option value="all">Toutes les priorités</option>
            <option value="urgent">URGENT</option>
            <option value="high">Haute</option>
            <option value="haute">Haute</option>
            <option value="medium">Normale</option>
            <option value="moyenne">Normale</option>
            <option value="low">Basse</option>
            <option value="basse">Basse</option>
          </select>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-slate-200" />
              </div>
              <div>
                <p className="font-black text-[#0A1628]">Aucune mission trouvée</p>
                <p className="text-sm text-slate-400 mt-1">Modifiez vos filtres ou actualisez.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[1fr_120px_100px_120px_40px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div>Mission</div>
                <div>Statut</div>
                <div>Priorité</div>
                <div>Date</div>
                <div />
              </div>

              <div className="divide-y divide-slate-50">
                {filtered.map(m => {
                  const s = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.assignee_agent
                  const p = PRIORITY_CONFIG[m.priority] ?? { label: m.priority, color: '#64748B' }

                  return (
                    <div
                      key={m.id}
                      onClick={() => navigate(`/agent/declarations/${m.id}`)}
                      className="group grid grid-cols-1 md:grid-cols-[1fr_120px_100px_120px_40px] gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors items-center border-l-4"
                      style={{ borderLeftColor: s.dot }}
                    >
                      {/* Title + location */}
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#0A1628] truncate">{m.title}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-bold mt-0.5">
                          {(m.address || m.location_name) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {m.address || m.location_name}
                            </span>
                          )}
                          {m.category && <span>{m.category}</span>}
                          <span className="font-mono text-[10px] text-slate-300">{m.ref_citoyen}</span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        className="inline-block text-[10px] font-black px-2.5 py-1 rounded-full w-fit"
                        style={{ color: s.color, background: s.bg }}
                      >
                        {s.label}
                      </span>

                      {/* Priority */}
                      <span
                        className="hidden md:inline-block text-[10px] font-black"
                        style={{ color: p.color }}
                      >
                        {p.label}
                      </span>

                      {/* Date */}
                      <span className="hidden md:block text-[11px] font-bold text-slate-400">
                        {relTime(m.created_at)}
                      </span>

                      {/* Arrow */}
                      <ChevronRight className="hidden md:block w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </AgentLayout>
  )
}

export default AgentDeclarations
