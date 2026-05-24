// src/pages/Agent/AgentDeclarations.tsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, ChevronRight, MapPin, Loader2, RefreshCw, ClipboardList, Filter,
  Users, Calendar, Clock, User, AlertTriangle, Send, Lock, Unlock, FileText,
  MessageSquare, Image as ImageIcon, CheckCircle, XCircle, Briefcase, Crown, UserCheck
} from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../constants/declarations'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''
const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

interface Mission {
  id: string
  title: string
  description: string
  status: string
  priority: string
  address?: string
  location_name?: string
  category?: string
  created_at: string
  started_at?: string
  resolved_at?: string
  ref_citoyen?: string
  co_assignments_count?: number
}

// Timeline steps
const STEPS = [
  { key: 'assignee_agent', label: 'Assignée', icon: Lock },
  { key: 'en_cours', label: 'En cours', icon: Unlock },
  { key: 'resolue', label: 'Évalué', icon: CheckCircle },
  { key: 'cloturee', label: 'Clôturé', icon: Lock },
]
const stepIdx = (s: string) => STEPS.findIndex(t => t.key === s)

// Toast Component
function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border min-w-[320px] animate-bounce-short ${
      type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
    }`}>
      {type === 'ok' ? <CheckCircle size={18} className="text-emerald-500 shrink-0" /> : <AlertTriangle size={18} className="text-red-500 shrink-0" />}
      <p className="text-sm font-semibold flex-1">{msg}</p>
      <button onClick={onClose} className="opacity-40 hover:opacity-100 text-sm">✕</button>
    </div>
  )
}

// Channels for Comments
const CHANNELS = [
  { key: 'chef', label: 'Chef de Service', icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', desc: 'Message privé à votre chef' },
  { key: 'president', label: 'Président', icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', desc: 'Message à la direction' },
  { key: 'citizen', label: 'Citoyen', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: 'Message visible du citoyen' },
] as const

type Channel = 'chef' | 'president' | 'citizen'

const AgentDeclarations: React.FC = () => {
  const navigate = useNavigate()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filtering states
  const [search, setSearch] = useState('')
  const [priorityF, setPriorityF] = useState('all')
  
  // Drag & drop visual highlight
  const [draggedOverCol, setDraggedOverCol] = useState<string | null>(null)
  
  // Toast notifications
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const ok = (msg: string) => setToast({ msg, type: 'ok' })
  const err = (msg: string) => setToast({ msg, type: 'err' })

  // Active card details modal
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<any>(null)
  const [cardLoading, setCardLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [activeCh, setActiveCh] = useState<Channel>('chef')
  const [sendingComment, setSendingComment] = useState(false)

  // Resolve Modal details (when dragging to resolve or clicking resolve)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolveCardId, setResolveCardId] = useState<string | null>(null)
  const [report, setReport] = useState('')
  const [dateFin, setDateFin] = useState(new Date().toISOString().split('T')[0])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [resolvingBusy, setResolvingBusy] = useState(false)

  // Refusal Modal
  const [showRefuseModal, setShowRefuseModal] = useState(false)
  const [refuseCardId, setRefuseCardId] = useState<string | null>(null)
  const [refuseReason, setRefuseReason] = useState('')
  const [refusingBusy, setRefusingBusy] = useState(false)

  const loadMissions = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(`${API}/agent/declarations`, {
        headers: { Authorization: `Bearer ${tok()}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMissions(data.declarations || [])
    } catch {
      err('Impossible de charger les missions')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchCardDetails = async (id: string) => {
    setCardLoading(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${id}`, {
        headers: { Authorization: `Bearer ${tok()}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setActiveCard(data)
    } catch {
      err('Erreur lors du chargement des détails')
    } finally {
      setCardLoading(false)
    }
  }

  useEffect(() => {
    loadMissions()
  }, [])

  useEffect(() => {
    if (selectedCardId) {
      fetchCardDetails(selectedCardId)
    } else {
      setActiveCard(null)
    }
  }, [selectedCardId])

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, colStatus: string) => {
    e.preventDefault()
    setDraggedOverCol(colStatus)
  }

  const handleDragLeave = () => {
    setDraggedOverCol(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    setDraggedOverCol(null)
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return

    const mission = missions.find(m => m.id === id)
    if (!mission) return

    // Reconstruct valid business flows
    if (targetStatus === 'en_cours') {
      if (mission.status === 'assignee_agent') {
        // Transition Nouveau -> En cours (Accept)
        await acceptMission(id)
      } else if (mission.status === 'resolue') {
        err('Impossible de revenir en arrière sur une mission résolue')
      } else if (mission.status === 'cloturee') {
        err('Mission clôturée — statut final')
      } else {
        // already en cours
      }
    } else if (targetStatus === 'resolue') {
      if (mission.status === 'en_cours') {
        // Transition En cours -> Resolue
        setResolveCardId(id)
        setReport('')
        setPhotoFile(null)
        setPhotoPreview(null)
        setShowResolveModal(true)
      } else if (mission.status === 'assignee_agent') {
        err('Veuillez d\'abord accepter la mission avant de la résoudre')
      } else if (mission.status === 'cloturee') {
        err('Mission déjà clôturée')
      }
    } else if (targetStatus === 'cloturee') {
      if (mission.status === 'resolue') {
        // Transition Resolue -> Cloturee
        await closeMission(id)
      } else if (mission.status === 'en_cours') {
        err('Veuillez résoudre la mission avant de la clôturer')
      } else if (mission.status === 'assignee_agent') {
        err('Mission non acceptée')
      }
    } else if (targetStatus === 'assignee_agent') {
      err('Impossible de remettre une mission en statut à accepter')
    }
  }

  // API Call: Accept
  const acceptMission = async (id: string) => {
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok()}` }
      })
      if (!res.ok) throw new Error()
      ok('Mission acceptée ! Début de l\'intervention.')
      loadMissions(true)
      if (selectedCardId === id) fetchCardDetails(id)
    } catch {
      err('Erreur lors de l\'acceptation de la mission')
    }
  }

  // API Call: Resolve (from Resolve modal)
  const submitResolve = async () => {
    if (!photoFile) { err('Une photo de preuve d\'intervention est obligatoire.'); return }
    if (!report.trim()) { err('Un rapport d\'intervention est obligatoire.'); return }

    setResolvingBusy(true)
    try {
      // 1. Upload photo
      const fd = new FormData()
      fd.append('photo', photoFile)
      const photoRes = await fetch(`${API}/agent/declarations/${resolveCardId}/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok()}` },
        body: fd
      })
      if (!photoRes.ok) {
        const msg = (await photoRes.json()).error || 'Erreur lors du téléversement de la photo'
        err(msg)
        return
      }

      // 2. Resolve declaration
      const res = await fetch(`${API}/agent/declarations/${resolveCardId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ rapport_interne: report, date_fin: dateFin })
      })

      if (!res.ok) {
        const msg = (await res.json()).error || 'Erreur serveur'
        err(msg)
        return
      }

      ok('Mission résolue avec succès ! En attente de vérification.')
      setShowResolveModal(false)
      loadMissions(true)
      if (selectedCardId === resolveCardId && resolveCardId) fetchCardDetails(resolveCardId)
    } catch {
      err('Erreur lors de la résolution de la mission')
    } finally {
      setResolvingBusy(false)
    }
  }

  // API Call: Close
  const closeMission = async (id: string) => {
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok()}` }
      })
      if (!res.ok) throw new Error()
      ok('Mission clôturée avec succès !')
      loadMissions(true)
      if (selectedCardId === id) fetchCardDetails(id)
    } catch {
      err('Erreur lors de la clôture de la mission')
    }
  }

  // API Call: Refuse
  const submitRefuse = async () => {
    if (!refuseReason.trim()) { err('Le motif de refus est obligatoire.'); return }
    setRefusingBusy(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${refuseCardId}/refuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ raison: refuseReason })
      })
      if (!res.ok) {
        const msg = (await res.json()).error || 'Erreur'
        err(msg)
        return
      }
      ok('Mission refusée et renvoyée au Chef de Service.')
      setShowRefuseModal(false)
      setSelectedCardId(null)
      loadMissions(true)
    } catch {
      err('Erreur lors du refus de la mission')
    } finally {
      setRefusingBusy(false)
    }
  }

  // API Call: Add comment
  const handleAddComment = async () => {
    if (!commentText.trim()) return
    setSendingComment(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${selectedCardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ content: commentText, channel: activeCh })
      })
      if (!res.ok) throw new Error()
      setCommentText('')
      ok('Commentaire envoyé !')
      if (selectedCardId) fetchCardDetails(selectedCardId)
    } catch {
      err('Impossible d\'envoyer le commentaire')
    } finally {
      setSendingComment(false)
    }
  }

  // Photo change handler
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  // Local filters
  const filteredMissions = missions.filter(m => {
    if (priorityF !== 'all' && m.priority !== priorityF) return false
    if (search &&
      !m.title.toLowerCase().includes(search.toLowerCase()) &&
      !(m.ref_citoyen || '').toLowerCase().includes(search.toLowerCase())
    ) return false
    return true
  })

  // Columns definition
  const columns = [
    { key: 'assignee_agent', label: 'Nouvelles affectations', color: 'border-t-indigo-500 bg-indigo-50/20 text-indigo-700 bg-indigo-500/10' },
    { key: 'en_cours', label: 'En cours', color: 'border-t-blue-500 bg-blue-50/20 text-blue-700 bg-blue-500/10' },
    { key: 'resolue', label: 'Évalué (Résolues)', color: 'border-t-emerald-500 bg-emerald-50/20 text-emerald-700 bg-emerald-500/10' },
    { key: 'cloturee', label: 'Clôturé', color: 'border-t-slate-500 bg-slate-50/20 text-slate-700 bg-slate-500/10' },
  ]

  const activeChannelConfig = CHANNELS.find(ch => ch.key === activeCh)!

  return (
    <AgentLayout title="Tableau Kanban des Missions">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#0A1628]">Mon Suivi Kanban</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">
              Gérez l'avancement de vos interventions par glisser-déposer.
            </p>
          </div>
          <button
            onClick={() => loadMissions(true)}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-emerald-600 transition-colors px-4 py-2 bg-white border border-slate-100 rounded-xl hover:bg-emerald-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser le board
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3 items-center shadow-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par titre, code citoyen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 transition-colors placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={priorityF}
              onChange={e => setPriorityF(e.target.value)}
              className="text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="all">Toutes priorités</option>
              <option value="urgent">Urgent</option>
              <option value="haute">Urgent</option>
              <option value="moyenne">Normal</option>
              <option value="medium">Normal</option>
              <option value="basse">Faible</option>
              <option value="low">Faible</option>
            </select>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          </div>
        ) : (
          /* Kanban Board Scrollable Container */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            {columns.map(col => {
              const colMissions = filteredMissions.filter(m => m.status === col.key)
              const isOver = draggedOverCol === col.key
              
              return (
                <div
                  key={col.key}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className={`flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[500px] transition-all duration-300 ${
                    isOver ? 'ring-2 ring-emerald-400 border-emerald-400 scale-[1.01]' : ''
                  }`}
                >
                  {/* Column Header */}
                  <div className={`p-4 border-b border-slate-100 flex items-center justify-between border-t-4 rounded-t-2xl ${col.color}`}>
                    <h3 className="font-black text-sm uppercase tracking-wider">{col.label}</h3>
                    <span className="text-xs font-black bg-white/70 px-2.5 py-1 rounded-full text-slate-600 shadow-sm">
                      {colMissions.length}
                    </span>
                  </div>

                  {/* Column Body / Dropzone */}
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[600px]">
                    {colMissions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-100 rounded-xl">
                        <p className="text-xs text-slate-400 italic">Aucune mission</p>
                        {col.key === 'assignee_agent' && (
                          <p className="text-[10px] text-slate-300 mt-1">Les affectations de votre chef apparaîtront ici.</p>
                        )}
                      </div>
                    ) : (
                      colMissions.map(m => {
                        const p = PRIORITY_CONFIG[m.priority] || { label: m.priority, color: '#64748B', bg: '#F1F5F9' }
                        const s = STATUS_CONFIG[m.status]
                        
                        return (
                          <div
                            key={m.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, m.id)}
                            onClick={() => setSelectedCardId(m.id)}
                            className="bg-white rounded-xl border border-slate-200/60 p-3.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing group relative space-y-3"
                          >
                            {/* Card header */}
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-mono text-[9px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                {m.ref_citoyen}
                              </span>
                              <span
                                className="text-[9px] font-black px-2 py-0.5 rounded-full"
                                style={{ color: p.color, backgroundColor: p.bg }}
                              >
                                {p.label}
                              </span>
                            </div>

                            {/* Title & Description */}
                            <div>
                              <h4 className="text-xs font-black text-[#0A1628] leading-snug group-hover:text-emerald-600 transition-colors line-clamp-2">
                                {m.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-semibold line-clamp-1 mt-0.5">
                                {m.description}
                              </p>
                            </div>

                            {/* Metadata */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 border-t border-slate-50 text-[10px] text-slate-400 font-bold">
                              {(m.address || m.location_name) && (
                                <span className="flex items-center gap-1 min-w-0">
                                  <MapPin size={10} className="shrink-0" />
                                  <span className="truncate">{m.address || m.location_name}</span>
                                </span>
                              )}
                              {m.category && (
                                <span className="bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">
                                  {m.category}
                                </span>
                              )}
                            </div>

                            {/* Co-assignments indicator */}
                            <div className="flex items-center justify-between pt-1">
                              {m.co_assignments_count && m.co_assignments_count > 0 ? (
                                <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/50">
                                  <Users size={10} />
                                  <span>+{m.co_assignments_count} co-affectation{m.co_assignments_count > 1 ? 's' : ''}</span>
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-300 italic">Seul mobilisé</span>
                              )}

                              {/* Quick Actions inside Card */}
                              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {m.status === 'assignee_agent' && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        acceptMission(m.id)
                                      }}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                                      title="Accepter la mission"
                                    >
                                      <CheckCircle size={12} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setRefuseCardId(m.id)
                                        setRefuseReason('')
                                        setShowRefuseModal(true)
                                      }}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                                      title="Refuser la mission"
                                    >
                                      <XCircle size={12} />
                                    </button>
                                  </>
                                )}
                                {m.status === 'en_cours' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setResolveCardId(m.id)
                                      setReport('')
                                      setPhotoFile(null)
                                      setPhotoPreview(null)
                                      setShowResolveModal(true)
                                    }}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                                    title="Résoudre la mission"
                                  >
                                    <CheckCircle size={12} />
                                  </button>
                                )}
                                {m.status === 'resolue' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      closeMission(m.id)
                                    }}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                                    title="Clôturer la mission"
                                  >
                                    <Lock size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal: Card details, comments, and other co-affectations */}
        {selectedCardId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-100 flex flex-col md:flex-row max-h-[85vh]">
              
              {/* Modal Left: Core Details */}
              <div className="flex-1 p-6 md:p-8 overflow-y-auto border-r border-slate-100 space-y-6">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="font-mono text-xs font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                      Réf: {activeCard?.ref_citoyen}
                    </span>
                    <h3 className="text-xl font-black text-[#0A1628] leading-tight mt-3">
                      {activeCard?.title || 'Chargement des détails...'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedCardId(null)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {cardLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  </div>
                ) : activeCard ? (
                  <>
                    {/* General Timeline Step */}
                    <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
                      <span className="text-xs font-bold text-slate-500">Statut de la mission :</span>
                      <span
                        className="text-xs font-black px-3 py-1 rounded-full uppercase"
                        style={{
                          color: STATUS_CONFIG[activeCard.status]?.color,
                          backgroundColor: STATUS_CONFIG[activeCard.status]?.bg,
                          border: `1px solid ${STATUS_CONFIG[activeCard.status]?.dot}`
                        }}
                      >
                        {STATUS_CONFIG[activeCard.status]?.label}
                      </span>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Description</h4>
                      <p className="text-sm font-semibold text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        {activeCard.description || 'Aucune description fournie.'}
                      </p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Calendar, label: 'Soumis le', val: fmt(activeCard.created_at) },
                        { icon: Clock, label: 'Débuté le', val: fmt(activeCard.started_at) },
                        { icon: MapPin, label: 'Adresse', val: activeCard.address || activeCard.location_name || '—' },
                        { icon: User, label: 'Citoyen', val: activeCard.citizen ? `${activeCard.citizen.first_name} ${activeCard.citizen.last_name}` : '—' },
                      ].map(({ icon: Icon, label, val }) => (
                        <div key={label} className="flex items-start gap-2.5 bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                          <Icon size={14} className="text-slate-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">{label}</p>
                            <p className="text-xs font-black text-[#0A1628] truncate">{val}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Citizen Phone (If exists) */}
                    {activeCard.citizen?.phone && (
                      <div className="text-xs font-bold text-slate-500">
                        Téléphone Citoyen : <a href={`tel:${activeCard.citizen.phone}`} className="text-emerald-600 hover:underline">{activeCard.citizen.phone}</a>
                      </div>
                    )}

                    {/* Photo avant & après */}
                    {activeCard.photos?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Photos de preuve</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {activeCard.photos.map((p: any) => (
                            <div key={p.id} className="relative group">
                              <img
                                src={p.url}
                                alt="preuve"
                                className="w-full h-24 object-cover rounded-xl border border-slate-100 shadow-sm"
                              />
                              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                                {p.photo_type === 'avant' ? 'Avant' : 'Intervention'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions Panel */}
                    <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                      {activeCard.status === 'assignee_agent' && (
                        <>
                          <button
                            onClick={() => acceptMission(activeCard.id)}
                            className="flex-1 py-2.5 rounded-xl text-white font-bold bg-emerald-500 hover:bg-emerald-600 transition-colors text-sm shadow-md shadow-emerald-100"
                          >
                            Accepter la mission
                          </button>
                          <button
                            onClick={() => {
                              setRefuseCardId(activeCard.id)
                              setRefuseReason('')
                              setShowRefuseModal(true)
                            }}
                            className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors text-sm"
                          >
                            Refuser
                          </button>
                        </>
                      )}
                      {activeCard.status === 'en_cours' && (
                        <button
                          onClick={() => {
                            setResolveCardId(activeCard.id)
                            setReport('')
                            setPhotoFile(null)
                            setPhotoPreview(null)
                            setShowResolveModal(true)
                          }}
                          className="flex-1 py-2.5 rounded-xl text-white font-bold bg-blue-500 hover:bg-blue-600 transition-colors text-sm shadow-md shadow-blue-100"
                        >
                          Déclarer Résolue (Preuve Requise)
                        </button>
                      )}
                      {activeCard.status === 'resolue' && (
                        <button
                          onClick={() => closeMission(activeCard.id)}
                          className="flex-1 py-2.5 rounded-xl text-white font-bold bg-slate-700 hover:bg-slate-800 transition-colors text-sm shadow-md shadow-slate-200"
                        >
                          Clôturer définitivement
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              {/* Modal Right: Collaborative Co-assignments & Chat */}
              <div className="w-full md:w-[380px] bg-slate-50/50 p-6 flex flex-col max-h-[85vh] overflow-y-auto space-y-6">
                
                {/* 1. Co-assignments & Other agents */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Users size={13} /> Co-affectations & Autres agents
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                    Statut de la même déclaration citoyenne dans les autres services mobilisés :
                  </p>
                  
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {activeCard?.other_assignments && activeCard.other_assignments.length > 0 ? (
                      activeCard.other_assignments.map((assignment: any) => {
                        const hasAgent = assignment.agent && assignment.agent.first_name
                        return (
                          <div key={assignment.id} className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              hasAgent ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {hasAgent 
                                ? `${assignment.agent.first_name[0]}${assignment.agent.last_name?.[0] || ''}`.toUpperCase()
                                : '🏢'
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-slate-800 truncate">
                                {hasAgent ? `${assignment.agent.first_name} ${assignment.agent.last_name}` : 'Agent en attente'}
                              </p>
                              <p className="text-[9px] text-slate-400 font-bold truncate leading-none mt-0.5">
                                {assignment.department?.name_fr || 'Département'}
                              </p>
                            </div>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                              assignment.status === 'assignee_agent' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                              assignment.status === 'en_cours' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                              assignment.status === 'resolue' || assignment.status === 'cloturee' ? 'bg-green-50 text-green-600 border border-green-200' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {assignment.status === 'assignee_agent' ? 'À accepter' :
                               assignment.status === 'en_cours' ? 'En cours' :
                               assignment.status === 'resolue' ? 'Résolue' :
                               assignment.status === 'cloturee' ? 'Clôturée' : assignment.status}
                            </span>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Aucune autre co-affectation sur cette mission.</p>
                    )}
                  </div>
                </div>

                {/* 2. Chat / Internal Comments */}
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
                    <MessageSquare size={13} /> Messages internes
                  </h4>

                  {/* Channel selectors */}
                  <div className="flex gap-1.5 mb-2.5">
                    {CHANNELS.map(ch => (
                      <button
                        key={ch.key}
                        onClick={() => setActiveCh(ch.key)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          activeCh === ch.key
                            ? `${ch.color} ${ch.bg} ${ch.border}`
                            : 'text-slate-400 bg-white border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <ch.icon size={10} />
                        {ch.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  {/* Current Channel Info */}
                  <p className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg mb-3 ${activeChannelConfig.bg} ${activeChannelConfig.color}`}>
                    {activeChannelConfig.desc}
                  </p>

                  {/* Comments feed */}
                  <div className="flex-1 overflow-y-auto space-y-2 max-h-[220px] pr-1 mb-3">
                    {cardLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                      </div>
                    ) : activeCard?.comments && activeCard.comments.filter((c: any) => c.channel === activeCh).length > 0 ? (
                      activeCard.comments
                        .filter((c: any) => c.channel === activeCh)
                        .map((c: any) => (
                          <div key={c.id} className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-1.5 mb-1 text-[9px] text-slate-400 font-bold">
                              <span className="text-slate-700 font-black">
                                {c.author?.first_name} {c.author?.last_name?.[0]}.
                              </span>
                              <span className="bg-slate-100 text-[8px] px-1 py-0.2 rounded text-slate-500">
                                {c.author?.role}
                              </span>
                              <span className="ml-auto">{fmt(c.created_at)}</span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium">{c.content}</p>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-8">Aucun message sur ce canal.</p>
                    )}
                  </div>

                  {/* Input field */}
                  <div className={`flex gap-1.5 pt-2 border-t ${activeChannelConfig.border}`}>
                    <input
                      type="text"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                      placeholder="Tapez votre message..."
                      className="flex-1 text-xs px-3 py-2 bg-white rounded-xl border border-slate-200 outline-none focus:border-emerald-400 font-medium"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={sendingComment || !commentText.trim()}
                      className={`px-3 py-2 rounded-xl text-white transition-colors disabled:opacity-40 bg-emerald-500 hover:bg-emerald-600 shadow-sm shrink-0`}
                    >
                      <Send size={12} />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Modal: Resolve mission details & photo upload */}
        {showResolveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100 space-y-4">
              <h3 className="text-lg font-black text-[#0A1628]">Finaliser l'intervention</h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">
                Une photo de preuve d'intervention ainsi qu'un rapport sont requis pour résoudre cette mission.
              </p>

              {/* Photo Proof picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-400">Photo de preuve (Obligatoire)</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-2xl h-36 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative overflow-hidden"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="preuve preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="text-slate-300 w-8 h-8 mb-1.5" />
                      <span className="text-xs font-bold text-slate-500">Ajouter une photo</span>
                      <span className="text-[10px] text-slate-300 font-semibold">JPG, PNG ou WEBP</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Report Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-400">Rapport d'intervention (Obligatoire)</label>
                <textarea
                  value={report}
                  onChange={e => setReport(e.target.value)}
                  placeholder="Décrivez les travaux ou réparations effectués..."
                  rows={3}
                  className="w-full text-xs font-semibold p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400 placeholder:text-slate-400"
                />
              </div>

              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-400">Date de fin</label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={e => setDateFin(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-400"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowResolveModal(false)}
                  disabled={resolvingBusy}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 font-bold text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={submitResolve}
                  disabled={resolvingBusy}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold bg-blue-500 hover:bg-blue-600 transition-colors text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                >
                  {resolvingBusy && <Loader2 size={14} className="animate-spin" />}
                  Valider
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Refusal motif prompt */}
        {showRefuseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100 space-y-4">
              <h3 className="text-lg font-black text-[#0A1628]">Refuser la mission</h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">
                Veuillez justifier votre décision. Ce motif sera directement envoyé à votre Chef de Service.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-400">Motif de refus (Obligatoire)</label>
                <textarea
                  value={refuseReason}
                  onChange={e => setRefuseReason(e.target.value)}
                  placeholder="Justification détaillée du refus..."
                  rows={4}
                  className="w-full text-xs font-semibold p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-400 placeholder:text-slate-400"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowRefuseModal(false)}
                  disabled={refusingBusy}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 font-bold text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={submitRefuse}
                  disabled={refusingBusy || !refuseReason.trim()}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold bg-red-500 hover:bg-red-600 transition-colors text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-100"
                >
                  {refusingBusy && <Loader2 size={14} className="animate-spin" />}
                  Soumettre au Chef
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast */}
        {toast && (
          <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
        )}

      </div>
    </AgentLayout>
  )
}

export default AgentDeclarations
