// src/pages/Agent/AgentDashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  CheckCircle, XCircle, Clock, Loader2, RefreshCw, Zap,
  X, Camera, Hash, Calendar, User, Mail, MapPin, ThumbsUp,
  Shield, Flame, Landmark, Stethoscope, ShoppingCart, TreePine,
  ChevronRight, FileText, AlertTriangle, ImageIcon,
  CheckCircle2, ArrowLeft, History, Info, Users, MessageSquare
} from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'
import { toast, Toaster } from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok  = () => localStorage.getItem('fmc_token') || ''
const hdr  = () => ({ Authorization: `Bearer ${tok()}` })

// ─── Types ─────────────────────────────────────────────────────────────────
interface Agent {
  id: string
  first_name: string
  last_name: string
  email?: string
}

interface Mission {
  id: string
  ref_citoyen: string
  ref_service: string | null
  title: string
  description: string
  category: string
  status: string
  priority: string
  priority_score: number
  is_sensitive: boolean
  sensitive_type: string
  address: string | null
  latitude: number | null
  longitude: number | null
  votes_count: number
  photo_avant: string | null
  created_at: string
  assigned_at: string | null
  started_at: string | null
  resolved_at: string | null
  delegations: { name: string; code: string } | null
  citizen: { id: string; first_name: string; last_name: string; email: string } | null
  agent?: Agent | null
  // co-agents on same declaration
  co_agents?: Agent[]
}

interface Photo {
  id: string
  url: string
  uploaded_by: string
  created_at: string
  photo_type?: string
}

interface HistoryEntry {
  id: string
  old_status: string
  new_status: string
  raison: string | null
  created_at: string
  changed_by_user?: { first_name: string; last_name: string; role: string } | null
  user?: { first_name: string; last_name: string; role: string } | null
}

interface Comment {
  id: string
  content: string
  channel: string
  created_at: string
  user_id?: string
  user?: { first_name: string; last_name: string; role: string } | null
  author?: { first_name: string; last_name: string; role: string } | null
}

interface DetailFull extends Mission {
  photos: Photo[]
  history: HistoryEntry[]
  comments: Comment[]
}

// ─── Config ────────────────────────────────────────────────────────────────
const PRI: Record<string, { label: string; color: string; bg: string; border: string }> = {
  haute:   { label: 'Urgente', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  moyenne: { label: 'Normale', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  basse:   { label: 'Faible',  color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
}
const normPri = (p: string) =>
  ['high','urgent','urgente','haute'].includes(p?.toLowerCase()) ? 'haute' :
  ['low','faible','basse'].includes(p?.toLowerCase()) ? 'basse' : 'moyenne'

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  assignee_agent: { label: 'À accepter',       color: '#4F46E5', bg: '#EEF2FF' },
  en_cours:       { label: 'En intervention',  color: '#B45309', bg: '#FFFBEB' },
  resolue:        { label: 'Résolue',          color: '#15803D', bg: '#DCFCE7' },
  refusee_agent:  { label: 'Refusée',          color: '#DC2626', bg: '#FEF2F2' },
  cloturee:       { label: 'Clôturée',         color: '#475569', bg: '#F1F5F9' },
}

const ZONE_ICONS: Record<string, React.ReactNode> = {
  school:     <Landmark     className="w-3.5 h-3.5" />,
  hospital:   <Stethoscope  className="w-3.5 h-3.5" />,
  mosque:     <Landmark     className="w-3.5 h-3.5" />,
  market:     <ShoppingCart className="w-3.5 h-3.5" />,
  playground: <TreePine     className="w-3.5 h-3.5" />,
}
const ZONE_LABEL: Record<string, string> = {
  school: 'École', hospital: 'Hôpital', mosque: 'Mosquée',
  market: 'Marché', playground: 'Terrain de jeux', other: 'Zone sensible',
}

const REFUSE_PRESETS = [
  'Informations insuffisantes',
  'Hors de ma compétence technique',
  'Doublon avec un signalement existant',
  'Matériel non disponible',
  'Accès au site impossible',
  'Autre',
]

const CAT_EMOJI: Record<string, string> = {
  'Voirie': '🛣️', 'Éclairage public': '💡', 'Propreté': '🗑️',
  'Espaces Verts': '🌿', 'Réseaux': '💧', 'Signalisation': '🚦',
  'Administratif': '🏛️', 'Suggestions': '💬',
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtFull = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const relTime = (d: string) => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 60)   return `${mins}min`
  if (mins < 1440) return `${Math.floor(mins / 60)}h`
  return `${Math.floor(mins / 1440)}j`
}
const initials = (fn: string, ln: string) => `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase()

// ─── Skeleton ──────────────────────────────────────────────────────────────
const Sk = ({ w = 'w-full', h = 'h-4', r = 'rounded-xl' }: { w?: string; h?: string; r?: string }) => (
  <div className={`${w} ${h} ${r} bg-slate-100 animate-pulse`} />
)

// ─── Priority Bar ──────────────────────────────────────────────────────────
const PriorityBar: React.FC<{ m: Mission }> = ({ m }) => {
  const pri   = normPri(m.priority)
  const cfg   = PRI[pri]
  const score = Math.min(100, m.priority_score || 0)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, background: cfg.color }} />
        </div>
        <span className="text-sm font-black flex-shrink-0" style={{ color: cfg.color }}>
          {score}<span className="text-xs font-bold text-slate-400">/100</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border"
          style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
          {pri === 'haute' && <Flame className="w-3 h-3" />}
          {pri === 'moyenne' && <Zap className="w-3 h-3" />}
          Priorité {cfg.label}
        </span>
        {m.votes_count > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            <ThumbsUp className="w-3 h-3" /> {m.votes_count}
          </span>
        )}
        {m.is_sensitive && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
            {ZONE_ICONS[m.sensitive_type] || <Shield className="w-3 h-3" />}
            {ZONE_LABEL[m.sensitive_type] || 'Zone sensible'}
          </span>
        )}
      </div>
      <p className="text-[10px] text-slate-400">
        Score : base priorité
        {m.votes_count > 0 ? ` + ${m.votes_count}×3 votes` : ''}
        {m.is_sensitive ? ' + zone sensible' : ''}
      </p>
    </div>
  )
}

// ─── Refuse Modal ──────────────────────────────────────────────────────────
const RefuseModal: React.FC<{
  mission: Mission
  onClose: () => void
  onRefused: (id: string) => void
}> = ({ mission, onClose, onRefused }) => {
  const [raison,  setRaison]  = useState('')
  const [custom,  setCustom]  = useState('')
  const [loading, setLoading] = useState(false)

  const finalRaison = raison === 'Autre' ? custom.trim() : raison

  const doRefuse = async () => {
    if (!finalRaison) { toast.error('Motif obligatoire'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${mission.id}/refuse`, {
        method: 'POST',
        headers: { ...hdr(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ raison: finalRaison }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      toast.success('Refus transmis au Chef de Service')
      onRefused(mission.id)
      onClose()
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden"
        style={{ animation: 'scaleIn .2s ease forwards' }}>

        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100 px-7 py-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-red-800">Refuser la mission</h2>
            <p className="text-xs text-red-500 font-medium mt-0.5 line-clamp-1">{mission.title}</p>
            <p className="text-[10px] text-red-400 mt-0.5">Le Chef de Service sera notifié et pourra réassigner</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 bg-red-100 hover:bg-red-200 rounded-xl flex items-center justify-center transition-all">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sélectionnez un motif *</p>

          {/* Preset grid */}
          <div className="grid grid-cols-2 gap-2">
            {REFUSE_PRESETS.map(r => (
              <button key={r} onClick={() => { setRaison(r); if (r !== 'Autre') setCustom('') }}
                className={`text-left px-3 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all leading-tight ${
                  raison === r
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-100 bg-slate-50/80 text-slate-500 hover:border-slate-200 hover:bg-white'
                }`}>
                {raison === r && <span className="text-red-500 mr-1">✓</span>}{r}
              </button>
            ))}
          </div>

          {/* Custom textarea — shown always or when "Autre" */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              {raison === 'Autre' ? 'Précisez *' : 'Détails supplémentaires (optionnel)'}
            </p>
            <textarea
              value={raison === 'Autre' ? custom : ''}
              onChange={e => { setCustom(e.target.value); setRaison('Autre') }}
              rows={3}
              placeholder="Décrivez le motif en détail…"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700
                         outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 resize-none font-medium transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 pb-7 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">
            Annuler
          </button>
          <button onClick={doRefuse} disabled={!finalRaison || loading}
            className="flex-1 py-3 rounded-2xl bg-red-600 text-white text-sm font-black hover:bg-red-700
                       disabled:opacity-50 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Confirmer le refus
          </button>
        </div>
      </div>
      <style>{`@keyframes scaleIn{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────
const DetailDrawer: React.FC<{
  missionId: string | null
  myId: string
  onClose: () => void
  onAccepted: (id: string) => void
  onRefused: (id: string) => void
}> = ({ missionId, myId, onClose, onAccepted, onRefused }) => {
  const [detail,    setDetail]    = useState<DetailFull | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [tab,       setTab]       = useState<'info' | 'photos' | 'agents' | 'history'>('info')
  const [refusing,  setRefusing]  = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [sendingCmt, setSendingCmt] = useState(false)

  useEffect(() => {
    if (!missionId) { setDetail(null); return }
    setLoading(true); setTab('info')
    fetch(`${API}/agent/declarations/${missionId}`, { headers: hdr() })
      .then(r => r.json())
      .then(d => setDetail(d))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [missionId])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const doAccept = async () => {
    if (!detail) return
    setAccepting(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${detail.id}/accept`, {
        method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      toast.success('Mission acceptée — intervention démarrée ✓')
      onAccepted(detail.id)
      onClose()
    } catch (e: any) { toast.error(e.message) }
    finally { setAccepting(false) }
  }

  const sendComment = async () => {
    if (!detail || !newComment.trim()) return
    setSendingCmt(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${detail.id}/comments`, {
        method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim(), channel: 'chef_agent' }),
      })
      if (res.ok) {
        const d = await res.json()
        const newCmt = d.comment || d
        setDetail(prev => prev ? { ...prev, comments: [...prev.comments, newCmt] } : null)
        setNewComment('')
      }
    } catch {}
    finally { setSendingCmt(false) }
  }

  if (!missionId) return null

  const pri     = detail ? normPri(detail.priority) : 'moyenne'
  const priCfg  = PRI[pri]
  const stCfg   = detail ? (STATUS_CFG[detail.status] || STATUS_CFG.assignee_agent) : STATUS_CFG.assignee_agent
  const canAct  = detail?.status === 'assignee_agent'

  const photos      = detail?.photos || []
  const photosBefore = photos.filter(p => !p.photo_type || p.photo_type === 'photo_avant')
  const photosAfter  = photos.filter(p => p.photo_type === 'photo_apres' || p.photo_type === 'after')
  const mainBefore   = photosBefore[0] || (photos[0] ?? null)
  const mainAfter    = photosAfter[0]  || (photos.length > 1 ? photos[photos.length - 1] : null)

  const TABS = [
    { key: 'info',    label: 'Infos',       icon: Info       },
    { key: 'photos',  label: 'Photos',      icon: Camera,    count: photos.length     },
    { key: 'agents',  label: 'Agents',      icon: Users                               },
    { key: 'history', label: 'Historique',  icon: History,   count: detail?.history.length },
  ]

  const myComments = (detail?.comments || []).filter(c => c.channel === 'chef_agent')

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-[201] w-full max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-100 overflow-hidden"
        style={{ animation: 'slideInRight .32s cubic-bezier(.22,1,.36,1) forwards' }}>

        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="flex items-center gap-2">
            {detail && !loading ? (
              <>
                <span className="text-[10px] font-mono font-bold text-slate-400">{detail.ref_citoyen}</span>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
                  style={{ color: stCfg.color, background: stCfg.bg }}>
                  {stCfg.label}
                </span>
              </>
            ) : loading && <Sk w="w-36" h="h-5" />}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Photo strip: before | after ── */}
        <div className="flex-shrink-0 h-40 bg-slate-100 overflow-hidden">
          {loading ? (
            <div className="w-full h-full bg-slate-200 animate-pulse" />
          ) : (mainBefore || mainAfter) ? (
            <div className="flex h-full">
              {/* Before */}
              <div className="flex-1 relative overflow-hidden">
                {mainBefore ? (
                  <img src={mainBefore.url || (detail?.photo_avant ?? '')} alt="Avant"
                    className="w-full h-full object-cover" />
                ) : detail?.photo_avant ? (
                  <img src={detail.photo_avant} alt="Avant"
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50">
                    <ImageIcon className="w-8 h-8 text-slate-200" />
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/75 text-white text-[9px] font-black tracking-wider">
                  📸 AVANT · Citoyen
                </div>
              </div>

              {/* Divider */}
              {mainAfter && <div className="w-0.5 bg-white/50 flex-shrink-0" />}

              {/* After */}
              {mainAfter ? (
                <div className="flex-1 relative overflow-hidden">
                  <img src={mainAfter.url} alt="Après" className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-[9px] font-black tracking-wider">
                    ✓ APRÈS · Agent
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 gap-2">
                  <Camera className="w-6 h-6 text-slate-300" />
                  <p className="text-[10px] font-bold text-slate-400 text-center px-3 leading-snug">
                    Photo après résolution
                  </p>
                </div>
              )}
            </div>
          ) : detail?.photo_avant ? (
            <div className="relative h-full">
              <img src={detail.photo_avant} alt="Photo citoyen" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/75 text-white text-[9px] font-black">
                📸 AVANT · Citoyen
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full gap-2 text-slate-400">
              <Camera className="w-5 h-5" />
              <span className="text-xs font-bold">Aucune photo jointe</span>
            </div>
          )}
        </div>

        {/* ── Title block ── */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100">
          {loading ? (
            <div className="space-y-2"><Sk h="h-5" w="w-3/4" /><Sk h="h-3" w="w-1/2" /></div>
          ) : detail ? (
            <div>
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">
                  {CAT_EMOJI[detail.category] || '📌'}
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-black text-slate-900 leading-tight line-clamp-2">{detail.title}</h2>
                  <div className="flex items-center flex-wrap gap-2 mt-1.5">
                    {detail.category && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {detail.category}
                      </span>
                    )}
                    {detail.delegations?.name && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{detail.delegations.name}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{relTime(detail.created_at)} · {fmtDate(detail.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Tabs ── */}
        <div className="flex-shrink-0 flex border-b border-slate-100 px-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold border-b-2 transition-all ${
                tab === t.key
                  ? 'border-[#1557FF] text-[#1557FF]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? 'bg-blue-100 text-[#1557FF]' : 'bg-slate-100 text-slate-400'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">

          {/* ─── INFO TAB ─── */}
          {tab === 'info' && (
            <div className="p-6 space-y-5">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Sk w="w-8" h="h-8" r="rounded-xl" />
                      <div className="flex-1 space-y-1.5"><Sk w="w-20" h="h-2.5" /><Sk h="h-4" /></div>
                    </div>
                  ))}
                </div>
              ) : detail ? (
                <>
                  {/* Priority */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Priorité & Score</p>
                    <PriorityBar m={detail} />
                  </div>

                  {/* Citizen */}
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Citoyen déclarant
                    </p>
                    {detail.citizen ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1557FF] flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                          {initials(detail.citizen.first_name, detail.citizen.last_name)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {detail.citizen.first_name} {detail.citizen.last_name}
                          </p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />{detail.citizen.email}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Non identifié</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="w-3 h-3" /> Description
                    </p>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        {detail.description || <span className="italic text-slate-400">Aucune description fournie.</span>}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> Localisation
                    </p>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-1.5">
                      <p className="text-sm font-bold text-slate-800">{detail.address || '—'}</p>
                      {detail.latitude && detail.longitude && (
                        <p className="text-[10px] font-mono text-slate-400">
                          {(+detail.latitude).toFixed(5)}, {(+detail.longitude).toFixed(5)}
                        </p>
                      )}
                    </div>
                    {detail.is_sensitive && (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-purple-50 border border-purple-100 rounded-2xl">
                        {ZONE_ICONS[detail.sensitive_type] || <Shield className="w-3.5 h-3.5 text-purple-500" />}
                        <p className="text-xs font-bold text-purple-700">
                          {ZONE_LABEL[detail.sensitive_type] || 'Zone sensible'} à proximité
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Refs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5" />Réf. citoyen
                      </p>
                      <p className="text-xs font-mono font-bold text-[#1557FF]">{detail.ref_citoyen}</p>
                      {detail.ref_service && <p className="text-[10px] font-mono text-slate-400 mt-0.5">{detail.ref_service}</p>}
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />Soumis le
                      </p>
                      <p className="text-xs font-bold text-slate-700">{fmtFull(detail.created_at)}</p>
                    </div>
                  </div>

                  {/* Chef-Agent channel comments */}
                  {myComments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3" /> Message du Chef de Service
                      </p>
                      <div className="space-y-2">
                        {myComments.map(c => {
                          const author = c.author || c.user
                          const isChef = author?.role === 'chef'
                          return (
                            <div key={c.id} className={`px-4 py-3 rounded-2xl text-sm ${
                              isChef
                                ? 'bg-indigo-50 border border-indigo-100 text-indigo-900'
                                : 'bg-slate-50 border border-slate-100 text-slate-700'
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">
                                  {isChef ? '👤 Chef de Service' : `${author?.first_name} ${author?.last_name}`}
                                </span>
                                <span className="text-[9px] text-slate-400">{fmtFull(c.created_at)}</span>
                              </div>
                              <p className="font-medium leading-relaxed">{c.content}</p>
                            </div>
                          )
                        })}
                      </div>
                      {/* Reply box */}
                      <div className="flex gap-2 pt-1">
                        <input value={newComment} onChange={e => setNewComment(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') sendComment() }}
                          placeholder="Répondre au chef…"
                          className="flex-1 text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none
                                     focus:border-[#1557FF] focus:bg-white transition-all text-slate-700 placeholder-slate-400" />
                        <button onClick={sendComment} disabled={sendingCmt || !newComment.trim()}
                          className="w-9 h-9 rounded-xl bg-[#1557FF] text-white flex items-center justify-center
                                     hover:bg-blue-700 disabled:opacity-40 transition-all flex-shrink-0">
                          {sendingCmt
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* ─── PHOTOS TAB ─── */}
          {tab === 'photos' && (
            <div className="p-6 space-y-4">
              {loading ? <Skel h="h-48" /> : photos.length === 0 && !detail?.photo_avant ? (
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400">Aucune photo jointe</p>
                  <p className="text-[10px] text-slate-300">Le citoyen n'a pas joint de photo.</p>
                </div>
              ) : (
                <>
                  {/* Citizen before photos */}
                  {(photosBefore.length > 0 || detail?.photo_avant) && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Camera className="w-3 h-3" /> Photos avant — Citoyen
                      </p>
                      <div className="space-y-3">
                        {(photosBefore.length > 0 ? photosBefore : [{ id: 'main', url: detail!.photo_avant!, created_at: detail!.created_at }]).map((ph: any) => (
                          <div key={ph.id} className="rounded-2xl overflow-hidden border border-slate-100">
                            <img src={ph.url} alt="Avant" className="w-full object-cover max-h-56" />
                            <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                📸 Photo citoyenne
                              </span>
                              <span className="text-[9px] text-slate-400">{fmtFull(ph.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agent after photos */}
                  {photosAfter.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Photos après — Agent
                      </p>
                      <div className="space-y-3">
                        {photosAfter.map(ph => (
                          <div key={ph.id} className="rounded-2xl overflow-hidden border border-emerald-100">
                            <img src={ph.url} alt="Après" className="w-full object-cover max-h-56" />
                            <div className="px-4 py-2.5 bg-emerald-50 flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                ✓ Après intervention
                              </span>
                              <span className="text-[9px] text-slate-400">{fmtFull(ph.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── AGENTS TAB ─── */}
          {tab === 'agents' && (
            <div className="p-6 space-y-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Agents assignés à ce signalement</p>
              {loading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="flex gap-3"><Sk w="w-10" h="h-10" r="rounded-xl" /><div className="flex-1 space-y-1.5"><Sk w="w-28" h="h-3.5" /><Sk h="h-3" w="w-20" /></div></div>)}</div>
              ) : detail ? (
                <>
                  {/* Me */}
                  {detail.agent && (
                    <div className="p-4 rounded-2xl border-2 border-[#1557FF] bg-blue-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1557FF] flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                          {initials(detail.agent.first_name, detail.agent.last_name)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-[#1557FF]">
                              {detail.agent.first_name} {detail.agent.last_name}
                            </p>
                            <span className="text-[9px] font-black bg-[#1557FF] text-white px-2 py-0.5 rounded-full">
                              {detail.agent.id === myId ? 'Vous' : 'Principal'}
                            </span>
                          </div>
                          {detail.agent.email && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{detail.agent.email}</p>
                          )}
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-[#1557FF] flex-shrink-0" />
                      </div>
                    </div>
                  )}

                  {/* Co-agents */}
                  {(detail.co_agents || []).map(ca => (
                    <div key={ca.id} className="p-4 rounded-2xl border border-slate-200 bg-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                          {initials(ca.first_name, ca.last_name)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{ca.first_name} {ca.last_name}</p>
                          <p className="text-[10px] text-slate-400">Co-agent • même dossier</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {!detail.agent && (!(detail.co_agents?.length)) && (
                    <div className="py-12 text-center">
                      <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-400">Aucun agent assigné</p>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* ─── HISTORY TAB ─── */}
          {tab === 'history' && (
            <div className="p-6">
              {loading ? (
                <div className="space-y-4">{[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Sk w="w-8" h="h-8" r="rounded-full" />
                    <div className="flex-1 space-y-1.5 pt-1"><Skel w="w-20" h="h-3" /><Sk h="h-2.5" w="w-36" /></div>
                  </div>
                ))}</div>
              ) : (detail?.history || []).length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-bold">Aucun historique</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[14px] top-4 bottom-4 w-0.5 bg-slate-100" />
                  <div className="space-y-4">
                    {(detail?.history || []).map((h, i) => {
                      const stC = STATUS_CFG[h.new_status] || { label: h.new_status, color: '#64748B', bg: '#F8FAFC' }
                      const author = h.changed_by_user || h.user
                      const isLast = i === (detail?.history.length ?? 0) - 1
                      return (
                        <div key={h.id} className="flex gap-3 relative">
                          <div className={`w-[28px] h-[28px] rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
                            isLast ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200'
                          }`}>
                            {isLast
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              : <span className="text-[8px] font-black text-slate-400">{i + 1}</span>
                            }
                          </div>
                          <div className="flex-1 pb-4 pt-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black" style={{ color: stC.color }}>{stC.label}</span>
                              <span className="text-[9px] text-slate-400">{fmtFull(h.created_at)}</span>
                            </div>
                            {author && (
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                par {author.first_name} {author.last_name}
                                <span className="text-slate-400 ml-1">({author.role})</span>
                              </p>
                            )}
                            {h.raison && (
                              <div className="mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-[10px] text-red-600 italic">«{h.raison}»</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer — only when pending ── */}
        {canAct && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
            <button onClick={() => setRefusing(true)}
              className="flex-1 py-3 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 text-sm font-black
                         hover:bg-red-100 hover:border-red-300 transition-all flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4" /> Refuser
            </button>
            <button onClick={doAccept} disabled={accepting}
              className="flex-[2] py-3 rounded-2xl bg-emerald-500 text-white text-sm font-black
                         hover:bg-emerald-600 disabled:opacity-60 transition-all
                         shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
              {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {accepting ? 'Acceptation…' : 'Accepter la mission'}
            </button>
          </div>
        )}

        {/* Refuse modal stacked on drawer */}
        {refusing && detail && (
          <RefuseModal
            mission={detail}
            onClose={() => setRefusing(false)}
            onRefused={id => { onRefused(id); setRefusing(false) }}
          />
        )}
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </>
  )
}

// ─── Mission Row (List View) ────────────────────────────────────────────────
const MissionRow: React.FC<{
  m: Mission
  myId: string
  isSelected: boolean
  onOpen: (id: string) => void
}> = ({ m, isSelected, onOpen }) => {
  const pri    = normPri(m.priority)
  const priCfg = PRI[pri]
  const stCfg  = STATUS_CFG[m.status] || STATUS_CFG.assignee_agent
  const isNew  = m.status === 'assignee_agent'

  return (
    <div
      onClick={() => onOpen(m.id)}
      className={`flex items-center gap-4 py-4 px-5 bg-white border-b border-slate-100 cursor-pointer transition-colors relative
        ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
    >
      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1557FF]" />
      )}

      {/* Date */}
      <div className="w-24 flex-shrink-0 flex flex-col justify-center">
        <span className="text-sm font-bold text-slate-800">{fmtDate(m.created_at).split(' ')[0]} {fmtDate(m.created_at).split(' ')[1]}</span>
        <span className="text-xs text-slate-400">{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* Main Info (Photo + Title + Address) */}
      <div className="flex-1 flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden relative">
          {m.photo_avant ? (
            <img src={m.photo_avant} alt={m.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <Camera className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-900 truncate">{m.title}</h3>
            <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">· {m.ref_citoyen}</span>
          </div>
          {m.address && (
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{m.address}</span>
            </div>
          )}
          {m.description && (
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{m.description}</p>
          )}
        </div>
      </div>

      {/* Category / Sensitive */}
      <div className="w-32 flex-shrink-0 flex flex-col gap-1 items-start">
        {m.category && (
          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full truncate max-w-full">
            {CAT_EMOJI[m.category] || '📌'} {m.category}
          </span>
        )}
        {m.is_sensitive && (
          <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full truncate max-w-full flex items-center gap-1">
            <Shield className="w-3 h-3 flex-shrink-0" /> Sensible
          </span>
        )}
      </div>

      {/* Status / Priority */}
      <div className="w-32 flex-shrink-0 flex items-center justify-between gap-2">
        <span className="text-[10px] font-black px-2 py-1 rounded-md border"
          style={{ color: priCfg.color, background: priCfg.bg, borderColor: priCfg.border }}>
          {priCfg.label}
        </span>
      </div>

      {/* Co-agents & Extra Info (Votes) */}
      <div className="w-24 flex-shrink-0 flex flex-col items-end justify-center gap-1.5">
        {m.co_agents && m.co_agents.length > 0 && (
          <div className="flex -space-x-1.5" title={`${m.co_agents.length} autre(s) agent(s)`}>
            {m.co_agents.slice(0, 3).map((ca, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[9px] font-black text-blue-700 z-10 relative shadow-sm">
                {initials(ca.first_name, ca.last_name)}
              </div>
            ))}
            {m.co_agents.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[9px] font-bold text-slate-500 z-10 relative shadow-sm">
                +{m.co_agents.length - 3}
              </div>
            )}
          </div>
        )}
        {m.votes_count > 0 ? (
          <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
            {m.votes_count} <ThumbsUp className="w-3 h-3 text-slate-400" />
          </span>
        ) : (
          (!m.co_agents || m.co_agents.length === 0) && <span className="text-xs text-slate-400">—</span>
        )}
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────
const AgentDashboard: React.FC = () => {
  const user       = JSON.parse(localStorage.getItem('fmc_user') || '{}')
  const myId       = user.id || ''

  const [missions,   setMissions]   = useState<Mission[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab,        setTab]        = useState<'pending' | 'active' | 'done'>('pending')
  const [openId,     setOpenId]     = useState<string | null>(null)
  const [refuseM,    setRefuseM]    = useState<Mission | null>(null)
  const [search,     setSearch]     = useState('')

  const load = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true)
    try {
      const res  = await fetch(`${API}/agent/declarations`, { headers: hdr() })
      const data = await res.json()
      const rows = (data.declarations || []) as Mission[]
      // Sort: pending first, then by priority_score DESC, then date
      rows.sort((a, b) => {
        const statusPrio: Record<string, number> = { assignee_agent: 3, en_cours: 2, resolue: 1, cloturee: 0, refusee_agent: 0 }
        const sa = statusPrio[a.status] ?? 1
        const sb = statusPrio[b.status] ?? 1
        if (sa !== sb) return sb - sa
        return (b.priority_score || 0) - (a.priority_score || 0)
      })
      setMissions(rows)
    } catch { toast.error('Erreur de chargement') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Quick accept from card
  const quickAccept = async (m: Mission) => {
    try {
      const res = await fetch(`${API}/agent/declarations/${m.id}/accept`, {
        method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      toast.success('Mission acceptée ✓')
      setMissions(prev => prev.map(x => x.id === m.id ? { ...x, status: 'en_cours' } : x))
    } catch (e: any) { toast.error(e.message) }
  }

  const handleRefused  = (id: string) => setMissions(p => p.map(x => x.id === id ? { ...x, status: 'refusee_agent' } : x))
  const handleAccepted = (id: string) => setMissions(p => p.map(x => x.id === id ? { ...x, status: 'en_cours' } : x))

  // Filter by tab + search
  const applySearch = (rows: Mission[]) =>
    !search ? rows : rows.filter(m =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.ref_citoyen.toLowerCase().includes(search.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(search.toLowerCase())
    )

  const pending  = applySearch(missions.filter(m => m.status === 'assignee_agent'))
  const active   = applySearch(missions.filter(m => m.status === 'en_cours'))
  const done     = applySearch(missions.filter(m => ['resolue', 'refusee_agent', 'cloturee'].includes(m.status)))
  const shown    = tab === 'pending' ? pending : tab === 'active' ? active : done

  const urgentCount = pending.filter(m => normPri(m.priority) === 'haute').length

  return (
    <AgentLayout title="Mes Missions">
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: '14px', fontWeight: 700, fontSize: 13 } }} />

      <div className="max-w-7xl mx-auto space-y-7">

        {/* ── Welcome bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#0A1628]">
              Bonjour {user.first_name} 👋
            </h1>
            <p className="text-slate-400 text-sm font-medium mt-0.5">
              {pending.length > 0
                ? `${pending.length} mission${pending.length > 1 ? 's' : ''} en attente de décision`
                : 'Toutes vos missions ont été traitées'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="pl-4 pr-10 py-2 text-xs bg-white border border-slate-200 rounded-xl
                           outline-none focus:border-[#1557FF] transition-all text-slate-700
                           placeholder-slate-400 w-44" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button onClick={() => load(true)} disabled={refreshing}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#1557FF]
                         px-3 py-2 rounded-xl hover:bg-blue-50 transition-all border border-slate-200">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* ── KPI strip ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'À accepter', val: pending.length,
              color: '#4F46E5', bg: '#EEF2FF',
              icon: <Clock className="w-6 h-6 text-indigo-500" />,
              sub: urgentCount > 0 ? `dont ${urgentCount} urgente${urgentCount > 1 ? 's' : ''}` : 'Aucune urgence',
              subColor: urgentCount > 0 ? 'text-red-500' : 'text-slate-400',
            },
            {
              label: 'En cours', val: active.length,
              color: '#D97706', bg: '#FFFBEB',
              icon: <Zap className="w-6 h-6 text-amber-500" />,
              sub: 'Interventions actives', subColor: 'text-slate-400',
            },
            {
              label: 'Terminées', val: done.filter(m => ['resolue','cloturee'].includes(m.status)).length,
              color: '#15803D', bg: '#DCFCE7',
              icon: <CheckCircle className="w-6 h-6 text-emerald-500" />,
              sub: 'Ce mois', subColor: 'text-slate-400',
            },
          ].map(s => (
            <div key={s.label}
              className="bg-white rounded-3xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="w-13 h-13 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: s.bg, width: 52, height: 52 }}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-black leading-none" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
                <p className={`text-[9px] font-bold mt-0.5 ${s.subColor}`}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Urgent alert ── */}
        {urgentCount > 0 && (
          <div className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <Flame className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-red-700">
                {urgentCount} mission{urgentCount > 1 ? 's' : ''} haute priorité en attente
              </p>
              <p className="text-[10px] text-red-500 font-medium mt-0.5">
                Interventions urgentes — répondez dès que possible pour éviter des pénalités
              </p>
            </div>
            <button onClick={() => setTab('pending')}
              className="text-[10px] font-black text-red-600 border border-red-300 px-3 py-1.5 rounded-xl
                         hover:bg-red-100 transition-all flex-shrink-0">
              Voir →
            </button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm w-fit">
          {[
            { key: 'pending', label: 'À accepter', count: pending.length, activeClass: 'bg-indigo-500' },
            { key: 'active',  label: 'En cours',   count: active.length,  activeClass: 'bg-amber-500'  },
            { key: 'done',    label: 'Historique', count: done.length,    activeClass: ''              },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                tab === t.key ? 'bg-[#1557FF] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  tab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="flex items-center justify-center py-28">
            <Loader2 className="w-9 h-9 text-[#1557FF] animate-spin" />
          </div>
        ) : shown.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
              {tab === 'pending' ? <Clock className="w-8 h-8 text-slate-200" /> :
               tab === 'active'  ? <Zap className="w-8 h-8 text-slate-200" />   :
               <CheckCircle className="w-8 h-8 text-slate-200" />}
            </div>
            <p className="font-black text-slate-400 text-base">
              {tab === 'pending' ? 'Aucune mission en attente' :
               tab === 'active'  ? 'Aucune intervention en cours' : 'Aucun historique'}
            </p>
            <p className="text-sm text-slate-400 mt-2">
              {tab === 'pending' ? 'Votre Chef de Service vous notifiera dès qu\'une tâche vous est confiée.' :
               tab === 'active'  ? 'Acceptez des missions pour commencer à intervenir.' :
               'Vos missions terminées et refusées apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="flex items-center gap-4 py-3 px-5 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <div className="w-24">Date</div>
              <div className="flex-1">Signalement</div>
              <div className="w-32">Catégorie</div>
              <div className="w-32">Priorité</div>
              <div className="w-24 text-right">Votes</div>
            </div>
            {/* Table Body */}
            <div className="divide-y divide-slate-50">
              {shown.map(m => (
                <MissionRow key={m.id} m={m} myId={myId}
                  isSelected={openId === m.id}
                  onOpen={setOpenId}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      <DetailDrawer
        missionId={openId}
        myId={myId}
        onClose={() => setOpenId(null)}
        onAccepted={handleAccepted}
        onRefused={handleRefused}
      />

      {/* ── Refuse Modal from card ── */}
      {refuseM && (
        <RefuseModal
          mission={refuseM}
          onClose={() => setRefuseM(null)}
          onRefused={id => { handleRefused(id); setRefuseM(null) }}
        />
      )}
    </AgentLayout>
  )
}

// tiny helper used in history tab (wasn't importing from Sk)
const Skel = ({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) => (
  <div className={`${w} ${h} bg-slate-100 rounded-xl animate-pulse`} />
)

export default AgentDashboard
