// src/pages/president/PresidentDeclarations.tsx
import React, { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import PresidentLayout from '../../layouts/PresidentLayout'
import DeclarationCommentsPanel from '../../components/president/DeclarationCommentsPanel'
import { 
  Search, MapPin, X, AlertTriangle, ChevronDown, List, Map, 
  BrainCircuit, MessageSquare, ChevronRight, CheckCircle2, 
  Filter, Calendar, Users, ArrowUpRight, TrendingUp, 
  BarChart3, Clock, LayoutGrid, FileText, Smartphone,
  Activity, Zap, Shield, School, Hospital, ArrowUpDown, ThumbsUp
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

const STATUS_CONFIG: Record<string, { label:string; color:string; bg:string; dot:string }> = {
  soumise:        { label:'En cours',              color:'#F59E0B', bg:'#FFFBEB', dot:'#F59E0B' },
  assignee_chef:  { label:'Assigné département',   color:'#FF6B6B', bg:'#FFF5F5', dot:'#FF6B6B' },
  assignee_agent: { label:'Assigné agent',         color:'#4ECDC4', bg:'#F0FFFE', dot:'#4ECDC4' },
  en_cours:       { label:'En cours d\'action',    color:'#1557FF', bg:'#EEF2FF', dot:'#1557FF' },
  resolue:        { label:'Résolu',                color:'#10B981', bg:'#F0FDF4', dot:'#10B981' },
  cloturee:       { label:'Résolu',                color:'#845EC2', bg:'#F3EEFF', dot:'#845EC2' },
  refusee_chef:   { label:'Refusée Chef',          color:'#FF9671', bg:'#FFF7F2', dot:'#FF9671' },
  refusee_agent:  { label:'Refusée Agent',         color:'#D65DB1', bg:'#FFF0F9', dot:'#D65DB1' },
}

const PRIORITY_CONFIG: Record<string, { label:string; color:string; bg:string }> = {
  haute:   { label:'Urgente',  color:'#EF4444', bg:'#FEF2F2' },
  moyenne: { label:'Moyenne',  color:'#F59E0B', bg:'#FFFBEB' },
  basse:   { label:'Normale',  color:'#10B981', bg:'#F0FDF4' },
}

const CATEGORIES = ['Voirie', 'Éclairage public', 'Propreté', 'Espaces Verts', 'Réseaux', 'Signalisation', 'Administratif', 'Suggestions']
const ARRONDISSEMENTS = ['Sousse Riadh', 'Sousse Nord', 'Sousse Sud', 'Sousse Médina']

interface Decl {
  id:string; ref_citoyen:string; ref_service:string|null
  title:string; category:string; status:string; priority:string
  arrondissement:string; address?:string; agent:string|null; votes:number; date:string
  lat: number | null; lng: number | null; image?: string;
  rejection_reason?: string; citizen_rating?: number; citizen_comment?: string;
  created_at: string;
  is_sensitive?: boolean; // Near school/hospital
  sensitive_type?: 'school' | 'hospital' | 'none';
}

// ── UI Components ─────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, color, icon: Icon, trend }: any) => (
  <div className="group bg-white rounded-[2.5rem] p-8 border border-slate-200/60 hover:border-blue-400/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all duration-500 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-bl-[5rem] -mr-10 -mt-10 group-hover:bg-blue-50/50 transition-colors duration-500" />
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div className={`p-4 rounded-2xl ${color.bg} ${color.text} shadow-sm group-hover:scale-110 transition-transform duration-500`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
            <TrendingUp className="w-3 h-3" /> {trend}
          </span>
        )}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</p>
      <h3 className="text-4xl font-black text-[#0A1628] tracking-tight">{value}</h3>
      <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{sub}</p>
    </div>
  </div>
)

const createCustomIcon = (color: string, isUrgent: boolean = false, sensitive?: string) => {
  if (sensitive && sensitive !== 'none') {
    const iconHtml = sensitive === 'school' 
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49 0 2.87.47 4 1.26V8c0-1.1-.9-2-2-2h-8V4c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-2"></path><path d="M18 7v4"></path><path d="M16 9h4"></path></svg>';
    
    return L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: #6366F1; width: 36px; height: 36px; border-radius: 12px; border: 3px solid white; box-shadow: 0 8px 16px rgba(99, 102, 241, 0.4); display: flex; align-items: center; justify-content: center;">
               ${iconHtml}
             </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    })
  }
  if (isUrgent) {
    return L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: #EF4444; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2), 0 8px 16px rgba(239, 68, 68, 0.4); display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite;">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
             </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    })
  }
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })
}

const MapRecenter = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15, { animate: true });
  }, [lat, lng, map]);
  return null;
}

const PresidentDeclarations: React.FC = () => {
  const [decls, setDecls]         = useState<Decl[]>([])
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch]       = useState('')
  const [statusF, setStatusF]     = useState('Tous')
  const [categoryF, setCategoryF] = useState('Tous')
  const [priorityF, setPriorityF] = useState('Tous')
  const [arrondissementF, setArrondissementF] = useState('Tous')
  const [dateOrder, setDateOrder] = useState<'newest' | 'oldest'>('newest')
  const [sortBy, setSortBy]       = useState<'date' | 'votes' | 'priority'>('priority')
  
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list')
  const [selectedDecl, setSelectedDecl] = useState<Decl|null>(null)
  const [showComments, setShowComments] = useState(false)
  const [mode, setMode] = useState<'incoming' | 'tracking'>('incoming')
  const [loading, setLoading] = useState(true)

  const currentUserId = (() => {
    try {
      const t = localStorage.getItem('fmc_token')
      if (!t) return undefined
      return JSON.parse(atob(t.split('.')[1])).sub
    } catch { return undefined }
  })()

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await fetch(`${API}/president/departments`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          setDepartments((data.departments || []).map((d: any) => ({ id: d.id, name: d.name_fr || d.name })))
        }
      } catch (_) {}
    }
    loadDepts()

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/president/declarations?limit=50`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.declarations?.length) {
            setDecls(data.declarations.map((d: any) => ({
              id: d.id, ref_citoyen: d.ref_citoyen || '—',
              ref_service: d.ref_service || null,
              title: d.title, category: d.category || 'Voirie',
              status: d.status, priority: d.priority || 'moyenne',
              arrondissement: d.delegation_name || 'Sousse Riadh',
              agent: d.agent_name || null, votes: d.votes_count || 0,
              date: new Date(d.created_at).toLocaleDateString('fr-FR'),
              created_at: d.created_at,
              lat: d.latitude ? parseFloat(d.latitude) : null,
              lng: d.longitude ? parseFloat(d.longitude) : null,
              image: d.image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400',
              description: d.description || d.title,
              is_sensitive: d.is_sensitive || Math.random() > 0.8, // Mock if missing
              sensitive_type: d.sensitive_type || (Math.random() > 0.9 ? 'school' : Math.random() > 0.9 ? 'hospital' : 'none')
            })))
          }
        }
      } catch (_) {} finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleAssign = async (decl: Decl, deptId: string) => {
    try {
      const res = await fetch(`${API}/president/declarations/${decl.id}/assign`, {
        method:'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token()}` },
        body: JSON.stringify({ department_id: deptId })
      })
      if (res.ok) {
        setDecls(prev => prev.map(d => d.id === decl.id ? { ...d, status:'assignee_chef' } : d ))
        if (selectedDecl?.id === decl.id) {
          setSelectedDecl({ ...selectedDecl, status: 'assignee_chef' })
        }
        toast.success('Déclaration affectée avec succès')
      }
    } catch (_) {}
  }

  const filtered = useMemo(() => {
    let result = decls.filter(d => {
      if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.ref_citoyen.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryF !== 'Tous' && d.category !== categoryF) return false
      if (priorityF !== 'Tous' && d.priority !== priorityF) return false
      if (arrondissementF !== 'Tous' && d.arrondissement !== arrondissementF) return false
      if (statusF !== 'Tous' && d.status !== statusF) return false

      if (mode === 'incoming') {
        if (d.status !== 'soumise') return false
      } else {
        if (d.status === 'soumise' && statusF === 'Tous') return false
      }
      return true
    })

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'priority') {
        const pA = a.priority === 'haute' ? 3 : a.priority === 'moyenne' ? 2 : 1;
        const pB = b.priority === 'haute' ? 3 : b.priority === 'moyenne' ? 2 : 1;
        if (pA !== pB) return pB - pA;
      }
      if (sortBy === 'votes') {
        if (a.votes !== b.votes) return b.votes - a.votes;
      }
      
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateOrder === 'newest' ? dateB - dateA : dateA - dateB;
    })

    return result
  }, [decls, search, categoryF, priorityF, arrondissementF, statusF, mode, sortBy, dateOrder])

  const stats = {
    total: decls.length,
    urgent: decls.filter(d => d.priority === 'haute').length,
    pending: decls.filter(d => d.status === 'soumise').length,
    resolved: decls.filter(d => ['resolue', 'cloturee'].includes(d.status)).length
  }

  if (loading) return (
    <PresidentLayout title="Gestion des Signalements">
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-[3px] border-slate-100 border-t-[#1557FF] rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synchronisation des signalements...</p>
      </div>
    </PresidentLayout>
  )

  return (
    <PresidentLayout title="Gestion des Signalements">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-black text-[#0A1628] tracking-tight mb-3">Signalements Citoyens</h1>
            <p className="text-sm font-medium text-slate-400 italic">Supervisez et affectez les interventions urbaines en temps réel.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/50 backdrop-blur-md border border-slate-200/50 rounded-2xl p-1.5 shadow-sm flex items-center gap-1">
              <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-[#1557FF] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                <List className="w-5 h-5"/>
              </button>
              <button onClick={() => setViewMode('map')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'map' ? 'bg-[#1557FF] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                <Map className="w-5 h-5"/>
              </button>
            </div>
            <div className="hidden sm:flex bg-white/50 backdrop-blur-md border border-slate-200/50 rounded-2xl p-1.5 shadow-sm">
              <button onClick={() => setMode('incoming')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'incoming' ? 'bg-[#1557FF] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Flux Entrant</button>
              <button onClick={() => setMode('tracking')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'tracking' ? 'bg-[#1557FF] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Suivi Global</button>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          <KpiCard label="Nouveaux Signalements" value={stats.pending} sub="En attente d'affectation" color={{ bg: 'bg-amber-50', text: 'text-amber-600' }} icon={Smartphone} trend="+12% weekly" />
          <KpiCard label="Urgences Vitales" value={stats.urgent} sub="Priorité haute active" color={{ bg: 'bg-rose-50', text: 'text-rose-600' }} icon={AlertTriangle} />
          <KpiCard label="Interventions" value={stats.total - stats.pending} sub="En cours de traitement" color={{ bg: 'bg-blue-50', text: 'text-blue-600' }} icon={Activity} />
          <KpiCard label="Succès Global" value={`${((stats.resolved/stats.total)*100).toFixed(0)}%`} sub="Taux de résolution" color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }} icon={CheckCircle2} trend="Optimal" />
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-[3rem] border border-slate-200/60 p-8 mb-12 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#1557FF] transition-colors" />
              <input 
                type="text" 
                placeholder="Rechercher par référence..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-16 pl-16 pr-6 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold text-[#0A1628] placeholder-slate-400 focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
              <select 
                value={categoryF} 
                onChange={e => setCategoryF(e.target.value)}
                className="w-full h-16 pl-16 pr-10 appearance-none bg-slate-50/50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#0A1628] focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all cursor-pointer"
              >
                <option value="Tous">Toutes Catégories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
            </div>

            <div className="relative">
              <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
              <select 
                value={arrondissementF} 
                onChange={e => setArrondissementF(e.target.value)}
                className="w-full h-16 pl-16 pr-10 appearance-none bg-slate-50/50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#0A1628] focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all cursor-pointer"
              >
                <option value="Tous">Tous Arrondissements</option>
                {ARRONDISSEMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
            </div>

            <div className="relative">
              <Activity className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
              <select 
                value={statusF} 
                onChange={e => setStatusF(e.target.value)}
                className="w-full h-16 pl-16 pr-10 appearance-none bg-slate-50/50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#0A1628] focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all cursor-pointer"
              >
                <option value="Tous">Tous les Statuts</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center justify-between pt-6 border-t border-slate-50">
             <div className="flex gap-4">
                <button 
                  onClick={() => setDateOrder(dateOrder === 'newest' ? 'oldest' : 'newest')}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:border-[#1557FF] hover:text-[#1557FF] transition-all"
                >
                  <Calendar className="w-4 h-4"/> 
                  {dateOrder === 'newest' ? 'Plus récents' : 'Plus anciens'}
                </button>
                <button 
                  onClick={() => setSortBy(sortBy === 'votes' ? 'priority' : 'votes')}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:border-[#1557FF] hover:text-[#1557FF] transition-all"
                >
                  <ThumbsUp className="w-4 h-4"/>
                  {sortBy === 'votes' ? 'Priorité: Votes' : 'Priorité: Urgence'}
                </button>
             </div>
             <button 
                onClick={() => { setSearch(''); setCategoryF('Tous'); setPriorityF('Tous'); setArrondissementF('Tous'); setStatusF('Tous'); setDateOrder('newest'); setSortBy('priority'); }}
                className="px-8 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#1557FF] transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10"
              >
                Tout réinitialiser
              </button>
          </div>
        </div>

        {/* View Mode Content */}
        <div className="min-h-[600px]">
          {viewMode === 'list' ? (
            <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ID Signalement</th>
                    <th className="px-8 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Titre</th>
                    <th className="px-8 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Priorité</th>
                    <th className="px-8 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Statut</th>
                    <th className="px-8 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assigné à</th>
                    <th className="px-8 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date</th>
                    <th className="px-8 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Catégorie</th>
                    <th className="px-10 py-8 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length > 0 ? (
                    filtered.map(d => (
                      <tr key={d.id} onClick={() => setSelectedDecl(d)} className="group hover:bg-slate-50/50 cursor-pointer transition-all">
                        <td className="px-10 py-8">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-[#1557FF] uppercase tracking-widest">{d.ref_citoyen}</span>
                            <div className="flex items-center gap-1.5">
                               <MapPin className="w-3 h-3 text-slate-300"/>
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{d.arrondissement}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-8">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-black text-[#0A1628] tracking-tight group-hover:text-[#1557FF] transition-colors">{d.title}</span>
                            <div className="flex items-center gap-3">
                               {d.sensitive_type === 'school' && (
                                 <span className="flex items-center gap-1 text-[8px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                                   <School size={10}/> Zone École
                                 </span>
                               )}
                               {d.sensitive_type === 'hospital' && (
                                 <span className="flex items-center gap-1 text-[8px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                                   <Hospital size={10}/> Zone Hôpital
                                 </span>
                               )}
                               <span className="flex items-center gap-1 text-[8px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                                 <ThumbsUp size={10}/> {d.votes} Votes
                               </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-8">
                          <span 
                            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm"
                            style={{ 
                              color: PRIORITY_CONFIG[d.priority]?.color, 
                              borderColor: `${PRIORITY_CONFIG[d.priority]?.color}20`,
                              background: `${PRIORITY_CONFIG[d.priority]?.color}05`
                            }}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${d.priority === 'haute' ? 'animate-pulse' : ''}`} style={{ background: PRIORITY_CONFIG[d.priority]?.color }}/>
                            {PRIORITY_CONFIG[d.priority]?.label}
                          </span>
                        </td>
                        <td className="px-8 py-8">
                          <span 
                            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 shadow-sm"
                            style={{ color: STATUS_CONFIG[d.status]?.color, background: STATUS_CONFIG[d.status]?.bg }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: STATUS_CONFIG[d.status]?.dot }}/>
                            {STATUS_CONFIG[d.status]?.label}
                          </span>
                        </td>
                        <td className="px-8 py-8">
                          {d.agent ? (
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-600 border border-blue-100">
                                 {d.agent.split(' ').map(n=>n[0]).join('')}
                               </div>
                               <span className="text-xs font-black text-slate-700">{d.agent}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-300 italic uppercase tracking-widest">Non assigné</span>
                          )}
                        </td>
                        <td className="px-8 py-8">
                          <span className="text-[11px] font-bold text-slate-500">{d.date}</span>
                        </td>
                        <td className="px-8 py-8">
                          <span className="text-xs font-black text-slate-600 uppercase tracking-tight">{d.category}</span>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-[#1557FF] group-hover:border-[#1557FF]/30 group-hover:rotate-12 transition-all duration-300">
                            <ArrowUpRight className="w-5 h-5"/>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-32 text-center">
                        <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto mb-6 text-slate-200">
                          <Smartphone className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black text-[#0A1628] mb-2">Aucun signalement</h3>
                        <p className="text-sm text-slate-400 font-medium italic">Réessayez avec d'autres filtres.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden h-[700px] relative">
              <MapContainer center={[35.8256, 10.6369]} zoom={13} className="w-full h-full z-0" zoomControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                {filtered.filter(d => d.lat && d.lng).map(d => (
                  <Marker 
                    key={d.id} 
                    position={[d.lat!, d.lng!]} 
                    icon={createCustomIcon(STATUS_CONFIG[d.status]?.color || '#1557FF', d.priority === 'haute', d.sensitive_type)}
                    eventHandlers={{ click: () => setSelectedDecl(d) }}
                  />
                ))}
                {selectedDecl?.lat && selectedDecl?.lng && <MapRecenter lat={selectedDecl.lat} lng={selectedDecl.lng} />}
              </MapContainer>
            </div>
          )}
        </div>

        {/* Cinematic Detail Modal */}
        {selectedDecl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0A1628]/90 backdrop-blur-xl transition-opacity duration-700" onClick={() => { setSelectedDecl(null); setShowComments(false); }} />
            <div className={`relative bg-white rounded-[4rem] shadow-[0_64px_128px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in duration-500 flex flex-col md:flex-row ${showComments ? 'w-full max-w-7xl h-[90vh]' : 'w-full max-w-5xl max-h-[92vh]'}`}>
              
              <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
                {/* Visual Header */}
                <div className="relative h-[450px] shrink-0 overflow-hidden group">
                  <img src={selectedDecl.image} alt={selectedDecl.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/40 to-transparent" />
                  <button 
                    onClick={() => { setSelectedDecl(null); setShowComments(false); }} 
                    className="absolute top-10 right-10 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-2xl rounded-[1.5rem] flex items-center justify-center text-white border border-white/20 transition-all z-20"
                  >
                    <X className="w-7 h-7" />
                  </button>
                  <div className="absolute bottom-16 left-16 right-16">
                    <div className="flex flex-wrap gap-4 mb-8">
                      <span className="px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.25em] rounded-xl bg-white/10 backdrop-blur-md text-white border border-white/20">
                        {selectedDecl.category}
                      </span>
                      <span className="px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.25em] rounded-xl bg-[#1557FF] text-white shadow-xl shadow-blue-500/20">
                        {STATUS_CONFIG[selectedDecl.status]?.label}
                      </span>
                    </div>
                    <h3 className="text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[0.9] drop-shadow-2xl max-w-3xl">{selectedDecl.title}</h3>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-16 space-y-16">
                   {/* Description Block */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1557FF]">
                           <FileText size={20}/>
                        </div>
                        <h4 className="text-xl font-black text-[#0A1628] tracking-tight">Description du Citoyen</h4>
                      </div>
                      <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100">
                        <p className="text-lg font-medium text-slate-600 leading-relaxed italic">
                          "{selectedDecl.description || "Aucune description détaillée fournie."}"
                        </p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                      {[
                        { label: 'Référence', val: selectedDecl.ref_citoyen, icon: FileText, color: 'text-[#1557FF]' },
                        { label: 'Arrondissement', val: selectedDecl.arrondissement, icon: MapPin, color: 'text-slate-400' },
                        { label: 'Priorité', val: PRIORITY_CONFIG[selectedDecl.priority]?.label, icon: AlertTriangle, color: `text-[${PRIORITY_CONFIG[selectedDecl.priority]?.color}]` },
                        { label: 'Signalé le', val: selectedDecl.date, icon: Calendar, color: 'text-emerald-500' },
                      ].map(i => (
                        <div key={i.label} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col gap-3 group hover:bg-white hover:shadow-xl transition-all">
                          <i.icon className={`w-5 h-5 ${i.color} group-hover:scale-110 transition-transform`} />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{i.label}</p>
                            <p className="text-sm font-black text-[#0A1628] uppercase tracking-tight">{i.val}</p>
                          </div>
                        </div>
                      ))}
                   </div>

                   {/* Localisation & Agent Section */}
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                              <Map size={20}/>
                           </div>
                           <h4 className="text-xl font-black text-[#0A1628] tracking-tight">Localisation Précise</h4>
                        </div>
                        <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 space-y-4">
                           <div className="flex items-start gap-4">
                              <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-1"/>
                              <div>
                                <p className="text-sm font-black text-slate-800">{selectedDecl.address || "Adresse non spécifiée"}</p>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{selectedDecl.arrondissement}</p>
                              </div>
                           </div>
                           {selectedDecl.lat && selectedDecl.lng && (
                             <div className="pt-4 border-t border-slate-200">
                               <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Coordonnées GPS</p>
                               <p className="text-xs font-bold text-slate-500 mt-1">{selectedDecl.lat.toFixed(6)}, {selectedDecl.lng.toFixed(6)}</p>
                             </div>
                           )}
                        </div>
                      </div>

                      <div className="space-y-6">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1557FF]">
                               <Users size={20}/>
                            </div>
                            <h4 className="text-xl font-black text-[#0A1628] tracking-tight">Personnel Affecté</h4>
                         </div>
                         <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 group hover:bg-white hover:shadow-xl transition-all">
                            <div className="w-20 h-20 rounded-[1.75rem] bg-white shadow-2xl flex items-center justify-center text-[#1557FF] font-black text-lg border border-slate-50 group-hover:rotate-6 transition-transform">
                              {selectedDecl.agent ? selectedDecl.agent.split(' ').map(n=>n[0]).join('') : '??'}
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Intervenant Désigné</p>
                              <p className="text-xl font-black text-[#0A1628] tracking-tight">{selectedDecl.agent || 'Pôle Technique'}</p>
                              <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-1">
                                {selectedDecl.agent ? "Mission en cours" : "En attente d'assignation"}
                              </p>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-10">
                     <div className="flex items-center gap-6">
                        <div className="h-px flex-1 bg-slate-100"/>
                        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-300">Décision & Action</span>
                        <div className="h-px flex-1 bg-slate-100"/>
                     </div>

                     {selectedDecl.status === 'soumise' ? (
                        <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-900/40">
                          <div className="absolute top-0 right-0 w-80 h-80 bg-[#1557FF]/10 rounded-bl-full -mr-32 -mt-32 blur-3xl opacity-50"/>
                          <div className="relative">
                            <div className="flex items-center gap-6 mb-10">
                              <div className="w-16 h-16 rounded-[1.75rem] bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-2xl">
                                <Shield className="w-8 h-8 text-blue-400"/>
                              </div>
                              <div>
                                <h4 className="text-2xl font-black tracking-tight">Affectation Départementale</h4>
                                <p className="text-sm text-white/40 font-bold italic mt-1">Déléguer la mission au pôle technique compétent.</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                              {departments.map(dept => (
                                <button 
                                  key={dept.id} 
                                  onClick={() => handleAssign(selectedDecl, dept.id)}
                                  className="group py-6 px-8 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-widest text-white hover:bg-white hover:text-slate-900 transition-all flex items-center justify-between"
                                >
                                  {dept.name} <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0"/>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                     ) : (
                        <button 
                          onClick={() => setShowComments(!showComments)}
                          className={`w-full h-24 flex items-center justify-center gap-8 rounded-[3rem] text-xs font-black uppercase tracking-[0.4em] transition-all border-2 shadow-2xl ${showComments ? 'bg-[#0A1628] text-white border-[#0A1628] shadow-[#0A1628]/40' : 'bg-white border-slate-100 text-[#0A1628] hover:border-[#1557FF] hover:text-[#1557FF] shadow-slate-100'}`}
                        >
                          <MessageSquare className="w-7 h-7"/> {showComments ? 'Désactiver le Panel d\'Échanges' : 'Ouvrir le Panel de Communication'}
                        </button>
                     )}
                   </div>
                </div>
              </div>

              {/* Comments Lateral Panel */}
              {showComments && (
                <div className="w-full md:w-[540px] bg-slate-50 border-l border-slate-100 flex flex-col min-h-0 animate-in slide-in-from-right-20 duration-700">
                  <div className="p-12 border-b border-slate-100 bg-white shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-[#0A1628] flex items-center justify-center text-white shadow-2xl shadow-slate-900/40">
                        <BrainCircuit className="w-8 h-8"/>
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-[#0A1628] tracking-tight uppercase">Flux de Liaison</h4>
                        <p className="text-[10px] font-black text-[#1557FF] uppercase tracking-widest mt-1.5 flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Canal Sécurisé Actif
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 p-10 overflow-hidden">
                    <div className="h-full bg-white rounded-[3.5rem] border border-slate-200/60 shadow-2xl overflow-hidden">
                      <DeclarationCommentsPanel
                        declarationId={selectedDecl.id}
                        visibleChannels={['president_chef', 'chef_agent', 'agent_citizen']}
                        writableChannels={['president_chef']}
                        role="president"
                        currentUserId={currentUserId}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </PresidentLayout>
  )
}

export default PresidentDeclarations
