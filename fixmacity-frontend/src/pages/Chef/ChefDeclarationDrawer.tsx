import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, MapPin, User, AlertTriangle, Building2, BookOpen, Clock,
  CheckCircle2, MessageSquare, Shield, Send, Star, Camera,
  Check
} from 'lucide-react'

// ─── MOCK DATA ─────────────────────────────────────────────────────────────
const MOCK_DECLARATION = {
  id: 'DECL-2026-001',
  ref: 'REF-84920',
  title: 'Nid de poule dangereux',
  description: 'Un grand nid de poule s\'est formé sur la route principale, causant des dommages aux véhicules qui passent.',
  category: 'Voirie',
  priority: 'Haute',
  status: 'soumise', // Try changing this to 'assignee_chef', 'en_cours', 'resolue', 'cloturee'
  photo_avant: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800',
  photo_apres: 'https://images.unsplash.com/photo-1584308972272-9e4e7685e80f?auto=format&fit=crop&q=80&w=800',
  created_at: '2026-06-10T14:30:00Z',
  resolved_at: '2026-06-12T09:15:00Z',
  citizen: {
    first_name: 'Amine',
    last_name: 'Ben Ali',
    email: 'amine.benali@example.com'
  },
  location: 'Avenue Habib Bourguiba, Tunis',
  sensitive_locations: ['Mosquée Al-Zaytuna', 'École Primaire'],
  departments: ['Voirie', 'Espaces Verts'],
  citizen_rating: 5,
  citizen_comment: 'Intervention très rapide, merci beaucoup pour votre réactivité !'
}

const MOCK_AGENTS = [
  { id: 'a1', name: 'Karim Agent' },
  { id: 'a2', name: 'Sami Terrain' }
]

const STATUS_STEPS = ['soumise', 'assignee_chef', 'assignee_agent', 'resolue']

// ─── COMPONENT ─────────────────────────────────────────────────────────────

export default function ChefDeclarationDrawer({ onClose }: { onClose?: () => void }) {
  const [decl, setDecl] = useState(MOCK_DECLARATION)
  const [showRefuseInput, setShowRefuseInput] = useState(false)
  const [refuseMotif, setRefuseMotif] = useState('')
  const [assignedAgents, setAssignedAgents] = useState<string[]>([])
  
  // Chats states
  const [presidentChat, setPresidentChat] = useState<{sender: string, text: string}[]>([])
  const [agentChat, setAgentChat] = useState<{sender: string, text: string}[]>([])
  const [presMsg, setPresMsg] = useState('')
  const [agentMsg, setAgentMsg] = useState('')

  // Derived Workflow States
  const isPostAcceptance = ['assignee_chef', 'assignee_agent', 'en_cours', 'resolue', 'cloturee'].includes(decl.status)
  const isResolvedOrClosed = ['resolue', 'cloturee'].includes(decl.status)
  const isAgentAssigned = assignedAgents.length > 0
  const currentStepIdx = STATUS_STEPS.indexOf(
    decl.status === 'cloturee' ? 'resolue' : 
    decl.status === 'en_cours' ? 'assignee_agent' : decl.status
  )

  const handleAccept = () => setDecl({ ...decl, status: 'assignee_chef' })
  
  const handleRefuse = () => {
    if (!refuseMotif.trim()) return alert('Veuillez entrer un motif de refus.')
    setDecl({ ...decl, status: 'refusee' })
  }

  const toggleAgent = (id: string) => {
    setAssignedAgents(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      {/* DRAWER CONTAINER: h-[100dvh], flex flex-col */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[500px] h-[100dvh] bg-white dark:bg-slate-950 flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right-full" onClick={(e) => e.stopPropagation()}>
        
        {/* ── HEADER (Sticky) ── */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">{decl.ref}</span>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 transition-colors">
              <X size={18} />
            </button>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-3">{decl.title}</h2>
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-100 dark:border-red-500/20">
              Urgence: {decl.priority}
            </span>
            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
              Statut: {decl.status}
            </span>
          </div>
        </div>

        {/* ── MAIN CONTENT (Scrollable) ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section: Photos (Before) */}
          <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 aspect-video relative border border-slate-200 dark:border-slate-800">
            {decl.photo_avant ? (
              <div className="w-full h-full shrink-0">
                <img 
                  src={decl.photo_avant} 
                  alt="Avant" 
                  className="w-full h-full object-cover shrink-0" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/800x450?text=Image+Introuvable';
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Camera size={32} className="mb-2 opacity-50" />
                <span className="text-xs font-bold">Aucune photo avant</span>
              </div>
            )}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-black">
              PHOTO AVANT
            </div>
          </div>

          {/* Section: Core Details */}
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{decl.description}</p>
            
            <div className="grid grid-cols-1 gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <MapPin size={16} className="text-slate-400" />
                <span className="font-medium">{decl.location}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <User size={16} className="text-slate-400" />
                <span className="font-medium">{decl.citizen.first_name} {decl.citizen.last_name} ({decl.citizen.email})</span>
              </div>
            </div>
          </div>

          {/* Contextual Intelligence */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intelligence Contextuelle</p>
            <div className="flex flex-col gap-2">
              {decl.sensitive_locations.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold block mb-1">Lieux sensibles à proximité</span>
                    <span className="text-[11px] leading-tight block">{decl.sensitive_locations.join(', ')}</span>
                  </div>
                </div>
              )}
              {decl.departments.length > 1 && (
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                  <Building2 size={16} />
                  <span className="text-xs font-bold">Implique plusieurs départements ({decl.departments.join(', ')})</span>
                </div>
              )}
            </div>
          </div>

          {/* ── POST-ACCEPTANCE SECTIONS ── */}
          {isPostAcceptance && (
            <div className="space-y-8 pt-4 border-t border-slate-100 dark:border-slate-800">
              
              {/* Progress Timeline */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Progression</p>
                <div className="flex justify-between relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0" />
                  {STATUS_STEPS.map((step, idx) => {
                    const isDone = idx <= currentStepIdx
                    return (
                      <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isDone ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-300 dark:bg-slate-900 dark:border-slate-700'}`}>
                          {isDone ? <Check size={12} strokeWidth={4} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isDone ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                          {step.replace('_', ' ')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Chat: President <-> Chef */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col h-64">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <MessageSquare size={14} className="text-blue-600" />
                  <span className="text-xs font-black">Président ↔ Chef</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {presidentChat.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center mt-4">Aucun message interne.</p>
                  ) : (
                    presidentChat.map((msg, i) => (
                      <div key={i} className={`flex ${msg.sender === 'chef' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`px-3 py-2 rounded-xl text-xs max-w-[85%] ${msg.sender === 'chef' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <input type="text" value={presMsg} onChange={e => setPresMsg(e.target.value)} placeholder="Message au président..." className="flex-1 text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 outline-none" onKeyDown={e => {
                    if (e.key === 'Enter' && presMsg) { setPresidentChat([...presidentChat, { sender: 'chef', text: presMsg }]); setPresMsg('') }
                  }} />
                  <button onClick={() => { if(presMsg) { setPresidentChat([...presidentChat, { sender: 'chef', text: presMsg }]); setPresMsg('') } }} className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg">
                    <Send size={12} />
                  </button>
                </div>
              </div>

              {/* Agent Assignment */}
              {!isResolvedOrClosed && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Assignation Agent</p>
                  <div className="space-y-2">
                    {MOCK_AGENTS.map(agent => (
                      <label key={agent.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-emerald-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-xs">
                            {agent.name.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{agent.name}</span>
                        </div>
                        <input type="checkbox" checked={assignedAgents.includes(agent.id)} onChange={() => toggleAgent(agent.id)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat: Chef <-> Agent */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col h-64 relative overflow-hidden">
                {!isAgentAssigned && (
                  <div className="absolute inset-0 z-10 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-[2px] flex flex-col items-center justify-center text-slate-500">
                    <Shield size={24} className="mb-2" />
                    <span className="text-xs font-bold">Canal verrouillé</span>
                    <span className="text-[10px]">Assignez un agent pour débloquer</span>
                  </div>
                )}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <MessageSquare size={14} className="text-emerald-600" />
                  <span className="text-xs font-black">Chef ↔ Agent</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {agentChat.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center mt-4">Aucun message terrain.</p>
                  ) : (
                    agentChat.map((msg, i) => (
                      <div key={i} className={`flex ${msg.sender === 'chef' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`px-3 py-2 rounded-xl text-xs max-w-[85%] ${msg.sender === 'chef' ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <input type="text" disabled={!isAgentAssigned} value={agentMsg} onChange={e => setAgentMsg(e.target.value)} placeholder="Instructions pour l'agent..." className="flex-1 text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 outline-none disabled:opacity-50" onKeyDown={e => {
                    if (e.key === 'Enter' && agentMsg) { setAgentChat([...agentChat, { sender: 'chef', text: agentMsg }]); setAgentMsg('') }
                  }} />
                  <button disabled={!isAgentAssigned} onClick={() => { if(agentMsg) { setAgentChat([...agentChat, { sender: 'chef', text: agentMsg }]); setAgentMsg('') } }} className="w-8 h-8 flex items-center justify-center bg-emerald-600 text-white rounded-lg disabled:opacity-50">
                    <Send size={12} />
                  </button>
                </div>
              </div>

              {/* Resolution Photo Placeholder / Actual */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Preuve d'intervention</p>
                <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 aspect-video relative border border-slate-200 dark:border-slate-800">
                  {isResolvedOrClosed && decl.photo_apres ? (
                    <>
                      <div className="w-full h-full shrink-0">
                        <img 
                          src={decl.photo_apres} 
                          alt="Après" 
                          className="w-full h-full object-cover shrink-0" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/800x450?text=Image+Introuvable';
                          }}
                        />
                      </div>
                      <div className="absolute bottom-3 right-3 bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-lg">
                        <CheckCircle2 size={12} />
                        Résolu le {new Date(decl.resolved_at).toLocaleDateString()}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                      <Clock size={24} className="mb-2 opacity-50" />
                      <span className="text-xs font-bold text-center px-6">
                        En attente de la photo d'intervention de l'agent.
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-black">
                    PHOTO APRÈS
                  </div>
                </div>
              </div>

              {/* Citizen Feedback */}
              {decl.status === 'cloturee' && decl.citizen_rating && (
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-500/10 dark:to-amber-500/10 p-5 rounded-2xl border border-yellow-100 dark:border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Star size={16} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-black text-yellow-700 dark:text-yellow-500 uppercase tracking-widest">Évaluation du Citoyen</span>
                  </div>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={20} className={star <= decl.citizen_rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 dark:text-slate-700'} />
                    ))}
                  </div>
                  {decl.citizen_comment && (
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic">
                      « {decl.citizen_comment} »
                    </p>
                  )}
                </div>
              )}

            </div>
          )}
        </div>

        {/* ── FOOTER (Sticky Actions) ── */}
        {!isPostAcceptance && (
          <div className="flex-shrink-0 p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 sticky bottom-0 z-10 space-y-3">
            {showRefuseInput ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 space-y-3">
                <textarea 
                  value={refuseMotif}
                  onChange={(e) => setRefuseMotif(e.target.value)}
                  placeholder="Motif de refus..."
                  className="w-full h-20 text-sm px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-red-500 dark:focus:border-red-500 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowRefuseInput(false)} className="flex-1 py-3 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    Annuler
                  </button>
                  <button onClick={handleRefuse} className="flex-1 py-3 rounded-xl font-bold text-xs bg-red-600 text-white hover:bg-red-700 transition-colors">
                    Confirmer le refus
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setShowRefuseInput(true)} className="flex-1 py-3 rounded-xl font-bold text-xs bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                  Refuser
                </button>
                <button onClick={handleAccept} className="flex-1 py-3 rounded-xl font-bold text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                  Accepter la déclaration
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>,
    document.body
  )
}
