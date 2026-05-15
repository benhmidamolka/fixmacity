// src/pages/president/PresidentPersonnel.tsx
import React, { useState, useEffect, useMemo } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import { 
  Plus, Search, MapPin, X, ChevronDown, Phone, Mail, 
  User as UserIcon, Shield, Briefcase, Activity, 
  CheckCircle2, TrendingUp, MoreHorizontal, ExternalLink,
  Target, Zap, Award, Clock
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

const AVATARS = ['#1557FF', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#0891B2', '#EC4899']
const initials = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const rndColor = (n: string) => AVATARS[n.charCodeAt(0) % AVATARS.length]

interface User {
  id: string; first_name: string; last_name: string; role: string
  department: string; code: string; location: string
  missions: number | null; resolved: number | null; team: number | null; perf: number | null
  total_tasks: number | null; phone?: string
  active: boolean; email?: string
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

const ProfileModal: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
  const color = rndColor(user.first_name)
  const fullName = `${user.first_name} ${user.last_name}`
  
  const stats = [
    { label: 'Taux de Succès', value: '94%', icon: Target, color: 'text-emerald-500' },
    { label: 'Rapidité Moy.', value: '1.2j', icon: Zap, color: 'text-amber-500' },
    { label: 'Expertise', value: 'Lvl 4', icon: Award, color: 'text-blue-500' },
    { label: 'Disponibilité', value: 'High', icon: Clock, color: 'text-violet-500' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0A1628]/80 backdrop-blur-xl transition-opacity duration-500" onClick={onClose} />
      
      <div className="relative bg-white rounded-[3.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Left: Identity Section */}
          <div className="lg:w-80 bg-slate-50/50 p-12 border-r border-slate-100 flex flex-col items-center text-center">
            <div 
              className="w-32 h-32 rounded-[3rem] flex items-center justify-center text-white text-4xl font-black mb-8 shadow-2xl ring-[12px] ring-white transition-transform hover:rotate-3"
              style={{ background: color }}
            >
              {initials(fullName)}
            </div>
            <h2 className="text-2xl font-black text-[#0A1628] leading-tight mb-2">{fullName}</h2>
            <div className="flex items-center gap-2 mb-8">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
                ID: {user.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            
            <div className="w-full space-y-3">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center">
                <Shield className="w-5 h-5 text-[#1557FF] mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0A1628]">
                  {user.role === 'chef' ? 'Chef de Service' : 'Agent Terrain'}
                </span>
              </div>
              <div className={`p-4 rounded-2xl border shadow-sm flex flex-col items-center ${user.active ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                <Activity className="w-5 h-5 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {user.active ? 'En Service' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Details Section */}
          <div className="flex-1 p-12">
            <div className="flex justify-between items-start mb-12">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[#1557FF] mb-2">Performances Analytiques</h3>
                <p className="text-sm text-slate-400 font-medium italic">Données consolidées pour l'exercice en cours.</p>
              </div>
              <button onClick={onClose} className="p-4 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
              {stats.map((s, i) => (
                <div key={i} className="p-5 rounded-[2rem] bg-slate-50 border border-slate-100 text-center hover:bg-white hover:border-blue-100 hover:shadow-lg transition-all group">
                  <s.icon className={`w-5 h-5 mx-auto mb-3 ${s.color} group-hover:scale-110 transition-transform`} />
                  <p className="text-[10px] font-black text-[#0A1628] mb-1">{s.value}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> Contact
                </h4>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-1">Email Professionnel</p>
                  <p className="text-sm font-bold text-[#0A1628]">{user.email || '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-1">Ligne Directe</p>
                  <p className="text-sm font-bold text-[#0A1628]">{user.phone || '—'}</p>
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5" /> Affectation
                </h4>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-1">Pôle Technique</p>
                  <p className="text-sm font-bold text-[#0A1628]">{user.department}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-1">Zone d'intervention</p>
                  <p className="text-sm font-bold text-[#0A1628]">{user.location}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="flex-1 h-16 rounded-[1.5rem] bg-[#1557FF] text-white text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                Modifier le Dossier
              </button>
              <button className="h-16 px-8 rounded-[1.5rem] border border-slate-200 text-[#0A1628] text-xs font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all">
                Historique
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const PresidentPersonnel: React.FC = () => {
  const [tab, setTab] = useState<'agent' | 'chef'>('agent')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [selected, setSelected] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/president/users`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.users) {
          setUsers(data.users.map((u: any) => ({
            ...u,
            department: u.department_name || 'N/A',
            code: u.department_code || '??',
            location: u.location || 'Sousse Ville',
            missions: u.total_tasks || 0,
            resolved: 0,
            team: 0,
            perf: 0,
            total_tasks: u.total_tasks || 0,
            phone: u.phone || '+216 -- --- ---',
            active: u.is_active
          })))
        }
      }
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (u.role !== tab) return false
      if (search && !`${u.first_name} ${u.last_name} ${u.department}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [users, tab, search])

  const agents = users.filter(u => u.role === 'agent')
  const chefs = users.filter(u => u.role === 'chef')
  const activeCount = users.filter(u => u.active).length

  if (loading) return (
    <PresidentLayout title="Gestion du Personnel">
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-[3px] border-slate-100 border-t-[#1557FF] rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synchronisation des effectifs...</p>
      </div>
    </PresidentLayout>
  )

  return (
    <PresidentLayout title="Effectifs & Gouvernance">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Content */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-black text-[#0A1628] tracking-tight mb-3">Annuaire Municipal</h1>
            <p className="text-sm font-medium text-slate-400 italic">Supervision centralisée des agents de terrain et chefs de pôle.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex bg-white/50 backdrop-blur-md border border-slate-200/50 rounded-2xl p-1.5 shadow-sm">
              <button onClick={() => setTab('agent')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'agent' ? 'bg-[#1557FF] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Terrain</button>
              <button onClick={() => setTab('chef')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'chef' ? 'bg-[#1557FF] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Direction</button>
            </div>
            <button className="h-14 px-8 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-[0.98] flex items-center gap-3">
              <Plus className="w-4 h-4" />
              Recrutement
            </button>
          </div>
        </div>

        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          <KpiCard label="Agents Terrain" value={agents.length} sub="Effectif opérationnel" color={{ hex: '#1557FF', bg: 'bg-blue-50', text: 'text-blue-600' }} icon={UserIcon} trend="+2 new" />
          <KpiCard label="Chefs de Pôle" value={chefs.length} sub="Ligne managériale" color={{ hex: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-600' }} icon={Shield} />
          <KpiCard label="Activité Live" value={activeCount} sub="Agents en service" color={{ hex: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-600' }} icon={Activity} />
          <KpiCard label="Performance Avg" value="94.2%" sub="Satisfaction citoyenne" color={{ hex: '#8B5CF6', bg: 'bg-violet-50', text: 'text-violet-600' }} icon={TrendingUp} trend="+0.8%" />
        </div>

        {/* Search Bar */}
        <div className="relative mb-10 group">
          <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-300 group-focus-within:text-[#1557FF] transition-colors" />
          </div>
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par nom, spécialité ou zone..."
            className="w-full h-20 pl-20 pr-8 bg-white border border-slate-200/60 rounded-[2rem] text-sm font-bold text-[#0A1628] placeholder-slate-300 shadow-sm focus:ring-4 focus:ring-blue-500/5 focus:border-[#1557FF] outline-none transition-all"
          />
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-12">
          {filtered.length > 0 ? (
            filtered.map(u => (
              <div 
                key={u.id}
                onClick={() => setSelected(u)}
                className="group bg-white rounded-[3rem] border border-slate-200/60 p-8 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] hover:border-[#1557FF]/30 transition-all duration-500 cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="relative">
                    <div 
                      className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white text-xl font-black shadow-lg group-hover:scale-110 transition-transform duration-500"
                      style={{ background: rndColor(u.first_name) }}
                    >
                      {initials(`${u.first_name} ${u.last_name}`)}
                    </div>
                    {u.active && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full animate-pulse" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-[#0A1628] text-lg leading-tight group-hover:text-[#1557FF] transition-colors">
                      {u.first_name} {u.last_name}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{u.id.slice(0, 6).toUpperCase()}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-10">
                  <div className="flex items-center justify-between py-2 border-b border-slate-50">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Pôle</span>
                    <span className="text-[11px] font-bold text-[#0A1628]">{u.department}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-50">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Charge</span>
                    <span className="text-[11px] font-black text-[#1557FF]">{u.total_tasks} Missions</span>
                  </div>
                </div>

                <button className="w-full h-14 rounded-2xl bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:bg-[#1557FF] group-hover:text-white group-hover:shadow-xl transition-all duration-500">
                  Dossier Complet
                </button>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-24 text-center">
              <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto mb-6 text-slate-200">
                <Search className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-[#0A1628] mb-2">Aucun résultat</h3>
              <p className="text-sm text-slate-400 font-medium">Réessayez avec d'autres critères de recherche.</p>
            </div>
          )}
        </div>
      </div>

      {selected && <ProfileModal user={selected} onClose={() => setSelected(null)} />}
    </PresidentLayout>
  )
}

export default PresidentPersonnel
