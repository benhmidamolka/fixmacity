// src/pages/president/PresidentDeclarations.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import DeclarationDetailDrawer from '../../components/president/DeclarationDetailDrawer'
import { 
  Search, MapPin, X, AlertTriangle, ChevronDown, List, Map, 
  BrainCircuit, MessageSquare, ChevronRight, CheckCircle2, 
  Filter, Calendar, Users, ArrowUpRight, BarChart3, Clock, LayoutGrid, FileText, Smartphone, Flame,
  Zap, Shield, School, Hospital, ArrowUpDown, ThumbsUp, Activity,
  Check, RotateCcw, ArrowLeft, Share2, Building2, Mail
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
  soumise:        { label:'Soumise',               color:'#F59E0B', bg:'#FFFBEB', dot:'#F59E0B' },
  assignee_chef:  { label:'Assignée chef',        color:'#FF6B6B', bg:'#FFF5F5', dot:'#FF6B6B' },
  assignee_agent: { label:'Assignée agent',       color:'#4ECDC4', bg:'#F0FFFE', dot:'#4ECDC4' },
  en_cours:       { label:'En cours',              color:'#1557FF', bg:'#EEF2FF', dot:'#1557FF' },
  resolue:        { label:'Resolue',               color:'#10B981', bg:'#F0FDF4', dot:'#10B981' },
  cloturee:       { label:'Clôturee',              color:'#845EC2', bg:'#F3EEFF', dot:'#845EC2' },
  refusee_chef:   { label:'Refusee chef',          color:'#EF4444', bg:'#FEF2F2', dot:'#EF4444' },
  refusee_agent:  { label:'Refusee agent',         color:'#D65DB1', bg:'#FFF0F9', dot:'#D65DB1' },
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
  citizen_name?: string;
  citizen_email?: string;
  citizen_avatar?: string;
}

// ── UI Components ─────────────────────────────────────────────────────────────

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
  const [mode, setMode] = useState<'all' | 'soumise' | 'en_cours' | 'urgent' | 'resolue'>('all')
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const currentUserId = (() => {
    try {
      const t = localStorage.getItem('fmc_token')
      if (!t) return undefined
      return JSON.parse(atob(t.split('.')[1])).sub
    } catch { return undefined }
  })()


  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/president/declarations?limit=50`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        const data = await res.json()
        const rows = data.declarations || []
        setDecls(rows.map((d: any) => {
          const cit = d.users
          const citizenName = cit
            ? [cit.first_name, cit.last_name].filter(Boolean).join(' ').trim()
            : ''
          return {
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
            image: d.image_url || undefined,
            resolution_image: d.resolution_image_url || undefined,
            description: d.description ?? '',
            is_sensitive: d.is_sensitive || false,
            sensitive_type: d.sensitive_type || 'none',
            citizen_name: citizenName || `Réf. ${d.ref_citoyen || String(d.id).slice(0, 8)}`,
            citizen_email: cit?.email || '—',
            citizen_avatar: undefined
          }
        }))
      }
    } catch (_) {} finally {
      setLoading(false)
    }
  }, [])

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
    load()
  }, [load])


  const filtered = useMemo(() => {
    let result = decls.filter(d => {
      if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.ref_citoyen.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryF.length > 0 && !categoryF.includes(d.category)) return false
      if (priorityF.length > 0 && !priorityF.includes(d.priority)) return false
      if (arrondissementF.length > 0 && !arrondissementF.includes(d.arrondissement)) return false
      if (statusF.length > 0 && !statusF.includes(d.status)) return false

      if (mode === 'soumise') {
        if (d.status !== 'soumise') return false
      } else if (mode === 'en_cours') {
        if (!['assignee_chef', 'assignee_agent', 'en_cours'].includes(d.status)) return false
      } else if (mode === 'urgent') {
        if (d.priority !== 'haute') return false
      } else if (mode === 'resolue') {
        if (!['resolue', 'cloturee'].includes(d.status)) return false
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
            <div className="flex bg-slate-50/50 backdrop-blur-md border border-slate-200/50 rounded-2xl p-1 shadow-sm">
              {[
                { id: 'all', label: 'Toutes', icon: LayoutGrid },
                { id: 'urgent', label: 'Critiques', icon: Flame },
                { id: 'en_cours', label: 'Assignées', icon: Users },
                { id: 'resolue', label: 'Résolues', icon: CheckCircle2 }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setMode(tab.id as any)} 
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    mode === tab.id 
                      ? "bg-white text-[#1557FF] shadow-sm border border-slate-200/60" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
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
            title={statusF.length === 0 ? "Tous les statuts" : "Statut"}
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
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="pl-10 pr-4 py-6 w-14">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedIds.length === filtered.length) setSelectedIds([])
                          else setSelectedIds(filtered.map(f => f.id))
                        }}
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all",
                          selectedIds.length === filtered.length && filtered.length > 0
                            ? "bg-[#1557FF] border-[#1557FF]" 
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        {selectedIds.length === filtered.length && filtered.length > 0 && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0A1628]">ID</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0A1628]">Titre</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0A1628]">Email</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0A1628] text-center">Status</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0A1628]">Priorité</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0A1628]">Assigné</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0A1628] text-center">Votes</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0A1628]">Date</th>
                    <th className="pr-10 pl-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#0A1628] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/50">
                  {filtered.length > 0 ? (
                    filtered.map(d => {
                      const isRowSelected = selectedIds.includes(d.id);
                      return (
                        <tr 
                          key={d.id} 
                          onClick={() => setSelectedDecl(d)} 
                          className={cn(
                            "group cursor-pointer transition-all hover:bg-slate-50/40",
                            isRowSelected && "bg-blue-50/30"
                          )}
                        >
                          <td className="pl-10 pr-4 py-6" onClick={(e) => e.stopPropagation()}>
                            <div 
                              onClick={() => {
                                if (isRowSelected) setSelectedIds(selectedIds.filter(id => id !== d.id))
                                else setSelectedIds([...selectedIds, d.id])
                              }}
                              className={cn(
                                "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                isRowSelected ? "bg-[#1557FF] border-[#1557FF]" : "border-slate-200 bg-white group-hover:border-slate-300"
                              )}
                            >
                              {isRowSelected && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </td>
                          <td className="px-4 py-6">
                            <span className="text-[10px] font-black text-[#1557FF] uppercase tracking-widest">{d.ref_citoyen}</span>
                          </td>
                          <td className="px-4 py-6">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-[#0A1628] truncate max-w-[200px]">{d.title}</span>
                              <div className="flex items-center gap-1.5 opacity-50">
                                 <MapPin className="w-2.5 h-2.5"/>
                                 <span className="text-[8px] font-bold uppercase tracking-tight">{d.arrondissement}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-6">
                            <span className="text-[11px] font-medium text-slate-500">{d.citizen_email}</span>
                          </td>
                          <td className="px-4 py-6 text-center">
                            <span 
                              className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
                              style={{ 
                                color: STATUS_CONFIG[d.status]?.color, 
                                backgroundColor: STATUS_CONFIG[d.status]?.bg,
                                borderColor: `${STATUS_CONFIG[d.status]?.color}15`
                              }}
                            >
                              {STATUS_CONFIG[d.status]?.label}
                            </span>
                          </td>
                          <td className="px-4 py-6">
                             <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIORITY_CONFIG[d.priority]?.color }} />
                                <span className="text-xs font-bold text-slate-600">{PRIORITY_CONFIG[d.priority]?.label}</span>
                             </div>
                          </td>
                          <td className="px-4 py-6">
                            {d.agent ? (
                              <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-[9px] font-black text-blue-600 border border-blue-100">
                                   {d.agent.split(' ').map(n=>n[0]).join('')}
                                 </div>
                                 <span className="text-[11px] font-bold text-slate-600">{d.agent}</span>
                              </div>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-300 italic uppercase tracking-widest">En attente</span>
                            )}
                          </td>
                          <td className="px-4 py-6 text-center">
                            <span className="text-[11px] font-black text-[#1557FF]">+{d.votes || 0}</span>
                          </td>
                          <td className="px-4 py-6">
                            <span className="text-[11px] font-medium text-slate-400">{d.date}</span>
                          </td>
                          <td className="pr-10 pl-4 py-6 text-right">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedDecl(d); }}
                              className="px-4 py-2 rounded-xl bg-[#1557FF]/5 text-[#1557FF] text-[10px] font-black uppercase tracking-widest hover:bg-[#1557FF] hover:text-white transition-all shadow-sm border border-[#1557FF]/10"
                            >
                              Détails
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-32 text-center">
                        <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto mb-6 text-slate-200">
                          <Smartphone className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black text-[#0A1628] mb-2">Aucun résultat</h3>
                        <p className="text-sm text-slate-400 font-medium italic">Essayez de modifier vos filtres.</p>
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

        <DeclarationDetailDrawer
          declarationId={selectedDecl?.id ?? null}
          onClose={() => setSelectedDecl(null)}
          onAssigned={() => { load(); setSelectedDecl(null) }}
          departments={departments}
          currentUserId={currentUserId}
        />

        {/* Floating Bulk Action Bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] w-full max-w-lg px-4"
            >
              <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-6">
                <div className="flex items-center gap-4 pl-2">
                  <div className="w-8 h-8 rounded-lg bg-[#1557FF] flex items-center justify-center text-white text-xs font-black">
                    {selectedIds.length}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Sélectionnés</p>
                    <p className="text-xs font-black text-white">Actions de groupe</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                   <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all">
                     <Calendar size={14}/> Imprimer
                   </button>
                   <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest transition-all">
                     <X size={14}/> Supprimer
                   </button>
                   <div className="w-px h-8 bg-white/10 mx-2" />
                   <button 
                     onClick={() => setSelectedIds([])}
                     className="p-2 text-white/40 hover:text-white transition-colors"
                   >
                     <X size={20} />
                   </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PresidentLayout>
  )
}

export default PresidentDeclarations

