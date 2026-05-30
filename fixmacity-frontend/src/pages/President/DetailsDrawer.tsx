import React, { useState, useEffect } from 'react'
import {
  X, Pencil, Users, Eye, EyeOff, Trash2, Loader2,
  UserCheck, UserX, FileText, Hash, Calendar, MapPin,
  Building2, Shield, ChevronRight, BarChart2, Star, Award, Clock
} from 'lucide-react'

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface Agent {
  id: string
  first_name: string
  last_name: string
  email: string
  is_active: boolean
  total_tasks?: number
  resolved_tasks?: number
}

export interface Department {
  id: string
  name_fr: string
  name_ar: string | null
  name_en: string | null
  code: string
  description: string | null
  is_active: boolean
  chef_name: string | null
  chef_id:   string | null
  total:     number
  accepted:  number
  resolved:  number
  rejected:  number
  in_progress: number
  agents_count: number
  created_at?: string
}

interface DetailsDrawerProps {
  dept: Department
  onClose: () => void
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}

// ─── Constants & Helpers ──────────────────────────────────────────────────────
const ICONS: Record<string, string> = {
  VR: '🛣️', EP: '💡', PD: '🗑️', EV: '🌿',
  EA: '💧', ST: '🚦', BP: '🏛️', SG: '💬',
}
const getIcon = (code: string) => ICONS[code] ?? '🏢'

const COLORS: Record<string, string> = {
  VR: '#3B82F6', EP: '#F59E0B', PD: '#10B981',
  EV: '#22C55E', EA: '#6366F1', ST: '#F97316',
  BP: '#8B5CF6', SG: '#EC4899',
}
const EXTRA_COLORS = ['#06B6D4', '#84CC16', '#F43F5E', '#A855F7', '#0EA5E9']
const dynamicColor = (code: string, id: string) => {
  if (COLORS[code]) return COLORS[code]
  return EXTRA_COLORS[id.charCodeAt(0) % EXTRA_COLORS.length]
}

const initials = (name: string | null) => {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:     { label: 'En attente',   color: '#F59E0B' },
  accepted:    { label: 'Acceptée',     color: '#3B82F6' },
  in_progress: { label: 'En cours',     color: '#6366F1' },
  resolved:    { label: 'Résolue',      color: '#10B981' },
  rejected:    { label: 'Rejetée',      color: '#EF4444' },
  closed:      { label: 'Clôturée',     color: '#64748B' },
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token')

const apiFetch = (path: string, opts?: RequestInit) =>
  fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${tok()}`,
      'Content-Type': 'application/json',
      ...(opts?.headers ?? {}),
    },
  }).then(r => r.json())

// ─── Component ────────────────────────────────────────────────────────────────
const DetailDrawer: React.FC<DetailsDrawerProps> = ({ dept, onClose, onEdit, onToggle, onDelete }) => {
  const color = dynamicColor(dept.code, dept.id)
  const icon  = getIcon(dept.code)

  const [agents,    setAgents]    = useState<Agent[]>([])
  const [decls,     setDecls]     = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState<'agents' | 'decls'>('agents')
  const [declsPage, setDeclsPage] = useState(0)
  const PAGE = 8

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [aRes, dRes] = await Promise.all([
          apiFetch(`/president/users?role=agent&department_id=${dept.id}&limit=100`),
          apiFetch(`/president/declarations?department_id=${dept.id}&status=in_progress&limit=100`),
        ])
        if (aRes.users)        setAgents(aRes.users)
        if (dRes.declarations) setDecls(dRes.declarations)
      } catch {}
      setLoading(false)
    }
    load()
  }, [dept.id])

  const activeAgents   = agents.filter(a => a.is_active)
  const inactiveAgents = agents.filter(a => !a.is_active)
  
  // Only display relevant declarations (e.g. in_progress / accepted)
  const inProgressDecls = decls.filter(d => d.status === 'in_progress' || d.status === 'accepted' || d.status === 'pending')
  const pagedDecls      = inProgressDecls.slice(declsPage * PAGE, declsPage * PAGE + PAGE)
  const totalPages      = Math.ceil(inProgressDecls.length / PAGE)

  // analytical calculations for stack bar
  const totalStats = (dept.in_progress || 0) + (dept.resolved || 0) + (dept.rejected || 0)
  const pctInProgress = totalStats > 0 ? ((dept.in_progress || 0) / totalStats) * 100 : 0
  const pctResolved = totalStats > 0 ? ((dept.resolved || 0) / totalStats) * 100 : 0
  const pctRejected = totalStats > 0 ? ((dept.rejected || 0) / totalStats) * 100 : 0

  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Backdrop with premium glassmorphism */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity duration-300" 
        onClick={onClose} 
      />

      {/* Styled inline animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Panel */}
      <div
        className="relative ml-auto h-full w-full max-w-[490px] bg-slate-50 dark:bg-slate-950 flex flex-col shadow-[0_0_80px_-10px_rgba(0,0,0,0.4)] border-l border-slate-200 dark:border-slate-800/80 animate-slide-in overflow-hidden"
      >
        {/* Decorative dynamic ambient glow */}
        <div 
          className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-[60px] opacity-25 dark:opacity-20 pointer-events-none"
          style={{ backgroundColor: color }}
        />

        {/* ── 1. HEADER ── */}
        <div className="flex-shrink-0 px-6 pt-7 pb-5 border-b border-slate-100 dark:border-slate-900 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl relative z-10">
          <div className="flex items-start gap-4">
            {/* Visual Icon Container */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-lg border border-white dark:border-slate-800 transition-transform hover:scale-105"
              style={{ 
                background: `linear-gradient(135deg, ${color}22, ${color}05)`,
                boxShadow: `0 8px 30px -4px ${color}15`
              }}
            >
              {icon}
            </div>

            {/* Name + Badges */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[17px] font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                  {dept.name_fr}
                </h2>
                <span
                  className="text-[9px] font-black px-2 py-0.5 rounded-lg text-white uppercase tracking-widest flex-shrink-0 shadow-sm"
                  style={{ background: color }}
                >
                  {dept.code}
                </span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 border ${
                    dept.is_active
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${dept.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {dept.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              {dept.name_ar && (
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1 select-all" dir="rtl">{dept.name_ar}</p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-all flex-shrink-0 border border-slate-200/20 dark:border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-5 py-5 relative z-10">

          {/* SECTION 1: SYSTEM INFO */}
          <section className="px-6">
            <div className="bg-white dark:bg-slate-900/50 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-900/30 flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Code Service</p>
                <p className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 tracking-wider uppercase">{dept.code}</p>
              </div>
              <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
              <div className="flex-1 text-center">
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Créé le</p>
                <p className="text-[12px] font-extrabold text-slate-800 dark:text-slate-100">
                  {dept.created_at ? new Date(dept.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                </p>
              </div>
              <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
              <div className="flex-1 text-center">
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Agents affectés</p>
                <p className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">{dept.agents_count}</p>
              </div>
            </div>
          </section>

          {/* SECTION 2: ANALYTICAL PROGRESS & STATS */}
          <section className="px-6">
            <div className="bg-white dark:bg-slate-900/50 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-900/30">
              <div className="flex items-center justify-between mb-3.5">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Performances Déclarations</p>
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-900">
                  <span className="text-[9px] font-black text-slate-500">TOTAL :</span>
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-100 tabular-nums">{dept.total}</span>
                </div>
              </div>

              {/* Stacked Proportional Bar */}
              {totalStats > 0 ? (
                <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex mb-5">
                  <div 
                    title={`En cours: ${dept.in_progress}`} 
                    className="h-full bg-blue-500 transition-all duration-500" 
                    style={{ width: `${pctInProgress}%` }} 
                  />
                  <div 
                    title={`Résolues: ${dept.resolved}`} 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${pctResolved}%` }} 
                  />
                  <div 
                    title={`Refusées: ${dept.rejected}`} 
                    className="h-full bg-red-500 transition-all duration-500" 
                    style={{ width: `${pctRejected}%` }} 
                  />
                </div>
              ) : (
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 mb-5" />
              )}

              {/* Grid Layout Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'En cours', val: dept.in_progress, color: '#3b82f6', bg: 'bg-blue-50/50 dark:bg-blue-950/10', border: 'border-blue-100/40 dark:border-blue-900/10' },
                  { label: 'Résolues', val: dept.resolved,    color: '#10b981', bg: 'bg-emerald-50/50 dark:bg-emerald-950/10', border: 'border-emerald-100/40 dark:border-emerald-900/10' },
                  { label: 'Refusées', val: dept.rejected,    color: '#ef4444', bg: 'bg-red-50/50 dark:bg-red-950/10', border: 'border-red-100/40 dark:border-red-900/10' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-3 text-center transition-all hover:scale-[1.02]`}>
                    <p className="text-[17px] font-black leading-none tabular-nums" style={{ color: s.color }}>
                      {s.val}
                    </p>
                    <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1.5 leading-none">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 3: CHEF DE SERVICE CARD */}
          <section className="px-6">
            <div className="bg-gradient-to-r from-slate-100/70 to-slate-50/40 dark:from-slate-900/40 dark:to-slate-900/10 rounded-3xl p-5 border border-slate-200/40 dark:border-slate-900/30">
              <p className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-3">Chef de Département</p>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Executive Avatar */}
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-md transition-transform hover:scale-105"
                    style={{ background: color }}
                  >
                    {initials(dept.chef_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-black text-slate-800 dark:text-slate-100 leading-tight truncate">
                      {dept.chef_name ?? 'Non assigné'}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Management des opérations</p>
                  </div>
                </div>

                {/* Micro Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={onEdit}
                    title="Assigner un responsable"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
                  >
                    <Pencil className="w-3 h-3" />
                    Modifier
                  </button>
                  <button
                    title="Consulter le profil chef"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-[10px] font-black transition-colors border border-slate-200 dark:border-slate-800"
                  >
                    <Eye className="w-3 h-3" />
                    Profil
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: DESCRIPTION IF AVAILABLE */}
          {dept.description && (
            <section className="px-6">
              <div className="bg-white dark:bg-slate-900/20 rounded-3xl p-4 border border-slate-150/10 dark:border-slate-900/30">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Description & Mission</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold italic">
                  "{dept.description}"
                </p>
              </div>
            </section>
          )}

          {/* SECTION 5: TAB NAVIGATION (AGENTS / DECLS) */}
          <section className="flex flex-col min-h-[300px]">
            {/* Tab buttons */}
            <div className="flex border-b border-slate-200 dark:border-slate-900 px-6">
              {[
                { key: 'agents' as const, label: 'Agents',       count: agents.length,          Icon: Users },
                { key: 'decls'  as const, label: 'En cours',     count: inProgressDecls.length, Icon: FileText },
              ].map(t => {
                const isActive = tab === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 py-3 mr-6 text-[11px] font-extrabold border-b-2 transition-all relative ${
                      isActive
                        ? 'text-slate-900 dark:text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
                    }`}
                    style={isActive ? { borderBottomColor: color } : {}}
                  >
                    <t.Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                    <span 
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-black'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Tab panel contents */}
            <div className="flex-1 p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : tab === 'agents' ? (
                /* AGENTS SUB-TAB */
                agents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-600">
                    <Users className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-xs font-black">Aucun agent affecté</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Active agents */}
                    {activeAgents.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            En poste ({activeAgents.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {activeAgents.map(a => (
                            <div 
                              key={a.id} 
                              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-900/60 hover:border-emerald-500/25 dark:hover:border-emerald-500/10 transition-colors"
                            >
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                                style={{ background: dynamicColor('', a.id) }}
                              >
                                {initials(`${a.first_name} ${a.last_name}`)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                                  {a.first_name} {a.last_name}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{a.email}</p>
                              </div>
                              <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Actif
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inactive agents */}
                    {inactiveAgents.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <UserX className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Inactifs ({inactiveAgents.length})
                          </span>
                        </div>
                        <div className="space-y-2 opacity-50">
                          {inactiveAgents.map(a => (
                            <div 
                              key={a.id} 
                              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-slate-100/50 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-900/40"
                            >
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 grayscale"
                                style={{ background: dynamicColor('', a.id) }}
                              >
                                {initials(`${a.first_name} ${a.last_name}`)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-extrabold text-slate-700 dark:text-slate-350 leading-tight">
                                  {a.first_name} {a.last_name}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{a.email}</p>
                              </div>
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 flex-shrink-0">
                                Inactif
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                /* DECLARATIONS SUB-TAB */
                inProgressDecls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-600">
                    <FileText className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-xs font-black">Aucune déclaration en cours</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pagedDecls.map((d: any) => {
                      const meta = STATUS_META[d.status] ?? { label: d.status, color: '#64748B' }
                      return (
                        <div 
                          key={d.id} 
                          className="flex items-start gap-3 px-3.5 py-3 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-900/50 hover:border-slate-200 dark:hover:border-slate-800 hover:shadow-sm transition-all hover:scale-[1.01]"
                        >
                          <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-0.5" 
                            style={{ background: `${color}15` }}
                          >
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-extrabold text-slate-800 dark:text-slate-100 leading-snug truncate">
                              {d.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                              <span className="flex items-center gap-1 text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                                <Hash className="w-2.5 h-2.5 flex-shrink-0" />
                                {d.ref_citoyen || d.id?.slice(0, 8)}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                                {d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                              </span>
                              {d.address && (
                                <span className="flex items-center gap-0.5 text-[10px] text-slate-400 truncate max-w-[130px]" title={d.address}>
                                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                  {d.address}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 border"
                            style={{ 
                              color: meta.color, 
                              background: `${meta.color}12`,
                              borderColor: `${meta.color}25`
                            }}
                          >
                            {meta.label}
                          </span>
                        </div>
                      )
                    })}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 dark:border-slate-900 mt-4">
                        <button 
                          disabled={declsPage === 0} 
                          onClick={() => setDeclsPage(p => p - 1)}
                          className="text-[10px] font-black text-slate-400 disabled:opacity-35 hover:text-slate-700 dark:hover:text-white transition-all px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 disabled:hover:bg-transparent"
                        >
                          ← Précédent
                        </button>
                        <span className="text-[10px] font-black text-slate-400">
                          {declsPage + 1} / {totalPages}
                        </span>
                        <button 
                          disabled={declsPage >= totalPages - 1} 
                          onClick={() => setDeclsPage(p => p + 1)}
                          className="text-[10px] font-black text-slate-400 disabled:opacity-35 hover:text-slate-700 dark:hover:text-white transition-all px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 disabled:hover:bg-transparent"
                        >
                          Suivant →
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </section>
        </div>

        {/* ── FOOTER ACTIONS (PINNED BOTTOM BAR) ── */}
        <div className="flex-shrink-0 px-6 py-5 border-t border-slate-200/70 dark:border-slate-900 bg-white dark:bg-slate-950 space-y-2.5 relative z-10">
          <button
            onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black transition-all shadow-xl shadow-blue-500/10 hover:shadow-blue-500/25"
          >
            <Pencil className="w-3.5 h-3.5" />
            Modifier le service
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onToggle}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[10px] font-black border transition-all ${
                dept.is_active
                  ? 'bg-amber-500/5 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20 hover:bg-amber-500/10'
                  : 'bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20 hover:bg-emerald-500/10'
              }`}
            >
              {dept.is_active ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  Désactiver
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  Réactiver
                </>
              )}
            </button>
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[10px] font-black border border-red-200/50 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/25 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailDrawer