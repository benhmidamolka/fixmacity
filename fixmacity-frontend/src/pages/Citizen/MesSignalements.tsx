// src/pages/Citizen/MesSignalements.tsx
// ── Fixed: infinite scroll modal, score field, dark mode, full functionality ──
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search, Filter, Plus, ChevronDown, X, MapPin, Clock,
  ThumbsUp, AlertCircle, Pencil, Trash2, Save, Star,
  MessageSquare, Send, Loader2, CheckCircle2, Hash,
  Calendar, FileText, ChevronRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import CitizenLayout from '../../components/citizen/CitizenLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok = () => localStorage.getItem('fmc_token') || ''

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  SOUMISE:    { label: 'Soumise',  color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  'EN COURS': { label: 'En cours', color: '#1d4ed8', bg: '#dbeafe', dot: '#3b82f6' },
  RESOLUE:    { label: 'Résolue',  color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
  CLOTUREE:   { label: 'Clôturée', color: '#475569', bg: '#f1f5f9', dot: '#94a3b8' },
  'ÉVALUÉ':   { label: 'Évalué',   color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
  'CLÔTURÉ':  { label: 'Clôturé',  color: '#475569', bg: '#f1f5f9', dot: '#94a3b8' },
}

const STEPS = ['Soumise', 'Assignée', 'En cours', 'Résolue']

function stepIdx(s: string) {
  if (!s) return 0
  const n = s.toLowerCase()
  if (n === 'soumise') return 0
  if (['assignee_chef','assignee_agent','refusee_chef','refusee_agent'].includes(n)) return 1
  if (n === 'en_cours' || s === 'EN COURS') return 2
  if (['resolue','cloturee'].includes(n) || ['RESOLUE','CLOTUREE','ÉVALUÉ','CLÔTURÉ'].includes(s)) return 3
  return 0
}

function getCategoryEmoji(cat?: string) {
  const m: Record<string,string> = {
    'Voirie':'🛣️','Éclairage Public':'💡','Propreté':'🗑️',
    'Espaces Verts':'🌿','Réseaux':'💧','Signalisation':'🚦',
    'Administratif':'🏢','Suggestions':'💬'
  }
  return cat ? (m[cat] || '📌') : '📌'
}

const Sk = ({ w='w-full', h='h-3', r='rounded-lg' }:{ w?:string; h?:string; r?:string }) => (
  <div className={`${w} ${h} ${r} bg-slate-100 dark:bg-white/10 animate-pulse`} />
)

// ── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const c = STATUS_CFG[status] || STATUS_CFG['SOUMISE']
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ color: c.color, background: c.bg }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
      {c.label}
    </span>
  )
}

// ── Timeline ─────────────────────────────────────────────────────────────────
function Timeline({ status, history }: { status: string; history?: any[] }) {
  const active = stepIdx(status)
  return (
    <div className="relative space-y-0">
      <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-slate-100 dark:bg-white/10" />
      {STEPS.map((step, i) => {
        const done    = i < active
        const current = i === active
        const h = history?.find(e => {
          if (i === 0) return e.new_status === 'soumise'
          if (i === 1) return ['assignee_chef','assignee_agent'].includes(e.new_status)
          if (i === 2) return e.new_status === 'en_cours'
          return ['resolue','cloturee'].includes(e.new_status)
        })
        return (
          <div key={step} className="flex items-start gap-3 relative pb-3 last:pb-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
              done    ? 'bg-blue-600 border-blue-600' :
              current ? 'bg-white dark:bg-[#0D1117] border-blue-500 ring-3 ring-blue-50' :
                        'bg-white dark:bg-[#0D1117] border-slate-200 dark:border-white/10'
            }`}>
              {done    && <CheckCircle2 size={11} className="text-white" />}
              {current && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </div>
            <div className="pt-0.5 flex-1 min-w-0">
              <p className={`text-xs font-bold ${done || current ? 'text-slate-800 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>{step}</p>
              {h?.created_at && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {new Date(h.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Inline comments — max-h constrained ─────────────────────────────────────
function InlineComments({ declarationId, canWrite }: { declarationId: string; canWrite: boolean }) {
  const [comments, setComments] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const [input,    setInput]    = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const me = JSON.parse(localStorage.getItem('fmc_user') || '{}')

  useEffect(() => {
    if (!declarationId) return
    setLoading(true)
    fetch(`${API}/declarations/${declarationId}/comments`, {
      headers: { Authorization: `Bearer ${tok()}` }
    })
      .then(r => r.ok ? r.json() : { comments: [] })
      .then(d => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [declarationId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments.length])

  const send = async () => {
    if (!input.trim() || !canWrite) return
    setSending(true)
    try {
      const r = await fetch(`${API}/declarations/${declarationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ content: input.trim(), channel: 'agent_citizen' })
      })
      if (r.ok) { const d = await r.json(); setComments(p => [...p, d.comment]); setInput('') }
    } catch {}
    setSending(false)
  }

  const ini = (u: any) => u ? `${u.first_name?.[0]||''}${u.last_name?.[0]||''}`.toUpperCase() : '?'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
        <MessageSquare size={11} className="text-emerald-600 flex-shrink-0" />
        <span className="text-[10px] font-bold text-emerald-700">Canal Agent — Citoyen</span>
        {!canWrite && <span className="ml-auto text-[9px] font-bold text-emerald-500 border border-emerald-300 rounded px-1.5 py-0.5">Lecture seule</span>}
      </div>

      {/* KEY FIX: max-h-44 overflow-y-auto prevents infinite growth */}
      <div className="max-h-44 overflow-y-auto space-y-2">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-slate-300 dark:text-slate-600" /></div>
        ) : comments.length === 0 ? (
          <div className="py-5 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-xl">
            <MessageSquare size={16} className="mx-auto mb-1 text-slate-200" />
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Aucun message</p>
          </div>
        ) : comments.map(c => {
          const isMe = c.user_id === me.id
          return (
            <div key={c.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0 ${isMe ? 'bg-blue-600' : 'bg-slate-400'}`}>
                {ini(c.user)}
              </div>
              <div className={`flex-1 min-w-0 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 mb-0.5">
                  {isMe ? 'Vous' : (c.user ? `${c.user.first_name} ${c.user.last_name}` : '?')}
                </span>
                <div className={`px-2.5 py-1.5 rounded-xl text-xs leading-relaxed max-w-[85%] ${isMe ? 'bg-blue-50 border border-blue-100' : 'bg-white dark:bg-[#0D1117] border border-slate-100 dark:border-white/5'}`}>
                  {c.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {canWrite && (
        <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Message à l'agent…"
            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-blue-400 focus:bg-white dark:bg-[#0D1117] transition-all" />
          <button onClick={send} disabled={!input.trim() || sending}
            className="w-7 h-7 flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all">
            {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Detail Modal — two-panel, fixed height, no infinite scroll ───────────────
function DetailModal({ decl, onClose, onVote, onRate }: {
  decl: any; onClose: () => void
  onVote: (id: string) => void
  onRate: (id: string, score: number) => void
}) {
  const [voted, setVoted]   = useState(false)
  const [hover, setHover]   = useState(0)
  const [stars, setStars]   = useState(0)
  const [rated, setRated]   = useState(false)
  const canRate  = ['ÉVALUÉ','CLÔTURÉ','RESOLUE','CLOTUREE','resolue','cloturee'].includes(decl.citizen_status || decl.status || '')
  const canWrite = !['CLÔTURÉ','CLOTUREE','cloturee'].includes(decl.citizen_status || decl.status || '')

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const doRate = (n: number) => {
    if (rated) return
    setStars(n); setRated(true); onRate(decl.id, n)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      {/*
        ROOT FIX: The modal shell is flex-col with a fixed maxHeight.
        overflow-hidden on the shell, each panel gets overflow-y-auto.
        This is the ONLY correct pattern — no overflow on the outer div.
      */}
      <div className="bg-white dark:bg-[#0D1117] rounded-3xl w-full shadow-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: 740, maxHeight: 'calc(100dvh - 40px)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header — flex-shrink-0, never scrolls */}
        <div className="flex-shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center flex-shrink-0 text-lg">
              {getCategoryEmoji(decl.category)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <StatusBadge status={decl.citizen_status || 'SOUMISE'} />
                {decl.category && (
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                    {decl.category}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{decl.title}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {decl.ref_citoyen && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <Hash size={9} /><span className="font-mono font-bold text-blue-600">{decl.ref_citoyen}</span>
                  </span>
                )}
                {decl.created_at && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <Calendar size={9} />
                    {new Date(decl.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:bg-white/20 flex items-center justify-center text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Body — flex-1 min-h-0, two columns each with overflow-y-auto */}
        <div className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-hidden">

          {/* LEFT column */}
          <div className="sm:w-[48%] flex-shrink-0 overflow-y-auto p-5 space-y-4 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-white/5">
            <div>
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <FileText size={9} /> Description
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500 leading-relaxed">
                {decl.description || <span className="italic text-slate-400 dark:text-slate-500">Aucune description.</span>}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <MapPin size={9} /> Localisation
              </p>
              <div className="flex items-start gap-2 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl px-3 py-2">
                <MapPin size={12} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-700 dark:text-slate-300 dark:text-slate-600 font-medium">{decl.address || 'Sousse, Tunisie'}</p>
              </div>
            </div>

            {(decl.photo_avant || decl.photo_url) && (
              <div>
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Photo</p>
                <img src={decl.photo_avant || decl.photo_url} alt="Signalement"
                  className="w-full h-32 object-cover rounded-2xl border border-slate-100 dark:border-white/5 cursor-pointer"
                  onClick={() => window.open(decl.photo_avant || decl.photo_url, '_blank')} />
              </div>
            )}

            <button onClick={() => { if (!voted) { setVoted(true); onVote(decl.id) } }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all w-full justify-center border ${
                voted ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/10 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
              }`}>
              <ThumbsUp size={12} />
              {voted ? 'Soutenu !' : 'Soutenir ce signalement'}
              <span className="ml-auto font-mono text-[10px] bg-white dark:bg-[#0D1117] rounded px-1.5 py-0.5 border border-current/20">
                {(decl.votes_count || 0) + (voted ? 1 : 0)}
              </span>
            </button>

            {decl.refusal_reason && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertCircle size={12} className="text-red-500" />
                  <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Motif de refus</p>
                </div>
                <p className="text-xs text-red-700 leading-relaxed">{decl.refusal_reason}</p>
              </div>
            )}
          </div>

          {/* RIGHT column */}
          <div className="sm:flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Clock size={9} /> Suivi d'intervention
              </p>
              <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl p-4">
                <Timeline status={decl.citizen_status || decl.status} history={decl.history} />
              </div>
            </div>

            {canRate && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                  <Star size={9} /> Évaluer l'intervention
                </p>
                {rated ? (
                  <div className="text-center">
                    <div className="flex justify-center gap-1 mb-1.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={20} className={n <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                      ))}
                    </div>
                    <p className="text-xs font-bold text-emerald-600">Merci pour votre évaluation !</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button key={n}
                          onMouseEnter={() => setHover(n)}
                          onMouseLeave={() => setHover(0)}
                          onClick={() => doRate(n)}
                          className="transition-transform hover:scale-110">
                          <Star size={26} className={`transition-colors ${(hover||stars) >= n ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Cliquez pour noter</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer — flex-shrink-0 */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            {decl.ref_service ? `Réf: ${decl.ref_service}` : ''}
          </p>
          <button onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:bg-white/20 bg-slate-100 dark:bg-white/10 transition-all">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ decl, onClose, onSave }:{ decl:any; onClose:()=>void; onSave:(id:string,data:any)=>Promise<void> }) {
  const [title, setTitle]   = useState(decl.title || '')
  const [desc,  setDesc]    = useState(decl.description || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const save = async () => {
    if (!title.trim()) return
    setLoading(true); await onSave(decl.id, { title, description: desc }); setLoading(false); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(10,22,40,0.6)', backdropFilter:'blur(4px)' }} onClick={onClose}>
      <div className="bg-white dark:bg-[#0D1117] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Pencil size={16} className="text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Modifier le signalement</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:bg-white/20 flex items-center justify-center text-slate-500 dark:text-slate-400 dark:text-slate-500">
            <X size={14} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-slate-600 mb-1.5">Titre <span className="text-red-400">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white dark:bg-[#0D1117] transition-all" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-slate-600 mb-1.5">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white dark:bg-[#0D1117] transition-all resize-none" />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 dark:text-slate-500 font-semibold text-sm hover:bg-slate-50 dark:bg-white/5">Annuler</button>
          <button onClick={save} disabled={loading || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <><Save size={15} /> Enregistrer</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ decl, onClose, onConfirm }:{ decl:any; onClose:()=>void; onConfirm:(id:string)=>Promise<void> }) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const go = async () => { setLoading(true); await onConfirm(decl.id); setLoading(false); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(10,22,40,0.6)', backdropFilter:'blur(4px)' }} onClick={onClose}>
      <div className="bg-white dark:bg-[#0D1117] rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Supprimer ce signalement ?</h3>
        <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 my-4 text-sm font-semibold text-slate-800 dark:text-slate-200">"{decl.title}"</div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Cette action est irréversible.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 dark:text-slate-500 font-semibold text-sm hover:bg-slate-50 dark:bg-white/5">Garder</button>
          <button onClick={go} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <><Trash2 size={15} /> Supprimer</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Declaration card ─────────────────────────────────────────────────────────
function DeclCard({ decl, onClick, onEdit, onDelete }:{
  decl:any; onClick:()=>void; onEdit:(d:any)=>void; onDelete:(d:any)=>void
}) {
  const canEditDel = decl.status === 'soumise' || decl.citizen_status === 'SOUMISE'
  return (
    <div className="bg-white dark:bg-[#0D1117] rounded-2xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:border-white/10 hover:shadow-md p-5 transition-all cursor-pointer group"
      onClick={onClick}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden text-xl">
          {(decl.photo_avant || decl.photo_url)
            ? <img src={decl.photo_avant || decl.photo_url} alt="" className="w-full h-full object-cover" />
            : getCategoryEmoji(decl.category)
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight group-hover:text-blue-600 transition-colors line-clamp-1">
              {decl.title}
            </h3>
            <StatusBadge status={decl.citizen_status || 'SOUMISE'} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 line-clamp-1 mb-2">{decl.description}</p>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 flex-wrap">
            {decl.category && <span className="bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-full font-medium">{decl.category}</span>}
            {decl.ref_citoyen && <span className="font-mono text-blue-600 font-bold">{decl.ref_citoyen}</span>}
            {decl.created_at && <span className="flex items-center gap-1"><Clock size={9} />{new Date(decl.created_at).toLocaleDateString('fr-FR')}</span>}
            {(decl.votes_count || 0) > 0 && <span className="flex items-center gap-1 text-blue-500 font-bold"><ThumbsUp size={9} />{decl.votes_count}</span>}
          </div>
        </div>
        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1" />
      </div>

      {canEditDel && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-1">Modifiable tant que non assigné</span>
          <button onClick={e => { e.stopPropagation(); onEdit(decl) }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-blue-50 text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:text-blue-600 text-[10px] font-bold transition-all">
            <Pencil size={10} /> Modifier
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(decl) }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-red-50 text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:text-red-500 text-[10px] font-bold transition-all">
            <Trash2 size={10} /> Annuler
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const MesSignalements: React.FC = () => {
  const { t } = useTranslation()
  const [declarations, setDeclarations] = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(false)
  const [selected,     setSelected]     = useState<any>(null)
  const [editTarget,   setEditTarget]   = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [search,       setSearch]       = useState('')
  const [statusFilterIndex, setStatusFilterIndex] = useState(0)
  const [showFilter,   setShowFilter]   = useState(false)

  const fetchDecls = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const r = await fetch(`${API}/declarations/mine?limit=50`, {
        headers: { Authorization: `Bearer ${tok()}` }
      })
      if (!r.ok) throw new Error()
      const data = await r.json()
      setDeclarations(Array.isArray(data) ? data : data.declarations || [])
    } catch { setError(true) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchDecls() }, [fetchDecls])

  const handleVote = async (id: string) => {
    await fetch(`${API}/declarations/${id}/vote`, {
      method: 'POST', headers: { Authorization: `Bearer ${tok()}` }
    }).catch(() => {})
  }

  // KEY FIX: send { score } not { rating }
  const handleRate = async (id: string, score: number) => {
    await fetch(`${API}/declarations/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      body: JSON.stringify({ score }),
    }).catch(() => {})
  }

  const handleEdit = async (id: string, data: any) => {
    await fetch(`${API}/declarations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      body: JSON.stringify(data),
    }).catch(() => {})
    fetchDecls()
  }

  const handleDelete = async (id: string) => {
    await fetch(`${API}/declarations/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${tok()}` }
    }).catch(() => {})
    setDeclarations(prev => prev.filter(d => d.id !== id))
  }

  const filtered = declarations.filter(d => {
    const ms = !search || d.title?.toLowerCase().includes(search.toLowerCase())
    if (statusFilterIndex === 0) return ms
    
    const FRENCH_LABELS = ['Tous', 'Soumise', 'En cours', 'Résolue', 'Clôturée']
    const targetLabel = FRENCH_LABELS[statusFilterIndex]?.toLowerCase()
    const declLabel = (STATUS_CFG[d.citizen_status]?.label || '').toLowerCase()
    
    const mf = (declLabel === targetLabel) || 
               (statusFilterIndex === 3 && declLabel === 'évalué') ||
               (statusFilterIndex === 4 && declLabel === 'clôturé')
               
    return ms && mf
  })

  const counts = {
    total:   declarations.length,
    attente: declarations.filter(d => d.citizen_status === 'SOUMISE').length,
    cours:   declarations.filter(d => d.citizen_status === 'EN COURS').length,
    termine: declarations.filter(d => ['RESOLUE','CLOTUREE','ÉVALUÉ','CLÔTURÉ'].includes(d.citizen_status || '')).length,
  }

  return (
    <CitizenLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('myReports.pageTitle')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {counts.total === 1 ? t('myReports.totalCount_one', { count: 1 }) : t('myReports.totalCount_other', { count: counts.total })}
            </p>
          </div>
          <Link to="/nouveau-signalement"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm">
            <Plus size={15} /> {t('myReports.newReport')}
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: t('myReports.waiting'), count: counts.attente, color: '#d97706' },
            { label: t('myReports.inProgress'), count: counts.cours, color: '#1d4ed8' },
            { label: t('myReports.done'), count: counts.termine, color: '#15803d' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 text-center">
              <p className="text-2xl font-extrabold mb-1" style={{ color: s.color }}>{s.count}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('myReports.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:placeholder-slate-500 rounded-xl text-sm outline-none focus:border-blue-500 transition-all" />
          </div>
          <div className="relative">
            <button onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-500 transition-all">
              <Filter size={13} /> {(t('myReports.filterStatuses', { returnObjects: true }) as string[])[statusFilterIndex] || ''} <ChevronDown size={13} />
            </button>
            {showFilter && (
              <div className="absolute top-full mt-1 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 min-w-36 py-1">
                {(t('myReports.filterStatuses', { returnObjects: true }) as string[]).map((s, idx) => (
                  <button key={idx} onClick={() => { setStatusFilterIndex(idx); setShowFilter(false) }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      statusFilterIndex === idx
                        ? 'text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/30'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
            <p className="text-sm font-bold text-red-700 dark:text-red-400 flex-1">{t('myReports.loadError')}</p>
            <button onClick={fetchDecls} className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600">
              {t('myReports.retry')}
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-[#0D1117] rounded-2xl border border-slate-100 dark:border-white/5 p-5 space-y-2 animate-pulse">
                <div className="flex gap-3"><Sk w="w-11" h="h-11" r="rounded-xl" /><div className="flex-1 space-y-2"><Sk h="h-4" w="w-3/4" /><Sk h="h-3" /><Sk h="h-2" w="w-1/2" /></div></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-4">{search ? t('myReports.noResults') : t('myReports.noReports')}</p>
            <Link to="/nouveau-signalement"
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-700">
              <Plus size={14} /> {t('myReports.createFirst')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(d => (
              <DeclCard key={d.id} decl={d}
                onClick={() => setSelected(d)}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      {selected     && <DetailModal decl={selected} onClose={() => setSelected(null)} onVote={handleVote} onRate={handleRate} />}
      {editTarget   && <EditModal decl={editTarget} onClose={() => setEditTarget(null)} onSave={handleEdit} />}
      {deleteTarget && <DeleteModal decl={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />}
    </CitizenLayout>
  )
}

export default MesSignalements
