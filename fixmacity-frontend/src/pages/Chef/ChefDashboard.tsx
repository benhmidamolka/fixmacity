// src/pages/Chef/ChefDashboard.tsx
// Full visual dashboard — KPIs, donut chart, bar chart,
// urgent panel, team workload, recent declarations table
// Matches FixMaCity design system: Plus Jakarta Sans, #0A1628, #1557FF

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle, XCircle, Clock, MapPin, ThumbsUp, AlertTriangle,
  Send, X, MessageSquare, Loader, Users, RefreshCw, BarChart3,
  TrendingUp, TrendingDown, Activity, Zap, Eye, Search,
  CheckCircle2, AlertCircle, PlayCircle, Award, Inbox,
  ArrowUpRight, FileText, Layers, Flame, ArrowRight,
  ChevronRight, Star, Timer, Shield
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import ChefLayout from '../../layouts/ChefLayout'
import { Toaster, toast } from 'react-hot-toast'

const API   = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok   = () => localStorage.getItem('fmc_token') || ''
const hdr   = () => ({ Authorization: `Bearer ${tok()}` })
const jsonH = () => ({ 'Content-Type': 'application/json', ...hdr() })

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  kpis: {
    total: number
    pending: number
    en_cours: number
    resolved: number
    refused: number
    active_agents: number
    resolution_rate: number
    avg_resolution_hours: number
  }
  status_chart: { name: string; value: number; color: string }[]
  priority_chart: { name: string; value: number; color: string }[]
  recent_declarations: DeclRow[]
  urgent_declarations: DeclRow[]
  agent_workload: AgentLoad[]
}

interface DeclRow {
  id: string
  ref_citoyen: string
  title: string
  category: string
  status: string
  priority: string
  delegation_name: string
  votes_count: number
  created_at: string
  citizen_name?: string
  agent_name?: string | null
  image_url?: string | null
  priority_score?: number
  assigned_agent?: {
    id: string
    first_name: string
    last_name: string
  } | null
}

interface AgentLoad {
  id: string
  name: string
  initials: string
  active_tasks: number
  resolved_count: number
  avg_rating: number
  is_active: boolean
}

// ─── Config ───────────────────────────────────────────────────────────────────

const AGENT_COLORS = [
  '#1557FF','#10B981','#F59E0B','#8B5CF6','#EC4899','#0891B2','#EF4444','#14B8A6'
]

const PRI_CFG: Record<string, { label: string; color: string; bg: string }> = {
  haute:   { label: 'Urgent',  color: '#DC2626', bg: '#FEF2F2' },
  urgente: { label: 'Urgent',  color: '#DC2626', bg: '#FEF2F2' },
  moyenne: { label: 'Normal',  color: '#D97706', bg: '#FFFBEB' },
  medium:  { label: 'Normal',  color: '#D97706', bg: '#FFFBEB' },
  basse:   { label: 'Faible',  color: '#059669', bg: '#F0FDF4' },
  low:     { label: 'Faible',  color: '#059669', bg: '#F0FDF4' },
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  soumise:        { label: 'Soumise',       color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  assignee_chef:  { label: 'À assigner',    color: '#7C3AED', bg: '#EDE9FE', dot: '#8B5CF6' },
  assignee_agent: { label: 'Assignée',      color: '#1D4ED8', bg: '#DBEAFE', dot: '#3B82F6' },
  en_cours:       { label: 'En cours',      color: '#C2410C', bg: '#FFEDD5', dot: '#F97316' },
  resolue:        { label: 'Résolue',       color: '#15803D', bg: '#DCFCE7', dot: '#22C55E' },
  cloturee:       { label: 'Clôturée',      color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
  refusee_chef:   { label: 'Refusée',       color: '#DC2626', bg: '#FEE2E2', dot: '#EF4444' },
  refusee_agent:  { label: 'Renvoyée',      color: '#B91C1C', bg: '#FEE2E2', dot: '#EF4444' },
}

function timeAgo(iso?: string) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return "À l'instant"
  if (m < 60) return `il y a ${m}min`
  if (h < 24) return `il y a ${h}h`
  return `il y a ${d}j`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// KPI Card
function KpiCard({ label, value, sub, icon: Icon, color, bg, delta }: {
  label: string; value: string | number; sub?: string
  icon: any; color: string; bg: string; delta?: number
}) {
  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-[1.75rem] p-5 border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-black text-[#0A1628] dark:text-white leading-none">{value}</p>
        {sub && <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
        {delta !== undefined && (
          <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-black ${delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(delta)}% vs mois dernier
          </div>
        )}
      </div>
    </div>
  )
}

// Priority / Status pill
function Pill({ val, type }: { val: string; type: 'status' | 'priority' }) {
  const cfg = type === 'status' ? STATUS_CFG[val] : PRI_CFG[val]
  if (!cfg) return <span className="text-xs text-slate-400">{val}</span>
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap"
      style={{ color: cfg.color, background: cfg.bg }}>
      {type === 'status' && 'dot' in cfg && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: (cfg as any).dot }} />
      )}
      {cfg.label}
    </span>
  )
}

// Agent workload row
function AgentRow({ agent, idx, maxTasks }: { agent: AgentLoad; idx: number; maxTasks: number }) {
  const color = AGENT_COLORS[idx % AGENT_COLORS.length]
  const pct = Math.min((agent.active_tasks / maxTasks) * 100, 100)
  const isOverloaded = agent.active_tasks >= maxTasks;
  const isBusy = agent.active_tasks >= Math.ceil(maxTasks / 2);
  const barCol = isOverloaded ? '#EF4444' : isBusy ? '#3B82F6' : '#10B981'
  const status = !agent.is_active ? 'Inactif' : isOverloaded ? 'Surchargé' : isBusy ? 'En mission' : 'Disponible'
  const statusCol = !agent.is_active ? '#94A3B8' : isOverloaded ? '#EF4444' : isBusy ? '#3B82F6' : '#10B981'

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm" style={{ background: color }}>
        {agent.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-black text-[#0A1628] dark:text-white truncate">{agent.name}</p>
          <span className="text-[9px] font-black ml-2 flex-shrink-0" style={{ color: statusCol }}>{status}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barCol }} />
          </div>
          <span className="text-[9px] font-bold text-slate-400 flex-shrink-0">{agent.active_tasks}/{maxTasks}</span>
        </div>
      </div>
      {agent.resolved_count > 0 && (
        <div className="flex items-center gap-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
          <CheckCircle2 className="w-2.5 h-2.5" /> {agent.resolved_count}
        </div>
      )}
    </div>
  )
}

// Custom donut tooltip
const DonutTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 shadow-lg text-xs font-black text-[#0A1628] dark:text-white">
      {payload[0].name}: {payload[0].value}
    </div>
  )
}

// ─── Assign Agent Modal ───────────────────────────────────────────────────────

function AssignModal({ decl, agents, maxTasks, onClose, onDone }: {
  decl: DeclRow; agents: AgentLoad[]; maxTasks: number
  onClose: () => void; onDone: () => void
}) {
  const [selected, setSelected] = useState('')
  const [loading,  setLoading]  = useState(false)
  const agent = agents.find(a => a.id === selected)
  const overloaded = agent && agent.active_tasks >= maxTasks

  const doAssign = async () => {
    if (!selected) return toast.error('Choisissez un agent')
    setLoading(true)
    try {
      const res = await fetch(`${API}/chef/declarations/${decl.id}/accept`, {
        method: 'POST', headers: jsonH(),
        body: JSON.stringify({ agent_id: selected })
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur')
      toast.success('Mission assignée ✓')
      onDone(); onClose()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* header */}
        <div className="px-8 pt-8 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-500 mb-1">Accepter & Assigner</p>
              <h2 className="text-xl font-black text-[#0A1628] dark:text-white">Choisir un Agent</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"><X className="w-5 h-5" /></button>
          </div>
          {/* decl summary */}
          <div className="flex gap-3 p-3.5 bg-violet-50 dark:bg-violet-900/20 rounded-2xl border border-violet-100 dark:border-violet-800/30">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 overflow-hidden flex-shrink-0 shadow-sm">
              {decl.image_url
                ? <img src={decl.image_url} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full flex items-center justify-center text-xl">🏗️</div>}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-[#0A1628] dark:text-white truncate">{decl.title}</p>
              <p className="text-[10px] font-bold text-violet-500 mt-0.5">{decl.ref_citoyen} · {decl.category}</p>
            </div>
          </div>
        </div>

        {overloaded && (
          <div className="mx-8 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl flex gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              <span className="font-black">{agent?.name}</span> est surchargé ({agent?.active_tasks} missions). Continuer quand même ?
            </p>
          </div>
        )}

        {/* agent list */}
        <div className="px-8 py-5 space-y-2 max-h-64 overflow-y-auto">
          {agents.filter(a => a.is_active).map(a => {
            const isSel = selected === a.id
            const pct   = Math.min((a.active_tasks / maxTasks) * 100, 100)
            const bCol  = a.active_tasks >= maxTasks ? '#EF4444' : a.active_tasks >= Math.ceil(maxTasks / 2) ? '#3B82F6' : '#10B981'
            const statusLabel = a.active_tasks >= maxTasks ? 'Surchargé' : a.active_tasks >= Math.ceil(maxTasks / 2) ? 'En mission' : 'Disponible'
            const statusColor = a.active_tasks >= maxTasks ? '#EF4444' : a.active_tasks >= Math.ceil(maxTasks / 2) ? '#3B82F6' : '#10B981'
            const idx = agents.indexOf(a)
            return (
              <button key={a.id} onClick={() => setSelected(a.id)}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 text-left transition-all ${isSel ? 'border-[#1557FF] bg-blue-50/40 dark:bg-blue-500/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'}`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shadow flex-shrink-0" style={{ background: AGENT_COLORS[idx % AGENT_COLORS.length] }}>{a.initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-black text-[#0A1628] dark:text-white truncate">{a.name}</p>
                    <span className="text-[9px] font-black ml-2 flex-shrink-0" style={{ color: statusColor }}>{statusLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: bCol }} />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 flex-shrink-0">{a.active_tasks}/{maxTasks}</span>
                  </div>
                </div>
                {isSel && <CheckCircle2 className="w-5 h-5 text-[#1557FF] flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        <div className="px-8 pb-8 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm font-black text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Annuler</button>
          <button onClick={doAssign} disabled={!selected || loading}
            className={`flex-[2] py-3.5 rounded-2xl text-white text-sm font-black shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 transition-all ${overloaded ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#1557FF] hover:bg-blue-600 shadow-blue-100'}`}>
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" />Confirmer l'Assignation</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Refuse Modal ─────────────────────────────────────────────────────────────

function RefuseModal({ decl, onClose, onDone }: { decl: DeclRow; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const REASONS = ['Hors périmètre technique', 'Informations insuffisantes', 'Doublon détecté', 'Matériel non disponible', 'Autre']

  const doRefuse = async () => {
    if (!reason.trim()) return toast.error('Le motif est obligatoire')
    setLoading(true)
    try {
      const res = await fetch(`${API}/chef/declarations/${decl.id}/refuse`, {
        method: 'POST', headers: jsonH(),
        body: JSON.stringify({ reason })
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur')
      toast.success('Signalement retourné au Président')
      onDone(); onClose()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-red-100 dark:border-red-900/30 overflow-hidden">
        <div className="px-8 pt-8 pb-5 bg-red-50/60 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20 flex items-start justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-red-400 mb-1">Action requise</p>
            <h2 className="text-xl font-black text-red-600 dark:text-red-400">Refuser la Mission</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-8 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motif du refus *</p>
          {REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${reason === r ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-slate-200'}`}>
              {r}
            </button>
          ))}
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Détails complémentaires..." rows={3}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-100 resize-none dark:text-slate-200 dark:placeholder-slate-500" />
        </div>
        <div className="px-8 pb-8 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm font-black text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Annuler</button>
          <button onClick={doRefuse} disabled={!reason.trim() || loading}
            className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-black shadow-lg shadow-red-100 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Confirmer le Refus'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const ChefDashboard: React.FC = () => {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('fmc_user') || '{}')

  const [data,      setData]      = useState<DashboardData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)
  const [assigning, setAssigning] = useState<DeclRow | null>(null)
  const [refusing,  setRefusing]  = useState<DeclRow | null>(null)
  const [agents,    setAgents]    = useState<AgentLoad[]>([])

  const [maxTasks, setMaxTasks] = useState(() => parseInt(localStorage.getItem('fmc_max_tasks') || '5'))
  const updateMaxTasks = (val: number) => {
    const v = Math.max(1, val)
    setMaxTasks(v)
    localStorage.setItem('fmc_max_tasks', v.toString())
  }

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [dashRes, agentsRes] = await Promise.all([
        fetch(`${API}/chef/dashboard`, { headers: hdr() }),
        fetch(`${API}/chef/agents`,    { headers: hdr() }),
      ])
      if (dashRes.ok) {
        const d = await dashRes.json()
        setData(d)
      }
      if (agentsRes.ok) {
        const a = await agentsRes.json()
        const rawAgents: any[] = a.agents || a || []
        setAgents(rawAgents.map((ag: any, i: number) => ({
          id:            ag.id,
          name:          `${ag.first_name} ${ag.last_name}`,
          initials:      `${ag.first_name?.[0] || '?'}${ag.last_name?.[0] || '?'}`.toUpperCase(),
          active_tasks:  ag.workload ?? ag.active_tasks ?? 0,
          resolved_count:ag.resolved_count ?? 0,
          avg_rating:    ag.avg_rating ?? 0,
          is_active:     ag.is_active !== false,
        })))
      }
    } catch { if (!silent) toast.error('Erreur de chargement') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])
  useEffect(() => {
    const iv = setInterval(() => fetchDashboard(true), 60_000)
    return () => clearInterval(iv)
  }, [fetchDashboard])

  const kpis = data?.kpis
  const urgentDecls     = data?.urgent_declarations    || []
  const recentDecls     = (data?.recent_declarations    || []).slice(0, 5)
  const statusChart     = data?.status_chart           || []
  const priorityChart   = data?.priority_chart         || []

  const urgentCount    = urgentDecls.length
  const availableCount = agents.filter(a => a.is_active && a.active_tasks < Math.ceil(maxTasks / 2)).length

  // ── Skeleton ───────────────────────────────────────────────────────────────

  if (loading) return (
    <ChefLayout title="Tableau de Bord">
      <div className="space-y-6">
        <div className="h-28 bg-white dark:bg-slate-900/40 rounded-[2rem] border border-slate-100 dark:border-slate-800/50 animate-pulse" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_,i) => <div key={i} className="h-24 bg-white dark:bg-slate-900/40 rounded-[1.75rem] border border-slate-100 dark:border-slate-800/50 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 h-72 bg-white dark:bg-slate-900/40 rounded-[1.75rem] border border-slate-100 dark:border-slate-800/50 animate-pulse" />
          <div className="h-72 bg-white dark:bg-slate-900/40 rounded-[1.75rem] border border-slate-100 dark:border-slate-800/50 animate-pulse" />
        </div>
      </div>
    </ChefLayout>
  )

  return (
    <ChefLayout title="Tableau de Bord">
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: '1rem', fontWeight: 700, fontSize: 13 } }} />

      <div className="space-y-6">

        {/* ── Welcome Banner ── */}
        <div className="relative bg-gradient-to-br from-[#0A1628] to-[#1D4ED8] dark:from-slate-900 dark:to-blue-900/80 rounded-[2rem] p-7 overflow-hidden shadow-xl shadow-blue-900/10">
          <div className="absolute inset-0 opacity-[0.07]">
            <div className="absolute top-3 right-12 w-36 h-36 rounded-full border-[18px] border-white" />
            <div className="absolute -bottom-10 right-36 w-56 h-56 rounded-full border-[28px] border-white" />
            <div className="absolute top-8 left-1/2 w-20 h-20 rounded-full border-[12px] border-white" />
          </div>
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-blue-200/80 text-[10px] font-black uppercase tracking-[.2em] mb-1">
                Chef de Service · {user.department_name || 'Mon Département'}
              </p>
              <h1 className="text-2xl font-black text-white leading-tight">
                Bonjour, {user.first_name || 'Chef'} 👋
              </h1>
              <p className="text-blue-200 text-sm font-medium mt-1.5">
                {urgentCount > 0
                  ? `⚡ ${urgentCount} signalement${urgentCount > 1 ? 's' : ''} urgent${urgentCount > 1 ? 's' : ''} en attente`
                  : kpis && kpis.pending > 0
                    ? `${kpis.pending} signalement${kpis.pending > 1 ? 's' : ''} à traiter`
                    : 'File d\'attente vide — excellent travail !'}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={() => fetchDashboard(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-xs font-black transition-all backdrop-blur-sm">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser
              </button>
              <Link to="/chef/declarations"
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#1557FF] rounded-2xl text-xs font-black shadow-lg hover:shadow-xl transition-all">
                Toutes les déclarations <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="En Attente"     value={kpis?.pending ?? 0}         sub={urgentCount > 0 ? `${urgentCount} urgent(s)` : 'Aucune urgence'}    icon={Inbox}         color="#7C3AED" bg="#EDE9FE" />
          <KpiCard label="En Cours"       value={kpis?.en_cours ?? 0}        sub="Missions actives"                                                      icon={Activity}      color="#1D4ED8" bg="#DBEAFE" />
          <KpiCard label="Agents Actifs"  value={kpis?.active_agents ?? 0}   sub={`${availableCount} disponible(s)`}                                     icon={Users}         color="#059669" bg="#DCFCE7" />
          <KpiCard label="Taux Résolution" value={`${kpis?.resolution_rate ?? 0}%`} sub={kpis?.avg_resolution_hours ? `~${kpis.avg_resolution_hours}h moy.` : 'Département'} icon={Award} color="#D97706" bg="#FEF3C7" />
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Donut — Status */}
          <div className="bg-white dark:bg-slate-900/50 rounded-[1.75rem] p-6 border border-slate-100 dark:border-slate-800/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">Répartition</p>
                <h3 className="text-sm font-black text-[#0A1628] dark:text-white mt-0.5">Par statut</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-violet-600" />
              </div>
            </div>
            {statusChart.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={statusChart} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                      {statusChart.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <ReTooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
                  {statusChart.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{s.name}</span>
                      <span className="text-[10px] font-black text-[#0A1628] dark:text-white ml-0.5">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-52 flex items-center justify-center text-slate-300 dark:text-slate-700">
                <BarChart3 className="w-10 h-10" />
              </div>
            )}
          </div>

          {/* Bar — Priority */}
          <div className="bg-white dark:bg-slate-900/50 rounded-[1.75rem] p-6 border border-slate-100 dark:border-slate-800/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">Distribution</p>
                <h3 className="text-sm font-black text-[#0A1628] dark:text-white mt-0.5">Par priorité</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <Flame className="w-4 h-4 text-red-500" />
              </div>
            </div>
            {priorityChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priorityChart} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<DonutTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {priorityChart.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-slate-300 dark:text-slate-700">
                <BarChart3 className="w-10 h-10" />
              </div>
            )}
          </div>
        </div>

        {/* ── Urgent + Team Workload ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Urgent declarations */}
          <div className="bg-white dark:bg-slate-900/50 rounded-[1.75rem] border border-slate-100 dark:border-slate-800/60 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">Prioritaire</p>
                  <h3 className="text-sm font-black text-[#0A1628] dark:text-white">Signalements urgents</h3>
                </div>
              </div>
              <Link to="/chef/declarations" className="text-[10px] font-black text-[#1557FF] flex items-center gap-1">
                Voir tout <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {urgentDecls.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-black text-slate-700 dark:text-white">Aucune urgence</p>
                  <p className="text-xs text-slate-400 mt-1">Tout est sous contrôle</p>
                </div>
              ) : urgentDecls.map(d => (
                <div key={d.id} className="flex items-center gap-3.5 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#0A1628] dark:text-white truncate group-hover:text-[#1557FF] transition-colors">{d.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-bold text-slate-400">{d.ref_citoyen}</span>
                      {d.delegation_name && <span className="text-[9px] font-bold text-slate-400">· {d.delegation_name}</span>}
                      <span className="text-[9px] font-bold text-slate-400">· {timeAgo(d.created_at)}</span>
                    </div>
                  </div>
                  <Pill val={d.priority} type="priority" />
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {['assignee_chef', 'soumise'].includes(d.status) && (
                      <>
                        <button onClick={() => setAssigning(d)} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Accepter & Assigner"><Send className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setRefusing(d)} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors" title="Refuser"><X className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                    <button onClick={() => navigate(`/chef/declarations/${d.id}`)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-colors" title="Détail"><Eye className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team workload */}
          <div className="bg-white dark:bg-slate-900/50 rounded-[1.75rem] border border-slate-100 dark:border-slate-800/60 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">Mon équipe</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="text-sm font-black text-[#0A1628] dark:text-white">Charge de travail</h3>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-md px-1.5 py-0.5" title="Capacité maximale par agent">
                      <span className="text-[9px] font-bold text-slate-500">Max:</span>
                      <input 
                        type="number" 
                        min={1} 
                        max={50} 
                        value={maxTasks} 
                        onChange={(e) => updateMaxTasks(parseInt(e.target.value) || 1)}
                        className="w-7 bg-transparent text-xs font-black text-[#1557FF] outline-none text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <Link to="/chef/agents" className="text-[10px] font-black text-[#1557FF] flex items-center gap-1">
                Gérer <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="px-6">
              {agents.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-400">Aucun agent</p>
                  <Link to="/chef/agents" className="text-[10px] font-black text-[#1557FF] mt-1 inline-block">+ Ajouter un agent</Link>
                </div>
              ) : agents.map((a, i) => <AgentRow key={a.id} agent={a} idx={i} maxTasks={maxTasks} />)}
            </div>
          </div>
        </div>

        {/* ── Recent Declarations Table ── */}
        <div className="bg-white dark:bg-slate-900/50 rounded-[1.75rem] border border-slate-100 dark:border-slate-800/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">Activité récente</p>
                <h3 className="text-sm font-black text-[#0A1628] dark:text-white">Dernières déclarations</h3>
              </div>
            </div>
            <Link to="/chef/declarations" className="flex items-center gap-1.5 text-[10px] font-black text-[#1557FF] px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 transition-colors">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Table header */}
          <div className="grid items-center gap-4 px-6 py-2.5 bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800"
            style={{ gridTemplateColumns: '1fr 120px 130px 130px 150px 130px 130px' }}>
            {['Déclaration', 'Catégorie', 'Statut', 'Priorité', 'Agent assigné', 'Soumis le', 'Actions'].map(h => (
              <p key={h} className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{h}</p>
            ))}
          </div>

          {recentDecls.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">Aucune déclaration récente</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/30">
              {recentDecls.map((d, i) => {
                const agent = null; // Normally agentOf(d)
                return (
                  <div key={d.id}
                    className={`grid gap-4 px-6 py-3.5 items-center cursor-pointer group hover:bg-slate-50/70 dark:hover:bg-slate-800/20 transition-colors ${i % 2 !== 0 ? 'bg-slate-50/30 dark:bg-slate-800/10' : ''}`}
                    style={{ gridTemplateColumns: '1fr 120px 130px 130px 150px 130px 130px' }}>

                    {/* Title + ref */}
                    <div className="min-w-0" onClick={() => navigate(`/chef/declarations/${d.id}`)}>
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

                    {/* Category */}
                    <div onClick={() => navigate(`/chef/declarations/${d.id}`)}>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg whitespace-nowrap">
                        {d.category || '—'}
                      </span>
                    </div>

                    {/* Status */}
                    <div onClick={() => navigate(`/chef/declarations/${d.id}`)}><Pill val={d.status} type="status" /></div>

                    {/* Priority (with score) */}
                    <div onClick={() => navigate(`/chef/declarations/${d.id}`)}>
                      <div className="flex items-center gap-2">
                        <Pill val={d.priority} type="priority" />
                        <span className="text-[10px] font-bold text-slate-400">Score: {d.priority_score || 0}</span>
                      </div>
                    </div>

                    {/* Assigned agent */}
                    <div onClick={() => navigate(`/chef/declarations/${d.id}`)}>
                      {d.assigned_agent ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-black flex-shrink-0"
                            style={{ background: '#1557FF' }}>
                            {d.assigned_agent.first_name?.[0]}{d.assigned_agent.last_name?.[0]}
                          </div>
                          <span className="text-[11px] font-bold text-[#0A1628] dark:text-slate-200 truncate">
                            {d.assigned_agent.first_name} {d.assigned_agent.last_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">
                          Non assigné
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div onClick={() => navigate(`/chef/declarations/${d.id}`)}>
                      <p className="text-[11px] font-bold text-[#0A1628] dark:text-slate-300">{fmtDate(d.created_at)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      {['assignee_chef', 'soumise'].includes(d.status) && (
                        <>
                          <button onClick={() => setAssigning(d)}
                            className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors" title="Accepter & Assigner">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setRefusing(d)}
                            className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors" title="Refuser">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button onClick={() => navigate(`/chef/declarations/${d.id}`)}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors" title="Détail">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {assigning && <AssignModal decl={assigning} agents={agents} maxTasks={maxTasks} onClose={() => setAssigning(null)} onDone={() => fetchDashboard(true)} />}
      {refusing  && <RefuseModal decl={refusing}              onClose={() => setRefusing(null)}  onDone={() => fetchDashboard(true)} />}
    </ChefLayout>
  )
}

export default ChefDashboard