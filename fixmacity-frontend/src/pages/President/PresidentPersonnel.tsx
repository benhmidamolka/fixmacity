import React, { useState, useEffect } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import { Plus, Search, MapPin, X, ChevronDown } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const token = () => localStorage.getItem('fmc_token')

const AVATARS = ['#1557FF','#10B981','#F59E0B','#8B5CF6','#EF4444','#0891B2','#EC4899']
const initials = (n: string) => n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
const rndColor = (n: string) => AVATARS[n.charCodeAt(0) % AVATARS.length]

interface User {
  id: string; first_name: string; last_name: string; role: string
  department: string; code: string; location: string
  missions: number|null; resolved: number|null; team: number|null; perf: number|null
  total_tasks: number|null; phone?: string
  active: boolean; email?: string
}

const ProfileModal: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
  const color = rndColor(user.first_name)
  const fullName = `${user.first_name} ${user.last_name}`
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Avatar */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
            <X className="w-4 h-4"/>
          </button>
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black mb-3 ring-4 ring-slate-100"
            style={{ background: color }}>
            {initials(fullName)}
          </div>
          <h2 className="text-xl font-black text-[#0A1628]">{fullName}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider"
              style={{ background: '#1557FF', color: 'white' }}>
              {user.role === 'chef' ? 'Chef de Service' : 'Agent Terrain'}
            </span>
            {user.active && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"/>Actif
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div className="col-span-2">
              <p className="text-xs text-slate-400 mb-0.5">Email</p>
              <p className="font-semibold text-[#0A1628] text-xs">
                {user.email || `${user.first_name.toLowerCase()}.${user.last_name.toLowerCase().replace(' ','')}@fixmacity.tn`}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Service</p>
              <p className="font-semibold text-[#0A1628] text-xs">{user.department}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Arrondissement</p>
              <p className="font-semibold text-[#0A1628] text-xs">{user.location}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-400 mb-0.5">Numéro de téléphone</p>
              <p className="font-semibold text-[#0A1628] text-xs">{user.phone || '+216 -- --- ---'}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {user.role === 'agent' ? (
              <>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-[#1557FF]">{user.total_tasks ?? user.missions ?? 0}</p>
                  <p className="text-xs text-slate-500 font-semibold">Tâches</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-green-600">{user.resolved ?? 0}</p>
                  <p className="text-xs text-slate-500 font-semibold">Résolues</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-[#1557FF]">{user.total_tasks ?? 0}</p>
                  <p className="text-xs text-slate-500 font-semibold">Tâches Service</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-amber-600">{user.team ?? 0}</p>
                  <p className="text-xs text-slate-500 font-semibold">Agents</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-2">
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
              Modifier
            </button>
            <button className="flex-1 py-2.5 rounded-xl border border-red-200 text-sm font-bold text-red-500 hover:bg-red-50 transition-all">
              Désactiver
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const PresidentPersonnel: React.FC = () => {
  const [tab, setTab] = useState<'agent'|'chef'>('agent')
  const [search, setSearch] = useState('')
  const [serviceFilter, setServiceFilter] = useState('Tous')
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [users, setUsers] = useState<User[]>([])
  const [selected, setSelected] = useState<User|null>(null)
  const [showAdd, setShowAdd] = useState(false)
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
            location: u.location || 'Sousse',
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

  useEffect(() => {
    loadUsers()
  }, [])

  const filtered = users.filter(u => {
    if (u.role !== tab) return false
    if (search && !`${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())) return false
    if (serviceFilter !== 'Tous' && u.department !== serviceFilter) return false
    if (statusFilter === 'Actif' && !u.active) return false
    if (statusFilter === 'Inactif' && u.active) return false
    return true
  })

  const agents = users.filter(u=>u.role==='agent')
  const chefs  = users.filter(u=>u.role==='chef')
  const activeCount = users.filter(u=>u.active).length

  if (loading) return (
    <PresidentLayout title="Gestion du Personnel">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1557FF]"></div>
      </div>
    </PresidentLayout>
  )

  return (
    <PresidentLayout title="Gestion du Personnel">
      <div className="flex-1 bg-[#f8fafc] p-6 min-h-screen">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label:'Total Agents',  value:agents.length, sub:'Effectif', color:'#1557FF', icon:'👷' },
            { label:'Total Chefs',   value:chefs.length,  sub:'Superviseurs',  color:'#F59E0B', icon:'👔' },
            { label:'Agents actifs', value:activeCount,   sub:'En poste',color:'#10B981', icon:'✅' },
            { label:'Services',      value:8,             sub:'Municipaux',  color:'#8B5CF6', icon:'🏛️' },
          ].map(k => (
            <div key={k.label} className="group bg-white rounded-3xl p-6 border border-slate-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:bg-blue-50 transition-colors"/>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl drop-shadow-sm">{k.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl"
                    style={{ background:`${k.color}15`, color:k.color }}>{k.sub}</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{k.label}</p>
                <p className="text-3xl font-black text-[#0A1628] tracking-tight">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            {(['agent','chef'] as const).map(t => (
              <button key={t} onClick={()=>setTab(t)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab===t?'text-white shadow-lg shadow-blue-500/20':'text-slate-400 hover:text-slate-600'}`}
                style={tab===t?{background:'#1557FF'}:{}}>
                {t === 'agent' ? 'Agents Terrain' : 'Chefs de Service'}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[300px] flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm focus-within:border-blue-400 transition-all">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Rechercher par nom ou service..."
              className="flex-1 text-xs font-bold text-slate-600 placeholder-slate-300 outline-none bg-transparent"/>
          </div>

          <button onClick={()=>setShowAdd(true)}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest transition-all hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 shadow-lg"
            style={{ background:'#1557FF' }}>
            <Plus className="w-4 h-4"/> Nouveau membre
          </button>
        </div>

      {/* User cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(u => {
            const fullName = `${u.first_name} ${u.last_name}`
            const color = rndColor(u.first_name)
            return (
              <div key={u.id}
                className="group bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 transition-all flex flex-col">
                <div className="flex items-start gap-4 mb-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg transform group-hover:scale-105 transition-transform"
                      style={{ background:color }}>
                      {initials(fullName)}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${u.active?'bg-green-500':'bg-slate-300'}`}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-[#0A1628] text-base truncate mb-0.5">{fullName}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest"
                        style={{ background:`${color}15`, color }}>
                        {u.role === 'chef' ? 'Superviseur' : 'Opérationnel'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">ID: {u.id.slice(0,8).toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Département</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{u.department}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Téléphone</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{u.phone}</p>
                  </div>
                  <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100 col-span-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Nombre de missions</p>
                      <span className="text-xs font-black text-[#1557FF]">{u.total_tasks} tâches actives</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto flex gap-3">
                  <button onClick={()=>setSelected(u)}
                    className="flex-1 py-3 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">
                    Profil complet
                  </button>
                  <button className="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-md active:scale-95 transition-all hover:shadow-lg"
                    style={{ background:'#1557FF' }}>
                    Assigner
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selected && <ProfileModal user={selected} onClose={()=>setSelected(null)}/>}
    </PresidentLayout>
  )
}

export default PresidentPersonnel
