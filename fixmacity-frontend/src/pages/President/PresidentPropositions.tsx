// src/pages/president/PresidentPropositions.tsx
import React, { useState, useEffect } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import { 
  Plus, X, Clock, ThumbsUp, ThumbsDown, CheckCircle2, 
  Archive, Search, LayoutGrid, List, MessageSquare, 
  TrendingUp, Users, Target, MoreHorizontal, Calendar,
  ArrowRight, Shield, Activity, BarChart3, Info
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

const CAT: Record<string, { color: string; bg: string }> = {
  'Éclairage public': { color: '#F59E0B', bg: 'bg-amber-50' },
  'Espaces Verts':    { color: '#22C55E', bg: 'bg-emerald-50' },
  'Signalisation':    { color: '#F97316', bg: 'bg-orange-50' },
  'Voirie':           { color: '#3B82F6', bg: 'bg-blue-50' },
  'Administratif':    { color: '#8B5CF6', bg: 'bg-violet-50' },
  'Propreté':         { color: '#10B981', bg: 'bg-teal-50' },
  'Réseaux':          { color: '#6366F1', bg: 'bg-indigo-50' },
  'Suggestions':      { color: '#EC4899', bg: 'bg-pink-50' },
  'Général':          { color: '#64748B', bg: 'bg-slate-50' },
}

const PRI: Record<string, { color: string; bg: string; label: string }> = {
  haute:   { color: '#EF4444', bg: 'bg-rose-50', label: 'HAUTE' },
  moyenne: { color: '#F59E0B', bg: 'bg-amber-50', label: 'MOYENNE' },
  basse:   { color: '#10B981', bg: 'bg-emerald-50', label: 'BASSE' },
}

const daysLeft = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000))

interface Prop { 
  id: string; title: string; description: string; category: string; 
  priority: string; pour: number; contre: number; total: number; 
  end_date?: string; status: string; citizen?: string; date?: string 
}

// ── UI Components ─────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, color, icon: Icon, data }: any) => (
  <div className="group bg-white rounded-[2.5rem] p-8 border border-slate-200/60 hover:border-blue-400/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all duration-500 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-bl-[5rem] -mr-10 -mt-10 group-hover:bg-blue-50/50 transition-colors duration-500" />
    <div className="relative flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className={`p-4 rounded-2xl ${color.bg} ${color.text} shadow-sm group-hover:scale-110 transition-transform duration-500`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 mb-1">
             <TrendingUp className="w-3 h-3" /> +12%
           </span>
           <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{sub}</span>
        </div>
      </div>
      <div className="mt-auto">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</p>
        <div className="flex items-end justify-between gap-4">
          <h3 className="text-4xl font-black text-[#0A1628] tracking-tight">{value}</h3>
          <div className="w-24 h-12 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <Area type="monotone" dataKey="value" stroke={color.hex} strokeWidth={2.5} fill="transparent" isAnimationActive={true} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  </div>
)

const VoteBar = ({ pour, contre, total }: { pour: number; contre: number; total: number }) => {
  const p = total > 0 ? Math.round(pour / total * 100) : 0
  return (
    <div className="mt-8 bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100/50">
      <div className="flex justify-between items-end mb-4">
        <div>
           <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Favorable</p>
           <div className="flex items-center gap-2">
             <ThumbsUp className="w-4 h-4 text-emerald-500" />
             <span className="text-xl font-black text-[#0A1628]">{p}%</span>
           </div>
        </div>
        <div className="text-right">
           <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Défavorable</p>
           <div className="flex items-center gap-2 justify-end">
             <span className="text-xl font-black text-[#0A1628]">{100-p}%</span>
             <ThumbsDown className="w-4 h-4 text-rose-500" />
           </div>
        </div>
      </div>
      <div className="h-3 rounded-full bg-white shadow-inner overflow-hidden flex border border-slate-100">
        <div className="h-full bg-[#1557FF] transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(21,87,255,0.4)]" style={{ width: `${p}%` }} />
        <div className="h-full bg-rose-400 transition-all duration-1000 ease-out" style={{ width: `${100-p}%` }} />
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        <Users className="w-3 h-3 text-slate-300" />
        <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{total.toLocaleString()} EXPRESSIONS</span>
      </div>
    </div>
  )
}

const PropCard = ({ prop, isCitizen, onConfirm, onRetain }: { prop: Prop; isCitizen?: boolean; onConfirm?: (id: string) => void; onRetain?: (id: string) => void }) => {
  const cat = CAT[prop.category] || CAT['Général']
  const pri = PRI[prop.priority] || PRI['moyenne']
  const done = prop.status !== 'pending' && isCitizen
  
  return (
    <div className={`group bg-white rounded-[3rem] border transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] ${done ? 'opacity-75 border-slate-100' : 'border-slate-200/60 hover:border-[#1557FF]/30'} flex flex-col overflow-hidden`}>
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2">
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-xl border border-current/10 ${cat.bg}`} style={{ color: cat.color }}>{prop.category}</span>
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-xl border border-current/10 ${pri.bg}`} style={{ color: pri.color }}>{pri.label}</span>
          </div>
          {done && (
            <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${prop.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
              {prop.status === 'confirmed' ? <CheckCircle2 className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
              {prop.status === 'confirmed' ? 'PUBLIÉE' : 'RETENUE'}
            </span>
          )}
        </div>

        <div className="mb-8">
          <h3 className="font-black text-[#0A1628] text-xl leading-tight mb-4 group-hover:text-[#1557FF] transition-colors duration-300 tracking-tight">{prop.title}</h3>
          <p className="text-sm text-slate-400 font-medium leading-relaxed line-clamp-3">{prop.description}</p>
        </div>
        
        {isCitizen && prop.citizen && (
          <div className="flex items-center gap-4 py-6 mb-4 border-y border-slate-50">
            <div className="w-12 h-12 rounded-[1.25rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-[11px] font-black text-[#0A1628] shadow-sm group-hover:rotate-6 transition-transform">
              {prop.citizen.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-[#0A1628] tracking-tight">{prop.citizen}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">{prop.date}</span>
            </div>
          </div>
        )}

        <div className="mt-auto">
          <VoteBar pour={prop.pour} contre={prop.contre} total={prop.total} />
          {prop.end_date && (
            <div className="mt-8 flex items-center justify-between px-2">
              <div className="flex items-center gap-3 text-slate-300">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Clôture des votes</span>
              </div>
              <span className={`text-[10px] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest ${daysLeft(prop.end_date) < 3 ? 'bg-rose-50 text-rose-500 border border-rose-100 animate-pulse' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                {daysLeft(prop.end_date)} JOURS RESTANTS
              </span>
            </div>
          )}
        </div>
      </div>

      {isCitizen && !done && (
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-4">
          <button onClick={() => onConfirm?.(prop.id)} className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white bg-[#1557FF] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            Publier
          </button>
          <button onClick={() => onRetain?.(prop.id)} className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all">
            Retenir
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

const PresidentPropositions: React.FC = () => {
  const [tab, setTab] = useState<'mine' | 'citizen'>('mine')
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [myProps, setMyProps] = useState<Prop[]>([])
  const [citProps, setCitProps] = useState<Prop[]>([])
  const [search, setSearch] = useState('')
  const [catF, setCatF] = useState('Tous')
  const [showCreate, setShowCreate] = useState(false)
  const [newProp, setNewProp] = useState({ title: '', description: '', start_date: '', end_date: '', category: 'Voirie', priority: 'moyenne' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const generateTrend = () => Array.from({ length: 12 }, (_, i) => ({ value: Math.floor(Math.random() * 40) + 10 }))
  const [kpiData] = useState({
    active: generateTrend(),
    votes: generateTrend(),
    citizen: generateTrend(),
    impact: generateTrend()
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/president/propositions`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        const data = await res.json()
        const mapProp = (p: any) => ({
          ...p,
          priority: p.priority || (p.total > 2000 ? 'haute' : p.total > 500 ? 'moyenne' : 'basse'),
          category: p.category || 'Général',
          date: new Date(p.created_at).toLocaleDateString('fr-FR')
        })
        setMyProps((data.presidential || []).map(mapProp))
        setCitProps((data.citizen || []).map(mapProp))
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const COLS = [
    { key: 'pending',   label: 'FLUX ENTRANT', color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-600' },
    { key: 'confirmed', label: 'DÉBATS PUBLICS', color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { key: 'retained',  label: 'COULOIR RÉSERVE', color: '#8B5CF6', bg: 'bg-violet-50', text: 'text-violet-600' },
  ]

  const act = async (id: string, action: string) => {
    try {
      const endpoint = action === 'confirmer' ? 'confirmer' : 'retenu'
      const res = await fetch(`${API}/president/propositions/${id}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        setCitProps(prev => prev.map(p => p.id === id ? { ...p, status: action === 'confirmer' ? 'confirmed' : 'retained' } : p))
      }
    } catch (_) {}
  }

  const handleCreate = async () => {
    if (!newProp.title || !newProp.description || !newProp.end_date) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/president/propositions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          ...newProp,
          start_date: newProp.start_date || null,
          end_date: newProp.end_date || null
        })
      })
      if (res.ok) {
        await load()
        setShowCreate(false)
        setNewProp({ title: '', description: '', start_date: '', end_date: '', category: 'Voirie', priority: 'moyenne' })
      }
    } catch (_) {}
    setSaving(false)
  }

  const filter = (arr: Prop[]) => arr.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
    if (catF !== 'Tous' && p.category !== catF) return false
    return true
  })

  if (loading) return (
    <PresidentLayout title="Gestion des Propositions">
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-[3px] border-slate-100 border-t-[#1557FF] rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synchronisation des votes...</p>
      </div>
    </PresidentLayout>
  )

  return (
    <PresidentLayout title="Gestion des Propositions">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-black text-[#0A1628] tracking-tight mb-3">Démocratie Participative</h1>
            <p className="text-sm font-medium text-slate-400 italic">Arbitrage et pilotage des initiatives citoyennes et présidentielles.</p>
          </div>
          <div className="flex items-center gap-4 bg-white/50 p-2 rounded-[2rem] border border-slate-100">
             <div className="flex p-1 bg-slate-100/50 rounded-2xl">
              {(['mine', 'citizen'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${tab === t ? 'bg-white text-[#1557FF] shadow-xl shadow-blue-500/10' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {t === 'mine' ? 'Initiatives' : 'Suggestions'}
                </button>
              ))}
            </div>
            {tab === 'mine' && (
              <button onClick={() => setShowCreate(true)} className="h-12 px-8 rounded-2xl bg-[#1557FF] text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3">
                <Plus className="w-4 h-4" /> Nouvelle
              </button>
            )}
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          <KpiCard label="Consultations" value={myProps.length} sub="AXE PRÉSIDENTIEL" color={{ hex: '#1557FF', bg: 'bg-blue-50', text: 'text-blue-600' }} icon={Target} data={kpiData.active} />
          <KpiCard label="Total Votes" value={(myProps.reduce((a, b) => a + b.total, 0) + citProps.reduce((a, b) => a + b.total, 0)).toLocaleString()} sub="IMPACT DIRECT" color={{ hex: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-600' }} icon={Users} data={kpiData.votes} />
          <KpiCard label="Suggestions" value={citProps.length} sub="POOL CITOYEN" color={{ hex: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-600' }} icon={MessageSquare} data={kpiData.citizen} />
          <KpiCard label="Taux d'adhésion" value="78%" sub="SCORE MOYEN" color={{ hex: '#8B5CF6', bg: 'bg-violet-50', text: 'text-violet-600' }} icon={Activity} data={kpiData.impact} />
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col xl:flex-row items-center gap-6 mb-12">
          <div className="flex bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-[1.5rem] p-1.5 shadow-sm">
            {([['board', LayoutGrid], ['list', List]] as const).map(([m, Icon]) => (
              <button key={m} onClick={() => setViewMode(m as any)}
                className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${viewMode === m ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'}`}
              >
                <Icon className="w-6 h-6" />
              </button>
            ))}
          </div>

          <div className="flex-1 w-full flex items-center gap-5 bg-white border border-slate-200/60 rounded-[2rem] px-8 h-16 shadow-sm focus-within:border-[#1557FF]/30 transition-all group">
            <Search className="w-5 h-5 text-slate-300 group-focus-within:text-[#1557FF] transition-colors" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Analyser les expressions citoyennes..." 
              className="flex-1 text-sm font-bold text-[#0A1628] placeholder-slate-300 outline-none bg-transparent"
            />
          </div>

          <div className="relative">
            <select 
              value={catF} 
              onChange={e => setCatF(e.target.value)} 
              className="h-16 px-10 rounded-[2rem] bg-white border border-slate-200/60 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none cursor-pointer hover:border-[#1557FF]/30 shadow-sm transition-all appearance-none pr-16"
            >
              <option>Tous</option>
              {Object.keys(CAT).map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
               <BarChart3 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        {viewMode === 'board' ? (
          tab === 'mine' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
              {filter(myProps).map(p => <PropCard key={p.id} prop={p} />)}
              {filter(myProps).length === 0 && (
                <div className="col-span-full h-[40vh] flex flex-col items-center justify-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
                   <Target className="w-16 h-16 text-slate-200 mb-4" />
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aucune initiative en cours</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-start">
              {COLS.map(col => {
                const colProps = filter(citProps).filter(p => p.status === col.key)
                return (
                  <div key={col.key} className="space-y-8">
                    <div className="flex items-center justify-between px-4">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: col.color }} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0A1628]">{col.label}</h3>
                      </div>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-xl shadow-sm border border-slate-100 ${col.bg} ${col.text}`}>{colProps.length}</span>
                    </div>
                    <div className="space-y-8">
                      {colProps.map(p => <PropCard key={p.id} prop={p} isCitizen onConfirm={id => act(id, 'confirmer')} onRetain={id => act(id, 'retenu')} />)}
                      {colProps.length === 0 && (
                        <div className="h-48 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center bg-slate-50/30">
                          <Activity className="w-8 h-8 text-slate-200 mb-2" />
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">File vide</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <div className="bg-white rounded-[3rem] border border-slate-200/60 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.03)]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Initiative / Segment</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Adhésion Publique</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Participation</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">État Flux</th>
                  <th className="px-10 py-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filter(tab === 'mine' ? myProps : citProps).map(p => {
                  const pri = PRI[p.priority] || PRI['moyenne']
                  const cat = CAT[p.category] || CAT['Général']
                  const pPct = p.total > 0 ? Math.round(p.pour / p.total * 100) : 0
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-10 py-8">
                        <div className="flex flex-col max-w-md">
                          <div className="flex gap-2 mb-3">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm border border-current/10 ${cat.bg}`} style={{ color: cat.color }}>{p.category}</span>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-current/10 ${pri.bg}`} style={{ color: pri.color }}>{pri.label}</span>
                          </div>
                          <p className="text-base font-black text-[#0A1628] group-hover:text-[#1557FF] transition-colors tracking-tight leading-tight">{p.title}</p>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="w-48">
                          <div className="flex justify-between text-[10px] font-black mb-2 text-slate-400">
                            <span className="text-emerald-500">POUR {pPct}%</span>
                            <span className="text-rose-400">{100-pPct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/20">
                            <div className="h-full bg-[#1557FF]" style={{ width: `${pPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1557FF] flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-sm font-black text-[#0A1628] leading-none mb-1">{p.total.toLocaleString()}</p>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Votes enregistrés</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-xl border ${p.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : p.status === 'retained' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          {p.status === 'confirmed' ? 'DÉBAT PUBLIC' : p.status === 'retained' ? 'RÉSERVE' : 'FLUX ATTENTE'}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right">
                         <button className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-[#1557FF] hover:border-[#1557FF]/30 hover:rotate-12 transition-all shadow-sm">
                           <ArrowRight className="w-6 h-6" />
                         </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0A1628]/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setShowCreate(false)} />
            <div className="relative bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl p-12 overflow-hidden animate-in fade-in zoom-in duration-500">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-3xl font-black text-[#0A1628] tracking-tight mb-2">Initiative Stratégique</h2>
                  <p className="text-xs font-medium text-slate-400 italic">Lancez une consultation publique pour une décision municipale majeure.</p>
                </div>
                <button onClick={() => setShowCreate(false)} className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all hover:rotate-90">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-8">
                <div className="group">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3 ml-1 group-focus-within:text-[#1557FF] transition-colors">Titre de l'initiative</label>
                  <input value={newProp.title} onChange={e => setNewProp(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Plan d'aménagement Sousse Sud 2026" className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 text-base font-black text-[#0A1628] outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-[#1557FF]/30 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3 ml-1">Objectifs & Analyse</label>
                  <textarea value={newProp.description} onChange={e => setNewProp(p => ({ ...p, description: e.target.value }))} placeholder="Décrivez l'impact sociétal et infrastructurel..." rows={4} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-8 text-base font-bold text-[#0A1628] outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-[#1557FF]/30 transition-all resize-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3 ml-1">Segment Pôle</label>
                    <select value={newProp.category} onChange={e => setNewProp(p => ({ ...p, category: e.target.value }))} className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 text-sm font-black text-[#0A1628] outline-none focus:bg-white transition-all appearance-none cursor-pointer">
                      {Object.keys(CAT).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3 ml-1">Niveau Priorité</label>
                    <select value={newProp.priority} onChange={e => setNewProp(p => ({ ...p, priority: e.target.value }))} className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 text-sm font-black text-[#0A1628] outline-none focus:bg-white transition-all appearance-none cursor-pointer">
                      <option value="haute">CRITIQUE / HAUTE</option>
                      <option value="moyenne">OPÉRATIONNELLE / MOYENNE</option>
                      <option value="basse">AMÉLIORATION / BASSE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3 ml-1">Déclenchement</label>
                    <div className="relative">
                      <input type="date" value={newProp.start_date} onChange={e => setNewProp(p => ({ ...p, start_date: e.target.value }))} className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 text-sm font-black text-[#0A1628] outline-none focus:bg-white transition-all" />
                      <Calendar className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3 ml-1">Échéance Finale</label>
                    <div className="relative">
                      <input type="date" value={newProp.end_date} onChange={e => setNewProp(p => ({ ...p, end_date: e.target.value }))} className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 text-sm font-black text-[#0A1628] outline-none focus:bg-white transition-all" />
                      <Clock className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-6 mt-12">
                <button onClick={() => setShowCreate(false)} className="flex-1 h-16 rounded-[1.5rem] border border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Abandonner</button>
                <button onClick={handleCreate} disabled={saving} className="flex-1 h-16 rounded-[1.5rem] bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-[#1557FF] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                  {saving ? 'Synchronisation...' : 'Déployer Consultation'}
                  <Shield className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PresidentLayout>
  )
}

export default PresidentPropositions
