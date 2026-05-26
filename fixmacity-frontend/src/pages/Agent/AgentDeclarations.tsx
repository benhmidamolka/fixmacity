import React, { useState, useEffect } from 'react';
import AgentLayout from '../../layouts/AgentLayout';
import AgentDeclarationDetail from './AgentDeclarationDetail';
import type { Declaration } from '../../types/agent.types';
import {
  ListFilter, Search, Clock, CheckCircle2,
  AlertTriangle, Filter, Loader2, MapPin, Eye, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const tok = () => localStorage.getItem('fmc_token') || '';
const hdr = () => ({ Authorization: `Bearer ${tok()}` });
const hjson = () => ({ ...hdr(), 'Content-Type': 'application/json' });

const PRIORITY_CFG: Record<string, { label: string, color: string, bg: string }> = {
  critique: { label: 'Critique', color: '#ef4444', bg: '#fee2e2' },
  elevee: { label: 'Élevée', color: '#f97316', bg: '#ffedd5' },
  moyenne: { label: 'Moyenne', color: '#eab308', bg: '#fef9c3' },
  basse: { label: 'Basse', color: '#10b981', bg: '#d1fae5' },
};

const STATUS_CFG: Record<string, { label: string, color: string, bg: string, dot: string }> = {
  assignee_agent: { label: 'À Accepter', color: '#2563eb', bg: '#dbeafe', dot: '#3b82f6' },
  en_cours:       { label: 'En cours',   color: '#ea580c', bg: '#ffedd5', dot: '#f97316' },
  resolue:        { label: 'Évaluée',    color: '#16a34a', bg: '#d1fae5', dot: '#10b981' },
  cloturee:       { label: 'Clôturée',   color: '#4b5563', bg: '#f3f4f6', dot: '#9ca3af' },
  refusee_agent:  { label: 'Refusée',    color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
};

const getAssignmentType = (decl: any) => {
  const other = decl.other_assignments || [];
  if (other.length === 0) {
    return {
      label: 'Solo',
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      text: 'Seul agent assigné'
    };
  }
  const currentDeptId = decl.department_id;
  const hasOtherDept = other.some((oa: any) => oa.department_id !== currentDeptId);
  if (hasOtherDept) {
    return {
      label: 'Multi-Département',
      bg: 'bg-purple-50 text-purple-700 border-purple-100',
      text: 'Plusieurs départements requis'
    };
  }
  return {
    label: 'Multi-Agent',
    bg: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    text: 'Plusieurs agents du même département'
  };
};

export default function AgentDeclarations() {
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
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
  }, []);

  const safeDeclarations = Array.isArray(declarations) ? declarations : [];

  const filteredTable = safeDeclarations.filter((d) => {
    const matchSearch = (d.title || '').toLowerCase().includes(search.toLowerCase()) || 
                        (d.ref_citoyen || '').toLowerCase().includes(search.toLowerCase()) ||
                        (d.address || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || (d.priority || '').toLowerCase() === priorityFilter.toLowerCase();
    return matchSearch && matchStatus && matchPriority;
  });

  const acceptMission = async (id) => {
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/accept`, {
        method: 'POST',
        headers: hjson(),
      });
      if (!res.ok) throw new Error();
      toast.success('Mission acceptée — Intervention commencée');
      fetchDecls();
    } catch {
      toast.error("Erreur lors de l'acceptation");
    }
  };

  return (
    <AgentLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                <ListFilter size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Toutes Mes Missions</h1>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Visualisez, filtrez et gérez la liste complète de vos tâches municipales.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Titre, Réf, Adresse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium text-slate-700"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Statut:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Tous</option>
                <option value="assignee_agent">À Accepter</option>
                <option value="en_cours">En cours</option>
                <option value="resolue">Évaluée (Résolue)</option>
                <option value="cloturee">Clôturée</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200">
              <AlertTriangle size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Priorité:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Toutes</option>
                <option value="critique">Critique</option>
                <option value="elevee">Élevée</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>
            </div>

            <button onClick={fetchDecls} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-4 text-emerald-600" />
                <p className="text-sm font-bold">Chargement des missions...</p>
              </div>
            ) : filteredTable.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-600">Aucune mission trouvée.</p>
                <p className="text-xs mt-1">Vous n'avez pas de tâches correspondant à ces critères.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Priorité</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type d’affectation</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date d'assignation</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">État de la mission</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTable.map((d) => {
                    const prio = PRIORITY_CFG[d.priority?.toLowerCase()] || PRIORITY_CFG.moyenne;
                    const stat = STATUS_CFG[d.status] || { label: d.status, color: '#64748b', bg: '#f1f5f9' };
                    const assignType = getAssignmentType(d);
                    
                    return (
                      <tr
                        key={d.id}
                        className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedDecl(d.id)}
                      >
                        {/* Titre */}
                        <td className="px-6 py-4.5">
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate max-w-[200px]">
                              {d.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 mt-1">
                              {d.ref_citoyen || `#${d.id.slice(-4)}`}
                            </span>
                          </div>
                        </td>
                        
                        {/* Description */}
                        <td className="px-6 py-4.5">
                          <p className="text-xs font-medium text-slate-500 line-clamp-2 max-w-[250px]">
                            {d.description || 'Aucune description.'}
                          </p>
                        </td>
                        
                        {/* Priorité */}
                        <td className="px-6 py-4.5">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                            style={{ color: prio.color, backgroundColor: prio.bg }}
                          >
                            {prio.label}
                          </span>
                        </td>
                        
                        {/* Type affectation */}
                        <td className="px-6 py-4.5">
                          <div className="flex flex-col">
                            <span className={`inline-flex self-start px-2 py-0.5 rounded-lg text-[10px] font-bold ${assignType.bg}`}>
                              {assignType.label}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                              {assignType.text}
                            </span>
                          </div>
                        </td>
                        
                        {/* Date assignation */}
                        <td className="px-6 py-4.5">
                          <span className="text-xs font-medium text-slate-600">
                            {d.assigned_at ? new Date(d.assigned_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Non assignée'}
                          </span>
                        </td>
                        
                        {/* État */}
                        <td className="px-6 py-4.5">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                            style={{ color: stat.color, backgroundColor: stat.bg }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.dot }} />
                            {stat.label}
                          </span>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {d.status === 'assignee_agent' && (
                              <button
                                onClick={() => acceptMission(d.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 shadow-sm transition-all"
                              >
                                Accepter
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedDecl(d.id)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            >
                              <Eye size={14} />
                            </button>
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
      </div>

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
