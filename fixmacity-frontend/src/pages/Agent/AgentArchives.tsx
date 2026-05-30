// src/pages/Agent/AgentArchives.tsx
import React, { useState, useEffect } from 'react'
import AgentLayout from '../../layouts/AgentLayout'
import AgentDeclarationDetail from './AgentDeclarationDetail'
import {
  Archive, RotateCcw, Calendar, MapPin, Eye, RefreshCw, Inbox, Loader2, Star, CheckSquare, Clock
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''
const hdr = () => ({ Authorization: `Bearer ${tok()}` })

const Stars = ({ score }: { score: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <Star
        key={n}
        size={11}
        className={n <= score ? 'text-amber-405 fill-amber-405' : 'text-slate-700 fill-slate-700'}
      />
    ))}
  </div>
)

const AgentArchives: React.FC = () => {
  const [declarations, setDeclarations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDecl, setSelectedDecl] = useState<string | null>(null)

  // Local archive state - read from same local storage key as Kanban board
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('fmc_agent_archived_ids')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const fetchDecls = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/agent/declarations`, { headers: hdr() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDeclarations(data.declarations || (Array.isArray(data) ? data : []))
    } catch {
      toast.error('Impossible de charger les fiches archivées')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDecls()
  }, [])

  const unarchiveCard = (id: string) => {
    setArchivedIds(prev => {
      const s = new Set(prev)
      s.delete(id)
      localStorage.setItem('fmc_agent_archived_ids', JSON.stringify(Array.from(s)))
      return s
    })
    toast.success('Mission restaurée sur le tableau')
  }

  const safe = Array.isArray(declarations) ? declarations : []
  const archivedMissions = safe.filter(d => archivedIds.has(d.id))

  return (
    <AgentLayout title="Archives">
      <div className="p-2 max-w-[1600px] mx-auto space-y-6 text-slate-100">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-lg border border-slate-800 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Archive size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  Missions Archivées
                </h1>
                <p className="text-xs text-slate-300 mt-1">
                  Consultez l'historique complet des missions clôturées que vous avez choisi d'archiver.
                </p>
              </div>
            </div>

            <button
              onClick={fetchDecls}
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 transition-all hover:border-slate-600"
              title="Actualiser la liste"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* List of Archived Items */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400">
            <Loader2 size={36} className="animate-spin mb-4 text-emerald-500" />
            <p className="text-sm font-bold text-slate-400">Chargement de vos archives...</p>
          </div>
        ) : archivedMissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
            <Inbox size={48} className="mb-4 text-slate-700" />
            <h3 className="text-base font-black text-slate-400 uppercase tracking-widest">Aucune mission archivée</h3>
            <p className="text-xs text-slate-500 text-center max-w-[280px] mt-2">
              Les missions clôturées sur le Tableau peuvent être archivées pour être conservées ici.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {archivedMissions.map(item => {
                const isCron = item.status === 'cloturee' && !item.rating;
                return (
                  <motion.div
                    key={item.id}
                    layoutId={`archived-card-${item.id}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                          {item.ref_citoyen || `#${item.id?.slice(-4)}`}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedDecl(item.id)}
                            className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Voir détail"
                          >
                            <Eye size={12} />
                          </button>
                          
                          <button
                            onClick={() => unarchiveCard(item.id)}
                            className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 hover:bg-emerald-900/60 transition-colors flex items-center gap-1 text-[9px] font-bold"
                          >
                            <RotateCcw size={10} /> Restaurer
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {item.description || 'Aucune description.'}
                        </p>
                      </div>

                      {/* Tag list */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.category && (
                          <span className="text-[9px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        )}
                        <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold bg-slate-950 text-slate-500 border border-slate-850">
                          Clôturée
                        </span>
                      </div>

                      {/* Address */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <MapPin size={11} className="text-slate-600" />
                        <span className="truncate">{item.address || 'Non spécifié'}</span>
                      </div>

                      {/* Review details */}
                      {isCron ? (
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 bg-slate-950 border border-slate-850 px-2.5 py-1.5 rounded-xl">
                          <Clock size={11} className="text-slate-500" />
                          <span>Clôture automatique CRON +7 jours</span>
                        </div>
                      ) : (
                        item.rating && (
                          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                <CheckSquare size={9} /> Avis citoyen
                              </span>
                              <Stars score={item.rating.score} />
                            </div>
                            {item.rating.comment && (
                              <p className="text-[11px] text-slate-350 italic leading-relaxed">
                                "{item.rating.comment}"
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-850 text-[10px] text-slate-550">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        Créé le {item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : '—'}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Detail drawer if needed */}
      {selectedDecl && (
        <AgentDeclarationDetail
          tacheId={selectedDecl}
          onClose={() => setSelectedDecl(null)}
          onAccepted={fetchDecls}
          onRejected={fetchDecls}
        />
      )}
    </AgentLayout>
  )
}

export default AgentArchives
