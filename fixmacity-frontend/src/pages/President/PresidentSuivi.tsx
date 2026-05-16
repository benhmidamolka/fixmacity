// src/pages/President/PresidentSuivi.tsx
// Status tracking — grouped list view like the image (To-do / In Progress / In Review / Done)

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, ChevronDown, ChevronRight, MapPin, ThumbsUp,
  Clock, User, Star, RefreshCw, Plus, Download, Filter,
  CheckCircle, Circle, Loader, XCircle, Archive, MoreHorizontal, Eye,
  ArrowUpRight, BarChart3, Activity, AlertCircle, CheckCircle2
} from 'lucide-react'
import PresidentLayout from '../../layouts/PresidentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

// ── Status groups (like To-do / In Progress / In Review / Done in the image) ──
const GROUPS = [
  {
    key: 'to_assign',
    label: 'À Affecter',
    statuses: ['assignee_chef'],
    color: '#F59E0B',
    bg: '#FFFBEB',
    icon: <Clock className="w-4 h-4" />,
    desc: 'En attente d\'acceptation par le Chef',
  },
  {
    key: 'in_progress',
    label: 'En Intervention',
    statuses: ['assignee_agent', 'en_cours'],
    color: '#1557FF',
    bg: '#EEF2FF',
    icon: <Activity className="w-4 h-4" />,
    desc: 'Opérations actives sur le terrain',
  },
  {
    key: 'in_review',
    label: 'En Vérification',
    statuses: ['resolue'],
    color: '#10B981',
    bg: '#F0FDF4',
    icon: <CheckCircle2 className="w-4 h-4" />,
    desc: 'Travaux terminés, évaluation en cours',
  },
  {
    key: 'done',
    label: 'Clôturées',
    statuses: ['cloturee'],
    color: '#6366F1',
    bg: '#F5F3FF',
    icon: <Archive className="w-4 h-4" />,
    desc: 'Dossiers archivés et finalisés',
  },
  {
    key: 'rejected',
    label: 'Refusées',
    statuses: ['refusee_chef', 'refusee_agent'],
    color: '#EF4444',
    bg: '#FEF2F2',
    icon: <AlertCircle className="w-4 h-4" />,
    desc: 'Nécessite une révision immédiate',
  },
]

const DEPT_COLORS: Record<string, string> = {
  Voirie: '#6366F1', Eclairage: '#F59E0B', Proprete: '#10B981',
  'Espaces verts': '#22C55E', Reseaux: '#EC4899', Signalisation: '#3B82F6',
  Administratif: '#8B5CF6', Suggestions: '#F97316',
}
const DEPT_ICONS: Record<string, string> = {
  Voirie: '🛣️', Eclairage: '💡', Proprete: '🗑️', 'Espaces verts': '🌿',
  Reseaux: '💧', Signalisation: '🚦', Administratif: '🏛️', Suggestions: '💡',
}

const PRI: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  haute: { label: 'Haute', color: '#EF4444', bg: '#FEF2F2', dot: '#EF4444' },
  moyenne: { label: 'Moyenne', color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B' },
  basse: { label: 'Basse', color: '#10B981', bg: '#F0FDF4', dot: '#10B981' },
}

const MOCK_ALL = [
  // To assign (assignee_chef)
  {
    id: '1', ref_citoyen: 'SV-22-04-26-0042', ref_service: 'VR-22-04-26-0042',
    title: 'Nid-de-poule dangereux Av. Bourguiba', category: 'Voirie',
    status: 'assignee_chef', priority: 'haute', delegation: 'Sousse Ville',
    chef: 'Karim Mansour', agent: null, votes: 47, date: '22/04', rating: null,
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=120&q=70'
  },
  {
    id: '2', ref_citoyen: 'SJ-19-04-26-0027', ref_service: 'ST-19-04-26-0027',
    title: 'Signalisation manquante carrefour Jawhara', category: 'Signalisation',
    status: 'assignee_chef', priority: 'haute', delegation: 'Sousse Jawhara',
    chef: 'Nadia Rekik', agent: null, votes: 22, date: '19/04', rating: null, image: null
  },
  // In progress
  {
    id: '3', ref_citoyen: 'SV-20-04-26-0031', ref_service: 'PD-20-04-26-0031',
    title: "Dépôt sauvage derrière le marché", category: 'Proprete',
    status: 'en_cours', priority: 'moyenne', delegation: 'Sousse Ville',
    chef: 'Mohamed Chaabani', agent: 'Riadh Hamdi', votes: 14, date: '20/04', rating: null,
    image: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=120&q=70'
  },
  {
    id: '4', ref_citoyen: 'SA-18-04-26-0022', ref_service: 'EA-18-04-26-0022',
    title: "Fuite d'eau importante Rue Ibn Sina", category: 'Reseaux',
    status: 'assignee_agent', priority: 'haute', delegation: 'Sousse SA',
    chef: 'Karim Jomaa', agent: 'Sami Mansour', votes: 29, date: '18/04', rating: null,
    image: 'https://images.unsplash.com/photo-1517409217698-3165b4c42407?w=120&q=70'
  },
  {
    id: '5', ref_citoyen: 'SJ-21-04-26-0038', ref_service: 'EP-21-04-26-0038',
    title: 'Câble électrique exposé Rue de Marseille', category: 'Eclairage',
    status: 'en_cours', priority: 'haute', delegation: 'Sousse Jawhara',
    chef: 'Sonia Dridi', agent: 'Imen Ghrabi', votes: 38, date: '21/04', rating: null,
    image: 'https://images.unsplash.com/photo-1544983050-8b1b6d05ebcd?w=120&q=70'
  },
  // In review (resolue)
  {
    id: '6', ref_citoyen: 'SJ-15-04-26-0018', ref_service: 'EV-15-04-26-0018',
    title: 'Arbre tombé bloque la rue principale', category: 'Espaces verts',
    status: 'resolue', priority: 'haute', delegation: 'Sousse Jawhara',
    chef: 'Leila Bouzid', agent: 'Amira Trabelsi', votes: 22, date: '15/04', rating: null,
    image: 'https://images.unsplash.com/photo-1590680193854-47fca385a484?w=120&q=70'
  },
  {
    id: '7', ref_citoyen: 'SV-14-04-26-0015', ref_service: 'VR-14-04-26-0015',
    title: 'Affaissement de chaussée Rue Farhat Hached', category: 'Voirie',
    status: 'resolue', priority: 'moyenne', delegation: 'Sousse Ville',
    chef: 'Karim Mansour', agent: 'Aymen Ben Ali', votes: 19, date: '14/04', rating: null, image: null
  },
  // Done (cloturee)
  {
    id: '8', ref_citoyen: 'SV-10-04-26-0009', ref_service: 'EP-10-04-26-0009',
    title: 'Lampadaires en panne Av. Mohamed V', category: 'Eclairage',
    status: 'cloturee', priority: 'basse', delegation: 'Sousse Ville',
    chef: 'Sonia Dridi', agent: 'Imen Ghrabi', votes: 8, date: '10/04', rating: 4.5,
    image: 'https://images.unsplash.com/photo-1506804886640-ed0e47018318?w=120&q=70'
  },
  {
    id: '9', ref_citoyen: 'SJ-08-04-26-0007', ref_service: 'PD-08-04-26-0007',
    title: 'Bacs ordures débordants Cité Erriadh', category: 'Proprete',
    status: 'cloturee', priority: 'moyenne', delegation: 'Sousse Jawhara',
    chef: 'Mohamed Chaabani', agent: 'Riadh Hamdi', votes: 16, date: '08/04', rating: 3.5, image: null
  },
  // Rejected
  {
    id: '10', ref_citoyen: 'SA-16-04-26-0020', ref_service: 'VR-16-04-26-0020',
    title: 'Route dégradée Zone Industrielle SA', category: 'Voirie',
    status: 'refusee_chef', priority: 'moyenne', delegation: 'Sousse SA',
    chef: 'Karim Mansour', agent: null, votes: 11, date: '16/04', rating: null, image: null
  },
]

interface Decl {
  id: string; ref_citoyen: string; ref_service: string | null; title: string
  category: string; status: string; priority: string; delegation: string
  chef: string | null; agent: string | null; votes: number; date: string
  rating: number | null; image?: string | null
}

// ── Table header ─────────────────────────────────────────────────────────────
function TableHead() {
  return (
    <div className="grid items-center gap-4 px-8 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50"
      style={{ gridTemplateColumns: '24px 1fr 140px 140px 110px 90px 80px 80px 90px' }}>
      <div className="flex items-center justify-center">
        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Signalement</span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Catégorie</span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Chef Responsable</span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Intervenant</span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 text-center">Priorité</span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 text-center">Impact</span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 text-center">Score</span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 text-right pr-4">Actions</span>
    </div>
  )
}

// ── Table row ─────────────────────────────────────────────────────────────────
function TableRow({ d }: { d: Decl }) {
  const pri = PRI[d.priority] || PRI['moyenne']
  const dColor = DEPT_COLORS[d.category] || '#64748B'
  const dIcon = DEPT_ICONS[d.category] || '📋'

  return (
    <div className="grid items-center gap-4 px-8 py-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all group border-b border-slate-50 dark:border-slate-800/50 last:border-0 cursor-pointer"
      style={{ gridTemplateColumns: '24px 1fr 140px 140px 110px 90px 80px 80px 90px' }}>

      <div className="flex items-center justify-center">
        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" />
      </div>

      <div className="flex items-center gap-4 min-w-0">
        <div className="relative shrink-0">
          {d.image ? (
            <img src={d.image} alt="" className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-sm" />
          ) : (
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border-2 border-white dark:border-slate-800"
              style={{ background: `${dColor}10` }}>
              {dIcon}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-white dark:bg-slate-800 shadow-md flex items-center justify-center border border-slate-100 dark:border-slate-700 scale-90">
            <span className="text-[10px]">{dIcon}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-[#0A1628] dark:text-white truncate leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{d.title}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[9px] font-black text-blue-600/60 dark:text-blue-400/60 uppercase tracking-[0.1em]">{d.ref_citoyen}</span>
            <span className="text-[9px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest">{d.date} · {d.delegation}</span>
          </div>
        </div>
      </div>

      <span className="inline-flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-xl w-fit uppercase tracking-widest border shadow-sm"
        style={{ background: `white`, borderColor: `${dColor}20`, color: dColor }}>
        {d.category}
      </span>

      <div className="flex items-center gap-3 min-w-0">
        {d.chef ? (
          <>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-[10px] font-black text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 shadow-sm shrink-0">
              {d.chef.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 truncate">{d.chef}</span>
          </>
        ) : (
          <span className="text-[10px] text-slate-300 dark:text-slate-500 font-black uppercase tracking-widest">Non assigné</span>
        )}
      </div>

      <div className="flex items-center gap-3 min-w-0">
        {d.agent ? (
          <>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-[10px] font-black text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 shadow-sm shrink-0">
              {d.agent.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 truncate">{d.agent}</span>
          </>
        ) : (
          <span className="text-[10px] text-slate-300 dark:text-slate-500 font-black uppercase tracking-widest">—</span>
        )}
      </div>

      <div className="flex justify-center">
        <span className="text-[9px] font-black px-3 py-1.5 rounded-xl flex items-center gap-2 uppercase tracking-widest border shadow-sm"
          style={{ background: 'transparent', borderColor: `${pri.color}20`, color: pri.color }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: pri.dot }} />
          {pri.label}
        </span>
      </div>

      <div className="flex justify-center items-center gap-1.5">
        <ThumbsUp className="w-3.5 h-3.5 text-blue-500" />
        <span className="text-sm font-black text-slate-900 dark:text-white leading-none">{d.votes}</span>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {d.rating ? (
          <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2.5 py-1.5 rounded-xl border border-yellow-100 dark:border-yellow-800 shadow-sm">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-black text-yellow-700 dark:text-yellow-400 leading-none">{d.rating}</span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-300 dark:text-slate-500 font-black">—</span>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pr-2">
        <button className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-900 flex items-center justify-center transition-all shadow-sm group/btn active:scale-95">
          <ArrowUpRight className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
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
        className="w-full flex items-center gap-4 px-6 py-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-[2rem] transition-all group">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-slate-400 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        <div className="w-1.5 h-6 rounded-full" style={{ background: group.color }} />
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-black text-[#0A1628] dark:text-white tracking-tight">{group.label}</span>
          <span className="text-xs font-black px-3 py-1 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800"
            style={{ background: 'transparent', color: group.color }}>
            {filtered.length} dossiers
          </span>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest ml-4 hidden sm:block opacity-60">{group.desc}</span>
        <button className="ml-auto w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-900 opacity-0 group-hover:opacity-100 transition-all active:scale-90 shadow-sm"
          onClick={e => e.stopPropagation()}>
          <Plus className="w-5 h-5" />
        </button>
      </button>

      {/* Table */}
      {open && filtered.length > 0 && (
        <div className="ml-8 mt-2 mb-6 bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl shadow-blue-900/5 dark:shadow-none">
          <TableHead />
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {filtered.map(d => <TableRow key={d.id} d={d} />)}
          </div>

          {/* Group footer */}
          <div className="px-8 py-4 bg-slate-50/30 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Total du segment: {filtered.length} signalement{filtered.length > 1 ? 's' : ''}
            </span>
            {group.key === 'rejected' && (
              <Link to="/president/declarations"
                className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 transition-all">
                Réaffecter toutes les alertes <ArrowUpRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      )}

      {open && filtered.length === 0 && !search && (
        <div className="ml-7 mb-3 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 px-4 py-6 text-center">
          <p className="text-xs font-semibold text-slate-300 dark:text-slate-600">Aucune déclaration dans ce statut</p>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const PresidentSuivi: React.FC = () => {
  const [decls, setDecls] = useState<Decl[]>(MOCK_ALL)
  const [search, setSearch] = useState('')
  const [catF, setCatF] = useState('Tous les Services')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/president/declarations?limit=100`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.declarations?.length) {
            setDecls(data.declarations
              .filter((d: any) => d.status !== 'soumise')
              .map((d: any) => ({
                id: d.id,
                ref_citoyen: d.ref_citoyen || '—',
                ref_service: d.ref_service || null,
                title: d.title,
                category: d.category || 'Voirie',
                status: d.status,
                priority: d.priority || 'moyenne',
                delegation: d.delegation_name || 'Sousse Ville',
                chef: d.chef_name || null,
                agent: d.agent_name || null,
                votes: d.votes_count || 0,
                date: new Date(d.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                rating: d.avg_rating || null,
                image: d.image_url || null,
              }))
            )
          }
        }
      } catch (_) { }
      setLoading(false)
    }
    load()
  }, [])

  const filteredDecls = decls.filter(d => {
    if (catF !== 'Tous les Services' && d.category !== catF) return false
    return true
  })

  const totalIntervention = filteredDecls.filter(d => ['assignee_agent', 'en_cours'].includes(d.status)).length
  const totalReview = filteredDecls.filter(d => d.status === 'resolue').length
  const totalAlerts = filteredDecls.filter(d => d.status.includes('refusee')).length

  return (
    <PresidentLayout title="Suivi des Opérations">
      <div className="max-w-7xl mx-auto space-y-8 pb-20 p-8">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Suivi des Opérations</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Monitoring en temps réel des flux d'interventions urbaines.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-8 py-5 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em] transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 shadow-xl shadow-slate-200/50 dark:shadow-none">
              <Download className="w-5 h-5" /> Exporter Dashboard
            </button>
            <button className="w-14 h-14 rounded-[1.5rem] bg-[#1557FF] text-white flex items-center justify-center shadow-xl shadow-blue-500/30 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95">
              <RefreshCw className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Status KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Total Suivi</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{filteredDecls.length}</span>
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500"><BarChart3 className="w-5 h-5" /></div>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">En Intervention</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-[#1557FF] dark:text-blue-400 tracking-tight">{totalIntervention}</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-[#1557FF] dark:text-blue-400"><Activity className="w-5 h-5" /></div>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Vérification</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-emerald-500 dark:text-emerald-400 tracking-tight">{totalReview}</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400"><CheckCircle2 className="w-5 h-5" /></div>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Alertes / Rejets</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-rose-500 dark:text-rose-400 tracking-tight">{totalAlerts}</span>
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 dark:text-rose-400"><AlertCircle className="w-5 h-5" /></div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600 group-focus-within:text-[#1557FF] transition-colors" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="RECHERCHER PAR RÉFÉRENCE OU TITRE..."
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl py-5 pl-14 pr-6 text-xs font-black text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 tracking-[0.1em] uppercase" />
          </div>

          <div className="relative min-w-[240px]">
            <Filter className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600 pointer-events-none" />
            <select value={catF} onChange={e => setCatF(e.target.value)}
              className="w-full appearance-none bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl py-5 pl-14 pr-12 text-xs font-black uppercase tracking-[0.1em] text-slate-600 dark:text-slate-400 outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:bg-white dark:focus:bg-slate-800 transition-all cursor-pointer">
              <option>Tous les Services</option>
              {Object.keys(DEPT_COLORS).map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600 pointer-events-none" />
          </div>

          <button onClick={() => { setSearch(''); setCatF('Tous les Services'); }}
            className="px-10 py-5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            Réinitialiser
          </button>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-14 h-14 border-4 border-blue-600/20 border-t-[#1557FF] rounded-full animate-spin mb-8" />
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Synchronisation de la flotte...</p>
          </div>
        ) : (
          <div className="space-y-6">
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
