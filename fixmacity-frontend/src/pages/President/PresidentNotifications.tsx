// src/pages/president/PresidentNotifications.tsx
import React, { useState, useEffect } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import { 
  Bell, Check, CheckCheck, Trash2, Filter, AlertTriangle, 
  UserPlus, FileText, ThumbsUp, Settings, X, Search, 
  MoreHorizontal, Clock, ArrowRight, Shield, Activity,
  Zap, Info
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

const NOTIF_TYPES: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  URGENT_DECLARATION: { icon: <AlertTriangle className="w-5 h-5"/>, color: '#EF4444', bg: 'bg-rose-50', label: 'CRITIQUE' },
  NEW_DECLARATION:    { icon: <FileText className="w-5 h-5"/>,     color: '#1557FF', bg: 'bg-blue-50', label: 'SIGNALEMENT' },
  STATUS_CHANGE:      { icon: <Zap className="w-5 h-5"/>,          color: '#F59E0B', bg: 'bg-amber-50', label: 'WORKFLOW' },
  ASSIGNED_CHEF:      { icon: <UserPlus className="w-5 h-5"/>,     color: '#10B981', bg: 'bg-emerald-50', label: 'MISSION' },
  DECLARATION_REJECTED: { icon: <AlertTriangle className="w-5 h-5"/>, color: '#EF4444', bg: 'bg-rose-50', label: 'ALERTE' },
  PROPOSITION_VOTE:   { icon: <ThumbsUp className="w-5 h-5"/>,    color: '#8B5CF6', bg: 'bg-violet-50', label: 'CONSULTATION' },
  SYSTEM:             { icon: <Settings className="w-5 h-5"/>,     color: '#64748B', bg: 'bg-slate-50', label: 'SYSTÈME' },
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 60) return `IL Y A ${m}M`
  if (h < 24) return `IL Y A ${h}H`
  return `IL Y A ${d}J`
}

// ── UI Components ─────────────────────────────────────────────────────────────

const KpiCard: React.FC<{ label: string; value: number; color: string; icon: React.ReactNode; sub: string }> = ({ label, value, color, icon, sub }) => (
  <div className="group bg-white rounded-[2.5rem] p-8 border border-slate-200/60 hover:border-blue-400/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all duration-500 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-bl-[5rem] -mr-10 -mt-10 group-hover:bg-blue-50/50 transition-colors duration-500" />
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500" 
             style={{ backgroundColor: `${color}10`, color }}>
          {icon}
        </div>
        <div className="text-right">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</p>
           <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{sub}</p>
        </div>
      </div>
      <div className="text-4xl font-black text-[#0A1628] tracking-tight">{value}</div>
    </div>
  </div>
)

const PresidentNotifications: React.FC = () => {
  const [notifs, setNotifs]   = useState<any[]>([])
  const [filter, setFilter]   = useState('all')
  const [typeF,  setTypeF]    = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/notifications?limit=50`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.notifications) setNotifs(data.notifications)
        }
      } catch (_) {}
      setLoading(false)
    }
    load()
  }, [])

  const markRead = async (id: string) => {
    try {
      await fetch(`${API}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` }
      })
    } catch (_) {}
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    try {
      await fetch(`${API}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` }
      })
    } catch (_) {}
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const deleteNotif = (id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id))
    setSelected(prev => prev.filter(s => s !== id))
  }

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const deleteSelected = () => {
    setNotifs(prev => prev.filter(n => !selected.includes(n.id)))
    setSelected([])
  }

  const filtered = notifs.filter(n => {
    if (filter === 'unread' && n.is_read) return false
    if (filter === 'read'   && !n.is_read) return false
    if (typeF && n.type !== typeF) return false
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && !n.body.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    const isUrgentA = a.type === 'URGENT_DECLARATION' || a.priority === 'haute' || a.title.toLowerCase().includes('urgent');
    const isUrgentB = b.type === 'URGENT_DECLARATION' || b.priority === 'haute' || b.title.toLowerCase().includes('urgent');
    if (isUrgentA && !isUrgentB) return -1;
    if (!isUrgentA && isUrgentB) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })

  const unreadCount = notifs.filter(n => !n.is_read).length

  if (loading) return (
    <PresidentLayout title="Centre de Notifications">
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-[3px] border-slate-100 border-t-[#1557FF] rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synchronisation des flux...</p>
      </div>
    </PresidentLayout>
  )

  return (
    <PresidentLayout title="Centre de Notifications">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-black text-[#0A1628] tracking-tight mb-3">Centre d'Alerte</h1>
            <p className="text-sm font-medium text-slate-400 italic">Pilotage temps réel des événements et urgences municipales.</p>
          </div>
          <div className="flex items-center gap-4">
              <button onClick={markAllRead}
                className="h-14 px-8 rounded-2xl bg-white border border-slate-200 text-[#0A1628] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-[0.98]">
                <CheckCheck className="w-5 h-5 text-[#1557FF]"/> Tout marquer lu
              </button>
              {selected.length > 0 && (
                <button onClick={deleteSelected}
                  className="h-14 px-8 rounded-2xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-[0.98] flex items-center gap-3">
                  <Trash2 className="w-5 h-5"/> Supprimer ({selected.length})
                </button>
              )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
          <KpiCard label="Non lues" value={unreadCount} sub="FLUX ACTIF" color="#EF4444" icon={<Bell className="w-6 h-6"/>} />
          <KpiCard label="Aujourd'hui" value={notifs.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString()).length} sub="SEGMENT 24H" color="#1557FF" icon={<Activity className="w-6 h-6"/>} />
          <KpiCard label="Total Flux" value={notifs.length} sub="ARCHIVE GLOBALE" color="#10B981" icon={<Shield className="w-6 h-6"/>} />
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-[3.5rem] border border-slate-200/60 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.04)] overflow-hidden">
          
          {/* Toolbar */}
          <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/30 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex items-center gap-3 bg-white p-1.5 rounded-[1.5rem] border border-slate-200 shadow-sm self-start">
              {[
                { key: 'all',    label: `Toutes` },
                { key: 'unread', label: `Non lues` },
                { key: 'read',   label: 'Lues' },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === f.key
                      ? 'bg-slate-900 text-white shadow-xl'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#1557FF] transition-colors" />
                <input 
                  type="text"
                  placeholder="Analyser les alertes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-14 pr-6 h-14 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-[#0A1628] placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#1557FF]/30 transition-all w-72"
                />
              </div>

              <select value={typeF} onChange={e => setTypeF(e.target.value)}
                className="h-14 bg-white border border-slate-200 rounded-2xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none cursor-pointer hover:border-[#1557FF]/30 transition-all appearance-none pr-12 min-w-[200px]"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1rem' }}
              >
                <option value="">Tous les types</option>
                <option value="NEW_DECLARATION">SIGNALEMENTS</option>
                <option value="URGENT_DECLARATION">URGENCES CRITIQUES</option>
                <option value="DECLARATION_REJECTED">ANOMALIES / REFUS</option>
                <option value="STATUS_CHANGE">WORKFLOWS</option>
                <option value="PROPOSITION_VOTE">CONSULTATIONS</option>
                <option value="SYSTEM">SYSTÈME</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <div className="py-32 text-center">
                <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center mx-auto mb-8 text-slate-200 shadow-inner">
                  <Bell className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-[#0A1628] tracking-tight">Signal Néant</h3>
                <p className="text-slate-400 font-medium mt-2 italic">Aucune alerte correspondante dans ce segment.</p>
              </div>
            ) : (
              filtered.map(n => {
                const cfg = NOTIF_TYPES[n.type] || NOTIF_TYPES['SYSTEM']
                const isSelected = selected.includes(n.id)
                const isUrgent = n.type === 'URGENT_DECLARATION' || n.priority === 'haute' || n.title.toLowerCase().includes('urgent');
                
                return (
                  <div key={n.id}
                    className={`flex items-start gap-8 px-10 py-8 transition-all cursor-pointer group relative ${
                      !n.is_read ? 'bg-blue-50/30' : 'hover:bg-slate-50'
                    } ${isSelected ? 'bg-blue-50/60' : ''}`}
                    onClick={() => !n.is_read && markRead(n.id)}>
                    
                    {/* Left Accent Bar for Unread */}
                    {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1557FF] animate-pulse" />}

                    {/* Selection */}
                    <div
                      onClick={e => { e.stopPropagation(); toggleSelect(n.id) }}
                      className={`w-7 h-7 rounded-xl border-2 mt-1.5 flex-shrink-0 flex items-center justify-center cursor-pointer transition-all ${
                        isSelected ? 'border-[#1557FF] bg-[#1557FF] shadow-lg shadow-blue-500/20' : 'border-slate-200 group-hover:border-[#1557FF]/30 bg-white'
                      }`}>
                      {isSelected && <Check className="w-4 h-4 text-white font-black"/>}
                    </div>

                    {/* Category Icon */}
                    <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-100 bg-white group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
                      style={{ color: cfg.color }}>
                      {cfg.icon}
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between gap-6 mb-2">
                        <div className="flex items-center flex-wrap gap-4">
                          <h3 className={`text-lg tracking-tight leading-none ${!n.is_read ? 'font-black text-[#0A1628]' : 'font-bold text-slate-500'}`}>
                            {n.title}
                          </h3>
                          <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-current/10 ${cfg.bg}`} style={{ color: cfg.color }}>
                            {cfg.label}
                          </span>
                          {isUrgent && (
                            <span className="px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg bg-rose-500 text-white shadow-xl shadow-rose-500/20 flex items-center gap-1.5 animate-pulse">
                              <AlertTriangle className="w-3 h-3"/> CRITIQUE
                            </span>
                          )}
                          {!n.is_read && (
                            <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg">
                               <div className="w-2 h-2 rounded-full bg-[#1557FF]" />
                               <span className="text-[8px] font-black text-[#1557FF] uppercase tracking-widest">NOUVEAU</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                           <Clock className="w-3.5 h-3.5" />
                           <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{timeAgo(n.created_at)}</span>
                        </div>
                      </div>
                      <p className={`text-base leading-relaxed max-w-4xl ${!n.is_read ? 'text-slate-600 font-medium' : 'text-slate-400 italic'}`}>
                        {n.body}
                      </p>
                    </div>

                    {/* Actions Overlay */}
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 translate-x-4 group-hover:translate-x-0 pt-2">
                      {!n.is_read && (
                        <button
                          onClick={e => { e.stopPropagation(); markRead(n.id) }}
                          className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-[#1557FF] hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
                          title="Marquer comme lu">
                          <Check className="w-5 h-5"/>
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); deleteNotif(n.id) }}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all shadow-sm"
                        title="Supprimer">
                        <Trash2 className="w-5 h-5"/>
                      </button>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-slate-600 transition-all shadow-sm">
                        <ArrowRight className="w-5 h-5"/>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="px-10 py-10 bg-slate-50/50 border-t border-slate-100 flex flex-col items-center justify-center">
             <div className="flex items-center gap-3 mb-4">
                <Info className="w-4 h-4 text-slate-300" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                  Moteur de notification synchronisé avec le cadastre et les pôle opérationnels
                </p>
             </div>
             <button className="text-[10px] font-black text-[#1557FF] uppercase tracking-[0.3em] hover:underline">Charger les archives antérieures</button>
          </div>
        </div>
      </div>
    </PresidentLayout>
  )
}

export default PresidentNotifications
