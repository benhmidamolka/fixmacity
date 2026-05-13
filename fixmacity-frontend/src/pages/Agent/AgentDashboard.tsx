// src/pages/Agent/AgentDashboard.tsx
import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  CheckCircle, XCircle, Camera, Lock, Unlock, Send,
  Clock, MapPin, ThumbsUp, AlertTriangle, 
  X, MessageSquare, Star, Loader, ChevronRight,
  Filter, ArrowUpDown, MoreHorizontal, Info,
  Calendar, Check, AlertCircle, History, Search as SearchIcon,
  ClipboardList
} from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Task {
  id: string
  title: string
  description: string
  status: 'assignee_agent' | 'en_cours' | 'resolue' | 'refusee_agent' | 'cloturee'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  location_name?: string
  address?: string
  latitude?: number
  longitude?: number
  created_at: string
  started_at?: string
  resolved_at?: string
  category?: string
  citizen_name?: string
  citizen_avatar?: string
  photos?: { url: string }[]
  service_chief_comment?: string
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  assignee_agent: { label: 'À Accepter', color: '#6366F1', bg: '#EEF2FF' },
  en_cours:       { label: 'En Intervention', color: '#F59E0B', bg: '#FFFBEB' },
  resolue:        { label: 'Résolue', color: '#10B981', bg: '#ECFDF5' },
  refusee_agent:  { label: 'Refusée', color: '#EF4444', bg: '#FEF2F2' },
  cloturee:       { label: 'Clôturée', color: '#64748B', bg: '#F8FAFC' },
}

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low:    { label: 'Basse',     color: '#64748B', bg: '#F8FAFC', border: '#F1F5F9' },
  medium: { label: 'Normale',   color: '#3B82F6', bg: '#EFF6FF', border: '#DBEAFE' },
  high:   { label: 'Haute',     color: '#F97316', bg: '#FFF7ED', border: '#FFEDD5' },
  urgent: { label: 'URGENT',    color: '#EF4444', bg: '#FEF2F2', border: '#FEE2E2' },
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
const formatTime = (d?: string) => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'

const getRelativeTime = (dateStr: string) => {
  const now = new Date()
  const past = new Date(dateStr)
  const diffInMs = now.getTime() - past.getTime()
  const diffInMins = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMins / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInMins < 60) return `Il y a ${diffInMins} min`
  if (diffInHours < 24) return `Il y a ${diffInHours}h`
  return `Il y a ${diffInDays}j`
}

// ─── DETAIL COMPONENT ────────────────────────────────────────────────────────
const TaskDetail: React.FC<{ 
  task: Task; 
  onClose: () => void;
  onAccept: (id: string, date_debut: string) => void;
  onRefuse: (id: string) => void;
  onSuccess: () => void;
}> = ({ task, onClose, onAccept, onRefuse, onSuccess }) => {
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0])
  const [dateFin, setDateFin] = useState(new Date().toISOString().split('T')[0])
  const [report, setReport] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleResolve = async () => {
    if (new Date(dateFin) < new Date(dateDebut)) {
      alert("La date de fin ne peut pas être antérieure à la date de début.")
      return
    }

    setSubmitting(true)
    try {
      if (photo) {
        const formData = new FormData()
        formData.append('photo', photo)
        await fetch(`${import.meta.env.VITE_API_URL}/agent/declarations/${task.id}/photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` },
          body: formData
        })
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/agent/declarations/${task.id}/resolve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('fmc_token')}` 
        },
        body: JSON.stringify({ 
          date_fin: dateFin, 
          rapport_interne: report 
        })
      })

      if (res.ok) onSuccess()
      else {
        const data = await res.json()
        alert(data.error || "Erreur lors de la résolution")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Détails de la Mission</p>
              <h3 className="text-xl font-black text-[#0A1628] leading-tight">#{task.id.slice(0, 8)}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="relative flex items-center justify-between px-4">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 -z-10" />
            {[
              { id: 'assignee_agent', label: 'Assignée', icon: Lock },
              { id: 'en_cours', label: 'Acceptée', icon: Unlock },
              { id: 'resolue', label: 'Résolue', icon: CheckCircle }
            ].map((s, i) => {
              const active = task.status === s.id
              const done = (task.status === 'en_cours' && s.id === 'assignee_agent') || (task.status === 'resolue')
              return (
                <div key={s.id} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all ${
                    active ? 'bg-emerald-500 text-white scale-110 ring-4 ring-emerald-100' : 
                    done ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-300 border border-slate-100'
                  }`}>
                    {done && !active ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${active ? 'text-emerald-600' : 'text-slate-400'}`}>{s.label}</span>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Signalé le</p>
              <div className="flex items-center gap-2 text-[#0A1628]">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-black">{formatDate(task.created_at)}</span>
              </div>
            </div>
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Priorité</p>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${task.priority === 'urgent' ? 'text-red-500' : 'text-orange-400'}`} />
                <span className={`text-sm font-black uppercase ${task.priority === 'urgent' ? 'text-red-600' : 'text-[#0A1628]'}`}>
                  {PRIORITY_CFG[task.priority]?.label}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
              <h4 className="text-sm font-black text-[#0A1628] uppercase tracking-widest">Description & Lieu</h4>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div>
                <p className="text-sm font-black text-[#0A1628] mb-1">{task.title}</p>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{task.description}</p>
              </div>
              <div className="pt-4 border-t border-slate-50 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#0A1628]">{task.location_name || 'Emplacement spécifié'}</p>
                  <p className="text-[11px] text-slate-400 font-bold">{task.address || 'Sousse, Tunisie'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
              <h4 className="text-sm font-black text-[#0A1628] uppercase tracking-widest">Action Requise</h4>
            </div>

            {task.status === 'assignee_agent' && (
              <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100/50 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Info className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-emerald-800">Mission assignée par votre Chef de Service. Voulez-vous l'accepter ?</p>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest">Date prévue de début</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                    <input 
                      type="date"
                      value={dateDebut}
                      onChange={e => setDateDebut(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl text-sm font-black text-slate-700 shadow-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => onRefuse(task.id)}
                    className="py-4 rounded-2xl text-sm font-black text-slate-400 hover:bg-white hover:text-red-500 transition-all border border-transparent hover:border-red-100">
                    Refuser
                  </button>
                  <button onClick={() => onAccept(task.id, dateDebut)}
                    className="py-4 bg-emerald-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                    Accepter Mission
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {task.status === 'en_cours' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Preuve d'intervention (Obligatoire)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative aspect-video rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                      photoPreview ? 'border-emerald-500' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                    }`}
                  >
                    {photoPreview ? (
                      <>
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white font-black text-sm">Changer de photo</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                          <Camera className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-black text-slate-400">Cliquez pour prendre/ajouter une photo</p>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wide mt-2">JPG, PNG supportés</p>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rapport d'Intervention</label>
                  <textarea 
                    value={report}
                    onChange={e => setReport(e.target.value)}
                    placeholder="Détaillez les actions réalisées..."
                    className="w-full h-32 p-5 bg-slate-50 border-none rounded-[2rem] text-sm font-bold text-slate-700 placeholder-slate-300 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date de clôture effective</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      <input 
                        type="date"
                        value={dateFin}
                        onChange={e => setDateFin(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleResolve}
                  disabled={submitting || !photo || !report.trim()}
                  className="w-full py-5 bg-emerald-500 text-white rounded-2xl text-sm font-black shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {submitting ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Finaliser et Résoudre la Mission
                </button>
              </div>
            )}

            {task.status === 'resolue' && (
              <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                  <ThumbsUp className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-lg font-black text-emerald-800">Mission Terminée</p>
                  <p className="text-sm text-emerald-600 font-medium mt-1">L'intervention a été marquée comme résolue le {formatDate(task.resolved_at)}.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
const AgentDashboard: React.FC = () => {
  const location = useLocation()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'todo' | 'history'>('todo')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [refuseModal, setRefuseModal] = useState<string | null>(null)
  const [refuseReason, setRefuseReason] = useState('')

  useEffect(() => { fetchTasks() }, [])

  useEffect(() => {
    const missionId = location.state?.openMissionId
    if (missionId && tasks.length > 0) {
      const t = tasks.find(x => x.id === missionId)
      if (t) setSelectedTask(t)
    }
  }, [location.state, tasks])

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/agent/declarations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` }
      })
      const data = await res.json()
      const sorted = (data.declarations || []).sort((a: any, b: any) => {
        const pScore = { urgent: 4, high: 3, medium: 2, low: 1 }
        const scoreA = pScore[a.priority as keyof typeof pScore] || 0
        const scoreB = pScore[b.priority as keyof typeof pScore] || 0
        if (scoreA !== scoreB) return scoreB - scoreA
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setTasks(sorted)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(t => 
    activeTab === 'todo' 
      ? ['assignee_agent', 'en_cours'].includes(t.status)
      : ['resolue', 'refusee_agent', 'cloturee'].includes(t.status)
  )

  const handleAccept = async (id: string, date_debut?: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/agent/declarations/${id}/accept`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('fmc_token')}` 
        },
        body: JSON.stringify({ date_debut })
      })
      if (res.ok) {
        fetchTasks()
        setSelectedTask(prev => prev ? { ...prev, status: 'en_cours' } : null)
      }
    } catch (e) { console.error(e) }
  }

  const handleRefuse = async () => {
    if (!refuseReason.trim()) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/agent/declarations/${refuseModal}/refuse`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('fmc_token')}` 
        },
        body: JSON.stringify({ reason: refuseReason })
      })
      if (res.ok) {
        setRefuseModal(null)
        setRefuseReason('')
        setSelectedTask(null)
        fetchTasks()
      }
    } catch (e) { console.error(e) }
  }

  return (
    <AgentLayout title="Gestion des Missions">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#0A1628]">Mes Interventions</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-500 font-medium">Gérez vos tâches assignées et suivez vos résolutions.</p>
              {tasks.some(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'resolue') && (
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-full animate-pulse border border-red-200">
                  Urgences en attente
                </span>
              )}
            </div>
          </div>
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
            <button 
              onClick={() => setActiveTab('todo')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
                activeTab === 'todo' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Clock className="w-4 h-4" />
              À faire ({tasks.filter(t => ['assignee_agent', 'en_cours'].includes(t.status)).length})
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
                activeTab === 'history' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <History className="w-4 h-4" />
              Historique
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex-1 min-w-[240px] relative group">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Rechercher par titre, lieu ou catégorie..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm">
            <Filter className="w-4 h-4" />
            Filtres
          </button>
          <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm">
            <ArrowUpDown className="w-4 h-4" />
            Trier par priorité
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Mission</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Localisation</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Priorité</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Statut</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-slate-100 rounded-full w-1/3"></div></td>
                    </tr>
                  ))
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                          <ClipboardList className="w-10 h-10" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-[#0A1628]">Aucune mission pour le moment</p>
                          <p className="text-sm text-slate-400 font-medium">Vous serez notifié dès qu'une tâche vous sera assignée.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filteredTasks.map(task => {
                  const s = STATUS_CFG[task.status] || STATUS_CFG.assignee_agent
                  const p = PRIORITY_CFG[task.priority] || PRIORITY_CFG.medium
                  const isUrgent = task.priority === 'urgent' || task.priority === 'high'

                  return (
                    <tr 
                      key={task.id} 
                      onClick={() => setSelectedTask(task)}
                      className="group hover:bg-emerald-50/30 cursor-pointer transition-all border-l-4 border-l-transparent hover:border-l-emerald-500"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-sm ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-black transition-colors truncate ${isUrgent ? 'text-red-600' : 'text-[#0A1628] group-hover:text-emerald-600'}`}>
                              {task.title}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5 flex items-center gap-1.5">
                              {task.category || 'Maintenance'} • {getRelativeTime(task.created_at)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-xs font-bold truncate max-w-[180px]">{task.location_name || task.address || 'Sousse, Tunisie'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm"
                          style={{ color: p.color, backgroundColor: p.bg, borderColor: p.border }}>
                          {p.label}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }}></div>
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{s.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="p-2.5 rounded-xl text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 transition-all opacity-0 group-hover:opacity-100">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetail 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)}
          onAccept={handleAccept}
          onRefuse={(id) => setRefuseModal(id)}
          onSuccess={() => { fetchTasks(); setSelectedTask(null); }}
        />
      )}

      {refuseModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setRefuseModal(null)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center text-red-500 mb-6">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-[#0A1628] mb-2">Refuser la mission ?</h3>
              <p className="text-slate-500 font-medium mb-6">Veuillez indiquer la raison de votre refus pour information du chef de service.</p>
              
              <textarea 
                value={refuseReason}
                onChange={e => setRefuseReason(e.target.value)}
                placeholder="Ex: Matériel insuffisant, Indisponibilité immédiate..."
                className="w-full h-32 p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 placeholder-slate-300 focus:ring-2 focus:ring-red-500/20 outline-none resize-none"
              />

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button onClick={() => setRefuseModal(null)}
                  className="py-4 rounded-2xl text-sm font-black text-slate-400 hover:bg-slate-100 transition-all">
                  Annuler
                </button>
                <button onClick={handleRefuse} disabled={!refuseReason.trim()}
                  className="py-4 bg-red-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-red-200 hover:bg-red-600 transition-all disabled:opacity-50">
                  Confirmer le Refus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AgentLayout>
  )
}

export default AgentDashboard
