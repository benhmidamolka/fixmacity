import React, { useEffect, useState } from 'react'
import { X, ThumbsUp, ThumbsDown, Clock, Share2, Link as LinkIcon } from 'lucide-react'
import CitizenLayout from '../../components/citizen/CitizenLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ─── Mock fallback data ───────────────────────────────────────────────────────
const MOCK_PROPS = [
  {
    id: '1', category: 'Environnement', title: 'Végétalisation de la Place des Martyrs',
    description: 'Ce projet vise à transformer la Place des Martyrs en un véritable poumon vert au cœur de Sousse. Il comprend la plantation d\'arbres endémiques, l\'installation de bancs ombragés, et la création d\'un système d\'irrigation écologique. L\'objectif est de réduire les îlots de chaleur et d\'offrir un espace de détente convivial pour les citoyens.',
    pour_pct: 73, total_votes: 1245, days_left: 18, closes_at: '15 Octobre', duration: '3 mois',
    img: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&q=80',
  },
  {
    id: '2', category: 'Mobilité', title: 'Extension des Pistes Cyclables',
    description: 'Création de 12 km de nouvelles pistes cyclables sécurisées reliant les principaux quartiers de Sousse au centre-ville, avec des stations de vélos en libre-service.',
    pour_pct: 81, total_votes: 987, days_left: 5, closes_at: '2 Octobre', duration: '6 mois',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  },
  {
    id: '3', category: 'Propreté', title: 'Bacs à Ordures Connectés',
    description: 'Installation de 200 bacs à ordures intelligents équipés de capteurs IoT pour optimiser les tournées de collecte et réduire les débordements dans les rues.',
    pour_pct: 65, total_votes: 756, days_left: 30, closes_at: '27 Octobre', duration: '2 mois',
    img: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&q=80',
  },
  {
    id: '4', category: 'Éclairage', title: 'Modernisation de l\'Éclairage Public',
    description: 'Remplacement de 3000 lampadaires par des modèles LED à détection de mouvement, réduisant la consommation énergétique de 60% et améliorant la sécurité nocturne.',
    pour_pct: 89, total_votes: 2100, days_left: 2, closes_at: '29 Septembre', duration: '4 mois',
    img: 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&q=80',
  },
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Environnement': { bg: '#f0fdf4', text: '#16a34a', dot: '#16a34a' },
  'Mobilité':      { bg: '#eff6ff', text: '#2563eb', dot: '#2563eb' },
  'Propreté':      { bg: '#faf5ff', text: '#7c3aed', dot: '#7c3aed' },
  'Éclairage':     { bg: '#fffbeb', text: '#d97706', dot: '#d97706' },
}

const TABS = ['Tous les projets', 'En cours de vote', 'Mes votes']

// ─── Proposition Modal ────────────────────────────────────────────────────────
function PropositionModal({ prop, onClose, onVote }: {
  prop: any; onClose: () => void; onVote: (id: string, vote: 'pour' | 'contre') => void
}) {
  const c = CATEGORY_COLORS[prop.category] || CATEGORY_COLORS['Environnement']
  const [voted, setVoted] = useState<'pour' | 'contre' | null>(null)

  const handleVote = (v: 'pour' | 'contre') => {
    setVoted(v)
    onVote(prop.id, v)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-3xl overflow-hidden w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header image */}
        <div className="relative h-52 overflow-hidden">
          <img src={prop.img} alt={prop.title}
            className="w-full h-full object-cover" />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(10,22,40,0.8) 0%, transparent 60%)' }} />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-all">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-2"
              style={{ background: c.bg, color: c.text }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
              {prop.category}
            </span>
            <h2 className="text-white text-2xl font-bold leading-tight">{prop.title}</h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Left: description */}
          <div>
            <h3 className="font-bold text-[#0A1628] mb-3">À propos du projet</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">{prop.description}</p>
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3">
              <span className="text-slate-400 text-sm">📅</span>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Durée</p>
                <p className="text-sm font-bold text-[#0A1628]">{prop.duration}</p>
              </div>
            </div>
          </div>

          {/* Right: vote */}
          <div>
            <div className="bg-slate-50 rounded-2xl p-5 text-center mb-4">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">État actuel</p>
              <p className="text-5xl font-extrabold mb-1" style={{ color: '#1557FF' }}>{prop.pour_pct}%</p>
              <p className="text-sm text-slate-500 font-medium">de votes "Pour"</p>
              <div className="flex items-center justify-center gap-1.5 mt-3 text-slate-400 text-xs">
                <Clock className="w-3.5 h-3.5" />
                Ferme dans {prop.days_left} jours
              </div>
            </div>

            {voted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <p className="text-green-700 font-bold">✓ Vote enregistré !</p>
                <p className="text-green-600 text-sm mt-1">Vous avez voté <strong>{voted === 'pour' ? 'Pour' : 'Contre'}</strong></p>
              </div>
            ) : (
              <div className="space-y-3">
                <button onClick={() => handleVote('pour')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold transition-all text-sm hover:opacity-90"
                  style={{ background: '#16a34a' }}>
                  <ThumbsUp className="w-4 h-4" /> Je suis Pour
                </button>
                <button onClick={() => handleVote('contre')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all text-sm border-2 hover:bg-red-50"
                  style={{ borderColor: '#e11d48', color: '#e11d48' }}>
                  <ThumbsDown className="w-4 h-4" /> Je suis Contre
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 mt-4">
              <span className="text-slate-400 text-xs font-medium">Partager :</span>
              <button className="p-2 text-slate-400 hover:text-[#1557FF] transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
              <button className="p-2 text-slate-400 hover:text-[#1557FF] transition-colors">
                <LinkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Proposition Card ─────────────────────────────────────────────────────────
function PropCard({ prop, onClick }: { prop: any; onClick: () => void }) {
  const c = CATEGORY_COLORS[prop.category] || CATEGORY_COLORS['Environnement']
  const urgent = prop.days_left <= 5

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={onClick}>
      <div className="relative h-44 overflow-hidden">
        <img src={prop.img} alt={prop.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: c.bg, color: c.text }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
          {prop.category}
        </span>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-[#0A1628] text-base leading-tight mb-2">{prop.title}</h3>

        {/* Countdown */}
        <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-4 ${
          urgent ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
        }`}>
          ⏳ {prop.days_left} jours restants (Clôture : {prop.closes_at})
        </div>

        {/* Progress */}
        <div className="flex justify-between text-xs font-bold mb-1.5">
          <span className="text-slate-500">Soutien citoyen</span>
          <span style={{ color: '#16a34a' }}>{prop.pour_pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-4">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${prop.pour_pct}%` }} />
        </div>

        {/* Vote buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={e => { e.stopPropagation(); onClick() }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
            style={{ background: '#16a34a' }}>
            <ThumbsUp className="w-3.5 h-3.5" /> Pour
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClick() }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm transition-all border hover:bg-red-50"
            style={{ borderColor: '#fca5a5', color: '#e11d48', background: '#fff1f2' }}>
            <ThumbsDown className="w-3.5 h-3.5" /> Contre
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Propositions Page ────────────────────────────────────────────────────────
const Propositions: React.FC = () => {
  const [props, setProps]       = useState<any[]>(MOCK_PROPS)
  const [activeTab, setActiveTab] = useState(0)
  const [selected, setSelected]   = useState<any>(null)
  const token = localStorage.getItem('fmc_token')

  useEffect(() => {
    fetch(`${API}/propositions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : data.propositions
        if (arr?.length) setProps(arr)
      })
      .catch(() => {}) // keep mock on error
  }, [])

  const handleVote = async (id: string, vote: 'pour' | 'contre') => {
    try {
      await fetch(`${API}/propositions/${id}/vote`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ vote }),
      })
    } catch {}
  }

  return (
    <CitizenLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0A1628]">Propositions du Président</h1>
            <p className="text-slate-500 mt-1">Votez pour les projets proposés par la présidence pour améliorer votre ville de Sousse.</p>
          </div>
          <button className="flex-shrink-0 flex items-center gap-2 bg-[#F59E0B] hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm">
            💡 Suggérer une proposition
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === i
                  ? 'bg-[#1557FF] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {props.map(p => (
            <PropCard key={p.id} prop={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <PropositionModal
          prop={selected}
          onClose={() => setSelected(null)}
          onVote={handleVote}
        />
      )}
    </CitizenLayout>
  )
}

export default Propositions
