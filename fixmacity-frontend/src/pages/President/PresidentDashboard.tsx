import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Clock, Star, Building2, Search, MapPin, ThumbsUp, Zap, ChevronRight, X, ShieldAlert, Filter
} from 'lucide-react'
import PresidentLayout from '../../layouts/PresidentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

// Fallback constants just for colors and layout info
const DEPT_COLORS: Record<string, string> = {
  EP: '#f59e0b', EV: '#10b981', ST: '#3b82f6', VR: '#6366f1',
  BP: '#8b5cf6', PD: '#14b8a6', EA: '#ec4899', SG: '#f97316'
}
const DELEGATION_COLORS = ['#1557FF', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6']

const STATUS_COLOR: Record<string,string> = {
  EXCELLENT:'#10b981', BON:'#3b82f6', STABLE:'#f59e0b', CRITIQUE:'#e11d48'
}
const STATUS_BG: Record<string,string> = {
  EXCELLENT:'#f0fdf4', BON:'#eff6ff', STABLE:'#fffbeb', CRITIQUE:'#fff1f2'
}

function getPerfStatus(perf: number) {
  if (perf >= 90) return 'EXCELLENT'
  if (perf >= 75) return 'BON'
  if (perf >= 50) return 'STABLE'
  return 'CRITIQUE'
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, trend, trendVal, color='#1557FF', sub, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[2.5rem] p-7 border border-white/60 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500 ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}>
      <div className="flex items-start justify-between mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background:`${color}10`, color }}>
          <Icon className="w-6 h-6" />
        </div>
        {trendVal && (
          <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-full flex items-center gap-1.5 ${
            trend==='up'?'bg-emerald-50 text-emerald-600':'bg-rose-50 text-rose-500'
          }`}>
            {trend==='up'?<TrendingUp className="w-3 h-3"/>:<TrendingDown className="w-3 h-3"/>}
            {trendVal}
          </span>
        )}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-4xl font-black text-[#0A1628] tracking-tighter">{value}</p>
      </div>
      {sub && <p className="text-[11px] font-bold text-slate-400 mt-2 flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-slate-300"/> {sub}
      </p>}
    </div>
  )
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────
function BarChart({ data = [] }: { data: any[] }) {
  const max = Math.max(1, ...data.map(d => d.reports || 0))
  const [hov, setHov] = useState<number|null>(null)
  
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[180px] text-slate-400 text-sm font-bold">Aucune donnée</div>
  }

  return (
    <div className="flex items-end gap-3 mt-6" style={{ height:180 }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 cursor-pointer relative group"
          onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
          {hov===i && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#0A1628] text-white text-[10px] font-black px-3 py-2 rounded-xl whitespace-nowrap z-20 shadow-xl border border-white/10 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"/>
                <span>{d.reports || 0} signalements</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-300"/>
                <span className="text-blue-200">{d.resolved || 0} résolus</span>
              </div>
            </div>
          )}
          <div className="w-full flex gap-1 items-end" style={{ height:140 }}>
            <div className="flex-1 rounded-t-xl transition-all duration-500 group-hover:scale-x-110"
              style={{ height:`${((d.reports||0)/max)*140}px`, background: i===data.length-1?'#1557FF':'#E2E8F0' }} />
            <div className="flex-1 rounded-t-xl transition-all duration-500 group-hover:scale-x-110"
              style={{ height:`${((d.resolved||0)/max)*140}px`, background: i===data.length-1?'#93C5FD':'#F1F5F9' }} />
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{d.name}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Donut ────────────────────────────────────────────────────────────────────
function Donut({ resolved, total, inProgress }: { resolved:number; total:number; inProgress: number }) {
  const pctRes = total > 0 ? Math.round((resolved/total)*100) : 0
  const pctProg = total > 0 ? Math.round((inProgress/total)*100) : 0
  const pctNew = Math.max(0, 100 - pctRes - pctProg)
  const r = 52, circ = 2*Math.PI*r
  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-40 h-40">
        <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="#F1F5F9" strokeWidth="20"/>
          <circle cx="80" cy="80" r={r} fill="none" stroke="#93C5FD" strokeWidth="20"
            strokeDasharray={`${circ*(pctProg/100)} ${circ}`} strokeDashoffset={-circ*(pctRes/100)}/>
          <circle cx="80" cy="80" r={r} fill="none" stroke="#1557FF" strokeWidth="20"
            strokeDasharray={`${circ*(pctRes/100)} ${circ}`} strokeLinecap="round"/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-black text-[#0A1628] tracking-tighter">{total >= 1000 ? (total/1000).toFixed(1)+'k' : total}</p>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Total</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6 mt-8 w-full">
        {[['#1557FF','Résolu',`${pctRes}%`],['#93C5FD','En cours',`${pctProg}%`],['#F1F5F9','Nouveau',`${pctNew}%`]].map(([c,l,v])=>(
          <div key={l} className="text-center group cursor-default">
            <div className="w-2 h-2 rounded-full mx-auto mb-2 transition-transform group-hover:scale-150" style={{ background:c }}/>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-0.5">{l}</p>
            <p className="text-xs font-black" style={{ color:c === '#F1F5F9' ? '#64748B' : c }}>{v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const PresidentDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [dashData, setDashData] = useState<any>(null)
  
  // Filters
  const [period, setPeriod] = useState('all')
  const [status, setStatus] = useState('all')
  const [departmentId, setDepartmentId] = useState('all')
  const [delegationId, setDelegationId] = useState('all')

  const [departments, setDepartments] = useState<any[]>([])
  const [delegations, setDelegations] = useState<any[]>([])

  useEffect(() => {
    const fetchRefs = async () => {
      try {
        const [depRes, delRes] = await Promise.all([
          fetch(`${API}/president/departments`, { headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` } }),
          fetch(`${API}/public/delegations`)
        ])
        if (depRes.ok) {
          const depData = await depRes.json()
          setDepartments(depData.departments || depData.data || [])
        }
        if (delRes.ok) {
          const delData = await delRes.json()
          setDelegations(delData.delegations || [])
        }
      } catch (err) { console.error('Error fetching references', err) }
    }
    fetchRefs()
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams()
        if (period !== 'all') params.append('period', period)
        if (status !== 'all') params.append('status', status)
        if (departmentId !== 'all') params.append('department_id', departmentId)
        if (delegationId !== 'all') params.append('delegation_id', delegationId)

        const res = await fetch(`${API}/president/dashboard?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` }
        })
        if (res.ok) {
          const data = await res.json()
          setDashData(data)
        }
      } catch (_) {}
    }
    load()
  }, [period, status, departmentId, delegationId])

  const total = dashData?.total ?? 0
  const resolved = dashData?.byStatus?.resolue ?? 0
  const inProgress = (dashData?.byStatus?.en_cours ?? 0) + (dashData?.byStatus?.assignee_chef ?? 0) + (dashData?.byStatus?.assignee_agent ?? 0)
  const resRate = total > 0 ? Math.round((resolved/total)*100) : 0

  const urgentCases = dashData?.crucialCases || []
  const urgentCount = urgentCases.length

  const byDelegationList = useMemo(() => {
    if (!dashData?.byArrondissement) return []
    return Object.entries(dashData.byArrondissement).map(([id, val]: [string, any], i) => ({
      id,
      name: val.name,
      count: val.count,
      color: DELEGATION_COLORS[i % DELEGATION_COLORS.length]
    })).sort((a,b) => b.count - a.count)
  }, [dashData])
  const maxCountDelegation = Math.max(1, ...byDelegationList.map(d => d.count))

  const departmentList = useMemo(() => {
    if (!dashData?.byDepartment) return []
    return dashData.byDepartment.map((d: any) => {
      const perfStatus = getPerfStatus(d.perf)
      return {
        ...d,
        color: DEPT_COLORS[d.code] || '#1557FF',
        status: perfStatus
      }
    })
  }, [dashData])

  return (
    <PresidentLayout title="Aperçu Exécutif">
      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-5 h-5"/>
          <span className="text-sm font-bold uppercase tracking-widest">Filtres</span>
        </div>
        
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-sm font-bold text-[#0A1628] rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="all">Toutes périodes</option>
          <option value="7">7 derniers jours</option>
          <option value="30">30 derniers jours</option>
          <option value="90">3 derniers mois</option>
          <option value="180">6 derniers mois</option>
        </select>

        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-sm font-bold text-[#0A1628] rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="all">Tous statuts</option>
          <option value="soumise">Nouvelle</option>
          <option value="en_cours">En cours</option>
          <option value="resolue">Résolue</option>
          <option value="cloturee">Clôturée</option>
        </select>

        <select value={departmentId} onChange={e => setDepartmentId(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-sm font-bold text-[#0A1628] rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="all">Tous les services</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name_fr}</option>)}
        </select>

        <select value={delegationId} onChange={e => setDelegationId(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-sm font-bold text-[#0A1628] rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="all">Tous les arrondissements</option>
          {delegations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        
        {(period !== 'all' || status !== 'all' || departmentId !== 'all' || delegationId !== 'all') && (
          <button 
            onClick={() => {
              setPeriod('all');
              setStatus('all');
              setDepartmentId('all');
              setDelegationId('all');
            }}
            className="ml-auto text-sm font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
          >
            <X className="w-4 h-4"/> Réinitialiser
          </button>
        )}
      </div>

      {/* Urgent alert banner */}
      {!alertDismissed && urgentCount > 0 && (
        <div className="bg-rose-50/50 backdrop-blur-sm border border-rose-100 rounded-[2rem] p-5 mb-8 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-200">
            <AlertTriangle className="w-6 h-6 text-white"/>
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-rose-900 uppercase tracking-tight">
              {urgentCount} cas critiques nécessitent une action immédiate
            </p>
            <p className="text-xs font-bold text-rose-600/70 mt-0.5">Signalements bloqués ou en attente d'action.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/president/declarations')}
              className="px-5 py-2.5 bg-rose-500 text-white text-xs font-black rounded-xl hover:bg-rose-600 transition-all shadow-md shadow-rose-100">
              Traiter maintenant
            </button>
            <button onClick={()=>setAlertDismissed(true)} className="p-2 text-rose-300 hover:text-rose-500 transition-colors">
              <X className="w-5 h-5"/>
            </button>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard
          label="Total Signalements" value={total.toLocaleString()}
          icon={FileText} color="#1557FF"
          onClick={()=>navigate('/president/declarations')}/>
        <KpiCard
          label="Taux de Résolution" value={`${resRate}%`}
          icon={CheckCircle} color="#10B981"
          sub={`${resolved} résolus`}/>
        <KpiCard
          label="Utilisateurs Actifs" value={dashData?.totalUsers || 0}
          icon={Clock} color="#F59E0B"
          sub="Citoyens inscrits"/>
        <KpiCard
          label="Satisfaction Moyenne" value={`${dashData?.avgRating || 0}/5`}
          icon={Star} color="#F97316"/>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Volume chart */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Analyse de Performance</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">Comparatif signalements vs résolutions (6 mois)</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-[#1557FF]"/> Soumis
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-[#93C5FD]"/> Résolus
              </div>
            </div>
          </div>
          <BarChart data={dashData?.trendData || []} />
        </div>

        {/* Donut */}
        <div className="bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30 flex flex-col items-center">
          <div className="w-full text-left mb-6">
            <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Statuts Généraux</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">Répartition globale</p>
          </div>
          <Donut resolved={resolved} total={total} inProgress={inProgress} />
        </div>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Delegations */}
        <div className="bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Focus Géographique</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">Densité par arrondissement</p>
            </div>
            <Link to="/president/declarations" className="p-2 rounded-xl bg-blue-50 text-[#1557FF] hover:bg-[#1557FF] hover:text-white transition-all">
              <ChevronRight className="w-5 h-5"/>
            </Link>
          </div>
          <div className="space-y-6">
            {byDelegationList.length === 0 && <p className="text-slate-400 text-sm">Aucune donnée</p>}
            {byDelegationList.map(d => (
              <div key={d.id} className="group">
                <div className="flex justify-between text-sm mb-2 font-black tracking-tight">
                  <span className="text-[#0A1628]">{d.name}</span>
                  <span style={{ color:d.color }}>{d.count} cas</span>
                </div>
                <div className="h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                  <div className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{ width:`${(d.count/maxCountDelegation)*100}%`, background:d.color }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance table */}
        <div className="bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Top Départements</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">Efficacité opérationnelle</p>
            </div>
            <Link to="/president/services" className="p-2 rounded-xl bg-blue-50 text-[#1557FF] hover:bg-[#1557FF] hover:text-white transition-all">
              <ChevronRight className="w-5 h-5"/>
            </Link>
          </div>
          <div className="space-y-4">
            {departmentList.length === 0 && <p className="text-slate-400 text-sm">Aucune donnée</p>}
            {departmentList.slice(0,5).map((d: any) => (
              <div key={d.code} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-slate-200 transition-transform group-hover:scale-110" style={{ background:d.color }}>
                  {d.code}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#0A1628] truncate uppercase tracking-tight">{d.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${d.perf}%`, background:STATUS_COLOR[d.status] }}/>
                    </div>
                    <span className="text-[10px] font-black text-slate-400">{d.perf}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md mt-1 inline-block"
                    style={{ background:STATUS_BG[d.status], color:STATUS_COLOR[d.status] }}>
                    {d.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Urgent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
        {/* Urgent cases */}
        <div className="bg-rose-50/30 rounded-[2.5rem] border border-rose-100/50 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse ring-4 ring-rose-100"/>
              <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Cas Prioritaires</h2>
            </div>
          </div>
          <div className="space-y-4">
            {urgentCases.length === 0 && <p className="text-slate-400 text-sm">Aucun cas critique récent.</p>}
            {urgentCases.map((c: any) => (
              <div key={c.id} className="group relative bg-white border border-rose-100 p-4 rounded-3xl hover:shadow-xl hover:shadow-rose-100 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#0A1628] leading-tight mb-2 uppercase tracking-tight">{c.description?.substring(0,50)}...</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg">{c.ref_citoyen}</span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Clock className="w-3 h-3"/> {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Link to={`/president/declarations/${c.id}`}
                    className="w-8 h-8 rounded-xl bg-[#0A1628] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <ChevronRight className="w-5 h-5"/>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Propositions logic can be placed here, omitting the previous hardcoded block for brevity or substituting it */}
        <div className="flex flex-col gap-8">
            <div className="bg-[#1557FF] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"/>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Propositions Citoyennes</h2>
                </div>
                <p className="text-xl font-black leading-tight mb-8 tracking-tight">Accédez à l'espace de vote participatif</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between opacity-60">
                     <p className="text-[10px] font-bold">Consultez les suggestions</p>
                     <Link to="/president/propositions" className="text-[10px] font-black uppercase tracking-widest hover:underline">Détails →</Link>
                  </div>
                </div>
              </div>
            </div>
        </div>

      </div>
    </PresidentLayout>
  )
}

export default PresidentDashboard
