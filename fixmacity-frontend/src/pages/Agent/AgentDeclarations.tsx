// src/pages/Agent/AgentBoard.tsx
// Kanban + List board for accepted agent tasks — inspired by ed-roh/project-management
// Columns: En cours | Terminée
// Each accepted task card is draggable between columns.
// Click → opens AgentDeclarationDetail drawer.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Search, List, LayoutGrid, Calendar as CalIcon, Filter,
  ChevronDown, Plus, MoreHorizontal, Loader2, MapPin,
  Users, Star, Clock, CheckCircle2, Circle, AlertCircle,
  GripVertical, ArrowRight, Zap, Archive, Inbox, MessageSquare, Flag,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { toast, Toaster } from 'react-hot-toast'
import AgentDeclarationDetail from './AgentDeclarationDetail'
import AgentLayout from '../../components/agent/AgentLayout'

const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type TaskStatus = 'en_attente' | 'en_cours' | 'terminee'
type ViewMode   = 'board' | 'list'
type SortKey    = 'date_desc' | 'date_asc' | 'priority_high' | 'priority_low'

interface BoardTask {
  tache_id:           string
  declaration_id:     string
  agent_id:           string
  statut_tache:       TaskStatus
  date_assignation:   string
  date_resolution:    string | null
  rapport_interne:    string | null
  photo_apres_url:    string | null
  motif_refus:        string | null
  tache_updated_at:   string
  title:              string
  description:        string | null
  type_probleme:      string | null
  category:           string | null
  address:            string | null
  latitude:           number | null
  longitude:          number | null
  decl_status:        string
  priority_score:     number
  votes_count:        number
  photo_avant_url:    string | null
  ref_citoyen:        string | null
  ref_service:        string | null
  decl_created_at:    string
  final_priority:     string | null
  ai_priority:        string | null
  ai_priority_score:  number
  is_sensitive:       boolean
  sensitive_type:     string | null
  priority_approved:  boolean
  citizen_first_name: string
  citizen_last_name:  string
  service_name:       string | null
  service_icon:       string | null
  co_agents_count:    number
  photos_count:       number
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITY META
// ─────────────────────────────────────────────────────────────────────────────
const PRI: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  urgent:  { label:'Urgent', color:'#DC2626', bg:'#FEF2F2', border:'#FECACA', dot:'#EF4444' },
  haute:   { label:'Urgent', color:'#DC2626', bg:'#FEF2F2', border:'#FECACA', dot:'#EF4444' },
  normal:  { label:'Normal', color:'#B45309', bg:'#FFFBEB', border:'#FDE68A', dot:'#F59E0B' },
  moyenne: { label:'Normal', color:'#B45309', bg:'#FFFBEB', border:'#FDE68A', dot:'#F59E0B' },
  faible:  { label:'Faible', color:'#15803D', bg:'#F0FDF4', border:'#86EFAC', dot:'#22C55E' },
  basse:   { label:'Faible', color:'#15803D', bg:'#F0FDF4', border:'#86EFAC', dot:'#22C55E' },
}
const getPri = (t: BoardTask) =>
  PRI[(t.final_priority || t.ai_priority || 'normal').toLowerCase()] || PRI.normal

// ─────────────────────────────────────────────────────────────────────────────
// COLUMNS
// ─────────────────────────────────────────────────────────────────────────────
const COLUMNS: { key: TaskStatus; label: string; color: string; bg: string; badgeBg: string; icon: React.ReactNode }[] = [
  { key: 'en_attente', label: 'Assignées', color: '#7C3AED', bg: '#F5F3FF', badgeBg: '#8B5CF6', icon: <CalIcon className="w-4 h-4 text-purple-500" /> },
  { key: 'en_cours', label: 'En cours',  color: '#1D4ED8', bg: '#EFF6FF', badgeBg: '#3B82F6', icon: <Clock className="w-4 h-4 text-blue-500" /> },
  { key: 'terminee', label: 'Terminées',  color: '#15803D', bg: '#F0FDF4', badgeBg: '#22C55E', icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })

const COLOR_POOL = ['#6C63FF','#10B981','#F59E0B','#EF4444','#3B82F6','#EC4899','#8B5CF6','#14B8A6']
const avatarColor = (name: string) => COLOR_POOL[name.charCodeAt(0) % COLOR_POOL.length]

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AgentBoard() {
  const [tasks,      setTasks]      = useState<BoardTask[]>([])
  const [loading,    setLoading]    = useState(true)
  const [view,       setView]       = useState<ViewMode>('board')
  const [search,     setSearch]     = useState('')
  const [sort,       setSort]       = useState<SortKey>('date_desc')
  const [priFilter,  setPriFilter]  = useState<string>('all')
  const [showFilter, setShowFilter] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [archivedIds, setArchivedIds] = useState<string[]>([])
  const [detail,     setDetail]     = useState<string | null>(null) // tache_id
  const [dragging,   setDragging]   = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  // Load archives from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('fixmacity_archived_taches')
    if (saved) {
      try {
        setArchivedIds(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  // Sync archives back
  const toggleArchive = (tacheId: string) => {
    let next: string[] = []
    if (archivedIds.includes(tacheId)) {
      next = archivedIds.filter(id => id !== tacheId)
      toast.success('📦 Mission restaurée sur le tableau')
    } else {
      next = [...archivedIds, tacheId]
      toast.success('📦 Mission archivée pour libérer votre tableau')
    }
    setArchivedIds(next)
    localStorage.setItem('fixmacity_archived_taches', JSON.stringify(next))
    fetchTasks(true)
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data, error } = await sb
        .from('v_agent_board')
        .select('*')
        .eq('agent_id', user.id)
        .order('tache_updated_at', { ascending: false })
      if (error) throw error
      setTasks((data ?? []) as BoardTask[])
    } catch (e: any) {
      if (!silent) toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // Real-time
  useEffect(() => {
    const ch = sb.channel('board-taches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taches' }, () => fetchTasks(true))
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [fetchTasks])

  // Close filter on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Status update (drag-drop or quick action) ──────────────────────────────
  const updateStatus = async (tacheId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.tache_id === tacheId ? { ...t, statut_tache: newStatus } : t
    ))

    let error;
    if (newStatus === 'en_cours') {
      const res = await sb.rpc('agent_accept_task', { p_tache_id: tacheId })
      error = res.error
    } else {
      const res = await sb.rpc('agent_update_task_status', {
        p_tache_id:   tacheId,
        p_new_status: newStatus,
      })
      error = res.error
    }

    if (error) {
      toast.error(error.message)
      fetchTasks(true) // revert
    } else {
      toast.success(newStatus === 'terminee' ? '✅ Mission terminée !' : '🔄 Mission acceptée & en cours')
      fetchTasks(true)
    }
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, tacheId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('tacheId', tacheId)
    setDragging(tacheId)
  }
  const onDragEnd = () => { setDragging(null); setDropTarget(null) }
  const onDragOver = (e: React.DragEvent, col: TaskStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(col)
  }
  const onDrop = (e: React.DragEvent, col: TaskStatus) => {
    e.preventDefault()
    const tacheId = e.dataTransfer.getData('tacheId')
    const task = tasks.find(t => t.tache_id === tacheId)
    if (task && task.statut_tache !== col) updateStatus(tacheId, col)
    setDragging(null); setDropTarget(null)
  }

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = tasks
    .filter(t => {
      // Archive filter
      const isArchived = archivedIds.includes(t.tache_id)
      if (showArchived && !isArchived) return false
      if (!showArchived && isArchived) return false

      const q = search.toLowerCase()
      const matchSearch = !q ||
        t.title.toLowerCase().includes(q) ||
        (t.address || '').toLowerCase().includes(q) ||
        (t.citizen_first_name + ' ' + t.citizen_last_name).toLowerCase().includes(q) ||
        (t.ref_citoyen || '').toLowerCase().includes(q)
      const matchPri = priFilter === 'all' || (t.final_priority || t.ai_priority || 'normal').toLowerCase() === priFilter
      return matchSearch && matchPri
    })
    .sort((a, b) => {
      if (sort === 'date_desc') return new Date(b.tache_updated_at).getTime() - new Date(a.tache_updated_at).getTime()
      if (sort === 'date_asc')  return new Date(a.tache_updated_at).getTime() - new Date(b.tache_updated_at).getTime()
      if (sort === 'priority_high') return (b.ai_priority_score || 0) - (a.ai_priority_score || 0)
      return (a.ai_priority_score || 0) - (b.ai_priority_score || 0)
    })

  const byCol = (col: TaskStatus) => filtered.filter(t => t.statut_tache === col)
  
  // Stats on total unarchived tasks
  const activeUnarchived = tasks.filter(t => !archivedIds.includes(t.tache_id))
  const total = activeUnarchived.length
  const enCours  = activeUnarchived.filter(t => t.statut_tache === 'en_cours').length
  const terminees = activeUnarchived.filter(t => t.statut_tache === 'terminee').length

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <AgentLayout title="Mes Missions">
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
      </div>
    </AgentLayout>
  )

  return (
    <AgentLayout title="Mes Missions">
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: '1rem', fontWeight: 700, fontSize: 13 } }} />

      {/* ── HEADER ── */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title + counts */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-black text-slate-800">
                {showArchived ? 'Missions Archivées' : 'Mes Déclarations'}
              </h1>
              <p className="text-xs text-slate-400">
                {showArchived
                  ? `${archivedIds.length} mission(s) archivée(s)`
                  : `${total} tâche${total !== 1 ? 's' : ''} · ${enCours} en cours · ${terminees} terminées`}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            {/* Mini stat pills */}
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-bold border border-blue-100">
                <Circle className="w-3 h-3" /> {enCours} en cours
              </span>
              <span className="flex items-center gap-1.5 text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-bold border border-green-100">
                <CheckCircle2 className="w-3 h-3" /> {terminees} terminées
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une tâche..."
                className="w-52 pl-8 pr-3 py-2 text-xs bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 placeholder:text-slate-300 font-semibold text-slate-700"
              />
            </div>

            {/* Archive toggle */}
            <button
              onClick={() => setShowArchived(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs border rounded-xl transition-all font-semibold shadow-sm
                ${showArchived
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}
              title="Afficher les archives">
              <Archive className="w-3.5 h-3.5" />
              <span>{showArchived ? 'Voir le Tableau' : 'Voir l\'Archive'}</span>
              {!showArchived && archivedIds.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-200 text-[10px] text-slate-700 font-bold">
                  {archivedIds.length}
                </span>
              )}
            </button>

            {/* Sort + filter */}
            <div className="relative" ref={filterRef}>
              <button onClick={() => setShowFilter(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-50 border border-slate-100 rounded-xl text-slate-600 hover:bg-slate-100 transition-all font-semibold">
                <Filter className="w-3.5 h-3.5" />
                Filtres
                <ChevronDown className="w-3 h-3" />
              </button>
              {showFilter && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden p-3 space-y-3">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Trier par</p>
                    {([
                      { key: 'date_desc',       label: 'Plus récents' },
                      { key: 'date_asc',        label: 'Plus anciens' },
                      { key: 'priority_high',   label: 'Priorité haute' },
                      { key: 'priority_low',    label: 'Priorité basse' },
                    ] as const).map(o => (
                      <button key={o.key} onClick={() => setSort(o.key)}
                        className={`w-full text-left text-xs px-3 py-2 rounded-xl font-semibold transition-all
                          ${sort === o.key ? 'bg-[#6C63FF]/10 text-[#6C63FF]' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Priorité</p>
                    {(['all','urgent','normal','faible'] as const).map(p => (
                      <button key={p} onClick={() => setPriFilter(p)}
                        className={`w-full text-left text-xs px-3 py-2 rounded-xl font-semibold transition-all capitalize
                          ${priFilter === p ? 'bg-[#6C63FF]/10 text-[#6C63FF]' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {p === 'all' ? 'Toutes les priorités' : p === 'urgent' ? '🔴 Urgent' : p === 'normal' ? '🟡 Normal' : '🟢 Faible'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* View switch */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setView('board')}
                className={`p-1.5 rounded-lg transition-all ${view === 'board' ? 'bg-white shadow-sm text-[#6C63FF]' : 'text-slate-400 hover:text-slate-600'}`}
                title="Vue Tableau">
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setView('list')}
                className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm text-[#6C63FF]' : 'text-slate-400 hover:text-slate-600'}`}
                title="Vue Liste">
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOARD VIEW ── */}
      {view === 'board' && (
         <div className="flex-1 overflow-x-auto py-2">
          <div className="flex gap-5 h-full min-h-[calc(100vh-120px)]" style={{ minWidth: `${COLUMNS.length * 320 + 100}px` }}>
            {COLUMNS.map(col => {
              const colTasks = byCol(col.key)
              const isDropZone = dropTarget === col.key
              return (
                <div key={col.key}
                  className={`flex flex-col w-[340px] shrink-0 rounded-2xl transition-all duration-200 bg-slate-50/50 p-3 ${isDropZone ? 'ring-2 ring-[#6C63FF]/30 bg-[#6C63FF]/5' : ''}`}
                  onDragOver={e => onDragOver(e, col.key)}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={e => onDrop(e, col.key)}>

                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg" style={{ background: col.bg }}>
                        {col.icon}
                      </div>
                      <span className="text-sm font-extrabold text-slate-800">{col.label}</span>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Drop zone hint */}
                  {isDropZone && colTasks.length === 0 && (
                    <div className="border-2 border-dashed border-[#6C63FF]/30 rounded-2xl h-24 flex items-center justify-center bg-white/40">
                      <p className="text-xs text-[#6C63FF]/80 font-bold">Déposer la mission ici</p>
                    </div>
                  )}

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {colTasks.length === 0 && !isDropZone && (
                      <div className="text-center py-20 bg-white/30 rounded-2xl border border-slate-100">
                        <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-bold text-slate-400">Aucune mission</p>
                      </div>
                    )}
                    {colTasks.map(task => (
                      <TaskCard
                        key={task.tache_id}
                        task={task}
                        isDragging={dragging === task.tache_id}
                        isArchived={archivedIds.includes(task.tache_id)}
                        onClick={() => setDetail(task.tache_id)}
                        onDragStart={e => onDragStart(e, task.tache_id)}
                        onDragEnd={onDragEnd}
                        onMarkDone={() => updateStatus(task.tache_id, 'terminee')}
                        onArchive={() => toggleArchive(task.tache_id)}
                      />
                    ))}
                  </div>

                  {/* Drop indicator at bottom */}
                  {isDropZone && colTasks.length > 0 && (
                    <div className="border-2 border-dashed border-[#6C63FF]/30 rounded-2xl py-2 text-center bg-white/40 mt-3">
                      <p className="text-[10px] text-[#6C63FF] font-bold">Déposer ici</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
         <div className="flex-1 py-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 bg-slate-50 border-b border-slate-100">
              {['Tâche', 'Localisation', 'Priorité', 'Statut', 'Mise à jour', 'Actions'].map(h => (
                <p key={h} className="text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</p>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-black text-slate-400">Aucune tâche trouvée</p>
              </div>
            ) : (
              filtered.map((task, i) => {
                const p = getPri(task)
                const isArch = archivedIds.includes(task.tache_id)
                const statusMeta = task.statut_tache === 'en_attente'
                  ? { label:'Assignée', color:'#7C3AED', bg:'#F5F3FF', icon:<CalIcon className="w-3 h-3 text-purple-500" /> }
                  : task.statut_tache === 'en_cours'
                    ? { label:'En cours', color:'#1D4ED8', bg:'#EFF6FF', icon:<Circle className="w-3 h-3 text-blue-500" /> }
                    : { label:'Terminée', color:'#15803D', bg:'#F0FDF4', icon:<CheckCircle2 className="w-3 h-3 text-green-500" /> }
                return (
                  <div key={task.tache_id}
                    className={`grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center border-b border-slate-50 hover:bg-slate-50/60 transition-colors last:border-0 cursor-pointer ${i%2===0 ? '' : 'bg-slate-50/20'}`}
                    onClick={() => setDetail(task.tache_id)}>

                    {/* Task */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        {task.photo_avant_url && (
                          <img src={task.photo_avant_url} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-100 shadow-sm" alt="" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate hover:text-[#6C63FF] transition-colors">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono font-bold text-slate-300">
                              #{task.ref_citoyen || task.ref_service || task.tache_id.slice(0,8)}
                            </span>
                            {(task.type_probleme || task.category) && (
                              <span className="text-[10px] text-slate-400 font-semibold">· {task.type_probleme || task.category}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span className="truncate">{task.address || '—'}</span>
                    </div>

                    {/* Priority */}
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={{ color:p.color, background:p.bg, borderColor:p.border }}>
                        <span className="w-1 h-1 rounded-full" style={{ background:p.dot }} />
                        {p.label}
                      </span>
                    </div>

                    {/* Status */}
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-100"
                        style={{ color:statusMeta.color, background:statusMeta.bg }}>
                        {statusMeta.icon} {statusMeta.label}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="text-[11px] text-slate-400 font-semibold">
                      {fmtDate(task.tache_updated_at)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      {task.statut_tache === 'en_cours' && (
                        <button
                          onClick={() => updateStatus(task.tache_id, 'terminee')}
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-all border border-green-100 shadow-sm"
                          title="Marquer terminée">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => toggleArchive(task.tache_id)}
                        className={`p-1.5 rounded-lg transition-all border shadow-sm
                          ${isArch
                            ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'
                            : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100 hover:text-slate-600'}`}
                        title={isArch ? 'Désarchiver la mission' : 'Archiver la mission'}>
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── DETAIL DRAWER ── */}
      {detail && (
        <AgentDeclarationDetail
          tacheId={detail}
          onClose={() => setDetail(null)}
          onAccepted={() => { fetchTasks(true); setDetail(null) }}
          onRejected={() => { fetchTasks(true); setDetail(null) }}
        />
      )}
    </AgentLayout>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK CARD (Bento & Asana Inspired)
// ─────────────────────────────────────────────────────────────────────────────
interface CardProps {
  task:        BoardTask
  isDragging:  boolean
  isArchived:  boolean
  onClick:     () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd:   () => void
  onMarkDone:  () => void
  onArchive:   () => void
}

function TaskCard({ task, isDragging, isArchived, onClick, onDragStart, onDragEnd, onMarkDone, onArchive }: CardProps) {
  const p = getPri(task)
  
  // horizontal segments: 1 for attente, 2 for en_cours, 3 for terminee
  const segments = task.statut_tache === 'en_attente' ? 1 : task.statut_tache === 'en_cours' ? 2 : 3

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group/card flex flex-col relative
        ${isDragging ? 'opacity-40 scale-95 rotate-1 shadow-xl' : 'hover:-translate-y-0.5 duration-200'}`}>
      
      {/* Top accent priority bar */}
      <div className="h-1 w-full shrink-0 transition-opacity" style={{ background: p.dot }} />

      {/* Quick Hover Archive Button */}
      <button
        onClick={e => { e.stopPropagation(); onArchive() }}
        className={`absolute top-3 right-3 p-1.5 rounded-lg border shadow-sm transition-all z-10 opacity-0 group-hover/card:opacity-100
          ${isArchived 
            ? 'bg-amber-100 text-amber-700 border-amber-200' 
            : 'bg-white/90 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border-slate-100'}`}
        title={isArchived ? 'Désarchiver' : 'Archiver la mission'}>
        <Archive className="w-3.5 h-3.5" />
      </button>

      {/* Media Preview (If any) */}
      {task.photo_avant_url && (
        <div className="relative h-28 overflow-hidden bg-slate-50 shrink-0">
          <img src={task.photo_avant_url} alt="" className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          {/* Photos count */}
          {task.photos_count > 1 && (
            <span className="absolute bottom-2 right-2 text-[9px] bg-black/50 text-white px-2 py-0.5 rounded-full font-bold backdrop-blur-sm">
              📸 {task.photos_count}
            </span>
          )}
        </div>
      )}

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Title + Checkbox line */}
        <div className="flex gap-2.5 items-start mb-2">
          {/* Status Checkbox */}
          <button 
            onClick={e => {
              e.stopPropagation()
              if (task.statut_tache === 'en_cours') onMarkDone()
            }}
            className={`mt-0.5 shrink-0 transition-all rounded-full p-0.5
              ${task.statut_tache === 'terminee' 
                ? 'text-green-500' 
                : task.statut_tache === 'en_cours'
                  ? 'text-slate-300 hover:text-[#6C63FF]'
                  : 'text-slate-200'}`}
            disabled={task.statut_tache !== 'en_cours'}>
            {task.statut_tache === 'terminee' ? (
              <CheckCircle2 className="w-4 h-4 fill-green-50" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
          </button>

          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-800 leading-snug line-clamp-2 group-hover/card:text-[#6C63FF] transition-colors">
              {task.title}
            </h3>
            {task.description && (
              <p className="text-[11px] text-slate-400 font-medium line-clamp-2 mt-1 leading-normal">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* 3-Segment Progress bar */}
        <div className="flex gap-1.5 my-3 shrink-0">
          {[1, 2, 3].map(seg => (
            <div 
              key={seg} 
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{
                background: seg <= segments 
                  ? task.statut_tache === 'terminee' ? '#22C55E' : '#3B82F6'
                  : '#E2E8F0'
              }}
            />
          ))}
        </div>

        {/* Info pills */}
        <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
          {/* Priority pill */}
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-sm"
            style={{ color:p.color, background:p.bg, borderColor:p.border }}>
            <Flag className="w-2.5 h-2.5 fill-current" />
            {p.label}
          </span>
          {/* Category pill */}
          {(task.type_probleme || task.category) && (
            <span className="text-[9px] bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold shadow-sm">
              {task.type_probleme || task.category}
            </span>
          )}
          {/* Comment pill */}
          <span className="inline-flex items-center gap-1.5 text-[9px] bg-slate-50 border border-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold shadow-sm">
            <MessageSquare className="w-2.5 h-2.5" />
            {task.votes_count || 0}
          </span>
        </div>

        {/* Address */}
        {task.address && (
          <p className="text-[10px] text-slate-400 flex items-center gap-1.5 font-bold mb-3 truncate shrink-0">
            <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
            <span className="truncate">{task.address}</span>
          </p>
        )}

        {/* Divider & User info */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-50 shrink-0 mt-auto">
          {/* User stacked details */}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] text-white font-extrabold shadow-sm border border-white"
              style={{ background: avatarColor(task.citizen_first_name) }}>
              {task.citizen_first_name?.[0]?.toUpperCase()}
            </div>
            <span className="text-[10px] text-slate-400 font-bold">
              {task.citizen_first_name} {task.citizen_last_name?.[0]}.
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Calendar pill */}
            <span className="inline-flex items-center gap-1 text-[9px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-extrabold border border-slate-100 shadow-sm">
              <CalIcon className="w-2.5 h-2.5 text-slate-400" />
              {fmtDate(task.tache_updated_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}