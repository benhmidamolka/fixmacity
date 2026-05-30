import React, { useState, useEffect, useRef } from 'react';
import AgentLayout from '../../layouts/AgentLayout';
import AgentDeclarationDetail from './AgentDeclarationDetail';
import {
  Clock, CheckSquare, Eye, RefreshCw, Upload, X,
  Archive, Loader2, Star, FileText, Camera, AlertCircle,
  Kanban as KanbanIcon, ChevronRight, RotateCcw, Search,
  Filter, Ban, Calendar, MapPin, Maximize2, Sparkles, Inbox,
  ArrowUpDown, CheckCircle, CheckSquare as CheckIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const tok = () => localStorage.getItem('fmc_token') || '';
const hdr = () => ({ Authorization: `Bearer ${tok()}` });
const hjson = () => ({ ...hdr(), 'Content-Type': 'application/json' });

/* ─── helpers (Dark theme optimized) ────────────────────────── */
const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critique: { label: 'Critique', color: '#ef4444', bg: 'bg-red-500/10 text-red-400 border border-red-500/20', border: 'border-red-900/30' },
  elevee:   { label: 'Élevée',  color: '#f97316', bg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', border: 'border-orange-900/30' },
  moyenne:  { label: 'Moyenne', color: '#eab308', bg: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20', border: 'border-yellow-900/30' },
  basse:    { label: 'Basse',   color: '#10b981', bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', border: 'border-emerald-900/30' },
};

const Stars = ({ score }: { score: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <Star
        key={n}
        size={11}
        className={n <= score ? 'text-amber-400 fill-amber-400' : 'text-slate-700 fill-slate-700'}
      />
    ))}
  </div>
);

type ColDef = {
  id: string;
  title: string;
  gradient: string;
  accent: string;
  badgeBg: string;
  description: string;
};

// Renamed "À accepter" to "Prioritaire"
const COLUMNS: ColDef[] = [
  {
    id: 'assignee_agent',
    title: 'Prioritaire',
    gradient: 'from-rose-600 to-orange-600',
    accent: 'border-l-rose-500',
    badgeBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    description: 'Urgences & priorités à valider',
  },
  {
    id: 'en_cours',
    title: 'En cours',
    gradient: 'from-amber-500 to-orange-500',
    accent: 'border-l-orange-500',
    badgeBg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    description: 'Interventions sur le terrain',
  },
  {
    id: 'resolue',
    title: 'Évaluée',
    gradient: 'from-emerald-500 to-teal-600',
    accent: 'border-l-emerald-500',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    description: 'En attente du citoyen',
  },
  {
    id: 'cloturee',
    title: 'Clôturée',
    gradient: 'from-slate-700 to-slate-800',
    accent: 'border-l-slate-600',
    badgeBg: 'bg-slate-800 text-slate-400 border border-slate-700',
    description: 'Missions finalisées',
  },
];

export default function AgentKanbanBoard() {
  const [declarations, setDeclarations]   = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedDecl, setSelectedDecl]   = useState<string | null>(null);
  const [showArchive, setShowArchive]     = useState(false);
  const [lightboxUrl, setLightboxUrl]     = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm]       = useState('');
  const [prioFilter, setPrioFilter]       = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // New sorting and evaluated states
  const [sortOrder, setSortOrder]         = useState<'newest' | 'oldest'>('newest');
  const [evaluatedOnly, setEvaluatedOnly] = useState<boolean>(false);

  // Local archive state — ids the agent has chosen to hide
  const [archivedIds, setArchivedIds]     = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('fmc_agent_archived_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem('fmc_agent_archived_ids', JSON.stringify(Array.from(archivedIds)));
  }, [archivedIds]);

  // Drag & drop
  const [draggedId, setDraggedId]         = useState<string | null>(null);
  const [dragOverCol, setDragOverCol]     = useState<string | null>(null);

  // Resolve modal
  const [resolveDeclId, setResolveDeclId]           = useState<string | null>(null);
  const [resolveReason, setResolveReason]           = useState('');
  const [resolvePhoto, setResolvePhoto]             = useState<File | null>(null);
  const [resolvePhotoPreview, setResolvePhotoPreview] = useState<string | null>(null);
  const [resolving, setResolving]                   = useState(false);

  // Refuse modal
  const [refuseDeclId, setRefuseDeclId]             = useState<string | null>(null);
  const [refuseReason, setRefuseReason]             = useState('');
  const [refusing, setRefusing]                     = useState(false);

  /* fetch */
  const fetchDecls = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/agent/declarations`, { headers: hdr() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDeclarations(data.declarations || (Array.isArray(data) ? data : []));
    } catch {
      toast.error('Impossible de charger vos missions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecls();
    const params = new URLSearchParams(window.location.search);
    const openId = params.get('open');
    if (openId) {
      setSelectedDecl(openId);
    }
  }, []);

  /* helpers */
  const archiveCard   = (id: string) => {
    setArchivedIds(prev => new Set([...prev, id]));
    toast.success('Mission archivée localement');
  };
  const unarchiveCard = (id: string) => {
    setArchivedIds(prev => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
    toast.success('Mission restaurée sur le tableau');
  };

  const isArchived = (d: any) => archivedIds.has(d.id);
  const canArchive = (d: any) => d.status === 'cloturee';

  const hasProofPhoto = (d: any) =>
    Array.isArray(d.photos) && d.photos.some((p: any) => ['intervention', 'apres', 'after', 'proof'].includes(p.photo_type));

  const proofPhoto = (d: any) =>
    (d.photos || []).find((p: any) => ['intervention', 'apres', 'after', 'proof'].includes(p.photo_type));

  const beforePhoto = (d: any) =>
    d.photo_avant || (d.photos || []).find((p: any) => p.photo_type === 'before' || p.photo_type === 'avant')?.url;

  const closedByCron = (d: any) => d.status === 'cloturee' && !d.rating;

  /* ─── actions ───────────────────────────────────────────────── */
  const acceptMission = async (id: string) => {
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/accept`, {
        method: 'POST', headers: hjson(),
      });
      if (!res.ok) throw new Error();
      toast.success('✅ Mission acceptée — intervention démarrée');
      fetchDecls();
    } catch {
      toast.error("Erreur lors de l'acceptation");
    }
  };

  const handleRefuseSubmit = async () => {
    if (!refuseReason.trim() || refuseReason.trim().length < 10) {
      toast.error('Le motif de refus doit faire au moins 10 caractères.');
      return;
    }
    setRefusing(true);
    try {
      const res = await fetch(`${API}/agent/declarations/${refuseDeclId}/refuse`, {
        method: 'POST',
        headers: hjson(),
        body: JSON.stringify({ raison: refuseReason.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success('✕ Mission refusée');
      closeRefuseModal();
      fetchDecls();
    } catch {
      toast.error('Erreur lors du refus de la mission');
    } finally {
      setRefusing(false);
    }
  };

  const handleResolveSubmit = async () => {
    if (!resolvePhoto || !resolveDeclId) {
      toast.error('La photo de preuve est obligatoire.');
      return;
    }
    setResolving(true);
    try {
      // 1. Upload proof photo
      const fd = new FormData();
      fd.append('photo', resolvePhoto);
      const photoRes = await fetch(`${API}/agent/declarations/${resolveDeclId}/photo`, {
        method: 'POST', headers: hdr(), body: fd,
      });
      if (!photoRes.ok) throw new Error('Erreur téléversement photo');

      // 2. Mark resolved
      const res = await fetch(`${API}/agent/declarations/${resolveDeclId}/resolve`, {
        method: 'POST',
        headers: hjson(),
        body: JSON.stringify({ rapport_interne: resolveReason || 'Mission évaluée.' }),
      });
      if (!res.ok) throw new Error('Erreur mise à jour statut');

      toast.success('✅ Mission marquée comme évaluée');
      closeResolveModal();
      fetchDecls();
    } catch (err: any) {
      toast.error(err.message || 'Une erreur est survenue.');
    } finally {
      setResolving(false);
    }
  };

  const closeResolveModal = () => {
    setResolveDeclId(null);
    setResolveReason('');
    setResolvePhoto(null);
    if (resolvePhotoPreview) URL.revokeObjectURL(resolvePhotoPreview);
    setResolvePhotoPreview(null);
  };

  const closeRefuseModal = () => {
    setRefuseDeclId(null);
    setRefuseReason('');
  };

  /* ─── drag & drop ───────────────────────────────────────────── */
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  const handleDrop = async (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    setDraggedId(null);
    if (!id) return;

    const card = declarations.find(d => d.id === id);
    if (!card || card.status === targetColId) return;

    // Only allow forward transitions
    if (targetColId === 'en_cours' && card.status === 'assignee_agent') {
      await acceptMission(id);
    } else if (targetColId === 'resolue' && card.status === 'en_cours') {
      setResolveDeclId(id);
    } else {
      toast.error('Transition non autorisée — utilisez les boutons sur la carte.');
    }
  };

  /* ─── filtered data ─────────────────────────────────────────── */
  const safe = Array.isArray(declarations) ? declarations : [];

  const filterItem = (item: any) => {
    // If evaluated only is checked, we only show 'resolue' tasks
    if (evaluatedOnly && item.status !== 'resolue') {
      return false;
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const matchText = (item.title || '').toLowerCase().includes(s) ||
        (item.description || '').toLowerCase().includes(s) ||
        (item.ref_citoyen || '').toLowerCase().includes(s) ||
        (item.category || '').toLowerCase().includes(s);
      if (!matchText) return false;
    }
    if (prioFilter && item.priority?.toLowerCase() !== prioFilter.toLowerCase()) {
      return false;
    }
    if (categoryFilter && item.category !== categoryFilter) {
      return false;
    }
    return true;
  };

  const itemsFor = (colId: string) => {
    let list = safe.filter(d => d.status === colId && !isArchived(d) && filterItem(d));
    
    // "Prioritaire" only targets assignments the agent has to accept with priority high or urgent
    if (colId === 'assignee_agent') {
      list = list.filter(d => ['critique', 'elevee', 'urgent', 'high'].includes(d.priority?.toLowerCase()));
    }

    // Dynamic date sorting (newest/oldest)
    return list.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === 'newest' ? db - da : da - db;
    });
  };

  const archivedItems = safe.filter(d => isArchived(d));

  // Extract unique categories for filter
  const categories = Array.from(new Set(safe.map(d => d.category).filter(Boolean)));

  /* ─── card rendering ─────────────────────────────────────────── */
  const renderCard = (item: any, colId: string) => {
    const prio = PRIORITY_CFG[item.priority?.toLowerCase()] || PRIORITY_CFG.moyenne;
    const proof = proofPhoto(item);
    const textPhotoBefore = beforePhoto(item);
    const rapport = item.rapport_interne || item.internal_comments?.[0]?.content || null;

    return (
      <motion.div
        key={item.id}
        layoutId={`card-${item.id}`}
        draggable={colId === 'assignee_agent' || colId === 'en_cours'}
        onDragStart={e => handleDragStart(e as any, item.id)}
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg hover:shadow-black/50 hover:-translate-y-0.5 hover:border-slate-700/80 transition-all group relative overflow-hidden flex flex-col cursor-grab active:cursor-grabbing"
        whileHover={{ scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Priority stripe */}
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: prio.color }} />

        {/* Media Cover if available */}
        {proof ? (
          <div className="relative h-28 w-full overflow-hidden bg-slate-950 border-b border-slate-800 group/img cursor-zoom-in" onClick={() => setLightboxUrl(proof.url)}>
            <img src={proof.url} alt="Intervention" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
            <div className="absolute top-2 left-2 bg-emerald-600/95 backdrop-blur-md text-[9px] font-black text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
              <Camera size={9} /> Après
            </div>
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 size={16} className="text-white drop-shadow-md" />
            </div>
          </div>
        ) : textPhotoBefore ? (
          <div className="relative h-28 w-full overflow-hidden bg-slate-950 border-b border-slate-800 group/img cursor-zoom-in" onClick={() => setLightboxUrl(textPhotoBefore)}>
            <img src={textPhotoBefore} alt="Signalement" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
            <div className="absolute top-2 left-2 bg-indigo-600/95 backdrop-blur-md text-[9px] font-black text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
              <Camera size={9} /> Avant
            </div>
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 size={16} className="text-white drop-shadow-md" />
            </div>
          </div>
        ) : null}

        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            {/* Top row */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {item.ref_citoyen || `#${item.id?.slice(-4)}`}
              </span>
              <button
                onClick={() => setSelectedDecl(item.id)}
                className="p-1 rounded-lg bg-slate-850 hover:bg-emerald-950 hover:text-emerald-400 text-slate-400 border border-slate-800 transition-colors flex-shrink-0"
                title="Voir détail"
              >
                <Eye size={12} />
              </button>
            </div>

            {/* Title & description */}
            <div>
              <h4 className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-emerald-400 transition-colors">
                {item.title}
              </h4>
              <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                {item.description || 'Aucune description.'}
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {item.category && (
                <span className="text-[9px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
                  {item.category}
                </span>
              )}
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${prio.bg}`}>
                {prio.label}
              </span>
            </div>

            {/* Address */}
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
              <MapPin size={9} className="text-slate-500" />
              <span className="truncate">{item.address || 'Non spécifié'}</span>
            </div>

            {/* ── resolue: proof photo + rapport, awaiting citizen feedback ── */}
            {colId === 'resolue' && (
              <div className="space-y-2 pt-1 border-t border-slate-800">
                {rapport && (
                  <div className="bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <FileText size={10} className="text-slate-500" />
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Rapport</span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed italic">"{rapport}"</p>
                  </div>
                )}
                <div className="flex items-center gap-1 text-[8px] text-amber-400 font-semibold bg-amber-950/20 border border-amber-900/30 px-2 py-1 rounded-lg">
                  <Clock size={10} className="text-amber-500" />
                  <span>Attente citoyen / Clôture auto J+7</span>
                </div>
              </div>
            )}

            {/* ── cloturee: rating (citizen) or CRON badge + proof + rapport ── */}
            {colId === 'cloturee' && (
              <div className="space-y-2 pt-1 border-t border-slate-800">
                {/* Closed-by indicator */}
                {closedByCron(item) ? (
                  <div className="flex items-center gap-1 text-[8px] text-slate-400 font-semibold bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg">
                    <Clock size={10} className="text-slate-500" />
                    <span>Clôture auto CRON +7j</span>
                  </div>
                ) : (
                  <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-0.5">
                        <CheckSquare size={8} className="text-emerald-400" /> Évaluation citoyenne
                      </span>
                      {item.rating && <Stars score={item.rating.score} />}
                    </div>
                    {item.rating?.comment && (
                      <p className="text-[10px] text-slate-300 italic leading-relaxed">
                        "{item.rating.comment}"
                      </p>
                    )}
                  </div>
                )}

                {rapport && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <FileText size={10} className="text-slate-500" />
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Mon rapport</span>
                    </div>
                    <p className="text-[9px] text-slate-400 line-clamp-1">{rapport}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── en_cours: warn if no photo yet ── */}
            {colId === 'en_cours' && !hasProofPhoto(item) && (
              <div className="flex items-center gap-1.5 bg-amber-950/20 border border-amber-900/30 rounded-xl px-2.5 py-1.5">
                <AlertCircle size={12} className="text-amber-500 flex-shrink-0 animate-pulse" />
                <span className="text-[9px] text-amber-400 font-medium">Photo preuve requise pour évaluer</span>
              </div>
            )}
          </div>

          {/* Footer: action button + timestamp */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-850 mt-3">
            <span className="text-[9px] text-slate-400 flex items-center gap-1">
              <Calendar size={9} className="text-slate-500" />
              {item.created_at
                ? new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                : '—'}
            </span>

            <div className="flex items-center gap-1">
              {colId === 'assignee_agent' && (
                <>
                  <button
                    onClick={() => setRefuseDeclId(item.id)}
                    className="text-[9px] font-bold text-rose-400 hover:bg-rose-950/60 bg-rose-950/30 border border-rose-900/40 px-2 py-1 rounded-lg flex items-center gap-0.5 transition-colors"
                  >
                    <Ban size={10} /> Refuser
                  </button>
                  <button
                    onClick={() => acceptMission(item.id)}
                    className="text-[9px] font-bold text-emerald-400 hover:bg-emerald-950/60 bg-emerald-950/30 border border-emerald-900/40 px-2 py-1 rounded-lg flex items-center gap-0.5 transition-colors"
                  >
                    <ChevronRight size={10} /> Accepter
                  </button>
                </>
              )}
              {colId === 'en_cours' && (
                <button
                  onClick={() => setResolveDeclId(item.id)}
                  className="text-[9px] font-bold text-emerald-400 hover:bg-emerald-950/60 bg-emerald-950/30 border border-emerald-900/40 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <CheckSquare size={10} /> Évaluer
                </button>
              )}
              {canArchive(item) && (
                <button
                  onClick={() => archiveCard(item.id)}
                  title="Archiver la fiche"
                  className="text-[9px] font-bold text-slate-400 hover:bg-slate-800 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg flex items-center gap-0.5 transition-colors"
                >
                  <Archive size={10} /> Archiver
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <AgentLayout>
      <div className="p-4 max-w-[1600px] mx-auto space-y-6 text-slate-100 bg-[#090d16] min-h-screen">

        {/* Header section with Stats Overview */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-2xl border border-slate-800 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <KanbanIcon size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  Tableau <Sparkles size={16} className="text-emerald-400" />
                </h1>
                <p className="text-xs text-slate-300 mt-1">
                  Pilotez vos chantiers, uploadez des preuves d'intervention et suivez les avis citoyens.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowArchive(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-850 bg-slate-900 hover:bg-slate-850 text-slate-200 transition-all hover:border-slate-750"
              >
                <Archive size={14} className="text-slate-400" />
                Archives ({archivedIds.size})
              </button>
              <button
                onClick={fetchDecls}
                className="p-2.5 rounded-xl border border-slate-850 bg-slate-900 hover:bg-slate-850 text-slate-200 transition-all hover:border-slate-750"
                title="Actualiser la liste"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Filters & Sorting Panel (Dark Mode Optimized) */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 flex-shrink-0">
            <Filter size={16} className="text-emerald-500" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">Filtres</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto flex-1 md:justify-end">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Rechercher par titre, ref, description..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Date Sorting */}
            <div className="relative">
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="w-full pl-3 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none cursor-pointer font-bold text-slate-200 focus:border-emerald-500 appearance-none"
              >
                <option value="newest">📅 Plus récent</option>
                <option value="oldest">📅 Plus ancien</option>
              </select>
              <ArrowUpDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Evaluated Cases Filter */}
            <button
              onClick={() => setEvaluatedOnly(prev => !prev)}
              className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl text-xs font-bold transition-all ${
                evaluatedOnly
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
              }`}
            >
              <CheckSquare size={13} className={evaluatedOnly ? 'text-emerald-400' : 'text-slate-400'} />
              Missions Évaluées
            </button>

            {/* Priority */}
            <select
              value={prioFilter}
              onChange={e => setPrioFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none cursor-pointer font-bold text-slate-200 focus:border-emerald-500"
            >
              <option value="">Toutes les priorités</option>
              <option value="critique">Critique</option>
              <option value="elevee">Élevée</option>
              <option value="moyenne">Moyenne</option>
              <option value="basse">Basse</option>
            </select>

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs outline-none cursor-pointer font-bold text-slate-200 focus:border-emerald-500"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {(searchTerm || prioFilter || categoryFilter || evaluatedOnly) && (
              <button
                onClick={() => { setSearchTerm(''); setPrioFilter(''); setCategoryFilter(''); setEvaluatedOnly(false); }}
                className="text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/20 border border-rose-900/40 px-3 py-2.5 rounded-xl transition-colors"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Board column grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400">
            <Loader2 size={36} className="animate-spin mb-4 text-emerald-400" />
            <p className="text-sm font-bold text-slate-300">Chargement des fiches...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
            {COLUMNS.map(col => {
              const items = itemsFor(col.id);
              const isOver = dragOverCol === col.id;

              return (
                <div
                  key={col.id}
                  onDragOver={e => handleDragOver(e, col.id)}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={e => handleDrop(e, col.id)}
                  className={`flex flex-col rounded-2xl border transition-all duration-200 min-h-[520px] ${
                    isOver
                      ? 'border-emerald-500 bg-emerald-950/10 shadow-lg scale-[1.01]'
                      : 'border-slate-850 bg-slate-900/60'
                  }`}
                >
                  {/* Column Header */}
                  <div className={`px-4 py-4 rounded-t-2xl border-b border-slate-850 flex items-center justify-between bg-gradient-to-r ${col.gradient} text-white`}>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider font-sans">
                        {col.title}
                      </h3>
                      <p className="text-[9px] text-white/80 font-medium mt-0.5">
                        {col.description}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md">
                      {items.length}
                    </span>
                  </div>

                  {/* Dropzone instruction indicator when drag over */}
                  <AnimatePresence>
                    {isOver && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-emerald-500/10 border-b border-emerald-400/20 px-3 py-2 text-center text-[10px] font-bold text-emerald-400 animate-pulse"
                      >
                        Déposer ici pour {col.id === 'en_cours' ? 'accepter la mission' : 'évaluer la mission'}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Cards area */}
                  <div className="p-3 space-y-4 flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/30">
                        <Inbox size={22} className="mb-2 text-slate-600" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Aucune fiche</p>
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {items.map(item => renderCard(item, col.id))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Archives Slide-Over Panel (Dark Mode Optimized) */}
      <AnimatePresence>
        {showArchive && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowArchive(false)}
              className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm"
            />
            {/* Side sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 right-0 z-[130] w-full max-w-md bg-slate-900 shadow-2xl flex flex-col border-l border-slate-800"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800">
                    <Archive size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                      Fiches Archivées
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Historique des missions clôturées masquées du board
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowArchive(false)}
                  className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Archived items list */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950">
                {archivedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <Archive size={28} className="mb-2 text-slate-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Aucune archive</p>
                    <p className="text-[10px] text-slate-500 text-center max-w-[200px] mt-1.5">
                      Les fiches clôturées peuvent être archivées pour libérer le tableau.
                    </p>
                  </div>
                ) : (
                  archivedItems.map(item => (
                    <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative group">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                          {item.ref_citoyen || `#${item.id?.slice(-4)}`}
                        </span>
                        <button
                          onClick={() => unarchiveCard(item.id)}
                          title="Restaurer sur le tableau"
                          className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-850 hover:text-emerald-400 text-slate-400 transition-all flex items-center gap-1 text-[9px] font-bold"
                        >
                          <RotateCcw size={10} /> Restaurer
                        </button>
                      </div>

                      <p className="text-xs font-bold text-slate-200 line-clamp-1">{item.title}</p>
                      
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-400">
                          Clôturée
                        </span>
                        {item.rating ? (
                          <div className="flex items-center gap-1.5 bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-900/30">
                            <Stars score={item.rating.score} />
                          </div>
                        ) : (
                          <span className="text-[9px] text-amber-400 bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-900/30 font-semibold flex items-center gap-0.5">
                            <Clock size={8} /> CRON +7j
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-slate-900/50 hover:bg-slate-800 text-white flex items-center justify-center transition-all hover:scale-105"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxUrl}
            alt="Aperçu plein écran"
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Resolve modal (Dark Mode) */}
      {resolveDeclId && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeResolveModal}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckSquare size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-100">Évaluer la mission</p>
                  <p className="text-[10px] text-emerald-400">Photo preuve obligatoire avant validation</p>
                </div>
              </div>
              <button
                onClick={closeResolveModal}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-850 flex items-center justify-center text-slate-400 border border-slate-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-slate-900 text-slate-200">
              {/* Photo uploader */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">
                  Photo preuve d'intervention *
                </p>
                {resolvePhotoPreview ? (
                  <div className="relative aspect-video rounded-2xl border border-slate-800 overflow-hidden bg-slate-950">
                    <img src={resolvePhotoPreview} alt="Aperçu" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setResolvePhoto(null); setResolvePhotoPreview(null); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-xl bg-black/60 text-white flex items-center justify-center"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-video rounded-2xl border-2 border-dashed border-slate-800 hover:border-emerald-500 bg-slate-950/50 cursor-pointer transition-all group">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setResolvePhoto(file);
                          setResolvePhotoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-sm text-slate-500 group-hover:text-emerald-400 mb-2 transition-colors">
                      <Upload size={16} />
                    </div>
                    <p className="text-xs font-bold text-slate-300 group-hover:text-emerald-400 transition-colors">
                      Télécharger une photo
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1">PNG, JPG ou WEBP — max 10 Mo</p>
                  </label>
                )}
              </div>

              {/* Rapport */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">
                  Rapport d'intervention <span className="normal-case font-normal">(facultatif)</span>
                </p>
                <textarea
                  value={resolveReason}
                  onChange={e => setResolveReason(e.target.value)}
                  placeholder="Décrivez brièvement les travaux réalisés sur le terrain..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-500 resize-none text-slate-100 placeholder-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 pb-6 flex gap-3 bg-slate-900">
              <button
                onClick={closeResolveModal}
                className="flex-1 py-3 rounded-2xl border border-slate-800 text-sm font-bold text-slate-400 hover:bg-slate-850 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleResolveSubmit}
                disabled={resolving || !resolvePhoto}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {resolving
                  ? <Loader2 size={14} className="animate-spin" />
                  : <><CheckSquare size={14} /> Confirmer évaluation</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refuse Modal (Dark Mode) */}
      {refuseDeclId && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeRefuseModal}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-450">
                  <Ban size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-100">Refuser la mission</p>
                  <p className="text-[10px] text-rose-450">Un motif de refus détaillé est obligatoire</p>
                </div>
              </div>
              <button
                onClick={closeRefuseModal}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-850 flex items-center justify-center text-slate-400 border border-slate-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-slate-900 text-slate-250">
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-[11px] text-rose-450 leading-relaxed">
                ℹ️ Cette action retournera le signalement au Chef de Service. Vous devez justifier ce refus par écrit (min. 10 caractères).
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">
                    Motif du refus *
                  </p>
                  <span className={`text-[9px] font-bold ${refuseReason.trim().length >= 10 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {refuseReason.trim().length} / 10 min
                  </span>
                </div>
                <textarea
                  value={refuseReason}
                  onChange={e => setRefuseReason(e.target.value)}
                  placeholder="Justifiez le refus (ex: adresse erronée, problème de sécurité, hors du champ de compétences de mon service...)"
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-rose-500 resize-none text-slate-100 placeholder-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 pb-6 flex gap-3 bg-slate-900">
              <button
                onClick={closeRefuseModal}
                className="flex-1 py-3 rounded-2xl border border-slate-800 text-sm font-bold text-slate-400 hover:bg-slate-850 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleRefuseSubmit}
                disabled={refusing || refuseReason.trim().length < 10}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {refusing
                  ? <Loader2 size={14} className="animate-spin" />
                  : <><Ban size={14} /> Confirmer refus</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </AgentLayout>
  );
}
