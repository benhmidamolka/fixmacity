import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AgentLayout from '../../layouts/AgentLayout';
import AgentDeclarationDetail from './AgentDeclarationDetail';
import {
  ListFilter, Search, Clock, CheckCircle2,
  AlertTriangle, Filter, Loader2, ArrowUpDown, MapPin,
  Kanban as KanbanIcon, LayoutDashboard, Shield, Play,
  XCircle, CheckSquare, MessageSquare, Send, Building2,
  Layers, ChevronRight, Eye, RefreshCw, Upload, Image as ImageIcon, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const tok = () => localStorage.getItem('fmc_token') || '';
const hdr = () => ({ Authorization: `Bearer ${tok()}` });
const hjson = () => ({ ...hdr(), 'Content-Type': 'application/json' });

const PRIORITY_CFG = {
  critique: { label: 'Critique', color: '#ef4444', bg: '#fee2e2', border: 'border-red-200' },
  elevee: { label: 'Élevée', color: '#f97316', bg: '#ffedd5', border: 'border-orange-200' },
  moyenne: { label: 'Moyenne', color: '#eab308', bg: '#fef9c3', border: 'border-yellow-200' },
  basse: { label: 'Basse', color: '#10b981', bg: '#d1fae5', border: 'border-emerald-200' },
};

const STATUS_CFG = {
  assignee_agent: { label: 'À Accepter', color: '#2563eb', bg: '#dbeafe', dot: '#3b82f6' },
  en_cours:       { label: 'En cours',   color: '#ea580c', bg: '#ffedd5', dot: '#f97316' },
  resolue:        { label: 'Évaluée',    color: '#16a34a', bg: '#d1fae5', dot: '#10b981' },
  cloturee:       { label: 'Clôturée',   color: '#4b5563', bg: '#f3f4f6', dot: '#9ca3af' },
  refusee_agent:  { label: 'Refusée',    color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
};

// Helper for type of assignment
const getAssignmentType = (decl) => {
  const other = decl.other_assignments || [];
  if (other.length === 0) {
    return {
      label: 'Solo',
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      text: 'Seul agent assigné'
    };
  }
  const currentDeptId = decl.department_id;
  const hasOtherDept = other.some(oa => oa.department_id !== currentDeptId);
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

export default function FixMaCityAgent() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Tab/Path state
  const isBoardRoute = location.pathname.endsWith('/board');
  
  const [declarations, setDeclarations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedDecl, setSelectedDecl] = useState(null);
  
  // Drag & drop state
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
  // Board Resolve Modal state
  const [resolveDeclId, setResolveDeclId] = useState(null);
  const [resolveReason, setResolveReason] = useState('');
  const [resolvePhoto, setResolvePhoto] = useState(null);
  const [resolvePhotoPreview, setResolvePhotoPreview] = useState(null);
  const [resolving, setResolving] = useState(false);

  // Fetch Declarations
  const fetchDecls = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/agent/declarations`, {
        headers: hdr(),
      });
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setDeclarations(data.declarations || (Array.isArray(data) ? data : []));
    } catch (e) {
      toast.error('Impossible de charger vos missions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecls();
  }, []);

  const safeDeclarations = Array.isArray(declarations) ? declarations : [];

  // Filtered Declarations for Table
  const filteredTable = safeDeclarations.filter((d) => {
    const matchSearch = (d.title || '').toLowerCase().includes(search.toLowerCase()) || 
                        (d.ref_citoyen || '').toLowerCase().includes(search.toLowerCase()) ||
                        (d.address || '').toLowerCase().includes(search.toLowerCase()) ||
                        (d.description || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || (d.priority || '').toLowerCase() === priorityFilter.toLowerCase();
    return matchSearch && matchStatus && matchPriority;
  });

  // KPI Counts
  const counts = {
    total: safeDeclarations.length,
    a_accepter: safeDeclarations.filter((d) => d.status === 'assignee_agent').length,
    en_cours: safeDeclarations.filter((d) => d.status === 'en_cours').length,
    resolue: safeDeclarations.filter((d) => d.status === 'resolue').length,
    cloturee: safeDeclarations.filter((d) => d.status === 'cloturee').length,
  };

  // Drag and Drop handlers
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e, columnStatus) => {
    e.preventDefault();
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (!id) return;

    const card = safeDeclarations.find(d => d.id === id);
    if (!card) return;

    // Transition checks
    if (card.status === targetStatus) return; // Same status

    // Standard workflows
    if (targetStatus === 'en_cours') {
      if (card.status === 'assignee_agent') {
        // Accept declaration
        await acceptMission(id);
      } else {
        toast.error("Impossible de repasser en cours sans réassignation du chef");
      }
    } else if (targetStatus === 'resolue') {
      if (card.status === 'en_cours') {
        // Open resolve modal (photo required)
        setResolveDeclId(id);
      } else {
        toast.error("Veuillez d'abord accepter la mission");
      }
    } else if (targetStatus === 'cloturee') {
      if (card.status === 'resolue') {
        // Close declaration directly
        await closeMission(id);
      } else {
        toast.error("Seule une mission déjà résolue (Évaluée) peut être clôturée");
      }
    }
    setDraggedId(null);
  };

  // Accept API
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

  // Close API
  const closeMission = async (id) => {
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/close`, {
        method: 'POST',
        headers: hjson(),
      });
      if (!res.ok) throw new Error();
      toast.success('Mission clôturée avec succès');
      fetchDecls();
    } catch {
      toast.error('Erreur lors de la clôture');
    }
  };

  // Resolve API Submission
  const handleResolveSubmit = async () => {
    if (!resolvePhoto) {
      toast.error("La photo de preuve est obligatoire.");
      return;
    }
    setResolving(true);
    try {
      // 1. Upload photo
      const fd = new FormData();
      fd.append('photo', resolvePhoto);
      const photoRes = await fetch(`${API}/agent/declarations/${resolveDeclId}/photo`, {
        method: 'POST',
        headers: hdr(),
        body: fd
      });
      if (!photoRes.ok) throw new Error('Erreur de téléversement de la photo');

      // 2. Resolve declaration
      const res = await fetch(`${API}/agent/declarations/${resolveDeclId}/resolve`, {
        method: 'POST',
        headers: hjson(),
        body: JSON.stringify({ rapport_interne: resolveReason || 'Mission résolue via Kanban.' })
      });
      if (!res.ok) throw new Error('Erreur de mise à jour du statut');

      toast.success('Mission résolue avec succès');
      setResolveDeclId(null);
      setResolveReason('');
      setResolvePhoto(null);
      setResolvePhotoPreview(null);
      fetchDecls();
    } catch (err) {
      toast.error(err.message || 'Une erreur est survenue.');
    } finally {
      setResolving(false);
    }
  };

  // Render Table Dashboard
  const renderTableDashboard = () => (
    <div className="space-y-6">
      {/* Search & Filters Row */}
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

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 size={32} className="animate-spin mb-4 text-emerald-600" />
              <p className="text-sm font-bold">Chargement de vos missions...</p>
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
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                          style={{ color: prio.color, backgroundColor: prio.bg, borderColor: prio.color + '20' }}
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
                            title="Voir Détails"
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
  );

  // Render Kanban Board
  const renderKanbanBoard = () => {
    // Only accepted or progressed declarations appear on the board
    const boardItems = safeDeclarations.filter(d => ['en_cours', 'resolue', 'cloturee'].includes(d.status));
    
    const columns = [
      {
        id: 'en_cours',
        title: 'En cours d\'intervention',
        colorClass: 'border-orange-500 bg-orange-50/50',
        textClass: 'text-orange-800',
        badgeBg: 'bg-orange-100 text-orange-800',
        items: boardItems.filter(d => d.status === 'en_cours')
      },
      {
        id: 'resolue',
        title: 'Évaluée / Résolue',
        colorClass: 'border-emerald-500 bg-emerald-50/50',
        textClass: 'text-emerald-800',
        badgeBg: 'bg-emerald-100 text-emerald-800',
        items: boardItems.filter(d => d.status === 'resolue')
      },
      {
        id: 'cloturee',
        title: 'Clôturée',
        colorClass: 'border-slate-500 bg-slate-50/50',
        textClass: 'text-slate-800',
        badgeBg: 'bg-slate-200 text-slate-700',
        items: boardItems.filter(d => d.status === 'cloturee')
      }
    ];

    return (
      <div className="space-y-6">
        {/* Info Alerts */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-5 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
            <KanbanIcon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">Gestion interactive Kanban</h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5 leading-relaxed">
              Faites glisser-déposer les cartes pour mettre à jour l'état de votre intervention terrain en temps réel.
            </p>
          </div>
        </div>

        {/* Board Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-270px)] min-h-[500px]">
          {columns.map((col) => {
            const isOver = dragOverColumn === col.id;
            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`rounded-3xl border flex flex-col h-full overflow-hidden transition-all duration-200 ${
                  isOver ? 'border-dashed border-emerald-500 bg-emerald-50/20 scale-[1.01] shadow-lg shadow-emerald-500/5' : 'border-slate-100 bg-white'
                }`}
              >
                {/* Column Header */}
                <div className={`p-4 border-b border-slate-100 flex items-center justify-between ${col.colorClass}`}>
                  <h3 className={`text-xs font-black uppercase tracking-wider ${col.textClass}`}>
                    {col.title}
                  </h3>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${col.badgeBg}`}>
                    {col.items.length}
                  </span>
                </div>

                {/* Column Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-slate-50/30">
                  {col.items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-12 text-slate-400/70 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                      <Clock size={20} className="mb-2 text-slate-300" />
                      <p className="text-[10px] font-black uppercase tracking-wider">Aucune Mission</p>
                      <p className="text-[9px] mt-0.5">Glissez une tâche ici</p>
                    </div>
                  ) : (
                    col.items.map((item) => {
                      const prio = PRIORITY_CFG[item.priority?.toLowerCase()] || PRIORITY_CFG.moyenne;
                      const assignType = getAssignmentType(item);
                      
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
                        >
                          {/* Top Priority Bar */}
                          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: prio.color }} />

                          {/* Reference & Actions */}
                          <div className="flex items-center justify-between mb-2 mt-1">
                            <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              {item.ref_citoyen || `#${item.id.slice(-4)}`}
                            </span>
                            
                            <button
                              onClick={() => setSelectedDecl(item.id)}
                              className="p-1 rounded-lg bg-slate-50 group-hover:bg-[#1557FF] group-hover:text-white text-slate-400 transition-colors shadow-sm"
                            >
                              <Eye size={12} />
                            </button>
                          </div>

                          {/* Title & Description */}
                          <h4 className="text-xs font-black text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-[10px] font-medium text-slate-400 line-clamp-2 mt-1 mb-3">
                            {item.description || 'Aucune description.'}
                          </p>

                          {/* Info Tags */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-50">
                            {item.category && (
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {item.category}
                              </span>
                            )}
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full`} style={{ color: prio.color, backgroundColor: prio.bg }}>
                              {prio.label}
                            </span>
                          </div>

                          {/* Coordination Tag */}
                          <div className="mt-2 flex items-center justify-between">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${assignType.bg}`}>
                              {assignType.label}
                            </span>
                            
                            {item.status === 'en_cours' && (
                              <button
                                onClick={() => setResolveDeclId(item.id)}
                                className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-0.5"
                              >
                                <CheckSquare size={10} /> Résoudre
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AgentLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                {isBoardRoute ? <KanbanIcon size={20} /> : <LayoutDashboard size={20} />}
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  {isBoardRoute ? 'Tableau Kanban' : 'Mes Missions terrain'}
                </h1>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  {isBoardRoute
                    ? 'Visualisez et faites progresser vos dossiers acceptés'
                    : 'Gérez et répondez aux assignations municipales'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Table / Kanban toggle buttons */}
          <div className="flex bg-slate-100/80 border border-slate-200/50 p-1 rounded-2xl shrink-0 shadow-sm">
            <button
              onClick={() => navigate('/agent/dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                !isBoardRoute ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LayoutDashboard size={14} /> List
            </button>
            <button
              onClick={() => navigate('/agent/board')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                isBoardRoute ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <KanbanIcon size={14} /> Kanban
            </button>
          </div>
        </div>

        {/* KPI COUNTS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', count: counts.total, icon: ListFilter, bg: 'bg-slate-50 border-slate-200 text-slate-600' },
            { label: 'À Accepter', count: counts.a_accepter, icon: AlertTriangle, bg: 'bg-blue-50 border-blue-100 text-blue-600' },
            { label: 'En cours', count: counts.en_cours, icon: Clock, bg: 'bg-orange-50 border-orange-100 text-orange-600' },
            { label: 'Évaluées', count: counts.resolue, icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
            { label: 'Clôturées', count: counts.cloturee, icon: Shield, bg: 'bg-slate-100 border-slate-300 text-slate-700' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.bg}`}>
                <item.icon size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                <p className="text-xl font-black text-slate-800">{item.count}</p>
              </div>
            </div>
          ))}
        </div>

        {/* RENDER VIEWS */}
        {isBoardRoute ? renderKanbanBoard() : renderTableDashboard()}
      </div>

      {/* RENDER DETAIL DRAWER */}
      {selectedDecl && (
        <AgentDeclarationDetail
          tacheId={selectedDecl}
          onClose={() => setSelectedDecl(null)}
          onAccepted={() => { setSelectedDecl(null); fetchDecls(); }}
          onRejected={() => { setSelectedDecl(null); fetchDecls(); }}
        />
      )}

      {/* RESOLVE PREUVE KANBAN MODAL */}
      {resolveDeclId && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setResolveDeclId(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckSquare size={16} />
                </div>
                <p className="text-sm font-black text-emerald-800">Soumettre la résolution</p>
              </div>
              <button
                onClick={() => setResolveDeclId(null)}
                className="w-8 h-8 rounded-xl bg-emerald-100/50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-700 font-semibold leading-relaxed">
                Une photo prouvant la réalisation de l'intervention est obligatoire pour clore la tâche et passer l'évaluation du Chef.
              </div>

              {/* Photo Input */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preuve d'intervention *</p>
                {resolvePhotoPreview ? (
                  <div className="relative aspect-video rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 group">
                    <img src={resolvePhotoPreview} alt="Aperçu" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setResolvePhoto(null); setResolvePhotoPreview(null); }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-video rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 cursor-pointer transition-all hover:bg-emerald-50/10 group">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setResolvePhoto(file);
                          setResolvePhotoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm text-slate-400 group-hover:text-emerald-500 transition-all mb-2">
                      <Upload size={16} />
                    </div>
                    <p className="text-xs font-bold text-slate-600 group-hover:text-emerald-600 transition-all">Télécharger une photo</p>
                    <p className="text-[9px] text-slate-400 mt-1">PNG, JPG ou WEBP (Max. 10 Mo)</p>
                  </label>
                )}
              </div>

              {/* Text Input */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rapport d'intervention (Facultatif)</p>
                <textarea
                  value={resolveReason}
                  onChange={(e) => setResolveReason(e.target.value)}
                  placeholder="Décrivez brièvement les travaux réalisés terrain..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white resize-none text-slate-700 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 pt-2 flex gap-3">
              <button
                onClick={() => setResolveDeclId(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleResolveSubmit}
                disabled={resolving || !resolvePhoto}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm disabled:opacity-40 shadow-md shadow-emerald-500/10 transition-all"
              >
                {resolving ? <Loader2 size={14} className="animate-spin" /> : <><CheckSquare size={14} /> Confirmer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AgentLayout>
  );
}
