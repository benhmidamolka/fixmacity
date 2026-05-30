import React, { useState, useEffect } from 'react';
import AgentLayout from '../../layouts/AgentLayout';
import AgentDeclarationDetail from './AgentDeclarationDetail';
import type { Declaration, RawDeclaration } from '../../types/agent.types';
import {
  ListFilter, Search, Clock, CheckCircle2,
  AlertTriangle, Filter, Loader2, Eye, RefreshCw,
  Calendar, Star
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDecl, setSelectedDecl] = useState<string | null>(null);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (endDate && val && new Date(endDate) < new Date(val)) {
      toast.error('La date de fin ne peut pas être inférieure à la date de début.');
    } else {
      setStartDate(val);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (startDate && val && new Date(val) < new Date(startDate)) {
      toast.error('La date de fin ne peut pas être inférieure à la date de début.');
    } else {
      setEndDate(val);
    }
  };

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

    let matchDate = true;
    if (startDate || endDate) {
      const created = d.created_at ? new Date(d.created_at) : null;
      if (created) {
        if (startDate) {
          const startD = new Date(startDate);
          startD.setHours(0, 0, 0, 0);
          if (startD > created) matchDate = false;
        }
        if (endDate) {
          const endD = new Date(endDate);
          endD.setHours(23, 59, 59, 999);
          if (endD < created) matchDate = false;
        }
      }
    }

    return matchSearch && matchStatus && matchPriority && matchEvaluated && matchDate;
  });

  const sortedTable = [...filteredTable].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
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

  return (
    <AgentLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200 text-white">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
              <ListFilter size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Toutes Mes Missions</h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Visualisez, filtrez et gérez la liste complète de vos tâches municipales.
              </p>
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total reçues',  value: stats.total,   sub: 'ce mois' },
            { label: 'En attente',    value: stats.pending, sub: 'nouvelles assignations', accent: stats.pending > 0 },
            { label: 'En cours',      value: stats.active,  sub: 'missions actives' },
            { label: 'Terminées',     value: stats.done,    sub: 'ce mois' },
          ].map(({ label, value, sub, accent }) => (
            <div
              key={label}
              className={`rounded-2xl p-5 border ${accent ? 'bg-blue-500/10 border-blue-500/20' : 'bg-slate-900 border-slate-800/80'} shadow-sm`}
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</div>
              <div className={`text-3xl font-black mb-1 ${accent ? 'text-blue-400' : 'text-slate-100'}`}>{value}</div>
              <div className="text-xs text-slate-400 font-medium">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Search & Filters ── */}
        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Titre, Réf, Adresse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm outline-none focus:border-emerald-500 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium text-slate-200 placeholder-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Statut:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer"
              >
                <option value="all">Tous</option>
                <option value="assignee_agent">À Accepter</option>
                <option value="en_cours">En cours</option>
                <option value="resolue">Résolue</option>
                <option value="cloturee">Clôturée</option>
                <option value="refusee_agent">Refusée</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800">
              <AlertTriangle size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Priorité:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer"
              >
                <option value="all">Toutes</option>
                <option value="critique">Critique</option>
                <option value="elevee">Élevée</option>
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
                <option value="faible">Faible</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Tri:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer"
              >
                <option value="newest">Plus récent</option>
                <option value="oldest">Plus ancien</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800">
              <Star size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Évaluées:</span>
              <select
                value={evaluatedOnly ? 'yes' : 'no'}
                onChange={(e) => setEvaluatedOnly(e.target.value === 'yes')}
                className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer"
              >
                <option value="no">Toutes</option>
                <option value="yes">Uniquement</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer [color-scheme:dark]"
              />
              <span className="text-slate-500 text-xs font-black">-</span>
              <input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

            <button
              onClick={fetchDecls}
              className="p-2.5 rounded-xl border border-slate-800 hover:bg-slate-850 text-slate-400 transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* ── Redesigned Modern Spaced Table ── */}
        <div className="overflow-x-auto overflow-y-visible">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-550">
              <Loader2 size={32} className="animate-spin mb-4 text-emerald-500" />
              <p className="text-sm font-bold">Chargement des missions...</p>
            </div>
          ) : sortedTable.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 bg-slate-900/40 border border-slate-800 rounded-3xl">
              <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-slate-700" />
              </div>
              <p className="text-sm font-bold text-slate-300">Aucune mission trouvée.</p>
              <p className="text-xs mt-1 text-slate-550">Vous n'avez pas de tâches correspondant à ces critères.</p>
            </div>
          ) : (
            <table className="w-full text-left border-separate border-spacing-y-3.5">
              <thead>
                <tr className="text-slate-400">
                  <th className="px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Titre</th>
                  <th className="px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</th>
                  <th className="px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest w-28">Priorité</th>
                  <th className="px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Affectation</th>
                  <th className="px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date d'assignation</th>
                  <th className="px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest w-32">État</th>
                  <th className="px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTable.map((d) => {
                  const prio = PRIORITY_CFG[(d.priority || '').toLowerCase()] || PRIORITY_CFG.moyenne;
                  const stat = STATUS_CFG[d.status] || { label: d.status, color: '#94a3b8', bg: '#94a3b815', dot: '#94a3b8' };
                  const assignType = getAssignmentType(d);
                  const isPending = d.status === 'assignee_agent';

                  return (
                    <tr
                      key={d.id}
                      className="group bg-slate-900/40 hover:bg-slate-900 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/10 transition-all duration-300 cursor-pointer"
                      onClick={() => setSelectedDecl(d.id)}
                    >
                      {/* Titre */}
                      <td className="px-6 py-4 rounded-l-2xl border-l border-t border-b border-slate-800/80 group-hover:border-emerald-500/30">
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors truncate max-w-[200px]">
                            {d.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 mt-1">
                            {d.ref_citoyen || `#${d.id?.slice(-4) || '????'}`}
                          </span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4 border-t border-b border-slate-800/80 group-hover:border-emerald-500/30">
                        <p className="text-xs font-medium text-slate-400 line-clamp-2 max-w-[240px]">
                          {d.description || 'Aucune description.'}
                        </p>
                      </td>

                      {/* Priorité */}
                      <td className="px-6 py-4 border-t border-b border-slate-800/80 group-hover:border-emerald-500/30">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                          style={{ color: prio.color, backgroundColor: prio.bg }}
                        >
                          {prio.label}
                        </span>
                      </td>

                      {/* Type affectation */}
                      <td className="px-6 py-4 border-t border-b border-slate-800/80 group-hover:border-emerald-500/30">
                        <div className="flex flex-col">
                          <span className={`inline-flex self-start px-2 py-0.5 rounded-lg text-[10px] font-bold border ${assignType.bg}`}>
                            {assignType.label}
                          </span>
                          <span className="text-[9px] text-slate-500 mt-1 truncate max-w-[140px]">
                            {assignType.text}
                          </span>
                        </div>
                      </td>

                      {/* Date assignation */}
                      <td className="px-6 py-4 border-t border-b border-slate-800/80 group-hover:border-emerald-500/30">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                          <Clock size={12} className="text-slate-500 shrink-0" />
                          {d.assigned_at
                            ? new Date(d.assigned_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </div>
                      </td>

                      {/* État */}
                      <td className="px-6 py-4 border-t border-b border-slate-800/80 group-hover:border-emerald-500/30">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                          style={{ color: stat.color, backgroundColor: stat.bg }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.dot }} />
                          {stat.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 rounded-r-2xl border-r border-t border-b border-slate-800/80 group-hover:border-emerald-500/30 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {isPending ? (
                            <>
                              <button
                                onClick={(e) => quickAccept(e, d.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-sm shadow-emerald-950/20 transition-all whitespace-nowrap"
                              >
                                Accepter
                              </button>
                              <button
                                onClick={(e) => quickReject(e, d.id)}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 text-[11px] font-bold border border-rose-500/20 shadow-sm transition-all whitespace-nowrap"
                              >
                                Refuser
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setSelectedDecl(d.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-[11px] font-bold transition-all border border-slate-700/50"
                            >
                              <Eye size={13} />
                              Détails
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
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