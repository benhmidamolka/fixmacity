// src/pages/President/PresidentDashboard.tsx
// ── Fully dynamic — all data from GET /api/president/dashboard ──────────────
import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText, CheckCircle, Clock, Star, Building2,
  TrendingUp, TrendingDown, AlertTriangle, ChevronRight,
  X, ShieldAlert, MapPin, RefreshCw, Download, Filter,
  Calendar
} from 'lucide-react'
import PresidentLayout from '../../layouts/PresidentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

// ── Dept colour map (code → colour) ─────────────────────────────────────────
const DEPT_COLORS: Record<string, string> = {
  VR: '#6366F1', EP: '#F59E0B', PD: '#14B8A6',
  EV: '#10B981', EA: '#EC4899', ST: '#3B82F6',
  BP: '#8B5CF6', SG: '#F97316'
}

const STATUS_COLOR: Record<string, string> = {
  EXCELLENT: '#10B981', BON: '#3B82F6', STABLE: '#F59E0B', CRITIQUE: '#E11D48'
}
const STATUS_BG: Record<string, string> = {
  EXCELLENT: '#F0FDF4', BON: '#EFF6FF', STABLE: '#FFFBEB', CRITIQUE: '#FFF1F2'
}

function deptStatus(perf: number): string {
  if (perf >= 90) return 'EXCELLENT'
  if (perf >= 75) return 'BON'
  if (perf >= 60) return 'STABLE'
  return 'CRITIQUE'
}

// ── Skeleton pulse ────────────────────────────────────────────────────────────
function Skel({ w = 'w-full', h = 'h-4', rounded = 'rounded-lg' }: { w?: string; h?: string; rounded?: string }) {
  return <div className={`${w} ${h} ${rounded} bg-slate-100 animate-pulse`} />
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, trend, trendVal, color = '#1557FF', sub, onClick, loading }: any) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[2.5rem] p-7 border border-white/60 shadow-xl shadow-slate-200/40
        hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500
        ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}>
      <div className="flex items-start justify-between mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, color }}>
          <Icon className="w-6 h-6" />
        </div>
        {trendVal && (
          <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-full flex items-center gap-1.5
            ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trendVal}
          </span>
        )}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">{label}</p>
      {loading
        ? <Skel h="h-10" w="w-28" rounded="rounded-xl" />
        : (
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-[#0A1628] tracking-tighter">{value}</p>
          </div>
        )
      }
      {sub && !loading && (
        <p className="text-[11px] font-bold text-slate-400 mt-2 flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-slate-300" /> {sub}
        </p>
      )}
    </div>
  )
}

// ── Bar Chart (trend data) ────────────────────────────────────────────────────
function BarChart({ data, loading }: { data: { name: string; reports: number; resolved: number }[]; loading: boolean }) {
  const [hov, setHov] = useState<number | null>(null)

  if (loading) {
    return (
      <div className="flex items-end gap-3 mt-6" style={{ height: 180 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex gap-1 items-end" style={{ height: 140 }}>
              <div className="flex-1 rounded-t-xl bg-slate-100 animate-pulse" style={{ height: `${60 + i * 12}px` }} />
              <div className="flex-1 rounded-t-xl bg-slate-50 animate-pulse" style={{ height: `${48 + i * 10}px` }} />
            </div>
            <Skel w="w-8" h="h-2" />
          </div>
        ))}
      </div>
    )
  }

  const max = Math.max(...data.map(d => d.reports), 1)

  return (
    <div className="flex items-end gap-3 mt-6" style={{ height: 180 }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 cursor-pointer relative group"
          onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
          {hov === i && (
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[#0A1628] text-white text-[10px]
              font-black px-3 py-2 rounded-xl whitespace-nowrap z-20 shadow-xl border border-white/10
              animate-in fade-in zoom-in duration-200 pointer-events-none">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>{d.reports} signalements</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-200" />
                <span className="text-blue-200">{d.resolved} résolus</span>
              </div>
            </div>
          )}
          <div className="w-full flex gap-1 items-end" style={{ height: 140 }}>
            <div className="flex-1 rounded-t-xl transition-all duration-500 group-hover:scale-x-110"
              style={{ height: `${(d.reports / max) * 140}px`, background: i === data.length - 1 ? '#1557FF' : '#E2E8F0' }} />
            <div className="flex-1 rounded-t-xl transition-all duration-500 group-hover:scale-x-110"
              style={{ height: `${(d.resolved / max) * 140}px`, background: i === data.length - 1 ? '#93C5FD' : '#F1F5F9' }} />
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{d.name}</p>
        </div>
      ))}
    </div>
  )
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function Donut({ byStatus, total, loading }: { byStatus: Record<string, number>; total: number; loading: boolean }) {
  const resolved = (byStatus.resolue || 0) + (byStatus.cloturee || 0)
  const inProgress = (byStatus.en_cours || 0) + (byStatus.assignee_agent || 0) + (byStatus.assignee_chef || 0)
  const pending = byStatus.soumise || 0
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0
  const r = 52
  const circ = 2 * Math.PI * r

  if (loading) {
    return (
      <div className="flex flex-col items-center py-4">
        <div className="w-40 h-40 rounded-full bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-3 gap-6 mt-8 w-full">
          {[...Array(3)].map((_, i) => <Skel key={i} h="h-8" rounded="rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-40 h-40">
        <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="#F1F5F9" strokeWidth="20" />
          <circle cx="80" cy="80" r={r} fill="none" stroke="#FDE68A" strokeWidth="20"
            strokeDasharray={`${circ * (inProgress / total)} ${circ}`}
            strokeDashoffset={-circ * pct / 100} />
          <circle cx="80" cy="80" r={r} fill="none" stroke="#93C5FD" strokeWidth="20"
            strokeDasharray={`${circ * pct / 100} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-black text-[#0A1628] tracking-tighter">
            {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
          </p>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Total</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-8 w-full">
        {[
          { color: '#1557FF', label: 'Résolu', val: `${pct}%` },
          { color: '#FDE68A', label: 'En cours', val: inProgress },
          { color: '#F1F5F9', label: 'Nouveau', val: pending, textColor: '#64748B' },
        ].map(({ color, label, val, textColor }) => (
          <div key={label} className="text-center group cursor-default">
            <div className="w-2 h-2 rounded-full mx-auto mb-2 transition-transform group-hover:scale-150"
              style={{ background: color }} />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-0.5">{label}</p>
            <p className="text-xs font-black" style={{ color: textColor || color }}>{val}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
type Period = '7j' | '30j' | '90j' | '6m' | '1an'
const PERIODS: { label: string; value: Period }[] = [
  { label: '7 jours', value: '7j' },
  { label: '30 jours', value: '30j' },
  { label: '3 mois', value: '90j' },
  { label: '6 mois', value: '6m' },
  { label: '1 an', value: '1an' },
]

// ── Main Dashboard ────────────────────────────────────────────────────────────
const PresidentDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState<Period>('6m')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ── API data state ──────────────────────────────────────────────────────────
  const [totalDecl, setTotalDecl]         = useState(0)
  const [byStatus, setByStatus]           = useState<Record<string, number>>({})
  const [byArrond, setByArrond]           = useState<Record<string, number>>({})
  const [byDept, setByDept]               = useState<any[]>([])
  const [trendData, setTrendData]         = useState<any[]>([])
  const [avgRating, setAvgRating]         = useState<number | null>(null)
  const [crucialCases, setCrucialCases]   = useState<any[]>([])
  const [topPropositions, setTopPropositions] = useState<any[]>([])
  const [totalUsers, setTotalUsers]       = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`${API}/president/dashboard`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      setTotalDecl(data.total_declarations || 0)
      setByStatus(data.by_status || {})
      setByArrond(data.by_arrondissement || {})
      setByDept(data.by_department || [])
      setTrendData(data.trendData || [])
      setAvgRating(data.average_rating ? parseFloat(data.average_rating) : null)
      setCrucialCases(data.crucialCases || [])
      setTopPropositions(data.moneyVotes || [])
      setTotalUsers(data.total_users || 0)
      setLastUpdated(new Date())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Derived KPIs ─────────────────────────────────────────────────────────
  const resolved   = (byStatus.resolue || 0) + (byStatus.cloturee || 0)
  const pending    = byStatus.soumise || 0
  const inProgress = (byStatus.en_cours || 0) + (byStatus.assignee_agent || 0) + (byStatus.assignee_chef || 0)
  const resRate    = totalDecl > 0 ? Math.round((resolved / totalDecl) * 100) : 0

  const maxArrond  = Math.max(...Object.values(byArrond), 1)
  const arrondEntries = Object.entries(byArrond).sort((a, b) => b[1] - a[1])

  const ARROND_COLORS = ['#1557FF', '#6366F1', '#10B981', '#F59E0B']

  const urgentCount = crucialCases.length

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExport = async (fmt: 'csv' | 'json') => {
    try {
      const res = await fetch(`${API}/president/export?format=${fmt}`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fixmacity-export-${new Date().toISOString().slice(0, 10)}.${fmt}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('[Export]', e)
    }
  }

  return (
    <PresidentLayout title="Aperçu Exécutif">

      {/* ── Top action bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Period filter */}
        <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          {PERIODS.map(p => (
            <button key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${period === p.value
                ? 'bg-[#1557FF] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:block">
              Mis à jour {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-100 text-xs font-black text-slate-500 hover:text-[#1557FF] hover:border-blue-100 shadow-sm transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <div className="flex gap-2">
            <button onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-100 text-xs font-black text-slate-500 hover:text-emerald-600 hover:border-emerald-100 shadow-sm transition-all">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={() => handleExport('json')}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-100 text-xs font-black text-slate-500 hover:text-blue-600 hover:border-blue-100 shadow-sm transition-all">
              <Download className="w-4 h-4" /> JSON
            </button>
          </div>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-rose-50/50 border border-rose-100 rounded-[2rem] p-5 mb-6 flex items-center gap-4">
          <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <p className="text-sm font-bold text-rose-700 flex-1">
            Impossible de charger les données. Vérifiez la connexion au serveur.
          </p>
          <button onClick={load} className="px-4 py-2 bg-rose-500 text-white text-xs font-black rounded-xl hover:bg-rose-600 transition-all">
            Réessayer
          </button>
        </div>
      )}

      {/* ── Urgent alert banner ─────────────────────────────────────────────── */}
      {!alertDismissed && !loading && urgentCount > 0 && (
        <div className="bg-rose-50/50 backdrop-blur-sm border border-rose-100 rounded-[2rem] p-5 mb-8 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-200">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-rose-900 uppercase tracking-tight">
              {urgentCount} cas critiques nécessitent une action immédiate
            </p>
            <p className="text-xs font-bold text-rose-600/70 mt-0.5">
              {crucialCases[0]?.title || 'Signalements en attente depuis plus de 24h'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/president/declarations')}
              className="px-5 py-2.5 bg-rose-500 text-white text-xs font-black rounded-xl hover:bg-rose-600 transition-all shadow-md shadow-rose-100">
              Traiter maintenant
            </button>
            <button onClick={() => setAlertDismissed(true)} className="p-2 text-rose-300 hover:text-rose-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ── 6 KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
        <div className="xl:col-span-2">
          <KpiCard label="Total Signalements" value={totalDecl.toLocaleString('fr-FR')}
            icon={FileText} trendVal="+12%" trend="up" color="#1557FF" loading={loading}
            onClick={() => navigate('/president/declarations')} />
        </div>
        <div className="xl:col-span-2">
          <KpiCard label="Taux de Résolution" value={`${resRate}%`}
            icon={CheckCircle} trendVal="+4.3%" trend="up" color="#10B981"
            sub={`${resolved.toLocaleString('fr-FR')} résolus`} loading={loading} />
        </div>
        <div className="xl:col-span-2">
          <KpiCard label="En Attente d'Assignation" value={pending.toLocaleString('fr-FR')}
            icon={Clock} color="#F59E0B"
            sub={`${inProgress} en cours`} loading={loading}
            onClick={() => navigate('/president/declarations')} />
        </div>
        <div className="xl:col-span-2">
          <KpiCard label="Satisfaction Citoyenne"
            value={avgRating ? `${Number(avgRating).toFixed(1)}/5` : '—'}
            icon={Star} trendVal="+0.3" trend="up" color="#F97316" loading={loading} />
        </div>
        <div className="xl:col-span-2">
          <KpiCard label="Agents & Chefs"
            value={totalUsers.toLocaleString('fr-FR')}
            icon={Building2} color="#8B5CF6" loading={loading}
            onClick={() => navigate('/president/personnel')} />
        </div>
        <div className="xl:col-span-2">
          <KpiCard label="Cas Critiques Ouverts"
            value={urgentCount}
            icon={AlertTriangle} color="#E11D48" loading={loading}
            onClick={() => navigate('/president/declarations')} />
        </div>
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Trend bar chart */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Analyse de Performance</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">Signalements soumis vs résolus (6 derniers mois)</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-[#1557FF]" /> Soumis
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-[#93C5FD]" /> Résolus
              </div>
            </div>
          </div>
          <BarChart data={trendData} loading={loading} />
        </div>

        {/* Donut */}
        <div className="bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30 flex flex-col items-center">
          <div className="w-full text-left mb-4">
            <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Répartition des Statuts</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">Distribution globale en temps réel</p>
          </div>
          <Donut byStatus={byStatus} total={totalDecl} loading={loading} />
        </div>
      </div>

      {/* ── Middle row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Arrondissements */}
        <div className="bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Focus Géographique</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">Densité par arrondissement</p>
            </div>
            <Link to="/president/declarations"
              className="p-2 rounded-xl bg-blue-50 text-[#1557FF] hover:bg-[#1557FF] hover:text-white transition-all">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="space-y-6">
            {loading
              ? [...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-2">
                    <Skel w="w-32" h="h-4" />
                    <Skel w="w-16" h="h-4" />
                  </div>
                  <Skel h="h-3" rounded="rounded-full" />
                </div>
              ))
              : arrondEntries.map(([name, count], i) => (
                <div key={name} className="group">
                  <div className="flex justify-between text-sm mb-2 font-black tracking-tight">
                    <span className="text-[#0A1628]">{name}</span>
                    <span style={{ color: ARROND_COLORS[i % 4] }}>{count} cas</span>
                  </div>
                  <div className="h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                      style={{ width: `${(count / maxArrond) * 100}%`, background: ARROND_COLORS[i % 4] }} />
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Department performance table */}
        <div className="bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Performance par Service</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">Taux de résolution par département</p>
            </div>
            <Link to="/president/services"
              className="p-2 rounded-xl bg-blue-50 text-[#1557FF] hover:bg-[#1557FF] hover:text-white transition-all">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="space-y-4">
            {loading
              ? [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skel w="w-10" h="h-10" rounded="rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skel w="w-32" h="h-3" />
                    <Skel h="h-2" rounded="rounded-full" />
                  </div>
                  <Skel w="w-16" h="h-6" rounded="rounded-lg" />
                </div>
              ))
              : byDept.slice(0, 6).map(d => {
                const perf = d.perf ?? 0
                const status = deptStatus(perf)
                const color = DEPT_COLORS[d.code] || '#6366F1'
                return (
                  <div key={d.code}
                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100 group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-lg shadow-slate-200 transition-transform group-hover:scale-110 flex-shrink-0"
                      style={{ background: color }}>
                      {d.code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[#0A1628] truncate uppercase tracking-tight">{d.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${perf}%`, background: STATUS_COLOR[status] }} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 flex-shrink-0">{perf}%</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-black" style={{ color: STATUS_COLOR[status] }}>{d.total} cas</p>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md mt-1 inline-block"
                        style={{ background: STATUS_BG[status], color: STATUS_COLOR[status] }}>
                        {status}
                      </span>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>

      {/* ── Bottom row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        {/* Crucial cases */}
        <div className="bg-rose-50/30 rounded-[2.5rem] border border-rose-100/50 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse ring-4 ring-rose-100" />
              <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Alertes Terrain</h2>
            </div>
            <Link to="/president/declarations"
              className="text-xs font-black text-rose-400 uppercase tracking-widest hover:text-rose-600 transition-colors">
              Tout voir
            </Link>
          </div>
          <div className="space-y-4">
            {loading
              ? [...Array(4)].map((_, i) => (
                <div key={i} className="bg-white border border-rose-100 p-4 rounded-3xl space-y-2">
                  <Skel w="w-3/4" h="h-4" />
                  <Skel w="w-1/2" h="h-3" />
                </div>
              ))
              : crucialCases.length === 0
                ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                    <p className="text-sm font-black text-slate-400">Aucune alerte active</p>
                  </div>
                )
                : crucialCases.map((c: any, i: number) => {
                  const hoursAgo = Math.round((Date.now() - new Date(c.created_at).getTime()) / 3600000)
                  return (
                    <div key={c.id || i}
                      className="group relative bg-white border border-rose-100 p-4 rounded-3xl hover:shadow-xl hover:shadow-rose-100 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-[#0A1628] leading-tight mb-2 uppercase tracking-tight line-clamp-2">
                            {c.title || c.description || 'Signalement critique'}
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg">
                              {c.ref_citoyen || '—'}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                              <Clock className="w-3 h-3" /> {hoursAgo}h d'attente
                            </div>
                          </div>
                        </div>
                        <Link to="/president/declarations"
                          className="w-8 h-8 rounded-xl bg-[#0A1628] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg flex-shrink-0">
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>

        {/* Arrondissement hotspots (mini map) */}
        <div className="bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Zones à Risques</h2>
            <Link to="/president/declarations"
              className="text-xs font-black text-[#1557FF] uppercase tracking-widest hover:underline">
              Voir carte
            </Link>
          </div>
          <div className="space-y-3">
            {loading
              ? [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skel w="w-10" h="h-10" rounded="rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skel w="w-36" h="h-3" />
                    <Skel w="w-20" h="h-2" />
                  </div>
                  <Skel w="w-8" h="h-6" rounded="rounded-lg" />
                </div>
              ))
              : byDept.slice(0, 5).map((dept, i) => {
                const sev = dept.perf < 60 ? '#EF4444' : dept.perf < 75 ? '#F59E0B' : '#10B981'
                const sevBg = dept.perf < 60 ? '#FEF2F2' : dept.perf < 75 ? '#FFFBEB' : '#F0FDF4'
                return (
                  <div key={dept.code}
                    className="flex items-center gap-4 p-3 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-12"
                      style={{ background: sevBg }}>
                      <MapPin className="w-5 h-5" style={{ color: sev }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[#0A1628] truncate tracking-tight">{dept.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {dept.total - dept.resolved} non résolus
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black leading-none block" style={{ color: sev }}>
                        {dept.total}
                      </span>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Cas</span>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>

        {/* Propositions + Satisfaction col */}
        <div className="flex flex-col gap-6">
          {/* Top proposition */}
          <div className="bg-[#1557FF] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden group flex-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Proposition Active</h2>
                {!loading && topPropositions[0]?.end_date && (
                  <span className="px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase">
                    {Math.max(0, Math.ceil((new Date(topPropositions[0].end_date).getTime() - Date.now()) / 86400000))} j
                  </span>
                )}
              </div>
              {loading
                ? (
                  <div className="space-y-4">
                    <div className="h-6 bg-white/20 rounded-xl animate-pulse" />
                    <div className="h-6 bg-white/20 rounded-xl animate-pulse w-3/4" />
                    <div className="h-4 bg-white/20 rounded-full animate-pulse mt-6" />
                  </div>
                )
                : topPropositions.length === 0
                  ? (
                    <p className="text-lg font-black opacity-60 leading-tight">
                      Aucune proposition active en ce moment.
                    </p>
                  )
                  : (() => {
                    const p = topPropositions[0]
                    const total = (p.votes_pour || 0) + (p.votes_contre || 0)
                    const pct = total > 0 ? Math.round((p.votes_pour / total) * 100) : 0
                    return (
                      <>
                        <p className="text-xl font-black leading-tight mb-6 tracking-tight">{p.title}</p>
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                            <span>Adhésion Citoyenne</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-4 bg-white/20 rounded-full overflow-hidden p-1">
                            <div className="h-full rounded-full bg-white shadow-lg transition-all duration-1000"
                              style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex items-center justify-between opacity-60">
                            <p className="text-[10px] font-bold">{total.toLocaleString('fr-FR')} votants</p>
                            <Link to="/president/propositions"
                              className="text-[10px] font-black uppercase tracking-widest hover:underline">
                              Détails →
                            </Link>
                          </div>
                        </div>
                      </>
                    )
                  })()
              }
            </div>
          </div>

          {/* Departments with lowest satisfaction */}
          <div className="bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30">
            <div className="flex items-center gap-2 mb-5">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Services Critiques</h2>
            </div>
            <div className="space-y-4">
              {loading
                ? [...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-rose-50/50 rounded-2xl">
                    <Skel w="w-8" h="h-8" rounded="rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skel w="w-24" h="h-3" />
                      <Skel w="w-32" h="h-2" />
                    </div>
                  </div>
                ))
                : byDept
                  .filter(d => d.perf < 75)
                  .sort((a, b) => a.perf - b.perf)
                  .slice(0, 2)
                  .map(d => (
                    <div key={d.code}
                      className="flex items-center justify-between p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50 group hover:bg-rose-50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-sm flex-shrink-0"
                          style={{ background: DEPT_COLORS[d.code] || '#6366F1' }}>
                          {d.code}
                        </div>
                        <div>
                          <p className="text-xs font-black text-rose-900 uppercase tracking-tight">{d.name}</p>
                          <p className="text-[10px] font-bold text-rose-400">{d.perf}% taux de résolution</p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                  ))
              }
              {!loading && byDept.filter(d => d.perf < 75).length === 0 && (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-black text-slate-400">Tous les services sont performants</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PresidentLayout>
  )
}

export default PresidentDashboard