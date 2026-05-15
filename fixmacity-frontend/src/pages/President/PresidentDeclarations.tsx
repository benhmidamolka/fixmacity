import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import PresidentLayout from '../../layouts/PresidentLayout'
import DeclarationCommentsPanel from '../../components/president/DeclarationCommentsPanel'
import { Search, MapPin, X, AlertTriangle, ChevronDown, List, Map, BrainCircuit, MessageSquare, ChevronRight } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

const STATUS_CONFIG: Record<string, { label:string; color:string; bg:string; dot:string }> = {
  soumise:        { label:'Soumise',        color:'#F59E0B', bg:'#FFFBEB', dot:'#F59E0B' }, // Amber
  assignee_chef:  { label:'Assignée Chef',  color:'#FF6B6B', bg:'#FFF5F5', dot:'#FF6B6B' }, // Coral
  assignee_agent: { label:'Assignée Agent', color:'#4ECDC4', bg:'#F0FFFE', dot:'#4ECDC4' }, // Mint/Teal
  en_cours:       { label:'En cours',       color:'#1557FF', bg:'#EEF2FF', dot:'#1557FF' }, // Blue
  resolue:        { label:'Résolue',        color:'#10B981', bg:'#F0FDF4', dot:'#10B981' }, // Emerald
  cloturee:       { label:'Clôturée',       color:'#845EC2', bg:'#F3EEFF', dot:'#845EC2' }, // Purple
  refusee_chef:   { label:'Refusée Chef',   color:'#FF9671', bg:'#FFF7F2', dot:'#FF9671' }, // Peach
  refusee_agent:  { label:'Refusée Agent',  color:'#D65DB1', bg:'#FFF0F9', dot:'#D65DB1' }, // Pink
}

const PRIORITY_CONFIG: Record<string, { label:string; color:string; bg:string }> = {
  haute:   { label:'Urgente',  color:'#EF4444', bg:'#FEF2F2' },
  moyenne: { label:'Moyenne',  color:'#F59E0B', bg:'#FFFBEB' },
  basse:   { label:'Normale',  color:'#10B981', bg:'#F0FDF4' },
}



const CATEGORIES = ['Voirie', 'Éclairage public', 'Propreté', 'Espaces Verts', 'Réseaux', 'Signalisation', 'Administratif', 'Suggestions']
const DELEGATIONS = ['Sousse Riadh', 'Sousse Nord', 'Sousse Sud', 'Sousse Médina']

interface Decl {
  id:string; ref_citoyen:string; ref_service:string|null
  title:string; category:string; status:string; priority:string
  delegation:string; address?:string; agent:string|null; votes:number; date:string
  lat: number | null; lng: number | null; image?: string;
  rejection_reason?: string; citizen_rating?: number; citizen_comment?: string;
}

const createCustomIcon = (color: string, isUrgent: boolean = false) => {
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

// Component to recenter map when selecting a marker
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
  const [delegationF, setDelegationF] = useState('Tous')
  const [agentF, setAgentF] = useState('Tous')
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list')
  const [selectedDecl, setSelectedDecl] = useState<Decl|null>(null)
  const [showComments, setShowComments] = useState(false)

  const [mode, setMode] = useState<'incoming' | 'tracking'>('incoming')

  // Read current user ID from JWT
  const currentUserId = (() => {
    try {
      const t = localStorage.getItem('fmc_token')
      if (!t) return undefined
      return JSON.parse(atob(t.split('.')[1])).sub
    } catch { return undefined }
  })()

  useEffect(() => {
    // Load departments for the assign buttons
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
              delegation: d.delegation_name || 'Sousse Riadh',
              agent: d.agent_name || null, votes: d.votes_count || 0,
              date: new Date(d.created_at).toLocaleDateString('fr-FR'),
              lat: d.latitude ? parseFloat(d.latitude) : null,
              lng: d.longitude ? parseFloat(d.longitude) : null,
              image: d.image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400'
            })))
          }
        }
      } catch (_) {}
    }
    load()
  }, [])

  const handleAssign = async (decl: Decl, deptId: string) => {
    try {
      await fetch(`${API}/president/declarations/${decl.id}/assign`, {
        method:'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token()}` },
        body: JSON.stringify({ 
          department_id: deptId
        })
      })
      setDecls(prev => prev.map(d =>
        d.id === decl.id ? { ...d, status:'assignee_chef' } : d
      ))
      if (selectedDecl?.id === decl.id) {
        setSelectedDecl({ ...selectedDecl, status: 'assignee_chef' })
      }

      toast.success('Déclaration affectée avec succès')
    } catch (_) {}
  }

  const filtered = decls.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.ref_citoyen.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryF !== 'Tous' && d.category !== categoryF) return false
    if (priorityF !== 'Tous' && d.priority !== priorityF) return false
    if (delegationF !== 'Tous' && d.delegation !== delegationF) return false

    if (mode === 'incoming') {
      if (d.status !== 'soumise') return false
    } else {
      if (d.status === 'soumise') return false
      if (agentF !== 'Tous') {
        if (agentF === 'Non assigné') { if (d.agent) return false }
        else if (d.agent !== agentF) return false
      }
      if (statusF !== 'Tous' && d.status !== statusF) return false
    }

    return true
  }).sort((a, b) => {
    // Sort by priority (haute > moyenne > normale)
    const pA = a.priority === 'haute' ? 3 : a.priority === 'moyenne' ? 2 : 1;
    const pB = b.priority === 'haute' ? 3 : b.priority === 'moyenne' ? 2 : 1;
    return pB - pA;
  })

  const uniqueAgents = Array.from(new Set(decls.map(d => d.agent).filter(Boolean))) as string[];

  return (
    <PresidentLayout title="Toutes les Déclarations">
      <div className="relative w-full h-[calc(100vh-100px)] rounded-3xl overflow-hidden bg-slate-50 border border-slate-200">
        <div className={`absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 transition-all duration-300 ${viewMode === 'map' ? 'right-[360px]' : 'right-4'}`}>
          <div className="relative bg-white/95 backdrop-blur shadow-sm border border-slate-200 rounded-full flex items-center px-4 py-2 w-64">
            <Search className="w-4 h-4 text-slate-400 mr-2"/>
            <input type="text" placeholder="Chercher une déclaration..." 
              value={search} onChange={e=>setSearch(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none w-full placeholder:text-slate-400"/>
          </div>
          <div className="relative bg-white/95 backdrop-blur shadow-sm border border-slate-200 rounded-full flex items-center px-4 py-2">
            <select value={categoryF} onChange={e=>setCategoryF(e.target.value)}
              className="appearance-none bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer pr-4">
              <option value="Tous">Toutes les catégories</option>
              {CATEGORIES.map(c=><option value={c} key={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-slate-400 pointer-events-none"/>
          </div>
          <div className="relative bg-white/95 backdrop-blur shadow-sm border border-slate-200 rounded-full flex items-center px-4 py-2">
            <select value={delegationF} onChange={e=>setDelegationF(e.target.value)}
              className="appearance-none bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer pr-4">
              <option value="Tous">Tous les arrondissements</option>
              {DELEGATIONS.map(l=><option value={l} key={l}>{l}</option>)}
            </select>
            <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-slate-400 pointer-events-none"/>
          </div>
          <div className="relative bg-white/95 backdrop-blur shadow-sm border border-slate-200 rounded-full flex items-center px-4 py-2">
            <select value={priorityF} onChange={e=>setPriorityF(e.target.value)}
              className="appearance-none bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer pr-4">
              <option value="Tous">Toutes les priorités</option>
              {Object.entries(PRIORITY_CONFIG).map(([k, c])=><option value={k} key={k}>{c.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-slate-400 pointer-events-none"/>
          </div>
          {mode === 'tracking' && (
            <div className="relative bg-white/95 backdrop-blur shadow-sm border border-slate-200 rounded-full flex items-center px-4 py-2">
              <select value={agentF} onChange={e=>setAgentF(e.target.value)}
                className="appearance-none bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer pr-4">
                <option value="Tous">Tous les agents</option>
                <option value="Non assigné">Non assigné</option>
                {uniqueAgents.map(a=><option value={a} key={a}>{a}</option>)}
              </select>
              <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-slate-400 pointer-events-none"/>
            </div>
          )}
          {mode === 'tracking' && (
            <div className="relative bg-white/95 backdrop-blur shadow-sm border border-slate-200 rounded-full flex items-center px-4 py-2">
              <select value={statusF} onChange={e=>setStatusF(e.target.value)}
                className="appearance-none bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer pr-4">
                <option value="Tous">Tous les statuts</option>
                {Object.entries(STATUS_CONFIG).filter(([k])=>k!=='soumise').map(([k, c])=><option value={k} key={k}>{c.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-slate-400 pointer-events-none"/>
            </div>
          )}
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur shadow-sm border border-slate-200 rounded-full p-1 ml-auto">
            <button onClick={() => setViewMode('map')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${viewMode === 'map' ? 'bg-[#1557FF] text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              <Map className="w-3.5 h-3.5"/> Carte
            </button>
            <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${viewMode === 'list' ? 'bg-[#1557FF] text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              <List className="w-3.5 h-3.5"/> Liste
            </button>
          </div>
        </div>

        {/* Section Toggle */}
        <div className="absolute top-20 left-4 z-20 flex gap-4 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-white shadow-xl shadow-slate-200/40">
          <button onClick={() => setMode('incoming')} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'incoming' ? 'bg-[#1557FF] text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-slate-600'}`}>
            Nouveaux Signalements ({decls.filter(d=>d.status==='soumise').length})
          </button>
          <button onClick={() => setMode('tracking')} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'tracking' ? 'bg-[#1557FF] text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-slate-600'}`}>
            Suivi des Interventions ({decls.filter(d=>d.status!=='soumise').length})
          </button>
        </div>

        {viewMode === 'map' && (
          <>
            <div className="absolute inset-0 z-0">
              <MapContainer center={[35.8256, 10.6369]} zoom={13} className="w-full h-full" zoomControl={false}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {filtered.filter(d => d.lat !== null && d.lng !== null).map(d => (
                  <Marker 
                    key={d.id} 
                    position={[d.lat!, d.lng!]} 
                    icon={createCustomIcon(STATUS_CONFIG[d.status]?.color || '#1557FF', d.priority === 'haute')}
                    eventHandlers={{ click: () => setSelectedDecl(d) }}
                  />
                ))}
                {selectedDecl && selectedDecl.lat !== null && selectedDecl.lng !== null && <MapRecenter lat={selectedDecl.lat!} lng={selectedDecl.lng!} />}
              </MapContainer>
            </div>

            {selectedDecl && (
              <div className="absolute top-20 left-4 z-10 w-[340px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
                {selectedDecl.image && (
                  <div className="relative h-48 w-full">
                    <img src={selectedDecl.image} alt={selectedDecl.title} className="w-full h-full object-cover"/>
                    <button onClick={() => setSelectedDecl(null)} 
                      className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors">
                      <X className="w-4 h-4"/>
                    </button>
                    <div className="absolute bottom-3 left-3 flex gap-2">
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-white text-slate-900 shadow-sm">
                        {selectedDecl.category}
                      </span>
                      {selectedDecl.priority === 'haute' && (
                        <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-red-500 text-white shadow-sm flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3"/> Urgent
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {!selectedDecl.image && (
                  <button onClick={() => setSelectedDecl(null)} 
                    className="absolute top-3 right-3 w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors z-10">
                    <X className="w-4 h-4"/>
                  </button>
                )}
                
                <div className="p-5">
                  <p className="text-[11px] font-mono font-bold text-slate-400 mb-1 mt-2">{selectedDecl.ref_citoyen}</p>
                  <h3 className="text-lg font-bold text-[#0A1628] leading-tight mb-4">{selectedDecl.title}</h3>
                  
                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm mb-5">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Statut</p>
                      <div className="flex items-center gap-1.5 font-semibold" style={{ color: STATUS_CONFIG[selectedDecl.status]?.color }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: STATUS_CONFIG[selectedDecl.status]?.dot }}/>
                        {STATUS_CONFIG[selectedDecl.status]?.label}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Arrondissement</p>
                      <p className="font-semibold text-slate-700">{selectedDecl.delegation}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Signalé le</p>
                      <p className="font-semibold text-slate-700">{selectedDecl.date}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Agent Assigné</p>
                      <p className="font-semibold text-slate-700">{selectedDecl.agent || 'Non assigné'}</p>
                    </div>
                  </div>

                  {selectedDecl.status === 'soumise' ? (
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-xs font-bold text-[#0A1628] mb-3">Assigner au département :</p>
                      <div className="grid grid-cols-2 gap-2">
                        {departments.map(dept => (
                          <button key={dept.id} onClick={() => handleAssign(selectedDecl, dept.id)}
                            className="py-2 px-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all text-left flex items-center justify-between group">
                            {dept.name}
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3 border border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <CheckCircle2 className="w-4 h-4"/>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0A1628]">Prise en charge</p>
                        <p className="text-[11px] text-slate-500">Cette déclaration est en cours de traitement.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="absolute top-4 right-4 z-10 w-[340px] h-[calc(100%-2rem)] bg-white/95 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200 rounded-3xl flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h2 className="text-sm font-black text-[#0A1628] uppercase tracking-wide">Liste des signalements</h2>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">{filtered.length} résultats</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filtered.map(d => {
                  const isActive = selectedDecl?.id === d.id
                  return (
                    <button key={d.id}
                      onClick={() => setSelectedDecl(d)}
                      className={`w-full text-left p-3 rounded-2xl transition-all border ${
                        isActive ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
                      }`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400">{d.ref_citoyen}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_CONFIG[d.status]?.dot }}/>
                          <span className="text-[10px] font-bold" style={{ color: STATUS_CONFIG[d.status]?.color }}>
                            {STATUS_CONFIG[d.status]?.label}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm font-bold mb-2 line-clamp-2 ${isActive ? 'text-blue-900' : 'text-[#0A1628]'}`}>{d.title}</p>
                      <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {d.delegation}</span>
                        <span>{d.date}</span>
                      </div>
                    </button>
                  )
                })}
                {filtered.length === 0 && (
                  <div className="p-6 text-center text-slate-400">
                    <p className="font-semibold text-sm">Aucun résultat</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {viewMode === 'list' && (
          <div className="flex-1 overflow-y-auto w-full h-full bg-[#f1f5f9] pt-52 pb-12">
            <div className="p-6">
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Grid Header */}
                <div className="grid grid-cols-[140px_1fr_100px_100px_160px_1fr_80px] bg-slate-50 border-b border-slate-200 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 gap-4">
                  <div>Ref</div>
                  <div>Catégorie</div>
                  <div className="text-center">Priorité</div>
                  <div className="text-center">Date</div>
                  <div>Agent</div>
                  <div>Localisation</div>
                  <div className="text-right">Action</div>
                </div>

                {/* Grid Body */}
                <div className="divide-y divide-slate-100">
                  {filtered.map((d, i) => (
                    <div key={d.id} 
                      onClick={() => setSelectedDecl(d)}
                      className={`grid grid-cols-[140px_1fr_100px_100px_160px_1fr_80px] px-8 py-5 items-center gap-4 transition-colors cursor-pointer group ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-blue-50/50`}>
                      
                      <div className="font-mono text-[11px] font-black text-blue-600">
                        {d.ref_citoyen}
                      </div>
                      
                      <div className="text-xs font-black text-slate-700 uppercase tracking-widest">
                        {d.category}
                      </div>
                      
                      <div className="flex justify-center">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border bg-white"
                          style={{ 
                            color: PRIORITY_CONFIG[d.priority]?.color || '#64748B', 
                            borderColor: `${PRIORITY_CONFIG[d.priority]?.color}20` 
                          }}>
                          {PRIORITY_CONFIG[d.priority]?.label || d.priority}
                        </span>
                      </div>
                      
                      <div className="text-xs font-black text-slate-500 text-center">
                        {d.date}
                      </div>
                      
                      <div className="text-xs font-bold text-slate-600 truncate">
                        {d.agent ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black shrink-0">
                              {d.agent.charAt(0)}
                            </div>
                            <span className="truncate">{d.agent}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Non assigné</span>
                        )}
                      </div>
                      
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0"/>
                          <span className="truncate">{d.delegation}</span>
                        </div>
                        {d.address && (
                          <span className="text-[10px] font-bold text-slate-400 truncate mt-0.5 ml-5">{d.address}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-end">
                        <div className="p-2 text-slate-300 group-hover:text-blue-600 group-hover:bg-blue-50 rounded-xl transition-all">
                          <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform"/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filtered.length === 0 && (
                  <div className="py-20 text-center bg-white">
                    <Search className="w-8 h-8 text-slate-200 mx-auto mb-3"/>
                    <p className="text-sm font-bold text-slate-400">Aucun signalement trouvé</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}



        {viewMode !== 'map' && selectedDecl && (() => {
          const hasComments = !['soumise'].includes(selectedDecl.status)
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setSelectedDecl(null); setShowComments(false) }}/>
              <div className={`relative bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 flex flex-col md:flex-row ${
                hasComments && showComments ? 'w-full max-w-6xl h-[85vh]' : 'w-full max-w-2xl max-h-[90vh]'
              }`}>
                
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                  <div className="relative h-64 shrink-0 group">
                    {selectedDecl.image ? (
                      <img src={selectedDecl.image} alt={selectedDecl.title} className="w-full h-full object-cover"/>
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <AlertTriangle className="w-12 h-12 text-slate-300"/>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>
                    
                    <button onClick={() => { setSelectedDecl(null); setShowComments(false) }}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/20 z-10">
                      <X className="w-5 h-5"/>
                    </button>

                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded bg-white text-slate-900 shadow-xl">
                          {selectedDecl.category}
                        </span>
                        {selectedDecl.priority === 'haute' && (
                          <span className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded bg-red-600 text-white shadow-xl flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3"/> Urgent
                          </span>
                        )}
                        <span className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded bg-blue-600 text-white shadow-xl">
                          {STATUS_CONFIG[selectedDecl.status]?.label.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-white leading-tight drop-shadow-md">{selectedDecl.title}</h3>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Citoyen</p>
                        <p className="text-xs font-mono font-bold text-slate-700">{selectedDecl.ref_citoyen}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Service</p>
                        <p className="text-xs font-mono font-bold text-blue-600">{selectedDecl.ref_service || '—'}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Localisation</p>
                        <p className="text-xs font-bold text-slate-700">{selectedDecl.delegation}</p>
                        {selectedDecl.address && <p className="text-[10px] font-medium text-slate-500 mt-1 truncate" title={selectedDecl.address}>{selectedDecl.address}</p>}
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                        <p className="text-xs font-bold text-slate-700">{selectedDecl.date}</p>
                      </div>
                    </div>

                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-px flex-1 bg-slate-100"/>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignation & Actions</span>
                        <div className="h-px flex-1 bg-slate-100"/>
                      </div>

                      {selectedDecl.status === 'soumise' ? (
                        <div className="bg-blue-50/50 rounded-3xl p-6 border border-blue-100">
                          <p className="text-xs font-black text-blue-900 uppercase tracking-wider mb-4 text-center">Planification & Affectation</p>
                          


                          <p className="text-[10px] font-black text-blue-900/40 uppercase tracking-wider mb-3 text-center">Choisir le département compétent</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {departments.map(dept => (
                              <button key={dept.id} onClick={() => handleAssign(selectedDecl, dept.id)}
                                className="py-3 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl border border-white bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:shadow-lg hover:shadow-blue-500/10 transition-all text-center">
                                {dept.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                                {selectedDecl.agent ? (
                                  <span className="text-xs font-black">{selectedDecl.agent.split(' ').map(n=>n[0]).join('')}</span>
                                ) : (
                                  <BrainCircuit className="w-6 h-6"/>
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-900">Agent Responsable</p>
                                <p className="text-xs font-bold text-slate-500">{selectedDecl.agent || 'Chef de Service (Non assigné)'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_CONFIG[selectedDecl.status]?.dot }}/>
                              {STATUS_CONFIG[selectedDecl.status]?.label}
                            </div>
                          </div>

                          {(selectedDecl.status === 'refusee_chef' || selectedDecl.status === 'refusee_agent') && selectedDecl.rejection_reason && (
                            <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-red-500"/>
                                <span className="text-[10px] font-black text-red-800 uppercase tracking-widest">Motif du refus</span>
                              </div>
                              <p className="text-xs font-medium text-red-900">{selectedDecl.rejection_reason}</p>
                            </div>
                          )}

                          {selectedDecl.status === 'cloturee' && selectedDecl.citizen_rating && (
                            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Évaluation du citoyen</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <svg key={star} className={`w-3.5 h-3.5 ${star <= selectedDecl.citizen_rating! ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                    </svg>
                                  ))}
                                </div>
                              </div>
                              {selectedDecl.citizen_comment && (
                                <p className="text-xs font-medium text-emerald-900 italic">"{selectedDecl.citizen_comment}"</p>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => setShowComments(v => !v)}
                            className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border ${
                              showComments
                                ? 'bg-[#0A1628] text-white border-[#0A1628] shadow-xl shadow-black/20'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600'
                            }`}
                          >
                            <MessageSquare className="w-4 h-4"/>
                            {showComments ? 'Masquer le centre de communication' : 'Ouvrir le centre de communication'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT: Comments Panel */}
                {hasComments && showComments && (
                  <div className="w-full md:w-[460px] shrink-0 border-t md:border-t-0 md:border-l border-slate-100 bg-[#f8fafc] flex flex-col p-8 min-h-0">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0A1628] flex items-center justify-center text-white">
                          <MessageSquare className="w-4 h-4"/>
                        </div>
                        <h4 className="text-sm font-black text-[#0A1628] uppercase tracking-[0.1em]">Échanges Internes</h4>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">Multi-Channel</span>
                    </div>
                    <div className="flex-1 min-h-0 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <DeclarationCommentsPanel
                        declarationId={selectedDecl.id}
                        visibleChannels={['president_chef', 'chef_agent', 'agent_citizen']}
                        writableChannels={['president_chef']}
                        role="president"
                        currentUserId={currentUserId}
                      />
                    </div>
                  </div>
                )}

              </div>
            </div>
          )
        })()}

      </div>
    </PresidentLayout>
  )
}

export default PresidentDeclarations
