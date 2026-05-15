// src/pages/president/PresidentServices.tsx
import React, { useState, useEffect } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import { 
  Plus, MoreVertical, X, Users, FileText, TrendingUp, 
  AlertTriangle, ArrowRight, Activity, Zap, CheckCircle2, 
  LayoutGrid, List, BarChart3, Clock, ArrowUpRight,
  Shield, Target, Award, Briefcase, Calendar
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

const DEPT_ICONS: Record<string, string> = {
  VR: '🛣️', EP: '💡', PD: '🗑️', EV: '🌿',
  EA: '💧', ST: '🚦', BP: '🏛️', SG: '💡'
}

const DEPT_COLORS: Record<string, string> = {
  VR: '#1557FF', EP: '#F59E0B', PD: '#10B981',
  EV: '#22C55E', EA: '#6366F1', ST: '#F97316',
  BP: '#8B5CF6', SG: '#EC4899'
}

interface Dept {
  id: string; name_fr: string; code: string; is_active: boolean
  chef: string; total: number; in_progress: number; resolved: number
  agents: number; rate: number; overloaded?: boolean
}

// ── UI Components ─────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, color, icon: Icon, trend }: any) => (
  <div className="group bg-white rounded-[2.5rem] p-8 border border-slate-200/60 hover:border-blue-400/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all duration-500 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-bl-[5rem] -mr-10 -mt-10 group-hover:bg-blue-50/50 transition-colors duration-500" />
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div className={`p-4 rounded-2xl ${color.bg} ${color.text} shadow-sm group-hover:scale-110 transition-transform duration-500`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
            <TrendingUp className="w-3 h-3" /> {trend}
          </span>
        )}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</p>
      <h3 className="text-4xl font-black text-[#0A1628] tracking-tight">{value}</h3>
      <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{sub}</p>
    </div>
  </div>
)

const ServiceDonut: React.FC<{ rate: number; color: string }> = ({ rate, color }) => {
  const data = [
    { name: 'Résolu', value: rate },
    { name: 'Restant', value: 100 - rate }
  ]
  
  return (
    <div className="w-20 h-20 relative group-hover:scale-110 transition-transform duration-500">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={28}
            outerRadius={36}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
            startAngle={90}
            endAngle={-270}
          >
            <Cell fill={color} />
            <Cell fill="#f1f5f9" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[12px] font-black text-[#0A1628] leading-none">{rate}%</span>
      </div>
    </div>
  )
}

const DetailModal: React.FC<{ dept: Dept; onClose: () => void }> = ({ dept, onClose }) => {
  const color = DEPT_COLORS[dept.code] || '#1557FF'
  const [decls, setDecls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDecls = async () => {
      try {
        const res = await fetch(`${API}/president/declarations?department_id=${dept.id}&limit=5`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          setDecls(data.declarations || [])
        }
      } catch (e) {
        console.error('Error loading depts decls', e)
      } finally {
        setLoading(false)
      }
    }
    fetchDecls()
  }, [dept.id])

  const statusConfig: Record<string, any> = {
    'soumise': { label: 'SOUMISE', color: 'text-slate-400', bg: 'bg-slate-50' },
    'assignee': { label: 'ASSIGNÉE', color: 'text-amber-500', bg: 'bg-amber-50' },
    'en_cours': { label: 'EN COURS', color: 'text-blue-500', bg: 'bg-blue-50' },
    'resolue': { label: 'RÉSOLUE', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    'cloturee': { label: 'CLÔTURÉE', color: 'text-emerald-700', bg: 'bg-emerald-100' }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0A1628]/80 backdrop-blur-xl transition-opacity duration-500" onClick={onClose} />
      
      <div className="relative bg-white rounded-[3.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Sidebar Info */}
          <div className="lg:w-80 bg-slate-50/50 p-12 border-r border-slate-100 flex flex-col items-center text-center">
            <div 
              className="w-32 h-32 rounded-[3rem] flex items-center justify-center text-5xl font-black mb-8 shadow-2xl ring-[12px] ring-white transition-transform hover:rotate-3"
              style={{ backgroundColor: `${color}10`, color }}
            >
              {DEPT_ICONS[dept.code] || '🏢'}
            </div>
            <h2 className="text-2xl font-black text-[#0A1628] leading-tight mb-2">{dept.name_fr}</h2>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1557FF] bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full mb-8">
              Pôle {dept.code}
            </span>
            
            <div className="w-full space-y-3">
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col items-center">
                <Users className="w-6 h-6 text-slate-400 mb-3" />
                <p className="text-xl font-black text-[#0A1628]">{dept.agents}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Experts Déployés</p>
              </div>
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col items-center">
                <Target className="w-6 h-6 text-[#1557FF] mb-3" />
                <p className="text-xl font-black text-[#0A1628]">{dept.rate}%</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Performance Pôle</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-12 flex flex-col overflow-hidden">
            <div className="flex justify-between items-start mb-12">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1557FF] mb-2">Suivi Opérationnel Segmenté</h3>
                <p className="text-sm text-slate-400 font-medium italic">Analyse des flux et charges de travail en temps réel.</p>
              </div>
              <button onClick={onClose} className="p-4 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-12">
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-900/20">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-bl-full -mr-16 -mt-16 blur-2xl" />
                <div className="relative">
                   <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                     <Activity className="w-3 h-3" /> Charge Active
                   </p>
                   <p className="text-4xl font-black text-white tracking-tight mb-4">{dept.in_progress}</p>
                   <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-white rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${(dept.in_progress / (dept.total || 1)) * 100}%` }} />
                   </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 group hover:bg-white hover:shadow-xl transition-all">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                   <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Missions Résolues
                 </p>
                 <p className="text-4xl font-black text-[#0A1628] tracking-tight mb-4">{dept.resolved}</p>
                 <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Segment accompli</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dernières interventions</h4>
                <div className="h-px flex-1 bg-slate-100 mx-6" />
                <button className="text-[9px] font-black text-[#1557FF] uppercase tracking-widest hover:underline">Vue Globale</button>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-blue-500/20 border-t-[#1557FF] rounded-full animate-spin" /></div>
              ) : decls.length === 0 ? (
                <p className="text-sm text-slate-300 italic text-center py-12 font-medium">Aucun historique récent pour ce pôle.</p>
              ) : decls.map((d, i) => {
                const cfg = statusConfig[d.status] || { label: d.status.toUpperCase(), color: 'text-slate-400', bg: 'bg-slate-50' }
                return (
                  <div key={i} className="flex items-center gap-6 p-6 rounded-3xl bg-slate-50 border border-slate-50 hover:bg-white hover:border-blue-100 hover:shadow-xl transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-lg border border-slate-100 group-hover:scale-110 transition-transform">
                      {DEPT_ICONS[dept.code] || '🏢'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-black text-[#0A1628] truncate tracking-tight mb-1 group-hover:text-[#1557FF] transition-colors">{d.title}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(d.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-100 shadow-sm ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-100 flex gap-4">
              <button className="flex-1 h-14 rounded-2xl bg-[#1557FF] text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                Modifier Configuration <Award className="w-4 h-4" />
              </button>
              <button className="h-14 px-8 rounded-2xl border border-slate-200 text-[#0A1628] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
                Responsable <Shield className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const PresidentServices: React.FC = () => {
  const [depts, setDepts] = useState<Dept[]>([])
  const [selected, setSelected] = useState<Dept | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/president/departments`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          const list = Array.isArray(data) ? data : (data.departments || [])
          setDepts(list.map((d: any) => ({
            id: d.id,
            name_fr: d.name || d.name_fr,
            code: d.code,
            is_active: d.is_active !== undefined ? d.is_active : true,
            chef: d.chef_name || d.chef || 'Non assigné',
            total: d.total || 0,
            in_progress: d.in_progress || Math.round((d.total || 0) * 0.3),
            resolved: d.resolved || 0,
            agents: d.agents_count || d.agents || 0,
            rate: d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0,
            overloaded: (d.in_progress || 0) > 100
          })))
        }
      } catch (e) {
        console.error('Failed to load departments', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const overloaded = depts.filter(d => d.overloaded).length
  const avgRate = depts.length > 0 ? Math.round(depts.reduce((a, d) => a + d.rate, 0) / depts.length) : 0

  if (loading) return (
    <PresidentLayout title="Services Municipaux">
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-[3px] border-slate-100 border-t-[#1557FF] rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synchronisation des pôles...</p>
      </div>
    </PresidentLayout>
  )

  return (
    <PresidentLayout title="Services Municipaux">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Content */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-black text-[#0A1628] tracking-tight mb-3">Pôles Opérationnels</h1>
            <p className="text-sm font-medium text-slate-400 italic">Pilotage stratégique et monitoring des pôles techniques de la ville.</p>
          </div>
          <button className="h-14 px-10 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-[#1557FF] transition-all active:scale-[0.98] flex items-center gap-3">
            <Plus className="w-4 h-4" />
            Nouveau Pôle
          </button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          <KpiCard label="Unités Actives" value={depts.length} sub="Pôles en fonction" color={{ bg: 'bg-blue-50', text: 'text-blue-600' }} icon={LayoutGrid} />
          <KpiCard label="Effectif Total" value={depts.reduce((a,d)=>a+d.agents, 0)} sub="Spécialistes déployés" color={{ bg: 'bg-violet-50', text: 'text-violet-600' }} icon={Users} trend="+4.2%" />
          <KpiCard label="Performance" value={`${avgRate}%`} sub="Taux de réussite avg" color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }} icon={Activity} trend="+5.4%" />
          <KpiCard label="Alertes Surcharge" value={overloaded} sub="Interventions critiques" color={{ bg: overloaded > 0 ? 'bg-rose-50' : 'bg-slate-50', text: overloaded > 0 ? 'text-rose-600' : 'text-slate-400' }} icon={AlertTriangle} />
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
          {depts.map(dept => {
            const color = DEPT_COLORS[dept.code] || '#1557FF'
            return (
              <div 
                key={dept.id}
                onClick={() => setSelected(dept)}
                className="group bg-white rounded-[3.5rem] border border-slate-200/60 p-10 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] hover:border-[#1557FF]/30 transition-all duration-500 cursor-pointer relative overflow-hidden"
              >
                {/* Surcharge Badge */}
                {dept.overloaded && (
                  <div className="absolute top-10 right-10">
                    <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/30 animate-pulse">
                      <Zap className="w-3 h-3 fill-current" /> Surcharge
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-6 mb-10">
                  <div 
                    className="w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500"
                    style={{ backgroundColor: `${color}10`, color }}
                  >
                    {DEPT_ICONS[dept.code] || '🏢'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#0A1628] tracking-tight group-hover:text-[#1557FF] transition-colors leading-none mb-2">{dept.name_fr}</h3>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border border-slate-100 bg-slate-50 text-slate-400">{dept.code}</span>
                       <span className="text-[10px] font-black uppercase tracking-widest text-[#1557FF]">{dept.agents} Experts</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 mb-10">
                   <div className="shrink-0">
                     <ServiceDonut rate={dept.rate} color={dept.overloaded ? '#F43F5E' : color} />
                   </div>
                   <div className="flex-1 space-y-6">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-1">Missions</p>
                          <p className="text-xl font-black text-[#0A1628] tracking-tight">{dept.total}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-1">En cours</p>
                          <p className="text-xl font-black tracking-tight" style={{ color: dept.overloaded ? '#F43F5E' : color }}>{dept.in_progress}</p>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div className="h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${dept.rate}%`, backgroundColor: dept.overloaded ? '#F43F5E' : color }} />
                      </div>
                   </div>
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-slate-50 group-hover:bg-slate-50/50 transition-colors rounded-b-[3.5rem] -mx-10 -mb-10 px-10 pb-10">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[1.25rem] bg-white border border-slate-100 shadow-xl flex items-center justify-center text-[#1557FF] text-xs font-black group-hover:scale-110 transition-transform">
                        {dept.chef.split(' ').map(w=>w[0]).join('').slice(0,2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#0A1628] tracking-tight truncate leading-none mb-1.5">{dept.chef}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Manager Pôle</p>
                      </div>
                   </div>
                   <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-[#1557FF] group-hover:border-[#1557FF]/30 group-hover:rotate-12 transition-all">
                      <ArrowUpRight className="w-6 h-6" />
                   </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selected && <DetailModal dept={selected} onClose={() => setSelected(null)} />}
    </PresidentLayout>
  )
}

export default PresidentServices
