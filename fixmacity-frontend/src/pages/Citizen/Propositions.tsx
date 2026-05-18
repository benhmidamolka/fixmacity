import React, { useEffect, useState } from 'react'
import { X, ThumbsUp, ThumbsDown, Clock, Share2, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react'
import CitizenLayout from '../../components/citizen/CitizenLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

const nowMs = new Date().getTime();
const dayMs = 24 * 3600 * 1000;

const MOCK_PROPS = [
  {
    id: '1', category: 'Espaces Verts', title: 'Végétalisation de la Place des Martyrs',
    description: 'Ce projet vise à transformer la Place des Martyrs en un véritable poumon vert au cœur de Sousse. Il comprend la plantation d\'arbres endémiques, l\'installation de bancs ombragés, et la création d\'un système d\'irrigation écologique. L\'objectif est de réduire les îlots de chaleur et d\'offrir un espace de détente convivial pour les citoyens.',
    pour_pct: 73, total_votes: 1245, duration: '3 mois',
    img: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&q=80',
    end_date: new Date(nowMs + 18 * dayMs).toISOString()
  },
  {
    id: '2', category: 'Voirie', title: 'Extension des Pistes Cyclables',
    description: 'Création de 12 km de nouvelles pistes cyclables sécurisées reliant les principaux quartiers de Sousse au centre-ville, avec des stations de vélos en libre-service.',
    pour_pct: 81, total_votes: 987, duration: '6 mois',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    end_date: new Date(nowMs + 5 * dayMs).toISOString()
  },
  {
    id: '3', category: 'Propreté', title: 'Bacs à Ordures Connectés',
    description: 'Installation de 200 bacs à ordures intelligents équipés de capteurs IoT pour optimiser les tournées de collecte et réduire les débordements dans les rues.',
    pour_pct: 65, total_votes: 756, duration: '2 mois',
    img: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&q=80',
    end_date: new Date(nowMs + 30 * dayMs).toISOString()
  },
  {
    id: '4', category: 'Éclairage public', title: 'Modernisation de l\'Éclairage Public',
    description: 'Remplacement de 3000 lampadaires par des modèles LED à détection de mouvement, réduisant la consommation énergétique de 60% et améliorant la sécurité nocturne.',
    pour_pct: 89, total_votes: 2100, duration: '4 mois',
    img: 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&q=80',
    end_date: new Date(nowMs + 2 * dayMs).toISOString()
  },
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Espaces Verts': { bg: '#f0fdf4', text: '#16a34a', dot: '#16a34a' },
  'Voirie':         { bg: '#eff6ff', text: '#2563eb', dot: '#2563eb' },
  'Propreté':       { bg: '#faf5ff', text: '#7c3aed', dot: '#7c3aed' },
  'Éclairage public': { bg: '#fffbeb', text: '#d97706', dot: '#d97706' },
  'Réseaux':        { bg: '#fff1f2', text: '#f43f5e', dot: '#f43f5e' },
  'Signalisation':  { bg: '#f0fdfa', text: '#0d9488', dot: '#0d9488' },
  'Général':        { bg: '#f8fafc', text: '#64748b', dot: '#64748b' },
}

const TABS = ['Tous les projets', 'En cours de vote', 'Mes votes']

// ─── Proposition Modal ────────────────────────────────────────────────────────
function PropositionModal({ prop, onClose, onVote, onShare }: {
  prop: any; 
  onClose: () => void; 
  onVote: (id: string, vote: 'pour' | 'contre') => void;
  onShare: (type: 'link' | 'social') => void;
}) {
  const c = CATEGORY_COLORS[prop.category] || CATEGORY_COLORS['Général']
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
                <p className="text-green-700 font-bold">✓ Action enregistrée</p>
              </div>
            ) : prop.days_left === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                <p className="text-slate-600 font-bold">Période de vote terminée</p>
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

            <div className="flex items-center justify-center gap-4 mt-4 bg-slate-100/50 py-2 rounded-xl">
              <span className="text-slate-400 text-xs font-black uppercase tracking-widest">Partager</span>
              <button 
                onClick={() => onShare('social')}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-[#1557FF] hover:shadow-md transition-all" 
                title="Partager">
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => onShare('link')}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-[#1557FF] hover:shadow-md transition-all" 
                title="Copier le lien">
                <LinkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Proposition Card ─────────────────────────────────────────────────────────
function PropCard({ prop, onClick, onShare }: { prop: any; onClick: () => void; onShare: (e: React.MouseEvent, prop: any) => void }) {
  const c = CATEGORY_COLORS[prop.category] || CATEGORY_COLORS['Général']
  const urgent = prop.days_left <= 5

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer group relative flex flex-col h-full"
      onClick={onClick}>
      
      {/* Share button overlay */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button 
          onClick={(e) => onShare(e, prop)}
          className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-600 shadow-sm hover:bg-white hover:text-[#1557FF] transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 duration-300">
          <Share2 className="w-4 h-4" />
        </button>
      </div>

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

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-[#0A1628] text-base leading-tight mb-2 group-hover:text-[#1557FF] transition-colors">{prop.title}</h3>

        {/* Countdown */}
        <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-4 ${
          urgent ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
        }`}>
          ⏳ {prop.days_left} jours restants
        </div>

        {/* Progress */}
        <div className="mt-auto">
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
    </div>
  )
}

const enrichPropositions = (arr: any[]) => {
  return arr.map((p: any) => {
    const pour = p.votes_pour || 0;
    const contre = p.votes_contre || 0;
    const total = pour + contre;
    const pour_pct = total > 0 ? Math.round((pour / total) * 100) : p.pour_pct || 0;
    
    let days_left = p.days_left || 0;
    let closes_at = p.closes_at || '';
    
    if (p.end_date) {
      const end = new Date(p.end_date);
      const now = new Date();
      const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));
      days_left = diff > 0 ? diff : 0;
      closes_at = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    }

    return {
      ...p,
      pour_pct,
      total_votes: total > 0 ? total : p.total_votes,
      days_left,
      closes_at,
      category: p.category || 'Général',
      img: p.img || MOCK_PROPS[Math.floor(Math.random() * MOCK_PROPS.length)].img
    };
  });
};

// ─── Propositions Page ────────────────────────────────────────────────────────
const Propositions: React.FC = () => {
  const [props, setProps]       = useState<any[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selected, setSelected]   = useState<any>(null)
  const [toast, setToast]         = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const token = localStorage.getItem('fmc_token')

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    fetch(`${API}/propositions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
          const arr = Array.isArray(data) ? data : data.propositions
          setProps(enrichPropositions(arr || []))
        })
      .catch(() => {}) // keep mock on error
  }, [])

  const handleVote = async (id: string, vote: 'pour' | 'contre') => {
    try {
      const res = await fetch(`${API}/propositions/${id}/vote`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ vote }),
      })
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Erreur lors du vote', type: 'error' });
      } else {
        setToast({ message: 'Votre vote a été enregistré avec succès !', type: 'success' });
        // Re-fetch propositions to update percentages and prevent further votes
        fetch(`${API}/propositions`, { headers: { Authorization: `Bearer ${token}` } })
           .then(r => r.json())
           .then(newData => {
             const arr = Array.isArray(newData) ? newData : newData.propositions
             setProps(enrichPropositions(arr || []));
           });
      }
    } catch {
      setToast({ message: 'Une erreur est survenue lors de la communication avec le serveur.', type: 'error' });
    }
  }

  const handleShare = async (type: 'link' | 'social', propToShare?: any) => {
    const targetProp = propToShare || selected;
    const shareData = {
      title: targetProp?.title || 'Proposition FixMaCity',
      text: targetProp?.description || 'Découvrez cette proposition pour Sousse !',
      url: window.location.href,
    };

    if (type === 'social' && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setToast({ message: 'Erreur lors du partage.', type: 'error' });
        }
      }
    } else {
      // Copy link fallback
      try {
        await navigator.clipboard.writeText(window.location.href);
        setToast({ message: 'Lien copié dans le presse-papier !', type: 'success' });
      } catch {
        setToast({ message: 'Impossible de copier le lien.', type: 'error' });
      }
    }
  }

  const filteredProps = props.filter(p => {
    // 1. Tab filter
    if (activeTab === 1) {
      if (p.days_left <= 0 || p.status === 'closed') return false;
    } else if (activeTab === 2) {
      const votedIds = JSON.parse(localStorage.getItem('fmc_voted_props') || '[]');
      if (!votedIds.includes(String(p.id))) return false;
    }

    // 2. Category filter
    if (selectedCategory !== 'all') {
      if (p.category !== selectedCategory) return false;
    }

    return true;
  });

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

        {/* Controls: Tabs & Category Filter */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center mb-8">
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {TABS.map((tab, i) => (
              <button key={tab} onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === i
                    ? 'bg-[#1557FF] text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">📁</span>
            <select 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full md:w-56 pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-full text-sm text-[#0A1628] font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-[#1557FF]/20 focus:border-[#1557FF] transition-all cursor-pointer">
              <option value="all">Toutes les catégories</option>
              {Object.keys(CATEGORY_COLORS).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px] transform rotate-90">▶</div>
          </div>
        </div>

        {/* Grid */}
        {filteredProps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl text-center px-4 shadow-sm">
            <span className="text-4xl mb-4">📭</span>
            <h3 className="text-lg font-bold text-[#0A1628] mb-1">Aucune proposition trouvée</h3>
            <p className="text-slate-400 text-sm max-w-md">Il n'y a pas de propositions correspondant à vos critères de sélection actuels.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProps.map(p => (
              <PropCard 
                key={p.id} 
                prop={p} 
                onClick={() => setSelected(p)} 
                onShare={(e, prop) => {
                  e.stopPropagation();
                  handleShare('social', prop);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <PropositionModal
          prop={selected}
          onClose={() => setSelected(null)}
          onVote={handleVote}
          onShare={handleShare}
        />
      )}
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border min-w-[320px] ${
            toast.type === 'error' 
              ? 'bg-red-50 border-red-100 text-red-800' 
              : 'bg-emerald-50 border-emerald-100 text-emerald-800'
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              toast.type === 'error' ? 'bg-red-100' : 'bg-emerald-100'
            }`}>
               {toast.type === 'error' ? <AlertCircle className="text-red-600" size={24} /> : <CheckCircle2 className="text-emerald-600" size={24} />}
            </div>
            <div className="flex-1 mr-2">
              <p className="text-sm font-bold uppercase tracking-wider mb-0.5">
                {toast.type === 'error' ? 'Attention' : 'Opération réussie'}
              </p>
              <p className="text-[13px] leading-relaxed opacity-90">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors">
              <X size={18} className="opacity-40 hover:opacity-100" />
            </button>
          </div>
        </div>
      )}
    </CitizenLayout>
  )
}

export default Propositions
