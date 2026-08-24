import React, { useState, useEffect } from 'react'
import { X, UserCheck, Loader2, AlertCircle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''
const hdr = () => ({ Authorization: `Bearer ${tok()}` })
const jsonH = () => ({ 'Content-Type': 'application/json', ...hdr() })

interface Agent {
  id: string
  first_name: string
  last_name: string
  workload: number
}

interface AgentAssignModalProps {
  tsdeclarationId: string
  onClose: () => void
  onAssigned: () => void
}

const AGENT_COLORS = ['#1557FF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#0891B2', '#EF4444', '#14B8A6']

export default function AgentAssignModal({ tsdeclarationId, onClose, onAssigned }: AgentAssignModalProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/chef/agents`, { headers: hdr() })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setAgents(data.agents || []))
      .catch(() => setError('Erreur de chargement des agents'))
      .finally(() => setLoadingAgents(false))
  }, [])

  const toggleAgent = (id: string) => {
    setSelectedAgentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const assign = async (agentIds: string[]) => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API}/chef/declarations/${tsdeclarationId}/accept`, {
        method: 'POST',
        headers: jsonH(),
        body: JSON.stringify({ agent_ids: agentIds })
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erreur lors de l\'assignation')
      }
      onAssigned()
      onClose()
    } catch (e: any) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <UserCheck size={16} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Assigner un agent</p>
              <p className="text-[10px] text-slate-400">Choisissez l'agent en charge</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {loadingAgents ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin mb-2" />
              <p className="text-xs font-bold text-slate-400">Chargement des agents...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-bold text-slate-400">Aucun agent trouvé</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {agents.map((a, i) => {
                const selected = selectedAgentIds.includes(a.id)
                return (
                  <label key={a.id} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${selected ? 'border-purple-500 bg-purple-500/10' : 'border-slate-800 hover:border-slate-700 bg-slate-800/50'}`}>
                    <input type="checkbox" value={a.id} checked={selected} onChange={() => toggleAgent(a.id)} className="hidden" />
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white flex-shrink-0 shadow-sm" style={{ background: AGENT_COLORS[i % AGENT_COLORS.length] }}>
                      {a.first_name[0]}{a.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-200 truncate">{a.first_name} {a.last_name}</p>
                      <p className="text-[10px] text-slate-400">Charge : {a.workload} tâche(s)</p>
                    </div>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-purple-500 bg-purple-500' : 'border-slate-600'}`}>
                      {selected && <div className="w-2 h-2 rounded bg-white" />}
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-6 pt-2 space-y-3">
          <button onClick={() => assign(selectedAgentIds)} disabled={submitting || selectedAgentIds.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm disabled:opacity-50 transition-all shadow-sm">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Assigner maintenant'}
          </button>
          <button onClick={() => assign([])} disabled={submitting}
            className="w-full py-3 rounded-2xl border border-slate-700 text-sm font-bold text-slate-300 hover:bg-slate-800 transition-all">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  )
}
