import React, { useEffect, useState } from 'react'
import { X, ThumbsUp, ThumbsDown, Clock, Share2, Link as LinkIcon, AlertCircle, CheckCircle2, Loader2, Send, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import CitizenLayout from '../../components/citizen/CitizenLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

const nowMs = new Date().getTime();
const dayMs = 24 * 3600 * 1000;

const getMockProps = (t: any) => [
  {
    id: '1', category: t('works.mocks.projects.1.category', 'Espaces Verts'), title: t('works.mocks.projects.1.title', 'Végétalisation de la Place des Martyrs'),
    description: t('works.mocks.projects.1.desc', 'Ce projet vise à transformer la Place des Martyrs en un véritable poumon vert au cœur de Sousse. Il comprend la plantation d\'arbres endémiques, l\'installation de bancs ombragés, et la création d\'un système d\'irrigation écologique. L\'objectif est de réduire les îlots de chaleur et d\'offrir un espace de détente convivial pour les citoyens.'),
    pour_pct: 73, total_votes: 1245, duration: t('works.mocks.projects.1.duration', '3 mois'),
    img: 'http://www.commune-sousse.gov.tn/sites/default/files/16777126_10206506030849776_1318912901_o_1.jpg',
    end_date: new Date(nowMs + 18 * dayMs).toISOString()
  },
  {
    id: '2', category: t('works.mocks.projects.2.category', 'Voirie'), title: t('works.mocks.projects.2.title', 'Extension des Pistes Cyclables'),
    description: t('works.mocks.projects.2.desc', 'Création de 12 km de nouvelles pistes cyclables sécurisées reliant les principaux quartiers de Sousse au centre-ville, avec des stations de vélos en libre-service.'),
    pour_pct: 81, total_votes: 987, duration: t('works.mocks.projects.2.duration', '6 mois'),
    img: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1c/3a/1b/ac/ballade-a-hergla-au-lever.jpg?w=1400&h=-1&s=1',
    end_date: new Date(nowMs + 5 * dayMs).toISOString()
  },
  {
    id: '3', category: t('works.mocks.projects.3.category', 'Propreté'), title: t('works.mocks.projects.3.title', 'Bacs à Ordures Connectés'),
    description: t('works.mocks.projects.3.desc', 'Installation de 200 bacs à ordures intelligents équipés de capteurs IoT pour optimiser les tournées de collecte et réduire les débordements dans les rues.'),
    pour_pct: 65, total_votes: 756, duration: t('works.mocks.projects.3.duration', '2 mois'),
    img: 'https://waste.solutions/wp-content/uploads/2022/08/Ultrasonic-Sensor-1.png',
    end_date: new Date(nowMs + 30 * dayMs).toISOString()
  },
  {
    id: '4', category: t('works.mocks.projects.4.category', 'Éclairage public'), title: t('works.mocks.projects.4.title', 'Modernisation de l\'Éclairage Public'),
    description: t('works.mocks.projects.4.desc', 'Remplacement de 3000 lampadaires par des modèles LED à détection de mouvement, réduisant la consommation énergétique de 60% et améliorant la sécurité nocturne.'),
    pour_pct: 89, total_votes: 2100, duration: t('works.mocks.projects.4.duration', '4 mois'),
    img: 'https://realites.com.tn/fr/wp-content/uploads/2026/03/652347036_1233089508896101_5618975784440567528_n.jpg',
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

const SUGGESTION_CATEGORIES = [
  'Voirie & Routes',
  'Éclairage Public',
  'Propreté & Déchets',
  'Espaces Verts',
  'Réseaux & Drainage',
  'Signalisation Routière',
  'Administratif',
  'Suggestions',
]

// ─── Suggestion Modal (citizen → president) ────────────────────────────────────
function SuggestionModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const token = localStorage.getItem('fmc_token')
  const [form, setForm] = React.useState({ title: '', description: '', category: '', location: '' })
  const [saving, setSaving] = React.useState(false)
  const [err, setErr]       = React.useState('')

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.title.trim())       { setErr("Le champ 'Titre' est obligatoire."); return }
    if (form.title.trim().length < 3) { setErr('Le titre doit contenir au moins 3 caractères.'); return }
    if (!form.description.trim()) { setErr("Le champ 'Description' est obligatoire."); return }
    if (!form.category)           { setErr("Le champ 'Catégorie' est obligatoire."); return }

    setSaving(true); setErr('')
    try {
      const res = await fetch(`${API}/propositions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          title:       form.title.trim(),
          description: form.description.trim(),
          category:    form.category,
          location:    form.location.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Erreur lors de l\'envoi.'); setSaving(false); return }
      onSuccess()
    } catch { setErr('Erreur serveur. Veuillez réessayer.'); setSaving(false) }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-[#0A1628] dark:text-white outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-amber-400/10 transition-all bg-white dark:bg-slate-900 placeholder:text-slate-300 dark:placeholder:text-slate-600"

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-[#0A1628] dark:text-white">💡 Nouvelle suggestion</h2>
            <p className="text-xs text-slate-400 mt-0.5">Votre idée sera soumise au Président Municipal</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-5">
          {err && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs font-bold px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{err}
            </div>
          )}

          {/* Titre */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Titre <span className="text-red-400">*</span>
            </label>
            <input className={inputCls} value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ex: Amélioration de l'éclairage au quartier Khezama" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea className={`${inputCls} resize-none h-28`} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Décrivez votre proposition en détail…" />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Catégorie <span className="text-red-400">*</span>
            </label>
            <select className={`${inputCls} cursor-pointer`} value={form.category}
              onChange={e => set('category', e.target.value)}>
              <option value="">— Choisir une catégorie —</option>
              {SUGGESTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Localisation (optional) */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Localisation <span className="text-slate-300 font-medium normal-case tracking-normal">(optionnel)</span>
            </label>
            <input className={inputCls} value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="Ex: Avenue Léopold Sédar Senghor, Khezama" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-7 pb-7">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Annuler
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-[1.5] py-3 rounded-xl bg-[#F59E0B] hover:bg-amber-500 disabled:opacity-50 text-xs font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-400/25">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Proposition Modal ────────────────────────────────────────────────────────
function PropositionModal({
  prop, onClose, onVote }: {
  prop: any; 
  onClose: () => void; 
  onVote: (id: string, vote: 'pour' | 'contre') => void;
}) {
  const { t } = useTranslation();
  const c = CATEGORY_COLORS[prop.category] || CATEGORY_COLORS['Général']
  const [voted, setVoted] = useState<'pour' | 'contre' | null>(prop.user_vote || null)

  const storedUser = localStorage.getItem('fmc_user')
  const user = storedUser ? JSON.parse(storedUser) : null
  const isPresident = user?.role === 'president'
  const isOwnProposal = user?.id && prop.created_by && String(user.id) === String(prop.created_by)
  const isOwnCitizenSuggestion = isOwnProposal && prop.type === 'citizen'

  const handleVote = (v: 'pour' | 'contre') => {
    if (isOwnProposal) return
    setVoted(v)
    onVote(prop.id, v)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header image */}
        <div className="relative h-52 overflow-hidden">
          <img src={prop.img} alt={prop.title}
            className="w-full h-full object-cover" />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(10,22,40,0.8) 0%, transparent 60%)' }} />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white dark:bg-slate-900/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white dark:bg-slate-900/40 transition-all">
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
            <h3 className="font-bold text-[#0A1628] dark:text-white mb-3">{t('propositions.about')}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">{prop.description}</p>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
              <span className="text-slate-400 text-sm">📅</span>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t('propositions.duration')}</p>
                <p className="text-sm font-bold text-[#0A1628] dark:text-white">{prop.duration}</p>
              </div>
            </div>
          </div>

          {/* Right: vote */}
          <div>
            {isPresident ? (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 text-center mb-4">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">{t('propositions.currentState')}</p>
                <p className="text-5xl font-extrabold mb-1" style={{ color: '#1557FF' }}>{prop.pour_pct}%</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('propositions.votesFor')}</p>
                <div className="flex items-center justify-center gap-1.5 mt-3 text-slate-400 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  {t('propositions.closesIn', { days: prop.days_left })}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 text-center mb-4">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">{t('propositions.currentState')}</p>
                <p className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-1">{t('propositions.votingInProgress')}</p>
                <div className="flex items-center justify-center gap-1.5 mt-3 text-slate-400 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  {t('propositions.closesIn', { days: prop.days_left })}
                </div>
              </div>
            )}

            {/* Citizen's own suggestion → status card only, no vote */}
            {isOwnCitizenSuggestion ? (
              <div className="mt-2">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Statut de votre suggestion</p>
                <CitizenSuggestionStatus status={prop.status} />
              </div>
            ) : isOwnProposal ? (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-4 text-center">
                <p className="text-blue-700 dark:text-blue-300 font-bold text-sm">🏛️ Votre proposition</p>
                <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">Vous ne pouvez pas voter sur vos propres propositions.</p>
              </div>
            ) : voted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <p className="text-green-700 font-bold">{t('propositions.actionSaved')}</p>
                <p className="text-green-600 text-sm mt-1">Vous avez voté <strong>{voted === 'pour' ? 'Pour' : 'Contre'}</strong>.</p>
              </div>
            ) : prop.days_left === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center">
                <p className="text-slate-600 dark:text-slate-300 font-bold">{t('propositions.votingClosed')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <button onClick={() => handleVote('pour')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold transition-all text-sm hover:opacity-90"
                  style={{ background: '#16a34a' }}>
                  <ThumbsUp className="w-4 h-4" /> {t('propositions.imFor')}
                </button>
                <button onClick={() => handleVote('contre')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all text-sm border-2 hover:bg-red-50"
                  style={{ borderColor: '#e11d48', color: '#e11d48' }}>
                  <ThumbsDown className="w-4 h-4" /> {t('propositions.imAgainst')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Citizen suggestion status badge ─────────────────────────────────────────
function CitizenSuggestionStatus({ status }: { status: string }) {
  const s = (status || '').toLowerCase()
  if (s === 'retenu' || s === 'retained') {
    return (
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-xl p-3 text-center">
        <p className="text-green-700 dark:text-green-300 font-bold text-xs">✓ Retenue par le Président</p>
      </div>
    )
  }
  if (s === 'confirmer' || s === 'confirme' || s === 'confirmé' || s === 'confirmed') {
    return (
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-xl p-3 text-center">
        <p className="text-green-700 dark:text-green-300 font-bold text-xs">✓ Confirmée</p>
      </div>
    )
  }
  // default: a_discuter / active / pending → amber "En attente"
  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 text-center">
      <p className="text-amber-700 dark:text-amber-300 font-bold text-xs">⏳ En attente de décision du Président</p>
    </div>
  )
}

// ─── Proposition Card ─────────────────────────────────────────────────────────
function PropCard({ prop, onClick }: { prop: any; onClick: () => void }) {
  const { t } = useTranslation();
  const c = CATEGORY_COLORS[prop.category] || CATEGORY_COLORS['Général']
  const urgent = prop.days_left <= 5

  const storedUser = localStorage.getItem('fmc_user')
  const user = storedUser ? JSON.parse(storedUser) : null
  const isPresident = user?.role === 'president'
  const isOwnProposal = user?.id && prop.created_by && String(user.id) === String(prop.created_by)
  const isOwnCitizenSuggestion = isOwnProposal && prop.type === 'citizen'

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-all cursor-pointer group relative flex flex-col h-full"
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
        {/* Own proposal badge */}
        {isOwnProposal && (
          <span className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-full">
            {isOwnCitizenSuggestion ? 'Ma suggestion' : 'Ma proposition'}
          </span>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-[#0A1628] dark:text-white text-base leading-tight mb-2 group-hover:text-[#1557FF] transition-colors">{prop.title}</h3>

        {/* Countdown — only show for president-type propositions */}
        {!isOwnCitizenSuggestion && (
          <div className="flex">
            <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-4 ${
              urgent ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
            }`}>
              ⏳ {t('propositions.daysLeft', { days: prop.days_left })}
            </div>
          </div>
        )}

        {/* Progress & Votes container */}
        <div className="mt-auto flex flex-col justify-end">
          {isPresident && !isOwnCitizenSuggestion && (
            <div className="mb-4">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">{t('propositions.citizenSupport')}</span>
                <span style={{ color: '#16a34a' }}>{prop.pour_pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${prop.pour_pct}%` }} />
              </div>
            </div>
          )}

          {/* Citizen's own suggestion → status card, never vote buttons */}
          {isOwnCitizenSuggestion ? (
            <CitizenSuggestionStatus status={prop.status} />
          ) : isOwnProposal ? (
            // Own president-type proposal: no voting
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3 text-center">
              <p className="text-blue-600 dark:text-blue-400 text-xs font-bold">Voir les détails →</p>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  )
}

const enrichPropositions = (arr: any[], mockProps: any[]) => {
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
      img: p.img || mockProps[Math.floor(Math.random() * mockProps.length)].img
    };
  });
};

// ─── Propositions Page ────────────────────────────────────────────────────────
const Propositions: React.FC = () => {
  const { t } = useTranslation();
  const TABS = [t("propositions.tabs.all"), t("propositions.tabs.municipal"), t("propositions.tabs.voted")];
  const [props, setProps]          = useState<any[]>([])
  const [activeTab, setActiveTab]  = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selected, setSelected]    = useState<any>(null)
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [toast, setToast]          = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const token = localStorage.getItem('fmc_token')
  const propsFromAPI = React.useRef(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const fetchProps = async () => {
      try {
        const res = await fetch(`${API}/propositions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.propositions && data.propositions.length > 0) {
          propsFromAPI.current = true;
          setProps(enrichPropositions(data.propositions, getMockProps(t)));
        } else if (!propsFromAPI.current) {
          setProps(enrichPropositions(getMockProps(t), getMockProps(t)));
        }
      } catch {
        if (!propsFromAPI.current) {
          setProps(enrichPropositions(getMockProps(t), getMockProps(t)));
        }
      }
    };
    fetchProps();
  }, [t, token]);

  const handleVote = async (id: string, vote: 'pour' | 'contre') => {
    try {
      const res = await fetch(`${API}/propositions/${id}/vote`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ vote }),
      })
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          // Own proposal — should not happen (UI blocked), but handle gracefully
          setToast({ message: 'Vous ne pouvez pas voter sur votre propre proposition.', type: 'error' });
        } else if (data.error?.includes('déjà voté')) {
          setToast({ message: data.error, type: 'error' });
          setProps(prev => prev.map(p => p.id === id ? { ...p, user_vote: vote } : p));
        } else {
          setToast({ message: data.error || 'Erreur lors du vote', type: 'error' });
        }
      } else {
        setToast({ message: 'Votre vote a été enregistré avec succès !', type: 'success' });
        setProps(prev =>
          prev.map(p => {
            if (p.id === id) {
              const incrementPour = vote === 'pour' ? 1 : 0;
              const newTotal = (p.total_votes || 0) + 1;
              const newPour = Math.round(((p.total_votes * (p.pour_pct / 100)) + incrementPour) / newTotal * 100);
              return { ...p, pour_pct: newPour, total_votes: newTotal, user_vote: vote };
            }
            return p;
          })
        );
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
            <h1 className="text-3xl font-bold text-[#0A1628] dark:text-white">{t('propositions.presidentProposals')}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t('propositions.presidentSubtitle')}</p>
          </div>
          <button onClick={() => setShowSuggestion(true)}
            className="flex-shrink-0 flex items-center gap-2 bg-[#F59E0B] hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm">
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
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
              className="w-full md:w-56 pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-sm text-[#0A1628] dark:text-white font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-[#1557FF]/20 focus:border-[#1557FF] transition-all cursor-pointer">
              <option value="all">{t('propositions.allCategories')}</option>
              {Object.keys(CATEGORY_COLORS).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px] transform rotate-90">▶</div>
          </div>
        </div>

        {/* Grid */}
        {filteredProps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl text-center px-4 shadow-sm">
            <span className="text-4xl mb-4">📭</span>
            <h3 className="text-lg font-bold text-[#0A1628] dark:text-white mb-1">{t('propositions.notFound')}</h3>
            <p className="text-slate-400 text-sm max-w-md">{t('propositions.notFoundDesc')}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProps.map(p => (
              <PropCard 
                key={p.id} 
                prop={p} 
                onClick={() => setSelected(p)} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Proposition detail modal */}
      {selected && (
        <PropositionModal
          prop={selected}
          onClose={() => setSelected(null)}
          onVote={handleVote}
        />
      )}

      {/* Suggestion submission modal */}
      {showSuggestion && (
        <SuggestionModal
          onClose={() => setShowSuggestion(false)}
          onSuccess={() => {
            setShowSuggestion(false)
            setToast({ message: 'Suggestion envoyée au Président ✓', type: 'success' })
          }}
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
