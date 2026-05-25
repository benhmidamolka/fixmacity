import React, { useEffect, useState, useRef } from 'react'
import {
  X, Loader2, MapPin, Calendar, User, Phone, Mail,
  CheckCircle2, MessageSquare, Send, Building2, Layers,
  Activity, Info, FileText, Camera,
  XCircle, Zap, ArrowDown, History, Image as ImageIcon, Clock, CheckSquare, AlertTriangle
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''
const hdr = () => ({ Authorization: `Bearer ${tok()}` })
const hjson = () => ({ ...hdr(), 'Content-Type': 'application/json' })

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  soumise:        { label: 'Soumise',        color: '#d97706', bg: '#fffbeb', dot: '#f59e0b' },
  assignee_chef:  { label: 'En attente Chef', color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
  assignee_agent: { label: 'Assignée',       color: '#1d4ed8', bg: '#dbeafe', dot: '#3b82f6' },
  en_cours:       { label: 'En cours',       color: '#c2410c', bg: '#ffedd5', dot: '#f97316' },
  resolue:        { label: 'Résolue',        color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
  cloturee:       { label: 'Clôturée',       color: '#475569', bg: '#f1f5f9', dot: '#94a3b8' },
  refusee_chef:   { label: 'Refusée Chef',   color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
  refusee_agent:  { label: 'Refusée Agent',  color: '#b91c1c', bg: '#fee2e2', dot: '#ef4444' },
}

const CHANNEL_CFG: Record<string, { label: string; color: string; bg: string; role: string }> = {
  chef_agent:     { label: 'Chef ↔ Agent',      color: '#1d4ed8', bg: '#dbeafe', role: 'Agent' },
  interdept:      { label: 'Inter-département', color: '#0891b2', bg: '#e0f2fe', role: 'Agent' },
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
const fmtFull = (d: string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const fmtTime = (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

function getCatEmoji(cat?: string) {
  const m: Record<string, string> = {
    'Voirie': '🛣️', 'Éclairage Public': '💡', 'Propreté': '🗑️',
    'Espaces Verts': '🌿', 'Réseaux': '💧', 'Signalisation': '🚦',
    'Administratif': '🏢', 'Suggestions': '💬'
  }
  return cat ? (m[cat] || '📌') : '📌'
}

const StatusPill = ({ status }: { status: string }) => {
  const c = STATUS_CFG[status] || { label: status, color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap"
      style={{ color: c.color, background: c.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

const PriPill = ({ priority }: { priority: string }) => {
  const lo = priority?.toLowerCase()
  const isHigh = ['haute','high','urgent','urgente','critique'].includes(lo)
  const isMed  = ['moyenne','medium'].includes(lo)
  const color  = isHigh ? '#dc2626' : isMed ? '#d97706' : '#059669'
  const bg     = isHigh ? '#fee2e2' : isMed ? '#fef3c7' : '#dcfce7'
  const label  = isHigh ? 'Urgent' : isMed ? 'Normal' : 'Faible'
  const Icon   = isHigh ? Zap : isMed ? Activity : ArrowDown
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap"
      style={{ color, background: bg }}>
      <Icon size={10} />
      {label}
    </span>
  )
}

function RefuseModal({ tacheId, onClose, onDone }: { tacheId: string; onClose: () => void; onDone: () => void }) {
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const REASONS = ['Hors de mes compétences', 'Matériel manquant', 'Surcharge de travail', 'Doublon', 'Autre']

  const go = async () => {
    if (!reason.trim()) { setError('Motif obligatoire.'); return }
    setLoading(true)
    const res = await fetch(`${API}/agent/declarations/${tacheId}/refuse`, {
      method: 'POST', headers: hjson(), body: JSON.stringify({ raison: reason })
    }).catch(() => null)
    if (!res || !res.ok) { setLoading(false); setError('Erreur lors du refus.'); return }
    toast.success('Mission refusée')
    onDone(); onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,.6)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 bg-red-50/60 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-red-100 flex items-center justify-center"><XCircle size={16} className="text-red-500" /></div>
            <p className="text-sm font-black text-red-700">Refuser l'assignation</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-400"><X size={14} /></button>
        </div>
        <div className="p-6 space-y-3">
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">Le Chef de Service sera notifié et devra réassigner ce dossier.</div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motif *</p>
          {REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${reason === r ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
              {r}
            </button>
          ))}
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Précisions…" rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-400 resize-none text-slate-700 placeholder-slate-400" />
          {error && <div className="text-xs text-red-500 font-bold">{error}</div>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Annuler</button>
          <button onClick={go} disabled={loading || !reason.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-sm disabled:opacity-40 transition-all">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <><XCircle size={14} /> Confirmer</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function ResolveModal({ tacheId, onClose, onDone }: { tacheId: string; onClose: () => void; onDone: () => void }) {
  const [reason,  setReason]  = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const go = async () => {
    if (!photoFile) return toast.error("La photo de l'intervention est obligatoire.")
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('photo', photoFile)
      const photoRes = await fetch(`${API}/agent/declarations/${tacheId}/photo`, {
        method: 'POST', headers: hdr(), body: formData
      })
      if (!photoRes.ok) throw new Error('Erreur upload photo')

      const res = await fetch(`${API}/agent/declarations/${tacheId}/resolve`, {
        method: 'POST', headers: hjson(), body: JSON.stringify({ rapport_interne: reason || 'Résolu.' })
      })
      if (!res.ok) throw new Error('Erreur résolution')
      
      toast.success('Mission clôturée avec succès')
      onDone(); onClose()
    } catch (e) {
      toast.error('Une erreur est survenue.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,.6)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center"><CheckCircle2 size={16} className="text-emerald-500" /></div>
            <p className="text-sm font-black text-emerald-700">Clôturer l'intervention</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-400"><X size={14} /></button>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-2xl cursor-pointer hover:bg-emerald-100/50 overflow-hidden relative">
            {photoPreview ? (
               <img src={photoPreview} alt="Aperçu" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4">
                <Camera className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span className="text-xs font-bold text-emerald-700 block">Photo (Preuve de résolution) *</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              if (e.target.files && e.target.files[0]) {
                setPhotoFile(e.target.files[0])
                setPhotoPreview(URL.createObjectURL(e.target.files[0]))
              }
            }} />
          </label>

          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Rapport d'intervention (Optionnel)…" rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 resize-none text-slate-700 placeholder-slate-400" />
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Annuler</button>
          <button onClick={go} disabled={loading || !photoFile}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm disabled:opacity-40 transition-all">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={14} /> Clôturer</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AgentDeclarationDetail({ tacheId, onClose, onAccepted, onRejected }: any) {
  const [decl,    setDecl]    = useState<any | null>(null)
  const [photos,  setPhotos]  = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [comments,setComments]= useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [tab,     setTab]     = useState<'info' | 'photos' | 'history' | 'comments'>('info')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [channel, setChannel] = useState<'chef_agent' | 'interdept'>('chef_agent')
  const [msg,     setMsg]     = useState('')
  const [sending, setSending] = useState(false)
  const [showRefuse, setShowRefuse] = useState(false)
  const [showResolve, setShowResolve] = useState(false)
  
  const endRef = useRef<HTMLDivElement>(null)
  const me = JSON.parse(localStorage.getItem('fmc_user') || '{}')

  const fetchDetail = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/agent/declarations/${tacheId}`, { headers: hdr() })
      if (!res.ok) throw new Error('Introuvable')
      const d = await res.json()
      setDecl(d)
      setPhotos(d.photos || [])
      setHistory(d.history || [])
      setComments(d.comments || [])
    } catch (e) {
      toast.error('Erreur chargement')
      onClose()
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchDetail() }, [tacheId])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments.length, channel, tab])

  const sendMsg = async () => {
    if (!msg.trim() || !decl) return
    setSending(true)
    try {
      const r = await fetch(`${API}/agent/declarations/${tacheId}/comments`, {
        method: 'POST', headers: hjson(),
        body: JSON.stringify({ content: msg.trim(), channel })
      })
      if (r.ok) {
        const d = await r.json()
        setComments(p => [...p, { ...d.comment, user_id: me.id, user: { ...me, role: 'agent' } }])
        setMsg('')
      }
    } catch {} finally { setSending(false) }
  }

  const handleAccept = async () => {
    try {
      setActionLoading(true)
      const res = await fetch(`${API}/agent/declarations/${tacheId}/accept`, {
        method: 'POST', headers: hjson()
      })
      if (!res.ok) throw new Error('Erreur')
      toast.success('Mission acceptée !')
      onAccepted?.()
      fetchDetail()
    } catch (e) {
      toast.error("Erreur lors de l'acceptation")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/60 backdrop-blur-md">
      <div className="w-full max-w-[680px] bg-slate-50 h-full shadow-2xl flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#6C63FF]" />
      </div>
    </div>
  )

  if (!decl) return null

  const isAssigned = decl.status === 'assignee_agent'
  const isEnCours = decl.status === 'en_cours'
  const isResolue = decl.status === 'resolue' || decl.status === 'cloturee'

  const photoAvant  = photos.find(p => p.photo_type === 'photo_avant' || p.photo_type === 'before' || !p.photo_type) || (decl.photo_avant ? { id: 'inline', url: decl.photo_avant, photo_type: 'photo_avant' } : null) || (decl.image_url ? { id: 'inline2', url: decl.image_url, photo_type: 'photo_avant' } : null)
  const photosApres = photos.filter(p => p.photo_type === 'photo_apres' || p.photo_type === 'after')

  const filteredComments = comments.filter(c => !c.channel || c.channel === channel || c.channel === 'internal')

  const STEPS = ['soumise', 'assignee_chef', 'assignee_agent', 'en_cours', 'resolue', 'cloturee']
  const STEP_LABELS: Record<string, string> = { soumise: 'Soumis', assignee_chef: 'Chef', assignee_agent: 'Assigné', en_cours: 'En cours', resolue: 'Résolu', cloturee: 'Clôturé' }
  const stepIdx = STEPS.indexOf(decl.status || 'soumise')

  const TABS = [
    { key: 'info',     label: 'Infos',      icon: Info        },
    { key: 'photos',   label: 'Médias',     icon: Camera      },
    ...(isAssigned ? [] : [
      { key: 'history',  label: 'Progression', icon: Activity   },
      { key: 'comments', label: 'Commentaires', icon: MessageSquare, badge: filteredComments.length },
    ])
  ]

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-[680px] bg-white shadow-2xl flex flex-col border-l border-slate-100">

        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <StatusPill status={decl.status || 'soumise'} />
            {decl.ref_citoyen && <span className="font-mono text-[10px] font-black text-blue-600">{decl.ref_citoyen}</span>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAssigned && (
              <>
                <button disabled={actionLoading} onClick={handleAccept} className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-sm transition-all">
                  {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Accepter
                </button>
                <button disabled={actionLoading} onClick={() => setShowRefuse(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black border border-red-200 transition-all">
                  <XCircle size={13} /> Refuser
                </button>
              </>
            )}
            {isEnCours && (
              <button disabled={actionLoading} onClick={() => setShowResolve(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-green-500 hover:bg-green-600 text-white text-xs font-black shadow-sm transition-all">
                <CheckSquare size={13} /> Résoudre
              </button>
            )}
            <button onClick={onClose} className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-xl flex-shrink-0">
              {getCatEmoji(decl.category)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-black text-slate-900 leading-tight">{decl.title}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {decl.category && <span className="text-[10px] font-bold text-slate-400">{decl.category}</span>}
                <span className="text-[10px] text-slate-300">·</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Calendar size={9} /> {fmtDate(decl.created_at)}</span>
                <PriPill priority={decl.priority} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {STEPS.map((step, i) => {
              const done    = i < stepIdx
              const current = i === stepIdx
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-0.5 flex-1">
                    <div className={`h-1.5 w-full rounded-full transition-all ${done ? 'bg-[#1557FF]' : current ? 'bg-blue-300' : 'bg-slate-100'}`} />
                    <span className={`text-[8px] font-black whitespace-nowrap ${done || current ? 'text-[#1557FF]' : 'text-slate-300'}`}>
                      {STEP_LABELS[step]}
                    </span>
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </div>

        <div className="flex-shrink-0 flex border-b border-slate-100 px-2 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-black border-b-2 transition-all whitespace-nowrap ${tab === t.key ? 'border-[#1557FF] text-[#1557FF]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <t.icon size={13} />
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-blue-100 text-[#1557FF]' : 'bg-slate-100 text-slate-400'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 relative">

          {tab === 'info' && (
            <div className="absolute inset-0 overflow-y-auto p-6 space-y-5">
              
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[.18em] mb-3 flex items-center gap-1.5">
                  <User size={10} /> 1. Citoyen déclarant
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black">
                    {(decl.citizen?.first_name || decl.citizen_name || 'C')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{decl.citizen ? `${decl.citizen.first_name} ${decl.citizen.last_name}` : (decl.citizen_name || 'Anonyme')}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                      {(decl.citizen?.phone || decl.citizen_phone) && <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5"><Phone size={12}/> {decl.citizen?.phone || decl.citizen_phone}</span>}
                      {(decl.citizen?.email || decl.citizen_email) && <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5"><Mail size={12}/> {decl.citizen?.email || decl.citizen_email}</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5">
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-[.18em] mb-2 flex items-center gap-1.5">
                  <FileText size={10} /> 2. Description du problème
                </p>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">
                  {decl.description || <span className="italic text-slate-400">Aucune description fournie.</span>}
                </p>
              </div>

              {photoAvant && (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[.18em] mb-3 flex items-center gap-1.5">
                    <ImageIcon size={10} /> 3. Photo Avant
                  </p>
                  <img src={photoAvant.url} alt="Avant" className="w-full h-48 object-cover rounded-xl cursor-zoom-in border border-slate-100" onClick={() => setLightbox(photoAvant.url)} />
                </div>
              )}

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[.18em] mb-3 flex items-center gap-1.5">
                  <MapPin size={10} /> {photoAvant ? '4' : '3'}. Localisation
                </p>
                {decl.address ? (
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <MapPin size={14} className="text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{decl.address}</p>
                      {decl.latitude && decl.longitude && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{Number(decl.latitude).toFixed(5)}°N, {Number(decl.longitude).toFixed(5)}°E</p>
                      )}
                    </div>
                  </div>
                ) : <p className="text-xs text-slate-400 italic">Localisation non précisée.</p>}
                
                {decl.is_sensitive && (
                  <div className="mt-2.5 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600">
                    <AlertTriangle size={12} /> Zone sensible : {decl.sensitive_type || 'détectée'}
                  </div>
                )}
              </div>

              <div className="bg-purple-50/30 border border-purple-100 rounded-2xl p-5">
                <p className="text-[9px] font-black text-purple-600 uppercase tracking-[.18em] mb-3 flex items-center gap-1.5">
                  <Layers size={10} /> {photoAvant ? '5' : '4'}. Équipe & Assignations
                </p>
                {decl.other_assignments?.length > 0 ? (
                  <>
                    <p className="text-xs text-slate-500 font-semibold mb-4">
                      Cette mission nécessite l'intervention de plusieurs départements/agents.
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {decl.other_assignments.map((oa: any) => (
                        <div key={oa.id} className="flex flex-col bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                             <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0 border border-purple-100"><Building2 size={14} /></div>
                             <div className="min-w-0">
                               <p className="text-xs font-black text-slate-800 truncate">{oa.department?.name_fr || 'Département Inconnu'}</p>
                               <p className="text-[10px] font-bold text-slate-500 truncate">{oa.agent ? `Agent assigné: ${oa.agent.first_name} ${oa.agent.last_name}` : "En attente d'agent"}</p>
                             </div>
                          </div>
                          <div className="mt-auto pt-2 border-t border-slate-100">
                             <StatusPill status={oa.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs font-medium text-slate-500">Vous êtes le seul agent/département assigné à cette déclaration.</p>
                )}
              </div>
              
              {isResolue && decl.resolved_at && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-black text-emerald-800">Dossier résolu</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">Clôturé le {fmtFull(decl.resolved_at)}</p>
                  </div>
                </div>
              )}

              {isAssigned && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="text-amber-600 shrink-0" size={16} /> Mission en attente de votre réponse
                    </h3>
                    <p className="text-xs text-amber-700/80 font-medium mt-1 leading-relaxed">
                      Cette tâche vous a été assignée par votre Chef de Service. Veuillez l'accepter pour commencer l'intervention ou la refuser avec un motif.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button disabled={actionLoading} onClick={handleAccept}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-md shadow-emerald-500/10 transition-all">
                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      Accepter
                    </button>
                    <button disabled={actionLoading} onClick={() => setShowRefuse(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-red-200 hover:border-red-300 text-red-600 font-black text-sm hover:bg-red-50/40 transition-all">
                      <XCircle size={16} />
                      Refuser
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'photos' && (
            <div className="absolute inset-0 overflow-y-auto p-6 space-y-5">
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <p className="text-xs font-black text-slate-700">Photo avant — Déclarée par le citoyen</p>
                </div>
                <div className="aspect-video bg-slate-100 flex items-center justify-center">
                  {photoAvant ? (
                    <img src={photoAvant.url} alt="Avant" className="w-full h-full object-cover cursor-zoom-in" onClick={() => setLightbox(photoAvant.url)} />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <ImageIcon size={28} className="text-slate-300" />
                      <p className="text-xs font-bold">Aucune photo soumise</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-xs font-black text-slate-700">Photos après intervention — Par vous</p>
                </div>
                {photosApres.length > 0 ? (
                  <div className="grid grid-cols-2 gap-0.5">
                    {photosApres.map((p: any, i: number) => (
                      <div key={p.id || i} className="aspect-video bg-slate-100 overflow-hidden relative">
                        <img src={p.url} alt={`Après ${i + 1}`} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setLightbox(p.url)} />
                        <div className="absolute bottom-2 left-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">✓ Après {i + 1}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Clock size={24} className="text-slate-300" />
                    <p className="text-xs font-bold">{isResolue ? 'Aucune photo.' : "En attente de votre intervention."}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="absolute inset-0 overflow-y-auto p-6">
              {!isAssigned && !isResolue && (
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mb-6">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Mettre à jour le statut</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowResolve(true)} className="px-3.5 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm">
                      <CheckSquare size={13} /> Résoudre (Preuve photo)
                    </button>
                    <button onClick={async () => {
                      setActionLoading(true)
                      try {
                        const res = await fetch(`${API}/agent/declarations/${tacheId}/close`, { method: 'POST', headers: hjson() })
                        if (!res.ok) throw new Error()
                        toast.success('Mission clôturée avec succès')
                        fetchDetail()
                        onAccepted?.()
                      } catch { toast.error('Erreur lors de la clôture') }
                      finally { setActionLoading(false) }
                    }} className="px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-black transition-all border border-slate-200">
                      Clôturer la mission
                    </button>
                  </div>
                </div>
              )}
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <History size={24} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-400">Aucun historique</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-slate-100" />
                  {[...history].reverse().map((h: any, i: number) => {
                    const sc = STATUS_CFG[h.new_status]
                    return (
                      <div key={h.id || i} className="flex gap-4 pb-5 last:pb-0 relative">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0" style={{ background: sc?.bg || '#f1f5f9', border: `2px solid ${sc?.dot || '#94a3b8'}` }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: sc?.dot || '#94a3b8' }} />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-xs font-black" style={{ color: sc?.color || '#64748b' }}>{sc?.label || h.new_status}</span>
                            <span className="text-[10px] text-slate-400">{fmtFull(h.created_at)}</span>
                          </div>
                          {h.user && <p className="text-[10px] text-slate-400">par {h.user.first_name} {h.user.last_name} · <span className="font-bold">{h.user.role}</span></p>}
                          {(h.raison || h.comment) && (
                            <div className="mt-1.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-[10px] text-amber-700 italic">«{h.raison || h.comment}»</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'comments' && (
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-shrink-0 flex gap-2 p-4 border-b border-slate-100 flex-wrap">
                {(['chef_agent', 'interdept'] as const).map(ch => {
                  const cfg = CHANNEL_CFG[ch]
                  const active = channel === ch
                  const count = comments.filter(c => c.channel === ch || (!c.channel && ch === 'chef_agent')).length
                  return (
                    <button key={ch} onClick={() => setChannel(ch)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[10px] font-black transition-all border" style={active ? { background: cfg.color, color: 'white', borderColor: cfg.color } : { background: 'transparent', color: '#94a3b8', borderColor: '#e2e8f0' }}>
                      {cfg.label}
                      {count > 0 && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}
                    </button>
                  )
                })}
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
                {filteredComments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center"><MessageSquare size={18} className="text-slate-300" /></div>
                    <p className="text-xs font-bold text-slate-400">Aucun commentaire</p>
                  </div>
                ) : filteredComments.map((c: any, i: number) => {
                  const isMe = c.user_id === me.id
                  const name = c.user ? `${c.user.first_name} ${c.user.last_name}` : '?'
                  const roleLabel = c.user?.role === 'president' ? 'Président' : c.user?.role === 'chef' ? 'Chef' : c.user?.role === 'agent' ? 'Agent' : c.user?.role || ''
                  const cfg = CHANNEL_CFG[channel]
                  return (
                    <div key={c.id || i} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-sm" style={{ background: isMe ? cfg.color : c.user?.role === 'president' ? '#7c3aed' : '#94a3b8' }}>
                        {isMe ? 'M' : name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                      </div>
                      <div className={`flex flex-col max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[10px] font-black text-slate-700">{isMe ? 'Vous' : name}</span>
                          {roleLabel && <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{roleLabel}</span>}
                          <span className="text-[9px] text-slate-400">{fmtTime(c.created_at)}</span>
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${isMe ? 'rounded-tr-sm text-white' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`} style={isMe ? { background: cfg.color } : {}}>
                          {c.content}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>
              <div className="flex-shrink-0 p-5 border-t border-slate-100 bg-white">
                <div className="flex gap-2.5">
                  <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()} placeholder={`Commentaire — ${CHANNEL_CFG[channel].label}…`} className="flex-1 text-xs px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#1557FF] font-medium text-slate-700 placeholder-slate-400" />
                  <button onClick={sendMsg} disabled={sending || !msg.trim()} className="w-10 h-10 rounded-2xl text-white disabled:opacity-40 flex items-center justify-center flex-shrink-0" style={{ background: CHANNEL_CFG[channel].color }}>
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {showRefuse && <RefuseModal tacheId={tacheId} onClose={() => setShowRefuse(false)} onDone={() => { onRejected?.(); onClose(); }} />}
      {showResolve && <ResolveModal tacheId={tacheId} onClose={() => setShowResolve(false)} onDone={() => { onAccepted?.(); fetchDetail(); }} />}

      {lightbox && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 backdrop-blur-md" onClick={() => setLightbox(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <img src={lightbox} alt="Agrandie" className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-2xl" />
            <button onClick={() => setLightbox(null)} className="absolute -top-12 right-0 bg-white/15 text-white hover:bg-white/25 w-10 h-10 rounded-full flex items-center justify-center transition-all">
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
