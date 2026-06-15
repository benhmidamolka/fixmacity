import React, { useState, useEffect } from 'react';
import AgentLayout from '../../layouts/AgentLayout';
import AgentDeclarationDetail from './AgentDeclarationDetail';
import type { Declaration, RawDeclaration } from '../../types/agent.types';
import {
  Search, Clock, CheckCircle2,
  AlertTriangle, Eye, RefreshCw,
  Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const tok = () => localStorage.getItem('fmc_token') || '';
const hdr = () => ({ Authorization: `Bearer ${tok()}` });
const hjson = () => ({ ...hdr(), 'Content-Type': 'application/json' });

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  critique: { label: 'Critique', color: '#ef4444', bg: '#ef444415' },
  elevee:   { label: 'Élevée',   color: '#f97316', bg: '#f9731615' },
  haute:    { label: 'Haute',    color: '#f97316', bg: '#f9731615' },
  moyenne:  { label: 'Moyenne',  color: '#eab308', bg: '#eab30815' },
  basse:    { label: 'Basse',    color: '#10b981', bg: '#10b98115' },
  faible:   { label: 'Faible',   color: '#10b981', bg: '#10b98115' },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  assignee_agent: { label: 'À Accepter', color: '#3b82f6', bg: '#3b82f615', dot: '#3b82f6' },
  en_cours:       { label: 'En cours',   color: '#f97316', bg: '#f9731615', dot: '#f97316' },
  resolue:        { label: 'Résolue',    color: '#10b981', bg: '#10b98115', dot: '#10b981' },
  cloturee:       { label: 'Clôturée',   color: '#9ca3af', bg: '#9ca3af15', dot: '#9ca3af' },
  refusee_agent:  { label: 'Refusée',    color: '#ef4444', bg: '#ef444415', dot: '#ef4444' },
};

const getAssignmentType = (decl: any) => {
  const other = decl.other_assignments || [];
  if (other.length === 0) {
    return { label: 'Solo', bg: 'bg-indigo-950/40 text-indigo-400 border-indigo-900/30', text: 'Seul agent assigné' };
  }
  const currentDeptId = decl.department_id;
  const hasOtherDept = other.some((oa: any) => oa.department_id !== currentDeptId);
  if (hasOtherDept) {
    return { label: 'Multi-Département', bg: 'bg-purple-950/40 text-purple-400 border-purple-900/30', text: 'Plusieurs départements requis' };
  }
  return { label: 'Multi-Agent', bg: 'bg-cyan-950/40 text-cyan-400 border-cyan-900/30', text: 'Plusieurs agents du même département' };
};

export default function AgentDeclarations() {
  const [declarations, setDeclarations] = useState<RawDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [evaluatedOnly, setEvaluatedOnly] = useState<boolean>(false);

  const [selectedDecl, setSelectedDecl] = useState<string | null>(null);



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

  const safeDeclarations = Array.isArray(declarations) ? declarations : [];

  const filteredTable = safeDeclarations.filter((d) => {
    const matchSearch =
      (d.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.ref_citoyen || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.address || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchPriority =
      priorityFilter === 'all' ||
      (d.priority || '').toLowerCase() === priorityFilter.toLowerCase();
    const matchEvaluated = !evaluatedOnly || (d.rating && d.rating.score > 0);

    return matchSearch && matchStatus && matchPriority && matchEvaluated;
  });

  const sortedTable = [...filteredTable].sort((a, b) => {
    const dateA = a.assigned_at ? new Date(a.assigned_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
    const dateB = b.assigned_at ? new Date(b.assigned_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  // Quick accept directly from the table row (no detail modal needed)
  const quickAccept = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/accept`, {
        method: 'POST',
        headers: hjson(),
      });
      if (!res.ok) throw new Error();
      toast.success('Mission acceptée — Intervention démarrée');
      fetchDecls();
    } catch {
      toast.error("Erreur lors de l'acceptation");
    }
  };

  // Quick reject opens the detail modal on the Actions tab so agent can fill motif
  const quickReject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedDecl(id);
    // The detail modal will open on the "actions" tab for pending missions
  };

  const stats = {
    total:    safeDeclarations.length,
    pending:  safeDeclarations.filter(d => d.status === 'assignee_agent').length,
    active:   safeDeclarations.filter(d => d.status === 'en_cours').length,
    done:     safeDeclarations.filter(d => ['resolue', 'cloturee'].includes(d.status)).length,
  };

  const ROWS_PER_PAGE = 15;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(sortedTable.length / ROWS_PER_PAGE);
  const pagedRows = sortedTable.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <AgentLayout title="Toutes les Missions">
      <div className="space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-[#0A1628] dark:text-white">Toutes les Missions</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-0.5">
              {safeDeclarations.length} mission{safeDeclarations.length !== 1 ? 's' : ''} dans votre portefeuille
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchDecls}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black hover:border-slate-300 transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total',      value: stats.total,   dot: '#94A3B8' },
            { label: 'En attente', value: stats.pending, dot: '#3B82F6' },
            { label: 'En cours',   value: stats.active,  dot: '#F97316' },
            { label: 'Terminées',  value: stats.done,    dot: '#10B981' },
          ].map(({ label, value, dot }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
              </div>
              <p className="text-2xl font-black text-[#0A1628] dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Table card ── */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.75rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">

              {/* Status filter */}
              <div className="relative" ref={null}>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-full border text-[11px] font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="assignee_agent">À Accepter</option>
                  <option value="en_cours">En cours</option>
                  <option value="resolue">Résolue</option>
                  <option value="cloturee">Clôturée</option>
                  <option value="refusee_agent">Refusée</option>
                </select>
              </div>

              {/* Priority filter */}
              <select
                value={priorityFilter}
                onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full border text-[11px] font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <option value="all">Toutes priorités</option>
                <option value="critique">Critique</option>
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>

              {/* Sort */}
              <select
                value={sortOrder}
                onChange={e => { setSortOrder(e.target.value as 'newest' | 'oldest'); setPage(1); }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full border text-[11px] font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <option value="newest">Plus récent</option>
                <option value="oldest">Plus ancien</option>
              </select>

              {/* Evaluated filter */}
              <select
                value={evaluatedOnly ? 'yes' : 'no'}
                onChange={e => { setEvaluatedOnly(e.target.value === 'yes'); setPage(1); }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full border text-[11px] font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <option value="no">Toutes</option>
                <option value="yes">Évaluées seulement</option>
              </select>


            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Titre, Réf, Adresse…"
                className="w-52 pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 font-medium text-[#0A1628] dark:text-white placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          {/* Table header */}
          <div
            className="grid items-center gap-4 px-5 py-2.5 bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800"
            style={{ gridTemplateColumns: '1fr 160px 110px 130px 140px 110px 120px' }}
          >
            {['Déclaration', 'Description', 'Priorité', 'Affectation', 'Date assignée', 'État', 'Actions'].map(h => (
              <p key={h} className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{h}</p>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="grid gap-4 px-5 py-4 items-center animate-pulse"
                  style={{ gridTemplateColumns: '1fr 160px 110px 130px 140px 110px 120px' }}>
                  <div className="space-y-1.5"><div className="h-4 w-40 bg-slate-100 dark:bg-slate-800 rounded-lg" /><div className="h-2.5 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg" /></div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-lg" />
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full" />
                  <div className="h-6 w-28 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                  <div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full" />
                  <div className="flex gap-1.5"><div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg" /><div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg" /></div>
                </div>
              ))}
            </div>
          ) : pagedRows.length === 0 ? (
            <div className="py-20 text-center">
              <CheckCircle2 className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500">
                {search || statusFilter !== 'all' ? 'Aucun résultat.' : 'Aucune mission.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/30">
              {pagedRows.map((d, i) => {
                const prio = PRIORITY_CFG[(d.priority || '').toLowerCase()] || PRIORITY_CFG.moyenne;
                const stat = STATUS_CFG[d.status] || { label: d.status, color: '#94a3b8', bg: '#94a3b815', dot: '#94a3b8' };
                const assignType = getAssignmentType(d);
                const isPending = d.status === 'assignee_agent';

                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDecl(d.id)}
                    className={`grid gap-4 px-5 py-3.5 items-center cursor-pointer group hover:bg-slate-50/70 dark:hover:bg-slate-800/20 transition-colors ${i % 2 !== 0 ? 'bg-slate-50/30 dark:bg-slate-800/10' : ''}`}
                    style={{ gridTemplateColumns: '1fr 160px 110px 130px 140px 110px 120px' }}
                  >
                    {/* Title + ref */}
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#0A1628] dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {d.title}
                      </p>
                      <p className="font-mono text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                        {d.ref_citoyen || `#${d.id?.slice(-4)}`}
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-2">
                        {d.description || <span className="italic">—</span>}
                      </p>
                    </div>

                    {/* Priority */}
                    <div>
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
                        style={{ color: prio.color, background: prio.bg }}
                      >
                        {prio.label}
                      </span>
                    </div>

                    {/* Assignment type */}
                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${assignType.bg}`}>
                        {assignType.label}
                      </span>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[120px]">{assignType.text}</p>
                    </div>

                    {/* Date assigned */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <p className="text-[11px] font-bold text-[#0A1628] dark:text-slate-300">
                          {d.assigned_at
                            ? new Date(d.assigned_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
                        style={{ color: stat.color, background: stat.bg }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: stat.dot }} />
                        {stat.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedDecl(d.id)}
                        title="Voir les détails"
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {isPending && (
                        <>
                          <button
                            onClick={e => quickAccept(e, d.id)}
                            title="Accepter"
                            className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => quickReject(e, d.id)}
                            title="Refuser"
                            className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && sortedTable.length > ROWS_PER_PAGE && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, sortedTable.length)} sur {sortedTable.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <span className="text-xs">‹</span>
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + idx;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg border text-[11px] font-black transition-all ${p === page
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <span className="text-xs">›</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedDecl && (
        <AgentDeclarationDetail
          tacheId={selectedDecl}
          onClose={() => setSelectedDecl(null)}
          onAccepted={() => { setSelectedDecl(null); fetchDecls(); }}
          onRejected={() => { setSelectedDecl(null); fetchDecls(); }}
        />
      )}
    </AgentLayout>
  );
}
