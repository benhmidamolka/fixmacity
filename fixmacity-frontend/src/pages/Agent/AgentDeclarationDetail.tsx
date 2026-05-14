// src/pages/Agent/AgentDeclarationDetail.tsx
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Calendar, Camera, CheckCircle, XCircle,
  Clock, User, AlertTriangle, Loader2, Send, Lock, Unlock,
  FileText, MessageSquare, ChevronRight, Image as ImageIcon,
  Briefcase, Crown, UserCheck
} from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''
const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border min-w-[300px] ${
      type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
    }`}>
      {type === 'ok' ? <CheckCircle size={18} className="text-emerald-500 shrink-0" /> : <AlertTriangle size={18} className="text-red-500 shrink-0" />}
      <p className="text-sm font-semibold flex-1">{msg}</p>
      <button onClick={onClose} className="opacity-40 hover:opacity-100 text-sm">✕</button>
    </div>
  )
}

// ─── Channel config ───────────────────────────────────────────────────────────
const CHANNELS = [
  { key: 'chef',     label: 'Chef de Service', icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-200', desc: 'Message privé à votre chef' },
  { key: 'president',label: 'Président',       icon: Crown,     color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200',  desc: 'Message à la direction'    },
  { key: 'citizen',  label: 'Citoyen',         icon: UserCheck, color: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-200',desc: 'Message visible du citoyen' },
] as const

type Channel = 'chef' | 'president' | 'citizen'

// ─── Timeline ─────────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'assignee_agent', label: 'Assignée',   icon: Lock      },
  { key: 'en_cours',       label: 'En cours',   icon: Unlock    },
  { key: 'resolue',        label: 'Résolue',    icon: CheckCircle },
]
const stepIdx = (s: string) => STEPS.findIndex(t => t.key === s)

// ─── Main ─────────────────────────────────────────────────────────────────────
const AgentDeclarationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [decl, setDecl]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState(false)
  const [toast, setToast]     = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Accept
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0])
  // Refuse
  const [showRefuse, setShowRefuse]     = useState(false)
  const [refuseReason, setRefuseReason] = useState('')
  // Resolve
  const [photo, setPhoto]   = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [report, setReport] = useState('')
  const [dateFin, setDateFin] = useState(new Date().toISOString().split('T')[0])
  // Comments
  const [channel, setChannel] = useState<Channel>('chef')
  const [comment, setComment] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  const ok = (msg: string) => setToast({ msg, type: 'ok' })
  const err = (msg: string) => setToast({ msg, type: 'err' })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${id}`, { headers: { Authorization: `Bearer ${tok()}` } })
      if (!res.ok) throw new Error()
      setDecl(await res.json())
    } catch {
      err('Déclaration introuvable')
      setTimeout(() => navigate('/agent/dashboard'), 2000)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const handleAccept = async () => {
    setBusy(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ date_debut: dateDebut })
      })
      if (!res.ok) { err((await res.json()).error || 'Erreur'); return }
      ok('Mission acceptée !'); load()
    } finally { setBusy(false) }
  }

  const handleRefuse = async () => {
    if (!refuseReason.trim()) { err('Le motif de refus est obligatoire'); return }
    setBusy(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/refuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ raison: refuseReason })
      })
      if (!res.ok) { err((await res.json()).error || 'Erreur'); return }
      ok('Mission refusée'); setShowRefuse(false); load()
    } finally { setBusy(false) }
  }

  const handleResolve = async () => {
    // Exception 1: Mandatory Photo
    if (!photo) { err('Une photo de résolution est obligatoire'); return }
    
    // Exception: Mandatory Description
    if (!report.trim()) { err('Veuillez saisir une brève description de l\'intervention'); return }

    // Exception 4: Date Validation (End >= Start)
    if (decl.started_at && dateFin) {
      const d1 = new Date(decl.started_at)
      const d2 = new Date(dateFin)
      if (d2 < d1) {
        err('La date de fin doit être supérieure à la date de début');
        return;
      }
    }

    setBusy(true)
    try {
      const fd = new FormData(); fd.append('photo', photo)
      const pr = await fetch(`${API}/agent/declarations/${id}/photo`, {
        method: 'POST', headers: { Authorization: `Bearer ${tok()}` }, body: fd
      })
      if (!pr.ok) {
        const msg = (await pr.json()).error || 'Erreur upload photo'
        err(msg); return 
      }

      const res = await fetch(`${API}/agent/declarations/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ rapport_interne: report, date_fin: dateFin })
      })
      if (!res.ok) { err((await res.json()).error || 'Erreur'); return }
      ok('Mission résolue !'); load()
    } finally { setBusy(false) }
  }

  const handleComment = async () => {
    if (!comment.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ content: comment, channel })
      })
      if (!res.ok) { err('Erreur commentaire'); return }
      setComment(''); ok('Message envoyé'); load()
    } finally { setBusy(false) }
  }

  if (loading) return (
    <AgentLayout title="Chargement…">
      <div className="flex items-center justify-center h-64">
        <Loader2 size={36} className="animate-spin text-emerald-400" />
      </div>
    </AgentLayout>
  )
  if (!decl) return null

  const step = stepIdx(decl.status)
  const isActive  = decl.status === 'assignee_agent'
  const isOngoing = decl.status === 'en_cours'
  const isDone    = decl.status === 'resolue' || decl.status === 'cloturee'
  const activeCh  = CHANNELS.find(c => c.key === channel)!

  return (
    <AgentLayout title={decl.title || 'Détail Mission'}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Back + header */}
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/agent/dashboard')}
            className="mt-1 p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex-shrink-0">
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Mission #{decl.ref_citoyen || decl.id?.slice(0,8)}
            </p>
            <h1 className="text-xl font-black text-[#0A1628] leading-tight mt-0.5">{decl.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{decl.description}</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-slate-100 px-8 py-5">
          <div className="relative flex items-center justify-between">
            <div className="absolute top-5 left-12 right-12 h-0.5 bg-slate-100" />
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-col items-center gap-2 relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  i < step  ? 'bg-emerald-500 border-emerald-500 text-white' :
                  i === step ? 'bg-white border-emerald-500 text-emerald-600 ring-4 ring-emerald-50' :
                               'bg-white border-slate-200 text-slate-300'
                }`}>
                  {i < step ? <CheckCircle size={18} /> : <s.icon size={18} />}
                </div>
                <span className={`text-[11px] font-bold ${i <= step ? 'text-emerald-600' : 'text-slate-400'}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── LEFT col (3/5) ── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Info card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={13} /> Informations
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Calendar,  label: 'Soumis',  val: fmt(decl.created_at) },
                  { icon: Clock,     label: 'Début',   val: fmt(decl.started_at) },
                  { icon: MapPin,    label: 'Adresse', val: decl.address || decl.location_name || '—' },
                  { icon: User,      label: 'Citoyen', val: decl.citizen ? `${decl.citizen.first_name} ${decl.citizen.last_name}` : '—' },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="flex items-start gap-2.5 bg-slate-50 rounded-xl p-3">
                    <Icon size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
                      <p className="text-sm font-bold text-[#0A1628]">{val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photos */}
            {decl.photos?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={13} /> Photos ({decl.photos.length})
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {decl.photos.map((p: any) => (
                    <a key={p.id || p.url} href={p.url} target="_blank" rel="noreferrer">
                      <img src={p.url} alt="" className="w-full h-24 object-cover rounded-xl hover:opacity-90 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── Comments panel with channel selector ── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare size={13} /> Messages internes
              </h2>

              {/* Channel tabs */}
              <div className="flex gap-2">
                {CHANNELS.map(ch => (
                  <button key={ch.key} onClick={() => setChannel(ch.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      channel === ch.key
                        ? `${ch.color} ${ch.bg} ${ch.border}`
                        : 'text-slate-400 border-transparent hover:bg-slate-50'
                    }`}>
                    <ch.icon size={12} />
                    {ch.label}
                  </button>
                ))}
              </div>

              {/* Channel description */}
              <p className={`text-[11px] font-bold px-3 py-2 rounded-xl ${activeCh.bg} ${activeCh.color}`}>
                {activeCh.desc}
              </p>

              {/* Comment list */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {!decl.comments?.length
                  ? <p className="text-xs text-slate-400 italic py-4 text-center">Aucun message pour le moment.</p>
                  : decl.comments.map((c: any) => (
                    <div key={c.id} className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                          <User size={11} className="text-emerald-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          {c.author?.first_name} {c.author?.last_name}
                        </span>
                        {c.channel && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                            → {CHANNELS.find(ch => ch.key === c.channel)?.label || c.channel}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto">{fmt(c.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{c.content}</p>
                    </div>
                  ))
                }
              </div>

              {/* Input */}
              <div className={`flex gap-2 pt-2 border-t ${activeCh.border}`}>
                <input value={comment} onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                  placeholder={`Message à ${activeCh.label}…`}
                  className="flex-1 text-sm px-4 py-2.5 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-emerald-200 font-medium"
                />
                <button onClick={handleComment} disabled={busy || !comment.trim()}
                  className={`px-3 py-2.5 rounded-xl text-white transition-colors disabled:opacity-40 ${
                    channel === 'chef' ? 'bg-indigo-500 hover:bg-indigo-600' :
                    channel === 'president' ? 'bg-amber-500 hover:bg-amber-600' :
                    'bg-emerald-500 hover:bg-emerald-600'
                  }`}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT col (2/5) — action panel ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Accept */}
            {isActive && (
              <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-indigo-500" />
                  <p className="text-sm font-black text-indigo-800">Mission assignée</p>
                </div>
                <p className="text-xs text-indigo-600">Acceptez ou refusez cette mission.</p>

                <div>
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Date de début d'intervention</label>
                  <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-100 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>

                <button onClick={handleAccept} disabled={busy}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
                  Accepter la mission
                </button>

                <button onClick={() => setShowRefuse(v => !v)}
                  className="w-full py-2 text-red-400 text-xs font-bold hover:text-red-600 transition-colors">
                  Refuser la mission
                </button>

                {showRefuse && (
                  <div className="space-y-2 pt-2 border-t border-indigo-100">
                    <textarea value={refuseReason} onChange={e => setRefuseReason(e.target.value)}
                      placeholder="Motif du refus…"
                      className="w-full h-20 px-3 py-2 rounded-xl bg-white border border-red-100 text-sm outline-none resize-none focus:ring-2 focus:ring-red-100" />
                    <button onClick={handleRefuse} disabled={busy || !refuseReason.trim()}
                      className="w-full py-2 bg-red-500 text-white rounded-xl text-sm font-black disabled:opacity-40 hover:bg-red-600 transition-colors">
                      Confirmer le refus
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Resolve with photo upload */}
            {isOngoing && (
              <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Unlock size={16} className="text-amber-500" />
                  <p className="text-sm font-black text-amber-800">Finaliser l'intervention</p>
                </div>

                {/* Photo upload */}
                <div>
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-2">
                    Preuve d'intervention (obligatoire)
                  </label>
                  <div onClick={() => fileRef.current?.click()}
                    className={`relative h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all ${
                      preview ? 'border-emerald-400' : 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/50'
                    }`}>
                    {preview
                      ? <img src={preview} alt="" className="w-full h-full object-cover" />
                      : <>
                          <Camera size={28} className="text-amber-300 mb-2" />
                          <p className="text-xs font-bold text-amber-400">Cliquer pour ajouter une photo</p>
                          <p className="text-[10px] text-amber-300 mt-1">JPG / PNG</p>
                        </>
                    }
                  </div>
                  <input ref={fileRef} type="file" accept="image/*"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setPhoto(f); setPreview(URL.createObjectURL(f)) } }}
                    className="hidden" />
                  {preview && (
                    <button onClick={() => { setPhoto(null); setPreview(null) }}
                      className="text-[11px] text-red-400 hover:text-red-600 mt-1 font-bold">
                      Supprimer la photo
                    </button>
                  )}
                </div>

                <textarea value={report} onChange={e => setReport(e.target.value)}
                  placeholder="Décrivez brièvement l'intervention (actions réalisées, obstacles rencontrés)…"
                  className="w-full h-28 px-3 py-2 bg-white rounded-xl border border-amber-100 text-sm outline-none resize-none focus:ring-2 focus:ring-amber-100" />

                <div>
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">Date de fin d'intervention</label>
                  <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-amber-100 text-sm font-bold outline-none" />
                </div>

                <button onClick={handleResolve} disabled={busy || !photo || !report.trim()}
                  className="w-full py-3 bg-emerald-500 text-white rounded-xl text-sm font-black hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                  Marquer comme résolue
                </button>
              </div>
            )}

            {/* Done state */}
            {isDone && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 flex flex-col items-center gap-3 text-center">
                <CheckCircle size={44} className="text-emerald-400" />
                <p className="font-black text-emerald-800">Mission terminée</p>
                <p className="text-xs text-emerald-600">Résolue le {fmt(decl.resolved_at)}</p>
              </div>
            )}

            {/* Refused state */}
            {decl.status === 'refusee_agent' && (
              <div className="bg-red-50 rounded-2xl border border-red-100 p-6 flex flex-col items-center gap-3 text-center">
                <XCircle size={44} className="text-red-400" />
                <p className="font-black text-red-800">Mission refusée</p>
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
