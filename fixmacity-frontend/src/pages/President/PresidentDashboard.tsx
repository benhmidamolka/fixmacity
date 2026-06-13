// src/pages/President/PresidentDashboard.tsx
// Clean dashboard matching Personnel / Services page design system.

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, AreaChart, Area
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, MapPin, Download, ChevronDown, RefreshCw,
  CheckCircle2, ChevronRight, X, ExternalLink, ThumbsUp,
  Flame, TrendingDown, TrendingUp, ArrowUpRight
} from 'lucide-react'
import PresidentLayout from '../../layouts/PresidentLayout'
import DeclarationDetailDrawer from './Declarationdetaildrawer'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''

// ── Colour constants ──────────────────────────────────────────────────────────
const C = {
  green: '#16a34a', greenL: '#22c55e', greenBg: '#f0fdf4',
  blue: '#3b82f6', blueBg: '#eff6ff',
  red: '#ef4444', redBg: '#fef2f2',
  orange: '#f97316', orangeBg: '#fff7ed',
  amber: '#f59e0b', amberBg: '#fffbeb',
  purple: '#8b5cf6', purpleBg: '#f5f3ff',
  teal: '#14b8a6', gray: '#64748b',
}

const DEPT_COLORS: Record<string, string> = {
  VR: C.green, EP: C.amber, PD: C.teal, EV: C.greenL,
  EA: C.blue, ST: C.orange, BP: C.purple, SG: C.gray,
}
const DEPT_ICONS: Record<string, string> = {
  VR: '🛣️', EP: '💡', EV: '🌿', PD: '🗑️', BP: '🏢', EA: '💧', ST: '🚦', SG: '💬',
}

const PieComponent = Pie as any;

function getSeverity(votes: number, priority: number) {
  if (priority >= 15 || votes > 50) return 'Très critique'
  if (priority >= 8 || votes > 30) return 'Critique'
  if (priority >= 4 || votes > 15) return 'Haute'
  return 'Critique'
}

const SEV_STYLE: Record<string, { color: string; bg: string }> = {
  'Très critique': { color: '#dc2626', bg: '#fef2f2' },
  'Critique': { color: C.red, bg: '#fff0f0' },
  'Haute': { color: C.orange, bg: C.orangeBg },
  'Moyenne': { color: C.amber, bg: C.amberBg },
}

// ── Zone heat palette (cool → hot) ────────────────────────────────────────────
const ZONE_HEAT = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e']

// ── Reusable Skeleton ─────────────────────────────────────────────────────────
const Sk = ({ w = 'w-full', h = 'h-3', r = 'rounded' }: { w?: string; h?: string; r?: string }) => (
  <div className={`${w} ${h} ${r} bg-slate-200/50 dark:bg-slate-800/50 animate-pulse`} />
)

const SevBadge = ({ label }: { label: string }) => {
  const s = SEV_STYLE[label] || SEV_STYLE['Critique']
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap"
      style={{ color: s.color, background: s.bg, borderColor: s.color + '25' }}>
      {label}
    </span>
  )
}

const DATE_MAP: Record<string, string> = {
  "Aujourd'hui": 'today', '7 derniers jours': '7days',
  'Ce mois-ci': 'month', 'Cette année': 'year', 'Toute la période': 'all'
}
const DatePill = ({ onRangeChange }: { onRangeChange: (r: string) => void }) => {
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState('Ce mois-ci')
  const ranges = ["Aujourd'hui", '7 derniers jours', 'Ce mois-ci', 'Cette année', 'Toute la période']

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] font-medium text-gray-700 dark:text-slate-300 select-none hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1.5" />
          <path d="M16 2v4M8 2v4M3 10h18" strokeWidth="1.5" />
        </svg>
        <span>{range}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
            {ranges.map(r => (
              <button 
                key={r}
                onClick={() => { setRange(r); setOpen(false); onRangeChange(DATE_MAP[r] || 'month'); }}
                className={`w-full text-left px-4 py-2 text-[12px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${range === r ? 'text-primary dark:text-blue-400 bg-slate-50/50 dark:bg-slate-800/50' : 'text-slate-600 dark:text-slate-300'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-bold text-gray-700 dark:text-white mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-slate-400">{p.name === 'reports' ? 'Tâches créées' : 'Tâches résolues'}</span>
          <span className="font-bold text-gray-800 dark:text-white ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  )
}



// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Top 5 Signalements Critiques
// ─────────────────────────────────────────────────────────────────────────────
const TopCritiques = ({ data, loading, onSelectDecl }: { data: any[]; loading: boolean; onSelectDecl: (id: string) => void }) => {
  const total = data.reduce((s, d) => s + (d.votes_count || 0), 0)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 hover:shadow-md transition-all flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px] font-bold text-gray-800 dark:text-white">1. Top 5 signalements critiques</span>
        <Link to="/president/declarations"
          className="text-[11px] font-bold text-green-600 hover:text-green-700 flex items-center gap-0.5 transition-colors">
          Voir tout <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-1 flex-1">
        {loading ? [...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Sk w="w-4" h="h-4" r="rounded-full" />
            <div className="flex-1 space-y-1"><Sk w="w-3/4" h="h-2.5" /><Sk w="w-1/2" h="h-2" /></div>
            <Sk w="w-14" h="h-4" r="rounded-full" /><Sk w="w-8" h="h-3" />
          </div>
        )) : data.slice(0, 5).map((item, i) => {
          const sev = getSeverity(item.votes_count || 0, item.priority_score || 0)
          return (
            <motion.div key={item.id || i}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onSelectDecl(item.id)}
              className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
              <span className="text-[11px] font-black text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
              <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-gray-800 dark:text-slate-200 truncate group-hover:text-green-700 transition-colors leading-tight">
                  {item.title || item.description || 'Signalement'}
                </p>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                  {item.address || item.category || 'Localisation inconnue'}
                </p>
              </div>
              <SevBadge label={sev} />
              <span className="text-[13px] font-black text-gray-700 dark:text-slate-200 w-8 text-right flex-shrink-0">
                {item.votes_count || 0}
              </span>
            </motion.div>
          )
        })}
      </div>

      {!loading && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-slate-800">
          <span className="text-[11px] text-gray-500 dark:text-slate-400">Total votes sur cas critiques</span>
          <span className="text-[13px] font-black text-red-500">{total.toLocaleString('fr-FR')}</span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Zones Critiques
// ─────────────────────────────────────────────────────────────────────────────
const ZONE_LABELS = ['Très élevé', 'Élevé', 'Moyen', 'Modéré', 'Faible']

const ZonesCritiques = ({ zones, loading }: { zones: any[]; loading: boolean }) => {
  const maxCount = zones[0]?.count || 1

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 hover:shadow-md transition-all flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-bold text-[#0A1628] dark:text-white flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5" /> Lieux critiques
        </span>
        <Link to="/president/declarations"
          className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-1 transition-colors">
          Voir tout <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Ranked zone rows */}
      <div className="space-y-2.5 flex-1">
        {loading
          ? [...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Sk w="w-5" h="h-5" r="rounded" /><Sk w="w-28" h="h-2.5" /><div className="flex-1" /><Sk w="w-6" h="h-2.5" />
            </div>
          ))
          : zones.slice(0, 5).map((z: any, i: number) => {
            const pct = Math.round((z.count / maxCount) * 100)
            const heat = ZONE_HEAT[Math.min(i, ZONE_HEAT.length - 1)]
            return (
              <motion.div key={z.name || z.id || i}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-black flex-shrink-0"
                    style={{ background: heat }}>
                    {i + 1}
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex-1 truncate">{z.name}</span>
                  <span className="text-[12px] font-black text-[#0A1628] dark:text-white flex-shrink-0">{z.count}</span>
                </div>
                <div className="pl-7 pr-2">
                  <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: heat }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </motion.div>
            )
          })
        }
      </div>

      {/* Color legend */}
      {!loading && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            {ZONE_HEAT.map((color, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
                <span className="text-[9px] font-bold text-slate-400">{ZONE_LABELS[i]}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Bar chart: tâches créées vs résolues
// ─────────────────────────────────────────────────────────────────────────────
const TachesChart = ({ trend, depts, loading, selDept, onDeptChange }: { trend: any[]; depts: any[]; loading: boolean; selDept: string; onDeptChange: (id: string) => void }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const totalC = trend.reduce((s, d) => s + (d.reports || 0), 0)
  const totalR = trend.reduce((s, d) => s + (d.resolved || 0), 0)
  const rate = totalC > 0 ? ((totalR / totalC) * 100).toFixed(1) : '0.0'
  const selName = selDept === 'all' ? 'Tous les départements'
    : (depts.find(d => d.id === selDept)?.name_fr || depts.find(d => d.id === selDept)?.name || 'Tous')

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 hover:shadow-md transition-all flex flex-col h-full">
      <span className="text-[13px] font-bold text-gray-800 dark:text-white mb-3">3. Nb de tâches vs résolues par mois</span>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] text-gray-400 font-medium">Département</span>
        <div className="relative flex-1" ref={ref}>
          <button onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-[11px] font-medium text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600 transition-all">
            <span className="truncate">{selName}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                <button onClick={() => { onDeptChange('all'); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-[11px] font-medium transition-colors ${selDept === 'all' ? 'text-green-600 bg-green-50 dark:bg-green-500/10' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                  Tous les départements
                </button>
               {depts.map(d => (
                  <button key={d.id} onClick={() => { onDeptChange(d.id); setOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-[11px] font-medium transition-colors ${selDept === d.id ? 'text-green-600 bg-green-50 dark:bg-green-500/10' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                    {d.name_fr || d.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div style={{ width: '100%', height: 170 }}>
        {loading ? (
          <div className="flex items-end gap-2 h-full pb-6">
            {[0.55, 0.8, 0.65, 0.9, 1, 0.7].map((h, i) => (
              <div key={i} className="flex-1 flex gap-1 items-end">
                <div className="flex-1 rounded-t animate-pulse bg-green-100 dark:bg-green-500/10" style={{ height: `${h * 120}px` }} />
                <div className="flex-1 rounded-t animate-pulse bg-blue-100 dark:bg-blue-500/10" style={{ height: `${h * 85}px` }} />
              </div>
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={trend} margin={{ top: 4, right: 0, left: -26, bottom: 0 }} barCategoryGap="32%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<BarTip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="reports" name="reports" fill={C.green} radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="resolved" name="resolved" fill={C.blue} radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div>
            <p className="text-[12px] font-black text-gray-800 dark:text-white">{totalC.toLocaleString('fr-FR')}</p>
            <p className="text-[9px] text-gray-400 leading-none">Créées</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div>
            <p className="text-[12px] font-black text-gray-800 dark:text-white">{totalR.toLocaleString('fr-FR')}</p>
            <p className="text-[9px] text-gray-400 leading-none">Résolues</p>
          </div>
        </div>
        <div>
          <p className="text-[12px] font-black text-gray-800 dark:text-white">{rate}%</p>
          <p className="text-[9px] text-gray-400 leading-none">Taux résolution</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — Performance par département
// ─────────────────────────────────────────────────────────────────────────────
const DeptPerf = ({ depts, loading }: { depts: any[]; loading: boolean }) => {
  const totals = depts.reduce((a, d) => ({ t: a.t + d.total, r: a.r + d.resolved }), { t: 0, r: 0 })
  const totalRate = totals.t > 0 ? ((totals.r / totals.t) * 100).toFixed(1) : '0.0'

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 hover:shadow-md transition-all">
      <span className="text-[13px] font-bold text-gray-800 dark:text-white block mb-4">4. Performance par département</span>
      <table className="w-full">
        <thead>
          <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <th className="text-left pb-2.5 border-b border-gray-100 dark:border-slate-800">Département</th>
            <th className="text-right pb-2.5 border-b border-gray-100 dark:border-slate-800">Créées</th>
            <th className="text-right pb-2.5 border-b border-gray-100 dark:border-slate-800">Résolues</th>
            <th className="text-left pb-2.5 pl-4 border-b border-gray-100 dark:border-slate-800">Taux</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
          {loading ? [...Array(5)].map((_, i) => (
            <tr key={i}>
              <td className="py-2.5"><div className="flex items-center gap-2"><Sk w="w-6" h="h-6" r="rounded-lg" /><Sk w="w-24" h="h-2.5" /></div></td>
              <td className="py-2.5 text-right"><Sk w="w-8" h="h-2.5" r="rounded" /></td>
              <td className="py-2.5 text-right"><Sk w="w-8" h="h-2.5" r="rounded" /></td>
              <td className="py-2.5 pl-4"><Sk h="h-2.5" r="rounded-full" /></td>
            </tr>
          )) : depts.slice(0, 6).map((d, i) => {
            const icon = DEPT_ICONS[d.code] || '📁'
            const color = DEPT_COLORS[d.code] || C.green
            const rate = d.perf ?? (d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0)
            const rCol = rate >= 70 ? C.green : rate >= 55 ? C.amber : C.red
            return (
              <motion.tr key={d.id || i}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: color + '18' }}>{icon}</div>
                    <span className="text-[12px] font-bold text-gray-700 dark:text-slate-200">{d.name}</span>
                  </div>
                </td>
                <td className="py-2.5 text-right text-[12px] font-bold text-gray-700 dark:text-slate-200">{d.total}</td>
                <td className="py-2.5 text-right text-[12px] font-bold text-gray-700 dark:text-slate-200">{d.resolved}</td>
                <td className="py-2.5 pl-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full"
                        style={{ background: rCol }}
                        initial={{ width: 0 }}
                        animate={{ width: `${rate}%` }}
                        transition={{ duration: 0.9, delay: i * 0.09, ease: 'easeOut' }} />
                    </div>
                    <span className="text-[11px] font-black w-9 text-right flex-shrink-0"
                      style={{ color: rCol }}>{rate}%</span>
                  </div>
                </td>
              </motion.tr>
            )
          })}
        </tbody>
        {!loading && (
          <tfoot>
            <tr className="border-t-2 border-gray-200 dark:border-slate-800">
              <td className="pt-2.5 text-[12px] font-black text-gray-800 dark:text-white">Total</td>
              <td className="pt-2.5 text-right text-[12px] font-black text-gray-800 dark:text-white">{totals.t.toLocaleString('fr-FR')}</td>
              <td className="pt-2.5 text-right text-[12px] font-black text-gray-800 dark:text-white">{totals.r.toLocaleString('fr-FR')}</td>
              <td className="pt-2.5 pl-4 text-[12px] font-black text-green-600">{totalRate}%</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — Demandes par catégorie (donut)
// ─────────────────────────────────────────────────────────────────────────────
const DemandesParCategorie = ({ depts, loading }: { depts: any[]; loading: boolean }) => {
  const [activeIdx, setActiveIdx] = useState<number | undefined>(undefined)

  const pieData = depts.map(d => ({
    name: d.name || d.name_fr || d.code,
    value: d.total || 0,
    color: DEPT_COLORS[d.code] || '#64748b'
  })).filter(d => d.value > 0)

  const total = pieData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 hover:shadow-md transition-all flex flex-col">
      <span className="text-[13px] font-bold text-[#0A1628] dark:text-white mb-3">Demandes par catégorie</span>
      <div className="flex items-center gap-5 flex-1 min-h-0">
        <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
          {loading ? (
            <div className="w-full h-full rounded-full bg-gray-100 dark:bg-slate-800 animate-pulse" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                <PieChart>
                  <PieComponent data={pieData} cx="50%" cy="50%"
                    innerRadius={38} outerRadius={54}
                    dataKey="value" paddingAngle={2}
                    strokeWidth={0}
                    activeIndex={activeIdx}
                    activeShape={(props: any) => {
                      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
                      return (
                        <g>
                          <path d={`M ${cx} ${cy}`} />
                          <circle cx={cx} cy={cy} r={outerRadius + 3} fill="none" stroke={fill} strokeWidth={2} strokeDasharray={`${(endAngle - startAngle) * (outerRadius + 3) * Math.PI / 180} 9999`} strokeDashoffset={0} />
                        </g>
                      )
                    }}
                    onMouseEnter={(_: any, idx: number) => setActiveIdx(idx)}
                    onMouseLeave={() => setActiveIdx(undefined)}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                  </PieComponent>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[16px] font-black text-gray-800 dark:text-white leading-none">
                  {activeIdx !== undefined
                    ? pieData[activeIdx].value.toLocaleString('fr-FR')
                    : total.toLocaleString('fr-FR')}
                </p>
                <p className="text-[9px] text-gray-400 font-bold mt-0.5 max-w-[72px] truncate text-center">
                  {activeIdx !== undefined ? pieData[activeIdx].name : 'Total'}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 max-h-[130px] scrollbar-thin scrollbar-thumb-slate-200 pr-1">
          {loading ? [...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Sk w="w-2" h="h-2" r="rounded-full" /><Sk w="w-20" h="h-2" />
              <div className="flex-1" /><Sk w="w-8" h="h-2" />
            </div>
          )) : pieData.map((item, i) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0'
            return (
              <div key={item.name}
                className={`flex items-center gap-2 py-0.5 px-1.5 rounded-lg transition-colors cursor-pointer ${activeIdx === i ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(undefined)}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex-1 truncate">{item.name}</span>
                <span className="text-[11px] font-black text-slate-800 dark:text-white">{item.value}</span>
                <span className="text-[10px] font-bold text-slate-400 w-8 text-right">({pct}%)</span>
              </div>
            )
          })}
        </div>
      </div>
      {!loading && (
        <div className="mt-2 pt-2 text-center text-[11px] font-bold text-slate-400 border-t border-slate-100 dark:border-slate-800">
          Total : <span className="text-slate-800 dark:text-white font-black">{total.toLocaleString('fr-FR')} demandes</span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const PresidentDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [crucials, setCrucials] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [trend, setTrend] = useState<any[]>([])
  const [depts, setDepts] = useState<any[]>([])
  const [deptsRaw, setDeptsRaw] = useState<any[]>([])
  const [byStatus, setByStatus] = useState<Record<string, number>>({})
  const [stats, setStats] = useState({ criticalCount: 0, resolvedCount: 0, highSatisfactionCount: 0 })
  const [selDeptId, setSelDeptId] = useState('all')
  const [selDateRange, setSelDateRange] = useState('month')
  const [selectedDeclId, setSelectedDeclId] = useState<string | null>(null)

  const currentUserId = (() => {
    try {
      const t = localStorage.getItem('fmc_token')
      if (!t) return undefined
      return JSON.parse(atob(t.split('.')[1])).sub
    } catch { return undefined }
  })()

const load = useCallback(async (deptId = 'all', dateRange = 'month') => {
    setLoading(true); setError(false)
    try {
      const params = new URLSearchParams()
      if (deptId && deptId !== 'all') params.set('department_id', deptId)
      if (dateRange && dateRange !== 'all') params.set('range', dateRange)
      const qs = params.toString() ? '?' + params.toString() : ''

      const res = await fetch(`${API}/president/dashboard${qs}`, {
        headers: { Authorization: `Bearer ${tok()}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()

      setCrucials(data.crucialCases || [])
      setTrend(data.trendData || [])
      setDepts(data.by_department || data.byDepartment || [])
      setByStatus(data.by_status || data.byStatus || {})
      setStats(data.stats || { criticalCount: 0, resolvedCount: 0, highSatisfactionCount: 0 })
      
      const arr = data.by_arrondissement || data.byArrondissement || {}
      const ZONE_NAMES = ['Hôpitaux à proximité', 'Écoles à proximité', 'Marchés publics', 'Centres sportifs', 'Bâtiments administratifs']
      const zonesArr = Object.values(arr)
        .map((v: any, idx) => {
          const count = typeof v === 'object' ? v.count : v
          return { name: ZONE_NAMES[idx % ZONE_NAMES.length], count }
        })
        .sort((a: any, b: any) => b.count - a.count)
      setZones(zonesArr as any[])

      const dr = await fetch(`${API}/president/departments`, {
        headers: { Authorization: `Bearer ${tok()}` }
      })
      if (dr.ok) {
        const dd = await dr.json()
        setDeptsRaw(dd.departments || [])
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(selDeptId, selDateRange) }, [])

  const handleExport = async () => {
    try {
      const res = await fetch(`${API}/president/export?format=csv`, {
        headers: { Authorization: `Bearer ${tok()}` }
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `fixmacity-${new Date().toISOString().slice(0, 10)}.csv`
      a.click(); URL.revokeObjectURL(url)
    } catch { }
  }

  return (
    <PresidentLayout title="Tableau de bord">
      <style>{`@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
      <div className="space-y-3" style={{ animation: 'fadeIn .4s ease' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Tableau de bord</h1>
          <p className="text-[12px] text-gray-400 dark:text-slate-500 mt-0.5">
            Bonjour Président, voici un aperçu global de la situation actuelle.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePill onRangeChange={(r) => { setSelDateRange(r); load(selDeptId, r); }} />
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-[12px] font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm">
            <Download className="w-3.5 h-3.5" /> Exporter
          </button>
          <button onClick={() => load(selDeptId, selDateRange)}
            className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl p-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm font-bold text-red-700 dark:text-red-400 flex-1">Erreur de chargement.</p>
          <button onClick={() => load(selDeptId, selDateRange)} className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors">Réessayer</button>
        </div>
      )}

      {/* ── KPI Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Signalements urgents', value: stats.criticalCount, sub: 'Cas critiques', icon: <AlertTriangle className="w-5 h-5" />, color: '#ef4444', bg: 'bg-red-500' },
          { label: 'Tâches résolues', value: stats.resolvedCount, sub: 'Interventions terminées', icon: <CheckCircle2 className="w-5 h-5" />, color: '#16a34a', bg: 'bg-green-600' },
          { label: 'Satisfaction élevée', value: stats.highSatisfactionCount, sub: 'Notes 4–5 étoiles', icon: <ThumbsUp className="w-5 h-5" />, color: '#3b82f6', bg: 'bg-blue-500' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full opacity-10" style={{ background: s.color }} />
            <div className="relative flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ${s.bg} group-hover:scale-110 transition-transform flex-shrink-0`}>
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{s.label}</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">
                  {loading ? <span className="inline-block w-8 h-5 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" /> : s.value}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium truncate">{s.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 1: 3 equal columns ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <TopCritiques data={crucials} loading={loading} onSelectDecl={setSelectedDeclId} />
        <ZonesCritiques zones={zones} loading={loading} />
        <TachesChart trend={trend} depts={deptsRaw} loading={loading} selDept={selDeptId} onDeptChange={(id) => { setSelDeptId(id); load(id, selDateRange); }} />
      </div>

      {/* ── Row 2: 2 columns ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <DeptPerf depts={depts} loading={loading} />
        <DemandesParCategorie depts={depts} loading={loading} />
      </div>

      </div>

      <DeclarationDetailDrawer
        declarationId={selectedDeclId}
        onClose={() => setSelectedDeclId(null)}
        onAssigned={() => { load(); setSelectedDeclId(null) }}
        departments={deptsRaw.map((d: any) => ({ id: d.id, name: d.name_fr || d.name }))}
        currentUserId={currentUserId}
      />
    </PresidentLayout>
  )
}

export default PresidentDashboard