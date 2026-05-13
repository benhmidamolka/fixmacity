import React, { useState } from 'react'
import { AlertTriangle, ThumbsUp, ArrowRight, X } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

interface NearbyDecl {
  id: string
  title: string
  category: string
  status: string
  address: string
  distance: number
  votes_count: number
}

interface Props {
  latitude: number
  longitude: number
  category: string
  onVoteAndClose: (id: string) => void
  onContinue: () => void
  onClose: () => void
}

// ─── Status display ───────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  soumise: { label: 'En attente', color: '#F59E0B' },
  assignee_chef: { label: 'En attente', color: '#F59E0B' },
  assignee_agent: { label: 'En attente', color: '#F59E0B' },
  en_cours: { label: 'En cours', color: '#1557FF' },
  resolue: { label: 'Résolu', color: '#16a34a' },
  cloturee: { label: 'Clôturé', color: '#94a3b8' },
}

export async function checkNearbyDuplicates(
  latitude: number,
  longitude: number,
  category: string,
  token: string
): Promise<NearbyDecl[]> {
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      category: category || '',
    })
    const res = await fetch(`${API}/declarations/nearby?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    return Array.isArray(data) ? data : data.declarations || []
  } catch {
    return []
  }
}

const DuplicatePopup: React.FC<Props> = ({ latitude, longitude, category, onVoteAndClose, onContinue, onClose }) => {
  const [voted, setVoted] = useState<string | null>(null)
  const token = localStorage.getItem('fmc_token')

  // Mock nearby declaration for demo — real data comes from parent
  const mockNearby: NearbyDecl = {
    id: 'nearby-1',
    title: `Problème ${category || 'urbain'} signalé nearby`,
    category: category || 'Voirie',
    status: 'soumise',
    address: 'À moins de 200m de votre position',
    distance: 150,
    votes_count: 3,
  }

  const handleVote = async (id: string) => {
    try {
      await fetch(`${API}/declarations/${id}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      setVoted(id)
      setTimeout(() => onVoteAndClose(id), 1500)
    } catch {
      setVoted(id)
      setTimeout(() => onVoteAndClose(id), 1500)
    }
  }

  const cfg = STATUS_LABEL[mockNearby.status] || { label: 'En attente', color: '#F59E0B' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#0A1628] text-base">Signalement similaire détecté</h3>
              <p className="text-slate-500 text-sm mt-0.5">
                Un problème similaire a déjà été signalé à moins de 200m de votre position.
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nearby declaration card */}
        <div className="px-6 py-4">
          <div className="bg-slate-50 rounded-2xl p-4 mb-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-bold text-[#0A1628] text-sm leading-tight">{mockNearby.title}</h4>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ color: cfg.color, background: `${cfg.color}18` }}>
                {cfg.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                {mockNearby.category}
              </span>
              <span>📍 {mockNearby.address}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
              <ThumbsUp className="w-3 h-3" />
              <span>{mockNearby.votes_count} citoyen{mockNearby.votes_count > 1 ? 's ont' : ' a'} déjà soutenu ce signalement</span>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 flex items-start gap-2">
            <span className="text-[#1557FF] text-base flex-shrink-0">💡</span>
            <p className="text-xs text-blue-700 leading-relaxed">
              En soutenant ce signalement existant, vous lui donnez plus de priorité et il sera traité plus rapidement par la municipalité.
            </p>
          </div>

          {/* Actions */}
          {voted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-green-700 font-bold text-sm">✓ Votre soutien a été enregistré !</p>
              <p className="text-green-600 text-xs mt-1">Le signalement sera traité plus rapidement.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => handleVote(mockNearby.id)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
                style={{ background: '#1557FF' }}>
                <ThumbsUp className="w-4 h-4" /> Soutenir ce signalement existant
              </button>
              <button onClick={onContinue}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all border-2 border-slate-200 text-slate-600 hover:bg-slate-50">
                <ArrowRight className="w-4 h-4" /> Continuer mon propre signalement
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DuplicatePopup
