import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Clock, Star, Building2, Search, MapPin, ThumbsUp, Zap, ChevronRight, X, ShieldAlert
} from 'lucide-react'
import PresidentLayout from '../../layouts/PresidentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

const DEPARTMENTS = [
  { name:'Éclairage public', code:'EP', color:'#f59e0b', total:87,  resolved:80,  agents:5,  unsatisfied:3,  urgent:4,  onTime:92, status:'EXCELLENT' },
  { name:'Espaces Verts',    code:'EV', color:'#10b981', total:56,  resolved:53,  agents:4,  unsatisfied:2,  urgent:2,  onTime:95, status:'EXCELLENT' },
  { name:'Signalisation',    code:'ST', color:'#3b82f6', total:45,  resolved:40,  agents:3,  unsatisfied:4,  urgent:3,  onTime:88, status:'BON'       },
  { name:'Voirie',           code:'VR', color:'#6366f1', total:124, resolved:96,  agents:8,  unsatisfied:12, urgent:11, onTime:78, status:'BON'       },
  { name:'Administratif',    code:'BP', color:'#8b5cf6', total:34,  resolved:28,  agents:3,  unsatisfied:5,  urgent:2,  onTime:85, status:'BON'       },
  { name:'Propreté',         code:'PD', color:'#14b8a6', total:203, resolved:152, agents:12, unsatisfied:28, urgent:16, onTime:74, status:'STABLE'    },
  { name:'Réseaux',          code:'EA', color:'#ec4899', total:98,  resolved:68,  agents:7,  unsatisfied:21, urgent:14, onTime:69, status:'CRITIQUE'  },
  { name:'Suggestions',      code:'SG', color:'#f97316', total:28,  resolved:18,  agents:2,  unsatisfied:6,  urgent:1,  onTime:64, status:'CRITIQUE'  },
]

const CRITICAL_LOCATIONS = [
  { name:'Avenue Habib Bourguiba', count:23, dept:'Voirie',   severity:'high'   },
  { name:'Cité Ettaamir',          count:19, dept:'Propreté', severity:'high'   },
  { name:'Rue Ibn Khaldoun',       count:16, dept:'Réseaux',  severity:'medium' },
  { name:'Zone Industrielle Nord', count:14, dept:'Propreté', severity:'medium' },
  { name:'Médina — Vieille Ville', count:11, dept:'Voirie',   severity:'low'    },
]

const URGENT_CASES = [
  { id:'1', title:'Affaissement chaussée dangereux', dept:'Voirie',    votes:47, ref:'SV-0234', address:'Av. Bourguiba',     hours:2  },
  { id:'2', title:'Fuite d\'eau massive',            dept:'Réseaux',   votes:38, ref:'SV-0198', address:'Rue Ibn Khaldoun',  hours:5  },
  { id:'3', title:'Lampadaire tombé sur trottoir',  dept:'Éclairage public', votes:31, ref:'SJ-0156', address:'Cité Ettaamir',     hours:8  },
  { id:'4', title:'Déchets toxiques déversés',      dept:'Propreté',  votes:29, ref:'SA-0089', address:'Zone Industrielle', hours:12 },
]

const LATEST_PROPOSITION = {
  title:'Modernisation de l\'Éclairage Public',
  pour:89, contre:11, votes:2100, closes_in:2,
}

const MONTHLY = [
  { m:'Jan', s:120, r:98  }, { m:'Fév', s:145, r:130 }, { m:'Mar', s:168, r:151 },
  { m:'Avr', s:189, r:170 }, { m:'Mai', s:210, r:192 }, { m:'Jun', s:280, r:251 },
  { m:'Jul', s:240, r:218 },
]

const DELEGATIONS = [
  { name:'Sousse Riadh',  count:452, color:'#1557FF' },
  { name:'Sousse Nord',   count:318, color:'#6366f1' },
  { name:'Sousse Sud',    count:204, color:'#10b981' },
  { name:'Sousse Médina', count:185, color:'#f59e0b' },
]

const STATUS_COLOR: Record<string,string> = {
  EXCELLENT:'#10b981', BON:'#3b82f6', STABLE:'#f59e0b', CRITIQUE:'#e11d48'
}
const STATUS_BG: Record<string,string> = {
  EXCELLENT:'#f0fdf4', BON:'#eff6ff', STABLE:'#fffbeb', CRITIQUE:'#fff1f2'
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
function BarChart() {
  const max = Math.max(...MONTHLY.map(d => d.s))
  const [hov, setHov] = useState<number|null>(null)
  return (
    <div className="flex items-end gap-3 mt-6" style={{ height:180 }}>
      {MONTHLY.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 cursor-pointer relative group"
          onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
          {hov===i && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#0A1628] text-white text-[10px] font-black px-3 py-2 rounded-xl whitespace-nowrap z-20 shadow-xl border border-white/10 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"/>
                <span>{d.s} signalements</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-300"/>
                <span className="text-blue-200">{d.r} résolus</span>
              </div>
            </div>
          )}
          <div className="w-full flex gap-1 items-end" style={{ height:140 }}>
            <div className="flex-1 rounded-t-xl transition-all duration-500 group-hover:scale-x-110"
              style={{ height:`${(d.s/max)*140}px`, background: i===5?'#1557FF':'#E2E8F0' }} />
            <div className="flex-1 rounded-t-xl transition-all duration-500 group-hover:scale-x-110"
              style={{ height:`${(d.r/max)*140}px`, background: i===5?'#93C5FD':'#F1F5F9' }} />
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{d.m}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Donut ────────────────────────────────────────────────────────────────────
function Donut({ resolved, total }: { resolved:number; total:number }) {
  const pct  = Math.round((resolved/total)*100)
  const r    = 52, circ = 2*Math.PI*r
  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-40 h-40">
        <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="#F1F5F9" strokeWidth="20"/>
          <circle cx="80" cy="80" r={r} fill="none" stroke="#93C5FD" strokeWidth="20"
            strokeDasharray={`${circ*0.25} ${circ}`} strokeDashoffset={-circ*pct/100}/>
          <circle cx="80" cy="80" r={r} fill="none" stroke="#1557FF" strokeWidth="20"
            strokeDasharray={`${circ*pct/100} ${circ}`} strokeLinecap="round"/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-black text-[#0A1628] tracking-tighter">{(total/1000).toFixed(1)}k</p>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Total</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6 mt-8 w-full">
        {[['#1557FF','Résolu',`${pct}%`],['#93C5FD','En cours','25%'],['#F1F5F9','Nouveau','10%']].map(([c,l,v])=>(
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

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/president/dashboard`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` }
        })
        if (res.ok) setDashData(await res.json())
      } catch (_) {}
    }
    load()
  }, [])

  const total       = dashData?.total_declarations       ?? DEPARTMENTS.reduce((a,d)=>a+d.total,0)
  const resolved    = dashData?.resolved                 ?? DEPARTMENTS.reduce((a,d)=>a+d.resolved,0)
  const unsatisfied = dashData?.unsatisfied              ?? DEPARTMENTS.reduce((a,d)=>a+d.unsatisfied,0)
  const urgentCount = dashData?.urgent_count             ?? URGENT_CASES.length
  const resRate     = Math.round((resolved/total)*100)

  const maxCount  = Math.max(...DELEGATIONS.map(d=>d.count))

  return (
    <PresidentLayout title="Aperçu Exécutif">
      {/* Urgent alert banner */}
      {!alertDismissed && (
        <div className="bg-rose-50/50 backdrop-blur-sm border border-rose-100 rounded-[2rem] p-5 mb-8 flex items-center gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-200">
            <AlertTriangle className="w-6 h-6 text-white"/>
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-rose-900 uppercase tracking-tight">
              {urgentCount} cas critiques nécessitent une action immédiate
            </p>
            <p className="text-xs font-bold text-rose-600/70 mt-0.5">Fuite d'eau massive, affaissement chaussée et plus...</p>
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
          icon={FileText} trendVal="+12%" trend="up" color="#1557FF"
          onClick={()=>navigate('/president/declarations')}/>
        <KpiCard
          label="Taux de Résolution" value={`${resRate}%`}
          icon={CheckCircle} trendVal="+4.3%" trend="up" color="#10B981"
          sub={`${resolved} résolus`}/>
        <KpiCard
          label="Délai Moyen" value="18.5h"
          icon={Clock} trendVal="-2.3h" trend="up" color="#F59E0B"
          sub="vs 20.8h mois dernier"/>
        <KpiCard
          label="Satisfaction Citoyenne" value="4.2/5"
          icon={Star} trendVal="+0.3" trend="up" color="#F97316"
          sub={`${unsatisfied} insatisfaits`}/>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Volume chart */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Analyse de Performance</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">Comparatif signalements vs résolutions</p>
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
          <BarChart />
        </div>

        {/* Donut */}
        <div className="bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30 flex flex-col items-center">
          <div className="w-full text-left mb-6">
            <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Statuts Généraux</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">Répartition globale</p>
          </div>
          <Donut resolved={resolved} total={total}/>
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
            {DELEGATIONS.map(d => (
              <div key={d.name} className="group">
                <div className="flex justify-between text-sm mb-2 font-black tracking-tight">
                  <span className="text-[#0A1628]">{d.name}</span>
                  <span style={{ color:d.color }}>{d.count} cas</span>
                </div>
                <div className="h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                  <div className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{ width:`${(d.count/maxCount)*100}%`, background:d.color }}/>
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
            {DEPARTMENTS.slice(0,5).map(d => (
              <div key={d.code} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-slate-200 transition-transform group-hover:scale-110" style={{ background:d.color }}>
                  {d.code}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#0A1628] truncate uppercase tracking-tight">{d.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${Math.round(d.resolved/d.total*100)}%`, background:STATUS_COLOR[d.status] }}/>
                    </div>
                    <span className="text-[10px] font-black text-slate-400">{Math.round(d.resolved/d.total*100)}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black" style={{ color:STATUS_COLOR[d.status] }}>{d.onTime}% OK</p>
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

      {/* Bottom row: Urgent + Priority + Proposition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        {/* Urgent cases */}
        <div className="bg-rose-50/30 rounded-[2.5rem] border border-rose-100/50 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse ring-4 ring-rose-100"/>
              <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Alertes Terrain</h2>
            </div>
          </div>
          <div className="space-y-4">
            {URGENT_CASES.map(c => (
              <div key={c.id} className="group relative bg-white border border-rose-100 p-4 rounded-3xl hover:shadow-xl hover:shadow-rose-100 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#0A1628] leading-tight mb-2 uppercase tracking-tight">{c.title}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg">{c.ref}</span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Clock className="w-3 h-3"/> {c.hours}h d'attente
                      </div>
                    </div>
                  </div>
                  <Link to="/president/declarations"
                    className="w-8 h-8 rounded-xl bg-[#0A1628] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                    <ChevronRight className="w-5 h-5"/>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical locations */}
        <div className="bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Zones à Risques</h2>
            <Link to="/president/carte" className="text-xs font-black text-[#1557FF] uppercase tracking-widest hover:underline">Voir Carte</Link>
          </div>
          <div className="space-y-2">
            {CRITICAL_LOCATIONS.map((loc, i) => {
              const sev = loc.severity === 'high' ? '#EF4444' : loc.severity === 'medium' ? '#F59E0B' : '#10B981'
              const sevBg = loc.severity === 'high' ? '#FEF2F2' : loc.severity === 'medium' ? '#FFFBEB' : '#F0FDF4'
              return (
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-12" style={{ background:sevBg }}>
                    <MapPin className="w-5 h-5" style={{ color:sev }}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#0A1628] truncate tracking-tight">{loc.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{loc.dept}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black leading-none block" style={{ color:sev }}>{loc.count}</span>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Signalements</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Proposition + Unsatisfied */}
        <div className="flex flex-col gap-8">
          {/* Latest proposition */}
          <div className="bg-[#1557FF] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"/>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Prochaine Décision</h2>
                <span className="px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase">J-{LATEST_PROPOSITION.closes_in}</span>
              </div>
              <p className="text-xl font-black leading-tight mb-8 tracking-tight">{LATEST_PROPOSITION.title}</p>
              
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                  <span>Adhésion Citoyenne</span>
                  <span>{LATEST_PROPOSITION.pour}%</span>
                </div>
                <div className="h-4 bg-white/20 rounded-full overflow-hidden p-1">
                  <div className="h-full rounded-full bg-white shadow-lg transition-all duration-1000"
                    style={{ width:`${LATEST_PROPOSITION.pour}%` }}/>
                </div>
                <div className="flex items-center justify-between opacity-60">
                   <p className="text-[10px] font-bold">{LATEST_PROPOSITION.votes.toLocaleString()} votants</p>
                   <Link to="/president/propositions" className="text-[10px] font-black uppercase tracking-widest hover:underline">Détails →</Link>
                </div>
              </div>
            </div>
          </div>

          {/* Unsatisfied depts */}
          <div className="bg-white rounded-[2.5rem] border border-white/60 p-8 shadow-xl shadow-slate-200/30 flex-1">
            <div className="flex items-center gap-2 mb-6">
               <ShieldAlert className="w-5 h-5 text-rose-500" />
               <h2 className="text-lg font-black text-[#0A1628] tracking-tight">Alertes Satisfaction</h2>
            </div>
            <div className="space-y-4">
              {DEPARTMENTS.filter(d=>d.unsatisfied>10).sort((a,b)=>b.unsatisfied-a.unsatisfied).slice(0,2).map(d => (
                <div key={d.code} className="flex items-center justify-between p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50 group hover:bg-rose-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-sm" style={{ background:d.color }}>
                      {d.code}
                    </div>
                    <div>
                      <p className="text-xs font-black text-rose-900 uppercase tracking-tight">{d.name}</p>
                      <p className="text-[10px] font-bold text-rose-400">{d.unsatisfied} retours négatifs</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
                    <Star className="w-4 h-4 fill-current"/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PresidentLayout>
  )
}

export default PresidentDashboard
