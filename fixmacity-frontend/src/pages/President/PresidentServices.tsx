import React, { useState, useEffect } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import { Plus, MoreVertical, X, Users, FileText, TrendingUp, AlertTriangle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

const DEPT_ICONS: Record<string, string> = {
  VR: '🛣️', EP: '💡', PD: '🗑️', EV: '🌿',
  EA: '💧', ST: '🚦', BP: '🏛️', SG: '💡'
}

const DEPT_COLORS: Record<string, string> = {
  VR: '#3B82F6', EP: '#F59E0B', PD: '#10B981',
  EV: '#22C55E', EA: '#6366F1', ST: '#F97316',
  BP: '#8B5CF6', SG: '#EC4899'
}

interface Dept {
  id: string; name_fr: string; code: string; is_active: boolean
  chef: string; total: number; in_progress: number; resolved: number
  agents: number; rate: number; overloaded?: boolean
}

const DonutChart: React.FC<{ rate: number; color: string; size?: number }> = ({
  rate, color, size = 70
}) => {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = (rate / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth="8"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize="13" fontWeight="700" fill="#0A1628">{rate}%</text>
    </svg>
  )
}

const DetailModal: React.FC<{ dept: Dept; onClose: () => void }> = ({ dept, onClose }) => {
  const color = DEPT_COLORS[dept.code] || '#1557FF'
  const [decls, setDecls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDecls = async () => {
      try {
        const res = await fetch(`${API}/president/declarations?department_id=${dept.id}&limit=5`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          setDecls(data.declarations || [])
        }
      } catch (e) {
        console.error('Error loading depts decls', e)
      } finally {
        setLoading(false)
      }
    }
    fetchDecls()
  }, [dept.id])

  const statusColor: Record<string, string> = {
    'soumise': '#64748B', 'assignee': '#F59E0B', 'en_cours': '#3B82F6', 'resolue': '#10B981', 'cloturee': '#059669'
  }
  const statusLabel: Record<string, string> = {
    'soumise': 'SOUMISE', 'assignee': 'ASSIGNÉE', 'en_cours': 'EN COURS', 'resolue': 'RÉSOLUE', 'cloturee': 'CLÔTURÉE'
  }
  const statusBg: Record<string, string> = {
    'soumise': '#F8FAFC', 'assignee': '#FFFBEB', 'en_cours': '#EFF6FF', 'resolue': '#F0FDF4', 'cloturee': '#ECFDF5'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: `${color}15` }}>
            {DEPT_ICONS[dept.code]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#0A1628]">{dept.name_fr}</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full border"
                style={{ color, borderColor: color, background: `${color}10` }}>
                {dept.code}
              </span>
              <span className="w-2 h-2 rounded-full bg-green-500"/>
            </div>
            <p className="text-sm text-slate-400">Département technique</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
            <X className="w-4 h-4"/>
          </button>
        </div>

        <div className="p-6">
          {/* Chef + Agents */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Chef de Service
              </p>
              <p className="text-sm font-bold text-[#0A1628]">{dept.chef}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Effectif
              </p>
              <p className="text-sm font-bold text-[#0A1628]">{dept.agents} Agents actifs</p>
            </div>
          </div>

          {/* Workload */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-[#0A1628]">Charge de travail actuelle</p>
                <p className="text-xs text-slate-400">Vue d'ensemble des tickets assignés</p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-xl font-black" style={{ color }}>{dept.in_progress}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">En cours</p>
                </div>
                <div>
                  <p className="text-xl font-black text-[#0A1628]">{dept.total}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Totales</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent declarations */}
          <div>
            <p className="text-sm font-bold text-[#0A1628] mb-3">Déclarations récentes</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {loading && <p className="text-xs text-slate-400 text-center py-4">Chargement...</p>}
              {!loading && decls.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Aucune déclaration récente.</p>}
              {decls.map((d, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: `${color}15` }}>
                    {DEPT_ICONS[dept.code] || '🏢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0A1628] truncate">{d.title}</p>
                    <p className="text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                    style={{
                      color: statusColor[d.status] || '#64748B',
                      background: statusBg[d.status] || '#F8FAFC'
                    }}>
                    {statusLabel[d.status] || d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            Modifier le service
          </button>
          <button className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            Voir détails complets
          </button>
          <button className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all"
            style={{ background: '#1557FF' }}>
            + Assigner une déclaration
          </button>
        </div>
      </div>
    </div>
  )
}

const PresidentServices: React.FC = () => {
  const [depts, setDepts] = useState<Dept[]>([])
  const [selected, setSelected] = useState<Dept | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API}/president/departments`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          const list = Array.isArray(data) ? data : (data.departments || [])
          setDepts(list.map((d: any) => ({
            id: d.id,
            name_fr: d.name || d.name_fr,
            code: d.code,
            is_active: d.is_active !== undefined ? d.is_active : true,
            chef: d.chef_name || d.chef || 'Non assigné',
            total: d.total || 0,
            in_progress: d.in_progress || Math.round((d.total || 0) * 0.3),
            resolved: d.resolved || 0,
            agents: d.agents_count || d.agents || 0,
            rate: d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0,
            overloaded: (d.in_progress || 0) > 100
          })))
        }
      } catch (e) {
        console.error('Failed to load departments', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const overloaded = depts.filter(d => d.overloaded).length
  const avgRate = depts.length > 0 ? Math.round(depts.reduce((a, d) => a + d.rate, 0) / depts.length) : 0

  return (
    <PresidentLayout title="Gestion des Services Municipaux">
      <div className="flex-1 bg-[#f8fafc] p-6 min-h-screen">
        {loading && (
          <div className="fixed top-20 right-10 flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full border border-blue-100 z-50 shadow-lg shadow-blue-500/10 animate-pulse">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Analyse en temps réel...</span>
          </div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'TOTAL SERVICES',    value: depts.length, icon: '🏢', color: '#1557FF' },
            { label: 'SERVICES ACTIFS',   value: depts.filter(d=>d.is_active).length, icon: '⚡', color: '#F59E0B' },
            { label: 'TAUX RÉSOLUTION',   value: `${avgRate}%`, icon: '✅', color: '#10B981' },
            { label: 'EN SURCHARGE', value: overloaded, icon: '⚠️', color: '#EF4444', warn: overloaded > 0 },
          ].map(k => (
            <div key={k.label}
              className={`group bg-white rounded-3xl p-6 border transition-all hover:shadow-xl hover:shadow-blue-500/5 relative overflow-hidden ${k.warn ? 'border-red-200' : 'border-slate-200'}`}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-bl-[3rem] -mr-6 -mt-6 group-hover:bg-blue-50 transition-colors"/>
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{k.label}</p>
                  <span className="text-2xl drop-shadow-sm">{k.icon}</span>
                </div>
                <p className="text-3xl font-black tracking-tight" style={{ color: k.warn ? '#EF4444' : '#0A1628' }}>
                  {k.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-black text-[#0A1628]">Départements Opérationnels</h2>
            <p className="text-sm text-slate-400">Suivi analytique de la performance par service</p>
          </div>
          <button className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest transition-all hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 shadow-lg shadow-blue-500/20"
            style={{ background: '#1557FF' }}>
            <Plus className="w-4 h-4"/> Créer un service
          </button>
        </div>

        {/* Dept cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {depts.map(dept => {
            const color = DEPT_COLORS[dept.code] || '#1557FF'
            const isOverloaded = dept.overloaded
            return (
              <div key={dept.id}
                className="group bg-white rounded-[2rem] border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/5 hover:border-blue-400/30 transition-all relative flex flex-col shadow-sm">
                
                {/* Overloaded badge */}
                {isOverloaded && (
                  <div className="absolute top-4 right-12 z-10">
                    <span className="text-[9px] font-black px-3 py-1 rounded-lg bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse uppercase tracking-widest">
                      Surchargé
                    </span>
                  </div>
                )}

                {/* Card header */}
                <div className="p-6 pb-2">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-transform group-hover:scale-110"
                      style={{ background: `${color}10`, color }}>
                      {DEPT_ICONS[dept.code] || '🏢'}
                    </div>
                    <button className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all">
                      <MoreVertical className="w-4 h-4"/>
                    </button>
                  </div>
                  <h3 className="font-black text-[#0A1628] text-base group-hover:text-blue-600 transition-colors mb-1">{dept.name_fr}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm" style={{ background: `${color}10`, color }}>{dept.code}</span>
                    <span className="text-[10px] font-bold text-slate-300">· {dept.agents} agents</span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-6 p-6">
                  <div className="shrink-0 scale-110">
                    <DonutChart rate={dept.rate} color={isOverloaded ? '#EF4444' : color}/>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total</p>
                        <p className="text-sm font-black text-[#0A1628]">{dept.total.toLocaleString()}</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">En cours</p>
                        <p className="text-sm font-black" style={{ color: isOverloaded ? '#EF4444' : color }}>
                          {dept.in_progress}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full rounded-full transition-all duration-1000 shadow-sm" 
                        style={{ width: `${dept.rate}%`, background: isOverloaded ? '#EF4444' : color }} />
                    </div>
                  </div>
                </div>

                {/* Chef footer */}
                <div className="mt-auto flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[10px] font-black shadow-md"
                      style={{ background: color }}>
                      {dept.chef ? dept.chef.split(' ').map(w=>w[0]).join('').slice(0,2) : '??'}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-[#0A1628] leading-none mb-1">{dept.chef}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Superviseur</p>
                    </div>
                  </div>
                  <button onClick={() => setSelected(dept)}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#1557FF] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all">
                    Analyses
                  </button>
                </div>
              </div>
            )
          })}
          {depts.length === 0 && !loading && (
            <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <p className="text-5xl mb-6">🏢</p>
              <h3 className="text-lg font-black text-slate-600 mb-1">Aucun service opérationnel</h3>
              <p className="text-sm text-slate-400">Commencez par créer un nouveau département municipal.</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selected && <DetailModal dept={selected} onClose={() => setSelected(null)}/>}
    </PresidentLayout>
  )
}

export default PresidentServices
