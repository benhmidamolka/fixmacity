import React, { useState, useEffect } from 'react';
import AgentLayout from '../../layouts/AgentLayout';
import AgentDeclarationDetail from './AgentDeclarationDetail';
import {
  Clock, CheckCircle2, AlertTriangle, Loader2,
  Kanban as KanbanIcon, CheckSquare, Eye, RefreshCw, Upload, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const tok = () => localStorage.getItem('fmc_token') || '';
const hdr = () => ({ Authorization: `Bearer ${tok()}` });
const hjson = () => ({ ...hdr(), 'Content-Type': 'application/json' });

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  critique: { label: 'Critique', color: '#ef4444', bg: '#fee2e2' },
  elevee: { label: 'Élevée', color: '#f97316', bg: '#ffedd5' },
  moyenne: { label: 'Moyenne', color: '#eab308', bg: '#fef9c3' },
  basse: { label: 'Basse', color: '#10b981', bg: '#d1fae5' },
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

export default function AgentKanbanBoard() {
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecl, setSelectedDecl] = useState<string | null>(null);
  
  // Drag & drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // Board Resolve Modal state
  const [resolveDeclId, setResolveDeclId] = useState<string | null>(null);
  const [resolveReason, setResolveReason] = useState('');
  const [resolvePhoto, setResolvePhoto] = useState<File | null>(null);
  const [resolvePhotoPreview, setResolvePhotoPreview] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

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

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (!id) return;

    const card = safeDeclarations.find(d => d.id === id);
    if (!card) return;

    if (card.status === targetStatus) return; // Same status

    if (targetStatus === 'en_cours') {
      if (card.status === 'assignee_agent') {
        await acceptMission(id);
      } else {
        toast.error("Impossible de repasser en cours sans réassignation du chef");
      }
    } else if (targetStatus === 'resolue') {
      if (card.status === 'en_cours') {
        setResolveDeclId(id);
      } else {
        toast.error("Veuillez d'abord accepter la mission");
      }
    } else if (targetStatus === 'cloturee') {
      if (card.status === 'resolue') {
        await closeMission(id);
      } else {
        toast.error("Seule une mission déjà résolue (Évaluée) peut être clôturée");
      }
    }
    setDraggedId(null);
  };

  const acceptMission = async (id: string) => {
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

  const closeMission = async (id: string) => {
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

  const handleResolveSubmit = async () => {
    if (!resolvePhoto || !resolveDeclId) {
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
    } catch (err: any) {
      toast.error(err.message || 'Une erreur est survenue.');
    } finally {
      setResolving(false);
    }
  };

  const boardItems = safeDeclarations;
  
  const columns = [
    {
      id: 'assignee_agent',
      title: 'À Accepter',
      colorClass: 'border-blue-500 bg-blue-50/50',
      textClass: 'text-blue-800',
      badgeBg: 'bg-blue-100 text-blue-800',
      items: boardItems.filter(d => d.status === 'assignee_agent')
    },
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
    <AgentLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                <KanbanIcon size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Tableau Kanban interactif</h1>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Faites glisser les dossiers acceptés pour mettre à jour les étapes d'intervention.
                </p>
              </div>
            </div>
          </div>
          <button onClick={fetchDecls} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors shrink-0">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-5 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
            <KanbanIcon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">Mise à jour rapide terrain</h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5 leading-relaxed">
              Pour déplacer une mission dans l'étape d'évaluation, déposez-la dans la colonne "Évaluée / Résolue" et complétez la photo de preuve.
            </p>
          </div>
        </div>

        {/* Loading / Columns */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 size={32} className="animate-spin mb-4 text-emerald-600" />
            <p className="text-sm font-bold">Chargement du tableau Kanban...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-270px)] min-h-[500px]">
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
                            className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden animate-in fade-in duration-200"
                          >
                            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: prio.color }} />

                            {/* Reference */}
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

                            {/* Info */}
                            <h4 className="text-xs font-black text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                              {item.title}
                            </h4>
                            <p className="text-[10px] font-medium text-slate-400 line-clamp-2 mt-1 mb-3">
                              {item.description || 'Aucune description.'}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-55">
                              {item.category && (
                                <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {item.category}
                                </span>
                              )}
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ color: prio.color, backgroundColor: prio.bg }}>
                                {prio.label}
                              </span>
                            </div>

                            {/* Action button per column */}
                            <div className="mt-2 flex items-center justify-between">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${assignType.bg}`}>
                                {assignType.label}
                              </span>
                              
                              {item.status === 'assignee_agent' && (
                                <button
                                  onClick={() => acceptMission(item.id)}
                                  className="text-[9px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg flex items-center gap-0.5"
                                >
                                  ✓ Accepter
                                </button>
                              )}
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
        )}
      </div>

      {selectedDecl && (
        <AgentDeclarationDetail
          tacheId={selectedDecl}
          onClose={() => setSelectedDecl(null)}
          onAccepted={() => { setSelectedDecl(null); fetchDecls(); }}
          onRejected={() => { setSelectedDecl(null); fetchDecls(); }}
        />
      )}

      {/* RESOLVE MODAL */}
      {resolveDeclId && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setResolveDeclId(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckSquare size={16} />
                </div>
                <p className="text-sm font-black text-emerald-800">Soumettre la résolution</p>
              </div>
              <button onClick={() => setResolveDeclId(null)} className="w-8 h-8 rounded-xl bg-emerald-100/50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600">
                <X size={14} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-700 font-semibold">
                Une photo de preuve d'intervention est obligatoire.
              </div>

              {/* Photo Input */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preuve d'intervention *</p>
                {resolvePhotoPreview ? (
                  <div className="relative aspect-video rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 group">
                    <img src={resolvePhotoPreview} alt="Aperçu" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setResolvePhoto(null); setResolvePhotoPreview(null); }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-black/60 text-white flex items-center justify-center backdrop-blur-sm"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-video rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 cursor-pointer transition-all group">
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
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm text-slate-400 group-hover:text-emerald-500 mb-2">
                      <Upload size={16} />
                    </div>
                    <p className="text-xs font-bold text-slate-600 group-hover:text-emerald-600">Télécharger une photo</p>
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

            <div className="px-6 pb-6 pt-2 flex gap-3">
              <button onClick={() => setResolveDeclId(null)} className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button
                onClick={handleResolveSubmit}
                disabled={resolving || !resolvePhoto}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm disabled:opacity-40"
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
