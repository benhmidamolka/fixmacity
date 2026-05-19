// src/pages/Chef/ChefDeclarations.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Search, Plus, X, ChevronUp, ChevronDown, ChevronsUpDown,
  ArrowUp, ArrowRight, ArrowDown, CheckCircle2, Clock,
  AlertCircle, XCircle, MoreHorizontal,
  UserCheck, RefreshCw, Download, Eye, Check, RotateCcw,
  Loader2, ChevronLeft, ChevronRight, Shield, AlertTriangle,
  Send, Brain, MapPin, ThumbsUp, Camera, Zap, Info,
  Activity, TrendingUp, School, Heart
} from 'lucide-react'
import ChefLayout from '../../layouts/ChefLayout'
import AIPriorityPanel from '../President/AIPriorityPanel'

const API   = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok   = () => localStorage.getItem('fmc_token') || ''
const hdr   = () => ({ Authorization: `Bearer ${tok()}` })
const hjson = () => ({ ...hdr(), 'Content-Type': 'application/json' })

// ── Types ─────────────────────────────────────────────────────────────────────
interface Decl {
  id: string
  ref_citoyen: string
  ref_service: string | null
  title: string
  description: string
  category: string
  status: string
  priority: string
  priority_score: number
  votes_count: number
  created_at: string
  assigned_at: string | null
  resolved_at: string | null
  address: string | null
  agent_id: string | null
  photo_avant: string | null
  photo_url?: string | null
  users?: { first_name: string; last_name: string } | null
  has_photo?: boolean
  near_sensitive?: boolean
  sensitive_place?: string
}
interface Agent {
  id: string
  first_name: string
  last_name: string
  is_active: boolean
  workload: number
  resolved_count: number
  is_overloaded: boolean
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Sk = ({ w = 'w-full', h = 'h-4', r = 'rounded-lg' }: { w?: string; h?: string; r?: string }) => (
  <div className={`${w} ${h} ${r} bg-slate-100 dark:bg-slate-800 animate-pulse`} />
)

// ── Priority helpers ──────────────────────────────────────────────────────────
function getPriorityIcon(p: string) {
  const lo = p?.toLowerCase()
  if (['haute','high','urgent','urgente'].includes(lo)) return <ArrowUp size={12} className="text-red-500" />
  if (['moyenne','medium'].includes(lo)) return <ArrowRight size={12} className="text-amber-500" />
  return <ArrowDown size={12} className="text-green-500" />
}

function getPriorityLabel(p: string) {
  const lo = p?.toLowerCase()
  if (['haute','high','urgent','urgente'].includes(lo)) return { label: 'HIGH',   color: '#dc2626', bg: '#fee2e2' }
  if (['moyenne','medium'].includes(lo))                return { label: 'MEDIUM', color: '#d97706', bg: '#fef3c7' }
  return                                                       { label: 'LOW',    color: '#16a34a', bg: '#dcfce7' }
}

function getStatusCfg(s: string) {
  const n = s?.toLowerCase()
  if (['assignee_chef','refusee_agent'].includes(n)) return { label:'En attente',    color:'#7c3aed', bg:'#f5f3ff', dot:'#7c3aed' }
  if (['assignee_agent','en_cours'].includes(n))     return { label:'En cours',      color:'#1d4ed8', bg:'#eff6ff', dot:'#1d4ed8' }
  if (['resolue','evaluee'].includes(n))             return { label:'Évaluée',       color:'#15803d', bg:'#f0fdf4', dot:'#15803d' }
  if (n === 'cloturee')                              return { label:'Clôturée',      color:'#475569', bg:'#f8fafc', dot:'#475569' }
  if (n === 'refusee_chef')                          return { label:'Refusée (Chef)',color:'#dc2626', bg:'#fef2f2', dot:'#dc2626' }
  return                                                    { label: s,              color:'#64748b', bg:'#f1f5f9', dot:'#94a3b8' }
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
}

function getCatEmoji(cat?: string) {
  const m: Record<string,string> = {
    'Voirie':'🛣️','Éclairage Public':'💡','Propreté':'🗑️',
    'Espaces Verts':'🌿','Réseaux':'💧','Signalisation':'🚦',
    'Administratif':'🏢','Suggestions':'💬'
  }
  return cat ? (m[cat] || '📌') : '📌'
}

// ─────────────────────────────────────────────────────────────────────────────
// ── AI PRIORITY SCORE PANEL ───────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
interface PriorityFactor {
  key: string
  label: string
  icon: React.ReactNode
  value: number    // 0-100 contribution to score
  weight: number   // display weight %
  active: boolean
  detail: string
  color: string
}



// ─────────────────────────────────────────────────────────────────────────────
// ── MODALS ────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function AcceptModal({ decl, agents, onClose, onDone }: {
  decl: Decl; agents: Agent[]; onClose: () => void; onDone: () => void
}) {
  const [agentId, setAgentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState<string|null>(null)
  const [error,   setError]   = useState<string|null>(null)
  const active  = agents.filter(a => a.is_active)
  const maxTasks = parseInt(localStorage.getItem('fmc_max_tasks') || '5')

  const go = async () => {
    if (!agentId) { setError('Sélectionnez un agent.'); return }
    setLoading(true); setError(null)
    const res = await fetch(`${API}/chef/declarations/${decl.id}/accept`,{
      method:'POST', headers:hjson(), body:JSON.stringify({ agent_id:agentId })
    }).catch(()=>null)
    if (!res) { setLoading(false); setError('Erreur réseau.'); return }
    const d = await res.json()
    if (!res.ok) { setLoading(false); setError(d.error||'Erreur.'); return }
    if (d.warning) setWarning(d.warning)
    setTimeout(() => { onDone(); onClose() }, d.warning ? 1500 : 400)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{background:'rgba(10,22,40,.55)',backdropFilter:'blur(6px)'}} onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <UserCheck size={16} className="text-emerald-600 dark:text-emerald-400"/>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Accepter et assigner</p>
              <p className="text-[10px] text-slate-400 truncate max-w-52">{decl.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600"><X size={13}/></button>
        </div>

        <div className="p-5 space-y-3">
          {active.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
              <p className="text-xs font-bold text-slate-400">Aucun agent actif disponible</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {active.map(a => {
                const overloaded = a.workload >= maxTasks
                return (
                  <label key={a.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      agentId===a.id ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 bg-white dark:bg-slate-900'
                    }`}>
                    <input type="radio" name="agent" value={a.id} checked={agentId===a.id} onChange={()=>setAgentId(a.id)} className="sr-only"/>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white flex-shrink-0"
                      style={{background: overloaded?'#ef4444':'#3b82f6'}}>
                      {a.first_name[0]}{a.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{a.first_name} {a.last_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width:`${Math.min(100,(a.workload/maxTasks)*100)}%`,
                            background: overloaded?'#ef4444':a.workload>=Math.ceil(maxTasks/2)?'#f59e0b':'#22c55e'
                          }}/>
                        </div>
                        <span className="text-[10px] text-slate-400">{a.workload}/{maxTasks}</span>
                      </div>
                    </div>
                    {overloaded && <span className="text-[9px] font-black text-red-500 border border-red-200 rounded-full px-1.5 py-0.5">Chargé</span>}
                    {agentId===a.id && <Check size={15} className="text-emerald-500 flex-shrink-0"/>}
                  </label>
                )
              })}
            </div>
          )}
          {warning && <div className="flex gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700"><AlertTriangle size={13} className="flex-shrink-0 mt-0.5"/>{warning}</div>}
          {error   && <div className="flex gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700"><AlertCircle size={13} className="flex-shrink-0 mt-0.5"/>{error}</div>}
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50">Annuler</button>
          <button onClick={go} disabled={loading||!agentId||active.length===0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-40 transition-all">
            {loading ? <Loader2 size={14} className="animate-spin"/> : <><UserCheck size={14}/> Assigner</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function RefuseModal({ decl, onClose, onDone }: { decl:Decl; onClose:()=>void; onDone:()=>void }) {
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string|null>(null)

  const go = async () => {
    if (!reason.trim()) { setError('Motif obligatoire.'); return }
    setLoading(true)
    const res = await fetch(`${API}/chef/declarations/${decl.id}/refuse`,{
      method:'POST', headers:hjson(), body:JSON.stringify({ reason })
    }).catch(()=>null)
    if (!res||!res.ok) { setLoading(false); setError('Erreur.'); return }
    onDone(); onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{background:'rgba(10,22,40,.55)',backdropFilter:'blur(6px)'}} onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center"><XCircle size={16} className="text-red-500"/></div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Refuser le dossier</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400"><X size={13}/></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 rounded-xl p-3 text-xs text-red-700 dark:text-red-400">Le Président sera notifié et pourra réassigner ce dossier.</div>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={4}
            placeholder="Motif du refus (obligatoire)…"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-400 resize-none text-slate-700 dark:text-slate-300 placeholder-slate-400"/>
          {error && <div className="text-xs text-red-500 font-bold">{error}</div>}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuler</button>
          <button onClick={go} disabled={loading||!reason.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm disabled:opacity-40">
            {loading ? <Loader2 size={14} className="animate-spin"/> : <><XCircle size={14}/> Refuser</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── FILTER DROPDOWN ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function FilterDropdown({ label, options, value, onChange, searchable }: {
  label:string; options:{value:string;label:string;icon?:React.ReactNode;color?:string}[]
  value:string; onChange:(v:string)=>void; searchable?:boolean
}) {
  const [open,setOpen] = useState(false)
  const [q,setQ]       = useState('')
  const ref            = useRef<HTMLDivElement>(null)
  const active         = value !== 'all'

  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h)
  },[])

  const filtered = options.filter(o=>!q||o.label.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="relative" ref={ref}>
      <button onClick={()=>setOpen(!open)}
        className={`flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 rounded-full border text-xs font-bold transition-all ${
          active ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
        }`}>
        {active ? <X size={11} onClick={e=>{e.stopPropagation();onChange('all');setOpen(false)}} className="hover:opacity-70"/> : <Plus size={11}/>}
        {label}
        {active && <span className="ml-0.5 bg-white/20 dark:bg-black/20 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">1</span>}
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-40 w-52 py-2 overflow-hidden">
          {searchable && (
            <div className="px-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Search size={12} className="text-slate-400 flex-shrink-0"/>
                <input value={q} onChange={e=>setQ(e.target.value)} autoFocus placeholder={`Filter ${label}…`}
                  className="flex-1 text-xs bg-transparent outline-none text-slate-700 dark:text-slate-300 placeholder-slate-400"/>
              </div>
            </div>
          )}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.map(opt=>(
              <button key={opt.value} onClick={()=>{onChange(opt.value);setOpen(false);setQ('')}}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold transition-colors ${
                  value===opt.value ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}>
                {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
                {opt.color && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:opt.color}}/>}
                {opt.label}
                {value===opt.value && <Check size={12} className="ml-auto"/>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SortIcon({ col, sort }: { col:string; sort:{col:string;dir:'asc'|'desc'} }) {
  if (sort.col!==col) return <ChevronsUpDown size={12} className="text-slate-300 dark:text-slate-600"/>
  return sort.dir==='asc' ? <ChevronUp size={12} className="text-slate-600 dark:text-slate-300"/> : <ChevronDown size={12} className="text-slate-600 dark:text-slate-300"/>
}

// ─────────────────────────────────────────────────────────────────────────────
// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const ChefDeclarations: React.FC = () => {
  const navigate    = useNavigate()
  const { id: routeId } = useParams<{ id?: string }>()
  const [declarations, setDeclarations] = useState<Decl[]>([])
  const [agents,       setAgents]       = useState<Agent[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<'en_attente'|'en_cours'|'evaluee'|'cloturee'>('en_attente')
  const [prioFilter,   setPrioFilter]   = useState('all')
  const [agentFilter,  setAgentFilter]  = useState('all')
  const [sort,         setSort]         = useState<{col:string;dir:'asc'|'desc'}>({col:'created_at',dir:'desc'})
  const [selected,     setSelected]     = useState<string[]>([])
  const [acceptTarget, setAcceptTarget] = useState<Decl|null>(null)
  const [refuseTarget, setRefuseTarget] = useState<Decl|null>(null)
  const [actionMenu,   setActionMenu]   = useState<string|null>(null)
  const [page,         setPage]         = useState(1)
  const [rowsPerPage,  setRowsPerPage]  = useState(10)
  const [colsOpen,     setColsOpen]     = useState(false)
  const [visibleCols,  setVisibleCols]  = useState({ ref:true, project:false, assignee:true, dueDate:true, status:true, priority:true })

  // Detail drawer
  const [detailDecl,        setDetailDecl]        = useState<any|null>(null)
  const [photos,            setPhotos]            = useState<any[]>([])
  const [history,           setHistory]           = useState<any[]>([])
  const [comments,          setComments]          = useState<any[]>([])
  const [detailLoading,     setDetailLoading]     = useState(false)
  const [activeTab,         setActiveTab]         = useState<'info'|'assign'|'history'|'comments'>('info')
  const [commentText,       setCommentText]       = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [selectedAgentIds,  setSelectedAgentIds]  = useState<string[]>([])
  const [assignLoading,     setAssignLoading]     = useState(false)

  const maxTasks = parseInt(localStorage.getItem('fmc_max_tasks')||'5')

  const load = useCallback(async () => {
    setLoading(true)
    const [dRes, aRes] = await Promise.all([
      fetch(`${API}/chef/declarations?limit=200`,{headers:hdr()}),
      fetch(`${API}/chef/agents`,{headers:hdr()}),
    ])
    if (dRes.ok) { const d=await dRes.json(); setDeclarations(Array.isArray(d)?d:d.declarations||[]) }
    if (aRes.ok) { const d=await aRes.json(); setAgents(d.agents||[]) }
    setLoading(false)
  },[])

  const fetchDetail = useCallback(async (declId:string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`${API}/chef/declarations/${declId}`,{headers:hdr()})
      if (res.ok) {
        const data = await res.json()
        setDetailDecl(data.declaration||data)
        setPhotos(data.photos||[])
        setHistory(data.history||[])
        setComments(data.comments||[])
        const assigned = data.declaration?.assigned_agents||data.assigned_agents||[]
        setSelectedAgentIds(assigned.map((a:any)=>a.id))
      } else { setDetailDecl(null) }
    } catch(e) { console.error(e) }
    finally { setDetailLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])
  useEffect(()=>{
    if (routeId) { fetchDetail(routeId); setActiveTab('info') }
    else setDetailDecl(null)
  },[routeId,fetchDetail])

  const handleAddComment = async (e:React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()||!routeId) return
    setCommentSubmitting(true)
    try {
      const res = await fetch(`${API}/chef/declarations/${routeId}/comments`,{
        method:'POST', headers:hjson(), body:JSON.stringify({content:commentText.trim(),channel:'interne'})
      })
      if (res.ok) {
        setCommentText('')
        const res2 = await fetch(`${API}/chef/declarations/${routeId}/comments`,{headers:hdr()})
        if (res2.ok) { const d=await res2.json(); setComments(d.comments||[]) }
      }
    } catch(err){console.error(err)} finally{setCommentSubmitting(false)}
  }

  const handleSaveAssignment = async () => {
    if (!routeId) return
    setAssignLoading(true)
    try {
      const res = await fetch(`${API}/chef/declarations/${routeId}/reassign`,{
        method:'PATCH', headers:hjson(), body:JSON.stringify({agent_ids:selectedAgentIds})
      })
      if (res.ok) { const d=await res.json(); setDetailDecl((prev:any)=>prev?{...prev,...d.declaration,assigned_agents:d.assigned_agents}:null); await fetchDetail(routeId); load() }
    } catch(err){console.error(err)} finally{setAssignLoading(false)}
  }

  const handleExport = async () => {
    const res = await fetch(`${API}/chef/export`,{headers:hdr()}).catch(()=>null)
    if (!res?.ok) return
    const blob=await res.blob(); const url=URL.createObjectURL(blob)
    const a=document.createElement('a'); a.href=url; a.download=`declarations-chef-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const prioOpts = [
    {value:'all',label:'Toutes'},
    {value:'haute',   label:'High',   icon:<ArrowUp size={11} className="text-red-500"/>},
    {value:'moyenne', label:'Medium', icon:<ArrowRight size={11} className="text-amber-500"/>},
    {value:'basse',   label:'Low',    icon:<ArrowDown size={11} className="text-green-500"/>},
  ]
  const agentOpts = [
    {value:'all',label:'Tous les agents'},
    {value:'unassigned',label:'Non assignés'},
    ...agents.map(a=>({value:a.id,label:`${a.first_name} ${a.last_name}`}))
  ]

  const counts = {
    en_attente: declarations.filter(d=>['assignee_chef','soumise','en_attente','refusee_agent'].includes(d.status?.toLowerCase())).length,
    en_cours:   declarations.filter(d=>['assignee_agent','en_cours'].includes(d.status?.toLowerCase())).length,
    evaluee:    declarations.filter(d=>['resolue','evaluee'].includes(d.status?.toLowerCase())).length,
    cloturee:   declarations.filter(d=>['cloturee'].includes(d.status?.toLowerCase())).length,
  }

  const filtered = declarations.filter(d=>{
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !(d.ref_citoyen||'').toLowerCase().includes(search.toLowerCase())) return false
    const n=d.status?.toLowerCase()
    if (statusFilter==='en_attente' && !['assignee_chef','soumise','en_attente','refusee_agent'].includes(n)) return false
    if (statusFilter==='en_cours'   && !['assignee_agent','en_cours'].includes(n)) return false
    if (statusFilter==='evaluee'    && !['resolue','evaluee'].includes(n)) return false
    if (statusFilter==='cloturee'   && n!=='cloturee') return false
    if (prioFilter!=='all') {
      const lo=d.priority?.toLowerCase()
      if (prioFilter==='haute'   && !['haute','high','urgent','urgente'].includes(lo)) return false
      if (prioFilter==='moyenne' && !['moyenne','medium'].includes(lo)) return false
      if (prioFilter==='basse'   && !['basse','low'].includes(lo)) return false
    }
    if (agentFilter!=='all') {
      if (agentFilter==='unassigned' && d.agent_id) return false
      if (agentFilter!=='unassigned' && d.agent_id!==agentFilter) return false
    }
    return true
  }).sort((a,b)=>{
    let av:any=a[sort.col as keyof Decl]??''; let bv:any=b[sort.col as keyof Decl]??''
    if (typeof av==='string') av=av.toLowerCase(); if (typeof bv==='string') bv=bv.toLowerCase()
    return sort.dir==='asc'?(av>bv?1:-1):(av<bv?1:-1)
  })

  const totalPages = Math.ceil(filtered.length/rowsPerPage)
  const paginated  = filtered.slice((page-1)*rowsPerPage, page*rowsPerPage)
  const anyActive  = statusFilter!=='en_attente'||prioFilter!=='all'||agentFilter!=='all'||search!==''

  const toggleSort = (col:string) => setSort(s=>s.col===col?{col,dir:s.dir==='asc'?'desc':'asc'}:{col,dir:'asc'})
  const agentName  = (d:Decl) => { if(d.users) return `${d.users.first_name} ${d.users.last_name}`; const a=agents.find(ag=>ag.id===d.agent_id); return a?`${a.first_name} ${a.last_name}`:null }
  const ini        = (n:string) => n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const COLORS     = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ec4899','#8b5cf6','#ef4444','#14b8a6']
  const agentColor = (id:string) => COLORS[agents.findIndex(a=>a.id===id)%COLORS.length]||'#6366f1'

  return (
    <ChefLayout title="Toutes les déclarations">
      <div className="flex flex-col h-full min-h-0 bg-white dark:bg-slate-950">

        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">Toutes les Déclarations</h1>
              <p className="text-sm text-slate-400 mt-0.5">Liste des déclarations de votre département.</p>
            </div>
            <button onClick={()=>navigate('/chef/tasks')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 rounded-xl text-sm font-bold transition-all shadow-sm">
              <Plus size={15}/> Mes Tâches
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(['en_attente','en_cours','evaluee','cloturee'] as const).map(tab=>{
              const labels = {en_attente:'En attente',en_cours:'En cours',evaluee:'Évaluées',cloturee:'Clôturées'}
              const colors = {
                en_attente:'border-[#7c3aed]/20 text-[#7c3aed] bg-[#f5f3ff] dark:bg-[#7c3aed]/10',
                en_cours:'border-blue-600/20 text-blue-600 bg-blue-50/50 dark:bg-blue-500/10',
                evaluee:'border-emerald-600/20 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-500/10',
                cloturee:'border-slate-500/20 text-slate-600 bg-slate-50 dark:bg-slate-500/10'
              }
              const isActive = statusFilter===tab
              return (
                <button key={tab} onClick={()=>{setStatusFilter(tab);setPage(1)}}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border transition-all ${
                    isActive ? `${colors[tab]} font-black shadow-sm ring-1 ring-current/10` : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 bg-transparent'
                  }`}>
                  <span className="text-xs font-bold">{labels[tab]}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isActive?'bg-white/90 dark:bg-black/30 text-current':'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {counts[tab]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 px-6 py-3 flex items-center gap-2 flex-wrap border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Filtrer…"
              className="pl-8 pr-4 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full outline-none focus:border-slate-400 w-48 text-slate-700 dark:text-slate-300 placeholder-slate-400"/>
          </div>
          <FilterDropdown label="Priorité" options={prioOpts.filter(o=>o.value!=='all')} value={prioFilter} onChange={v=>{setPrioFilter(v);setPage(1)}} searchable/>
          <FilterDropdown label="Agent"    options={agentOpts.filter(o=>o.value!=='all')} value={agentFilter} onChange={v=>{setAgentFilter(v);setPage(1)}} searchable/>
          {anyActive && (
            <button onClick={()=>{setStatusFilter('en_attente');setPrioFilter('all');setAgentFilter('all');setSearch('');setPage(1)}}
              className="flex items-center gap-1.5 pl-3 pr-3 py-1.5 rounded-full border border-slate-200 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 hover:border-slate-300">
              Reset <X size={11}/>
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={load} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 transition-all">
              <RefreshCw size={13} className={loading?'animate-spin':''}/>
            </button>
            <button onClick={handleExport} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 transition-all">
              <Download size={13}/>
            </button>
            <div className="relative">
              <button onClick={()=>setColsOpen(!colsOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-400 hover:border-slate-300">
                Colonnes <ChevronDown size={11}/>
              </button>
              {colsOpen && (
                <div className="absolute top-full mt-1.5 right-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-40 w-44 py-2">
                  {Object.entries({ref:'Référence',project:'Projet',assignee:'Agent assigné',dueDate:'Date soumission',status:'Statut',priority:'Priorité'}).map(([k,v])=>(
                    <label key={k} className="flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <input type="checkbox" checked={visibleCols[k as keyof typeof visibleCols]} onChange={e=>setVisibleCols(p=>({...p,[k]:e.target.checked}))} className="w-3.5 h-3.5 accent-blue-600 rounded"/>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{v}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={selected.length===paginated.length&&paginated.length>0}
                    onChange={e=>setSelected(e.target.checked?paginated.map(d=>d.id):[]) } className="w-3.5 h-3.5 accent-blue-600 rounded"/>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer" onClick={()=>toggleSort('title')}>
                  <div className="flex items-center gap-1">Titre <SortIcon col="title" sort={sort}/></div>
                </th>
                {visibleCols.ref && <th className="px-4 py-3 text-left cursor-pointer" onClick={()=>toggleSort('ref_citoyen')}><div className="flex items-center gap-1">Réf. <SortIcon col="ref_citoyen" sort={sort}/></div></th>}
                {visibleCols.assignee && <th className="px-4 py-3 text-left">Agent assigné</th>}
                {visibleCols.dueDate && <th className="px-4 py-3 text-left cursor-pointer" onClick={()=>toggleSort('created_at')}><div className="flex items-center gap-1">Date <SortIcon col="created_at" sort={sort}/></div></th>}
                {visibleCols.status && <th className="px-4 py-3 text-left cursor-pointer" onClick={()=>toggleSort('status')}><div className="flex items-center gap-1">Statut <SortIcon col="status" sort={sort}/></div></th>}
                {visibleCols.priority && (
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={()=>toggleSort('priority_score')}>
                    <div className="flex items-center gap-1">Priorité <Brain size={10} className="text-purple-500"/><SortIcon col="priority_score" sort={sort}/></div>
                  </th>
                )}
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {loading ? (
                [...Array(8)].map((_,i)=>(
                  <tr key={i} className="bg-white dark:bg-slate-950">
                    <td className="px-4 py-3.5"><Sk w="w-4" h="h-4"/></td>
                    <td className="px-4 py-3.5"><div className="space-y-1.5"><Sk h="h-4" w="w-48"/><Sk h="h-3" w="w-32"/></div></td>
                    {visibleCols.ref&&<td className="px-4 py-3.5"><Sk h="h-4" w="w-24"/></td>}
                    {visibleCols.assignee&&<td className="px-4 py-3.5"><Sk h="h-6" w="w-20" r="rounded-full"/></td>}
                    {visibleCols.dueDate&&<td className="px-4 py-3.5"><Sk h="h-4" w="w-28"/></td>}
                    {visibleCols.status&&<td className="px-4 py-3.5"><Sk h="h-6" w="w-24" r="rounded-full"/></td>}
                    {visibleCols.priority&&<td className="px-4 py-3.5"><Sk h="h-6" w="w-20" r="rounded-full"/></td>}
                    <td className="px-4 py-3.5"><Sk w="w-6" h="h-6" r="rounded-lg"/></td>
                  </tr>
                ))
              ) : paginated.length===0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Search size={20} className="text-slate-300 dark:text-slate-600"/></div>
                    <p className="text-sm font-bold text-slate-400">Aucun résultat.</p>
                  </div>
                </td></tr>
              ) : paginated.map(d=>{
                const sc  = getStatusCfg(d.status)
                const an  = agentName(d)
                const sel = selected.includes(d.id)
                const { score, level } = computeAIPriorityScore(d)
                const scoreColor = score>=75?'#dc2626':score>=45?'#d97706':score>=20?'#1d4ed8':'#475569'
                const scoreBg    = score>=75?'#fee2e2':score>=45?'#fef3c7':score>=20?'#eff6ff':'#f8fafc'

                return (
                  <tr key={d.id}
                    className={`group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer ${sel?'bg-blue-50/40 dark:bg-blue-500/5':'bg-white dark:bg-slate-950'}`}
                    onClick={()=>navigate(`/chef/declarations/${d.id}`)}>
                    <td className="px-4 py-3.5" onClick={e=>e.stopPropagation()}>
                      <input type="checkbox" checked={sel} onChange={()=>setSelected(p=>p.includes(d.id)?p.filter(x=>x!==d.id):[...p,d.id])} className="w-3.5 h-3.5 accent-blue-600 rounded"/>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm flex-shrink-0">{getCatEmoji(d.category)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 transition-colors">{d.title}</p>
                          {d.category && <p className="text-[10px] text-slate-400 truncate">{d.category}</p>}
                        </div>
                      </div>
                    </td>
                    {visibleCols.ref && <td className="px-4 py-3.5"><span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">{d.ref_citoyen||'—'}</span></td>}
                    {visibleCols.assignee && (
                      <td className="px-4 py-3.5" onClick={e=>e.stopPropagation()}>
                        {an ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{background:agentColor(d.agent_id!)}}>
                              {ini(an)}
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-28">{an}</span>
                          </div>
                        ) : d.status==='assignee_chef' ? (
                          <div className="flex items-center gap-2">
                            <button onClick={e=>{e.stopPropagation();setAcceptTarget(d)}}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black border border-emerald-100 hover:bg-emerald-100 transition-all">
                              <UserCheck size={11}/> Accepter
                            </button>
                            <button onClick={e=>{e.stopPropagation();setRefuseTarget(d)}}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-black border border-red-100 hover:bg-red-100 transition-all">
                              <XCircle size={11}/> Refuser
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Non assigné</span>
                        )}
                      </td>
                    )}
                    {visibleCols.dueDate && <td className="px-4 py-3.5"><span className="text-xs text-slate-600 dark:text-slate-400">{fmtDate(d.created_at)}</span></td>}
                    {visibleCols.status && (
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full" style={{color:sc.color,background:sc.bg}}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{background:sc.dot}}/>{sc.label}
                        </span>
                      </td>
                    )}
                    {visibleCols.priority && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full" style={{color:scoreColor,background:scoreBg}}>
                            <Brain size={10}/> {score}
                          </span>
                          <span className="text-[9px] font-black text-slate-400">{level}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3.5" onClick={e=>e.stopPropagation()}>
                      <div className="relative">
                        <button onClick={()=>setActionMenu(actionMenu===d.id?null:d.id)}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
                          <MoreHorizontal size={14}/>
                        </button>
                        {actionMenu===d.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl z-50 w-44 py-1"
                            onMouseLeave={()=>setActionMenu(null)}>
                            <button onClick={()=>{navigate(`/chef/declarations/${d.id}`);setActionMenu(null)}}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                              <Eye size={13}/> Voir le détail
                            </button>
                            {d.status==='assignee_chef' && <>
                              <button onClick={()=>{setAcceptTarget(d);setActionMenu(null)}}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
                                <UserCheck size={13}/> Accepter & Assigner
                              </button>
                              <button onClick={()=>{setRefuseTarget(d);setActionMenu(null)}}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                                <XCircle size={13}/> Refuser
                              </button>
                            </>}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
          <p className="text-xs text-slate-500 font-medium">
            Showing {Math.min((page-1)*rowsPerPage+1,filtered.length)}–{Math.min(page*rowsPerPage,filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Rows per page</span>
              <select value={rowsPerPage} onChange={e=>{setRowsPerPage(+e.target.value);setPage(1)}}
                className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 outline-none text-slate-700 dark:text-slate-300">
                {[10,20,50].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <span className="text-xs text-slate-500">Page {page} of {totalPages||1}</span>
            <div className="flex items-center gap-1">
              {[
                {label:'«',onClick:()=>setPage(1),disabled:page===1},
                {label:'‹',onClick:()=>setPage(p=>Math.max(1,p-1)),disabled:page===1},
                {label:'›',onClick:()=>setPage(p=>Math.min(totalPages,p+1)),disabled:page>=totalPages},
                {label:'»',onClick:()=>setPage(totalPages),disabled:page>=totalPages},
              ].map((btn,i)=>(
                <button key={i} onClick={btn.onClick} disabled={btn.disabled}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all text-xs font-bold">
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail Drawer ── */}
      {routeId && (
        <div className="fixed inset-0 z-50 flex justify-end"
          style={{background:'rgba(10,22,40,.3)',backdropFilter:'blur(4px)'}}
          onClick={()=>navigate('/chef/declarations')}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800"
            onClick={e=>e.stopPropagation()}>

            {detailLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-blue-600"/>
                <p className="text-sm font-bold text-slate-400">Chargement…</p>
              </div>
            ) : detailDecl ? (
              <>
                {/* Drawer header */}
                <div className="flex-shrink-0 px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-lg shadow-sm flex-shrink-0">
                      {getCatEmoji(detailDecl.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-black text-slate-900 dark:text-slate-100 leading-snug truncate max-w-xs">{detailDecl.title}</h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-mono text-[10px] font-black text-blue-600 dark:text-blue-400">{detailDecl.ref_citoyen||'—'}</span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] text-slate-500 font-bold">{fmtDate(detailDecl.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full"
                      style={{color:getStatusCfg(detailDecl.status).color,background:getStatusCfg(detailDecl.status).bg}}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{background:getStatusCfg(detailDecl.status).dot}}/>
                      {getStatusCfg(detailDecl.status).label}
                    </span>
                    <button onClick={()=>navigate('/chef/declarations')}
                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all">
                      <X size={15}/>
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex-shrink-0 flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 gap-5 overflow-x-auto">
                  {[
                    {id:'info',     label:'Détails'},
                    {id:'priority', label:'Priorité'},
                    {id:'assign',   label:'Assignation'},
                    {id:'history',  label:'Historique'},
                    {id:'comments', label:`Commentaires (${comments.length})`},
                  ].map(tab=>(
                    <button key={tab.id} onClick={()=>setActiveTab(tab.id as any)}
                      className={`py-3.5 text-xs font-bold transition-all border-b-2 relative -mb-[2px] whitespace-nowrap ${
                        activeTab===tab.id ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}>
                      {tab.id==='priority' && <Brain size={10} className="inline mr-1 text-purple-500"/>}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/30 dark:bg-slate-900/10">

                  {/* ── INFO TAB ── */}
                  {activeTab==='info' && (
                    <div className="space-y-5">
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Description</h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{detailDecl.description||"Aucune description fournie."}</p>
                        {detailDecl.address && (
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-50 dark:border-slate-800 text-xs text-slate-500">
                            <MapPin size={12}/> {detailDecl.address}
                          </div>
                        )}
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Citoyen</h3>
                        {detailDecl.citizen ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-[10px] font-bold text-slate-400">Nom complet</p><p className="text-sm font-bold text-slate-800 dark:text-slate-200">{detailDecl.citizen.first_name} {detailDecl.citizen.last_name}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400">Email</p><p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{detailDecl.citizen.email}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400">Votes / Soutiens</p><p className="text-sm font-black text-blue-600 dark:text-blue-400">{detailDecl.votes_count||0} citoyen(s)</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400">Téléphone</p><p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{detailDecl.citizen.phone||'—'}</p></div>
                          </div>
                        ) : <p className="text-xs text-slate-400 italic">Informations indisponibles.</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Photo Avant</h4>
                          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            {detailDecl.photo_avant||detailDecl.photo_url
                              ? <img src={detailDecl.photo_avant||detailDecl.photo_url} alt="Avant" className="w-full h-full object-cover"/>
                              : <span className="text-xs font-semibold text-slate-400">Aucune photo</span>}
                          </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Photo Après</h4>
                          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            {detailDecl.photo_apres
                              ? <img src={detailDecl.photo_apres} alt="Après" className="w-full h-full object-cover"/>
                              : <div className="text-center p-3 space-y-1"><Clock size={16} className="text-slate-300 dark:text-slate-600 mx-auto"/><span className="block text-[10px] font-semibold text-slate-400">Non résolue</span></div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── PRIORITY TAB ── */}
                  {activeTab==='priority' && (
                    <div className="space-y-5">
                      <AIPriorityPanel
                        declarationId={detailDecl.id}
                        data={detailDecl}
                        onUpdated={() => {}}
                        readOnly
                        showAnalyzeButton={false}
                      />
                      {/* Raw signals */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-4">Données brutes utilisées par l'IA</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label:'Votes citoyens', value:`${detailDecl.votes_count||0}`, icon:<ThumbsUp size={13}/>, color:'#1557FF', active:(detailDecl.votes_count||0)>0 },
                            { label:'Photo jointe',   value:(detailDecl.photo_avant||detailDecl.photo_url)?'Oui ✓':'Non ✗', icon:<Camera size={13}/>, color:'#7c3aed', active:!!(detailDecl.photo_avant||detailDecl.photo_url) },
                            { label:'Zone sensible',  value:detailDecl.near_sensitive?(detailDecl.sensitive_place||'Oui ✓'):'Aucune', icon:<MapPin size={13}/>, color:'#dc2626', active:!!detailDecl.near_sensitive },
                            { label:'Priorité IA',    value:(detailDecl.priority||'basse').toUpperCase(), icon:<Brain size={13}/>, color:'#d97706', active:['haute','high','urgent','moyenne','medium'].includes(detailDecl.priority?.toLowerCase()) },
                          ].map(item=>(
                            <div key={item.label} className={`flex items-center gap-3 p-3 rounded-xl border ${item.active?'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50':'border-slate-100 dark:border-slate-800/50 opacity-50'}`}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:`${item.color}15`,color:item.color}}>{item.icon}</div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400">{item.label}</p>
                                <p className="text-sm font-black" style={{color:item.active?item.color:'#94a3b8'}}>{item.value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── ASSIGN TAB ── */}
                  {activeTab==='assign' && (
                    <div className="space-y-5">
                      <div className="bg-gradient-to-br from-slate-900 to-slate-950 dark:from-slate-900 dark:to-black rounded-2xl p-5 text-white space-y-3 shadow-xl border border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center"><Shield size={16} className="text-blue-400"/></div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gestion de l'Affectation</p>
                            <p className="text-xs text-slate-300 mt-0.5">Assignez un ou plusieurs agents à ce dossier.</p>
                          </div>
                        </div>
                        {detailDecl.assigned_at && <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">Assignée le: <span className="text-white font-bold">{new Date(detailDecl.assigned_at).toLocaleString('fr-FR')}</span></div>}
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Agents disponibles</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{selectedAgentIds.length} sélectionné(s)</span>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {agents.filter(a=>a.is_active).map(agent=>{
                            const isSel = selectedAgentIds.includes(agent.id)
                            return (
                              <label key={agent.id}
                                className={`flex items-center gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all ${isSel?'border-blue-400 bg-blue-50/40 dark:bg-blue-500/5 dark:border-blue-500':'border-slate-100 dark:border-slate-800 hover:border-slate-200 bg-white dark:bg-slate-900'}`}>
                                <input type="checkbox" checked={isSel} onChange={()=>setSelectedAgentIds(p=>isSel?p.filter(id=>id!==agent.id):[...p,agent.id])} className="w-4 h-4 accent-blue-600 rounded"/>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white flex-shrink-0" style={{background:agent.workload>=maxTasks?'#ef4444':'#3b82f6'}}>{agent.first_name[0]}{agent.last_name[0]}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{agent.first_name} {agent.last_name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{width:`${Math.min(100,(agent.workload/maxTasks)*100)}%`,background:agent.workload>=maxTasks?'#ef4444':agent.workload>=Math.ceil(maxTasks/2)?'#f59e0b':'#22c55e'}}/>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold">{agent.workload}/{maxTasks}</span>
                                  </div>
                                </div>
                                {agent.workload>=maxTasks && <span className="text-[9px] font-black text-red-500 border border-red-200 rounded-full px-2 py-0.5 bg-red-50">Surcharge</span>}
                              </label>
                            )
                          })}
                        </div>
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                          <button onClick={handleSaveAssignment} disabled={assignLoading}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50">
                            {assignLoading ? <Loader2 size={13} className="animate-spin"/> : <UserCheck size={13}/>}
                            Sauvegarder
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── HISTORY TAB ── */}
                  {activeTab==='history' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Suivi de Progression</h3>
                      {history.length===0 ? (
                        <p className="text-xs text-slate-400 italic">Aucun historique disponible.</p>
                      ) : (
                        <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-6 ml-2">
                          {history.map((h,idx)=>{
                            const sc=getStatusCfg(h.new_status)
                            return (
                              <div key={h.id||idx} className="relative">
                                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center" style={{background:sc.color}}>
                                  <span className="w-1 h-1 rounded-full bg-white"/>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full" style={{color:sc.color,background:sc.bg}}>{sc.label}</span>
                                    <span className="text-[10px] text-slate-400 font-bold">{new Date(h.created_at).toLocaleString('fr-FR')}</span>
                                  </div>
                                  {h.comment && <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed mt-1">{h.comment}</p>}
                                  {h.user && <span className="text-[9px] text-slate-400 block">Par: {h.user.first_name} {h.user.last_name} ({h.user.role})</span>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── COMMENTS TAB ── */}
                  {activeTab==='comments' && (
                    <div className="space-y-4 flex flex-col">
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm overflow-y-auto space-y-4 max-h-[320px]">
                        {comments.length===0 ? (
                          <div className="py-12 text-center text-slate-400 space-y-2">
                            <Send size={18} className="mx-auto text-slate-300 dark:text-slate-700"/>
                            <p className="text-xs font-bold">Aucun commentaire interne.</p>
                          </div>
                        ) : comments.map((c,idx)=>{
                          const isMe = c.user_id===JSON.parse(localStorage.getItem('fmc_user')||'{}').id
                          return (
                            <div key={c.id||idx} className={`flex items-start gap-2.5 max-w-[85%] ${isMe?'ml-auto flex-row-reverse':''}`}>
                              <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-[9px] text-white flex-shrink-0 bg-blue-600">
                                {c.user?`${c.user.first_name[0]}${c.user.last_name[0]}`:'?'}
                              </div>
                              <div className="space-y-0.5">
                                <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed ${isMe?'bg-blue-600 text-white rounded-tr-none':'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'}`}>
                                  {c.content}
                                </div>
                                <div className={`flex items-center gap-1.5 text-[9px] text-slate-400 ${isMe?'justify-end':''}`}>
                                  <span className="font-bold">{c.user?`${c.user.first_name} ${c.user.last_name}`:'Système'}</span>
                                  <span>•</span>
                                  <span>{new Date(c.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <form onSubmit={handleAddComment} className="flex items-center gap-2">
                        <input type="text" value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Ajouter un commentaire interne…"
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"/>
                        <button type="submit" disabled={commentSubmitting||!commentText.trim()}
                          className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center text-white transition-all">
                          {commentSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                        </button>
                      </form>
                    </div>
                  )}

                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <XCircle size={32} className="text-red-500"/>
                <p className="text-sm font-bold text-slate-400">Déclaration introuvable.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {acceptTarget && <AcceptModal decl={acceptTarget} agents={agents} onClose={()=>setAcceptTarget(null)} onDone={load}/>}
      {refuseTarget && <RefuseModal decl={refuseTarget} onClose={()=>setRefuseTarget(null)} onDone={load}/>}
    </ChefLayout>
  )
}

export default ChefDeclarations