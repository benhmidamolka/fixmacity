import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { Search, ChevronDown, X, MapPin, Clock, CheckCircle, ThumbsUp, Award } from 'lucide-react'
import CitizenLayout from '../../components/citizen/CitizenLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

const CATEGORIES = ['Toutes', 'Voirie', 'Éclairage', 'Propreté', 'Espaces Verts', 'Réseaux', 'Signalisation']

function daysAgo(dateStr: string, t: any) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  
  if (days === 0) return t('works.daysAgo.today', "Aujourd'hui")
  if (days === 1) return t('works.daysAgo.one', 'Il y a 1 jour')
  if (days < 30) return t('works.daysAgo.days', 'Il y a {{count}} jours', { count: days })
  return t('works.daysAgo.months', 'Il y a {{count}} mois', { count: Math.floor(days / 30) })
}

// ─── Fix Detail Modal ─────────────────────────────────────────────────────────
function FixModal({ work, onClose }: { work: any; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header image */}
        <div className="relative h-52 overflow-hidden rounded-t-3xl">
          <img
            src={work.after_img || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'}
            alt={work.title}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,22,40,0.75) 0%, transparent 55%)' }} />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white dark:bg-slate-800/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white dark:bg-slate-800/40 transition-all">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-5">
            <span className="inline-flex items-center gap-1.5 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full mb-2">
              <CheckCircle className="w-3 h-3" /> {t('works.status.resolved', 'Résolu')}
            </span>
            <h2 className="text-white text-xl font-bold leading-tight">{work.title}</h2>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Meta */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-full">{work.category}</span>
            <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4" /> {daysAgo(work.resolved_at, t)}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <MapPin className="w-4 h-4" /> {work.address}
            </span>
          </div>

          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{work.description}</p>

          {/* Before / After */}
          {work.before_img && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('works.modal.beforeAfter', 'Avant / Après')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold text-red-500 mb-1.5">{t('works.modal.before', 'Avant')}</p>
                  <img src={work.before_img} alt={t('works.modal.before', 'Avant')} className="w-full h-36 object-cover rounded-xl" />
                </div>
                <div>
                  <p className="text-xs font-bold text-green-600 mb-1.5">{t('works.modal.after', 'Après')}</p>
                  <img
                    src={work.after_img || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'}
                    alt={t('works.modal.after', 'Après')}
                    className="w-full h-36 object-cover rounded-xl"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Rating + comment */}
          {work.rating ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-700/30 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t('works.modal.citizenRating', 'Évaluation citoyenne')}</p>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} className={`text-xl ${i <= work.rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}>★</span>
                  ))}
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{work.rating}/5</span>
                <span className="text-xs text-slate-400 ml-auto">{work.votes_count} {t('works.modal.supporters', 'soutiens')}</span>
              </div>
              {work.rating_comment && (
                <div className="bg-white dark:bg-slate-800 rounded-xl px-3 py-2.5 border border-amber-100 dark:border-amber-700/30">
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{work.rating_comment}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-center">
              <p className="text-sm text-slate-400">{t('works.modal.noRating', "Aucune évaluation pour l'instant.")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Project Detail Modal ─────────────────────────────────────────────────────
function ProjectModal({ project, onClose }: { project: any; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="relative h-52 overflow-hidden rounded-t-3xl">
          <img src={project.img} alt={project.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,22,40,0.75) 0%, transparent 55%)' }} />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white dark:bg-slate-800/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white dark:bg-slate-800/40">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-5">
            <span className="inline-flex items-center gap-1.5 bg-[#1557FF] text-white text-xs font-bold px-2.5 py-1 rounded-full mb-2">
              <Award className="w-3 h-3" /> {t('works.modal.approvedAndDone', 'Approuvé & Réalisé')}
            </span>
            <h2 className="text-white text-xl font-bold">{project.title}</h2>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-full">{project.category}</span>
            <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4" /> {daysAgo(project.completed_at, t)}
            </span>
            <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-3 py-1.5 rounded-full">
              {t('works.modal.duration', 'Durée')} : {project.duration}
            </span>
          </div>

          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{project.description}</p>

          {/* Vote result */}
          {project.type === 'voted' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-700/30 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <p className="text-sm font-bold text-blue-900 dark:text-blue-300">{t('works.modal.approvedByCitizens', 'Approuvé par les citoyens')}</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">{t('works.modal.approvedDesc', 'Ce projet a été proposé, voté et validé par les citoyens de Sousse avant sa réalisation.')}</p>
              </div>
            </div>
          )}
          {project.type === 'municipal' && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-700/30 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <p className="text-sm font-bold text-purple-900 dark:text-purple-300">{t('works.modal.municipalTitle', 'Projet 100% Municipal')}</p>
                <p className="text-xs text-purple-700 dark:text-purple-400">{t('works.modal.municipalDesc', 'Ce projet a été planifié, financé et réalisé directement par les services de la municipalité de Sousse.')}</p>
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
  const { t } = useTranslation()
  return (
    <div onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
      <div className="relative h-44 overflow-hidden">
        <img
          src={work.after_img || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'}
          alt={work.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute top-3 left-3 flex items-center gap-1 bg-green-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
          <CheckCircle className="w-3 h-3" /> {t('works.status.resolved', 'Résolu')}
        </span>
        {work.rating && (
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-white dark:bg-slate-800/90 text-amber-500 text-[11px] font-bold px-2 py-1 rounded-full">
            ★ {work.rating}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[11px] font-bold px-2 py-0.5 rounded-full">{work.category}</span>
          <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" /> {daysAgo(work.resolved_at, t)}
          </span>
        </div>
        <h3 className="font-bold text-[#0A1628] dark:text-white text-sm leading-tight mb-1">{work.title}</h3>
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {work.address}
        </p>
        {work.rating_comment && (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-2 line-clamp-1">"{work.rating_comment}"</p>
        )}
      </div>
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }: { project: any; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <div onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
      <div className="relative h-44 overflow-hidden">
        <img src={project.img} alt={project.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {project.type === 'voted' ? (
          <>
            <span className="absolute top-3 left-3 flex items-center gap-1 bg-[#1557FF] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
              <Award className="w-3 h-3" /> {t('works.card.approved', 'Approuvé')} ✓
            </span>
          </>
        ) : (
          <span className="absolute top-3 left-3 flex items-center gap-1 bg-purple-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
            <CheckCircle className="w-3 h-3" /> {t('works.card.municipal', 'Fait par la municipalité')}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[11px] font-bold px-2 py-0.5 rounded-full">{project.category}</span>
          <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" /> {daysAgo(project.completed_at, t)}
          </span>
        </div>
        <h3 className="font-bold text-[#0A1628] dark:text-white text-sm leading-tight mb-2">{project.title}</h3>
        {project.type === 'voted' ? (
          <p className="text-xs text-slate-400 mt-1">{t('works.card.citizenProject', 'Projet citoyen')} · {project.duration}</p>
        ) : (
          <p className="text-xs text-slate-400 mt-1">{t('works.card.municipalProj', 'Projet municipal')} · {project.duration}</p>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TravauxRealises: React.FC = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const [tab, setTab] = useState<'fixes' | 'projects'>(() => {
    if (location.state && (location.state as any).tab === 'projects') {
      return 'projects'
    }
    return 'fixes'
  })

  useEffect(() => {
    if (location.state && (location.state as any).tab === 'projects') {
      setTab('projects')
    }
  }, [location.state])
  const [fixes, setFixes] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [selectedFix, setSelectedFix] = useState<any>(null)
  const [selectedProj, setSelectedProj] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState(t('works.categories.all', 'Toutes'))
  const [showCat, setShowCat] = useState(false)
  const [projFilter, setProjFilter] = useState<'all' | 'municipal' | 'voted'>('all')
  const token = localStorage.getItem('fmc_token')


  useEffect(() => {
    // Load resolved declarations
    fetch(`${API}/public/interventions`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : data.interventions || []
        if (arr.length > 0) {
          const mapped = arr.map((d: any) => ({
            ...d,
            rating: d.rating?.score || null,
            rating_comment: d.rating?.comment || null
          }))
          setFixes(mapped)
        }
      }).catch(() => {})

    // Load closed propositions
    fetch(`${API}/propositions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : data.propositions || []
        const closed = arr.filter((p: any) => 
          p.status === 'Retenu' || p.status === 'Confirmer' || p.status === 'closed' || p.type === 'municipal'
        )
        if (closed.length > 0) {
          const voted = closed.map((p: any) => {
            const pour = p.pour || p.votes_pour || 0
            const contre = p.contre || p.votes_contre || 0
            const total = p.total || (pour + contre) || 0
            const pour_pct = total > 0 ? Math.round((pour / total) * 100) : 0
            const img = p.image_url ? (p.image_url.startsWith('http') ? p.image_url : `${API.replace('/api', '')}${p.image_url}`) : 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&q=80'
            const duration = p.end_date && p.start_date
              ? `${Math.max(1, Math.round((new Date(p.end_date).getTime() - new Date(p.start_date).getTime()) / (30 * 24 * 3600000)))} mois`
              : 'N/A'
            let pType = 'voted'
            if (p.status === 'Confirmer' || p.type === 'municipal') pType = 'municipal'

            return {
              ...p,
              type: pType,
              pour_pct,
              total_votes: total,
              img,
              duration,
              completed_at: p.end_date || p.created_at
            }
          })
          setProjects(voted)
        }
      }).catch(() => { })
  }, [])

  const filteredFixes = fixes.filter(w =>
    (!search || w.title?.toLowerCase().includes(search.toLowerCase())) &&
    (catFilter === t('works.categories.all', 'Toutes') || w.category === catFilter)
  )

  const filteredProjects = projects.filter(p =>
    (!search || p.title?.toLowerCase().includes(search.toLowerCase())) &&
    (projFilter === 'all' || p.type === projFilter)
  )

  const stats = tab === 'fixes'
    ? [
      { value: fixes.length, label: t('works.stats.fixes_total', 'Problèmes résolus'), color: '#1557FF' },
      { value: fixes.filter(w => w.rating >= 4).length, label: t('works.stats.fixes_high_rated', 'Très bien notés'), color: '#16a34a' },
      { value: fixes.reduce((s, w) => s + (w.votes_count || 0), 0), label: t('works.stats.fixes_supporters', 'Soutiens citoyens'), color: '#F59E0B' },
    ]
    : [
      { value: projects.length, label: t('works.stats.projects_total', 'Projets réalisés'), color: '#1557FF' },
      { value: projects.filter(p => p.type === 'voted').length, label: t('works.stats.projects_citizens', 'Projets citoyens'), color: '#16a34a' },
      { value: projects.filter(p => p.type === 'municipal').length, label: t('works.stats.projects_municipal', 'Projets municipaux'), color: '#F59E0B' },
    ]

  return (
    <CitizenLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#0A1628] dark:text-white">{t('works.pageTitle', 'Travaux réalisés')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('works.pageSubtitle', 'Découvrez ce que la municipalité de Sousse a accompli pour vous.')}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('fixes')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'fixes' ? 'bg-[#1557FF] text-white shadow-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}>
            <CheckCircle className="w-4 h-4" /> {t('works.tabs.fixes', 'Dernières interventions')}
          </button>
          <button onClick={() => setTab('projects')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'projects' ? 'bg-[#1557FF] text-white shadow-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}>
            <Award className="w-4 h-4" /> {t('works.tabs.projects', 'Projets réalisés')}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 text-center">
              <p className="text-2xl font-extrabold mb-1" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'fixes' ? t('works.search.fixes', 'Rechercher une intervention...') : t('works.search.projects', 'Rechercher un projet...')}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-xl text-sm outline-none focus:border-[#1557FF] transition-all" />
          </div>
          {tab === 'fixes' && (
            <div className="relative">
              <button onClick={() => setShowCat(!showCat)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:border-[#1557FF] transition-all">
                {catFilter} <ChevronDown className="w-4 h-4" />
              </button>
              {showCat && (
                <div className="absolute top-full mt-1 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 min-w-44 py-1">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => { setCatFilter(c); setShowCat(false) }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${catFilter === c ? 'text-[#1557FF] font-bold bg-blue-50 dark:bg-blue-950/30' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'projects' && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 overflow-x-auto no-scrollbar">
              <button onClick={() => setProjFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${projFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-[#0A1628] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                {t('works.filters.all', 'Tous les projets')}
              </button>
              <button onClick={() => setProjFilter('municipal')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${projFilter === 'municipal' ? 'bg-white dark:bg-slate-700 shadow-sm text-[#0A1628] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                🏛️ {t('works.filters.municipal', 'Fait par la municipalité')}
              </button>
              <button onClick={() => setProjFilter('voted')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${projFilter === 'voted' ? 'bg-white dark:bg-slate-700 shadow-sm text-[#0A1628] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                ⭐ {t('works.filters.voted', 'Approuvés par vote')}
              </button>
            </div>
          )}
        </div>

        {/* Grid */}
        {tab === 'fixes' ? (
          filteredFixes.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
              <p className="text-4xl mb-3">🏗️</p>
              <p className="text-slate-500 dark:text-slate-400 font-medium">{t('works.none.fixes', 'Aucune intervention trouvée.')}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFixes.map(w => <FixCard key={w.id} work={w} onClick={() => setSelectedFix(w)} />)}
            </div>
          )
        ) : (
          filteredProjects.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
              <p className="text-4xl mb-3">🏛️</p>
              <p className="text-slate-500 dark:text-slate-400 font-medium">{t('works.none.projects', 'Aucun projet trouvé.')}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map(p => <ProjectCard key={p.id} project={p} onClick={() => setSelectedProj(p)} />)}
            </div>
          )
        )}
      </div>

      {selectedFix && <FixModal work={selectedFix} onClose={() => setSelectedFix(null)} />}
      {selectedProj && <ProjectModal project={selectedProj} onClose={() => setSelectedProj(null)} />}
    </CitizenLayout>
  )
}

export default TravauxRealises

