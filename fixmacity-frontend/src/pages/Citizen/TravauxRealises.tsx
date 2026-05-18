import React, { useEffect, useState } from 'react'
import { Search, ChevronDown, X, MapPin, Clock, CheckCircle, ThumbsUp, Award } from 'lucide-react'
import CitizenLayout from '../../components/citizen/CitizenLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

const CATEGORIES = ['Toutes', 'Voirie', 'Éclairage', 'Propreté', 'Espaces Verts', 'Réseaux', 'Signalisation']

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_FIXES = [
  { id:'1', title:'Réparation chaussée Rue Ibn Khaldoun', category:'Voirie',        description:'Le nid de poule signalé par plusieurs citoyens a été réparé par l\'équipe voirie en 2 jours.', address:'Rue Ibn Khaldoun, Sousse',       resolved_at: new Date(Date.now()-2*86400000).toISOString(),  rating:5, rating_comment:'Travail rapide et propre, merci !', votes_count:14, before_img:'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400&q=80', after_img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
  { id:'2', title:'Éclairage public Place Farhat Hached', category:'Éclairage',     description:'3 lampadaires défectueux remplacés par des modèles LED haute efficacité.',                      address:'Place Farhat Hached, Sousse',    resolved_at: new Date(Date.now()-4*86400000).toISOString(),  rating:4, rating_comment:'Intervention rapide, merci!',          votes_count:8,  after_img:'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=400&q=80' },
  { id:'3', title:'Nettoyage Parc de la Ligue Arabe',     category:'Propreté',      description:'Le parc a été entièrement nettoyé et de nouveaux bacs à ordures installés.',                    address:'Parc de la Ligue Arabe, Sousse',resolved_at: new Date(Date.now()-7*86400000).toISOString(),  rating:5, rating_comment:'Super initiative !',                     votes_count:22, after_img:'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400&q=80' },
  { id:'4', title:'Taille des arbres Avenue Bourguiba',   category:'Espaces Verts', description:'Les arbres obstruant la visibilité ont été taillés par l\'équipe espaces verts.',               address:'Av. Habib Bourguiba, Sousse',    resolved_at: new Date(Date.now()-10*86400000).toISOString(), rating:4, rating_comment: undefined,                                votes_count:6,  after_img:'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80' },
  { id:'5', title:'Réparation fuite eau Cité Ettaamir',   category:'Réseaux',       description:'La fuite d\'eau signalée a été colmatée et la chaussée remise en état.',                        address:'Cité Ettaamir, Sousse',          resolved_at: new Date(Date.now()-14*86400000).toISOString(), rating:3, rating_comment:'Bien mais un peu lent.',                   votes_count:11, after_img:'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&q=80' },
  { id:'6', title:'Panneau stop remplacé Rond-point Nord',category:'Signalisation',  description:'Le panneau stop endommagé a été remplacé par un neuf conforme aux normes.',                    address:'Rond-point Sousse Nord',         resolved_at: new Date(Date.now()-5*86400000).toISOString(),  rating:5, rating_comment: undefined,                                votes_count:3,  after_img:'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=80' },
]

const MOCK_PROJECTS = [
  { id:'p1', title:'Végétalisation de la Place des Martyrs', category:'Espaces Verts', description:'Transformation de la place centrale en espace vert piétonnier avec 50 arbres et points d\'eau écologiques. Projet approuvé par 73% des citoyens.', pour_pct:73, total_votes:1245, completed_at: new Date(Date.now()-30*86400000).toISOString(), duration:'3 mois', img:'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&q=80', type: 'voted' },
  { id:'p2', title:'Modernisation de l\'Éclairage Public',   category:'Éclairage',     description:'Remplacement de 3000 lampadaires par des LED à détection de mouvement. Réduction de 60% de la consommation énergétique.', pour_pct:89, total_votes:2100, completed_at: new Date(Date.now()-15*86400000).toISOString(), duration:'4 mois', img:'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&q=80', type: 'voted' },
  { id:'p3', title:'Bacs à Ordures Connectés',               category:'Propreté',      description:'Installation de 200 bacs intelligents avec capteurs IoT pour optimiser les tournées de collecte.', pour_pct:65, total_votes:756, completed_at: new Date(Date.now()-45*86400000).toISOString(), duration:'2 mois', img:'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&q=80', type: 'voted' },
  { id:'p4', title:'Réfection du marché municipal',          category:'Infrastructures', description:'Rénovation complète des toitures et mise aux normes sanitaires du marché central de Sousse. Projet initié et financé par la municipalité.', completed_at: new Date(Date.now()-60*86400000).toISOString(), duration:'6 mois', img:'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=600&q=80', type: 'municipal' },
  { id:'p5', title:'Nouvelle station d\'épuration Sousse Sud', category:'Réseaux',     description:'Création d\'une station d\'épuration de dernière génération pour soulager le réseau sud. Projet mené par la commune.', completed_at: new Date(Date.now()-120*86400000).toISOString(), duration:'12 mois', img:'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=600&q=80', type: 'municipal' },
]

function daysAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Il y a 1 jour'
  if (days < 30)  return `Il y a ${days} jours`
  return `Il y a ${Math.floor(days/30)} mois`
}

// ─── Fix Detail Modal ─────────────────────────────────────────────────────────
function FixModal({ work, onClose }: { work: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header image */}
        <div className="relative h-52 overflow-hidden rounded-t-3xl">
          <img src={work.after_img} alt={work.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background:'linear-gradient(to top, rgba(10,22,40,0.75) 0%, transparent 55%)' }} />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-5">
            <span className="inline-flex items-center gap-1.5 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full mb-2">
              <CheckCircle className="w-3 h-3" /> Résolu
            </span>
            <h2 className="text-white text-xl font-bold leading-tight">{work.title}</h2>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Meta */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-full">{work.category}</span>
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Clock className="w-4 h-4" /> {daysAgo(work.resolved_at)}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="w-4 h-4" /> {work.address}
            </span>
          </div>

          <p className="text-slate-600 leading-relaxed">{work.description}</p>

          {/* Before / After */}
          {work.before_img && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Avant / Après</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold text-red-500 mb-1.5">Avant</p>
                  <img src={work.before_img} alt="Avant" className="w-full h-36 object-cover rounded-xl" />
                </div>
                <div>
                  <p className="text-xs font-bold text-green-600 mb-1.5">Après</p>
                  <img src={work.after_img} alt="Après" className="w-full h-36 object-cover rounded-xl" />
                </div>
              </div>
            </div>
          )}

          {/* Rating + comment */}
          {work.rating ? (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Évaluation citoyenne</p>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <span key={i} className={`text-xl ${i <= work.rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                  ))}
                </div>
                <span className="text-sm font-bold text-slate-700">{work.rating}/5</span>
                <span className="text-xs text-slate-400 ml-auto">{work.votes_count} soutiens</span>
              </div>
              {work.rating_comment && (
                <div className="bg-white rounded-xl px-3 py-2.5 border border-amber-100">
                  <p className="text-sm text-slate-600 italic">"{work.rating_comment}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
              <p className="text-sm text-slate-400">Aucune évaluation pour l'instant.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Project Detail Modal ─────────────────────────────────────────────────────
function ProjectModal({ project, onClose }: { project: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="relative h-52 overflow-hidden rounded-t-3xl">
          <img src={project.img} alt={project.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background:'linear-gradient(to top, rgba(10,22,40,0.75) 0%, transparent 55%)' }} />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/40">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-5">
            <span className="inline-flex items-center gap-1.5 bg-[#1557FF] text-white text-xs font-bold px-2.5 py-1 rounded-full mb-2">
              <Award className="w-3 h-3" /> Approuvé &amp; Réalisé
            </span>
            <h2 className="text-white text-xl font-bold">{project.title}</h2>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-full">{project.category}</span>
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Clock className="w-4 h-4" /> {daysAgo(project.completed_at)}
            </span>
            <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
              Durée : {project.duration}
            </span>
          </div>

          <p className="text-slate-600 leading-relaxed">{project.description}</p>

          {/* Vote result */}
          {project.type === 'voted' && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Résultat du vote citoyen</p>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-green-600">Pour ({project.pour_pct || 0}%)</span>
                <span className="text-red-500">Contre ({100 - (project.pour_pct || 0)}%)</span>
              </div>
              <div className="h-3 rounded-full bg-red-100 overflow-hidden mb-2">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${project.pour_pct || 0}%` }} />
              </div>
              <p className="text-xs text-slate-400 text-center">{(project.total_votes || 0).toLocaleString()} citoyens ont voté</p>
            </div>
          )}
          {project.type === 'municipal' && (
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <p className="text-sm font-bold text-purple-900">Projet 100% Municipal</p>
                <p className="text-xs text-purple-700">Ce projet a été planifié, financé et réalisé directement par les services de la municipalité de Sousse.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Fix Card ─────────────────────────────────────────────────────────────────
function FixCard({ work, onClick }: { work: any; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
      <div className="relative h-44 overflow-hidden">
        <img src={work.after_img} alt={work.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute top-3 left-3 flex items-center gap-1 bg-green-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
          <CheckCircle className="w-3 h-3" /> Résolu
        </span>
        {work.rating && (
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 text-amber-500 text-[11px] font-bold px-2 py-1 rounded-full">
            ★ {work.rating}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-slate-100 text-slate-500 text-[11px] font-bold px-2 py-0.5 rounded-full">{work.category}</span>
          <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" /> {daysAgo(work.resolved_at)}
          </span>
        </div>
        <h3 className="font-bold text-[#0A1628] text-sm leading-tight mb-1">{work.title}</h3>
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {work.address}
        </p>
        {work.rating_comment && (
          <p className="text-xs text-slate-500 italic mt-2 line-clamp-1">"{work.rating_comment}"</p>
        )}
      </div>
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }: { project: any; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
      <div className="relative h-44 overflow-hidden">
        <img src={project.img} alt={project.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {project.type === 'voted' ? (
          <>
            <span className="absolute top-3 left-3 flex items-center gap-1 bg-[#1557FF] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
              <Award className="w-3 h-3" /> Approuvé ✓
            </span>
            <span className="absolute top-3 right-3 bg-white/95 text-green-600 text-[11px] font-bold px-2 py-1 rounded-full shadow-md">
              {project.pour_pct || 0}% Pour
            </span>
          </>
        ) : (
          <span className="absolute top-3 left-3 flex items-center gap-1 bg-purple-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
            <CheckCircle className="w-3 h-3" /> Fait par la municipalité
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-slate-100 text-slate-500 text-[11px] font-bold px-2 py-0.5 rounded-full">{project.category}</span>
          <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" /> {daysAgo(project.completed_at)}
          </span>
        </div>
        <h3 className="font-bold text-[#0A1628] text-sm leading-tight mb-2">{project.title}</h3>
        {project.type === 'voted' ? (
          <>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${project.pour_pct || 0}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">{(project.total_votes || 0).toLocaleString()} votes · {project.duration}</p>
          </>
        ) : (
          <p className="text-xs text-slate-400 mt-1">Projet municipal · {project.duration}</p>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TravauxRealises: React.FC = () => {
  const [tab,        setTab]        = useState<'fixes' | 'projects'>('fixes')
  const [fixes,      setFixes]      = useState<any[]>([])
  const [projects,   setProjects]   = useState<any[]>([])
  const [selectedFix, setSelectedFix]   = useState<any>(null)
  const [selectedProj, setSelectedProj] = useState<any>(null)
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('Toutes')
  const [showCat,    setShowCat]    = useState(false)
  const [projFilter, setProjFilter] = useState<'all'|'municipal'|'voted'>('all')
  const token = localStorage.getItem('fmc_token')

  useEffect(() => {
    // Load resolved declarations
    fetch(`${API}/declarations/map`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : data.declarations || []
        const resolved = arr.filter((d: any) => d.status === 'resolue' || d.status === 'cloturee')
        if (resolved.length > 0) setFixes(resolved)
      }).catch(() => {})

    // Load closed propositions
    fetch(`${API}/propositions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : data.propositions || []
        const closed = arr.filter((p: any) => p.status === 'closed' || p.is_closed)
        if (closed.length > 0) {
          const voted = closed.map((p: any) => ({ ...p, type: 'voted' }))
          setProjects(voted)
        }
      }).catch(() => {})
  }, [])

  const filteredFixes = fixes.filter(w =>
    (!search || w.title?.toLowerCase().includes(search.toLowerCase())) &&
    (catFilter === 'Toutes' || w.category === catFilter)
  )

  const filteredProjects = projects.filter(p =>
    (!search || p.title?.toLowerCase().includes(search.toLowerCase())) &&
    (projFilter === 'all' || p.type === projFilter)
  )

  const stats = tab === 'fixes'
    ? [
        { value: fixes.length,                                      label: 'Problèmes résolus', color: '#1557FF' },
        { value: fixes.filter(w => w.rating >= 4).length,           label: 'Très bien notés',   color: '#16a34a' },
        { value: fixes.reduce((s, w) => s + (w.votes_count||0), 0), label: 'Soutiens citoyens', color: '#F59E0B' },
      ]
    : [
        { value: projects.length,                                                        label: 'Projets réalisés',  color: '#1557FF' },
        { value: projects.filter(p => (p.pour_pct || 0) >= 70).length,                  label: 'Très approuvés',    color: '#16a34a' },
        { value: projects.reduce((s, p) => s + (p.total_votes||0), 0).toLocaleString(), label: 'Votes citoyens',    color: '#F59E0B' },
      ]

  return (
    <CitizenLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#0A1628]">Travaux réalisés</h1>
          <p className="text-slate-500 mt-1">Découvrez ce que la municipalité de Sousse a accompli pour vous.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('fixes')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'fixes' ? 'bg-[#1557FF] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            <CheckCircle className="w-4 h-4" /> Dernières interventions
          </button>
          <button onClick={() => setTab('projects')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'projects' ? 'bg-[#1557FF] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            <Award className="w-4 h-4" /> Projets réalisés
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
              <p className="text-2xl font-extrabold mb-1" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'fixes' ? 'Rechercher une intervention...' : 'Rechercher un projet...'}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#1557FF] transition-all" />
          </div>
          {tab === 'fixes' && (
            <div className="relative">
              <button onClick={() => setShowCat(!showCat)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-[#1557FF] transition-all">
                {catFilter} <ChevronDown className="w-4 h-4" />
              </button>
              {showCat && (
                <div className="absolute top-full mt-1 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-44 py-1">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => { setCatFilter(c); setShowCat(false) }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${catFilter === c ? 'text-[#1557FF] font-bold bg-blue-50' : 'text-slate-700 hover:bg-slate-50'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'projects' && (
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto no-scrollbar">
              <button onClick={() => setProjFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${projFilter === 'all' ? 'bg-white shadow-sm text-[#0A1628]' : 'text-slate-500 hover:text-slate-700'}`}>
                Tous les projets
              </button>
              <button onClick={() => setProjFilter('municipal')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${projFilter === 'municipal' ? 'bg-white shadow-sm text-[#0A1628]' : 'text-slate-500 hover:text-slate-700'}`}>
                🏛️ Fait par la municipalité
              </button>
              <button onClick={() => setProjFilter('voted')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${projFilter === 'voted' ? 'bg-white shadow-sm text-[#0A1628]' : 'text-slate-500 hover:text-slate-700'}`}>
                ⭐ Approuvés par vote
              </button>
            </div>
          )}
        </div>

        {/* Grid */}
        {tab === 'fixes' ? (
          filteredFixes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <p className="text-4xl mb-3">🏗️</p>
              <p className="text-slate-500 font-medium">Aucune intervention trouvée.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFixes.map(w => <FixCard key={w.id} work={w} onClick={() => setSelectedFix(w)} />)}
            </div>
          )
        ) : (
          filteredProjects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <p className="text-4xl mb-3">🏛️</p>
              <p className="text-slate-500 font-medium">Aucun projet trouvé.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map(p => <ProjectCard key={p.id} project={p} onClick={() => setSelectedProj(p)} />)}
            </div>
          )
        )}
      </div>

      {selectedFix  && <FixModal     work={selectedFix}    onClose={() => setSelectedFix(null)}  />}
      {selectedProj && <ProjectModal project={selectedProj} onClose={() => setSelectedProj(null)} />}
    </CitizenLayout>
  )
}

export default TravauxRealises
