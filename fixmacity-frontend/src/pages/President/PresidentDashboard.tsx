// src/pages/president/PresidentDashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  FileText, CheckCircle2, TrendingUp, ArrowRight, AlertTriangle, Activity,
  RefreshCw, Flame, ThumbsUp, Star, Users, Inbox, Vote, BarChart3,
  ShieldAlert, Filter, ChevronDown, Clock, MapPin
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, ComposedChart
} from 'recharts'
import PresidentLayout from '../../layouts/PresidentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''

type ByStatus = Record<string, number>

interface DeptRow {
  name: string
  code: string
  total: number
  resolved: number
  perf?: number
  highSatisfactionCount?: number
}

interface DashboardPayload {
  success?: boolean
  error?: string
  total?: number
  byStatus?: ByStatus
  byDepartment?: DeptRow[]
  trendData?: { name: string; reports: number; resolved: number }[]
  stats?: { criticalCount?: number; resolvedCount?: number; highSatisfactionCount?: number }
  recentDeclarations?: any[]
  crucialCases?: any[]
  topVotedDeclarations?: any[]
  moneyVotes?: any[]
  totalUsers?: number
  avgRating?: number
}

const PIPELINE_STEPS: { key: keyof ByStatus | string; label: string; color: string }[] = [
  { key: 'soumise', label: 'Soumise', color: '#F59E0B' },
  { key: 'assignee_chef', label: 'Chef', color: '#F97316' },
  { key: 'assignee_agent', label: 'Agent', color: '#1557FF' },
  { key: 'en_cours', label: 'En cours', color: '#6366F1' },
  { key: 'resolue', label: 'Résolue', color: '#10B981' },
  { key: 'cloturee', label: 'Clôturée', color: '#64748B' },
  { key: 'refusee_chef', label: 'Ref. chef', color: '#EF4444' },
  { key: 'refusee_agent', label: 'Ref. agent', color: '#BE123C' },
]

const fmtShort = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—'

const STATUS_LABEL: Record<string, string> = {
  soumise: 'Soumise',
  assignee_chef: 'Assignée chef',
  assignee_agent: 'Assignée agent',
  en_cours: 'En cours',
  resolue: 'Résolue',
  cloturee: 'Clôturée',
  refusee_chef: 'Refusée chef',
  refusee_agent: 'Refusée agent',
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string
  value: string | number
  hint?: string
  icon: typeof FileText
  accent: string
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.07]"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          <Icon className="h-6 w-6" strokeWidth={2} />
        </div>
        {hint ? (
          <span className="max-w-[45%] text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">{hint}</span>
        ) : null}
      </div>
      <p className="relative mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="relative mt-1 text-3xl font-black tracking-tight text-[#0A1628]">{value}</p>
    </div>
  )
}

function PipelineBar({ byStatus, total }: { byStatus: ByStatus; total: number }) {
  const sum = PIPELINE_STEPS.reduce((s, { key }) => s + (Number(byStatus[key as string]) || 0), 0)
  const base = total > 0 ? total : sum
  if (!base) {
    return <p className="py-8 text-center text-xs font-semibold text-slate-400">Aucun signalement sur cette période.</p>
  }
  return (
    <div className="space-y-3">
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
        {PIPELINE_STEPS.map(({ key, color }) => {
          const n = Number(byStatus[key as string]) || 0
          if (!n) return null
          const pct = Math.max(0.35, (n / base) * 100)
          return (
            <div
              key={key}
              className="h-full min-w-[3px] transition-all"
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${key}: ${n}`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {PIPELINE_STEPS.map(({ key, label, color }) => {
          const n = Number(byStatus[key as string]) || 0
          if (!n) return null
          return (
            <div key={key} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              {label} <span className="text-slate-400">({n})</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const PresidentDashboard: React.FC = () => {
  const navigate = useNavigate()
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('fmc_user') || '{}') as { first_name?: string; last_name?: string }
    } catch {
      return {}
    }
  }, [])

  const [data, setData] = useState<DashboardPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState('all')
  const [period, setPeriod] = useState<'all' | '7' | '30' | '90'>('30')
  const [departments, setDepts] = useState<{ id: string; name_fr?: string; name?: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const params = new URLSearchParams()
      if (selectedDept !== 'all') params.set('department_id', selectedDept)
      if (period !== 'all') params.set('period', period)

      const res = await fetch(`${API}/president/dashboard?${params}`, {
        headers: { Authorization: `Bearer ${tok()}` },
      })
      const j = (await res.json()) as DashboardPayload
      if (!res.ok) {
        setLoadError((j as { error?: string }).error || `Erreur ${res.status}`)
        setData(null)
        return
      }
      setData(j)
    } catch {
      setLoadError('Réseau indisponible.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [selectedDept, period])

  useEffect(() => {
    fetch(`${API}/president/departments`, { headers: { Authorization: `Bearer ${tok()}` } })
      .then(r => r.json())
      .then(j => setDepts(j.departments || []))
      .catch(() => setDepts([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const byStatus = data?.byStatus || {}
  const trendChart = useMemo(
    () =>
      (data?.trendData || []).map(d => ({
        name: d.name,
        Soumis: d.reports || 0,
        Résolus: d.resolved || 0,
      })),
    [data?.trendData]
  )

  const perfChart = useMemo(
    () =>
      (data?.byDepartment || [])
        .filter(d => (d.total || 0) > 0)
        .slice(0, 8)
        .map(d => ({
          name: d.code || d.name?.slice(0, 3) || '—',
          Résolus: d.resolved || 0,
          Satisfaits: d.highSatisfactionCount ?? 0,
        })),
    [data?.byDepartment]
  )

  const inProgress =
    (byStatus.assignee_chef || 0) + (byStatus.assignee_agent || 0) + (byStatus.en_cours || 0)
  const total = data?.total ?? 0
  const resolved = (byStatus.resolue || 0) + (byStatus.cloturee || 0)
  const greet = user.first_name?.trim() || 'Président'

  if (loading && !data) {
    return (
      <PresidentLayout title="Tableau de bord">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-100 border-t-[#1557FF]" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Chargement du tableau de bord…</p>
        </div>
      </PresidentLayout>
    )
  }

  return (
    <PresidentLayout title="Tableau de bord">
      <div className="mx-auto max-w-[1600px] space-y-8 pb-12 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#0A1628] md:text-4xl">Bonjour, {greet}</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              Vue consolidée des signalements, du traitement et de l&apos;engagement citoyen. Filtrez par période et par
              département.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(
                [
                  ['all', 'Tout'],
                  ['7', '7 j.'],
                  ['30', '30 j.'],
                  ['90', '90 j.'],
                ] as const
              ).map(([k, lab]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPeriod(k)}
                  className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                    period === k
                      ? 'bg-[#0A1628] text-white shadow-lg'
                      : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative group">
              <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="h-14 w-full min-w-[220px] appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-10 text-[10px] font-black uppercase tracking-widest text-[#0A1628] shadow-sm outline-none focus:border-[#1557FF] sm:w-auto"
              >
                <option value="all">Tous les départements</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name_fr || d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <button
              type="button"
              onClick={() => load()}
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#1557FF]/40 hover:text-[#1557FF]"
              aria-label="Actualiser"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loadError ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-800">
            <span className="font-semibold">{loadError}</span>
            <button
              type="button"
              onClick={() => load()}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-rose-700"
            >
              Réessayer
            </button>
          </div>
        ) : null}

        {/* Quick links */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/president/incoming"
            className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm transition hover:border-[#1557FF]/40 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1557FF]">
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">À affecter</p>
                <p className="text-sm font-black text-[#0A1628]">Flux entrant</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#1557FF]" />
          </Link>
          <Link
            to="/president/declarations"
            className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm transition hover:border-[#1557FF]/40 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#0A1628]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Opérations</p>
                <p className="text-sm font-black text-[#0A1628]">Signalements</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#1557FF]" />
          </Link>
          <Link
            to="/president/propositions"
            className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm transition hover:border-[#1557FF]/40 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Vote className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consultations</p>
                <p className="text-sm font-black text-[#0A1628]">Propositions</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#1557FF]" />
          </Link>
        </div>

        {/* KPI grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Signalements (filtre)" value={total} hint="Volume total" icon={BarChart3} accent="#1557FF" />
          <MetricCard
            label="En traitement"
            value={inProgress}
            hint="Chef + agent + en cours"
            icon={Activity}
            accent="#6366F1"
          />
          <MetricCard label="Clôturés" value={resolved} hint="Résolues + clôturées" icon={CheckCircle2} accent="#10B981" />
          <MetricCard
            label="Priorité haute"
            value={data?.stats?.criticalCount ?? 0}
            hint="File active"
            icon={Flame}
            accent="#EF4444"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Satisfaction > 3★"
            value={data?.stats?.highSatisfactionCount ?? 0}
            hint="Déclarations notées"
            icon={Star}
            accent="#F59E0B"
          />
          <MetricCard
            label="Note moyenne"
            value={data?.avgRating != null ? `${Number(data.avgRating).toFixed(1)} / 5` : '—'}
            hint="Tous avis"
            icon={ThumbsUp}
            accent="#8B5CF6"
          />
          <MetricCard
            label="Comptes plateforme"
            value={data?.totalUsers ?? 0}
            hint="Utilisateurs"
            icon={Users}
            accent="#0891B2"
          />
        </div>

        {/* Pipeline */}
        <div className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#0A1628]">Répartition par statut</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pipeline des déclarations</p>
            </div>
            {total > 0 ? (
              <span className="text-xs font-bold text-slate-500">
                Taux de clôture :{' '}
                <span className="font-black text-emerald-600">{Math.round((resolved / total) * 100)}%</span>
              </span>
            ) : null}
          </div>
          <PipelineBar byStatus={byStatus} total={total} />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-sm md:p-8 lg:col-span-2">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#0A1628]">Tendance mensuelle</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Créations vs résolutions (6 mois)
                </p>
              </div>
              <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" /> Soumis
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1557FF]" /> Résolus
                </span>
              </div>
            </div>
            <div className="h-[300px] w-full md:h-[340px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={trendChart} barGap={10}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }} />
                  <Tooltip
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
                  />
                  <Bar dataKey="Soumis" fill="#E2E8F0" radius={[6, 6, 0, 0]} barSize={18} />
                  <Bar dataKey="Résolus" fill="#1557FF" radius={[6, 6, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-lg font-black text-[#0A1628]">Performance par département</h2>
            <p className="mb-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Résolus vs avis &gt; 3★
            </p>
            <div className="h-[300px] w-full md:h-[340px]">
              {perfChart.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                  Pas encore de données filtrées.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <ComposedChart data={perfChart}>
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#94A3B8' }}
                    />
                    <YAxis hide />
                    <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }} />
                    <Line type="monotone" name="Résolus" dataKey="Résolus" stroke="#1557FF" strokeWidth={3} dot={{ r: 3 }} />
                    <Line
                      type="monotone"
                      name="Satisfaits"
                      dataKey="Satisfaits"
                      stroke="#F59E0B"
                      strokeWidth={3}
                      strokeDasharray="6 4"
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Lists */}
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-sm md:p-8 lg:col-span-4">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-black text-[#0A1628]">Activité récente</h2>
              <Clock className="h-5 w-5 text-slate-300" />
            </div>
            <ul className="space-y-3">
              {(data?.recentDeclarations || []).length === 0 ? (
                <li className="py-8 text-center text-xs text-slate-400">Aucune entrée.</li>
              ) : (
                (data?.recentDeclarations || []).map((d: any) => (
                  <li
                    key={d.id}
                    className="cursor-pointer rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-[#1557FF]/30 hover:bg-white"
                    onClick={() => navigate('/president/declarations')}
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#1557FF]">{d.ref_citoyen}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-bold text-[#0A1628]">
                      {(d.title || d.description || 'Signalement').slice(0, 80)}
                    </p>
                    <p className="mt-2 text-[10px] font-semibold text-slate-400">
                      {d.citizen_name} · {STATUS_LABEL[d.status] || d.status} · {fmtShort(d.created_at)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-sm md:p-8 lg:col-span-4">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-black text-[#0A1628]">File d&apos;attention</h2>
              <ShieldAlert className="h-5 w-5 text-rose-400" />
            </div>
            <ul className="space-y-3">
              {(data?.crucialCases || []).length === 0 ? (
                <li className="flex flex-col items-center py-10 text-center text-xs text-slate-400">
                  <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-200" />
                  Aucun dossier ouvert à traiter dans cette vue.
                </li>
              ) : (
                (data?.crucialCases || []).map((d: any) => (
                  <li
                    key={d.id}
                    className="cursor-pointer rounded-2xl border border-rose-100/80 bg-rose-50/30 p-4 transition hover:border-rose-200 hover:bg-white"
                    onClick={() => navigate('/president/declarations')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-black text-[#0A1628] line-clamp-2">{d.title || d.description || '—'}</p>
                      {d.priority === 'haute' ? (
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-500" />
                      ) : null}
                    </div>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {d.arrondissement_name || '—'}
                      {d.category ? ` · ${d.category}` : ''}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Depuis {fmtShort(d.created_at)} · {d.citizen_name}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-sm md:p-8 lg:col-span-4">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-black text-[#0A1628]">Votes citoyens</h2>
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
            <ul className="space-y-4">
              {(data?.topVotedDeclarations || []).length === 0 ? (
                <li className="py-8 text-center text-xs text-slate-400">Aucun vote enregistré.</li>
              ) : (
                (data?.topVotedDeclarations || []).map((d: any) => (
                  <li
                    key={d.id}
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-100 p-3 transition hover:border-[#1557FF]/30"
                    onClick={() => navigate('/president/declarations')}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#0A1628]">{d.title}</p>
                      <p className="text-[10px] text-slate-400">{d.category || '—'}</p>
                    </div>
                    <span className="flex-shrink-0 text-lg font-black text-[#1557FF]">
                      +{d.votes_count ?? 0}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Propositions */}
        {(data?.moneyVotes || []).length > 0 ? (
          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#0A1628]">Propositions les plus soutenues</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Consultations municipales</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/president/propositions')}
                className="text-[10px] font-black uppercase tracking-widest text-[#1557FF] hover:underline"
              >
                Voir tout
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(data?.moneyVotes || []).map((p: any) => (
                <div
                  key={p.id}
                  className="cursor-pointer rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-violet-200 hover:bg-violet-50/30"
                  onClick={() => navigate('/president/propositions')}
                >
                  <p className="line-clamp-2 text-xs font-black text-[#0A1628]">{p.title}</p>
                  <p className="mt-3 text-[10px] font-bold text-slate-400">
                    Pour : <span className="text-violet-600">{p.votes_pour ?? 0}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </PresidentLayout>
  )
}

export default PresidentDashboard
