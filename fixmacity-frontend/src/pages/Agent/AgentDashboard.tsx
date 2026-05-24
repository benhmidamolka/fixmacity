// src/pages/Agent/AgentDashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, X, Eye, Check, ChevronDown, ChevronLeft, ChevronRight,
  AlertTriangle, MapPin, Calendar, User, Phone, Mail, Tag,
  Image as ImageIcon, MessageSquare, ArrowUpDown, Filter,
  Loader2, RefreshCw, Users, Clock, XCircle, CheckCircle2,
} from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const tok  = () => localStorage.getItem('fmc_token') || ''
const hdr  = () => ({ Authorization: `Bearer ${tok()}` })
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtTime = (d?: string) =>
  d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''

// ─── Priority config ──────────────────────────────────────────────────────────
const PRIO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critique: { label: 'Critique', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  haute:    { label: 'Haute',    color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
  élevée:   { label: 'Élevée',   color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  elevee:   { label: 'Élevée',   color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  moyenne:  { label: 'Normale',  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  medium:   { label: 'Normale',  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  basse:    { label: 'Basse',    color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  low:      { label: 'Basse',    color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  high:     { label: 'Haute',    color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
  urgent:   { label: 'Critique', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
}
const getPrio = (p?: string) =>
  PRIO[(p || '').toLowerCase()] ?? { label: p || '—', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' }

const DOT: Record<string, string> = {
  critique: 'bg-red-500', haute: 'bg-orange-500', élevée: 'bg-amber-500',
  elevee: 'bg-amber-500', moyenne: 'bg-blue-500', medium: 'bg-blue-500',
  basse: 'bg-green-500', low: 'bg-green-500', high: 'bg-orange-500', urgent: 'bg-red-500',
}
const getDot = (p?: string) => DOT[(p || '').toLowerCase()] ?? 'bg-slate-400'

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ w = 'w-full', h = 'h-3' }: { w?: string; h?: string }) => (
  <div className={`${w} ${h} rounded-md bg-slate-100 animate-pulse`} />
)

// ─── Priority badge ───────────────────────────────────────────────────────────
const PrioBadge = ({ priority }: { priority?: string }) => {
  const p = getPrio(priority)
  return (
    <span
      className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: p.color, background: p.bg, border: `1px solid ${p.border}` }}
    >{p.label}</span>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
const DetailPanel = ({ id, onClose, onActioned }: {
  id: string
  onClose: () => void
  onActioned: () => void
}) => {
  const [data,      setData]      = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState<'info' | 'media' | 'history' | 'comments'>('info')
  const [decision,  setDecision]  = useState<'accept' | 'refuse' | null>(null)
  const [raison,    setRaison]    = useState('')
  const [busy,      setBusy]      = useState(false)

  useEffect(() => {
    setLoading(true)
    setData(null)
    setTab('info')
    setDecision(null)
    setRaison('')
    fetch(`${API}/agent/declarations/${id}`, { headers: hdr() })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const confirm = async () => {
    if (!decision) return
    if (decision === 'refuse' && !raison.trim()) return
    setBusy(true)
    try {
      const url    = `${API}/agent/declarations/${id}/${decision === 'accept' ? 'accept' : 'refuse'}`
      const body   = decision === 'refuse' ? JSON.stringify({ raison: raison.trim() }) : undefined
      const res    = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body,
      })
      if (res.ok) { onActioned(); onClose() }
      else { const e = await res.json(); alert(e.error || 'Erreur') }
    } finally { setBusy(false) }
  }

  const isNew   = data?.status === 'assignee_agent'
  const photos  = data?.photos   || []
  const history = data?.history  || []
  const comments= data?.comments || []
  const prio    = getPrio(data?.priority)

  const TABS = [
    { key: 'info',     label: 'Info',         count: 0              },
    { key: 'media',    label: 'Médias',        count: photos.length  },
    { key: 'history',  label: 'Historique',    count: history.length },
    { key: 'comments', label: 'Commentaires',  count: comments.length},
  ] as const

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />

      {/* Sliding panel */}
      <div
        className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100"
        style={{ animation: 'slideIn .26s cubic-bezier(.22,1,.36,1)' }}
      >
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          {loading ? (
            <div className="space-y-2 flex-1 mr-3"><Sk w="w-32" h="h-3" /><Sk w="w-48" h="h-4" /></div>
          ) : data ? (
            <div className="min-w-0 flex-1 mr-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-slate-400 font-mono">{data.ref_citoyen}</span>
                <PrioBadge priority={data.priority} />
              </div>
              <h2 className="text-sm font-bold text-slate-900 leading-snug">{data.title}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {data.category && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Tag className="w-3 h-3" />{data.category}
                  </span>
                )}
                {(data.delegations?.name || data.address) && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <MapPin className="w-3 h-3" />{data.delegations?.name || data.address}
                  </span>
                )}
              </div>
            </div>
          ) : null}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                tab === t.key
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="ml-1 text-[9px] font-bold">({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-5 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Sk w="w-7" h="h-7" />
                  <div className="flex-1 space-y-2"><Sk w="w-20" h="h-2" /><Sk h="h-3" /></div>
                </div>
              ))}
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-300">
              <AlertTriangle className="w-8 h-8" />
              <p className="text-sm font-bold text-slate-400">Erreur de chargement</p>
            </div>
          ) : (
            <>
              {/* INFO */}
              {tab === 'info' && (
                <div className="p-5 space-y-5">

                  {/* General info */}
                  <section>
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Tag className="w-3 h-3" />1. Informations générales
                    </p>
                    <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
                      {[
                        { icon: Tag,      label: 'Catégorie',    val: data.category },
                        { icon: MapPin,   label: 'Localisation', val: data.address || data.delegations?.name },
                        { icon: Calendar, label: 'Soumise le',   val: `${fmtDate(data.created_at)} à ${fmtTime(data.created_at)}` },
                      ].filter(r => r.val).map(({ icon: Icon, label, val }) => (
                        <div key={label} className="flex items-start gap-3 px-3 py-2.5">
                          <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon className="w-3 h-3 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                            <p className="text-xs font-medium text-slate-800 mt-0.5">{val}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Description box */}
                    {data.description && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1.5">Description du citoyen</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{data.description}</p>
                      </div>
                    )}
                  </section>

                  {/* Citizen info */}
                  {data.citizen && (
                    <section>
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <User className="w-3 h-3" />2. Informations citoyen
                      </p>
                      <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
                        {[
                          { icon: User,  label: 'Nom',       val: `${data.citizen.first_name} ${data.citizen.last_name}` },
                          { icon: Phone, label: 'Téléphone', val: data.citizen.phone || '—' },
                          { icon: Mail,  label: 'Email',     val: data.citizen.email },
                        ].map(({ icon: Icon, label, val }) => (
                          <div key={label} className="flex items-center gap-3 px-3 py-2.5">
                            <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-3 h-3 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                              <p className="text-xs font-medium text-slate-800 mt-0.5">{val}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Priority — from president */}
                  <section>
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" />3. Priorité attribuée par le Président
                    </p>
                    <div
                      className="rounded-xl border p-3"
                      style={{ borderColor: prio.border, background: prio.bg }}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Niveau</p>
                          <span
                            className="text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ color: prio.color, background: 'white', border: `1px solid ${prio.border}` }}
                          >
                            ● {prio.label}
                          </span>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Score</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${data.priority_score ?? 0}%`, background: prio.color }}
                              />
                            </div>
                            <span className="text-sm font-bold" style={{ color: prio.color }}>
                              {data.priority_score ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      {data.votes_count > 0 && (
                        <p className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-200">
                          {data.votes_count} vote{data.votes_count > 1 ? 's' : ''} citoyen
                        </p>
                      )}
                    </div>
                  </section>

                  {/* Other agents on same declaration */}
                  <section>
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Users className="w-3 h-3" />4. Autres agents assignés
                    </p>
                    {data.agent && data.agent.first_name ? (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {data.agent.first_name[0]}{data.agent.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{data.agent.first_name} {data.agent.last_name}</p>
                          <p className="text-[10px] text-slate-400">Agent assigné</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-2">Aucun autre agent assigné</p>
                    )}
                  </section>
                </div>
              )}

              {/* MEDIA */}
              {tab === 'media' && (
                <div className="p-5">
                  {photos.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-slate-300">
                      <ImageIcon className="w-10 h-10" />
                      <p className="text-sm font-bold text-slate-400">Aucune photo</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {photos.map((p: any) => (
                        <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                          <img src={p.url} alt="" className="w-full h-full object-cover"
                            onError={e => { (e.target as any).style.display = 'none' }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* HISTORY */}
              {tab === 'history' && (
                <div className="p-5 space-y-1">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-slate-300">
                      <Clock className="w-8 h-8" />
                      <p className="text-sm font-bold text-slate-400">Aucun historique</p>
                    </div>
                  ) : history.map((h: any, i: number) => (
                    <div key={i} className="flex gap-3 py-2.5 border-b border-slate-50 last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 text-[10px] font-bold flex-wrap">
                          <span className="text-slate-500">{h.old_status}</span>
                          <span className="text-slate-300">→</span>
                          <span className="text-green-600">{h.new_status}</span>
                        </div>
                        {h.raison && <p className="text-[10px] text-red-500 italic mt-0.5">«{h.raison}»</p>}
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {h.changed_by_user
                            ? `${h.changed_by_user.first_name} ${h.changed_by_user.last_name}`
                            : 'Système'} · {fmtDate(h.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* COMMENTS */}
              {tab === 'comments' && (
                <div className="p-5 space-y-2">
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-slate-300">
                      <MessageSquare className="w-8 h-8" />
                      <p className="text-sm font-bold text-slate-400">Aucun commentaire</p>
                    </div>
                  ) : comments.map((c: any) => (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-green-700 text-white flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                          {c.author?.first_name?.[0]}{c.author?.last_name?.[0]}
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">
                          {c.author ? `${c.author.first_name} ${c.author.last_name}` : '—'}
                        </span>
                        <span className="text-[9px] text-slate-400 ml-auto">{fmtDate(c.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed pl-8">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Decision footer — only for pending declarations ── */}
        {!loading && data && isNew && (
          <div className="flex-shrink-0 border-t border-slate-100 p-5 bg-white space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              5. Votre décision
            </p>
            <p className="text-[11px] text-slate-500">Accepter ou refuser cette tâche</p>

            {/* Radio buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDecision('accept')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                  decision === 'accept'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  decision === 'accept' ? 'border-green-500' : 'border-slate-300'
                }`}>
                  {decision === 'accept' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                </div>
                Accepter la tâche
              </button>
              <button
                onClick={() => setDecision('refuse')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                  decision === 'refuse'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  decision === 'refuse' ? 'border-red-500' : 'border-slate-300'
                }`}>
                  {decision === 'refuse' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                </div>
                Refuser la tâche
              </button>
            </div>

            {/* Refusal textarea */}
            {decision === 'refuse' && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Motif du refus <span className="text-red-500">*</span>
                </p>
                <textarea
                  value={raison}
                  onChange={e => setRaison(e.target.value)}
                  rows={3}
                  placeholder="Expliquez la raison du refus à votre chef de service..."
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 resize-none text-slate-700 font-medium"
                />
              </div>
            )}

            {/* Confirm + cancel */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onClose}
                className="py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirm}
                disabled={!decision || (decision === 'refuse' && !raison.trim()) || busy}
                className={`py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 ${
                  decision === 'refuse'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : decision === 'refuse' ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                {decision === 'refuse' ? 'Confirmer le refus' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Mission Row (List View) ────────────────────────────────────────────────
const MissionRow: React.FC<{
  m: any
  isSelected: boolean
  onOpen: (id: string) => void
  onQuickAccept?: (m: any, e: React.MouseEvent) => void
  onQuickRefuse?: (m: any, e: React.MouseEvent) => void
}> = ({ m, isSelected, onOpen, onQuickAccept, onQuickRefuse }) => {
  const pri = getPrio(m.priority)
  const isNew = m.status === 'assignee_agent'

  return (
    <div
      onClick={() => onOpen(m.id)}
      className={`cursor-pointer transition-colors group ${
        isSelected ? 'bg-green-50' : 'hover:bg-slate-50'
      }`}
    >
      <div className="grid grid-cols-[88px,auto,110px,82px,72px,82px] items-center">
        {/* ID */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getDot(m.priority)}`} />
            <span className="text-[11px] font-bold text-slate-500 font-mono truncate">
              {m.ref_citoyen?.split('-').slice(-1)[0]
                ? `#DC-${m.ref_citoyen.split('-').slice(-1)[0]}`
                : `#${m.id.slice(0, 6).toUpperCase()}`}
            </span>
          </div>
        </td>

        {/* Title */}
        <td className="px-4 py-3">
          <p className="text-xs font-bold text-slate-800 truncate">{m.title}</p>
          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{m.category}</p>
        </td>

        {/* Location */}
        <td className="px-4 py-3">
          <p className="text-xs font-medium text-slate-600 truncate">
            {m.address?.split(',')[0] || m.delegations?.name || '—'}
          </p>
          {m.delegations?.name && m.address && (
            <p className="text-[10px] text-slate-400 truncate">{m.delegations.name}</p>
          )}
        </td>

        {/* Date */}
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-[11px] font-medium text-slate-600">
            {fmtDate(m.assigned_at || m.created_at)}
          </p>
          <p className="text-[10px] text-slate-400">
            {fmtTime(m.assigned_at || m.created_at)}
          </p>
        </td>

        {/* Priority */}
        <td className="px-4 py-3">
          <PrioBadge priority={m.priority} />
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {isNew && onQuickAccept && onQuickRefuse ? (
              <>
                <button
                  onClick={e => { e.stopPropagation(); onQuickAccept(m, e) }}
                  className="w-7 h-7 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-colors"
                  title="Accepter"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onQuickRefuse(m, e) }}
                  className="w-7 h-7 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"
                  title="Refuser"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); onOpen(m.id) }}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-slate-400 transition-colors"
                title="Voir les détails"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const AgentDashboard: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('fmc_user') || '{}')

  const [decls,   setDecls]   = useState<any[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected,setSelected]= useState<string | null>(null)

  // Filters
  const [search,   setSearch]   = useState('')
  const [statusF,  setStatusF]  = useState('assignee_agent')
  const [sortBy,   setSortBy]   = useState<'newest' | 'oldest' | 'priority' | 'votes'>('newest')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  const LIMIT = 8

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const load = useCallback(async (p = 1) => {
    if (p === 1) setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), sort: sortBy })
      if (statusF) params.set('status', statusF)
      const r = await fetch(`${API}/agent/declarations?${params}`, { headers: hdr() })
      const d = await r.json()
      const list: any[] = d.declarations || []
      setDecls(prev => p === 1 ? list : [...prev, ...list])
      setTotal(d.pagination?.total || 0)
    } finally {
      setLoading(false)
    }
  }, [sortBy, statusF])

  useEffect(() => { setPage(1); load(1) }, [load])

  // quick inline accept/refuse
  const quickAccept = async (m: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const r = await fetch(`${API}/agent/declarations/${m.id}/accept`, { method: 'POST', headers: hdr() })
    if (r.ok) load(1)
    else alert((await r.json()).error || 'Erreur')
  }

  const quickRefuse = async (m: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected(m.id)
  }

  const filtered = decls.filter(d =>
    !search || [d.title, d.ref_citoyen, d.category, d.address, d.delegations?.name]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  const pageCount = Math.ceil(total / LIMIT)

  const SORT_OPTIONS = [
    { key: 'newest'   as const, label: 'Plus récentes'  },
    { key: 'oldest'   as const, label: 'Plus anciennes' },
    { key: 'priority' as const, label: 'Par priorité'   },
    { key: 'votes'    as const, label: 'Par votes'      },
  ]

  const STATUS_TABS = [
    { key: 'assignee_agent', label: 'À accepter'  },
    { key: 'en_cours',       label: 'En cours'    },
    { key: '',               label: 'Toutes'      },
  ]

  return (
    <AgentLayout title="Tableau de bord">
      <div className="flex h-[calc(100vh-64px)] overflow-hidden -m-4 lg:-m-6">

        {/* ─── LEFT: Declaration list ─── */}
        <div className="flex-1 min-w-0 flex flex-col bg-white border-r border-slate-100 overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h1 className="text-base font-bold text-slate-900">
                  Bonjour, {user.first_name || 'Agent'} 👋
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Déclarations assignées par votre chef de service
                </p>
              </div>
              <button
                onClick={() => load(1)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors flex-shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Actualiser
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* Status tabs */}
              <div className="flex bg-slate-50 border border-slate-100 rounded-xl p-1 gap-0.5">
                {STATUS_TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => { setStatusF(t.key); setPage(1) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusF === t.key
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >{t.label}</button>
                ))}
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300 transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sort dropdown */}
              <div className="relative ml-auto" ref={sortRef}>
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-slate-300 transition-colors"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  {SORT_OPTIONS.find(s => s.key === sortBy)?.label}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-20 min-w-[160px] overflow-hidden">
                    {SORT_OPTIONS.map(o => (
                      <button
                        key={o.key}
                        onClick={() => { setSortBy(o.key); setSortOpen(false); setPage(1) }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${
                          sortBy === o.key
                            ? 'bg-green-50 text-green-700 font-bold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >{o.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '88px' }} />
                <col style={{ width: 'auto' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '82px' }} />
                <col style={{ width: '72px' }} />
                <col style={{ width: '82px' }} />
              </colgroup>
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr>
                  {['ID', 'Titre & Catégorie', 'Localisation', 'Assignée le', 'Priorité', 'Action'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100"
                    >{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(7)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Sk w="w-16" /></td>
                      <td className="px-4 py-3"><div className="space-y-1.5"><Sk w="w-32" /><Sk w="w-20" h="h-2" /></div></td>
                      <td className="px-4 py-3"><Sk w="w-20" /></td>
                      <td className="px-4 py-3"><Sk w="w-16" /></td>
                      <td className="px-4 py-3"><Sk w="w-14" h="h-5" /></td>
                      <td className="px-4 py-3"><div className="flex gap-1.5"><Sk w="w-7" h="h-7" /><Sk w="w-7" h="h-7" /><Sk w="w-7" h="h-7" /></div></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-300">
                        <CheckCircle2 className="w-10 h-10" />
                        <p className="text-sm font-bold text-slate-400">
                          {statusF === 'assignee_agent' ? 'Aucune tâche en attente 🎉' : 'Aucune déclaration'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(d => {
                  const isNew = d.status === 'assignee_agent'
                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelected(d.id)}
                      className={`cursor-pointer transition-colors group ${
                        selected === d.id
                          ? 'bg-green-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* ID */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getDot(d.priority)}`} />
                          <span className="text-[11px] font-bold text-slate-500 font-mono truncate">
                            {d.ref_citoyen?.split('-').slice(-1)[0]
                              ? `#DC-${d.ref_citoyen.split('-').slice(-1)[0]}`
                              : `#${d.id.slice(0, 6).toUpperCase()}`}
                          </span>
                        </div>
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-800 truncate">{d.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{d.category}</p>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-slate-600 truncate">
                          {d.address?.split(',')[0] || d.delegations?.name || '—'}
                        </p>
                        {d.delegations?.name && d.address && (
                          <p className="text-[10px] text-slate-400 truncate">{d.delegations.name}</p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-[11px] font-medium text-slate-600">
                          {fmtDate(d.assigned_at || d.created_at)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {fmtTime(d.assigned_at || d.created_at)}
                        </p>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3">
                        <PrioBadge priority={d.priority} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); setSelected(d.id) }}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-slate-400 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isNew && (
                            <>
                              <button
                                onClick={e => quickAccept(d.id, e)}
                                className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center transition-colors"
                                title="Accepter"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setSelected(d.id) }}
                                className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                                title="Refuser (motif requis)"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
              <p className="text-xs text-slate-400 font-medium">
                Affichage de 1 à {Math.min(page * LIMIT, total)} sur {total} résultats
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { const p = Math.max(1, page - 1); setPage(p); load(p) }}
                  disabled={page === 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {[...Array(Math.min(pageCount, 5))].map((_, i) => {
                  const p = i + 1
                  return (
                    <button
                      key={p}
                      onClick={() => { setPage(p); load(p) }}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                        page === p
                          ? 'bg-green-600 text-white'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >{p}</button>
                  )
                })}
                <button
                  onClick={() => { const p = Math.min(pageCount, page + 1); setPage(p); load(p) }}
                  disabled={page >= pageCount}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT: empty state ─── */}
        {!selected && (
          <div className="hidden lg:flex w-80 flex-col items-center justify-center bg-slate-50 border-l border-slate-100 text-slate-300 gap-3">
            <Eye className="w-10 h-10" />
            <p className="text-sm font-bold text-slate-400 text-center px-8">
              Sélectionnez une déclaration pour voir les détails
            </p>
          </div>
        )}
      </div>

      {/* Detail Panel (slide-in) */}
      {selected && (
        <DetailPanel
          id={selected}
          onClose={() => setSelected(null)}
          onActioned={() => { setSelected(null); load(1) }}
        />
      )}
    </AgentLayout>
  )
}

export default AgentDashboard