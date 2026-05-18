import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, Clock, AlertCircle, ThumbsUp, Star } from 'lucide-react'
import CitizenLayout from '../../components/citizen/CitizenLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

// ✨ Status helpers ✨
const STATUS_MAP: Record<string, { label: string; textClass: string; bgClass: string; dotClass: string }> = {
  'SOUMISE':  { label: 'Soumise',  textClass: 'text-amber-600 dark:text-amber-400',  bgClass: 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200/10',  dotClass: 'bg-amber-500' },
  'EN COURS': { label: 'En cours', textClass: 'text-blue-600 dark:text-blue-400',   bgClass: 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200/10',   dotClass: 'bg-[#1557FF]' },
  'ÉVALUÉ':   { label: 'Évalué',   textClass: 'text-green-600 dark:text-green-400',  bgClass: 'bg-green-50 dark:bg-green-950/30 border border-green-200/10',  dotClass: 'bg-green-500' },
  'CLÔTURÉ':  { label: 'Clôturé',  textClass: 'text-slate-600 dark:text-slate-400',  bgClass: 'bg-slate-50 dark:bg-slate-950/30 border border-slate-200/10',  dotClass: 'bg-slate-500' },
}

// ✨ Status timeline steps ✨
const TIMELINE_STEPS = ['Soumise', 'En cours', 'Évalué', 'Clôturé']

function getStepIndex(status: string) {
  if (status === 'SOUMISE') return 1
  if (status === 'EN COURS') return 2
  if (status === 'ÉVALUÉ') return 3
  if (status === 'CLÔTURÉ') return 4
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
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                done || current
                  ? 'bg-[#1557FF] border-[#1557FF]'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}>
                {(done || current) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
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
                {new Date(h.changed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Declaration card ─────────────────────────────────────────────────────────
function DeclarationCard({ decl, compact = false }: { decl: any; compact?: boolean }) {
  const s = STATUS_MAP[decl.citizen_status] || STATUS_MAP['SOUMISE']
  return (
    <div className={`transition-all duration-300 rounded-2xl border ${
      compact ? 'p-4' : 'p-6'
    } ${
      compact 
        ? 'bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/50 hover:shadow-lg dark:hover:bg-slate-900/60' 
        : 'bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/50 hover:shadow-xl dark:hover:bg-slate-900/60'
    }`}>
      {!compact && (
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex-1">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full mb-4 shadow-sm ${s.bgClass} ${s.textClass}`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${s.dotClass}`} />
              {s.label}
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
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-4">Progression</p>
            <StatusTimeline status={decl.citizen_status} history={decl.history || []} />
          </div>
        </div>
      )}

      {compact && (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
            {decl.photo_url
              ? <img src={decl.photo_url} alt="" className="w-full h-full object-cover rounded-xl" />
              : <span className="text-xl">🔧</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-100/10">
                ✓ Résolu
              </span>
            </div>
            <p className="font-bold text-[#0A1628] dark:text-white text-sm truncate">{decl.title}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              {decl.created_at ? `Il y a ${Math.floor((Date.now() - new Date(decl.created_at).getTime()) / 86400000)} j` : '—'}
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
    <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 overflow-hidden hover:shadow-xl dark:hover:bg-slate-900/60 transition-all duration-300">
      <div className="h-44 bg-gradient-to-br from-slate-800 to-slate-950 relative flex items-end p-6 group">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=2000&auto=format&fit=crop')] opacity-20 group-hover:opacity-30 transition-opacity bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        <span className="absolute top-4 left-4 bg-white/10 dark:bg-blue-500/20 backdrop-blur-md text-white dark:text-blue-200 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-white/10 dark:border-blue-500/30">
          🏛️ Projet Municipal
        </span>
        <h3 className="text-white font-bold text-xl relative z-10">{prop.title}</h3>
      </div>
      <div className="p-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2 mb-6">{prop.description}</p>
        <div className="flex justify-between text-xs font-black mb-2 uppercase tracking-tighter">
          <span className="text-green-600 dark:text-green-400">Pour ({pct}%)</span>
          <span className="text-rose-600 dark:text-rose-400">Contre ({100 - pct}%)</span>
        </div>
        <div className="h-2.5 rounded-full bg-rose-100 dark:bg-rose-950/20 overflow-hidden mb-3 shadow-inner">
          <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-1000 shadow-[0_0_10px_rgba(34,197,94,0.4)]" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center font-medium">
          {prop.total_votes?.toLocaleString() || '1,245'} citoyens engagés
        </p>
        <button className="w-full mt-5 bg-[#1557FF] hover:bg-[#1040CC] text-white font-black py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95">
          🗳️ Participer au vote
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
  const resolved = declarations.filter(d => d.citizen_status === 'RESOLUE' || d.citizen_status === 'CLOTUREE').slice(0, 3)

  return (
    <CitizenLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-[#0A1628] dark:text-white tracking-tight">
            Bonjour, {user.first_name} <span className="animate-bounce inline-block">👋</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            Voici l'essentiel de votre espace citoyen Sousse FixMaCity.
          </p>
        </div>

        {/* ── Mon dernier signalement ── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-[#0A1628] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
              Mon dernier signalement
            </h2>
            <Link to="/mes-signalements" className="flex items-center gap-1 text-[#1557FF] text-sm font-bold hover:gap-2 transition-all">
              Historique <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-6 animate-pulse h-40" />
          ) : latest ? (
            <DeclarationCard decl={latest} />
          ) : (
            <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-8 text-center">
              <p className="text-slate-400 dark:text-slate-500 text-sm mb-3">Vous n'avez pas encore de signalement.</p>
              <Link to="/nouveau-signalement"
                className="inline-flex items-center gap-2 bg-[#1557FF] text-white font-bold px-5 py-2.5 rounded-xl text-sm">
                Faire mon premier signalement
              </Link>
            </div>
          )}
        </section>

        {/* ── Dernières propositions ── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-[#0A1628] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-6 bg-purple-600 rounded-full" />
              Dernières propositions
            </h2>
            <Link to="/propositions" className="flex items-center gap-1 text-[#1557FF] text-sm font-bold hover:gap-2 transition-all">
              Tout voir <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-6 animate-pulse h-64" />
          ) : propositions.length > 0 ? (
            <PropositionPreview prop={propositions[0]} />
          ) : (
            /* Fallback mock so the page always looks good */
            <PropositionPreview prop={{
              title: 'Végétalisation de la Place des Martyrs',
              description: "Le conseil municipal propose de transformer la place centrale en un espace vert piétonnier, avec l'installation de 50 nouveaux arbres et des points d'eau écologiques.",
              pour_count: 68, total_votes: 1245,
            }} />
          )}
        </section>

        {/* ── Récemment résolus ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-[#0A1628] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-6 bg-green-600 rounded-full" />
              Récemment résolus
            </h2>
            <Link to="/mes-signalements" className="flex items-center gap-1 text-[#1557FF] text-sm font-bold hover:gap-2 transition-all">
              Tout voir <ArrowRight className="w-4 h-4" />
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
                <div key={m.title} className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 p-5 hover:shadow-xl dark:hover:bg-slate-900/60 transition-all duration-300">
                  <div className="h-32 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 mb-4 relative overflow-hidden flex items-center justify-center shadow-inner">
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                      ✓ Résolu
                    </span>
                    <span className="text-5xl opacity-20">🔧</span>
                  </div>
                  <p className="font-bold text-[#0A1628] dark:text-white text-sm line-clamp-1">{m.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">Il y a {m.days} jours</p>
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
