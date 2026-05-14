// src/pages/Agent/AgentDeclarationDetail.tsx
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Calendar, Camera, CheckCircle, XCircle,
  Clock, User, AlertTriangle, Loader2, Send, Lock, Unlock,
  FileText, MessageSquare, Image, ChevronRight
} from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token') || ''

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  assignee_agent: { label: 'À Accepter',      color: '#6366F1', bg: '#EEF2FF', icon: Lock        },
  en_cours:       { label: 'En Intervention',  color: '#F59E0B', bg: '#FFFBEB', icon: Unlock      },
  resolue:        { label: 'Résolue',          color: '#10B981', bg: '#ECFDF5', icon: CheckCircle },
  refusee_agent:  { label: 'Refusée',          color: '#EF4444', bg: '#FEF2F2', icon: XCircle     },
  cloturee:       { label: 'Clôturée',         color: '#64748B', bg: '#F8FAFC', icon: CheckCircle },
}

const TIMELINE = [
  { key: 'assignee_agent', label: 'Assignée' },
  { key: 'en_cours',       label: 'En cours' },
  { key: 'resolue',        label: 'Résolue'  },
]

function stepIndex(status: string) {
  const i = TIMELINE.findIndex(t => t.key === status)
  return i === -1 ? 0 : i
}

const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border min-w-[300px] ${type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
      {type === 'ok' ? <CheckCircle size={20} className="text-emerald-500 shrink-0" /> : <AlertTriangle size={20} className="text-red-500 shrink-0" />}
      <p className="text-sm font-semibold">{msg}</p>
      <button onClick={onClose} className="ml-auto text-current opacity-40 hover:opacity-100">✕</button>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
const AgentDeclarationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [decl, setDecl]         = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [busy, setBusy]         = useState(false)

  // Accept form
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0])
  // Resolve form
  const [photo, setPhoto]         = useState<File | null>(null)
  const [preview, setPreview]     = useState<string | null>(null)
  const [report, setReport]       = useState('')
  const [dateFin, setDateFin]     = useState(new Date().toISOString().split('T')[0])
  // Refuse
  const [refuseReason, setRefuseReason] = useState('')
  const [showRefuse, setShowRefuse]     = useState(false)
  // Comment
  const [comment, setComment]     = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, type: 'ok' | 'err') => setToast({ msg, type })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${id}`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (!res.ok) throw new Error('Not found')
      setDecl(await res.json())
    } catch {
      showToast('Déclaration introuvable.', 'err')
      setTimeout(() => navigate('/agent/dashboard'), 2000)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    setBusy(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ date_debut: dateDebut })
      })
      const d = await res.json()
      if (!res.ok) { showToast(d.error || 'Erreur', 'err'); return }
      showToast('Mission acceptée !', 'ok')
      load()
    } finally { setBusy(false) }
  }

  const handleRefuse = async () => {
    if (!refuseReason.trim()) { showToast('Motif obligatoire', 'err'); return }
    setBusy(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/refuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ raison: refuseReason })
      })
      const d = await res.json()
      if (!res.ok) { showToast(d.error || 'Erreur', 'err'); return }
      showToast('Mission refusée.', 'ok')
      setShowRefuse(false)
      load()
    } finally { setBusy(false) }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setPhoto(f); setPreview(URL.createObjectURL(f)) }
  }

  const handleResolve = async () => {
    if (!photo)        { showToast('Photo preuve obligatoire', 'err'); return }
    if (!report.trim()) { showToast('Rapport obligatoire', 'err'); return }
    setBusy(true)
    try {
      // 1. Upload photo
      const fd = new FormData(); fd.append('photo', photo)
      const pr = await fetch(`${API}/agent/declarations/${id}/photo`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd
      })
      if (!pr.ok) { showToast('Erreur upload photo', 'err'); return }

      // 2. Resolve
      const res = await fetch(`${API}/agent/declarations/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ rapport_interne: report, date_fin: dateFin })
      })
      const d = await res.json()
      if (!res.ok) { showToast(d.error || 'Erreur', 'err'); return }
      showToast('Mission résolue avec succès !', 'ok')
      load()
    } finally { setBusy(false) }
  }

  const handleComment = async () => {
    if (!comment.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ content: comment })
      })
      if (!res.ok) { showToast('Erreur commentaire', 'err'); return }
      setComment('')
      showToast('Commentaire ajouté.', 'ok')
      load()
    } finally { setBusy(false) }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <AgentLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 size={36} className="animate-spin text-emerald-500" />
      </div>
    </AgentLayout>
  )

  if (!decl) return null

  const cfg = STATUS_CFG[decl.status] || STATUS_CFG['assignee_agent']
  const step = stepIndex(decl.status)
  const StatusIcon = cfg.icon

  return (
    <AgentLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Back + Title */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/agent/dashboard')}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mission #{decl.ref_citoyen || decl.id?.slice(0,8)}</p>
            <h1 className="text-xl font-black text-[#0A1628] truncate">{decl.title}</h1>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ color: cfg.color, background: cfg.bg }}>
            <StatusIcon size={13} /> {cfg.label}
          </span>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="relative flex items-center justify-between">
            <div className="absolute top-5 left-10 right-10 h-0.5 bg-slate-100" />
            {TIMELINE.map((s, i) => (
              <div key={s.key} className="flex flex-col items-center gap-2 relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 z-10 transition-all ${
                  i <= step ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-300'
                }`}>
                  {i < step ? <CheckCircle size={18} /> : i + 1}
                </div>
                <span className={`text-[11px] font-bold ${i <= step ? 'text-emerald-600' : 'text-slate-400'}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Info */}
          <div className="lg:col-span-2 space-y-4">

            {/* Description */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} /> Description
              </h2>
              <p className="text-slate-700 text-sm leading-relaxed">{decl.description || 'Aucune description.'}</p>
              <div className="flex items-start gap-3 pt-4 border-t border-slate-50">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0A1628]">{decl.address || decl.delegations?.name || 'Adresse non précisée'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{decl.category}</p>
                </div>
              </div>
            </div>

            {/* Photos */}
            {decl.photos?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Image size={14} /> Photos ({decl.photos.length})
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {decl.photos.map((p: any) => (
                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                      <img src={p.url} alt="" className="w-full h-28 object-cover rounded-xl hover:opacity-90 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare size={14} /> Commentaires internes ({decl.comments?.length || 0})
              </h2>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {decl.comments?.length === 0 && <p className="text-xs text-slate-400 italic">Aucun commentaire.</p>}
                {decl.comments?.map((c: any) => (
                  <div key={c.id} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <User size={12} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">{c.author?.first_name} {c.author?.last_name}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">{fmt(c.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-600">{c.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <input value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Ajouter un commentaire interne..."
                  className="flex-1 text-sm px-4 py-2.5 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-emerald-200"
                  onKeyDown={e => e.key === 'Enter' && handleComment()}
                />
                <button onClick={handleComment} disabled={busy || !comment.trim()}
                  className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-40 transition-colors">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Actions + Meta */}
          <div className="space-y-4">

            {/* Meta */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Informations</h2>
              {[
                { icon: Calendar, label: 'Soumis le', value: fmt(decl.created_at) },
                { icon: User,     label: 'Citoyen',   value: decl.citizen ? `${decl.citizen.first_name} ${decl.citizen.last_name}` : '—' },
                { icon: Clock,    label: 'Début',      value: fmt(decl.started_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
                    <p className="text-sm font-bold text-[#0A1628]">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── ACTION: Accept ── */}
            {decl.status === 'assignee_agent' && (
              <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5 space-y-4">
                <p className="text-sm font-bold text-indigo-800">Mission assignée — Accepter ou refuser ?</p>
                <div>
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Date de début prévue</label>
                  <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-indigo-100 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
                <button onClick={handleAccept} disabled={busy}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                  Accepter la mission
                </button>
                <button onClick={() => setShowRefuse(v => !v)}
                  className="w-full py-2.5 text-red-400 text-sm font-bold hover:text-red-600 transition-colors">
                  Refuser la mission
                </button>
                {showRefuse && (
                  <div className="space-y-2 pt-2 border-t border-indigo-100">
                    <textarea value={refuseReason} onChange={e => setRefuseReason(e.target.value)}
                      placeholder="Motif de refus obligatoire..."
                      className="w-full h-20 px-4 py-3 rounded-xl bg-white border border-red-100 text-sm outline-none resize-none focus:ring-2 focus:ring-red-100" />
                    <button onClick={handleRefuse} disabled={busy || !refuseReason.trim()}
                      className="w-full py-2.5 bg-red-500 text-white rounded-xl text-sm font-black disabled:opacity-40 hover:bg-red-600 transition-colors">
                      Confirmer le refus
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── ACTION: Resolve ── */}
            {decl.status === 'en_cours' && (
              <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5 space-y-4">
                <p className="text-sm font-bold text-amber-800">Finaliser l'intervention</p>

                {/* Photo upload */}
                <div>
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-2">Photo preuve (obligatoire)</label>
                  <div onClick={() => fileRef.current?.click()}
                    className={`relative h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all ${preview ? 'border-emerald-400' : 'border-amber-200 hover:border-amber-400'}`}>
                    {preview ? (
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera size={24} className="text-amber-300 mb-2" />
                        <p className="text-xs text-amber-400 font-bold">Cliquer pour ajouter une photo</p>
                      </>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                </div>

                <textarea value={report} onChange={e => setReport(e.target.value)}
                  placeholder="Rapport d'intervention..."
                  className="w-full h-24 px-4 py-3 bg-white rounded-xl border border-amber-100 text-sm outline-none resize-none focus:ring-2 focus:ring-amber-100" />

                <div>
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">Date de clôture</label>
                  <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-amber-100 text-sm font-bold text-slate-700 outline-none" />
                </div>

                <button onClick={handleResolve} disabled={busy || !photo || !report.trim()}
                  className="w-full py-3 bg-emerald-500 text-white rounded-xl text-sm font-black hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Marquer comme résolue
                </button>
              </div>
            )}

            {/* ── Resolved state ── */}
            {(decl.status === 'resolue' || decl.status === 'cloturee') && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5 flex flex-col items-center gap-3 text-center">
                <CheckCircle size={40} className="text-emerald-500" />
                <p className="font-black text-emerald-800">Mission terminée</p>
                <p className="text-xs text-emerald-600">Résolue le {fmt(decl.resolved_at)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </AgentLayout>
  )
}

export default AgentDeclarationDetail
