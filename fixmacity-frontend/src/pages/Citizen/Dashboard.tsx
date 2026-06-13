import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, ArrowRight, Map } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import CitizenLayout from '../../components/citizen/CitizenLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

const SOUSSE_PROP_IMAGES = [
  'https://waste.solutions/wp-content/uploads/2022/08/Ultrasonic-Sensor-1.png',
  'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1c/3a/1b/ac/ballade-a-hergla-au-lever.jpg?w=1400&h=-1&s=1',
]

const SOUSSE_PROJECT_IMAGES = [
  'http://www.commune-sousse.gov.tn/sites/default/files/16777126_10206506030849776_1318912901_o_1.jpg',
]

// ── Status config ───────────────────────────────────────────────────────────────
const STATUS_STEPS = ['SOUMISE', 'EN COURS', 'RESOLUE', 'CLOTUREE']
const STATUS_LABELS: Record<string, string> = {
  SOUMISE: 'Soumise', 'EN COURS': 'En cours', RESOLUE: 'Résolue', CLOTUREE: 'Clôturée',
}

function getStepIndex(status: string) {
  const idx = STATUS_STEPS.indexOf(status)
  return idx === -1 ? 0 : idx
}

// ── Horizontal Progress Timeline ────────────────────────────────────────────────
function HorizontalTimeline({ status, isDark }: { status: string; isDark: boolean }) {
  const activeIdx = getStepIndex(status)
  return (
    <div className="flex items-center gap-0 w-full mt-4 mb-3">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= activeIdx
        const current = i === activeIdx
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                done
                  ? current
                    ? 'bg-[#1557FF] border-[#1557FF] shadow-[0_0_8px_rgba(21,87,255,0.8)]'
                    : 'bg-[#1557FF] border-[#1557FF]'
                  : `bg-transparent ${isDark ? 'border-white/20' : 'border-slate-300'}`
              }`} />
              <span className={`text-[9px] font-semibold mt-1 whitespace-nowrap transition-colors ${
                done ? isDark ? 'text-white' : 'text-slate-800' : isDark ? 'text-white/30' : 'text-slate-400'
              } ${current ? 'text-[#1557FF]' : ''}`}>
                {STATUS_LABELS[step]}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`h-[2px] flex-1 mx-1 rounded-full transition-all duration-500 ${
                i < activeIdx ? 'bg-[#1557FF]' : isDark ? 'bg-white/10' : 'bg-slate-200'
              }`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Active Signal Card ──────────────────────────────────────────────────────────
function ActiveSignalCard({ decl, isDark }: { decl: any; isDark: boolean }) {
  const { t } = useTranslation()
  const style = decl.citizen_status === 'EN COURS'
    ? { dot: 'bg-[#1557FF] animate-pulse', badge: 'text-[#1557FF]', label: '● Signalement Actif' }
    : decl.citizen_status === 'RESOLUE' || decl.citizen_status === 'CLOTUREE'
    ? { dot: 'bg-emerald-400', badge: 'text-emerald-500', label: '✓ Résolu' }
    : { dot: 'bg-amber-400 animate-pulse', badge: 'text-amber-500', label: '● En attente' }

  const dateStr = decl.created_at
    ? new Date(decl.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'

  return (
    <div
      className="rounded-2xl p-5 flex flex-col transition-all duration-300"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, rgba(13,27,64,0.95) 0%, rgba(10,22,40,0.98) 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: isDark ? '1px solid rgba(91,140,255,0.2)' : '1px solid rgba(21,87,255,0.12)',
        boxShadow: isDark
          ? '0 8px 32px rgba(21,87,255,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 8px 32px rgba(21,87,255,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-bold flex items-center gap-1.5 ${style.badge}`}>
          <span className={`w-2 h-2 rounded-full ${style.dot}`} />
          {style.label}
        </span>
        <button className={`transition-colors text-lg leading-none ${isDark ? 'text-white/30 hover:text-white/60' : 'text-slate-400 hover:text-slate-600'}`}>···</button>
      </div>

      {/* Title */}
      <h3 className={`font-bold text-sm leading-snug mb-1 ${isDark ? 'text-white' : 'text-[#0a1628]'}`}>{decl.title}</h3>
      <p className={`text-[10px] font-medium mb-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
        Rapports n° : {dateStr}
      </p>

      {/* Horizontal Timeline */}
      <HorizontalTimeline status={decl.citizen_status} isDark={isDark} />

      {/* Status label */}
      <div className="mt-2 space-y-1">
        <p className={`text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Status</p>
        <p className={`text-xs ${isDark ? 'text-white/70' : 'text-slate-600'}`}>{decl.description?.slice(0, 60) || decl.title}</p>
        <div className="mt-1">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
            decl.citizen_status === 'EN COURS'
              ? 'bg-[#1557FF]/10 text-[#1557FF] border border-[#1557FF]/20'
              : decl.citizen_status === 'CLOTUREE' || decl.citizen_status === 'RESOLUE'
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
          }`}>
            ● {STATUS_LABELS[decl.citizen_status] || decl.citizen_status}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Proposition Carousel Card ───────────────────────────────────────────────────
function PropositionCard({ prop, onVote, isDark }: { prop: any; onVote: (id: string, vote: 'pour' | 'contre') => void; isDark: boolean }) {
  const { t } = useTranslation()
  const [voted, setVoted] = useState<'pour' | 'contre' | null>(prop.user_vote || null)
  const [voting, setVoting] = useState(false)

  const storedUser = localStorage.getItem('fmc_user')
  const currentUser = storedUser ? JSON.parse(storedUser) : null
  const isOwn = currentUser?.id && prop.created_by && String(currentUser.id) === String(prop.created_by)

  const handleVote = async (v: 'pour' | 'contre') => {
    if (voted || voting || isOwn) return
    setVoting(true)
    await onVote(prop.id, v)
    setVoted(v)
    setVoting(false)
  }

  const imgSrc = prop.image_url
    ? (prop.image_url.startsWith('http') ? prop.image_url : `${API.replace('/api', '')}${prop.image_url}`)
    : SOUSSE_PROP_IMAGES[parseInt(prop.id) % SOUSSE_PROP_IMAGES.length] || SOUSSE_PROP_IMAGES[0]

  return (
    <div
      className="flex-shrink-0 w-[220px] rounded-2xl overflow-hidden flex flex-col transition-all duration-300"
      style={{
        background: isDark ? 'rgba(10,20,50,0.7)' : '#ffffff',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.02)',
        backdropFilter: isDark ? 'blur(16px)' : 'none',
      }}
    >
      {/* Image */}
      <div className="relative h-32 overflow-hidden">
        <img src={imgSrc} alt={prop.title} className="w-full h-full object-cover" />
        <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-[#0a1428]/80' : 'from-white/80'} to-transparent`} />
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <h4 className={`font-bold text-xs leading-snug line-clamp-2 ${isDark ? 'text-white' : 'text-[#0a1628]'}`}>{prop.title}</h4>

        {isOwn ? (
          <div className={`text-[10px] font-semibold rounded-lg px-2 py-1 text-center ${isDark ? 'text-blue-400 bg-blue-500/10' : 'text-blue-600 bg-blue-50'}`}>
            Votre proposition
          </div>
        ) : voted ? (
          <div className={`text-[10px] font-bold rounded-lg px-2 py-1.5 text-center ${isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-50'}`}>
            ✓ Vote enregistré — {voted === 'pour' ? 'Pour' : 'Contre'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 mt-auto">
            <button
              onClick={() => handleVote('pour')}
              disabled={voting}
              className="flex items-center justify-center gap-1 py-1.5 rounded-xl text-white font-bold text-[11px] transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#1557FF,#0d42cc)' }}
            >
              <ThumbsUp className="w-3 h-3" /> Pour
            </button>
            <button
              onClick={() => handleVote('contre')}
              disabled={voting}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-xl font-bold text-[11px] transition-all active:scale-95 disabled:opacity-60 ${
                isDark
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-rose-50 text-rose-600 border border-rose-100'
              }`}
            >
              <ThumbsDown className="w-3 h-3" /> Contre
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Community Impact Card ───────────────────────────────────────────────────────
function ImpactCard({ project, isDark }: { project: any; isDark: boolean }) {
  const imgSrc = project.img || SOUSSE_PROJECT_IMAGES[0]
  return (
    <div
      className="flex-shrink-0 w-[240px] rounded-2xl overflow-hidden flex flex-col transition-all duration-300"
      style={{
        background: isDark ? 'rgba(10,20,50,0.7)' : '#ffffff',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.02)',
        backdropFilter: isDark ? 'blur(16px)' : 'none',
      }}
    >
      {/* Before/After images stacked */}
      <div className="relative h-28 overflow-hidden group">
        <img src={imgSrc} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-[#0a1428]/60' : 'from-white/60'} to-transparent`} />
        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all">
          <ArrowRight className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <h4 className={`font-bold text-xs leading-snug line-clamp-2 mb-2 ${isDark ? 'text-white' : 'text-[#0a1628]'}`}>{project.title}</h4>
        <p className={`text-[10px] italic line-clamp-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
          "Merci pour ce travail !"
        </p>
        <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>- Citoyen</p>
      </div>
    </div>
  )
}

// ── Stat Pill ────────────────────────────────────────────────────────────────────
function StatPill({ label, value, isDark }: { label: string; value: number; isDark: boolean }) {
  return (
    <div
      className="flex-1 flex items-center justify-center gap-3 py-3 px-4"
      style={{ borderRight: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}
    >
      <span className={`text-xs font-medium whitespace-nowrap ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{label}</span>
      <span className={`font-black text-lg ${isDark ? 'text-white' : 'text-[#0a1628]'}`}>{value}</span>
    </div>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [declarations, setDeclarations] = useState<any[]>([])
  const [propositions, setPropositions] = useState<any[]>([])
  const [completedProjects, setCompletedProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [isDark, setIsDark] = useState(() => localStorage.getItem('fmc_theme') === 'dark')

  useEffect(() => {
    const handleThemeChange = () => {
      setIsDark(localStorage.getItem('fmc_theme') === 'dark')
    }
    window.addEventListener('fmc_theme_change', handleThemeChange)
    return () => window.removeEventListener('fmc_theme_change', handleThemeChange)
  }, [])

  const propsScrollRef = useRef<HTMLDivElement>(null)
  const impactScrollRef = useRef<HTMLDivElement>(null)

  const token = localStorage.getItem('fmc_token')
  const user = JSON.parse(localStorage.getItem('fmc_user') || '{}')

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch(`${API}/declarations/mine`, { headers }).then(r => r.json()),
      fetch(`${API}/propositions`, { headers }).then(r => r.json()),
    ]).then(([decls, props]) => {
      const allDecls = Array.isArray(decls) ? decls : decls.declarations || []
      setDeclarations(allDecls)

      const allProps = Array.isArray(props) ? props : props.propositions || []
      const active = allProps.filter((p: any) => p.status !== 'closed' && !p.is_closed)
      setPropositions(active)

      const closedProps = allProps.filter((p: any) => p.status === 'closed' || p.is_closed)
      const resolvedDecls = allDecls.filter((d: any) =>
        ['RESOLUE', 'CLOTUREE'].includes(d.citizen_status)
      )

      if (closedProps.length > 0) {
        setCompletedProjects(closedProps.map((p: any, idx: number) => {
          const img = p.image_url
            ? (p.image_url.startsWith('http') ? p.image_url : `${API.replace('/api', '')}${p.image_url}`)
            : SOUSSE_PROJECT_IMAGES[idx % SOUSSE_PROJECT_IMAGES.length]
          return { ...p, img, type: 'voted' }
        }))
      } else if (resolvedDecls.length > 0) {
        setCompletedProjects(resolvedDecls.slice(0, 4).map((d: any, idx: number) => ({
          ...d,
          img: d.photo_url
            ? (d.photo_url.startsWith('http') ? d.photo_url : `${API.replace('/api', '')}${d.photo_url}`)
            : SOUSSE_PROJECT_IMAGES[idx % SOUSSE_PROJECT_IMAGES.length],
          type: 'declaration',
          description: d.description || 'Résolu avec succès.',
        })))
      } else {
        setCompletedProjects([
          { id: 'p1', title: 'Végétalisation de la Place des Martyrs', img: SOUSSE_PROJECT_IMAGES[0], type: 'municipal' },
          { id: 'p2', title: 'Extension des Pistes Cyclables Phase 2', img: SOUSSE_PROP_IMAGES[1], type: 'municipal' },
        ])
      }
    }).finally(() => setLoading(false))
  }, [])

  const handleVote = async (id: string, vote: 'pour' | 'contre') => {
    try {
      const res = await fetch(`${API}/propositions/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vote }),
      })
      if (res.ok) {
        setPropositions(prev => prev.map(p => p.id === id ? { ...p, user_vote: vote } : p))
      }
    } catch { /* silent */ }
  }

  const latest = declarations[0]
  const resolved = declarations.filter(d =>
    ['RESOLUE', 'CLOTUREE'].includes(d.citizen_status)
  )

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    if (ref.current) ref.current.scrollBy({ left: dir === 'left' ? -250 : 250, behavior: 'smooth' })
  }

  // Stats
  const statDeposed = declarations.length
  const statEvalue = declarations.filter(d => d.citizen_status === 'RESOLUE').length
  const statCloture = declarations.filter(d => d.citizen_status === 'CLOTUREE').length

  // Propositions to show (up to 6 in carousel)
  const carouselProps = propositions.length > 0 ? propositions.slice(0, 6) : [
    { id: 'm1', title: 'Smart Waste Sensors — Bacs Connectés', image_url: SOUSSE_PROP_IMAGES[0] },
    { id: 'm2', title: 'Extension des Pistes Cyclables Phase 2', image_url: SOUSSE_PROP_IMAGES[1] },
  ]


  return (
    <CitizenLayout>
      <div
        className="min-h-screen pt-6 pb-12 px-4 sm:px-6 transition-colors duration-500"
        style={{
          background: isDark
            ? 'linear-gradient(160deg, #06102a 0%, #0a1628 50%, #081220 100%)'
            : 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%)'
        }}
      >
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ── Greeting ── */}
          <div className="mb-2">
            <h1 className={`font-black text-2xl tracking-tight transition-colors duration-300 ${isDark ? 'text-white' : 'text-[#0a1628]'}`}>
              Bonjour, {user.first_name || 'Citoyen'} 👋
            </h1>
            <p className={`text-sm mt-1 transition-colors duration-300 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Tableau de bord citoyen · FixMaCity</p>
          </div>

          {/* ── Stats Bar ── */}
          <div
            className="rounded-2xl overflow-hidden flex transition-all duration-300"
            style={{
              background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
              border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)',
              backdropFilter: 'blur(20px)',
              boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.02)',
            }}
          >
            <StatPill label="Rapports déposés" value={statDeposed} isDark={isDark} />
            <StatPill label="Signalements à évaluer" value={statEvalue} isDark={isDark} />
            <div className="flex-1 flex items-center justify-center gap-3 py-3 px-4">
              <span className={`text-xs font-medium whitespace-nowrap ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Signalements clôturés</span>
              <span className={`font-black text-lg ${isDark ? 'text-white' : 'text-[#0a1628]'}`}>{statCloture}</span>
            </div>
          </div>

          {/* ── Main 2-col grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Left: Active Signal */}
            <div>
              {loading ? (
                <div className="rounded-2xl h-52 animate-pulse" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} />
              ) : latest ? (
                <ActiveSignalCard decl={latest} isDark={isDark} />
              ) : (
                <div
                  className="rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300"
                  style={{
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(13,27,64,0.9), rgba(10,22,40,0.95))'
                      : 'linear-gradient(135deg, #ffffff, #f8fafc)',
                    border: isDark ? '1px solid rgba(91,140,255,0.2)' : '1px solid rgba(21,87,255,0.12)',
                    boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.02)',
                  }}
                >
                  <p className={`text-sm mb-4 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Aucun signalement actif</p>
                  <Link
                    to="/nouveau-signalement"
                    className="inline-flex items-center gap-2 bg-[#1557FF] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#1040CC] transition-all"
                  >
                    Faire un signalement
                  </Link>
                </div>
              )}
            </div>

            {/* Right: Propositions à Voter */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`font-black text-sm uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>Propositions à Voter</h2>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => scroll(propsScrollRef, 'left')}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)'
                    }}
                  >
                    <ChevronLeft className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-slate-700'}`} />
                  </button>
                  <button
                    onClick={() => scroll(propsScrollRef, 'right')}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)'
                    }}
                  >
                    <ChevronRight className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-slate-700'}`} />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="h-52 rounded-2xl animate-pulse" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} />
              ) : (
                <div
                  ref={propsScrollRef}
                  className="flex gap-3 overflow-x-auto pb-1"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {carouselProps.map(p => (
                    <PropositionCard key={p.id} prop={p} onVote={handleVote} isDark={isDark} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Impact Communautaire ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`font-black text-sm uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>Impact Communautaire</h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scroll(impactScrollRef, 'left')}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)'
                  }}
                >
                  <ChevronLeft className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-slate-700'}`} />
                </button>
                <button
                  onClick={() => scroll(impactScrollRef, 'right')}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)'
                  }}
                >
                  <ChevronRight className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-slate-700'}`} />
                </button>
              </div>
            </div>

            <div
              className="rounded-2xl p-4 transition-all duration-300"
              style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.02)',
              }}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Projets Réalisés</p>

              {loading ? (
                <div className="h-36 rounded-xl animate-pulse" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} />
              ) : (
                <div
                  ref={impactScrollRef}
                  className="flex gap-3 overflow-x-auto pb-1"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {completedProjects.length > 0 ? (
                    completedProjects.map(p => <ImpactCard key={p.id} project={p} isDark={isDark} />)
                  ) : (
                    <div className={`text-sm py-8 text-center w-full ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                      Aucun projet réalisé pour le moment.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { to: '/nouveau-signalement', icon: '📍', label: 'Nouveau signalement', color: '#1557FF' },
              { to: '/mes-signalements', icon: '📋', label: 'Mes signalements', color: '#7c3aed' },
              { to: '/propositions', icon: '🗳️', label: 'Propositions', color: '#0891b2' },
              { to: '/carte', icon: '🗺️', label: 'Voir la carte', color: '#059669' },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                style={{
                  background: isDark ? `${item.color}18` : `${item.color}08`,
                  border: isDark ? `1px solid ${item.color}30` : `1px solid ${item.color}15`,
                }}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className={`text-center leading-tight ${isDark ? 'text-white/70' : 'text-slate-700'}`}>{item.label}</span>
              </Link>
            ))}
          </div>

        </div>
      </div>
    </CitizenLayout>
  )
}

export default Dashboard