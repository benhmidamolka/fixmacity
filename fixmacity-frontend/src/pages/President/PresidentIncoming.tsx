// src/pages/president/PresidentIncoming.tsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, ChevronDown, AlertTriangle, MapPin, ThumbsUp,
  Clock, X, CheckCircle2, RefreshCw, ArrowRight,
  Zap, Eye, MoreHorizontal, Filter, Shield, Activity
} from 'lucide-react'
import PresidentLayout from '../../layouts/PresidentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

const DEPT_UI: Record<string, { color: string; icon: string }> = {
  'Voirie':        { color:'#6366F1', icon:'🛣️' },
  'Éclairage public': { color:'#F59E0B', icon:'💡' },
  'Propreté':      { color:'#10B981', icon:'🗑️' },
  'Espaces Verts': { color:'#22C55E', icon:'🌿' },
  'Réseaux':       { color:'#EC4899', icon:'💧' },
  'Signalisation': { color:'#3B82F6', icon:'🚦' },
  'Administratif': { color:'#8B5CF6', icon:'🏛️' },
  'Suggestions':   { color:'#64748B', icon:'💡' }
}

const PRIORITY_MAP: Record<string, { label:string; color:string; bg:string }> = {
  haute:   { label:'Urgente',  color:'#EF4444', bg:'#FEF2F2' },
  moyenne: { label:'Moyenne',  color:'#F59E0B', bg:'#FFFBEB' },
  basse:   { label:'Normale',  color:'#10B981', bg:'#F0FDF4' },
}

interface Decl {
  id:string; ref_citoyen:string; title:string; category:string
  priority:string; delegation:string; votes:number; address:string
  citizen:string; submitted_at:string; lat:number; lng:number; image?:string|null
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${d}j`
}

// ── UI Components ─────────────────────────────────────────────────────────────

const KpiCard: React.FC<{
  label: string
  value: string | number
  sub: string
  icon: React.ReactNode
  color: string
  progressPct: number
}> = ({ label, value, sub, icon, color, progressPct }) => {
  const pct = Math.min(100, Math.max(0, progressPct))
  return (
  <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] transition-all duration-500 group relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 translate-x-8 -translate-y-8 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-700" style={{ backgroundColor: color }} />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)` }}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
          <p className="text-3xl font-black text-[#0A1628] tracking-tighter mt-1">{value}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sub}</span>
      </div>
    </div>
  </div>
  )
}

const AssignModal: React.FC<{ decl: Decl; departments: {id:string, name:string}[]; onClose: ()=>void; onAssigned: (id:string)=>void }> = ({ decl, departments, onClose, onAssigned }) => {
  const [selected, setSelected] = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleAssign = async () => {
    if (!selected) return
    setLoading(true)
    try {
      await fetch(`${API}/president/declarations/${decl.id}/assign`, {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token()}`},
        body: JSON.stringify({ department_id: selected })
      })
      onAssigned(decl.id)
      onClose()
    } catch(_) {}
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-[#0A1628]/80 backdrop-blur-xl" onClick={onClose}/>
      <div className="relative bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-white/10">
        
        {/* Header */}
        <div className="px-10 pt-10 pb-8 flex items-start justify-between border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-black text-[#1557FF] uppercase tracking-[0.2em] bg-blue-50 px-3 py-1 rounded-lg">AFFECTATION</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{decl.ref_citoyen}</span>
            </div>
            <h2 className="text-3xl font-black text-[#0A1628] tracking-tight">Délégation de pouvoir</h2>
            <p className="text-sm text-slate-400 font-medium italic mt-1">Transférer la responsabilité opérationnelle au département compétent.</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all group">
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500"/>
          </button>
        </div>

        <div className="p-10 space-y-8">
          {/* Declaration preview */}
          <div className="flex gap-6 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 border-dashed">
            {decl.image ? (
              <img src={decl.image} alt="" className="w-24 h-24 rounded-2xl object-cover shadow-lg border-2 border-white flex-shrink-0"/>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-3xl shadow-sm flex-shrink-0">
                {DEPT_UI[decl.category]?.icon || '📋'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black text-[#0A1628] leading-tight mb-2 line-clamp-2">{decl.title}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-blue-500"/>{decl.address}</span>
                <span className="flex items-center gap-2"><ThumbsUp className="w-3.5 h-3.5 text-emerald-500"/>{decl.votes} soutiens</span>
                <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-amber-500"/>{timeAgo(decl.submitted_at)}</span>
              </div>
            </div>
          </div>

          {/* Department grid */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Département d'exécution</p>
            <div className="grid grid-cols-2 gap-4">
              {departments.map((dept) => { 
                const cfg = DEPT_UI[dept.name] || { color: '#64748B', icon: '🏢' }
                const isSelected = selected === dept.id
                return (
                  <button key={dept.id} onClick={() => setSelected(dept.id)}
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left group/dept ${
                      isSelected
                        ? 'border-[#1557FF] bg-blue-50/50'
                        : 'border-slate-50 hover:border-slate-200 bg-white'
                    }`}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm transition-transform group-hover/dept:scale-110"
                      style={{ background:`${cfg.color}15`, color: cfg.color }}>
                      {cfg.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-black tracking-tight mb-0.5 ${isSelected ? 'text-[#1557FF]' : 'text-[#0A1628]'}`}>{dept.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unité Opérationnelle</p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#1557FF] flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[4]"/>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 pb-10 flex gap-4">
          <button onClick={onClose}
            className="flex-1 h-16 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">
            Abandonner
          </button>
          <button onClick={handleAssign} disabled={!selected || loading}
            className="flex-[2] h-16 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/20"
            style={{ background:'#1557FF' }}>
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            ) : (
              <><Zap className="w-5 h-5"/> Confirmer l'affectation</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

const PresidentIncoming: React.FC = () => {
  const [decls,      setDecls]      = useState<Decl[]>([])
  const [departments, setDepartments] = useState<{id:string, name:string}[]>([])
  const [search,     setSearch]     = useState('')
  const [catF,       setCatF]       = useState('Tous')
  const [priF,       setPriF]       = useState('Tous')
  const [delegF,     setDelegF]     = useState('Tous')
  const [assigning,  setAssigning]  = useState<Decl|null>(null)
  const [assigned,   setAssigned]   = useState<Set<string>>(new Set())
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await fetch(`${API}/president/departments`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          setDepartments((data.departments || []).map((d: any) => ({ id: d.id, name: d.name_fr || d.name })))
        }
      } catch (_) {}
    }
    loadDepts()

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/president/declarations?status=soumise&limit=50`, {
          headers:{ Authorization:`Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.declarations?.length) {
            setDecls(data.declarations.map((d:any) => ({
              id: d.id, ref_citoyen: d.ref_citoyen || '—',
              title: d.title, category: d.category || 'Voirie',
              priority: d.priority || 'moyenne',
              delegation: d.delegation_name || 'Sousse Ville',
              votes: d.votes_count || 0,
              address: d.address || '—',
              citizen: d.citizen_name || 'Citoyen',
              submitted_at: d.created_at,
              lat: d.latitude ? parseFloat(d.latitude) : null,
              lng: d.longitude ? parseFloat(d.longitude) : null,
              image: d.image_url || null
            })))
          }
        }
      } catch(_) {}
      setLoading(false)
    }
    load()
  }, [])

  const onAssigned = (id:string) => setAssigned(prev => new Set([...prev, id]))

  const filtered = decls
    .filter(d => !assigned.has(d.id))
    .filter(d => {
      if (search && !d.title.toLowerCase().includes(search.toLowerCase()) &&
          !d.ref_citoyen.toLowerCase().includes(search.toLowerCase())) return false
      if (catF !== 'Tous' && d.category !== catF) return false
      if (priF !== 'Tous' && d.priority !== priF) return false
      if (delegF !== 'Tous' && d.delegation !== delegF) return false
      return true
    })
    .sort((a,b) => {
      const pOrder = { haute:0, moyenne:1, basse:2 }
      const pd = (pOrder[a.priority as keyof typeof pOrder]||1) - (pOrder[b.priority as keyof typeof pOrder]||1)
      if (pd !== 0) return pd
      return b.votes - a.votes
    })

  const urgentCount = filtered.filter(d=>d.priority==='haute').length
  const voteSum = filtered.reduce((a,d)=>a+d.votes,0)
  const queueTotal = filtered.length + assigned.size

  return (
    <PresidentLayout title="Flux Entrant">
      <div className="max-w-7xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-[#1557FF] uppercase tracking-[0.2em] bg-blue-50 px-3 py-1 rounded-lg">LIVE FEED</span>
            </div>
            <h1 className="text-4xl font-black text-[#0A1628] tracking-tight mb-2">Signalements à affecter</h1>
            <p className="text-sm font-medium text-slate-400 italic">Prenez connaissance des signalements citoyens et déléguez-les aux unités compétentes.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/president/suivi" className="h-14 px-8 rounded-2xl bg-white border border-slate-200 text-[#0A1628] font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-slate-50 transition-all shadow-sm">
              <Eye className="w-5 h-5" /> Suivi Opérationnel
            </Link>
            <button onClick={() => window.location.reload()} className="w-14 h-14 rounded-2xl bg-[#0A1628] flex items-center justify-center text-white hover:bg-[#1557FF] transition-all shadow-xl shadow-slate-900/10">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KPIs Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <KpiCard label="En attente" value={filtered.length} sub="Signalements" icon={<Activity className="w-6 h-6"/>} color="#1557FF" progressPct={queueTotal > 0 ? (filtered.length / queueTotal) * 100 : 0} />
          <KpiCard label="Urgent" value={urgentCount} sub="Critique" icon={<AlertTriangle className="w-6 h-6"/>} color="#EF4444" progressPct={filtered.length > 0 ? (urgentCount / filtered.length) * 100 : 0} />
          <KpiCard label="Engagements" value={voteSum} sub="Votes Citoyens" icon={<ThumbsUp className="w-6 h-6"/>} color="#10B981" progressPct={Math.min(100, (voteSum / 50) * 100)} />
          <KpiCard label="Délégués" value={assigned.size} sub="Aujourd'hui" icon={<Zap className="w-6 h-6"/>} color="#8B5CF6" progressPct={queueTotal > 0 ? (assigned.size / queueTotal) * 100 : 0} />
        </div>

        {/* Filters & Content Area */}
        <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.03)] overflow-hidden">
          
          {/* Action Bar */}
          <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/30 flex flex-wrap items-center justify-between gap-6">
            <div className="flex-1 min-w-[300px] relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#1557FF] transition-colors" />
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Rechercher une référence ou un titre..."
                className="w-full h-14 bg-white border border-slate-100 rounded-2xl pl-16 pr-6 text-sm font-bold text-[#0A1628] focus:ring-4 focus:ring-blue-50 focus:border-[#1557FF]/30 outline-none transition-all shadow-sm" />
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {[
                { label:'Catégorie', value:catF, set:setCatF, opts:['Tous',...Object.keys(DEPT_UI)] },
                { label:'Priorité',  value:priF, set:setPriF, opts:['Tous','haute','moyenne','basse'] },
              ].map(f => (
                <div key={f.label} className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                    <Filter className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{f.label}</span>
                  </div>
                  <select value={f.value} onChange={e=>f.set(e.target.value)}
                    className="h-14 pl-28 pr-12 bg-white border border-slate-100 rounded-2xl text-xs font-black text-[#0A1628] appearance-none outline-none focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer shadow-sm">
                    {f.opts.map(o => <option key={o} value={o}>{o === 'Tous' ? 'Tout' : o}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                </div>
              ))}
            </div>
          </div>

          {/* List Area */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1557FF] rounded-full animate-spin mb-6" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronisation des données...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-50 flex items-center justify-center text-4xl mb-8 border border-emerald-100">
                  ✅
                </div>
                <h3 className="text-2xl font-black text-[#0A1628] tracking-tight mb-2">File d'attente vide</h3>
                <p className="text-sm font-medium text-slate-400 italic">Tous les signalements ont été affectés aux départements respectifs.</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identité Visuelle</th>
                    <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Signalement & Source</th>
                    <th className="px-6 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Spécification</th>
                    <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Priorité</th>
                    <th className="px-6 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Soutiens</th>
                    <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Arbitrage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((d) => {
                    const pri = PRIORITY_MAP[d.priority] || PRIORITY_MAP['moyenne']
                    const dept = DEPT_UI[d.category]
                    const isUrgent = d.priority === 'haute'
                    const waitHours = Math.floor((Date.now()-new Date(d.submitted_at).getTime())/3600000)

                    return (
                      <tr key={d.id} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="px-10 py-8">
                          {d.image ? (
                            <div className="relative w-20 h-20 group-hover:scale-105 transition-transform duration-500">
                              <img src={d.image} alt="" className="w-full h-full rounded-2xl object-cover shadow-lg border-2 border-white" />
                              {isUrgent && <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 border-2 border-white animate-bounce" />}
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-slate-100 bg-white group-hover:bg-blue-50 transition-all duration-500"
                              style={{ color: dept?.color }}>
                              {dept?.icon || '📋'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-8 max-w-md">
                          <div className="flex items-center gap-3 mb-2">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{d.ref_citoyen}</span>
                             <span className="text-slate-200 text-xs">|</span>
                             <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                               <Clock className="w-3 h-3" /> {timeAgo(d.submitted_at)}
                             </span>
                          </div>
                          <p className="text-lg font-black text-[#0A1628] leading-tight mb-2 group-hover:text-[#1557FF] transition-colors">{d.title}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 italic">
                             <MapPin className="w-3 h-3 text-slate-300" /> {d.address}
                          </div>
                        </td>
                        <td className="px-6 py-8">
                          <div className="flex flex-col gap-2">
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit"
                              style={{ background: dept?`${dept.color}15`:'#F1F5F9', color: dept?.color||'#64748B' }}>
                              {dept?.icon} {d.category}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{d.delegation}</span>
                          </div>
                        </td>
                        <td className="px-6 py-8 text-center">
                          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 ${
                            isUrgent ? 'bg-red-50 border-red-100 text-red-500' : 'bg-slate-50 border-slate-100 text-slate-400'
                          }`}>
                            {isUrgent && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                            {pri.label}
                          </span>
                        </td>
                        <td className="px-6 py-8 text-center">
                          <div className="inline-flex flex-col items-center p-3 rounded-2xl bg-slate-50 border border-slate-100 min-w-[70px]">
                            <span className="text-lg font-black text-[#1557FF]">{d.votes}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CITOYENS</span>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className="flex items-center justify-end gap-3">
                             <button onClick={() => setAssigning(d)}
                               className="h-14 px-8 rounded-2xl bg-[#1557FF] text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:scale-[1.05] active:scale-95 transition-all shadow-xl shadow-blue-500/20">
                               <Zap className="w-5 h-5" /> Affecter
                             </button>
                             <button className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#0A1628] hover:border-[#0A1628] transition-all shadow-sm">
                               <MoreHorizontal className="w-5 h-5" />
                             </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-6">
                <div className="flex -space-x-3">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400"
                       style={{ background: `linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)` }}>
                       {i}
                     </div>
                   ))}
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {filtered.length} dossiers prioritaires en attente de traitement
                </p>
             </div>
             <Link to="/president/suivi" className="text-[10px] font-black text-[#1557FF] uppercase tracking-[0.2em] flex items-center gap-2 group">
               Journal des affectations <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
             </Link>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {assigning && (
        <AssignModal
          decl={assigning}
          departments={departments}
          onClose={() => setAssigning(null)}
          onAssigned={onAssigned}
        />
      )}
    </PresidentLayout>
  )
}

export default PresidentIncoming
