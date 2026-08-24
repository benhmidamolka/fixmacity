// src/pages/Chef/ChefDeclarations.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, RefreshCw, Eye, X, CheckCircle2, XCircle,
  Loader, Send, AlertTriangle, MapPin, Calendar, User,
  FileText, History, MessageSquare, ChevronLeft,
  ChevronRight, SlidersHorizontal, UserCheck, Clock,
  Building2, ThumbsUp, Camera, Hash, Download,
  ChevronDown, Filter, Zap, Activity, ArrowDown, Users
} from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import ChefLayout from '../../layouts/ChefLayout'
import { DetailDrawer, AcceptModal, RefuseModal } from '../../components/Chef/DetailDrawer'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''
const hdr = () => ({ Authorization: `Bearer ${tok()}` })
const jsonH = () => ({ 'Content-Type': 'application/json', ...hdr() })
const ROWS = 15

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
  votes_count: number
  created_at: string
  agent_id: string | null
  photo_avant: string | null
  image_url: string | null
  citizen?: { id: string; first_name: string; last_name: string; email?: string; phone?: string } | null
  assigned_agent?: { id: string; first_name: string; last_name: string } | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  shared_departments?: any[]
}

interface Agent {
  id: string
  first_name: string
  last_name: string
  is_active: boolean
  workload: number
  is_overloaded: boolean
}

interface DetailFull extends Decl {
  photos: any[]
  history: any[]
  comments: any[]
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  soumise:        { label: 'Soumise',   color: '#d97706', bg: '#fffbeb', dot: '#f59e0b' },
  assignee_chef:  { label: 'Assignée', color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
  assignee_agent: { label: 'En attente',  color: '#d97706', bg: '#fffbeb', dot: '#f59e0b' },
  en_attente:     { label: 'En attente',  color: '#d97706', bg: '#fffbeb', dot: '#f59e0b' },
  en_cours:       { label: 'En cours',  color: '#1d4ed8', bg: '#dbeafe', dot: '#3b82f6' },
  resolue:        { label: 'Résolue',   color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
  cloturee:       { label: 'Clôturée',  color: '#475569', bg: '#f1f5f9', dot: '#94a3b8' },
  refusee_chef:   { label: 'Refusée',   color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
  refusee_agent:  { label: 'Refusée',   color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
}

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  haute: { label: 'Urgent', color: '#DC2626', bg: '#FEF2F2' },
  urgente: { label: 'Urgent', color: '#DC2626', bg: '#FEF2F2' },
  high: { label: 'Urgent', color: '#DC2626', bg: '#FEF2F2' },
  moyenne: { label: 'Normal', color: '#D97706', bg: '#FFFBEB' },
  medium: { label: 'Normal', color: '#D97706', bg: '#FFFBEB' },
  basse: { label: 'Faible', color: '#059669', bg: '#F0FDF4' },
  low: { label: 'Faible', color: '#059669', bg: '#F0FDF4' },
}

const AGENT_COLORS = ['#1557FF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#0891B2', '#EF4444', '#14B8A6']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtFull(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function getCatEmoji(c?: string) {
  const m: Record<string, string> = { 'Voirie': '🛣️', 'Éclairage Public': '💡', 'Propreté': '🗑️', 'Espaces Verts': '🌿', 'Réseaux': '💧', 'Signalisation': '🚦', 'Administratif': '🏢', 'Suggestions': '💬' }
  return c ? (m[c] || '📌') : '📌'
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function FilterDropdown({ label, icon: Icon, value, options, onChange, multi = false }: any) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  let activeLabel = label
  const isAll = multi ? value.length === 0 : value === 'all'

  if (!isAll) {
    if (multi) {
      if (value.length === 1) activeLabel = options.find((o: any) => o.value === value[0])?.label || label
      else activeLabel = `${value.length} sélectionnés`
    } else {
      activeLabel = options.find((o: any) => o.value === value)?.label || label
    }
  }

  const toggle = (val: string) => {
    if (!multi) {
      onChange(val)
      setOpen(false)
      return
    }
    if (val === 'all') {
      onChange([])
      setOpen(false)
      return
    }
    if (value.includes(val)) {
      onChange(value.filter((v: string) => v !== val))
    } else {
      onChange([...value, val])
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-full border transition-all text-[11px] font-bold ${!isAll ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {activeLabel}
        <ChevronDown className="w-3 h-3 ml-1 text-slate-400" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-[12rem] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-20 py-1 max-h-64 overflow-y-auto">
          {multi && (
            <button onClick={() => { onChange([]); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between">
              <span className="flex items-center gap-2.5">Toutes les options</span>
              {value.length === 0 && <CheckCircle2 className="w-3.5 h-3.5 text-[#1557FF]" />}
            </button>
          )}
          {options.map((o: any) => {
            if (multi && o.value === 'all') return null
            const isSelected = multi ? value.includes(o.value) : value === o.value
            return (
              <button key={o.value} onClick={(e) => { e.preventDefault(); toggle(o.value) }}
                className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between">
                <span className="flex items-center gap-2.5">
                  {o.icon && <o.icon className="w-3.5 h-3.5" style={{ color: o.color }} />}
                  {o.dot && <span className="w-2 h-2 rounded-full" style={{ background: o.dot }} />}
                  {o.label}
                </span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#1557FF]" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const Sk = ({ w = 'w-full', h = 'h-4', r = 'rounded-lg' }: { w?: string; h?: string; r?: string }) => (
  <div className={`${w} ${h} ${r} bg-slate-100 dark:bg-slate-800 animate-pulse`} />
)

function StatusPill({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, color: '#64748B', bg: '#F1F5F9', dot: '#94A3B8' }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{ color: c.color, background: c.bg }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

function PriorityPill({ priority }: { priority: string }) {
  const c = PRIORITY_CFG[priority?.toLowerCase()] || PRIORITY_CFG.moyenne
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{ color: c.color, background: c.bg }}>
      {c.label}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const ChefDeclarations: React.FC = () => {
  const [declarations, setDeclarations] = useState<Decl[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [prioFilter, setPrioFilter] = useState<string[]>([])
  const [agentFilter, setAgentFilter] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Decl | null>(null)
  const [assigning, setAssigning] = useState<Decl | null>(null)
  const [refusing, setRefusing] = useState<Decl | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const [dRes, aRes] = await Promise.all([
        fetch(`${API}/chef/declarations?limit=500`, { headers: hdr() }),
        fetch(`${API}/chef/agents`, { headers: hdr() }),
      ])
      if (dRes.ok) { const d = await dRes.json(); setDeclarations(Array.isArray(d) ? d : d.declarations || []) }
      if (aRes.ok) { const d = await aRes.json(); setAgents(d.agents || []) }
    } catch { if (!silent) toast.error('Erreur de chargement') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const agentOf = (d: Decl) => {
    if (d.assigned_agent) return d.assigned_agent
    const a = agents.find(ag => ag.id === d.agent_id)
    return a ? { first_name: a.first_name, last_name: a.last_name } : null
  }

  const normalize = (s?: any) => s ? String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : ""

  // Filter
  const filtered = declarations.filter(d => {
    // Statut
    if (statusFilter.length > 0) {
      const matches = statusFilter.some(sf => {
        if (sf === 'refused')   return ['refusee_chef', 'refusee_agent'].includes(d.status)
        if (sf === 'en_attente') return ['en_attente', 'assignee_agent'].includes(d.status)
        return d.status === sf
      })
      if (!matches) return false
    }

    // Priorité
    if (prioFilter.length > 0) {
      const lo = d.priority?.toLowerCase() || ''
      const matches = prioFilter.some(pf => {
        if (pf === 'haute') return ['haute', 'high', 'urgent', 'urgente'].includes(lo)
        if (pf === 'moyenne') return ['moyenne', 'medium'].includes(lo)
        if (pf === 'basse') return ['basse', 'low'].includes(lo)
        return false
      })
      if (!matches) return false
    }

    // Agent
    if (agentFilter.length > 0) {
      const matches = agentFilter.some(af => {
        if (af === 'unassigned') return !d.agent_id
        return d.agent_id === af
      })
      if (!matches) return false
    }

    // Date
    if (dateFilter !== 'all') {
      const dDate = new Date((d as any).updated_at || d.created_at)
      const now = new Date()
      if (dateFilter === 'today' && dDate.toDateString() !== now.toDateString()) return false
      if (dateFilter === 'week' && (now.getTime() - dDate.getTime()) > 7 * 24 * 3600 * 1000) return false
      if (dateFilter === 'month' && (now.getTime() - dDate.getTime()) > 30 * 24 * 3600 * 1000) return false
    }

    if (search) {
      const q = normalize(search)
      return normalize(d.title).includes(q)
        || normalize(d.ref_citoyen).includes(q)
        || normalize(d.ref_service).includes(q)
        || normalize(d.category).includes(q)
        || normalize(d.description).includes(q)
        || normalize(d.address).includes(q)
    }
    return true
  })

  // Counts for tab bar
  const counts = {
    all:           declarations.length,
    a_traiter:     declarations.filter(d => d.status === 'assignee_chef').length,
    assignee:      declarations.filter(d => ['assignee_agent', 'en_cours'].includes(d.status)).length,
    resolue:       declarations.filter(d => d.status === 'resolue').length,
    cloturee:      declarations.filter(d => d.status === 'cloturee').length,
    refusee:       declarations.filter(d => ['refusee_chef', 'refusee_agent'].includes(d.status)).length,
  }

  const totalPages = Math.ceil(filtered.length / ROWS)
  const rows = filtered.slice((page - 1) * ROWS, page * ROWS)

  const STATUS_TABS = [
    { key: 'all',          label: 'Toutes',     count: counts.all },
    { key: 'assignee_chef',label: 'À traiter',  count: counts.a_traiter },
    { key: 'assignee',     label: 'Assignée',   count: counts.assignee },
    { key: 'resolue',      label: 'Résolue',    count: counts.resolue },
    { key: 'cloturee',     label: 'Clôturée',   count: counts.cloturee },
    { key: 'refused',      label: 'Refusée',    count: counts.refusee },
  ]

  return (
    <ChefLayout title="Déclarations">
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: '1rem', fontWeight: 700, fontSize: 13 } }} />

      <div className="space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-[#0A1628] dark:text-white">Déclarations</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-0.5">
              {declarations.length} déclaration{declarations.length !== 1 ? 's' : ''} dans votre département
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => load(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black hover:border-slate-300 transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser
            </button>
          </div>
        </div>

        {/* ── Table card ── */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">

          {/* Toolbar: status tabs + search */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <FilterDropdown multi label="Statuts" icon={Activity} value={statusFilter} onChange={(v: any) => { setStatusFilter(v); setPage(1) }} options={[
                { value: 'assignee_chef', label: 'Assignée', dot: '#8b5cf6' },
                { value: 'en_attente', label: 'En attente', dot: '#f59e0b' },
                { value: 'en_cours',      label: 'En cours', dot: '#3b82f6' },
                { value: 'resolue',       label: 'Résolue',   dot: '#22c55e' },
                { value: 'cloturee',      label: 'Clôturée',  dot: '#94a3b8' },
                { value: 'refused',       label: 'Rejetée',   dot: '#ef4444' },
              ]} />
              <FilterDropdown multi label="Priorités" icon={Zap} value={prioFilter} onChange={(v: any) => { setPrioFilter(v); setPage(1) }} options={[
                { value: 'haute', label: 'Haute', dot: '#EF4444' },
                { value: 'moyenne', label: 'Moyenne', dot: '#F59E0B' },
                { value: 'basse', label: 'Basse', dot: '#10B981' },
              ]} />
              <FilterDropdown multi label="Agents" icon={User} value={agentFilter} onChange={(v: any) => { setAgentFilter(v); setPage(1) }} options={[
                { value: 'unassigned', label: 'Non assigné' },
                ...agents.map(a => ({ value: a.id, label: `${a.first_name} ${a.last_name}` }))
              ]} />
              <FilterDropdown label="Date" icon={Calendar} value={dateFilter} onChange={(v: any) => { setDateFilter(v); setPage(1) }} options={[
                { value: 'all', label: 'Toutes les dates' },
                { value: 'today', label: "Aujourd'hui" },
                { value: 'week', label: '7 derniers jours' },
                { value: 'month', label: '30 derniers jours' },
              ]} />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Rechercher…"
                className="w-52 pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:border-[#1557FF] font-medium text-[#0A1628] dark:text-white placeholder-slate-400 transition-all" />
            </div>
          </div>

          <div className="grid items-center gap-4 px-5 py-2.5 bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800"
            style={{ gridTemplateColumns: '1fr 110px 130px 130px 150px 130px 130px' }}>
            {['Déclaration', 'Référence', 'Statut', 'Priorité', 'Agent assigné', 'Soumis le', 'Actions'].map(h => (
              <p key={h} className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{h}</p>
            ))}
          </div>

          {/* ── Rows ── */}
          {loading ? (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="grid gap-4 px-5 py-4 items-center"
                  style={{ gridTemplateColumns: '1fr 110px 130px 130px 150px 130px 130px' }}>
                  <div className="space-y-1.5"><Sk h="h-4" w="w-40" /><Sk h="h-2.5" w="w-24" /></div>
                  <Sk h="h-4" w="w-20" />
                  <Sk h="h-6" r="rounded-full" />
                  <Sk h="h-6" r="rounded-full" />
                  <Sk h="h-6" w="w-28" r="rounded-xl" />
                  <Sk h="h-3.5" w="w-20" />
                  <div className="flex gap-1.5"><Sk w="w-8" h="h-8" r="rounded-lg" /><Sk w="w-8" h="h-8" r="rounded-lg" /><Sk w="w-8" h="h-8" r="rounded-lg" /></div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center">
              <FileText className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500">
                {search || statusFilter.length > 0 ? 'Aucun résultat.' : 'Aucune déclaration.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/30">
              {rows.map((d, i) => {
                const agent = agentOf(d)
                const canAction = d.status === 'assignee_chef'
                const imgSrc = d.photo_avant || d.image_url

                return (
                  <div key={d.id}
                    onClick={() => setSelected(d)}
                    className={`grid gap-4 px-5 py-3.5 items-center cursor-pointer group hover:bg-slate-50/70 dark:hover:bg-slate-800/20 transition-colors ${i % 2 !== 0 ? 'bg-slate-50/30 dark:bg-slate-800/10' : ''}`}
                    style={{ gridTemplateColumns: '1fr 110px 130px 130px 150px 130px 130px' }}>

                    {/* Title + ref */}
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#0A1628] dark:text-white truncate group-hover:text-[#1557FF] transition-colors">
                        {d.title}
                      </p>
                      <p className="font-mono text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{d.ref_citoyen}</p>
                      {/* Project indicator */}
                      {(d.category === 'Projet' || (d as any).shared_departments?.length > 0) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/30 uppercase tracking-widest flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" /> Projet Partagé
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Référence */}
                    <div>
                      <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                        {d.ref_citoyen || d.ref_service || '—'}
                      </span>
                    </div>

                    {/* Status */}
                    <div><StatusPill status={d.status} /></div>

                    {/* Priority — set by president, read-only here */}
                    <div><PriorityPill priority={d.priority} /></div>

                    {/* Assigned agent */}
                    <div>
                      {agent ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-black flex-shrink-0"
                            style={{ background: AGENT_COLORS[agents.findIndex(a => a.id === d.agent_id) % AGENT_COLORS.length] || '#1557FF' }}>
                            {agent.first_name[0]}{agent.last_name[0]}
                          </div>
                          <span className="text-[11px] font-bold text-[#0A1628] dark:text-slate-200 truncate">
                            {agent.first_name} {agent.last_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">
                          Non assigné
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div>
                      <p className="text-[11px] font-bold text-[#0A1628] dark:text-slate-300">{fmtDate(d.created_at)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>

                      {/* View */}
                      <button onClick={() => setSelected(d)}
                        title="Voir les détails"
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Accept — only when assignee_chef */}
                      {canAction && (
                        <button onClick={() => setAssigning(d)}
                          title="Accepter & Assigner"
                          className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Refuse — only when assignee_chef */}
                      {canAction && (
                        <button onClick={() => setRefusing(d)}
                          title="Refuser"
                          className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Pagination ── */}
          {!loading && filtered.length > ROWS && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                {(page - 1) * ROWS + 1}–{Math.min(page * ROWS, filtered.length)} sur {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  if (p < 1 || p > totalPages) return null
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg border text-[11px] font-black transition-all ${p === page
                          ? 'bg-[#1557FF] text-white border-[#1557FF] shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals / drawer */}
      {selected && <DetailDrawer declId={selected.id} agents={agents as any} onClose={() => setSelected(null)} onRefreshed={() => { load(true); setSelected(null) }} />}
      {assigning && <AcceptModal decl={assigning as any} agents={agents as any} onClose={() => setAssigning(null)} onDone={() => load(true)} />}
      {refusing && <RefuseModal decl={refusing as any} onClose={() => setRefusing(null)} onDone={() => load(true)} />}
    </ChefLayout>
  )
}

export default ChefDeclarations