// src/pages/president/PresidentDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, CheckCircle2, TrendingUp, 
  MapPin, AlertTriangle, Activity,
  RefreshCw, Flame, ThumbsUp, Star,
  ShieldAlert, ShieldCheck, Filter, 
  School, Hospital, ChevronDown, Users
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Line, ComposedChart
} from 'recharts'
import PresidentLayout from '../../layouts/PresidentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''

// ── Components ───────────────────────────────────────────────────────────────

const StatCard = ({ label, value, trend, icon: Icon, color }: any) => (
  <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm relative overflow-hidden group hover:border-blue-400/50 transition-all duration-500">
    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[3rem] -mr-8 -mt-8 group-hover:bg-blue-50 transition-colors" />
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div className="p-4 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${color}10`, color: color }}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
            <TrendingUp size={12} /> {trend}
          </span>
        )}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</p>
      <h3 className="text-4xl font-black text-[#0A1628] tracking-tight">{value}</h3>
    </div>
  </div>
)

const CriticalAlert = ({ decl, onClick }: any) => (
  <div className="flex items-center justify-between p-5 rounded-3xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all group">
    <div className="flex items-center gap-4 min-w-0">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
          <AlertTriangle size={24} />
        </div>
        {decl.is_sensitive && (
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#1557FF] border-2 border-white flex items-center justify-center text-white">
            {decl.sensitive_type === 'school' ? <School size={10}/> : <Hospital size={10}/>}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-black text-[#0A1628] truncate">{decl.title}</h4>
          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-600 uppercase">Critique</span>
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{decl.arrondissement_name} • {decl.category}</p>
      </div>
    </div>
    <button 
      onClick={onClick}
      className="px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-[#1557FF] hover:bg-[#1557FF] hover:text-white hover:border-[#1557FF] transition-all uppercase tracking-widest"
    >
      Voir détails
    </button>
  </div>
)

const PresidentDashboard: React.FC = () => {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('fmc_user') || '{}')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [departments, setDepts] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedDept !== 'all') params.append('department_id', selectedDept)
      
      const res = await fetch(`${API}/president/dashboard?${params}`, {
        headers: { Authorization: `Bearer ${tok()}` }
      })
      const j = await res.json()
      setData(j)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selectedDept])

  useEffect(() => {
    fetch(`${API}/president/departments`, { headers: { Authorization: `Bearer ${tok()}` } })
      .then(r => r.json())
      .then(j => setDepts(j.departments || []))
      .catch(() => {})
    load()
  }, [load])

  // Process data for charts
  const trendData = (data?.trendData || []).map((d: any) => ({
    name: d.name,
    Soumis: d.reports || 0,
    Résolus: d.resolved || 0
  }))

  const perfData = (data?.byDepartment || []).map((d: any) => ({
    name: d.code,
    Total: d.total || 0,
    Résolus: d.resolved || 0,
    Satisfaits: d.highSatisfactionCount || 0
  }))

  const topCritical = (data?.crucialCases || []).slice(0, 5)
  const sensitiveCases = (data?.crucialCases || []).filter((c: any) => c.is_sensitive).slice(0, 3)
  const topVoted = (data?.topVotedDeclarations || []).slice(0, 5)

  if (loading && !data) return (
    <PresidentLayout title="Dashboard">
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-[3px] border-slate-100 border-t-[#1557FF] rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Initialisation de l'Exécutif...</p>
      </div>
    </PresidentLayout>
  )

  return (
    <PresidentLayout title="Tableau de Bord">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12">
        
        {/* Top Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black text-[#0A1628] tracking-tight mb-2">Bonjour, {user.first_name}</h1>
            <p className="text-sm font-medium text-slate-400 italic">Voici l'état actuel de la performance citoyenne et technique.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Filter className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
              <select 
                value={selectedDept} 
                onChange={(e) => setSelectedDept(e.target.value)}
                className="appearance-none bg-white border border-slate-200/60 rounded-2xl pl-16 pr-12 h-16 text-[10px] font-black uppercase tracking-widest text-[#0A1628] shadow-sm focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all cursor-pointer"
              >
                <option value="all">Tous les Départements</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name_fr || d.name}</option>)}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
            </div>
            <button 
              onClick={() => load()}
              className="w-16 h-16 bg-white border border-slate-200/60 rounded-2xl flex items-center justify-center text-slate-400 hover:text-[#1557FF] hover:border-[#1557FF]/30 transition-all shadow-sm"
            >
              <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard label="Flux Citoyen" value={data?.total || 0} trend="+5.2%" icon={FileText} color="#1557FF" />
          <StatCard label="Urgences AI" value={data?.stats?.criticalCount || 0} icon={Flame} color="#EF4444" />
          <StatCard label="Interventions" value={data?.stats?.resolvedCount || 0} trend="+12%" icon={CheckCircle2} color="#10B981" />
          <StatCard label="Approbation > 3★" value={data?.stats?.highSatisfactionCount || 0} icon={Star} color="#F59E0B" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-200/60 p-10 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-black text-[#0A1628] tracking-tight">Signalements: Soumis vs Résolus</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Analyse comparative mensuelle par département</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-100" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Soumis</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-[#1557FF]" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Résolus</span>
                </div>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} barGap={12}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#CBD5E1' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#CBD5E1' }} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', padding: '20px' }} />
                  <Bar dataKey="Soumis" fill="#F1F5F9" radius={[8, 8, 0, 0]} barSize={20} />
                  <Bar dataKey="Résolus" fill="#1557FF" radius={[8, 8, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Curve */}
          <div className="bg-white rounded-[3rem] border border-slate-200/60 p-10 shadow-sm flex flex-col">
            <h3 className="text-xl font-black text-[#0A1628] tracking-tight mb-2">Performance Citoyenne</h3>
            <p className="text-[10px] font-black text-slate-400 mb-10 uppercase tracking-widest italic">Résolus vs Satisfaction {'>'} 3★</p>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={perfData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#CBD5E1' }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                  <Line type="monotone" name="Résolus" dataKey="Résolus" stroke="#1557FF" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} />
                  <Line type="monotone" name="Satisfaits" dataKey="Satisfaits" stroke="#F59E0B" strokeWidth={4} strokeDasharray="8 8" dot={{ r: 4, strokeWidth: 2, fill: 'white' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-50 space-y-3">
               <div className="flex items-center gap-2 mb-2">
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Guide des Départements</span>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="text-[9px] font-bold text-slate-400">EP: Éclairage Public</div>
                 <div className="text-[9px] font-bold text-slate-400">VR: Voirie & Routes</div>
                 <div className="text-[9px] font-bold text-slate-400">PD: Propreté & Déchets</div>
                 <div className="text-[9px] font-bold text-slate-400">ES: Espaces Verts</div>
               </div>
            </div>
          </div>
        </div>

        {/* Bottom Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Signalements Zones Critiques */}
          <div className="lg:col-span-4 bg-white rounded-[3rem] border border-slate-200/60 p-10 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black text-[#0A1628] tracking-tight">Zones Critiques</h3>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1557FF]">
                <MapPin size={20} />
              </div>
            </div>
            <div className="space-y-6">
              {sensitiveCases.length > 0 ? sensitiveCases.map((c: any) => (
                <div key={c.id} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center gap-5 group hover:bg-white hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/president/declarations')}>
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${c.sensitive_type === 'school' ? 'bg-indigo-500' : 'bg-rose-500'}`}>
                      {c.sensitive_type === 'school' ? <School size={24}/> : <Hospital size={24}/>}
                   </div>
                   <div className="min-w-0">
                      <p className="text-[10px] font-black text-[#1557FF] uppercase tracking-widest mb-1">{c.arrondissement_name || 'Sousse'}</p>
                      <h4 className="text-sm font-black text-[#0A1628] truncate">{c.title}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{c.sensitive_type === 'school' ? 'Proximité École' : 'Proximité Hôpital'}</p>
                   </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-200 italic">
                  <ShieldCheck size={48} className="mb-4 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">Aucune alerte zone</p>
                </div>
              )}
            </div>
          </div>

          {/* Plébiscites Citoyens (Votes) */}
          <div className="lg:col-span-4 bg-white rounded-[3rem] border border-slate-200/60 p-10 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black text-[#0A1628] tracking-tight">Plébiscites Citoyens</h3>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                <ThumbsUp size={20} />
              </div>
            </div>
            <div className="space-y-8">
              {topVoted.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between group cursor-pointer" onClick={() => navigate('/president/declarations')}>
                   <div className="flex items-center gap-5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#1557FF] group-hover:text-white transition-all">
                        <Users size={20} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-[#0A1628] truncate">{d.title}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.category}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-lg font-black text-[#1557FF]">+{d.votes_count}</p>
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Votes</p>
                   </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => navigate('/president/declarations')}
              className="w-full mt-10 h-16 rounded-2xl bg-slate-50 text-[10px] font-black text-slate-400 hover:bg-[#1557FF] hover:text-white transition-all uppercase tracking-[0.2em]"
            >
              Voir tous les votes
            </button>
          </div>

          {/* Top 5 Signalements Critiques */}
          <div className="lg:col-span-4 bg-white rounded-[3rem] border border-slate-200/60 p-10 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black text-[#0A1628] tracking-tight">Top 5 Alertes Critiques</h3>
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                <ShieldAlert size={20} />
              </div>
            </div>
            <div className="space-y-4">
              {topCritical.map((d: any) => (
                <CriticalAlert key={d.id} decl={d} onClick={() => navigate('/president/declarations')} />
              ))}
            </div>
          </div>

        </div>

      </div>
    </PresidentLayout>
  )
}

export default PresidentDashboard