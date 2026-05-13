import React, { useEffect, useState } from 'react'
import { Search, Filter, Plus, ChevronDown, X, MapPin, Clock, ThumbsUp, AlertCircle, CheckCircle, Pencil, Trash2, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import CitizenLayout from '../../components/citizen/CitizenLayout'
import DeclarationCommentsPanel from '../../components/president/DeclarationCommentsPanel'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  'SOUMIS': { label: 'Soumis', color: '#F59E0B', bg: '#fffbeb' },
  'EN ATTENTE': { label: 'Soumis', color: '#F59E0B', bg: '#fffbeb' }, // fallback
  'EN COURS': { label: 'En cours', color: '#1557FF', bg: '#eff6ff' },
  'TERMINE': { label: 'Terminé', color: '#16a34a', bg: '#f0fdf4' },
}

const TIMELINE_STEPS = ['Soumis', 'Assigné', 'Intervention', 'Résolution']

function getStepIndex(status: string) {
  if (status === 'SOUMIS' || status === 'EN ATTENTE') return 1
  if (status === 'EN COURS') return 2
  if (status === 'TERMINE') return 4
  return 0
}

function Timeline({ status, history }: { status: string; history?: any[] }) {
  const active = getStepIndex(status)
  return (
    <div className="space-y-3">
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < active
        const current = i === active - 1
        const h = history?.[i]
        return (
          <div key={step} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${done || current ? 'bg-[#1557FF] border-[#1557FF]' : 'bg-white border-slate-200'
                }`}>
                {(done || current) && <div className="w-1.5 h-1.5 rounded-full bg-white mx-auto mt-[3px]" />}
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={`w-0.5 h-6 mt-1 ${done ? 'bg-[#1557FF]' : 'bg-slate-200'}`} />
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold ${done || current ? 'text-[#0A1628]' : 'text-slate-400'}`}>{step}</p>
              {h?.changed_at && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(h.changed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ decl, onClose, onSave }: { decl: any; onClose: () => void; onSave: (id: string, data: any) => void }) {
  const [title, setTitle] = useState(decl.title || '')
  const [description, setDescription] = useState(decl.description || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    await onSave(decl.id, { title, description })
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-[#0A1628]">Modifier le signalement</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-[#0A1628] block mb-1.5">Titre</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1557FF] transition-all" />
          </div>
          <div>
            <label className="text-sm font-bold text-[#0A1628] block mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1557FF] transition-all resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
            Annuler
          </button>
          <button onClick={handleSave} disabled={loading || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60 transition-all"
            style={{ background: '#1557FF' }}>
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Enregistrer</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ decl, onClose, onConfirm }: { decl: any; onClose: () => void; onConfirm: (id: string) => void }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    await onConfirm(decl.id)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center"
        onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-7 h-7 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-[#0A1628] mb-2">Annuler ce signalement ?</h3>
        <p className="text-slate-500 text-sm mb-2">Vous êtes sur le point de supprimer :</p>
        <p className="text-sm font-semibold text-[#0A1628] mb-5 bg-slate-50 rounded-xl px-4 py-2">"{decl.title}"</p>
        <p className="text-xs text-slate-400 mb-6">Cette action est irréversible. Le signalement sera définitivement supprimé.</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
            Garder
          </button>
          <button onClick={handleDelete} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60 transition-all bg-red-500 hover:bg-red-600">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4" /> Supprimer</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ decl, onClose, onVote, onRate }: {
  decl: any; onClose: () => void
  onVote: (id: string) => void
  onRate: (id: string, rating: number) => void
}) {
  const s = STATUS_MAP[decl.citizen_status] || STATUS_MAP['SOUMIS']
  const [rating, setRating] = useState(0)
  const [hovering, setHovering] = useState(0)
  const [rated, setRated] = useState(false)
  const [voted, setVoted] = useState(false)

  const currentUser = JSON.parse(localStorage.getItem('fmc_user') || '{}')

  const handleRate = (r: number) => { setRating(r); setRated(true); onRate(decl.id, r) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-3"
              style={{ color: s.color, background: s.bg }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              {s.label.toUpperCase()}
            </span>
            <h2 className="text-xl font-bold text-[#0A1628] leading-tight">{decl.title}</h2>
            <p className="text-slate-400 text-xs mt-1">
              Ref: <span className="font-mono font-bold text-[#1557FF]">{decl.ref_citoyen || '—'}</span>
              {decl.created_at && ` · Soumis le ${new Date(decl.created_at).toLocaleDateString('fr-FR')}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</p>
              <p className="text-slate-600 text-sm leading-relaxed">{decl.description || '—'}</p>
            </div>
            {decl.category && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Catégorie</p>
                <span className="inline-block bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-full">{decl.category}</span>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Localisation</p>
              <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
                <MapPin className="w-4 h-4 text-[#1557FF] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 font-medium">{decl.address || 'Sousse, Tunisie'}</p>
              </div>
            </div>
            {decl.photo_url && (
              <img src={decl.photo_url} alt="" className="w-full h-40 object-cover rounded-xl" />
            )}
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => { if (!voted) { setVoted(true); onVote(decl.id) } }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${voted ? 'bg-blue-50 text-[#1557FF]' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-[#1557FF]'
                  }`}>
                <ThumbsUp className="w-4 h-4" />
                {voted ? 'Soutenu !' : 'Soutenir'} ({(decl.votes_count || 0) + (voted ? 1 : 0)})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Suivi d'intervention</p>
              <Timeline status={decl.citizen_status} history={decl.history} />
            </div>
            {decl.citizen_status === 'TERMINE' && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {rated ? 'Merci pour votre avis !' : "Évaluer l'intervention"}
                </p>
                {rated ? (
                  <div className="text-center">
                    <p className="text-2xl mb-1">🎉</p>
                    <p className="text-sm text-slate-600">Note enregistrée : {rating}/5</p>
                  </div>
                ) : (
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star}
                        onMouseEnter={() => setHovering(star)}
                        onMouseLeave={() => setHovering(0)}
                        onClick={() => handleRate(star)}
                        className="text-3xl transition-transform hover:scale-110">
                        <span className={(hovering || rating) >= star ? 'text-amber-400' : 'text-slate-200'}>★</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {decl.refusal_reason && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Motif de refus</p>
                </div>
                <p className="text-sm text-red-700">{decl.refusal_reason}</p>
              </div>
            )}

            {/* Comments Panel */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Notes & Commentaires</p>
              <DeclarationCommentsPanel
                declarationId={decl.id}
                role="citizen"
                visibleChannels={['agent_citizen']}
                writableChannels={['agent_citizen']}
                currentUserId={currentUser.id}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Declaration Card ─────────────────────────────────────────────────────────
function DeclCard({ decl, onClick, onEdit, onDelete }: {
  decl: any; onClick: () => void
  onEdit: (d: any) => void
  onDelete: (d: any) => void
}) {
  const s = STATUS_MAP[decl.citizen_status] || STATUS_MAP['SOUMIS']
  const canEditDelete = decl.status === 'soumise' || decl.citizen_status === 'SOUMIS' || decl.citizen_status === 'EN ATTENTE'

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center cursor-pointer"
          onClick={onClick}>
          {decl.photo_url
            ? <img src={decl.photo_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-2xl">🔧</span>}
        </div>

        <div className="flex-1 min-w-0" onClick={onClick} style={{ cursor: 'pointer' }}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-[#0A1628] text-base leading-tight truncate">{decl.title}</h3>
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ color: s.color, background: s.bg }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          </div>
          <p className="text-slate-500 text-sm line-clamp-1 mb-2">{decl.description}</p>
          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
            {decl.category && (
              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{decl.category}</span>
            )}
            {decl.ref_citoyen && (
              <span className="font-mono text-[#1557FF] font-bold">{decl.ref_citoyen}</span>
            )}
            {decl.created_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(decl.created_at).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit / Delete actions — only for soumise */}
      {canEditDelete && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400 font-medium flex-1">
            ℹ️ Modifiable tant que non assigné
          </span>
          <button
            onClick={e => { e.stopPropagation(); onEdit(decl) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#1557FF] text-xs font-semibold transition-all">
            <Pencil className="w-3.5 h-3.5" /> Modifier
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(decl) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-500 text-xs font-semibold transition-all">
            <Trash2 className="w-3.5 h-3.5" /> Annuler
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const MesSignalements: React.FC = () => {
  const [declarations, setDeclarations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [showFilter, setShowFilter] = useState(false)
  const token = localStorage.getItem('fmc_token')

  const fetchDecls = () => {
    fetch(`${API}/declarations/mine`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setDeclarations(Array.isArray(data) ? data : data.declarations || []))
      .catch(() => setDeclarations([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDecls() }, [])

  const handleVote = async (id: string) => {
    try {
      await fetch(`${API}/declarations/${id}/vote`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    } catch { }
  }

  const handleRate = async (id: string, rating: number) => {
    try {
      await fetch(`${API}/declarations/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating }),
      })
    } catch { }
  }

  const handleEdit = async (id: string, data: any) => {
    try {
      await fetch(`${API}/declarations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      fetchDecls()
    } catch { }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API}/declarations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setDeclarations(prev => prev.filter(d => d.id !== id))
    } catch { }
  }

  const filtered = declarations.filter(d => {
    const matchSearch = !search || d.title?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'Tous' || STATUS_MAP[d.citizen_status]?.label === statusFilter
    return matchSearch && matchStatus
  })

  const counts = {
    total: declarations.length,
    attente: declarations.filter(d => d.citizen_status === 'SOUMIS' || d.citizen_status === 'EN ATTENTE').length,
    cours: declarations.filter(d => d.citizen_status === 'EN COURS').length,
    termine: declarations.filter(d => d.citizen_status === 'TERMINE').length,
  }

  return (
    <CitizenLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0A1628]">Mes signalements</h1>
            <p className="text-slate-500 text-sm mt-1">{counts.total} signalement{counts.total !== 1 ? 's' : ''} au total</p>
          </div>
          <Link to="/nouveau-signalement"
            className="flex items-center gap-2 bg-[#1557FF] hover:bg-[#1040CC] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm">
            <Plus className="w-4 h-4" /> Nouveau
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Soumis', count: counts.attente, color: '#F59E0B' },
            { label: 'En cours', count: counts.cours, color: '#1557FF' },
            { label: 'Terminés', count: counts.termine, color: '#16a34a' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
              <p className="text-2xl font-extrabold mb-1" style={{ color: stat.color }}>{stat.count}</p>
              <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un signalement..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#1557FF] transition-all" />
          </div>
          <div className="relative">
            <button onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-[#1557FF] transition-all">
              <Filter className="w-4 h-4" /> {statusFilter} <ChevronDown className="w-4 h-4" />
            </button>
            {showFilter && (
              <div className="absolute top-full mt-1 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-36 py-1">
                {['Tous', 'Soumis', 'En cours', 'Terminé'].map(s => (
                  <button key={s} onClick={() => { setStatusFilter(s); setShowFilter(false) }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${statusFilter === s ? 'text-[#1557FF] font-bold bg-blue-50' : 'text-slate-700 hover:bg-slate-50'}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse h-24" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-slate-500 font-medium mb-4">
              {search ? 'Aucun résultat.' : "Vous n'avez pas encore de signalement."}
            </p>
            <Link to="/nouveau-signalement"
              className="inline-flex items-center gap-2 bg-[#1557FF] text-white font-bold px-5 py-2.5 rounded-xl text-sm">
              <Plus className="w-4 h-4" /> Créer mon premier signalement
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(d => (
              <DeclCard key={d.id} decl={d}
                onClick={() => setSelected(d)}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      {selected && <DetailModal decl={selected} onClose={() => setSelected(null)} onVote={handleVote} onRate={handleRate} />}
      {editTarget && <EditModal decl={editTarget} onClose={() => setEditTarget(null)} onSave={handleEdit} />}
      {deleteTarget && <DeleteModal decl={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />}
    </CitizenLayout>
  )
}

export default MesSignalements