// src/pages/Agent/AgentDeclarationDetail.tsx
import React, { useEffect, useState, useCallback } from 'react'
import {
  X, Loader2, MapPin, Calendar, User, Phone, Mail, Check,
  AlertTriangle, CheckCircle2, Clock, Building2, Zap, Image, Archive, MessageSquare, Send
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'

// ── Supabase ──────────────────────────────────────────────────────────────────
const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── Types ─────────────────────────────────────────────────────────────────────
interface Task {
  tache_id: string
  declaration_id: string
  agent_id: string
  statut_tache: 'en_attente' | 'en_cours' | 'terminee' | 'annulee'
  motif_refus: string | null
  date_assignation: string
  tache_created_at: string
  // Declaration
  title: string
  description: string | null
  type_probleme: string | null
  category: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  status: string
  priority_score: number
  votes_count: number
  photo_avant_url: string | null
  ref_citoyen: string | null
  ref_service: string | null
  decl_created_at: string
  // AI Priority
  ai_priority: string | null
  ai_priority_score: number
  ai_confidence: number
  ai_reasoning: string | null
  ai_visible_issues: string[] | null
  is_sensitive: boolean
  sensitive_type: string | null
  sensitive_distance_m: number | null
  computed_priority: string | null
  final_priority: string | null
  president_override: string | null
  president_override_note: string | null
  priority_approved: boolean
  // Citizen
  citizen_first_name: string
  citizen_last_name: string
  citizen_email: string
  citizen_phone: string | null
  // Chef
  chef_first_name: string | null
  chef_last_name: string | null
  // Service
  service_name: string | null
  service_icon: string | null
  // Photos
  photos: { url: string; type: string }[]
  // Comments
  comments?: any[]
  // Other assignments
  other_assignments?: any[]
  // Internal report from resolution
  rapport_interne: string | null
  date_resolution: string | null
}

interface AgentDeclarationDetailProps {
  tacheId: string
  onClose: () => void
  onAccepted: () => void
  onRejected: () => void
}

// ── Priority & Status config ───────────────────────────────────────────────────
const PRI: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  faible:  { label: 'Faible',  color: '#15803D', bg: '#F0FDF4', border: '#86EFAC', icon: '🟢' },
  normal:  { label: 'Normal',  color: '#B45309', bg: '#FFFBEB', border: '#FCD34D', icon: '🟡' },
  urgent:  { label: 'Urgent',  color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', icon: '🔴' },
  haute:   { label: 'Urgent',  color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', icon: '🔴' },
  moyenne: { label: 'Normal',  color: '#B45309', bg: '#FFFBEB', border: '#FCD34D', icon: '🟡' },
  basse:   { label: 'Faible',  color: '#15803D', bg: '#F0FDF4', border: '#86EFAC', icon: '🟢' },
}

const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  en_attente:     { label: 'En attente',  color: '#7C3AED', bg: '#EDE9FE', dot: '#8B5CF6' },
  en_cours:       { label: 'En cours',    color: '#1D4ED8', bg: '#DBEAFE', dot: '#3B82F6' },
  terminee:       { label: 'Terminée',    color: '#15803D', bg: '#DCFCE7', dot: '#22C55E' },
  annulee:        { label: 'Refusée',     color: '#DC2626', bg: '#FEE2E2', dot: '#EF4444' },
}

const getPri = (t: Task) => PRI[(t.final_priority || t.ai_priority || 'normal').toLowerCase()] || PRI.normal

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function PriBadge({ task }: { task: Task }) {
  const p = getPri(task)
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0"
      style={{ color: p.color, background: p.bg, borderColor: p.border }}>
      {p.icon} {p.label}
    </span>
  )
}

function StatBadge({ s }: { s: string }) {
  const c = STATUS[s] || STATUS.en_attente
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
      style={{ color: c.color, background: c.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-black text-[#6C63FF] uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DETAIL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AgentDeclarationDetail({ tacheId, onClose, onAccepted, onRejected }: AgentDeclarationDetailProps) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'priority' | 'media' | 'comments'>('info')
  const [showRefuseForm, setShowRefuseForm] = useState(false)
  const [motif, setMotif] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Upload/Interactions States
  const [uploading, setUploading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [rapportInterne, setRapportInterne] = useState('')

  const MOTIFS = [
    'Hors de ma spécialité',
    'Équipement non disponible',
    'Informations insuffisantes',
    'Zone non accessible',
    'Doublon détecté',
    'Autre',
  ]

  // ── Fetch Task Detail ──────────────────────────────────────────────────────
  const fetchTaskDetail = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Get basic task info from Supabase (v_agent_tasks)
      const { data: taskData, error: taskErr } = await sb
        .from('v_agent_tasks')
        .select('*')
        .eq('tache_id', tacheId)
        .single()
      if (taskErr) throw taskErr

      // 2. Fetch full declaration details from Express backend
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/agent/declarations/${taskData.declaration_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('fmc_token')}`
        }
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Erreur lors du chargement des détails')
      }
      const declData = await res.json()

      // Normalise photos so frontend expects `url` and `type`
      const normalizedPhotos = (declData.photos || []).map((p: any) => ({
        ...p,
        url: p.url,
        type: p.photo_type === 'intervention' ? 'apres' : 'avant'
      }))

      // Merge task metadata and full declaration details!
      setTask({
        ...taskData,
        ...declData,
        photos: normalizedPhotos,
        comments: declData.comments || [],
        other_assignments: declData.other_assignments || [],
        rapport_interne: taskData.rapport_interne || declData.internal_intervention_report || null,
        date_resolution: taskData.date_resolution || declData.resolved_at || null
      } as any)
      
      // Pre-fill internal report if it exists
      if (taskData.rapport_interne) {
        setRapportInterne(taskData.rapport_interne)
      } else if (declData.internal_intervention_report) {
        setRapportInterne(declData.internal_intervention_report)
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du chargement des détails')
      onClose()
    } finally {
      setLoading(false)
    }
  }, [tacheId, onClose])

  useEffect(() => {
    fetchTaskDetail()
  }, [fetchTaskDetail])

  // ── Accept task ─────────────────────────────────────────────────────────────
  const acceptTask = async () => {
    if (!task) return
    setSubmitting(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/agent/declarations/${task.declaration_id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('fmc_token')}`
        }
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || "Erreur lors de l'acceptation de la mission")
      }
      toast.success('✅ Mission acceptée — Statut mis à jour')
      onAccepted()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Refuse task ─────────────────────────────────────────────────────────────
  const doRefuse = async () => {
    if (!task) return
    if (!motif.trim()) { toast.error('Le motif est obligatoire'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/agent/declarations/${task.declaration_id}/refuse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('fmc_token')}`
        },
        body: JSON.stringify({ raison: motif })
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Erreur lors du refus de la mission')
      }
      toast.success('⚠️ Mission refusée — Chef de service notifié')
      onRejected()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Upload photo après intervention ──────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !task) return
    setUploading(true)
    const formData = new FormData()
    formData.append('photo', file)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/agent/declarations/${task.declaration_id}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('fmc_token')}`
        },
        body: formData
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Erreur lors du téléversement')
      }
      toast.success('📸 Photo après intervention ajoutée !')
      fetchTaskDetail() // Refresh details to show photo
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  // ── Resolve task ─────────────────────────────────────────────────────────────
  const resolveTask = async () => {
    if (!task) return
    setSubmitting(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/agent/declarations/${task.declaration_id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('fmc_token')}`
        },
        body: JSON.stringify({
          rapport_interne: rapportInterne,
          date_fin: new Date().toISOString()
        })
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Erreur lors de la résolution de la mission')
      }
      toast.success('🎉 Mission résolue avec succès !')
      onAccepted() // Refresh list on parent board and close drawer
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Send comment ─────────────────────────────────────────────────────────────
  const sendComment = async () => {
    if (!task || !newComment.trim()) return
    setSendingComment(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/agent/declarations/${task.declaration_id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('fmc_token')}`
        },
        body: JSON.stringify({ content: newComment, channel: 'chef_agent' })
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Erreur lors de l\'envoi du commentaire')
      }
      setNewComment('')
      toast.success('💬 Message envoyé')
      fetchTaskDetail() // Refresh comments list
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSendingComment(false)
    }
  }

  const getUserId = () => {
    try {
      const u = localStorage.getItem('fmc_user')
      if (u) return JSON.parse(u).id
    } catch(e) {}
    return null
  }

  const currentUserId = getUserId()
  const pri = task ? getPri(task) : null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/35 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full overflow-hidden animate-slide-in relative border-l border-slate-100">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
            <p className="text-xs font-semibold text-slate-400">Chargement de la mission...</p>
          </div>
        ) : task ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono font-bold text-slate-400">
                  #{task.ref_citoyen || task.ref_service || task.declaration_id.slice(0, 10)}
                </span>
                <StatBadge s={task.statut_tache} />
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title + priority */}
            <div className="px-6 py-4 border-b border-slate-50">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-black text-slate-800 leading-tight">{task.title}</h2>
                <PriBadge task={task} />
              </div>
              {(task.type_probleme || task.category) && (
                <span className="inline-block mt-2 text-[11px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-semibold">
                  {task.type_probleme || task.category}
                </span>
              )}
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-300" />
                Soumise le {fmt(task.decl_created_at)}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              {([
                { key: 'info',     label: '📋 Infos'      },
                { key: 'media',    label: '📸 Médias'      },
                { key: 'comments', label: '💬 Discussion'  },
                { key: 'priority', label: '🤖 Priorité'    },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex-1 py-3 text-xs font-bold transition-all border-b-2
                    ${activeTab === t.key
                      ? 'border-[#6C63FF] text-[#6C63FF] bg-white'
                      : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── INFO TAB ── */}
              {activeTab === 'info' && (
                <div className="p-6 space-y-5">
                  {/* Description */}
                  {task.description && (
                    <Section title="Description">
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">{task.description}</p>
                    </Section>
                  )}

                  {/* Location */}
                  <Section title="Localisation">
                    <p className="text-sm text-slate-700 flex items-start gap-2 font-semibold">
                      <MapPin className="w-4 h-4 text-[#6C63FF] shrink-0 mt-0.5" />
                      {task.address || 'Non renseignée'}
                    </p>
                    {task.latitude && task.longitude && (
                      <p className="text-[11px] text-slate-400 mt-1 ml-6 font-mono">
                        {task.latitude.toFixed(4)}° N, {Math.abs(task.longitude).toFixed(4)}° W
                      </p>
                    )}
                    {task.is_sensitive && (
                      <div className="mt-2 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs text-orange-600 font-semibold shadow-sm">
                        ⚠️ Zone sensible ({task.sensitive_type}) à {task.sensitive_distance_m ? `${Math.round(task.sensitive_distance_m)}m` : 'proximité'}
                      </div>
                    )}
                  </Section>

                  {/* Citizen info */}
                  <Section title="Informations citoyen">
                    <div className="space-y-2 text-sm bg-slate-50 border border-slate-100 rounded-2xl p-4">
                      <p className="flex items-center gap-2 text-slate-700 font-semibold">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{task.citizen_first_name} {task.citizen_last_name}</span>
                      </p>
                      {task.citizen_phone && (
                        <p className="flex items-center gap-2 text-slate-500 font-medium">
                          <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                          {task.citizen_phone}
                        </p>
                      )}
                      <p className="flex items-center gap-2 text-slate-500 font-medium">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        {task.citizen_email}
                      </p>
                    </div>
                  </Section>

                  {/* Assigned by */}
                  {(task.chef_first_name || task.service_name) && (
                    <Section title="Assignée par">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#6C63FF]/10 flex items-center justify-center text-[#6C63FF] font-black text-sm">
                          {task.chef_first_name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">
                            {task.chef_first_name} {task.chef_last_name}
                          </p>
                          <p className="text-xs text-slate-400">{task.service_name || 'Chef de service'}</p>
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* Co-assignments */}
                  {task.other_assignments && task.other_assignments.length > 0 && (
                    <Section title="Autres agents sur cette déclaration">
                      <div className="space-y-2">
                        {task.other_assignments.map((o: any) => {
                          const name = o.agent ? `${o.agent.first_name} ${o.agent.last_name}` : 'En attente d\'agent'
                          const dept = o.department ? o.department.name_fr : 'Département'
                          return (
                            <div key={o.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                  {name[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-700">{name}</p>
                                  <p className="text-[10px] text-slate-400">{dept}</p>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full font-bold text-[9px] uppercase bg-slate-100 text-slate-500">
                                {o.status}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </Section>
                  )}
                </div>
              )}

              {/* ── DISCUSSION TAB ── */}
              {activeTab === 'comments' && (
                <div className="p-6 flex flex-col h-full space-y-4">
                  <Section title="Commentaires de l'équipe (Chef & Agents)">
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {task.comments && task.comments.length > 0 ? (
                        task.comments.map((c: any) => {
                          const isMe = c.author?.id === currentUserId || c.user_id === currentUserId
                          const authorName = c.author ? `${c.author.first_name} ${c.author.last_name}` : 'Utilisateur'
                          const roleLabel = c.author?.role === 'chef' ? 'Chef de service' : 'Agent'
                          return (
                            <div key={c.id} className={`flex flex-col p-3 rounded-2xl border text-xs max-w-[85%]
                              ${isMe 
                                ? 'bg-[#6C63FF]/5 border-[#6C63FF]/20 self-end ml-auto' 
                                : 'bg-slate-50 border-slate-100 self-start mr-auto'}`}>
                              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-400">
                                <span className="text-slate-600">{authorName}</span>
                                <span>•</span>
                                <span className="uppercase tracking-wider text-[8px] px-1.5 py-0.2 bg-slate-100 rounded-full">{roleLabel}</span>
                                <span>•</span>
                                <span>{fmt(c.created_at)}</span>
                              </div>
                              <p className="text-slate-700 leading-normal font-semibold font-sans">{c.content}</p>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-10 text-slate-400 font-bold">
                          Aucun commentaire interne. Lancez la discussion !
                        </div>
                      )}
                    </div>
                  </Section>

                  {/* Send comment form */}
                  <div className="border-t border-slate-100 pt-4 flex gap-2">
                    <textarea
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Écrire un message pour l'équipe..."
                      rows={2}
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 resize-none font-semibold font-sans"
                    />
                    <button
                      onClick={sendComment}
                      disabled={!newComment.trim() || sendingComment}
                      className="px-4 bg-[#6C63FF] hover:bg-[#5b52e6] text-white text-xs font-black rounded-xl transition-all shadow-md shadow-[#6C63FF]/15 flex items-center justify-center">
                      {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* ── PRIORITY TAB ── */}
              {activeTab === 'priority' && pri && (
                <div className="p-6 space-y-4">
                  {/* Final priority */}
                  <div className="p-4 rounded-2xl border-2" style={{ background: pri.bg, borderColor: pri.border }}>
                    <p className="text-xs font-bold text-slate-500 mb-2">PRIORITÉ INTERNE</p>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{pri.icon}</span>
                      <div>
                        <p className="text-xl font-black" style={{ color: pri.color }}>{pri.label}</p>
                        {task.priority_approved && (
                          <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">
                            ✅ Approuvée par la direction
                          </span>
                        )}
                        {task.president_override && (
                          <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold ml-1">
                            ✏️ Modifiée par le président
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Score breakdown */}
                  <Section title="Détail du score">
                    <div className="space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                      {[
                        { label: 'Score IA',        value: task.ai_priority_score || 0, max: 10, color: '#6C63FF' },
                        { label: 'Bonus votes',     value: Math.min(Math.log(Math.max(task.votes_count || 0, 1) + 1) * 1.5, 5), max: 5, color: '#3B82F6' },
                      ].map(s => (
                        <div key={s.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold text-slate-600">{s.label}</span>
                            <span className="font-black text-slate-700">+{s.value.toFixed(1)}</span>
                          </div>
                          <div className="h-2 bg-slate-200/50 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(s.value / s.max * 100, 100)}%`, background: s.color }} />
                          </div>
                        </div>
                      ))}
                      {task.is_sensitive && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold text-slate-600">Bonus zone sensible</span>
                            <span className="font-black text-orange-500">+{task.sensitive_type === 'hospital' ? '4' : '3'}</span>
                          </div>
                          <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-orange-400" style={{ width: `${task.sensitive_type === 'hospital' ? 100 : 75}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm">
                      <span className="font-semibold text-slate-600">Score de priorité total</span>
                      <span className="font-black text-slate-800">{(task.ai_priority_score || 0).toFixed(1)} / 10</span>
                    </div>
                  </Section>

                  {/* AI Reasoning */}
                  {task.ai_reasoning && (
                    <Section title="Analyse IA">
                      <div className="bg-[#6C63FF]/5 border border-[#6C63FF]/15 rounded-xl p-3">
                        <p className="text-xs text-slate-600 leading-relaxed font-semibold">{task.ai_reasoning}</p>
                      </div>
                    </Section>
                  )}

                  {/* Visible issues */}
                  {task.ai_visible_issues && task.ai_visible_issues.length > 0 && (
                    <Section title="Problèmes détectés">
                      <div className="flex flex-wrap gap-2">
                        {task.ai_visible_issues.map((issue, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 font-semibold">
                            {issue}
                          </span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Confidence */}
                  <Section title="Confiance de l'IA">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#6C63FF]"
                          style={{ width: `${Math.round((task.ai_confidence || 0) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-black text-slate-700">
                        {Math.round((task.ai_confidence || 0) * 100)}%
                      </span>
                    </div>
                  </Section>

                  {/* Votes */}
                  <div className="flex items-center justify-between text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                    <span className="text-slate-500 font-medium">Votes citoyens</span>
                    <span className="font-black text-blue-600">{task.votes_count ?? 0} votes</span>
                  </div>
                </div>
              )}

              {/* ── MEDIA TAB ── */}
              {activeTab === 'media' && (
                <div className="p-6 space-y-5">
                  <Section title="Photo avant">
                    {task.photo_avant_url ? (
                      <img src={task.photo_avant_url} alt="Avant" className="w-full rounded-xl object-cover max-h-60 border border-slate-100 shadow-sm" />
                    ) : (
                      <div className="w-full h-32 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-300 flex-col gap-2">
                        <Image className="w-8 h-8" />
                        <p className="text-xs">Aucune photo disponible</p>
                      </div>
                    )}
                  </Section>

                  <Section title="Photos après intervention">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {task.photos && task.photos.filter(p => p.type === 'apres').map((p, i) => (
                        <img key={i} src={p.url} alt="Après" className="w-full h-32 object-cover rounded-2xl border border-slate-100 shadow-sm" />
                      ))}
                    </div>

                    {task.statut_tache === 'en_cours' && (
                      <div className="mt-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="photo-upload-input"
                        />
                        <label
                          htmlFor="photo-upload-input"
                          className="border-2 border-dashed border-[#6C63FF]/30 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-[#6C63FF]/5 hover:border-[#6C63FF] transition-all cursor-pointer group"
                        >
                          {uploading ? (
                            <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin mb-2" />
                          ) : (
                            <Image className="w-8 h-8 text-slate-400 group-hover:text-[#6C63FF] transition-colors mb-2" />
                          )}
                          <p className="text-xs font-bold text-slate-700 group-hover:text-[#6C63FF]">
                            {uploading ? 'Téléversement en cours...' : 'Ajouter une photo après intervention'}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">JPEG, PNG ou WEBP jusqu'à 10 Mo</p>
                        </label>
                      </div>
                    )}
                  </Section>
                </div>
              )}
            </div>

            {/* ── ACTIONS FOOTER ── */}
            {task.statut_tache === 'en_attente' && (
              <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                {!showRefuseForm ? (
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                      Votre décision
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <button onClick={acceptTask} disabled={submitting}
                        className="py-3 px-4 rounded-xl bg-green-500 text-white text-xs font-black hover:bg-green-600 transition-all shadow-md shadow-green-500/10 flex items-center justify-center gap-2">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Accepter la mission</>}
                      </button>
                      <button onClick={() => setShowRefuseForm(true)}
                        className="py-3 px-4 rounded-xl bg-red-50 text-red-600 text-xs font-black hover:bg-red-100 transition-all border border-red-100 flex items-center justify-center gap-2">
                        <X className="w-4 h-4" /> Refuser la mission
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Refuse form */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-red-500 uppercase tracking-wide">Motif du refus *</p>
                      <button onClick={() => setShowRefuseForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {MOTIFS.map(m => (
                        <button key={m} onClick={() => setMotif(m)}
                          className={`text-left text-xs font-semibold px-3 py-2.5 rounded-xl border-2 transition-all
                            ${motif === m
                              ? 'border-red-400 bg-red-50 text-red-600'
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                    <textarea value={motif} onChange={e => setMotif(e.target.value)}
                      placeholder="Détails complémentaires..." rows={2}
                      className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 resize-none font-semibold" />
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setShowRefuseForm(false)}
                        className="py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                        Retour
                      </button>
                      <button onClick={doRefuse} disabled={!motif.trim() || submitting}
                        className="py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black disabled:opacity-40 flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/10">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4" />Confirmer le refus</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {task.statut_tache === 'en_cours' && (
              <div className="border-t border-slate-100 p-6 bg-slate-50/50 space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2 font-sans">
                    Rapport d'intervention (Facultatif)
                  </label>
                  <textarea
                    value={rapportInterne}
                    onChange={e => setRapportInterne(e.target.value)}
                    placeholder="Détaillez les actions réalisées sur place..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/20 resize-none font-semibold font-sans"
                  />
                </div>

                {(() => {
                  const hasProof = task.photos?.some((p: any) => p.type === 'apres')
                  return (
                    <div className="space-y-3">
                      {!hasProof && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-[11px] text-amber-700 font-semibold shadow-sm leading-relaxed">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Une photo de preuve après intervention est obligatoire dans l'onglet <strong>📸 Médias</strong> avant de résoudre.</span>
                        </div>
                      )}
                      
                      <button
                        onClick={resolveTask}
                        disabled={!hasProof || submitting}
                        className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-black disabled:opacity-40 disabled:hover:bg-green-500 flex items-center justify-center gap-2 transition-all shadow-md shadow-green-500/10">
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Marquer comme Résolue
                          </>
                        )}
                      </button>
                    </div>
                  )
                })()}
              </div>
            )}

            {task.statut_tache === 'terminee' && (
              <div className="border-t border-slate-100 p-6 bg-slate-50/50 space-y-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-xs animate-fade-in">
                  <p className="font-black text-emerald-800 flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Mission Résolue & Terminée
                  </p>
                  {task.rapport_interne && (
                    <p className="text-slate-600 font-semibold leading-relaxed">
                      <strong>Rapport :</strong> {task.rapport_interne}
                    </p>
                  )}
                  {task.date_resolution && (
                    <p className="text-slate-400 text-[10px] font-bold mt-1">
                      Résolue le {fmt(task.date_resolution)}
                    </p>
                  )}
                </div>
                
                {/* Archive button */}
                <button
                  onClick={() => {
                    const saved = localStorage.getItem('fixmacity_archived_taches')
                    let list: string[] = []
                    if (saved) {
                      try { list = JSON.parse(saved) } catch(e) {}
                    }
                    if (!list.includes(task.tache_id)) {
                      list.push(task.tache_id)
                      localStorage.setItem('fixmacity_archived_taches', JSON.stringify(list))
                      toast.success('📦 Mission archivée')
                    }
                    onAccepted() // triggers parent refresh and close drawer
                  }}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all flex items-center justify-center gap-2">
                  <Archive className="w-4 h-4 text-slate-500" />
                  Archiver pour libérer le tableau
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <p className="text-xs font-semibold text-slate-500">Mission introuvable ou indisponible.</p>
          </div>
        )}
      </div>
    </div>
  )
}