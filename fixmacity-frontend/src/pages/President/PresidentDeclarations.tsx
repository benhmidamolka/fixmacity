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
  Activity, Zap, Shield, School, Hospital, ArrowUpDown, ThumbsUp,
  Check, RotateCcw
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { AnimatePresence, motion } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

// Faceted Filter Component
interface FacetedFilterProps {
  title: string
  options: { label: string; value: string; icon?: React.ElementType }[]
  selected: string[]
  onChange: (vals: string[]) => void
  icon: React.ElementType
}

const FacetedFilter: React.FC<FacetedFilterProps> = ({ title, options, selected, onChange, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-slate-300 text-xs font-medium hover:border-slate-400 transition-all bg-white",
          selected.length > 0 && "border-solid border-[#1557FF] bg-blue-50/50 text-[#1557FF]"
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{title}</span>
        {selected.length > 0 && (
          <>
            <div className="w-px h-3 bg-slate-300 mx-1" />
            <div className="flex gap-1">
              {selected.length > 2 ? (
                <span className="bg-[#1557FF] text-white px-1.5 py-0.5 rounded-md text-[9px]">{selected.length} sélectionnés</span>
              ) : (
                selected.map(val => {
                  const opt = options.find(o => o.value === val);
                  return (
                    <span key={val} className="bg-[#1557FF]/10 text-[#1557FF] px-1.5 py-0.5 rounded-md text-[9px]">
                      {opt?.label || val}
                    </span>
                  )
                })
              )}
            </div>
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[100] overflow-hidden"
          >
            <div className="p-2 border-b border-slate-100 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input 
                autoFocus
                placeholder={`Filtrer ${title.toLowerCase()}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full py-1.5 text-xs border-none outline-none placeholder-slate-400"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <p className="p-4 text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">Aucun résultat</p>
              ) : (
                filteredOptions.map(opt => {
                  const isSelected = selected.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (isSelected) onChange(selected.filter(s => s !== opt.value))
                        else onChange([...selected, opt.value])
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                        isSelected ? "bg-[#1557FF] border-[#1557FF]" : "border-slate-200 bg-white group-hover:border-slate-300"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {opt.icon && <opt.icon className={cn("w-3.5 h-3.5", isSelected ? "text-[#1557FF]" : "text-slate-400")} />}
                      <span className={cn("text-xs font-medium", isSelected ? "text-[#1557FF]" : "text-slate-600")}>
                        {opt.label}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
            {selected.length > 0 && (
              <div className="p-1 border-t border-slate-100">
                <button 
                  onClick={() => { onChange([]); setIsOpen(false); }}
                  className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-3 h-3" /> Effacer les filtres
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface Decl {
  id:string; ref_citoyen:string; ref_service:string|null
  title:string; category:string; status:string; priority:string
  arrondissement:string; address?:string; agent:string|null; votes:number; date:string
  lat: number | null; lng: number | null; image?: string;
  resolution_image?: string;
  description: string;
  rejection_reason?: string; citizen_rating?: number; citizen_comment?: string;
  created_at: string;
  is_sensitive?: boolean; 
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
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);"></div>`,
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
  const [statusF, setStatusF]     = useState<string[]>([])
  const [categoryF, setCategoryF] = useState<string[]>([])
  const [priorityF, setPriorityF] = useState<string[]>([])
  const [arrondissementF, setArrondissementF] = useState<string[]>([])
  const [dateOrder, setDateOrder] = useState<'newest' | 'oldest'>('newest')
  const [sortBy, setSortBy]       = useState<'votes' | 'priority' | 'sensitive'>('priority')
  
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
              resolution_image: d.resolution_image_url || null,
              description: d.description || d.title,
              is_sensitive: d.is_sensitive || false,
              sensitive_type: d.sensitive_type || 'none'
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
      if (categoryF.length > 0 && !categoryF.includes(d.category)) return false
      if (priorityF.length > 0 && !priorityF.includes(d.priority)) return false
      if (arrondissementF.length > 0 && !arrondissementF.includes(d.arrondissement)) return false
      if (statusF.length > 0 && !statusF.includes(d.status)) return false

      if (mode === 'incoming') {
        if (d.status !== 'soumise') return false
      } else {
        if (d.status === 'soumise' && statusF.length === 0) return false
      }
      return true
    })

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'sensitive') {
        const score = { 'hospital': 2, 'school': 1, 'none': 0 };
        const sA = score[a.sensitive_type || 'none'];
        const sB = score[b.sensitive_type || 'none'];
        if (sA !== sB) return sB - sA;
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
        <div className="flex flex-wrap items-center gap-2 mb-8 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
          <div className="relative group flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-[#1557FF] transition-colors" />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-[#0A1628] placeholder-slate-400 focus:ring-2 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all shadow-sm"
            />
          </div>

          <FacetedFilter 
            title="Statut"
            icon={Activity}
            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label, icon: Clock }))}
            selected={statusF}
            onChange={setStatusF}
          />

          <FacetedFilter 
            title="Catégorie"
            icon={LayoutGrid}
            options={CATEGORIES.map(c => ({ value: c, label: c, icon: Filter }))}
            selected={categoryF}
            onChange={setCategoryF}
          />

          <FacetedFilter 
            title="Priorité"
            icon={Zap}
            options={Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({ value: k, label: v.label, icon: AlertTriangle }))}
            selected={priorityF}
            onChange={setPriorityF}
          />

          <FacetedFilter 
            title="Arrondissement"
            icon={MapPin}
            options={ARRONDISSEMENTS.map(a => ({ value: a, label: a, icon: MapPin }))}
            selected={arrondissementF}
            onChange={setArrondissementF}
          />

          <FacetedFilter 
            title="Trier par"
            icon={ArrowUpDown}
            options={[
              { value: 'priority', label: 'Urgence', icon: AlertTriangle },
              { value: 'votes', label: 'Votes', icon: ThumbsUp },
              { value: 'sensitive', label: 'Localisation Sensible', icon: Shield },
            ]}
            selected={[sortBy]}
            onChange={(vals) => vals.length > 0 && setSortBy(vals[vals.length - 1] as any)}
          />

          {(statusF.length > 0 || categoryF.length > 0 || priorityF.length > 0 || arrondissementF.length > 0 || search) && (
            <button 
              onClick={() => {
                setStatusF([])
                setCategoryF([])
                setPriorityF([])
                setArrondissementF([])
                setSearch('')
                setSortBy('priority')
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors border border-transparent hover:border-rose-100 rounded-full"
            >
              Réinitialiser <RotateCcw className="w-3 h-3" />
            </button>
          )}

          <div className="ml-auto flex gap-2">
             <button 
                onClick={() => setDateOrder(dateOrder === 'newest' ? 'oldest' : 'newest')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-[#1557FF] hover:text-[#1557FF] transition-all shadow-sm"
              >
                <Calendar className="w-3 h-3"/> 
                {dateOrder === 'newest' ? 'Récents' : 'Anciens'}
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
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDecl(null)} />
            <div className="relative bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              {/* Simple Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-xl font-black text-[#0A1628] tracking-tight">{selectedDecl.title}</h3>
                  <p className="text-[10px] font-black text-[#1557FF] uppercase tracking-widest mt-1">{selectedDecl.ref_citoyen} • {selectedDecl.category}</p>
                </div>
                <button onClick={() => setSelectedDecl(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                {/* Photos Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">État Signalé (Citoyen)</p>
                    <div className="aspect-video rounded-3xl overflow-hidden border border-slate-100 bg-slate-50">
                      <img src={selectedDecl.image} alt="Avant" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  {['resolue', 'cloturee'].includes(selectedDecl.status) && selectedDecl.resolution_image && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">État Résolu (Agent)</p>
                      <div className="aspect-video rounded-3xl overflow-hidden border border-emerald-100 bg-emerald-50">
                        <img src={selectedDecl.resolution_image} alt="Après" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Square */}
                <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[#1557FF]">
                      <FileText size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Description</span>
                    </div>
                    <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{selectedDecl.description}"</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-500">
                      <MapPin size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Localisation</span>
                    </div>
                    <div className="text-sm font-bold text-[#0A1628]">
                      {selectedDecl.address || "Adresse non spécifiée"}
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{selectedDecl.arrondissement}</p>
                    </div>
                  </div>
                </div>

                {/* Assignment / Status */}
                <div className="space-y-6">
                  {selectedDecl.status === 'soumise' ? (
                    <div className="p-6 rounded-[2rem] bg-blue-50 border border-blue-100">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-5 h-5 text-[#1557FF]" />
                        <h4 className="text-sm font-black text-[#0A1628] uppercase tracking-widest">Affecter à un département</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {departments.map(dept => (
                          <button 
                            key={dept.id}
                            onClick={() => handleAssign(selectedDecl, dept.id)}
                            className="py-3 px-4 rounded-xl bg-white border border-blue-200 text-[10px] font-black uppercase tracking-widest text-[#1557FF] hover:bg-[#1557FF] hover:text-white transition-all shadow-sm flex items-center justify-between"
                          >
                            {dept.name} <ChevronRight className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#1557FF] font-black">
                          {selectedDecl.agent ? selectedDecl.agent.split(' ').map(n=>n[0]).join('') : '??'}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agent en charge</p>
                          <p className="text-sm font-black text-[#0A1628]">{selectedDecl.agent || 'Pôle Technique'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Statut</p>
                        <p className="text-sm font-black text-[#1557FF]" style={{ color: STATUS_CONFIG[selectedDecl.status]?.color }}>{STATUS_CONFIG[selectedDecl.status]?.label}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PresidentLayout>
  )
}

export default PresidentDeclarations

