// src/pages/Agent/AgentDashboard.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, CheckCircle, XCircle, AlertTriangle, MapPin,
  ChevronRight, ClipboardList, Loader2, RefreshCw,
  Zap, LayoutList, History
} from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok  = () => localStorage.getItem('fmc_token') || ''

// ─── Types ────────────────────────────────────────────────────────────────────
interface Mission {
  id: string
  title: string
  description: string
  status: 'assignee_agent' | 'en_cours' | 'resolue' | 'refusee_agent' | 'cloturee'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  address?: string
  location_name?: string
  category?: string
  created_at: string
  started_at?: string
  resolved_at?: string
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  assignee_agent: { label: 'À accepter',       color: '#6366F1', bg: '#EEF2FF', dot: 'bg-indigo-400'  },
  en_cours:       { label: 'En intervention',  color: '#F59E0B', bg: '#FFFBEB', dot: 'bg-amber-400'   },
  resolue:        { label: 'Résolue',          color: '#10B981', bg: '#ECFDF5', dot: 'bg-emerald-400' },
  refusee_agent:  { label: 'Refusée',          color: '#EF4444', bg: '#FEF2F2', dot: 'bg-red-400'     },
  cloturee:       { label: 'Clôturée',         color: '#64748B', bg: '#F8FAFC', dot: 'bg-slate-400'   },
}

const PRIORITY: Record<string, { label: string; color: string; ring: string }> = {
  low:    { label: 'Basse',   color: 'text-slate-500',  ring: 'bg-slate-100'   },
  medium: { label: 'Normale', color: 'text-blue-600',   ring: 'bg-blue-50'     },
  high:   { label: 'Haute',   color: 'text-orange-600', ring: 'bg-orange-50'   },
  urgent: { label: 'URGENT',  color: 'text-red-600',    ring: 'bg-red-50'      },
}

const relTime = (d: string) => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 60)  return `Il y a ${mins} min`
  if (mins < 1440) return `Il y a ${Math.floor(mins/60)}h`
  return `Il y a ${Math.floor(mins/1440)}j`
}

// ─── Component ────────────────────────────────────────────────────────────────
const AgentDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [refreshing, setRefreshing] = useState(false)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res  = await fetch(`${API}/agent/declarations`, { headers: { Authorization: `Bearer ${tok()}` } })
      const data = await res.json()
      const sorted = ((data.declarations || []) as Mission[]).sort((a, b) => {
        const score = { urgent: 4, high: 3, medium: 2, low: 1 }
        const sa = score[a.priority] ?? 0, sb = score[b.priority] ?? 0
        if (sa !== sb) return sb - sa
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setMissions(sorted)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const active  = missions.filter(m => ['assignee_agent', 'en_cours'].includes(m.status))
  const history = missions.filter(m => ['resolue', 'refusee_agent', 'cloturee'].includes(m.status))
  const shown   = tab === 'active' ? active : history

  const urgent  = active.filter(m => m.priority === 'urgent' || m.priority === 'high')
  const pending = active.filter(m => m.status === 'assignee_agent')
  const ongoing = active.filter(m => m.status === 'en_cours')

  return (
    <AgentLayout title="Espace Intervention">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Welcome Header ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#0A1628]">Bonjour, {JSON.parse(localStorage.getItem('fmc_user') || '{}').first_name} 👋</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">Voici vos missions assignées pour aujourd'hui.</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-4 py-2 rounded-xl shadow-sm">
            <Clock className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        {/* ── Stat strip ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'À accepter',    value: pending.length, icon: Clock,        color: 'text-indigo-600', bg: 'bg-indigo-50', gradient: 'from-indigo-500/5 to-transparent'  },
            { label: 'En cours',      value: ongoing.length, icon: Zap,          color: 'text-amber-600',  bg: 'bg-amber-50',  gradient: 'from-amber-500/5 to-transparent'   },
            { label: 'Résolues',      value: history.filter(m=>m.status==='resolue').length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-500/5 to-transparent' },
          ].map(s => (
            <div key={s.label} className={`relative overflow-hidden bg-white rounded-3xl border border-slate-100 p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300 group`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className={`w-14 h-14 rounded-2xl ${s.bg} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 duration-300`}>
                <s.icon className={`w-7 h-7 ${s.color}`} />
              </div>
              <div className="relative z-10">
                <p className="text-3xl font-black text-[#0A1628] leading-none mb-1">{s.value}</p>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Urgent banner ─── */}
        {urgent.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm font-bold text-red-700">
              {urgent.length} mission{urgent.length > 1 ? 's' : ''} haute priorité en attente d'intervention.
            </p>
          </div>
        )}

        {/* ── Tabs + refresh ─── */}
        <div className="flex items-center justify-between">
          <div className="flex bg-white border border-slate-100 rounded-xl p-1 gap-1">
            {([
              { key: 'active',  label: 'En cours',   icon: LayoutList, count: active.length  },
              { key: 'history', label: 'Historique',  icon: History,   count: history.length },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  tab === t.key
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-[#0A1628]'
                }`}>
                <t.icon className="w-4 h-4" />
                {t.label}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>{t.count}</span>
              </button>
            ))}
          </div>
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-emerald-600 transition-colors px-3 py-2 rounded-xl hover:bg-emerald-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* ── Mission list ─── */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-slate-200" />
              </div>
              <div>
                <p className="font-black text-[#0A1628]">
                  {tab === 'active' ? 'Aucune mission active' : 'Aucun historique'}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {tab === 'active' ? 'Vous serez notifié dès qu\'une tâche vous est assignée.' : 'Vos missions résolues apparaîtront ici.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {shown.map(m => {
                const s = STATUS[m.status] ?? STATUS.assignee_agent
                const p = PRIORITY[m.priority] ?? PRIORITY.medium
                const isUrgent = m.priority === 'urgent' || m.priority === 'high'

                return (
                  <div key={m.id}
                    onClick={() => navigate(`/agent/declarations/${m.id}`)}
                    className={`group flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 ${
                      m.status === 'assignee_agent' ? 'border-l-indigo-400' :
                      m.status === 'en_cours'       ? 'border-l-amber-400'  :
                      m.status === 'resolue'        ? 'border-l-emerald-400' :
                      'border-l-transparent'
                    }`}>

                    {/* Priority dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot} ${m.priority === 'urgent' ? 'animate-pulse' : ''}`} />

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-black truncate ${isUrgent && tab === 'active' ? 'text-red-600' : 'text-[#0A1628]'}`}>
                          {m.title}
                        </p>
                        {m.priority === 'urgent' && (
                          <span className="flex-shrink-0 text-[9px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                            Urgent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-bold">
                        {(m.address || m.location_name) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {m.address || m.location_name}
                          </span>
                        )}
                        {m.category && <span>{m.category}</span>}
                        <span>{relTime(m.created_at)}</span>
                      </div>
                    </div>

                    {/* Priority badge */}
                    <span className={`hidden sm:block text-[10px] font-black px-2.5 py-1 rounded-full ${p.color} ${p.ring} flex-shrink-0`}>
                      {p.label}
                    </span>

                    {/* Status */}
                    <span className="hidden md:block text-[11px] font-bold px-3 py-1 rounded-full flex-shrink-0"
                      style={{ color: s.color, background: s.bg }}>
                      {s.label}
                    </span>

                    {/* Arrow */}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AgentLayout>
  )
}

export default AgentDashboard
