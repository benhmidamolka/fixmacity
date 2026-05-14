// src/pages/Agent/AgentStats.tsx
import React, { useEffect, useState } from 'react'
import { BarChart2, CheckCircle, Clock, Star, AlertTriangle, TrendingUp, Target, Zap } from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token') || ''

interface Stats {
  total: number
  resolues: number
  en_cours: number
  assignee: number
  refusees: number
  avgDaysToResolve: number | null
}

const AgentStats: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('fmc_user') || '{}')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [declarations, setDeclarations] = useState<any[]>([])

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const res = await fetch(`${API}/agent/declarations?limit=200`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      const decls: any[] = data.declarations || []
      setDeclarations(decls)

      const resolues = decls.filter(d => ['resolue', 'cloturee'].includes(d.status))
      const avgMs = resolues.length > 0
        ? resolues.reduce((sum, d) => {
            if (!d.resolved_at || !d.created_at) return sum
            return sum + (new Date(d.resolved_at).getTime() - new Date(d.created_at).getTime())
          }, 0) / resolues.length
        : null
      const avgDays = avgMs ? Math.round(avgMs / (1000 * 60 * 60 * 24) * 10) / 10 : null

      setStats({
        total: decls.length,
        resolues: resolues.length,
        en_cours: decls.filter(d => d.status === 'en_cours').length,
        assignee: decls.filter(d => d.status === 'assignee_agent').length,
        refusees: decls.filter(d => d.status === 'refusee_agent').length,
        avgDaysToResolve: avgDays,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const resolutionRate = stats && stats.total > 0
    ? Math.round((stats.resolues / stats.total) * 100)
    : 0

  const CARDS = stats ? [
    { label: 'Missions résolues',   value: stats.resolues.toString(),         icon: CheckCircle, color: '#10B981', bg: '#F0FDF4', sub: `sur ${stats.total} total` },
    { label: 'Délai moyen',         value: stats.avgDaysToResolve ? `${stats.avgDaysToResolve}j` : '—', icon: Clock, color: '#6366F1', bg: '#EEF2FF', sub: 'de soumission à résolution' },
    { label: 'Taux de résolution',  value: `${resolutionRate}%`,              icon: TrendingUp,  color: '#F59E0B', bg: '#FFFBEB', sub: 'des missions traitées' },
    { label: 'En attente',          value: stats.assignee.toString(),          icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2', sub: 'missions à accepter' },
  ] : []

  const PERF = [
    { label: 'Résolution',    value: resolutionRate },
    { label: 'En cours',      value: stats ? Math.min(100, Math.round((stats.en_cours / Math.max(stats.total, 1)) * 100)) : 0 },
    { label: 'Réactivité',   value: stats?.avgDaysToResolve ? Math.max(0, 100 - stats.avgDaysToResolve * 10) : 100 },
  ]

  // Last 5 resolved
  const recent = declarations
    .filter(d => ['resolue', 'cloturee'].includes(d.status))
    .sort((a, b) => new Date(b.resolved_at || b.created_at).getTime() - new Date(a.resolved_at || a.created_at).getTime())
    .slice(0, 5)

  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'

  return (
    <AgentLayout title="Mes Statistiques">
      <div className="space-y-8 pb-8">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-[#0A1628] to-[#1e3a5f] rounded-[2.5rem] p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -translate-y-20 translate-x-20" />
          <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-500/10 rounded-full translate-y-16" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-2">Tableau de performance</p>
              <h2 className="text-3xl font-black text-white">{user.first_name} {user.last_name}</h2>
              <p className="text-slate-400 text-sm font-medium mt-1">Agent terrain — Municipalité de Sousse</p>
            </div>
            <div className="hidden md:flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm">
              <span className="text-3xl font-black text-white">{resolutionRate}%</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Résolu</span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-[2rem] p-6 border border-slate-100 animate-pulse">
                <div className="h-8 w-8 rounded-xl bg-slate-100 mb-4" />
                <div className="h-7 w-16 bg-slate-100 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-50 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {CARDS.map(c => (
              <div key={c.label} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4" style={{ background: c.bg }}>
                  <c.icon className="w-5 h-5" style={{ color: c.color }} />
                </div>
                <p className="text-2xl font-black text-[#0A1628]">{c.value}</p>
                <p className="text-sm font-bold text-slate-500 mt-1">{c.label}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance bars */}
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="font-black text-[#0A1628]">Indicateurs</h3>
            </div>
            {PERF.map(p => (
              <div key={p.label}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-slate-600">{p.label}</span>
                  <span className="text-sm font-black text-[#0A1628]">{p.value}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${p.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Recent resolved */}
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-black text-[#0A1628]">Dernières résolutions</h3>
            </div>
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-300">
                <CheckCircle className="w-10 h-10 mb-2" />
                <p className="text-sm font-medium">Aucune résolution encore</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#0A1628] truncate">{d.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{d.category}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] font-black text-emerald-600">{fmt(d.resolved_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status breakdown */}
        {stats && (
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <h3 className="font-black text-[#0A1628] mb-6 flex items-center gap-3">
              <BarChart2 className="w-5 h-5 text-slate-400" />
              Répartition par statut
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total',       value: stats.total,    color: '#64748B', bg: '#F8FAFC' },
                { label: 'À accepter',  value: stats.assignee, color: '#6366F1', bg: '#EEF2FF' },
                { label: 'En cours',    value: stats.en_cours, color: '#F59E0B', bg: '#FFFBEB' },
                { label: 'Résolues',    value: stats.resolues, color: '#10B981', bg: '#F0FDF4' },
                { label: 'Refusées',    value: stats.refusees, color: '#EF4444', bg: '#FEF2F2' },
              ].map(s => (
                <div key={s.label} className="text-center p-4 rounded-2xl border" style={{ borderColor: s.bg, background: s.bg }}>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AgentLayout>
  )
}

export default AgentStats
