import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ThumbsUp, ThumbsDown, MapPin, Map } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import CitizenLayout from '../../components/citizen/CitizenLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

// ── Real Sousse images ────────────────────────────────────────────────────────
const SOUSSE_PROP_IMAGES = [
  'https://waste.solutions/wp-content/uploads/2022/08/Ultrasonic-Sensor-1.png',
  'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1c/3a/1b/ac/ballade-a-hergla-au-lever.jpg?w=1400&h=-1&s=1',
  
]

const SOUSSE_PROJECT_IMAGES = [
  'http://www.commune-sousse.gov.tn/sites/default/files/16777126_10206506030849776_1318912901_o_1.jpg',
 
]

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { key: string; textClass: string; bgClass: string; dotClass: string }> = {
  'SOUMISE':  { key: 'dashboard.statuses.soumise',  textClass: 'text-amber-600 dark:text-amber-400',  bgClass: 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200/10',  dotClass: 'bg-amber-500' },
  'EN COURS': { key: 'dashboard.statuses.enCours',   textClass: 'text-blue-600 dark:text-blue-400',   bgClass: 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200/10',   dotClass: 'bg-[#1557FF]' },
  'ÉVALUÉ':   { key: 'dashboard.statuses.evalue',    textClass: 'text-green-600 dark:text-green-400',  bgClass: 'bg-green-50 dark:bg-green-950/30 border border-green-200/10',  dotClass: 'bg-green-500' },
  'CLÔTURÉ':  { key: 'dashboard.statuses.cloture',   textClass: 'text-slate-600 dark:text-slate-400',  bgClass: 'bg-slate-50 dark:bg-slate-950/30 border border-slate-200/10',  dotClass: 'bg-slate-500' },
}

const TIMELINE_STEPS_FALLBACK = ['Soumise', 'En cours', 'Évalué', 'Clôturé']

const DATE_LOCALE_MAP: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-TN' }

function getStepIndex(status: string) {
  if (status === 'SOUMISE') return 1
  if (status === 'EN COURS') return 2
  if (status === 'ÉVALUÉ') return 3
  if (status === 'CLÔTURÉ') return 4
  return 0
}

function StatusTimeline({ status, history }: { status: string; history: any[] }) {
  const { t, i18n } = useTranslation()
  const activeStep = getStepIndex(status)
  const steps = (t('dashboard.statusSteps', { returnObjects: true }) as string[]) || TIMELINE_STEPS_FALLBACK
  const dateLoc = DATE_LOCALE_MAP[i18n.language] || 'fr-FR'

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const done    = i < activeStep
        const current = i === activeStep - 1
        const h       = history?.[i]
        return (
          <div key={step} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                done || current
                  ? 'bg-[#1557FF] border-[#1557FF]'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}>
                {(done || current) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-0.5 h-6 mt-1 transition-colors ${done ? 'bg-[#1557FF]' : 'bg-slate-200 dark:bg-slate-800'}`} />
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold transition-colors ${
                done || current
                  ? 'text-[#0A1628] dark:text-white'
                  : 'text-slate-400 dark:text-slate-600'
              }`}>
                {step}
              </p>
              {h && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {new Date(h.changed_at).toLocaleDateString(dateLoc, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Declaration card (main / compact) ─────────────────────────────────────────
function DeclarationCard({ decl, compact = false, onMapClick }: { decl: any; compact?: boolean; onMapClick?: (decl: any) => void }) {
  const { t, i18n } = useTranslation()
  const style = STATUS_STYLE[decl.citizen_status] || STATUS_STYLE['SOUMISE']
  const isEvalue = decl.citizen_status === 'ÉVALUÉ' || decl.citizen_status === 'ÉVALUE'
  const isClosed = isEvalue || decl.citizen_status === 'CLÔTURÉ'

  if (compact) {
    return (
      <div
        className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-4 hover:shadow-lg dark:hover:bg-slate-900/60 transition-all duration-300 cursor-pointer"
        onClick={() => onMapClick?.(decl)}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
            {decl.photo_url
              ? <img src={decl.photo_url} alt="" className="w-full h-full object-cover rounded-xl" />
              : <span className="text-xl">🔧</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-100/10">
                ✓ {t('dashboard.resolved', 'Résolu')}
              </span>
              {isEvalue && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
                  ★ {t('dashboard.statuses.evalue', 'Évalué')}
                </span>
              )}
            </div>
            <p className="font-bold text-[#0A1628] dark:text-white text-sm truncate">{decl.title}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              {decl.created_at
                ? t('dashboard.daysAgo', { count: Math.floor((Date.now() - new Date(decl.created_at).getTime()) / 86400000) })
                : '—'}
            </p>
          </div>
          <Map className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-6 hover:shadow-xl dark:hover:bg-slate-900/60 transition-all duration-300">
      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="flex-1">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full mb-4 shadow-sm ${style.bgClass} ${style.textClass}`}>
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${style.dotClass}`} />
            {t(style.key)}
          </span>
          <h3 className="font-bold text-[#0A1628] dark:text-white text-xl leading-tight mb-2">{decl.title}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2">{decl.description}</p>
          <div className="flex items-center gap-2 mt-4 text-slate-400 dark:text-slate-500 text-xs font-medium">
            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <span>📍</span>
            </div>
            <span>{decl.address || 'Sousse, Tunisie'}</span>
          </div>
        </div>
        <div className="w-full md:w-56 flex-shrink-0 pt-4 md:pt-0 md:pl-6 md:border-l border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-4">{t('dashboard.progressionLabel', 'Progression')}</p>
          <StatusTimeline status={decl.citizen_status} history={decl.history || []} />
        </div>
      </div>
    </div>
  )
}

// ── Proposition preview (2-up, photo style, Pour/Contre, no vote count) ───────
function PropositionPreview({ prop, onVote }: { prop: any; onVote: (id: string, vote: 'pour' | 'contre') => void }) {
  const { t } = useTranslation()
  const [voted, setVoted] = useState<'pour' | 'contre' | null>(null)

  const handleVote = (v: 'pour' | 'contre') => {
    setVoted(v)
    onVote(prop.id, v)
  }

  const imgSrc = prop.image_url
    ? (prop.image_url.startsWith('http') ? prop.image_url : `${API.replace('/api', '')}${prop.image_url}`)
    : SOUSSE_PROP_IMAGES[parseInt(prop.id) % SOUSSE_PROP_IMAGES.length] || SOUSSE_PROP_IMAGES[0]

  return (
    <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 overflow-hidden hover:shadow-xl dark:hover:bg-slate-900/60 transition-all duration-300 flex flex-col">
      {/* Image header */}
      <div className="h-44 relative flex items-end p-5 group overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
          style={{ backgroundImage: `url(${imgSrc})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        <span className="absolute top-4 left-4 bg-white/10 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-white/10">
          {t('dashboard.municipalBadge', '🏛️ Projet Municipal')}
        </span>
        <h3 className="text-white font-bold text-lg leading-tight relative z-10 line-clamp-2">{prop.title}</h3>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2">{prop.description}</p>

        {/* Vote buttons */}
        {voted ? (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-xl p-3 text-center">
            <p className="text-green-700 dark:text-green-400 font-bold text-sm">✓ {t('dashboard.voteRecorded', 'Vote enregistré')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <button
              onClick={() => handleVote('pour')}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-95 shadow-sm"
              style={{ background: '#16a34a' }}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> {t('dashboard.pour', 'Pour')}
            </button>
            <button
              onClick={() => handleVote('contre')}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm transition-all border hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95"
              style={{ borderColor: '#fca5a5', color: '#e11d48', background: '#fff1f2' }}
            >
              <ThumbsDown className="w-3.5 h-3.5" /> {t('dashboard.contre', 'Contre')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Completed Project card (1 card, real Sousse photo) ─────────────────────────
function CompletedProjectCard({ project }: { project: any }) {
  const { t } = useTranslation()
  const imgSrc = project.img || SOUSSE_PROJECT_IMAGES[0]
  return (
    <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col sm:flex-row">
      <div className="sm:w-48 h-36 sm:h-auto relative flex-shrink-0 overflow-hidden group">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:scale-105 transition-transform duration-500"
          style={{ backgroundImage: `url(${imgSrc})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-950/40" />
        <span className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
          ✓ {t('dashboard.completed', 'Réalisé')}
        </span>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-[#0A1628] dark:text-white text-base mb-1">{project.title}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">{project.description}</p>
        </div>
        <Link
          to="/travaux-realises"
          state={{ tab: 'projects' }}
          className="mt-4 self-start flex items-center gap-1 text-[#1557FF] text-sm font-bold hover:gap-2 transition-all"
        >
          {t('dashboard.viewDetails', 'Voir les détails')} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [declarations, setDeclarations] = useState<any[]>([])
  const [propositions, setPropositions] = useState<any[]>([])
  const [completedProjects, setCompletedProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const token = localStorage.getItem('fmc_token')
  const user  = JSON.parse(localStorage.getItem('fmc_user') || '{}')

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch(`${API}/declarations/mine`, { headers }).then(r => r.json()),
      fetch(`${API}/propositions`,      { headers }).then(r => r.json()),
    ]).then(([decls, props]) => {
      setDeclarations(Array.isArray(decls) ? decls : decls.declarations || [])
      const allProps = Array.isArray(props) ? props : props.propositions || []
      const active = allProps.filter((p: any) => p.status !== 'closed' && !p.is_closed)
      setPropositions(active)

      const closed = allProps.filter((p: any) => p.status === 'closed' || p.is_closed)
      if (closed.length > 0) {
        setCompletedProjects(closed.map((p: any, idx: number) => {
          const img = p.image_url
            ? (p.image_url.startsWith('http') ? p.image_url : `${API.replace('/api', '')}${p.image_url}`)
            : SOUSSE_PROJECT_IMAGES[idx % SOUSSE_PROJECT_IMAGES.length]
          return { ...p, img }
        }))
      } else {
        setCompletedProjects([
          { id: 'p1', title: 'Végétalisation de la Place des Martyrs', description: 'Transformation de l\'espace bétonnée en parc urbain avec des zones de repos, une fontaine centrale et des variétés d\'arbres endémiques.', img: SOUSSE_PROJECT_IMAGES[0] },
          { id: 'p2', title: 'Modernisation de l\'Éclairage Public',   description: 'Remplacement de 3000 lampadaires par des LED à détection de mouvement. Réduction de 60% de la consommation énergétique.', img: SOUSSE_PROJECT_IMAGES[1] },
        ])
      }
    }).finally(() => setLoading(false))
  }, [])

  const handleVote = async (id: string, vote: 'pour' | 'contre') => {
    try {
      await fetch(`${API}/propositions/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vote }),
      })
    } catch { /* silent */ }
  }

  const handleResolvedClick = (decl: any) => {
    navigate('/carte', { state: { focusDeclarationId: decl.id, lat: decl.latitude, lng: decl.longitude } })
  }

  const latest   = declarations[0]
  const resolved = declarations.filter(d =>
    d.citizen_status === 'RESOLUE' || d.citizen_status === 'CLOTUREE' ||
    d.citizen_status === 'ÉVALUÉ'  || d.citizen_status === 'ÉVALUE'
  ).slice(0, 3)

  // Show up to 2 propositions
  const twoProps = propositions.slice(0, 2)

  return (
    <CitizenLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-[#0A1628] dark:text-white tracking-tight">
            {t('dashboard.greeting', { name: user.first_name })}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* ── Mon dernier signalement ── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-[#0A1628] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
              {t('dashboard.lastReport')}
            </h2>
            <Link to="/mes-signalements" className="flex items-center gap-1 text-[#1557FF] text-sm font-bold hover:gap-2 transition-all">
              {t('dashboard.history')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-6 animate-pulse h-40" />
          ) : latest ? (
            <DeclarationCard decl={latest} />
          ) : (
            <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-8 text-center">
              <p className="text-slate-400 dark:text-slate-500 text-sm mb-3">{t('dashboard.noReport')}</p>
              <Link to="/nouveau-signalement"
                className="inline-flex items-center gap-2 bg-[#1557FF] text-white font-bold px-5 py-2.5 rounded-xl text-sm">
                {t('dashboard.firstReport')}
              </Link>
            </div>
          )}
        </section>

        {/* ── Dernières propositions (2) ── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-[#0A1628] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-6 bg-purple-600 rounded-full" />
              {t('dashboard.latestPropos')}
            </h2>
            <Link to="/propositions" className="flex items-center gap-1 text-[#1557FF] text-sm font-bold hover:gap-2 transition-all">
              {t('dashboard.seeAll')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-6 animate-pulse h-64" />
          ) : twoProps.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-5">
              {twoProps.map(p => (
                <PropositionPreview key={p.id} prop={p} onVote={handleVote} />
              ))}
            </div>
          ) : (
            /* Fallback with 2 mock Sousse propositions */
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                { id: 'm1', title: 'Végétalisation de la Place des Martyrs', description: 'Transformation de l\'espace bétonnée en parc urbain avec fontaine centrale et arbres endémiques.', image_url: SOUSSE_PROP_IMAGES[0] },
                { id: 'm2', title: 'Installation de panneaux solaires municipaux', description: 'Équiper les toitures des bâtiments publics de panneaux solaires pour réduire l\'empreinte carbone.', image_url: SOUSSE_PROP_IMAGES[1] },
              ].map(p => (
                <PropositionPreview key={p.id} prop={p} onVote={() => {}} />
              ))}
            </div>
          )}
        </section>

        {/* ── Projets réalisés (1 card) ── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-[#0A1628] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
              {t('dashboard.completedProjects', 'Projets réalisés')}
            </h2>
            <Link to="/travaux-realises" state={{ tab: 'projects' }} className="flex items-center gap-1 text-[#1557FF] text-sm font-bold hover:gap-2 transition-all">
              {t('dashboard.seeAll')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-6 animate-pulse h-40" />
          ) : completedProjects.length > 0 ? (
            <CompletedProjectCard project={completedProjects[0]} />
          ) : (
            <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-8 flex flex-col items-center gap-3 text-center">
              <span className="text-4xl">🏗️</span>
              <p className="font-bold text-slate-600 dark:text-slate-300">{t('dashboard.noCompletedProjects', 'Aucun projet réalisé pour le moment.')}</p>
            </div>
          )}
        </section>

      </div>
    </CitizenLayout>
  )
}

export default Dashboard