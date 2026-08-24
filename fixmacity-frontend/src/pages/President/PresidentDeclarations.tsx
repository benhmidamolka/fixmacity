// src/pages/president/PresidentDeclarations.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import PresidentLayout from '../../layouts/PresidentLayout'
import DeclarationDetailDrawer from './Declarationdetaildrawer'
import {
  Search, MapPin, X, AlertTriangle, ChevronDown, List, Map,
  BrainCircuit, MessageSquare, ChevronRight, CheckCircle2,
  Filter, Calendar, Users, ArrowUpRight, BarChart3, Clock, LayoutGrid, FileText, Smartphone, Flame,
  Zap, Shield, School, Hospital, ArrowUpDown, ThumbsUp, Activity,
  Check, RotateCcw, ArrowLeft, Share2, Building2, Mail, Trash2,
  ZoomIn, ZoomOut, LocateFixed, Eye, UserPlus
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

import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../constants/declarations'

// ── Computed Priority ─────────────────────────────────────────────────────────
// Derives a 3-level priority (critical / normal / low) from:
//   • sensitive_type  — hospital (+3) or school (+2)
//   • category        — dangerous categories (+2)
//   • votes           — community signal (+1 per threshold)
//   • legacy priority — haute/urgent (+2), basse/low (−1)

const DANGEROUS_CATEGORIES = new Set([
  'Voirie', 'Réseaux', 'Éclairage public', 'Signalisation'
])

function computePriority(d: {
  sensitive_type?: string
  category?: string
  votes?: number
  priority?: string
}): 'critical' | 'normal' | 'low' {
  let score = 0
  // Zone sensitivity
  if (d.sensitive_type === 'hospital') score += 3
  else if (d.sensitive_type === 'school') score += 2
  // Category dangerousness
  if (DANGEROUS_CATEGORIES.has(d.category || '')) score += 2
  // Votes — community amplification
  const v = d.votes || 0
  if (v >= 20) score += 3
  else if (v >= 10) score += 2
  else if (v >= 3) score += 1
  // Legacy priority field
  if (['haute', 'high', 'urgent', 'urgente'].includes(d.priority || '')) score += 2
  else if (['basse', 'low'].includes(d.priority || '')) score -= 1

  if (score >= 5) return 'critical'
  if (score >= 2) return 'normal'
  return 'low'
}

const COMPUTED_PRIORITY_CONFIG: Record<'critical' | 'normal' | 'low', {
  label: string; color: string; bg: string; border: string; icon: string
}> = {
  critical: { label: 'Urgent', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: '🔴' },
  normal: { label: 'Normal', color: '#d97706', bg: '#fef3c7', border: '#fcd34d', icon: '🟡' },
  low: { label: 'Faible', color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: '🟢' },
}

const ARRONDISSEMENTS = ['Sousse Riadh', 'Sousse Nord', 'Sousse Sud', 'Sousse Médina']
const CATEGORIES = ['Voirie', 'Éclairage public', 'Propreté', 'Espaces Verts', 'Réseaux', 'Signalisation', 'Administratif', 'Suggestions']

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
          "flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-slate-300 dark:border-slate-700 text-xs font-medium hover:border-slate-400 dark:hover:border-slate-600 transition-all bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300",
          selected.length > 0 && "border-solid border-[#1557FF] dark:border-[#1557FF] bg-blue-50/50 dark:bg-blue-500/10 text-[#1557FF]"
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
            className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-none z-[100] overflow-hidden"
          >
            <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                placeholder={`Filtrer ${title.toLowerCase()}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full py-1.5 text-xs border-none outline-none placeholder-slate-400 bg-transparent text-slate-700 dark:text-slate-200"
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
                        isSelected ? "bg-[#1557FF] border-[#1557FF]" : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-500"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {opt.icon && <opt.icon className={cn("w-3.5 h-3.5", isSelected ? "text-[#1557FF]" : "text-slate-400 dark:text-slate-500")} />}
                      <span className={cn("text-xs font-medium", isSelected ? "text-[#1557FF]" : "text-slate-600 dark:text-slate-300")}>
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
  id: string; ref_citoyen: string; ref_service: string | null
  department_id?: string | null
  title: string; category: string; status: string; priority: string
  computed_priority: 'critical' | 'normal' | 'low'
  ai_priority_confirmed?: boolean
  priority_score?: number
  arrondissement: string; address?: string; agent: string | null; votes: number; date: string
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

const MapController = () => {
  const map = useMap();
  return (
    <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
      <button
        onClick={() => map.locate({ setView: true, maxZoom: 15 })}
        className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#1557FF] dark:hover:text-[#1557FF] transition-colors border border-slate-200 dark:border-slate-700"
      >
        <LocateFixed className="w-5 h-5" />
      </button>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
        <button
          onClick={() => map.zoomIn()}
          className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#1557FF] dark:hover:text-[#1557FF] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => map.zoomOut()}
          className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#1557FF] dark:hover:text-[#1557FF] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

const getPriorityBadgeConfig = (priority: string) => {
  const p = (priority || '').toLowerCase()
  if (['critical', 'urgent', 'critique'].includes(p)) {
    return {
      label: 'Critique',
      classes: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/30',
      icon: '🔴'
    }
  }
  if (['haute', 'high'].includes(p)) {
    return {
      label: 'Haute',
      classes: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/30',
      icon: '🟠'
    }
  }
  if (['normal', 'moyenne', 'medium'].includes(p)) {
    return {
      label: 'Moyenne',
      classes: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30',
      icon: '🟡'
    }
  }
  return {
    label: 'Faible',
    classes: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30',
    icon: '🟢'
  }
}

const PresidentDeclarations: React.FC = () => {
  const [decls, setDecls] = useState<Decl[]>([])
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState<string[]>([])
  const [categoryF, setCategoryF] = useState<string[]>([])
  const [priorityF, setPriorityF] = useState<string[]>([])
  const [arrondissementF, setArrondissementF] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<string[]>([])
  const [dateOrder, setDateOrder] = useState<'newest' | 'oldest'>('newest')
  const [sortBy, setSortBy] = useState<'votes' | 'priority' | 'sensitive'>('priority')

  const [viewMode, setViewMode] = useState<'map' | 'list'>('list')
  const [selectedDecl, setSelectedDecl] = useState<Decl | null>(null)
  const [showComments, setShowComments] = useState(false)
  const [mode, setMode] = useState<'all' | 'soumise' | 'refusee' | 'urgent'>('all')
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const location = useLocation()

  // Auto-open declaration detail when navigated from a notification
  useEffect(() => {
    const state = location.state as { openDeclarationId?: string } | null
    if (!state?.openDeclarationId || loading || decls.length === 0) return
    const target = decls.find(d => d.id === state.openDeclarationId)
    if (target) {
      setSelectedDecl(target)
      // Clear the state so re-renders don't re-open it
      window.history.replaceState({}, document.title)
    }
  }, [location.state, decls, loading])

  const handleDelete = async (ids: string[]) => {
    if (!window.confirm(`Supprimer ${ids.length} signalement(s) ? Cette action est irréversible.`)) return
    try {
      const res = await fetch(`${API}/president/declarations/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ ids })
      })
      if (res.ok) {
        setDecls(prev => prev.filter(d => !ids.includes(d.id)))
        setSelectedIds([])
      } else {
        alert("Erreur lors de la suppression.")
      }
    } catch (err) {
      console.error(err)
      alert("Erreur réseau.")
    }
  }


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
      const res = await fetch(`${API}/president/declarations?limit=200`, {
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
          // ── Priority resolution (single source of truth) ─────────────────
          // Priority 1: president_override — explicit decision in drawer (urgent/normal/faible)
          // Priority 2: ai_priority_confirmed + legacy DB priority field (haute/moyenne/basse)
          // Priority 3: computePriority heuristic fallback
          const overrideToLevel: Record<string, 'critical' | 'normal' | 'low'> = {
            urgent: 'critical', critical: 'critical',
            normal: 'normal', moyenne: 'normal', medium: 'normal',
            faible: 'low', basse: 'low', low: 'low',
          }
          const dbToLevel: Record<string, 'critical' | 'normal' | 'low'> = {
            haute: 'critical', high: 'critical',
            moyenne: 'normal', medium: 'normal',
            basse: 'low', low: 'low',
          }

          // Check president_override first (set when president clicks override in the drawer)
          const presidentOverrideLevel = d.president_override
            ? (overrideToLevel[d.president_override?.toLowerCase()] ?? null)
            : null

          // Fall back to ai_priority_confirmed + DB priority field
          const confirmedLevel = !presidentOverrideLevel && d.ai_priority_confirmed
            ? (dbToLevel[d.priority?.toLowerCase()] ?? null)
            : null

          return {
            id: d.id, ref_citoyen: d.ref_citoyen || '—',
            ref_service: d.ref_service || null,
            department_id: d.department_id || null,
            title: d.title, category: d.category || 'Voirie',
            status: d.status, priority: d.priority || 'moyenne',
            ai_priority_confirmed: d.ai_priority_confirmed || false,
            priority_score: d.priority_score ?? null,
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
            citizen_avatar: undefined,
            // Final computed priority — consistent with the detail drawer display
            computed_priority: presidentOverrideLevel ?? confirmedLevel ?? computePriority({
              sensitive_type: d.sensitive_type || 'none',
              category: d.category || 'Voirie',
              votes: d.votes_count || 0,
              priority: d.priority || 'moyenne',
            }),
          }
        }))
      }
    } catch (_) { } finally {
      setLoading(false)
    }
  }, [])

  // Real-time: reload the board when a new citizen declaration is submitted
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const notif = e.detail as { type?: string }
      if (!notif || notif.type === 'NEW_DECLARATION' || notif.type === 'STATUS_CHANGE') {
        load()
      }
    }
    window.addEventListener('fmc:notification', handler as EventListener)
    return () => window.removeEventListener('fmc:notification', handler as EventListener)
  }, [load])

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
      } catch (_) { }
    }
    loadDepts()
    load()
  }, [load])


  const filtered = useMemo(() => {
    let result = decls.filter(d => {
      if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.ref_citoyen.toLowerCase().includes(search.toLowerCase()) && !(d.ref_service || '').toLowerCase().includes(search.toLowerCase())) return false
      if (categoryF.length > 0 && !categoryF.includes(d.category)) return false
      if (priorityF.length > 0 && !priorityF.includes(d.computed_priority)) return false
      if (arrondissementF.length > 0 && !arrondissementF.includes(d.arrondissement)) return false
      if (statusF.length > 0 && !statusF.includes(d.status)) return false

      if (dateFilter.length > 0) {
        const dDate = new Date(d.created_at)
        const now = new Date()
        let match = false
        if (dateFilter.includes('today') && dDate.toDateString() === now.toDateString()) match = true
        if (dateFilter.includes('week') && (now.getTime() - dDate.getTime()) <= 7 * 24 * 3600 * 1000) match = true
        if (dateFilter.includes('month') && (now.getTime() - dDate.getTime()) <= 30 * 24 * 3600 * 1000) match = true
        if (!match) return false
      }

      if (mode === 'soumise') {
        if (d.status !== 'soumise') return false
      } else if (mode === 'refusee') {
        if (!['refusee', 'refusee_chef', 'refusee_agent'].includes(d.status)) return false
      } else if (mode === 'urgent') {
        if (d.computed_priority !== 'critical') return false
      }
      return true
    })

    // Sorting — critical first, then by votes
    result.sort((a, b) => {
      const PRANK: Record<string, number> = { critical: 3, normal: 2, low: 1 }
      if (sortBy === 'priority') {
        const diff = (PRANK[b.computed_priority] || 0) - (PRANK[a.computed_priority] || 0)
        if (diff !== 0) return diff
      }
      if (sortBy === 'votes') {
        if (b.votes !== a.votes) return b.votes - a.votes
      }
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
  }, [decls, search, categoryF, priorityF, arrondissementF, statusF, dateFilter, mode, sortBy, dateOrder])

  const [searchResult, setSearchResult] = useState<Decl | null>(null)

  useEffect(() => {
    setSearchResult(null)
    const q = search.trim()
    if (q.length < 4) return

    const hasLocalMatch = decls.some(d =>
      d.title.toLowerCase().includes(q.toLowerCase()) ||
      d.ref_citoyen.toLowerCase().includes(q.toLowerCase())
    )
    if (hasLocalMatch) return

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/president/declarations?search=${encodeURIComponent(q)}&limit=5`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          const row = (data.declarations || [])[0]
          if (row) {
            setSearchResult({
              id: row.id, ref_citoyen: row.ref_citoyen || '—',
              ref_service: row.ref_service || null,
              department_id: row.department_id || null,
              title: row.title, category: row.category || 'Voirie',
              status: row.status, priority: row.priority || 'moyenne',
              computed_priority: computePriority({
                sensitive_type: row.sensitive_type || 'none',
                category: row.category || 'Voirie',
                votes: row.votes_count || 0,
                priority: row.priority || 'moyenne',
              }),
              arrondissement: row.delegation_name || 'Sousse Riadh',
              agent: row.agent_name || null, votes: row.votes_count || 0,
              date: new Date(row.created_at).toLocaleDateString('fr-FR'),
              created_at: row.created_at,
              lat: row.latitude ? parseFloat(row.latitude) : null,
              lng: row.longitude ? parseFloat(row.longitude) : null,
              description: row.description ?? '',
              citizen_name: row.users ? [row.users.first_name, row.users.last_name].filter(Boolean).join(' ') : `Réf. ${row.ref_citoyen}`,
              citizen_email: row.users?.email || '—',
            } as Decl)
          }
        }
      } catch { }
    }, 400)

    return () => clearTimeout(t)
  }, [search, decls])

  if (loading) return (
    <PresidentLayout title="Gestion des Signalements">
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-[3px] border-slate-100 dark:border-slate-800 border-t-[#1557FF] rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Synchronisation des signalements...</p>
      </div>
    </PresidentLayout>
  )

  return (
    <PresidentLayout title="Gestion des Signalements">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-black text-[#0A1628] dark:text-white tracking-tight mb-3">Signalements Citoyens</h1>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500 italic">Supervisez et affectez les interventions urbaines en temps réel.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-1.5 shadow-sm flex items-center gap-1">
              <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-[#1557FF] text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                <List className="w-5 h-5" />
              </button>
              <button onClick={() => setViewMode('map')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'map' ? 'bg-[#1557FF] text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                <Map className="w-5 h-5" />
              </button>
            </div>
            <div className="flex bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-1 shadow-sm">
              {[
                { id: 'all', label: 'Toutes', icon: LayoutGrid },
                { id: 'soumise', label: 'Nouveau', icon: Clock },
                { id: 'refusee', label: 'Refusé', icon: AlertTriangle },
                { id: 'urgent', label: 'Critique', icon: Flame }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id as any)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    mode === tab.id
                      ? "bg-white dark:bg-slate-700 text-[#1557FF] shadow-sm border border-slate-200/60 dark:border-slate-600"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
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
        <div className="flex flex-wrap items-center gap-2 mb-8 bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="relative group flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-[#1557FF] transition-colors" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-[#0A1628] dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all shadow-sm"
            />
          </div>

          <FacetedFilter
            title={statusF.length === 0 ? "Tous les statuts" : "Statut"}
            icon={Activity}
            options={Object.entries(STATUS_CONFIG)
              .filter(([k]) => ['soumise', 'assignee_chef', 'refusee_chef', 'en_cours', 'assignee_agent', 'resolue', 'cloturee', 'refusee_agent'].includes(k))
              .map(([k, v]) => ({ value: k, label: v.label, icon: Clock }))}
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
            title={priorityF.length === 0 ? 'Priorité' : 'Priorité'}
            icon={Zap}
            options={[
              { value: 'critical', label: '🔴 Critique', icon: AlertTriangle },
              { value: 'normal', label: '🟡 Normal', icon: Activity },
              { value: 'low', label: '🟢 Faible', icon: CheckCircle2 },
            ]}
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
            title="Période"
            icon={Calendar}
            options={[
              { value: 'today', label: "Aujourd'hui", icon: Calendar },
              { value: 'week', label: '7 derniers jours', icon: Calendar },
              { value: 'month', label: '30 derniers jours', icon: Calendar }
            ]}
            selected={dateFilter}
            onChange={setDateFilter}
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

          {(statusF.length > 0 || categoryF.length > 0 || priorityF.length > 0 || arrondissementF.length > 0 || dateFilter.length > 0 || search) && (
            <button
              onClick={() => {
                setStatusF([])
                setCategoryF([])
                setPriorityF([])
                setArrondissementF([])
                setDateFilter([])
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:border-[#1557FF] hover:text-[#1557FF] transition-all shadow-sm"
            >
              <Calendar className="w-3 h-3" />
              {dateOrder === 'newest' ? 'Récents' : 'Anciens'}
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="bg-[#1557FF] text-white p-4 rounded-3xl mb-6 flex items-center justify-between shadow-lg animate-in slide-in-from-top-4">
            <div className="flex items-center gap-4 pl-4">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                {selectedIds.length}
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em]">Éléments sélectionnés</p>
            </div>
            <div className="flex items-center gap-3 pr-2">
              <button
                onClick={() => handleDelete(selectedIds)}
                className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Supprimer la sélection
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* View Mode Content */}
        <div className="min-h-[600px]">

          {viewMode === 'list' ? (
            <div className="bg-white dark:bg-slate-900 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto">

              {/* Grid Header */}
              <div className="grid items-center gap-3 px-5 py-4 bg-[#0A1628] dark:bg-slate-900 border-b border-slate-700 dark:border-slate-800"
                style={{ gridTemplateColumns: '40px 80px minmax(120px,1.2fr) minmax(100px,1fr) minmax(90px,0.9fr) 95px 100px 80px 100px minmax(140px,auto)', minWidth: '900px' }}>

                {/* Checkbox column */}
                <div className="pl-5">
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
                        : "border-slate-400 bg-white/10 hover:border-white"
                    )}
                  >
                    {selectedIds.length === filtered.length && filtered.length > 0 && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>

                {/* Headers */}
                {['ID', 'Titre', 'Citoyen', 'Service', 'Statut', 'Priorité', 'Date', 'Localisation', 'Action'].map((h, index) => (
                  <p key={index} className="text-[10px] font-black uppercase tracking-wider text-white">
                    {h}
                  </p>
                ))}
              </div>

              {/* Grid Rows */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950">
                {filtered.length > 0 ? (
                  filtered.map((d, index) => {
                    const isRowSelected = selectedIds.includes(d.id)
                    const dept = departments.find(dep => dep.id === d.department_id)

                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDecl(d)}
                        className={cn(
                          "grid gap-3 px-5 py-4 items-center cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-slate-900/40",
                          isRowSelected && "bg-blue-50/30 dark:bg-blue-950/20",
                          index % 2 !== 0 ? "bg-slate-50/10 dark:bg-slate-900/10" : ""
                        )}
                        style={{ gridTemplateColumns: '40px 80px minmax(120px,1.2fr) minmax(100px,1fr) minmax(90px,0.9fr) 95px 100px 80px 100px minmax(140px,auto)', minWidth: '900px' }}
                      >
                        {/* Checkbox */}
                        <div className="pl-5" onClick={(e) => e.stopPropagation()}>
                          <div
                            onClick={() => {
                              if (isRowSelected) setSelectedIds(selectedIds.filter(id => id !== d.id))
                              else setSelectedIds([...selectedIds, d.id])
                            }}
                            className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                              isRowSelected
                                ? "bg-[#1557FF] border-[#1557FF]"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-600"
                            )}
                          >
                            {isRowSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </div>

                        {/* ID */}
                        <div>
                          <span className="text-[10px] font-black text-[#1557FF] uppercase tracking-widest">{d.ref_citoyen}</span>
                        </div>

                        {/* Titre */}
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-[#0A1628] dark:text-white truncate block" title={d.title}>
                            {d.title}
                          </span>
                        </div>

                        {/* Citoyen */}
                        <div>
                          <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 truncate block">
                            {d.citizen_name}
                          </span>
                        </div>

                        {/* Service */}
                        <div>
                          {dept ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black bg-blue-50 dark:bg-blue-950/40 text-[#1557FF] border border-blue-100 dark:border-blue-900/30 uppercase tracking-widest">
                              <Building2 className="w-2.5 h-2.5" />
                              {dept.name}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic">Non assigné</span>
                          )}
                        </div>

                        {/* Statut */}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG[d.status]?.color || '#94A3B8' }} />
                            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: STATUS_CONFIG[d.status]?.color || '#94A3B8' }}>
                              {STATUS_CONFIG[d.status]?.label || d.status}
                            </span>
                          </div>
                        </div>

                        {/* Priorité */}
                        <div>
                          {(() => {
                            const badge = getPriorityBadgeConfig(d.computed_priority || d.priority || 'normal')
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider justify-center w-fit transition-all",
                                  badge.classes
                                )}>
                                  <span className="text-[8px]">{badge.icon}</span>
                                  {badge.label}
                                  {d.ai_priority_confirmed && (
                                    <span title="Confirmé par le Président">
                                      <Shield className="w-2.5 h-2.5 ml-0.5 flex-shrink-0" />
                                    </span>
                                  )}
                                </span>
                              </div>
                            )
                          })()}
                        </div>

                        {/* Date */}
                        <div>
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-350">{d.date}</span>
                        </div>

                        {/* Localisation */}
                        <div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-black text-[#1557FF] uppercase tracking-widest truncate max-w-[90px]" title={d.arrondissement || '—'}>
                              {d.arrondissement || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Action */}
                        <div className="flex items-center justify-start gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedDecl(d)}
                            title="Voir les détails"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 hover:bg-[#1557FF] hover:text-white dark:hover:bg-[#1557FF] dark:hover:text-white transition-all shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {['soumise', 'soumis'].includes(d.status) && (
                            <button
                              onClick={() => setSelectedDecl(d)}
                              title="Affecter à un service"
                              className="p-1.5 rounded-lg bg-[#1557FF]/10 text-[#1557FF] hover:bg-[#1557FF] hover:text-white transition-all shadow-sm"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {['refusee_chef', 'refusee_agent', 'refusee'].includes(d.status) && (
                            <button
                              onClick={() => setSelectedDecl(d)}
                              title="Réassigner"
                              className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="py-32 text-center bg-white dark:bg-slate-950">
                    <div className="w-20 h-20 rounded-[2rem] bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto mb-6 text-slate-200 dark:text-slate-700">
                      <Smartphone className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-[#0A1628] dark:text-white mb-2">Aucun résultat</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium italic">Essayez de modifier vos filtres.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-950 rounded-[3rem] border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden h-[700px] relative">
              <style>{`
                .dark .leaflet-layer {
                  filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
                }
                .dark .leaflet-container {
                  background: #0f172a !important;
                }
              `}</style>
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
                <MapController />
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
                    <Calendar size={14} /> Imprimer
                  </button>
                  <button
                    onClick={() => handleDelete(selectedIds)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <X size={14} /> Supprimer
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

