// src/pages/President/PresidentIncoming.tsx
// Declarations coming from citizens — needs president action (assign)

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, ChevronDown, AlertTriangle, MapPin, ThumbsUp,
  Clock, X, CheckCircle2, Bell, Filter, RefreshCw, ArrowRight,
  Zap, Eye
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

const DEPT_IDS: Record<string, { id: string; color: string; icon: string }> = {
  'Voirie':        { id:'c3c9d2cd-4b55-481b-b577-92ae1ee7d8d1', color:'#6366F1', icon:'🛣️'  },
  'Eclairage':     { id:'af6c8348-0e2b-40fe-b4aa-54629d483559', color:'#F59E0B', icon:'💡'  },
  'Proprete':      { id:'5ab878b9-2d37-455e-b8cf-7fe91dd5e088', color:'#10B981', icon:'🗑️'  },
  'Espaces verts': { id:'f6c86d36-3e26-442f-9e3f-2b745083109f', color:'#22C55E', icon:'🌿'  },
  'Reseaux':       { id:'48256387-922e-4af8-854a-f09738f15fdc', color:'#EC4899', icon:'💧'  },
  'Signalisation': { id:'bd7043c9-b2c7-4ca1-b3e9-777a3bdc2dbd', color:'#3B82F6', icon:'🚦'  },
  'Administratif': { id:'090910f9-c9f6-4e84-b7ed-46789d4e4eaf', color:'#8B5CF6', icon:'🏛️'  },
}

const PRIORITY_MAP: Record<string, { label:string; color:string; bg:string }> = {
  haute:   { label:'Urgente',  color:'#EF4444', bg:'#FEF2F2' },
  moyenne: { label:'Moyenne',  color:'#F59E0B', bg:'#FFFBEB' },
  basse:   { label:'Normale',  color:'#10B981', bg:'#F0FDF4' },
}

const MOCK = [
  { id:'1', ref_citoyen:'SV-22-04-26-0042', title:'Nid-de-poule dangereux Av. Bourguiba',
    category:'Voirie', priority:'haute', delegation:'Sousse Ville', votes:47,
    address:'Avenue Léopold Senghor', citizen:'Sami Ben Youssef',
    submitted_at:'2026-04-22T09:14:00Z', lat:35.8256, lng:10.6369,
    image:'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=300&q=80' },
  { id:'2', ref_citoyen:'SJ-21-04-26-0038', title:'Câble électrique exposé Rue de Marseille',
    category:'Eclairage', priority:'haute', delegation:'Sousse Jawhara', votes:38,
    address:'Rue de Marseille', citizen:'Ines Mansour',
    submitted_at:'2026-04-21T14:20:00Z', lat:35.8320, lng:10.6210,
    image:'https://images.unsplash.com/photo-1544983050-8b1b6d05ebcd?w=300&q=80' },
  { id:'3', ref_citoyen:'SA-18-04-26-0022', title:"Fuite d'eau importante Rue Ibn Sina",
    category:'Reseaux', priority:'haute', delegation:'Sousse SA', votes:29,
    address:'Rue Ibn Sina', citizen:'Ahmed Kamel',
    submitted_at:'2026-04-18T11:05:00Z', lat:35.8150, lng:10.6400,
    image:'https://images.unsplash.com/photo-1517409217698-3165b4c42407?w=300&q=80' },
  { id:'4', ref_citoyen:'SV-20-04-26-0031', title:'Dépôt sauvage derrière le marché',
    category:'Proprete', priority:'moyenne', delegation:'Sousse Ville', votes:14,
    address:'Marché Central, Sousse', citizen:'Fatma Ben Salah',
    submitted_at:'2026-04-20T16:30:00Z', lat:35.8278, lng:10.6390,
    image:'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=300&q=80' },
  { id:'5', ref_citoyen:'SJ-19-04-26-0027', title:'Signalisation manquante carrefour Jawhara',
    category:'Signalisation', priority:'haute', delegation:'Sousse Jawhara', votes:22,
    address:'Carrefour Principal Jawhara', citizen:'Nour Chakroun',
    submitted_at:'2026-04-19T08:45:00Z', lat:35.8445, lng:10.5912, image:null },
  { id:'6', ref_citoyen:'SA-17-04-26-0019', title:'Bancs cassés parc municipal SA',
    category:'Espaces verts', priority:'basse', delegation:'Sousse SA', votes:8,
    address:'Parc Municipal Sidi Abdelhamid', citizen:'Omar Fekih',
    submitted_at:'2026-04-17T10:00:00Z', lat:35.7823, lng:10.6145, image:null },
]

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

// ── Assign Modal ──────────────────────────────────────────────────────────────
function AssignModal({ decl, onClose, onAssigned }: {
  decl: Decl; onClose: ()=>void; onAssigned: (id:string)=>void
}) {
  const [selected, setSelected] = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleAssign = async () => {
    if (!selected) return
    setLoading(true)
    try {
      const deptId = DEPT_IDS[selected]?.id
      await fetch(`${API}/president/declarations/${decl.id}/assign`, {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token()}`},
        body: JSON.stringify({ department_id: deptId })
      })
      onAssigned(decl.id)
      onClose()
    } catch(_) {}
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-[#0A1628]">Affecter au département</h2>
            <p className="text-xs text-slate-400 mt-0.5">{decl.ref_citoyen}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Declaration preview */}
        <div className="mx-6 mt-5 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100 flex gap-3">
          {decl.image && (
            <img src={decl.image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0"/>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0A1628] leading-snug mb-1 line-clamp-2">{decl.title}</p>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{decl.address}</span>
              <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3"/>{decl.votes}</span>
              <span>{PRIORITY_MAP[decl.priority]?.label}</span>
            </div>
          </div>
        </div>

        {/* Department grid */}
        <div className="px-6 pb-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Choisir le département</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(DEPT_IDS).map(([name, cfg]) => (
              <button key={name} onClick={() => setSelected(name)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                  selected===name
                    ? 'border-[#1557FF] bg-blue-50'
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background:`${cfg.color}15` }}>
                  {cfg.icon}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold truncate ${selected===name?'text-[#1557FF]':'text-[#0A1628]'}`}>{name}</p>
                </div>
                {selected===name && (
                  <CheckCircle2 className="w-4 h-4 text-[#1557FF] ml-auto flex-shrink-0"/>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6 pt-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            Annuler
          </button>
          <button onClick={handleAssign} disabled={!selected || loading}
            className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background:'#1557FF' }}>
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              : <><Zap className="w-4 h-4"/> Affecter maintenant</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const PresidentIncoming: React.FC = () => {
  const [decls,      setDecls]      = useState<Decl[]>(MOCK)
  const [search,     setSearch]     = useState('')
  const [catF,       setCatF]       = useState('Tous')
  const [priF,       setPriF]       = useState('Tous')
  const [delegF,     setDelegF]     = useState('Tous')
  const [assigning,  setAssigning]  = useState<Decl|null>(null)
  const [assigned,   setAssigned]   = useState<Set<string>>(new Set())
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
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
              lat: parseFloat(d.latitude) || 35.8256,
              lng: parseFloat(d.longitude) || 10.6369,
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
      // Sort: haute first, then by votes desc
      const pOrder = { haute:0, moyenne:1, basse:2 }
      const pd = (pOrder[a.priority as keyof typeof pOrder]||1) - (pOrder[b.priority as keyof typeof pOrder]||1)
      if (pd !== 0) return pd
      return b.votes - a.votes
    })

  const urgentCount = filtered.filter(d=>d.priority==='haute').length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#0A1628]">Nouvelles Déclarations Citoyennes</h1>
          <p className="text-sm text-slate-400 mt-1">Signalements en attente d'affectation à un département</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/president/suivi"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-slate-300 transition-all">
            <Eye className="w-4 h-4"/> Suivi des statuts
          </Link>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-slate-300 transition-all">
            <RefreshCw className="w-4 h-4"/> Actualiser
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-5">
          <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-white"/>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">
              {urgentCount} déclaration{urgentCount>1?'s':''} urgente{urgentCount>1?'s':''} nécessite{urgentCount>1?'nt':''} une action immédiate
            </p>
            <p className="text-xs text-red-500">Triées en priorité ci-dessous</p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label:'En attente',  value:filtered.length,                             color:'#1557FF', bg:'#EEF2FF' },
          { label:'Urgentes',    value:filtered.filter(d=>d.priority==='haute').length,  color:'#EF4444', bg:'#FEF2F2' },
          { label:'Votes totaux',value:filtered.reduce((a,d)=>a+d.votes,0),         color:'#10B981', bg:'#F0FDF4' },
          { label:'Affectées',   value:assigned.size,                               color:'#8B5CF6', bg:'#F5F3FF' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
              style={{ background:k.bg, color:k.color }}>
              {k.value}
            </div>
            <p className="text-xs font-bold text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5 bg-white border border-slate-100 rounded-2xl p-3">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher par titre ou référence..."
            className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"/>
        </div>

        {[
          { label:'Catégorie', value:catF, set:setCatF, opts:['Tous',...Object.keys(DEPT_IDS)] },
          { label:'Priorité',  value:priF, set:setPriF, opts:['Tous','haute','moyenne','basse'] },
          { label:'Délégation',value:delegF,set:setDelegF,opts:['Tous','Sousse Ville','Sousse Jawhara','Sousse SA'] },
        ].map(f => (
          <div key={f.label} className="relative">
            <select value={f.value} onChange={e=>f.set(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-sm font-semibold text-slate-600 outline-none cursor-pointer">
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-400 pointer-events-none"/>
          </div>
        ))}
      </div>

      {/* Declaration list — styled like the project manager image */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-[#1557FF] rounded-full animate-spin"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-lg font-bold text-slate-600">Aucune déclaration en attente</p>
          <p className="text-sm text-slate-400">Toutes les déclarations ont été affectées</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {/* Table header */}
          <div className="grid items-center gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400"
            style={{ gridTemplateColumns:'20px 1fr 140px 180px 80px 80px 120px' }}>
            <input type="checkbox" className="rounded"/>
            <span>Déclaration</span>
            <span>Catégorie</span>
            <span>Localisation</span>
            <span className="text-center">Priorité</span>
            <span className="text-center">Votes</span>
            <span className="text-right">Actions</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-50">
            {filtered.map((d) => {
              const pri = PRIORITY_MAP[d.priority] || PRIORITY_MAP['moyenne']
              const dept = DEPT_IDS[d.category]
              const isUrgent = d.priority === 'haute'
              const waitHours = Math.floor((Date.now()-new Date(d.submitted_at).getTime())/3600000)

              return (
                <div key={d.id}
                  className={`grid items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group ${isUrgent?'border-l-2 border-red-400':''}`}
                  style={{ gridTemplateColumns:'20px 1fr 140px 180px 80px 80px 120px' }}>

                  {/* Checkbox */}
                  <input type="checkbox" className="rounded"/>

                  {/* Title */}
                  <div className="flex items-center gap-3 min-w-0">
                    {d.image ? (
                      <img src={d.image} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-slate-100"/>
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: dept ? `${dept.color}15` : '#F1F5F9' }}>
                        {dept?.icon || '📋'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0A1628] truncate">{d.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-400">{d.ref_citoyen}</span>
                        <span className="text-[10px] text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5"/>
                          {timeAgo(d.submitted_at)}
                        </span>
                        {waitHours >= 24 && (
                          <span className="text-[9px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
                            ⏰ {Math.floor(waitHours/24)}j d'attente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: dept?`${dept.color}15`:'#F1F5F9', color: dept?.color||'#64748B' }}>
                      {dept?.icon} {d.category}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{d.delegation}</p>
                      <p className="text-slate-400 truncate text-[10px]">{d.address}</p>
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="flex justify-center">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                      style={{ background:pri.bg, color:pri.color }}>
                      {isUrgent && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>}
                      {pri.label}
                    </span>
                  </div>

                  {/* Votes */}
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-[#1557FF]">{d.votes}</span>
                    <span className="text-[9px] text-slate-400">votes</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setAssigning(d)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                      style={{ background:'#1557FF' }}>
                      <Zap className="w-3 h-3"/> Affecter
                    </button>
                    <button className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all">
                      <Eye className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bulk action bar at bottom */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {filtered.length} déclaration{filtered.length>1?'s':''} en attente
            </p>
            <Link to="/president/suivi"
              className="text-xs font-bold text-[#1557FF] hover:underline flex items-center gap-1">
              Voir le suivi des statuts <ArrowRight className="w-3 h-3"/>
            </Link>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assigning && (
        <AssignModal
          decl={assigning}
          onClose={() => setAssigning(null)}
          onAssigned={onAssigned}
        />
      )}
    </div>
  )
}

export default PresidentIncoming
