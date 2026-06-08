import React, { useState, useEffect } from 'react';
import AgentLayout from '../../layouts/AgentLayout';
import AgentDeclarationDetail from './AgentDeclarationDetail';
import {
  Clock, CheckSquare, Eye, RefreshCw, Upload, X,
  Archive, Loader2, Star, FileText, Camera, AlertCircle,
  ChevronRight, RotateCcw, Search, Filter, Ban, Calendar,
  MapPin, Maximize2, Inbox, ArrowUpDown, MoreHorizontal, Plus,
  MessageSquare, Link2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const tok = () => localStorage.getItem('fmc_token') || '';
const hdr = () => ({ Authorization: `Bearer ${tok()}` });
const hjson = () => ({ ...hdr(), 'Content-Type': 'application/json' });

/* ─── helpers (Light theme) ─────────────────────────────────── */
const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  critique: { label: 'Critique', color: '#ef4444', bg: 'bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400' },
  elevee:   { label: 'Élevée',   color: '#f97316', bg: 'bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400' },
  moyenne:  { label: 'Moyenne',  color: '#eab308', bg: 'bg-yellow-100 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400' },
  basse:    { label: 'Basse',    color: '#10b981', bg: 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' },
};

const Stars = ({ score }: { score: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <Star key={n} size={10}
        className={n <= score ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-800 fill-slate-200 dark:fill-slate-800'} />
    ))}
  </div>
);

/** Dot-style progress bar matching the reference design */
const ProgressDots = ({ percent, color }: { percent: number; color: string }) => {
  const total = 12;
  const filled = Math.round((percent / 100) * total);
  return (
    <div className="flex items-center gap-0.5 flex-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${i < filled ? '' : 'bg-slate-200 dark:bg-slate-800'}`}
          style={i < filled ? { backgroundColor: color } : undefined} />
      ))}
    </div>
  );
};

const colProgress = (colId: string) => {
  if (colId === 'assignee_agent') return 20;
  if (colId === 'en_cours') return 55;
  if (colId === 'resolue') return 80;
  return 100;
};

type ColDef = {
  id: string;
  title: string;
  accent: string;   // hex
  accentCls: string; // tailwind text class
  description: string;
};

const COLUMNS: ColDef[] = [
  { id: 'assignee_agent', title: 'Prioritaire', accent: '#f97316', accentCls: 'text-orange-500', description: 'Urgences à valider' },
  { id: 'en_cours',       title: 'En cours',    accent: '#10b981', accentCls: 'text-emerald-500', description: 'Interventions terrain' },
  { id: 'resolue',        title: 'Évaluée',     accent: '#8b5cf6', accentCls: 'text-violet-500',  description: 'Attente citoyen' },
  { id: 'cloturee',       title: 'Clôturée',    accent: '#3b82f6', accentCls: 'text-blue-500',   description: 'Missions finalisées' },
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
  const categories = Array.from(new Set(safe.map((d: any) => d.category).filter(Boolean))) as string[];
  const archivedItems = safe.filter(d => isArchived(d));

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

  const renderCard = (item: any, col: ColDef) => {
    const colId   = col.id;
    const prio    = PRIORITY_CFG[item.priority?.toLowerCase()] || PRIORITY_CFG.moyenne;
    const proof   = proofPhoto(item);
    const textPhotoBefore = beforePhoto(item);
    const rapport = item.rapport_interne || item.internal_comments?.[0]?.content || null;
    const progress = colProgress(colId);
    const draggable = colId === 'assignee_agent' || colId === 'en_cours';

    return (
      <motion.div
        key={item.id}
        layoutId={`card-${item.id}`}
        draggable={draggable}
        onDragStart={e => handleDragStart(e as any, item.id)}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md dark:shadow-black/20 hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing group"
        whileHover={{ scale: 1.005 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Photo thumbnail */}
        {(proof || textPhotoBefore) && (
          <div
            className="relative h-28 w-full overflow-hidden rounded-t-2xl cursor-zoom-in group/img"
            onClick={() => setLightboxUrl(proof ? proof.url : textPhotoBefore!)}
          >
            <img src={proof ? proof.url : textPhotoBefore!} alt="Photo"
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
            <div className="absolute top-2 left-2 text-[9px] font-bold text-white px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ backgroundColor: proof ? '#10b981' : '#6366f1' }}>
              <Camera size={8} />{proof ? 'Après' : 'Avant'}
            </div>
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 size={16} className="text-white" />
            </div>
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* Tags row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.category && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: col.accent + '1a', color: col.accent }}>
                  #{item.category}
                </span>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${prio.bg}`}>
                #{prio.label}
              </span>
            </div>
            <button onClick={() => setSelectedDecl(item.id)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex-shrink-0"
              title="Voir détail">
              <Eye size={13} />
            </button>
          </div>

          {/* Title */}
          <h4 className="text-sm font-bold leading-snug line-clamp-2" style={{ color: col.accent }}>
            {item.title}
          </h4>

          {/* Description */}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {item.description || item.address || 'Aucune description.'}
          </p>

          {/* Rapport snippet */}
          {rapport && (colId === 'resolue' || colId === 'cloturee') && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic line-clamp-1 border-l-2 pl-2"
              style={{ borderColor: col.accent + '60' }}>"{rapport}"</p>
          )}

          {/* Citizen rating */}
          {colId === 'cloturee' && item.rating && (
            <div className="flex items-center gap-1.5">
              <Stars score={item.rating.score} />
              {item.rating.comment && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 italic line-clamp-1">{item.rating.comment}</span>
              )}
            </div>
          )}

          {/* Missing proof warning */}
          {colId === 'en_cours' && !hasProofPhoto(item) && (
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl px-2.5 py-1.5">
              <AlertCircle size={11} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">Photo preuve requise</span>
            </div>
          )}

          {/* Waiting badge */}
          {colId === 'resolue' && (
            <div className="flex items-center gap-1 text-[9px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 px-2 py-1 rounded-lg">
              <Clock size={9} />
              <span>Attente citoyen — Clôture auto J+7</span>
            </div>
          )}

          {/* Date + Progress dots */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Calendar size={9} />
                {item.created_at
                  ? new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                  : '—'}
              </span>
              <span className="text-[10px] font-bold" style={{ color: col.accent }}>{progress}%</span>
            </div>
            <ProgressDots percent={progress} color={col.accent} />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            {colId === 'assignee_agent' && (
              <>
                <button onClick={() => setRefuseDeclId(item.id)}
                  className="text-[10px] font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-900/30 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
                  <Ban size={10} /> Refuser
                </button>
                <button onClick={() => acceptMission(item.id)}
                  className="text-[10px] font-semibold text-white px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  style={{ backgroundColor: col.accent }}>
                  <ChevronRight size={10} /> Accepter
                </button>
              </>
            )}
            {colId === 'en_cours' && (
              <button onClick={() => setResolveDeclId(item.id)}
                className="text-[10px] font-semibold text-white px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                style={{ backgroundColor: col.accent }}>
                <CheckSquare size={10} /> Évaluer
              </button>
            )}
            {canArchive(item) && (
              <button onClick={() => archiveCard(item.id)}
                className="text-[10px] font-semibold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
                <Archive size={10} /> Archiver
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <AgentLayout>
      <div className="min-h-screen bg-[#f8f9fb] dark:bg-slate-950 px-6 py-5 space-y-5 transition-colors duration-200">

        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Tableau de bord</h1>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Pilotez vos missions — glissez-déposez pour avancer</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input type="text" placeholder="Rechercher..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 transition-colors w-40" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={11} /></button>}
            </div>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="text-xs border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:border-emerald-500 transition-colors">
              <option value="newest">📅 Plus récent</option>
              <option value="oldest">📅 Plus ancien</option>
            </select>
            <select value={prioFilter} onChange={e => setPrioFilter(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:border-emerald-500 transition-colors">
              <option value="">Toutes priorités</option>
              <option value="critique">Critique</option>
              <option value="elevee">Élevée</option>
              <option value="moyenne">Moyenne</option>
              <option value="basse">Basse</option>
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:border-emerald-500 transition-colors">
              <option value="">Toutes catégories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <button onClick={() => setEvaluatedOnly(p => !p)}
              className={`text-xs px-3 py-2 rounded-xl border font-semibold transition-all ${
                evaluatedOnly 
                  ? 'border-violet-400 dark:border-violet-500/50 bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}>
              <CheckSquare size={12} className="inline mr-1" />Évaluées
            </button>
            {(searchTerm || prioFilter || categoryFilter || evaluatedOnly) && (
              <button onClick={() => { setSearchTerm(''); setPrioFilter(''); setCategoryFilter(''); setEvaluatedOnly(false); }}
                className="text-xs font-semibold text-red-400 dark:text-red-400 hover:text-red-500 dark:hover:text-red-400 border border-red-200 dark:border-red-900/30 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl transition-colors">
                Réinitialiser
              </button>
            )}
            <button onClick={() => setShowArchive(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <Archive size={13} /> Archives ({archivedIds.size})
            </button>
            <button onClick={fetchDecls}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all" title="Actualiser">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* ── Board ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <Loader2 size={32} className="animate-spin mb-3 text-blue-400" />
            <p className="text-sm font-medium text-gray-500">Chargement des fiches...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
            {COLUMNS.map(col => {
              const items = itemsFor(col.id);
              const isOver = dragOverCol === col.id;
              return (
                <div key={col.id}
                  onDragOver={e => handleDragOver(e, col.id)}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={e => handleDrop(e, col.id)}
                  className={`flex flex-col transition-all duration-200 min-h-[520px] rounded-2xl ${isOver ? 'scale-[1.01]' : ''}`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{col.title}</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{items.length} fiche{items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white dark:text-slate-200 bg-slate-800 dark:bg-slate-900 border border-transparent dark:border-slate-800">
                        {items.length}
                      </span>
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Drop indicator */}
                  <AnimatePresence>
                    {isOver && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-center text-[10px] font-bold py-2 mb-2 rounded-xl border-2 border-dashed"
                        style={{ color: col.accent, borderColor: col.accent + '50', backgroundColor: col.accent + '0d' }}>
                        ↓ Déposer ici
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Cards */}
                  <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm">
                        <Inbox size={24} className="mb-2" />
                        <p className="text-[10px] font-semibold uppercase tracking-wide">Aucune fiche</p>
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {items.map(item => renderCard(item, col))}
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
                  className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-300 transition-colors"
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
                        <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {item.ref_citoyen || `#${item.id?.slice(-4)}`}
                        </span>
                        <button
                          onClick={() => unarchiveCard(item.id)}
                          title="Restaurer sur le tableau"
                          className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 hover:text-emerald-400 text-slate-400 transition-all flex items-center gap-1 text-[9px] font-bold"
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
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-slate-900 text-slate-200">
              {/* Photo uploader */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                className="flex-1 py-3 rounded-2xl border border-slate-800 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
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
                <div className="w-9 h-9 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-550">
                  <Ban size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-100">Refuser la mission</p>
                  <p className="text-[10px] text-rose-500">Un motif de refus détaillé est obligatoire</p>
                </div>
              </div>
              <button
                onClick={closeRefuseModal}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-slate-900 text-slate-200">
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-[11px] text-rose-500 leading-relaxed">
                ℹ️ Cette action retournera le signalement au Chef de Service. Vous devez justifier ce refus par écrit (min. 10 caractères).
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                className="flex-1 py-3 rounded-2xl border border-slate-800 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
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

      {/* Details modal */}
      {selectedDecl && (
        <AgentDeclarationDetail
          tacheId={selectedDecl}
          onClose={() => setSelectedDecl(null)}
          onAccepted={() => {
            fetchDecls();
            setSelectedDecl(null);
          }}
          onRejected={() => {
            fetchDecls();
            setSelectedDecl(null);
          }}
        />
      )}
    </AgentLayout>
  );
}
