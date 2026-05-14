import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Calendar, MapPin, AlertTriangle,
  CheckCircle2, XCircle, UserCheck, Loader2, Clock
} from 'lucide-react'
import ChefLayout from '../../layouts/ChefLayout'
import DeclarationCommentsPanel from '../../components/president/DeclarationCommentsPanel'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  soumis:         { label: 'Soumise',        color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B' },
  assignee_chef:  { label: 'Assignée Chef',  color: '#F97316', bg: '#FFF7ED', dot: '#F97316' },
  assignee_agent: { label: 'Assignée Agent', color: '#3B82F6', bg: '#EFF6FF', dot: '#3B82F6' },
  en_cours:       { label: 'En cours',       color: '#1557FF', bg: '#EEF2FF', dot: '#1557FF' },
  resolue:        { label: 'Résolue',        color: '#10B981', bg: '#F0FDF4', dot: '#10B981' },
  refusee_chef:   { label: 'Refusée Chef',   color: '#EF4444', bg: '#FEF2F2', dot: '#EF4444' },
  refusee_agent:  { label: 'Refusée Agent',  color: '#DC2626', bg: '#FEF2F2', dot: '#DC2626' },
}

interface Agent { 
  id: string; 
  first_name: string; 
  last_name: string; 
  workload: number; 
  recent_tasks: number;
  is_active: boolean;
  is_overloaded: boolean;
}
interface Declaration {
  id: string; title: string; ref_citoyen: string; ref_service?: string
  status: string; category: string; priority: string; description?: string
  created_at: string; citizen?: { first_name: string; last_name: string; email: string }
  assigned_agent?: { first_name: string; last_name: string }
  latitude?: number; longitude?: number
}

const ChefDeclarationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [decl, setDecl] = useState<Declaration | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [success, setSuccess] = useState('')
  const [warning, setWarning] = useState('')
  const [error, setError] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [refuseReason, setRefuseReason] = useState('')
  const [showRefuse, setShowRefuse] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'comments'>('info')

  const currentUserId = (() => {
    try {
      const t = token()
      if (!t) return undefined
      return JSON.parse(atob(t.split('.')[1])).sub
    } catch { return undefined }
  })()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [dRes, aRes] = await Promise.all([
          fetch(`${API}/chef/declarations/${id}`, { headers: { Authorization: `Bearer ${token()}` } }),
          fetch(`${API}/chef/agents`, { headers: { Authorization: `Bearer ${token()}` } })
        ])
        if (dRes.ok) {
          const d = await dRes.json()
          setDecl(d.declaration || d)
        } else {
          setError('Déclaration introuvable.')
        }
        if (aRes.ok) {
          const a = await aRes.json()
          setAgents(a.agents || a) // Handle different response formats
        }
      } catch { setError('Erreur de connexion.') }
      setLoading(false)
    }
    if (id) load()
  }, [id])

  const handleAccept = async () => {
    if (!id) return
    setActing(true)
    try {
      const res = await fetch(`${API}/chef/declarations/${id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ agent_id: selectedAgentId || undefined })
      })
      if (res.ok) {
        const d = await res.json()
        setDecl(prev => prev ? { ...prev, ...d.declaration, status: 'assignee_agent' } : prev)
        if (d.warning) setWarning(d.warning)
        else setSuccess('Signalement assigné avec succès.')
      } else {
        const e = await res.json()
        setError(e.error || 'Erreur lors de l\'acceptation.')
      }
    } catch { setError('Erreur de connexion.') }
    setActing(false)
  }

  const handleRefuse = async () => {
    if (!id) return
    if (!refuseReason.trim()) {
      setError('Le motif de refus est obligatoire')
      return
    }
    setActing(true)
    try {
      const res = await fetch(`${API}/chef/declarations/${id}/refuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ reason: refuseReason.trim() })
      })
      if (res.ok) {
        setDecl(prev => prev ? { ...prev, status: 'refusee_chef' } : prev)
        setShowRefuse(false)
      } else {
        const e = await res.json()
        setError(e.error || 'Erreur lors du refus.')
      }
    } catch { setError('Erreur de connexion.') }
    setActing(false)
  }

  if (loading) {
    return (
      <ChefLayout title="Chargement...">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#1557FF]" />
        </div>
      </ChefLayout>
    )
  }

  if (error && !decl) {
    return (
      <ChefLayout title="Erreur">
        <div className="text-center py-20">
          <p className="text-red-600 font-bold mb-4">{error}</p>
          <button onClick={() => navigate(-1)} className="text-[#1557FF] font-semibold">← Retour</button>
        </div>
      </ChefLayout>
    )
  }

  if (!decl) return null
  const sc = STATUS_CONFIG[decl.status] || STATUS_CONFIG['soumis']
  const hasComments = ['assignee_chef', 'assignee_agent', 'en_cours', 'resolue', 'refusee_agent'].includes(decl.status)

  return (
    <ChefLayout 
      title={decl.title}
    >
      <div className="max-w-6xl mx-auto">
        
        {/* Header Details */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
           <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-[#1557FF] transition-colors shadow-sm">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">{decl.title}</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Reçu le {new Date(decl.created_at).toLocaleDateString()} à {new Date(decl.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
           </div>
           
           <div className="flex items-center gap-4 w-full md:w-auto">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
                style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.color}20` }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: sc.dot }} />
                {sc.label.toUpperCase()}
              </div>
              
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
                 <button
                    onClick={() => setActiveTab('info')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'info' ? 'bg-white shadow-sm text-[#1557FF]' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Détails
                  </button>
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'comments' ? 'bg-white shadow-sm text-[#1557FF]' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Communication
                  </button>
              </div>
           </div>
        </div>

        {activeTab === 'info' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Card 1: Core details */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Référence</p>
                    <p className="font-bold text-slate-800 font-mono tracking-tighter">#{decl.ref_citoyen}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Catégorie</p>
                    <p className="font-bold text-slate-800">{decl.category}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Priorité</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      decl.priority === 'haute' || decl.priority === 'urgente'
                        ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
                    }`}>
                      {decl.priority || 'Normale'}
                    </span>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Description du problème</p>
                  <p className="text-slate-600 leading-relaxed text-sm">{decl.description || "Aucune description fournie."}</p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Localisation</p>
                     <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                       <MapPin className="w-3 h-3 text-[#1557FF]" /> {decl.latitude?.toFixed(4)}, {decl.longitude?.toFixed(4)}
                     </p>
                   </div>
                   <div>
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Service Municipal</p>
                     <p className="text-xs font-bold text-slate-700 italic">{decl.ref_service || 'Non assigné interne'}</p>
                   </div>
                </div>
              </div>

              {/* Card 2: Photo if exists */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest p-6 pb-2">Localisation & Photos</p>
                 <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-48 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <MapPin className="w-6 h-6 mr-2" />
                      <span className="text-xs font-bold italic">Carte non disponible</span>
                    </div>
                    {(decl as any).declaration_photos && (decl as any).declaration_photos.length > 0 ? (
                      <div className="h-48 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden relative group">
                         <img src={(decl as any).declaration_photos[0].photo_url} className="w-full h-full object-cover" alt="Photo preuve" />
                         {decl.status === 'resolue' && (
                           <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wider">Preuve Résolution</div>
                         )}
                      </div>
                    ) : (
                      <div className="h-48 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                         <span className="text-xs font-bold italic">Aucune photo</span>
                      </div>
                    )}
                 </div>
              </div>

              {/* Card 3: Citizen Info */}
              {decl.citizen && (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-[#1557FF]">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Signalement par</p>
                      <p className="font-bold text-slate-800 text-lg">{decl.citizen.first_name} {decl.citizen.last_name}</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-xl border border-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-50">
                    Contacter
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar: Workflow Action */}
            <div className="space-y-6">
              
              {decl.status === 'assignee_chef' || decl.status === 'soumis' ? (
                <div className="bg-white rounded-3xl border border-[#1557FF] p-8 shadow-xl shadow-blue-50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-50" />
                  
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#1557FF] mb-6">Plan d'action</h2>
                  
                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Choisir un agent</label>
                      <select
                        value={selectedAgentId}
                        onChange={e => setSelectedAgentId(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">Sélectionner un agent...</option>
                        {Array.isArray(agents) && agents.map(a => (
                          <option key={a.id} value={a.id} disabled={!a.is_active} className={!a.is_active ? 'text-slate-300' : ''}>
                            {a.first_name} {a.last_name} 
                            {a.is_active ? ` (${a.workload} active/s - ${a.is_overloaded ? 'Charge Élevée' : 'Charge Normale'})` : ' (Indisponible)'}
                          </option>
                        ))}
                      </select>
                      {selectedAgentId && agents.find(a => a.id === selectedAgentId)?.is_overloaded && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-[10px] font-bold text-amber-700 flex items-center gap-1 uppercase tracking-wider mb-1">
                            <AlertTriangle className="w-3 h-3" /> Avertissement
                          </p>
                          <p className="text-xs text-amber-600 font-medium">L’agent possède une charge de travail élevée. Vous pouvez confirmer ou choisir un autre agent.</p>
                        </div>
                      )}
                      {error && (
                        <p className="mt-2 text-[10px] font-bold text-red-600 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> {error}
                        </p>
                      )}
                      {success && (
                        <p className="mt-2 text-[10px] font-bold text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {success}
                        </p>
                      )}
                      {warning && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-[10px] font-bold text-amber-700 flex items-center gap-1 uppercase tracking-wider mb-1">
                            <AlertTriangle className="w-3 h-3" /> Attention
                          </p>
                          <p className="text-xs text-amber-600 font-medium">{warning}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleAccept}
                    disabled={acting}
                    className="w-full py-4 bg-[#1557FF] text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:translate-y-[-2px] active:translate-y-[0] transition-all disabled:opacity-50"
                  >
                    {acting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Assigner maintenant"}
                  </button>

                  {!showRefuse ? (
                    <div className="mt-4 text-center">
                      <button 
                        onClick={() => setShowRefuse(true)}
                        className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Refuser ce signalement
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                      <label className="text-[10px] font-black uppercase text-red-400 tracking-widest block mb-2">Motif du refus (Obligatoire)</label>
                      <textarea 
                        value={refuseReason}
                        onChange={e => setRefuseReason(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-red-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200 mb-3"
                        rows={3}
                        placeholder="Expliquez pourquoi..."
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowRefuse(false)}
                          className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-white rounded-lg transition-colors"
                        >
                          Annuler
                        </button>
                        <button 
                          onClick={handleRefuse}
                          disabled={acting || !refuseReason.trim()}
                          className="flex-1 py-2 bg-red-500 text-white rounded-lg text-xs font-bold shadow-md hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          Confirmer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                   <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Agent Responsable</h2>
                   
                   {decl.assigned_agent ? (
                     <div className="flex items-center gap-4 mb-6">
                       <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                         <UserCheck className="w-6 h-6" />
                       </div>
                       <div>
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Assigné à</p>
                         <p className="font-bold text-slate-800 text-lg">{decl.assigned_agent.first_name} {decl.assigned_agent.last_name}</p>
                       </div>
                     </div>
                   ) : (
                     <div className="flex items-center gap-4 mb-6 opacity-50">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Assigné à</p>
                          <p className="font-bold text-slate-400">Aucun agent (Auto-traitement)</p>
                        </div>
                     </div>
                   )}

                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 flex items-center gap-2 italic">
                        <CheckCircle2 className="w-3 h-3 text-[#1557FF]" /> 
                        Le signalement est actuellement sous la responsabilité de l'agent.
                      </p>
                   </div>
                </div>
              )}

              {/* Status Log / Timeline stub */}
              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Historique</h3>
                <div className="space-y-6">
                   <div className="flex gap-4">
                      <div className="w-1 h-12 bg-slate-100 rounded-full relative">
                         <div className="absolute top-0 -left-1.5 w-4 h-4 bg-white border-2 border-[#1557FF] rounded-full" />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-slate-800">Création</p>
                         <p className="text-[10px] text-slate-400">{new Date(decl.created_at).toLocaleTimeString()}</p>
                      </div>
                   </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-8 pb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Centre de communication</h2>
              <p className="text-sm text-slate-500">Échanges privés entre les services municipaux et l'agent terrain.</p>
            </div>
            
            {hasComments ? (
              <div className="flex-1">
                <DeclarationCommentsPanel
                  declarationId={decl.id}
                  visibleChannels={['president_chef', 'chef_agent', 'agent_citizen']}
                  writableChannels={['president_chef', 'chef_agent']}
                  role="chef"
                  currentUserId={currentUserId}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 p-12">
                <div className="text-center max-w-xs">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold text-slate-800">Communication inactive</p>
                  <p className="text-xs mt-2 leading-relaxed">Les canaux d'échanges s'ouvrent automatiquement dès que le signalement est validé et assigné à un agent.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ChefLayout>
  )
}

export default ChefDeclarationDetail
