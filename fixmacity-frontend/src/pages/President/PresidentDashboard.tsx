// src/pages/President/PresidentDashboard.tsx
// ── Dashboard matching reference image — 5 sections, real API, recharts ──────
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, MapPin, Download, ChevronDown, RefreshCw,
  CheckCircle2, ChevronRight, Maximize2, X, ExternalLink, ThumbsUp
} from 'lucide-react'
import PresidentLayout from '../../layouts/PresidentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''

// ── Colour constants ──────────────────────────────────────────────────────────
const C = {
  green:  '#16a34a', greenL: '#22c55e', greenBg: '#f0fdf4',
  blue:   '#3b82f6', blueBg: '#eff6ff',
  red:    '#ef4444', redBg:  '#fef2f2',
  orange: '#f97316', orangeBg: '#fff7ed',
  amber:  '#f59e0b', amberBg: '#fffbeb',
  purple: '#8b5cf6', purpleBg: '#f5f3ff',
  teal:   '#14b8a6', gray: '#64748b',
}

const DEPT_COLORS: Record<string, string> = {
  VR: C.green, EP: C.amber, PD: C.teal, EV: C.greenL,
  EA: C.blue, ST: C.orange, BP: C.purple, SG: C.gray,
}

const DEPT_ICONS: Record<string, string> = {
  VR:'🛣️', EP:'💡', EV:'🌿', PD:'🗑️',
  BP:'🏢', EA:'💧', ST:'🚦', SG:'💬',
}

// ── Helper: severity from votes + priority_score ──────────────────────────────
function getSeverity(votes: number, priority: number) {
  if (priority >= 15 || votes > 50) return 'Très critique'
  if (priority >= 8  || votes > 30) return 'Critique'
  if (priority >= 4  || votes > 15) return 'Haute'
  return 'Critique' // default to Critique for items in crucialCases
}

const SEV_STYLE: Record<string, { color: string; bg: string }> = {
  'Très critique': { color: '#dc2626', bg: '#fef2f2' },
  'Critique':      { color: C.red,     bg: '#fff0f0' },
  'Haute':         { color: C.orange,  bg: C.orangeBg },
  'Moyenne':       { color: C.amber,   bg: C.amberBg  },
}

// ── Reusable Skeleton ─────────────────────────────────────────────────────────
const Sk = ({ w='w-full', h='h-3', r='rounded' }: { w?:string; h?:string; r?:string }) => (
  <div className={`${w} ${h} ${r} bg-gray-100 animate-pulse`} />
)

// ── Severity badge ─────────────────────────────────────────────────────────────
const SevBadge = ({ label }: { label: string }) => {
  const s = SEV_STYLE[label] || SEV_STYLE['Critique']
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap"
      style={{ color: s.color, background: s.bg, borderColor: s.color + '25' }}>
      {label}
    </span>
  )
}

// ── Date pill ─────────────────────────────────────────────────────────────────
const DatePill = () => (
  <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 select-none">
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1.5"/>
      <path d="M16 2v4M8 2v4M3 10h18" strokeWidth="1.5"/>
    </svg>
    <span>12 Mai – 12 Juin 2024</span>
    <ChevronDown className="w-4 h-4 text-gray-400" />
  </div>
)

// ── Custom bar tooltip ────────────────────────────────────────────────────────
const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name === 'reports' ? 'Tâches créées' : 'Tâches résolues'}</span>
          <span className="font-bold text-gray-800 ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Active Pie Sector ─────────────────────────────────────────────────────────
const ActivePie = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 3} outerRadius={outerRadius + 7}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  )
}

// ── Declaration detail modal ───────────────────────────────────────────────────
const DeclModal = ({ item, onClose }: { item: any; onClose: () => void }) => (
  <AnimatePresence>
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        initial={{ scale: 0.93, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 16 }}>
        <button onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-snug">
              {item.title || item.description || 'Signalement critique'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{item.ref_citoyen}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          {[
            ['Statut', item.status || '—'],
            ['Priorité', item.priority_score || '—'],
            ['Votes', item.votes_count || 0],
            ['Date', new Date(item.created_at).toLocaleDateString('fr-FR')],
          ].map(([k, v]) => (
            <div key={k} className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-gray-400 text-[10px] mb-0.5">{k}</p>
              <p className="font-bold text-gray-700">{String(v)}</p>
            </div>
          ))}
        </div>
        {item.description && (
          <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 mb-4 leading-relaxed">
            {item.description}
          </p>
        )}
        <Link to="/president/declarations"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors">
          Voir la déclaration <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </motion.div>
    </motion.div>
  </AnimatePresence>
)

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Top 5 Signalements Critiques
// ─────────────────────────────────────────────────────────────────────────────
const TopCritiques = ({ data, loading }: { data: any[]; loading: boolean }) => {
  const [sel, setSel] = useState<any>(null)
  const total = data.reduce((s, d) => s + (d.votes_count || 0), 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px] font-bold text-gray-800">1. Top 5 signalements critiques</span>
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
        )) : data.map((item, i) => {
          const sev = getSeverity(item.votes_count || 0, item.priority_score || 0)
          return (
            <motion.div key={item.id || i}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setSel(item)}
              className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
              <span className="text-[11px] font-black text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-gray-800 truncate group-hover:text-green-700 transition-colors leading-tight">
                  {item.title || item.description || 'Signalement'}
                </p>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                  {item.address || item.category || 'Localisation inconnue'}
                </p>
              </div>
              <SevBadge label={sev} />
              <span className="text-[13px] font-black text-gray-700 w-8 text-right flex-shrink-0">
                {item.votes_count || 0}
              </span>
            </motion.div>
          )
        })}
      </div>

      {!loading && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <span className="text-[11px] text-gray-500">Total signalements critiques</span>
          <span className="text-[13px] font-black text-red-500">{total.toLocaleString('fr-FR')}</span>
        </div>
      )}

      {sel && <DeclModal item={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Zones Critiques (heatmap + list)
// ─────────────────────────────────────────────────────────────────────────────
const ZONE_SEVS = ['Très critique', 'Très critique', 'Critique', 'Critique', 'Moyenne']

const ZonesCritiques = ({ zones, loading }: { zones: any[]; loading: boolean }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col h-full">
    <div className="flex items-center justify-between mb-4">
      <span className="text-[13px] font-bold text-gray-800">2. Les zones critiques</span>
      <Link to="/president/declarations"
        className="text-[11px] font-bold text-green-600 hover:text-green-700 flex items-center gap-0.5 transition-colors">
        Voir la carte <ChevronRight className="w-3 h-3" />
      </Link>
    </div>

    <div className="space-y-0.5 mb-3">
      {loading ? [...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-2">
          <Sk w="w-4" h="h-4" r="rounded-full" /><Sk w="w-24" h="h-2.5" />
          <div className="flex-1" /><Sk w="w-16" h="h-4" r="rounded-full" /><Sk w="w-8" h="h-3" />
        </div>
      )) : zones.slice(0, 5).map((z, i) => {
        const sev = ZONE_SEVS[i] || 'Critique'
        const isCrit = sev === 'Très critique'
        return (
          <motion.div key={z.id || i}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
            {isCrit
              ? <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              : <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />}
            <span className="text-[12px] font-bold text-gray-800 flex-1">{z.name}</span>
            <SevBadge label={sev} />
            <span className="text-[13px] font-black text-gray-700 w-8 text-right">{z.count}</span>
          </motion.div>
        )
      })}
    </div>

    {/* Heatmap SVG */}
    <div className="relative bg-slate-50 rounded-xl overflow-hidden border border-gray-100 flex-1" style={{ minHeight: 145 }}>
      <svg viewBox="0 0 300 145" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <rect width="300" height="145" fill="#f8fafc" />
        {[40,80,120,160,200,240,280].map(x => <line key={x} x1={x} y1="0" x2={x} y2="145" stroke="#e2e8f0" strokeWidth="0.6" />)}
        {[25,50,75,100,125].map(y => <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#e2e8f0" strokeWidth="0.6" />)}
        <defs>
          <radialGradient id="rh1"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.55"/><stop offset="100%" stopColor="#ef4444" stopOpacity="0"/></radialGradient>
          <radialGradient id="rh2"><stop offset="0%" stopColor="#f97316" stopOpacity="0.5"/><stop offset="100%" stopColor="#f97316" stopOpacity="0"/></radialGradient>
          <radialGradient id="rh3"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.45"/><stop offset="100%" stopColor="#ef4444" stopOpacity="0"/></radialGradient>
          <radialGradient id="rh4"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4"/><stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/></radialGradient>
          <radialGradient id="rh5"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.35"/><stop offset="100%" stopColor="#ef4444" stopOpacity="0"/></radialGradient>
        </defs>
        <ellipse cx="75" cy="50" rx="50" ry="38" fill="url(#rh1)" />
        <ellipse cx="195" cy="38" rx="44" ry="32" fill="url(#rh2)" />
        <ellipse cx="245" cy="100" rx="40" ry="30" fill="url(#rh3)" />
        <ellipse cx="128" cy="112" rx="32" ry="24" fill="url(#rh4)" />
        <ellipse cx="60" cy="110" rx="28" ry="20" fill="url(#rh5)" />
      </svg>
      <div className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-lg flex items-center justify-center shadow-sm border border-gray-100 cursor-pointer hover:bg-white">
        <Maximize2 className="w-3 h-3 text-gray-500" />
      </div>
    </div>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Bar chart: tâches créées vs résolues
// ─────────────────────────────────────────────────────────────────────────────
const TachesChart = ({ trend, depts, loading }: { trend: any[]; depts: any[]; loading: boolean }) => {
  const [selDept, setSelDept] = useState('all')
  const [open,    setOpen]    = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const totalC = trend.reduce((s, d) => s + d.reports, 0)
  const totalR = trend.reduce((s, d) => s + d.resolved, 0)
  const rate   = totalC > 0 ? ((totalR / totalC) * 100).toFixed(1) : '0.0'
  const selName = selDept === 'all' ? 'Tous les départements' : (depts.find(d => d.id === selDept)?.name_fr || depts.find(d => d.id === selDept)?.name || 'Tous les départements')

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col h-full">
      <span className="text-[13px] font-bold text-gray-800 mb-3">3. Nb de tâches vs résolues par moi</span>

      {/* Dropdown */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] text-gray-400 font-medium">Département</span>
        <div className="relative flex-1" ref={ref}>
          <button onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] font-medium text-gray-700 hover:border-gray-300 transition-all">
            <span className="truncate">{selName}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                <button onClick={() => { setSelDept('all'); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-[11px] font-medium transition-colors ${selDept === 'all' ? 'text-green-600 bg-green-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                  Tous les départements
                </button>
                {depts.map(d => (
                  <button key={d.id} onClick={() => { setSelDept(d.id); setOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-[11px] font-medium transition-colors ${selDept === d.id ? 'text-green-600 bg-green-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                    {d.name_fr || d.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex-1" style={{ minHeight: 170 }}>
        {loading ? (
          <div className="flex items-end gap-2 h-full pb-6">
            {[0.55,0.8,0.65,0.9,1,0.7].map((h, i) => (
              <div key={i} className="flex-1 flex gap-1 items-end">
                <div className="flex-1 rounded-t animate-pulse bg-green-100" style={{ height: `${h * 120}px` }} />
                <div className="flex-1 rounded-t animate-pulse bg-blue-100" style={{ height: `${h * 85}px` }} />
              </div>
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
            <BarChart data={trend} margin={{ top: 4, right: 0, left: -26, bottom: 0 }} barCategoryGap="32%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<BarTip />} cursor={{ fill: '#f8fafc' }} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }}
                formatter={v => <span style={{ color: '#64748b', fontWeight: 700 }}>
                  {v === 'reports' ? 'Tâches créées' : 'Tâches résolues'}
                </span>} />
              <Bar dataKey="reports"  fill={C.green} radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="resolved" fill={C.blue}  radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom KPIs */}
      <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div>
            <p className="text-[12px] font-black text-gray-800">{totalC.toLocaleString('fr-FR')}</p>
            <p className="text-[9px] text-gray-400 leading-none">Tâches créées</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div>
            <p className="text-[12px] font-black text-gray-800">{totalR.toLocaleString('fr-FR')}</p>
            <p className="text-[9px] text-gray-400 leading-none">Tâches résolues</p>
          </div>
        </div>
        <div>
          <p className="text-[12px] font-black text-gray-800">{rate}%</p>
          <p className="text-[9px] text-gray-400 leading-none">Taux de résolution</p>
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
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <span className="text-[13px] font-bold text-gray-800 block mb-4">4. Performance par département</span>
      <table className="w-full">
        <thead>
          <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <th className="text-left pb-2.5 border-b border-gray-100">Département</th>
            <th className="text-right pb-2.5 border-b border-gray-100">Tâches créées</th>
            <th className="text-right pb-2.5 border-b border-gray-100">Tâches résolues</th>
            <th className="text-left pb-2.5 pl-4 border-b border-gray-100">Taux de résolution</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? [...Array(5)].map((_, i) => (
            <tr key={i}><td className="py-2.5"><div className="flex items-center gap-2"><Sk w="w-6" h="h-6" r="rounded-lg" /><Sk w="w-24" h="h-2.5" /></div></td>
              <td className="py-2.5 text-right"><Sk w="w-8" h="h-2.5" r="rounded" /></td>
              <td className="py-2.5 text-right"><Sk w="w-8" h="h-2.5" r="rounded" /></td>
              <td className="py-2.5 pl-4"><Sk h="h-2.5" r="rounded-full" /></td>
            </tr>
          )) : depts.slice(0, 6).map((d, i) => {
            const icon  = DEPT_ICONS[d.code] || '📁'
            const color = DEPT_COLORS[d.code] || C.green
            const rate  = d.perf
            const rCol  = rate >= 70 ? C.green : rate >= 55 ? C.amber : C.red
            return (
              <motion.tr key={d.id || i}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: color + '18' }}>{icon}</div>
                    <span className="text-[12px] font-bold text-gray-700">{d.name}</span>
                  </div>
                </td>
                <td className="py-2.5 text-right text-[12px] font-bold text-gray-700">{d.total}</td>
                <td className="py-2.5 text-right text-[12px] font-bold text-gray-700">{d.resolved}</td>
                <td className="py-2.5 pl-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
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
            <tr className="border-t-2 border-gray-200">
              <td className="pt-2.5 text-[12px] font-black text-gray-800">Total</td>
              <td className="pt-2.5 text-right text-[12px] font-black text-gray-800">{totals.t.toLocaleString('fr-FR')}</td>
              <td className="pt-2.5 text-right text-[12px] font-black text-gray-800">{totals.r.toLocaleString('fr-FR')}</td>
              <td className="pt-2.5 pl-4 text-[12px] font-black text-green-600">{totalRate}%</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — Status des signalements (donut)
// ─────────────────────────────────────────────────────────────────────────────
const PIE_DATA_TEMPLATE = [
  { name: 'Soumis',   key: 'soumise',        color: C.blue   },
  { name: 'En cours', key: 'en_cours',        color: C.amber  },
  { name: 'Assigné',  key: '__assigned',      color: C.purple },
  { name: 'Résolu',   key: '__resolved',      color: C.green  },
]

const StatusPie = ({ byStatus, loading }: { byStatus: Record<string, number>; loading: boolean }) => {
  const [activeIdx, setActiveIdx] = useState<number | undefined>(undefined)

  const pieData = PIE_DATA_TEMPLATE.map(t => ({
    ...t,
    value: t.key === '__assigned'
      ? (byStatus.assignee_chef || 0) + (byStatus.assignee_agent || 0)
      : t.key === '__resolved'
        ? (byStatus.resolue || 0) + (byStatus.cloturee || 0)
        : byStatus[t.key] || 0
  }))

  const total = pieData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <span className="text-[13px] font-bold text-gray-800 block mb-4">5. Les status des signalements</span>
      <div className="flex items-center gap-6">

        {/* Donut */}
        <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
          {loading ? (
            <div className="w-full h-full rounded-full bg-gray-100 animate-pulse" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%"
                    innerRadius={62} outerRadius={88}
                    dataKey="value" paddingAngle={2}
                    activeIndex={activeIdx}
                    activeShape={<ActivePie />}
                    onMouseEnter={(_, idx) => setActiveIdx(idx)}
                    onMouseLeave={() => setActiveIdx(undefined)}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[22px] font-black text-gray-800 leading-none">
                  {activeIdx !== undefined
                    ? pieData[activeIdx].value.toLocaleString('fr-FR')
                    : total.toLocaleString('fr-FR')}
                </p>
                <p className="text-[11px] text-gray-400 font-bold mt-1">
                  {activeIdx !== undefined ? pieData[activeIdx].name : 'Total'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {loading ? [...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Sk w="w-3" h="h-3" r="rounded-full" /><Sk w="w-16" h="h-2.5" />
              <div className="flex-1" /><Sk w="w-10" h="h-2.5" /><Sk w="w-10" h="h-2.5" />
            </div>
          )) : pieData.map((item, i) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'
            return (
              <motion.div key={item.name}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-xl cursor-pointer transition-colors ${activeIdx === i ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(undefined)}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-[12px] font-bold text-gray-700 flex-1">{item.name}</span>
                <span className="text-[12px] font-black text-gray-800">{item.value.toLocaleString('fr-FR')}</span>
                <span className="text-[11px] font-bold text-gray-400 w-12 text-right">{pct}%</span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const PresidentDashboard: React.FC = () => {
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(false)
  const [crucials,  setCrucials]  = useState<any[]>([])
  const [zones,     setZones]     = useState<any[]>([])
  const [trend,     setTrend]     = useState<any[]>([])
  const [depts,     setDepts]     = useState<any[]>([])
  const [deptsRaw,  setDeptsRaw]  = useState<any[]>([])
  const [byStatus,  setByStatus]  = useState<Record<string, number>>({})
  const [stats,     setStats]     = useState({
    criticalCount: 0,
    resolvedCount: 0,
    highSatisfactionCount: 0
  })


  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      // Dashboard data
      const res = await fetch(`${API}/president/dashboard`, {
        headers: { Authorization: `Bearer ${tok()}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()

      setCrucials(data.crucialCases || [])
      setTrend(data.trendData || [])
      setDepts(data.by_department || data.byDepartment || [])
      setByStatus(data.by_status || data.byStatus || {})
      setStats(data.stats || {
        criticalCount: 0,
        resolvedCount: 0,
        highSatisfactionCount: 0
      })


      // Zones from arrondissement breakdown
      const arr = data.by_arrondissement || data.byArrondissement || {}
      const zonesArr = Object.values(arr)
        .map((v: any) => typeof v === 'object' ? v : { name: String(v), count: v })
        .sort((a: any, b: any) => b.count - a.count)
      setZones(zonesArr as any[])

      // Departments for dropdown
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

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    try {
      const res = await fetch(`${API}/president/export?format=csv`, {
        headers: { Authorization: `Bearer ${tok()}` }
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `fixmacity-${new Date().toISOString().slice(0, 10)}.csv`
      a.click(); URL.revokeObjectURL(url)
    } catch {}
  }

  return (
    <PresidentLayout title="">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-black text-gray-900 tracking-tight">Tableau de bord</h1>
          <p className="text-[13px] text-gray-400 mt-1">
            Bonjour Président, voici un aperçu global de la situation actuelle.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePill />
          <button onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-[13px] font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Exporter le rapport
          </button>
          <button onClick={load}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:border-gray-300 text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm font-bold text-red-700 flex-1">Erreur de chargement.</p>
          <button onClick={load} className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors">
            Réessayer
          </button>
        </div>
      )}

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-red-500 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Signalements Urgents</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{loading ? <Sk w="w-12" h="h-6" /> : stats.criticalCount}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Cas critiques à traiter</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-green-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Tâches Résolues</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{loading ? <Sk w="w-12" h="h-6" /> : stats.resolvedCount}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Interventions terminées</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-blue-500 group-hover:scale-110 transition-transform">
              <ThumbsUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Satisfaction Élevée</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{loading ? <Sk w="w-12" h="h-6" /> : stats.highSatisfactionCount}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Notes 4-5 étoiles</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 1: 3 equal columns ───────────────────────────────────────── */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <TopCritiques data={crucials} loading={loading} />
        <ZonesCritiques zones={zones} loading={loading} />
        <TachesChart trend={trend} depts={deptsRaw} loading={loading} />
      </div>

      {/* ── Row 2: 2 columns ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-10">
        <DeptPerf depts={depts} loading={loading} />
        <StatusPie byStatus={byStatus} loading={loading} />
      </div>
    </PresidentLayout>
  )
}

export default PresidentDashboard