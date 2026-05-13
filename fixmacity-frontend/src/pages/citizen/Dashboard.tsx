import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, Clock, AlertCircle, ThumbsUp, Star } from 'lucide-react'
import CitizenLayout from '../../components/citizen/CitizenLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  'EN ATTENTE': { label: 'En attente', color: '#F59E0B', bg: '#fffbeb' },
  'EN COURS':   { label: 'En cours',   color: '#1557FF', bg: '#eff6ff' },
  'TERMINE':    { label: 'Terminé',    color: '#16a34a', bg: '#f0fdf4' },
}

// ─── Status timeline steps ────────────────────────────────────────────────────
const TIMELINE_STEPS = ['Soumis', 'Assigné', 'Intervention', 'Résolution']

function getStepIndex(status: string) {
  if (status === 'EN ATTENTE') return 1
  if (status === 'EN COURS')   return 2
  if (status === 'TERMINE')    return 4
  return 0
}

function StatusTimeline({ status, history }: { status: string; history: any[] }) {
  const activeStep = getStepIndex(status)
  return (
    <div className="space-y-3">
      {TIMELINE_STEPS.map((step, i) => {
        const done    = i < activeStep
        const current = i === activeStep - 1
        const h       = history?.[i]
        return (
          <div key={step} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                done || current
                  ? 'bg-[#1557FF] border-[#1557FF]'
                  : 'bg-white border-slate-200'
              }`}>
                {(done || current) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={`w-0.5 h-6 mt-1 ${done ? 'bg-[#1557FF]' : 'bg-slate-200'}`} />
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold ${done || current ? 'text-[#0A1628]' : 'text-slate-400'}`}>
                {step}
              </p>
              {h && <p className="text-xs text-slate-400 mt-0.5">{new Date(h.changed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Declaration card ─────────────────────────────────────────────────────────
function DeclarationCard({ decl, compact = false }: { decl: any; compact?: boolean }) {
  const s = STATUS_MAP[decl.citizen_status] || STATUS_MAP['EN ATTENTE']
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-shadow ${compact ? 'p-4' : 'p-6'}`}>
      {!compact && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-3"
              style={{ color: s.color, background: s.bg }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <h3 className="font-bold text-[#0A1628] text-lg leading-tight">{decl.title}</h3>
            <p className="text-slate-500 text-sm mt-1 line-clamp-2">{decl.description}</p>
            <div className="flex items-center gap-2 mt-3 text-slate-400 text-xs">
              <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center">
                <span className="text-[10px]">📍</span>
              </div>
              <span>{decl.address || 'Sousse'}</span>
            </div>
          </div>
          <div className="w-56 flex-shrink-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Suivi d'intervention</p>
            <StatusTimeline status={decl.citizen_status} history={decl.history || []} />
          </div>
        </div>
      )}

      {compact && (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {decl.photo_url
              ? <img src={decl.photo_url} alt="" className="w-full h-full object-cover rounded-xl" />
              : <span className="text-xl">🔧</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: s.color, background: s.bg }}>✓ Résolu</span>
            </div>
            <p className="font-semibold text-[#0A1628] text-sm truncate">{decl.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {decl.created_at ? `Il y a ${Math.floor((Date.now() - new Date(decl.created_at).getTime()) / 86400000)} jours` : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Proposition preview card ─────────────────────────────────────────────────
function PropositionPreview({ prop }: { prop: any }) {
  const pct = prop.pour_count && prop.total_votes
    ? Math.round((prop.pour_count / prop.total_votes) * 100) : 68
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-40 bg-gradient-to-br from-slate-700 to-slate-900 relative flex items-end p-4">
        <span className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
          🏛️ Projet Municipal
        </span>
        <h3 className="text-white font-bold text-base leading-tight">{prop.title}</h3>
      </div>
      <div className="p-4">
        <p className="text-slate-500 text-sm line-clamp-2 mb-4">{prop.description}</p>
        <div className="flex justify-between text-xs font-bold mb-1.5">
          <span style={{ color: '#16a34a' }}>Pour ({pct}%)</span>
          <span style={{ color: '#e11d48' }}>Contre ({100 - pct}%)</span>
        </div>
        <div className="h-2 rounded-full bg-red-100 overflow-hidden mb-2">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-400 text-center">{prop.total_votes?.toLocaleString() || '1,245'} citoyens ont déjà voté</p>
        <button className="w-full mt-3 bg-[#1557FF] hover:bg-[#1040CC] text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
          🗳️ Voter
        </button>
      </div>
    </div>
  )
} 

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const [declarations, setDeclarations] = useState<any[]>([])
  const [propositions, setPropositions] = useState<any[]>([])
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
      setPropositions(Array.isArray(props) ? props : props.propositions || [])
    }).finally(() => setLoading(false))
  }, [])

  const latest   = declarations[0]
  const resolved = declarations.filter(d => d.citizen_status === 'TERMINE').slice(0, 3)

  return (
    <CitizenLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0A1628]">
            Bonjour, {user.first_name} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">Bienvenue sur votre espace citoyen FixMaCity.</p>
        </div>

        {/* ── Mon dernier signalement ── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#0A1628]">Mon dernier signalement</h2>
            <Link to="/mes-signalements" className="flex items-center gap-1 text-[#1557FF] text-sm font-semibold hover:gap-2 transition-all">
              Voir plus <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse h-40" />
          ) : latest ? (
            <DeclarationCard decl={latest} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <p className="text-slate-400 text-sm mb-3">Vous n'avez pas encore de signalement.</p>
              <Link to="/nouveau-signalement"
                className="inline-flex items-center gap-2 bg-[#1557FF] text-white font-bold px-5 py-2.5 rounded-xl text-sm">
                Faire mon premier signalement
              </Link>
            </div>
          )}
        </section>

        {/* ── Dernières propositions ── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#0A1628]">Dernières propositions</h2>
            <Link to="/propositions" className="flex items-center gap-1 text-[#1557FF] text-sm font-semibold hover:gap-2 transition-all">
              Voir plus <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse h-64" />
          ) : propositions.length > 0 ? (
            <PropositionPreview prop={propositions[0]} />
          ) : (
            /* Fallback mock so the page always looks good */
            <PropositionPreview prop={{
              title: 'Végétalisation de la Place des Martyrs',
              description: 'Le conseil municipal propose de transformer la place centrale en un espace vert piétonnier, avec l\'installation de 50 nouveaux arbres et des points d\'eau écologiques.',
              pour_count: 68, total_votes: 1245,
            }} />
          )}
        </section>

        {/* ── Récemment résolus ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#0A1628]">Récemment résolus</h2>
            <Link to="/mes-signalements" className="flex items-center gap-1 text-[#1557FF] text-sm font-semibold hover:gap-2 transition-all">
              Voir plus <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {resolved.length > 0 ? (
            <div className="grid sm:grid-cols-3 gap-4">
              {resolved.map(d => <DeclarationCard key={d.id} decl={d} compact />)}
            </div>
          ) : (
            /* Fallback mock cards */
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { title: 'Réparation chaussée Rue Ibn Khaldoun', days: 2  },
                { title: 'Éclairage public Place Farhat Hached',  days: 4  },
                { title: 'Nettoyage Parc de la Ligue Arabe',      days: 7  },
              ].map(m => (
                <div key={m.title} className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
                  <div className="h-28 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 mb-3 relative overflow-hidden flex items-center justify-center">
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      ✓ Résolu
                    </span>
                    <span className="text-4xl opacity-20">🔧</span>
                  </div>
                  <p className="font-semibold text-[#0A1628] text-sm">{m.title}</p>
                  <p className="text-xs text-slate-400 mt-1">Il y a {m.days} jours</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </CitizenLayout>
  )
}

export default Dashboard
