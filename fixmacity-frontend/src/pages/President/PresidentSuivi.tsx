// src/pages/President/PresidentSuivi.tsx
// Status tracking — grouped list view like the image (To-do / In Progress / In Review / Done)

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, ChevronDown, ChevronRight, MapPin, ThumbsUp,
  Clock, User, Star, RefreshCw, Plus, Download, Filter,
  CheckCircle, Circle, Loader, XCircle, Archive, MoreHorizontal, Eye
} from 'lucide-react'
import PresidentLayout from '../../layouts/PresidentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

// ── Status groups (like To-do / In Progress / In Review / Done in the image) ──
const GROUPS = [
  {
    key:      'to_assign',
    label:    'À Affecter',
    statuses: ['assignee_chef'],
    color:    '#F59E0B',
    bg:       '#FFFBEB',
    icon:     <Circle className="w-4 h-4"/>,
    desc:     'Affectées à un chef, en attente d\'acceptation',
  },
  {
    key:      'in_progress',
    label:    'En Intervention',
    statuses: ['assignee_agent', 'en_cours'],
    color:    '#1557FF',
    bg:       '#EEF2FF',
    icon:     <Loader className="w-4 h-4"/>,
    desc:     'Agents actifs sur le terrain',
  },
  {
    key:      'in_review',
    label:    'En Vérification',
    statuses: ['resolue'],
    color:    '#10B981',
    bg:       '#F0FDF4',
    icon:     <CheckCircle className="w-4 h-4"/>,
    desc:     'Résolues — en attente d\'évaluation citoyenne',
  },
  {
    key:      'done',
    label:    'Clôturées',
    statuses: ['cloturee'],
    color:    '#64748B',
    bg:       '#F8FAFC',
    icon:     <Archive className="w-4 h-4"/>,
    desc:     'Déclarations terminées avec évaluation',
  },
  {
    key:      'rejected',
    label:    'Refusées',
    statuses: ['refusee_chef', 'refusee_agent'],
    color:    '#EF4444',
    bg:       '#FEF2F2',
    icon:     <XCircle className="w-4 h-4"/>,
    desc:     'Retournées pour réassignation',
  },
]

const DEPT_COLORS: Record<string,string> = {
  Voirie:'#6366F1', Eclairage:'#F59E0B', Proprete:'#10B981',
  'Espaces verts':'#22C55E', Reseaux:'#EC4899', Signalisation:'#3B82F6',
  Administratif:'#8B5CF6', Suggestions:'#F97316',
}
const DEPT_ICONS: Record<string,string> = {
  Voirie:'🛣️', Eclairage:'💡', Proprete:'🗑️', 'Espaces verts':'🌿',
  Reseaux:'💧', Signalisation:'🚦', Administratif:'🏛️', Suggestions:'💡',
}

const PRI: Record<string,{label:string;color:string;bg:string;dot:string}> = {
  haute:   { label:'Haute',   color:'#EF4444', bg:'#FEF2F2', dot:'#EF4444' },
  moyenne: { label:'Moyenne', color:'#F59E0B', bg:'#FFFBEB', dot:'#F59E0B' },
  basse:   { label:'Basse',   color:'#10B981', bg:'#F0FDF4', dot:'#10B981' },
}

const MOCK_ALL = [
  // To assign (assignee_chef)
  { id:'1', ref_citoyen:'SV-22-04-26-0042', ref_service:'VR-22-04-26-0042',
    title:'Nid-de-poule dangereux Av. Bourguiba', category:'Voirie',
    status:'assignee_chef', priority:'haute', delegation:'Sousse Ville',
    chef:'Karim Mansour', agent:null, votes:47, date:'22/04', rating:null,
    image:'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=120&q=70' },
  { id:'2', ref_citoyen:'SJ-19-04-26-0027', ref_service:'ST-19-04-26-0027',
    title:'Signalisation manquante carrefour Jawhara', category:'Signalisation',
    status:'assignee_chef', priority:'haute', delegation:'Sousse Jawhara',
    chef:'Nadia Rekik', agent:null, votes:22, date:'19/04', rating:null, image:null },
  // In progress
  { id:'3', ref_citoyen:'SV-20-04-26-0031', ref_service:'PD-20-04-26-0031',
    title:"Dépôt sauvage derrière le marché", category:'Proprete',
    status:'en_cours', priority:'moyenne', delegation:'Sousse Ville',
    chef:'Mohamed Chaabani', agent:'Riadh Hamdi', votes:14, date:'20/04', rating:null,
    image:'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=120&q=70' },
  { id:'4', ref_citoyen:'SA-18-04-26-0022', ref_service:'EA-18-04-26-0022',
    title:"Fuite d'eau importante Rue Ibn Sina", category:'Reseaux',
    status:'assignee_agent', priority:'haute', delegation:'Sousse SA',
    chef:'Karim Jomaa', agent:'Sami Mansour', votes:29, date:'18/04', rating:null,
    image:'https://images.unsplash.com/photo-1517409217698-3165b4c42407?w=120&q=70' },
  { id:'5', ref_citoyen:'SJ-21-04-26-0038', ref_service:'EP-21-04-26-0038',
    title:'Câble électrique exposé Rue de Marseille', category:'Eclairage',
    status:'en_cours', priority:'haute', delegation:'Sousse Jawhara',
    chef:'Sonia Dridi', agent:'Imen Ghrabi', votes:38, date:'21/04', rating:null,
    image:'https://images.unsplash.com/photo-1544983050-8b1b6d05ebcd?w=120&q=70' },
  // In review (resolue)
  { id:'6', ref_citoyen:'SJ-15-04-26-0018', ref_service:'EV-15-04-26-0018',
    title:'Arbre tombé bloque la rue principale', category:'Espaces verts',
    status:'resolue', priority:'haute', delegation:'Sousse Jawhara',
    chef:'Leila Bouzid', agent:'Amira Trabelsi', votes:22, date:'15/04', rating:null,
    image:'https://images.unsplash.com/photo-1590680193854-47fca385a484?w=120&q=70' },
  { id:'7', ref_citoyen:'SV-14-04-26-0015', ref_service:'VR-14-04-26-0015',
    title:'Affaissement de chaussée Rue Farhat Hached', category:'Voirie',
    status:'resolue', priority:'moyenne', delegation:'Sousse Ville',
    chef:'Karim Mansour', agent:'Aymen Ben Ali', votes:19, date:'14/04', rating:null, image:null },
  // Done (cloturee)
  { id:'8', ref_citoyen:'SV-10-04-26-0009', ref_service:'EP-10-04-26-0009',
    title:'Lampadaires en panne Av. Mohamed V', category:'Eclairage',
    status:'cloturee', priority:'basse', delegation:'Sousse Ville',
    chef:'Sonia Dridi', agent:'Imen Ghrabi', votes:8, date:'10/04', rating:4.5,
    image:'https://images.unsplash.com/photo-1506804886640-ed0e47018318?w=120&q=70' },
  { id:'9', ref_citoyen:'SJ-08-04-26-0007', ref_service:'PD-08-04-26-0007',
    title:'Bacs ordures débordants Cité Erriadh', category:'Proprete',
    status:'cloturee', priority:'moyenne', delegation:'Sousse Jawhara',
    chef:'Mohamed Chaabani', agent:'Riadh Hamdi', votes:16, date:'08/04', rating:3.5, image:null },
  // Rejected
  { id:'10', ref_citoyen:'SA-16-04-26-0020', ref_service:'VR-16-04-26-0020',
    title:'Route dégradée Zone Industrielle SA', category:'Voirie',
    status:'refusee_chef', priority:'moyenne', delegation:'Sousse SA',
    chef:'Karim Mansour', agent:null, votes:11, date:'16/04', rating:null, image:null },
]

interface Decl {
  id:string; ref_citoyen:string; ref_service:string|null; title:string
  category:string; status:string; priority:string; delegation:string
  chef:string|null; agent:string|null; votes:number; date:string
  rating:number|null; image?:string|null
}

// ── Table header ─────────────────────────────────────────────────────────────
function TableHead() {
  return (
    <div className="grid items-center gap-4 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50"
      style={{ gridTemplateColumns:'20px 1fr 130px 130px 100px 80px 80px 70px 80px' }}>
      <input type="checkbox" className="rounded"/>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Déclaration</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Catégorie</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chef de Service</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agent</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Priorité</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Votes</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Note</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">···</span>
    </div>
  )
}

// ── Table row ─────────────────────────────────────────────────────────────────
function TableRow({ d }: { d: Decl }) {
  const pri     = PRI[d.priority] || PRI['moyenne']
  const dColor  = DEPT_COLORS[d.category] || '#64748B'
  const dIcon   = DEPT_ICONS[d.category]  || '📋'

  return (
    <div className="grid items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-0"
      style={{ gridTemplateColumns:'20px 1fr 130px 130px 100px 80px 80px 70px 80px' }}>

      {/* Checkbox */}
      <input type="checkbox" className="rounded"/>

      {/* Title */}
      <div className="flex items-center gap-3 min-w-0">
        {d.image ? (
          <img src={d.image} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-slate-100"/>
        ) : (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
            style={{ background:`${dColor}15` }}>
            {dIcon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0A1628] truncate leading-snug">{d.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono text-slate-400">{d.ref_citoyen}</span>
            {d.ref_service && (
              <span className="text-[10px] font-mono text-blue-400">{d.ref_service}</span>
            )}
            <span className="text-[10px] text-slate-300">· {d.date}</span>
          </div>
        </div>
      </div>

      {/* Category */}
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full w-fit"
        style={{ background:`${dColor}15`, color:dColor }}>
        {dIcon} {d.category}
      </span>

      {/* Chef */}
      <div className="flex items-center gap-2 min-w-0">
        {d.chef ? (
          <>
            <div className="w-6 h-6 rounded-full bg-[#1557FF] flex items-center justify-center text-[9px] font-black text-white flex-shrink-0">
              {d.chef.split(' ').map(w=>w[0]).join('').slice(0,2)}
            </div>
            <span className="text-xs font-semibold text-slate-700 truncate">{d.chef.split(' ')[0]}</span>
          </>
        ) : (
          <span className="text-xs text-slate-300 font-medium">—</span>
        )}
      </div>

      {/* Agent */}
      <div className="flex items-center gap-2 min-w-0">
        {d.agent ? (
          <>
            <div className="w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center text-[9px] font-black text-white flex-shrink-0">
              {d.agent.split(' ').map(w=>w[0]).join('').slice(0,2)}
            </div>
            <span className="text-xs font-semibold text-slate-700 truncate">{d.agent.split(' ')[0]}</span>
          </>
        ) : (
          <span className="text-xs text-slate-300 font-medium">—</span>
        )}
      </div>

      {/* Priority */}
      <div className="flex justify-center">
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
          style={{ background:pri.bg, color:pri.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background:pri.dot }}/>
          {pri.label}
        </span>
      </div>

      {/* Votes */}
      <div className="flex flex-col items-center">
        <span className="text-sm font-black text-[#1557FF]">{d.votes}</span>
      </div>

      {/* Rating */}
      <div className="flex items-center justify-center gap-0.5">
        {d.rating ? (
          <span className="text-xs font-black text-yellow-500 flex items-center gap-1">
            ⭐ {d.rating}
          </span>
        ) : (
          <span className="text-[10px] text-slate-300">—</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-[#1557FF] flex items-center justify-center transition-all">
          <Eye className="w-3.5 h-3.5"/>
        </button>
        <button className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all">
          <MoreHorizontal className="w-3.5 h-3.5"/>
        </button>
      </div>
    </div>
  )
}

// ── Group section ─────────────────────────────────────────────────────────────
function GroupSection({
  group, decls, defaultOpen = true, search
}: {
  group: typeof GROUPS[0]; decls: Decl[]; defaultOpen?: boolean; search: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  const filtered = decls.filter(d =>
    !search ||
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.ref_citoyen.toLowerCase().includes(search.toLowerCase())
  )

  if (filtered.length === 0 && search) return null

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors group">
        <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600 transition-colors">
          {open ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
        </div>
        <div className="w-1 h-5 rounded-full" style={{ background: group.color }}/>
        <span className="text-sm font-black text-[#0A1628]">{group.label}</span>
        <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: group.bg, color: group.color }}>
          {filtered.length}
        </span>
        <span className="text-xs text-slate-400 font-medium ml-1 hidden sm:block">{group.desc}</span>
        <button className="ml-auto w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all"
          onClick={e => e.stopPropagation()}>
          <Plus className="w-3.5 h-3.5"/>
        </button>
      </button>

      {/* Table */}
      {open && filtered.length > 0 && (
        <div className="ml-7 mb-3 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <TableHead/>
          {filtered.map(d => <TableRow key={d.id} d={d}/>)}

          {/* Group footer */}
          <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400">
              {filtered.length} déclaration{filtered.length>1?'s':''}
            </span>
            {group.key === 'rejected' && (
              <Link to="/president/incoming"
                className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1">
                Réaffecter toutes <ChevronRight className="w-3 h-3"/>
              </Link>
            )}
          </div>
        </div>
      )}

      {open && filtered.length === 0 && !search && (
        <div className="ml-7 mb-3 bg-white rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center">
          <p className="text-xs font-semibold text-slate-300">Aucune déclaration dans ce statut</p>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const PresidentSuivi: React.FC = () => {
  const [decls,   setDecls]   = useState<Decl[]>(MOCK_ALL)
  const [search,  setSearch]  = useState('')
  const [catF,    setCatF]    = useState('Tous')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/president/declarations?limit=100`, {
          headers: { Authorization:`Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.declarations?.length) {
            setDecls(data.declarations
              .filter((d:any) => d.status !== 'soumise')
              .map((d:any) => ({
                id:          d.id,
                ref_citoyen: d.ref_citoyen || '—',
                ref_service: d.ref_service || null,
                title:       d.title,
                category:    d.category || 'Voirie',
                status:      d.status,
                priority:    d.priority || 'moyenne',
                delegation:  d.delegation_name || 'Sousse Ville',
                chef:        d.chef_name || null,
                agent:       d.agent_name || null,
                votes:       d.votes_count || 0,
                date:        new Date(d.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}),
                rating:      d.avg_rating || null,
                image:       d.image_url || null,
              }))
            )
          }
        }
      } catch(_) {}
      setLoading(false)
    }
    load()
  }, [])

  const filteredDecls = decls.filter(d => {
    if (catF !== 'Tous' && d.category !== catF) return false
    return true
  })

  const totalByGroup = GROUPS.reduce((acc, g) => {
    acc[g.key] = filteredDecls.filter(d => g.statuses.includes(d.status)).length
    return acc
  }, {} as Record<string,number>)

  return (
    <PresidentLayout title="Suivi des Déclarations">
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#0A1628]">Suivi des Déclarations</h1>
          <p className="text-sm text-slate-400 mt-1">Vue d'ensemble de toutes les déclarations en cours de traitement</p>
        </div>
        <div className="flex gap-2">
          <Link to="/president/incoming"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-slate-300 transition-all">
            📥 Nouvelles déclarations
          </Link>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-slate-300 transition-all">
            <Download className="w-4 h-4"/> Exporter
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-slate-300 transition-all">
            <RefreshCw className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {GROUPS.map(g => (
          <div key={g.key}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all"
            style={{ borderColor:`${g.color}30`, background:g.bg, color:g.color }}>
            <span style={{ color:g.color }}>{g.icon}</span>
            {g.label}
            <span className="font-black">{totalByGroup[g.key] || 0}</span>
          </div>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-2 mb-5 bg-white border border-slate-100 rounded-2xl p-3">
        <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Chercher par titre ou référence..."
            className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none flex-1"/>
          {search && (
            <button onClick={()=>setSearch('')} className="text-slate-400 hover:text-slate-600">
              <XCircle className="w-3.5 h-3.5"/>
            </button>
          )}
        </div>
        <div className="relative">
          <select value={catF} onChange={e=>setCatF(e.target.value)}
            className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-sm font-semibold text-slate-600 outline-none cursor-pointer">
            <option>Tous</option>
            {Object.keys(DEPT_COLORS).map(c=><option key={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-400 pointer-events-none"/>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all">
          <Filter className="w-4 h-4"/> Plus de filtres
        </button>
      </div>

      {/* Groups */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-[#1557FF] rounded-full animate-spin"/>
        </div>
      ) : (
        <div>
          {GROUPS.map((group, i) => (
            <GroupSection
              key={group.key}
              group={group}
              decls={filteredDecls.filter(d => group.statuses.includes(d.status))}
              defaultOpen={i < 3}
              search={search}
            />
          ))}
        </div>
      )}
    </div>
    </PresidentLayout>
  )
}

export default PresidentSuivi
