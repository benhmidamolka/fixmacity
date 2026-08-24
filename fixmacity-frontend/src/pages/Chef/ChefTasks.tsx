import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import ChefLayout from '../../layouts/ChefLayout';
import { Paperclip, Plus, X, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { DetailDrawer } from '../../components/Chef/DetailDrawer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const WS_URL  = import.meta.env.VITE_WS_URL   || 'http://localhost:5005';
const tok = () => localStorage.getItem('fmc_token') || '';
const jsonH = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });

interface Agent { id: string; first_name: string; last_name: string; active_tasks?: number; }
interface Task {
  id: string; title: string; description: string | null;
  status: 'todo' | 'in_progress' | 'evaluee' | 'cloturee' | 'rejected';
  rawStatus: string; category: string; ref_citoyen: string;
  created_at: string; assigned_agents: Agent[];
  priority: string; has_image: boolean; refusal_reason?: string;
  attachments?: string[];
}

const mapStatus = (s: string): Task['status'] => {
  const normalized = s?.toLowerCase();
  if (normalized === 'en_cours') return 'in_progress';
  if (['resolue', 'evaluee'].includes(normalized)) return 'evaluee';
  if (normalized === 'cloturee') return 'cloturee';
  if (normalized === 'refusee_agent') return 'rejected';
  if (['en_attente', 'assignee_agent', 'assignee_chef'].includes(normalized)) return 'todo';
  return 'todo';
};

const statusCfg = (s: Task['status']) => {
  const map = {
    todo:        { border: 'border-l-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', label: 'En attente' },
    in_progress: { border: 'border-l-blue-600',   bg: 'bg-blue-50 dark:bg-blue-500/10',     text: 'text-blue-600 dark:text-blue-400',     label: 'En cours' },
    evaluee:     { border: 'border-l-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Résolue' },
    cloturee:    { border: 'border-l-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800',     text: 'text-slate-600 dark:text-slate-400',   label: 'Clôturée' },
    rejected:    { border: 'border-l-red-500',     bg: 'bg-red-50 dark:bg-red-500/10',       text: 'text-red-600 dark:text-red-400',       label: 'Rejetée par Agent' },
  };
  return map[s] || { border: 'border-l-slate-400', bg: 'bg-slate-50', text: 'text-slate-600', label: 'Inconnu' };
};

const prioCfg = (p: string) => {
  const lp = (p || '').toLowerCase();
  if (['haute', 'urgente', 'high'].includes(lp)) return { bg: 'bg-red-50 dark:bg-red-500/10',     text: 'text-red-500',   label: 'Priorité Haute' };
  if (['basse', 'low'].includes(lp))              return { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500', label: 'Priorité Basse' };
  return { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-500', label: 'Priorité Moyenne' };
};

const AGENT_COLORS = ['#1557FF','#10B981','#F59E0B','#8B5CF6','#EC4899','#0891B2'];

// ── Image Gallery Modal ────────────────────────────────────────────────────────
function ImageGalleryModal({ images, onClose }: { images: string[]; onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50">
        <X className="w-6 h-6" />
      </button>
      
      <div className="relative w-full max-w-4xl max-h-[80vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
        <img 
          src={images[currentIndex]} 
          alt={`Attachment ${currentIndex + 1}`} 
          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
        />
        
        {images.length > 1 && (
          <div className="flex items-center gap-4 mt-6">
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => (i === 0 ? images.length - 1 : i - 1)); }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors"
            >
              Précédent
            </button>
            <span className="text-white font-bold bg-black/50 px-3 py-1 rounded-full">{currentIndex + 1} / {images.length}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => (i === images.length - 1 ? 0 : i + 1)); }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── Add Agent Modal ────────────────────────────────────────────────────────
function AddAgentModal({ decl, agents, onClose, onDone }: {
  decl: Task; agents: any[]; onClose: () => void; onDone: () => void
}) {
  const [agentIds, setAgentIds] = useState<string[]>(decl.assigned_agents.map(a => a.id));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxTasks = parseInt(localStorage.getItem('fmc_max_tasks') || '5');
  const active = agents.filter(a => a.is_active);

  const toggle = (id: string) =>
    setAgentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const go = async () => {
    if (agentIds.length === 0) { setError('Sélectionnez au moins un agent.'); return; }
    setLoading(true); setError(null);
    const res = await fetch(`${API_URL}/chef/declarations/${decl.id}/assign-agents`, {
      method: 'POST', headers: jsonH(), body: JSON.stringify({ agent_ids: agentIds })
    }).catch(() => null);
    if (!res) { setLoading(false); setError('Erreur réseau.'); return; }
    const d = await res.json();
    if (!res.ok) { setLoading(false); setError(d.error || 'Erreur.'); return; }
    setTimeout(() => { onDone(); onClose(); }, 400);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-black text-[#0A1628] dark:text-white">Assigner des agents</h2>
          <p className="text-xs text-slate-500 mt-1">Sélectionnez les agents pour cette mission</p>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2">
          {active.length === 0 ? (
            <p className="text-sm text-center text-slate-500">Aucun agent actif.</p>
          ) : active.map(a => {
             const sel = agentIds.includes(a.id);
             const over = a.workload >= maxTasks;
             return (
               <div key={a.id} onClick={() => toggle(a.id)}
                 className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                   sel ? 'border-[#1557FF] bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                 }`}>
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                     {a.first_name[0]}{a.last_name[0]}
                   </div>
                   <div>
                     <p className="text-sm font-bold text-[#0A1628] dark:text-white">{a.first_name} {a.last_name}</p>
                     <p className="text-[10px] font-bold text-slate-400">
                       <span className={over ? 'text-red-500' : 'text-[#1557FF]'}>{a.workload}</span> / {maxTasks} tâches actives
                     </p>
                   </div>
                 </div>
                 <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                   sel ? 'bg-[#1557FF] text-white border-[#1557FF]' : 'border-2 border-slate-200 dark:border-slate-700'
                 }`}>
                   {sel && <CheckCircle2 className="w-3.5 h-3.5" />}
                 </div>
               </div>
             )
          })}
          {error && <p className="text-xs text-red-500 font-bold text-center mt-4">{error}</p>}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
            Annuler
          </button>
          <button onClick={go} disabled={loading} className="flex-1 py-3 text-sm font-bold text-white bg-[#1557FF] hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ChefTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks]   = useState<Task[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'Tous' | 'En attente' | 'En cours' | 'Résolue' | 'Clôturée' | 'Rejetée'>('Tous');
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedTaskImages, setSelectedTaskImages] = useState<string[]>([]);

  const openAssignModal = (t: Task) => setAssigningTask(t);

  // ── Load agents once ──────────────────────────────────────────────────────
  useEffect(() => { 
    fetch(`${API_URL}/chef/agents`, { headers: { Authorization: `Bearer ${tok()}` } })
      .then(r => r.json())
      .then(d => {
        const raw: any[] = d.agents || d || [];
        setAgents(raw.map((a: any) => ({
          id: a.id,
          first_name: a.first_name,
          last_name: a.last_name,
          is_active: a.status !== 'inactive',
          workload: a.workload ?? a.active_tasks ?? 0,
          resolved_count: 0,
          is_overloaded: false
        })));
      });
  }, []);

  // ── Fetch tasks ───────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/chef/declarations?limit=200`, {
        headers: { Authorization: `Bearer ${tok()}` }
      });
      if (!res.ok) throw new Error('Erreur');
      const resData = await res.json();
      const arr: any[] = resData.declarations ?? (Array.isArray(resData) ? resData : []);

      // DEBUG: log what statuses came back
      console.log('[ChefTasks] raw statuses:', arr.map(d => `${d.status}:${d.id?.slice(0,8)}`));

      // Include all statuses the chef manages; only exclude pre-assignment and chef-refused
      const filtered = arr.filter((d: any) =>
        !['soumise', 'rejetee', 'refusee_chef'].includes(d.status)
      );
      console.log('[ChefTasks] filtered count:', filtered.length, filtered.map(d => d.status));

      setTasks(filtered.map((d: any) => ({
        id: d.id,
        title: d.title || d.category || 'Sans titre',
        description: d.description,
        status: mapStatus(d.status),
        rawStatus: d.status,
        category: d.category,
        ref_citoyen: d.ref_citoyen,
        created_at: d.created_at,
        assigned_agents: d.assigned_agents || [],
        priority: d.priority || 'moyenne',
        has_image: !!d.image_url,
        attachments: d.attachments || (d.image_url ? [d.image_url] : []),
        refusal_reason: d.refusal_reason || d.agent_refusal_reason || null,
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  // ── Auto-poll every 10 s + Socket.io live push ────────────────────────────
  useEffect(() => {
    fetchTasks();

    // Polling fallback: refresh every 10 seconds
    const pollId = setInterval(() => fetchTasks(), 10_000);

    // Socket.io live events: refresh immediately when relevant
    let cleanup: (() => void) | null = null;
    import('socket.io-client').then(({ io }) => {
      const socket = io(WS_URL, { auth: { token: tok() }, transports: ['websocket'] });
      const refresh = () => {
        fetchTasks();
        toast.success('Missions mises à jour', { id: 'tasks-refresh', duration: 2000 });
      };
      socket.on('ASSIGNED_CHEF',  refresh);
      socket.on('STATUS_CHANGE',  refresh);
      socket.on('ASSIGNED_AGENT', refresh);
      cleanup = () => socket.disconnect();
    }).catch(() => {}); // silently skip if socket.io-client unavailable

    return () => {
      clearInterval(pollId);
      cleanup?.();
    };
  }, [fetchTasks]);

  const counts = {
    Tous: tasks.length,
    'En attente': tasks.filter(t => t.status === 'todo').length,
    'En cours':   tasks.filter(t => t.status === 'in_progress').length,
    'Résolue':    tasks.filter(t => t.status === 'evaluee').length,
    'Clôturée':   tasks.filter(t => t.status === 'cloturee').length,
    'Rejetée':    tasks.filter(t => t.status === 'rejected').length,
  };

  const displayed = tasks.filter(t => {
    if (filter === 'Tous')       return true;
    if (filter === 'En attente') return t.status === 'todo';
    if (filter === 'En cours')   return t.status === 'in_progress';
    if (filter === 'Résolue')    return t.status === 'evaluee';
    if (filter === 'Clôturée')   return t.status === 'cloturee';
    if (filter === 'Rejetée')    return t.status === 'rejected';
    return true;
  });

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <ChefLayout title="Mes Missions">
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: '1rem', fontWeight: 700, fontSize: 13 } }} />
      <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-[#0A1628] dark:text-white tracking-tight">Mes Missions</h1>
            <button
              onClick={() => { setRefreshing(true); fetchTasks(); }}
              title="Rafraîchir"
              className={`w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-[#1557FF] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all ${
                refreshing ? 'animate-spin text-[#1557FF]' : ''
              }`}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 w-full lg:w-auto">
            <div className="flex items-center gap-1 flex-wrap">
              {(['Tous', 'En attente', 'En cours', 'Résolue', 'Clôturée', 'Rejetée'] as const).map(tab => (
                <button key={tab} onClick={() => setFilter(tab)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-all ${
                    filter === tab ? 'border-[#1557FF] text-[#1557FF]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}>
                  <span className="text-sm font-bold">{tab}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    tab === 'Rejetée'
                      ? filter === tab ? 'bg-red-500 text-white' : 'bg-red-100 dark:bg-red-900/30 text-red-500'
                      : filter === tab ? 'bg-[#1557FF] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>{counts[tab]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rejected banner if on that tab */}
        {filter === 'Rejetée' && counts['Rejetée'] > 0 && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-red-700 dark:text-red-300">
                {counts['Rejetée']} mission{counts['Rejetée'] > 1 ? 's' : ''} rejetée{counts['Rejetée'] > 1 ? 's' : ''} par un agent
              </p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                Lisez le motif de rejet avant de réassigner à un autre agent disponible.
              </p>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1557FF]" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-24 text-center bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-700 dark:text-slate-300">Aucune mission dans cette catégorie</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayed.map(task => {
              const sCfg = statusCfg(task.status);
              const pCfg = prioCfg(task.priority);
              const isRejected = task.status === 'rejected';
              const startDate = new Date(task.created_at);
              const dueDate = new Date(startDate);
              dueDate.setDate(dueDate.getDate() + 7);

              return (
                <div key={task.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/60 border-l-4 ${sCfg.border} ${
                    isRejected ? 'hover:shadow-red-100 dark:hover:shadow-none' : 'hover:shadow-md cursor-pointer'
                  } transition-shadow`}
                  onClick={() => !isRejected && setSelectedId(task.id)}>

                  {/* Top Pills */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className={`px-3 py-1 rounded-md text-[11px] font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                    <span className={`px-3 py-1 rounded-md text-[11px] font-bold ${pCfg.bg} ${pCfg.text}`}>{pCfg.label}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-[#0A1628] dark:text-white mb-2 line-clamp-1">{task.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 min-h-[40px]">
                    {task.description || 'Aucune description fournie.'}
                  </p>

                  {/* Progress stepper */}
                  <div className="mb-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Avancement</p>
                    {(() => {
                      const getTaskStepIndex = (status: string) => {
                        if (status === 'refusee_agent') return -1;
                        if (status === 'assignee_chef' || status === 'assignee_agent') return 0;
                        if (status === 'en_cours') return 1;
                        if (status === 'resolue') return 2;
                        if (status === 'cloturee') return 3;
                        return 0;
                      };
                      const TASK_STEPS = ['En attente', 'En cours', 'Résolue', 'Clôturée'];
                      const cur = getTaskStepIndex(task.rawStatus);
                      const isRefused = cur === -1;

                      return (
                        <div className="flex flex-col gap-3">
                          {/* 4-segment bar — all gray when refused */}
                          <div className="flex items-center justify-between gap-1.5">
                            {TASK_STEPS.map((label, idx) => {
                              const done   = !isRefused && idx < cur;
                              const active = !isRefused && idx === cur && idx < 3;
                              const last   = !isRefused && idx === cur && idx === 3; // Clôturée complete
                              return (
                                <div key={label} className="flex-1 flex flex-col gap-1.5">
                                  <div className={`h-1.5 rounded-full transition-all ${
                                    done || last ? 'bg-emerald-500'
                                    : active     ? 'bg-[#1557FF]'
                                    : 'bg-slate-100 dark:bg-slate-800'
                                  }`} />
                                  <span className={`text-[9px] font-bold text-center truncate ${
                                    done || last ? 'text-emerald-600'
                                    : active     ? 'text-[#1557FF]'
                                    : 'text-slate-400'
                                  }`}>{label}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Refused branch: badge + reassign button */}
                          {isRefused && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="px-2.5 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg inline-flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                <span className="text-[10px] font-bold text-red-700 dark:text-red-300">
                                  Refusé — Motif: {task.refusal_reason || 'Non précisé'}
                                </span>
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); openAssignModal(task); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-black shadow-sm transition-all">
                                <RefreshCw className="w-3 h-3" /> Réassigner
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Dates */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium mb-0.5">Créée le</p>
                      <p className="text-xs font-bold text-[#0A1628] dark:text-white">{fmtDate(task.created_at)}</p>
                    </div>
                    {!isRejected && (
                      <div className="text-right">
                        <p className="text-[11px] text-slate-400 font-medium mb-0.5">Date butoir</p>
                        <p className="text-xs font-bold text-[#0A1628] dark:text-white">{fmtDate(dueDate.toISOString())}</p>
                      </div>
                    )}
                  </div>

                  {/* En attente note */}
                  {task.status === 'todo' && (
                    <div className="mb-3 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-lg flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        {task.assigned_agents?.length > 0 
                          ? "En attente d'acceptation par l'agent."
                          : "Non encore assigné. Veuillez assigner un agent."}
                      </span>
                    </div>
                  )}

                  {/* Bottom row */}
                  <div className="flex items-center justify-between w-full">
                    {!isRejected ? (
                      <>
                        <div className="flex items-center">
                          <div className="flex -space-x-2 mr-2">
                            {task.assigned_agents.slice(0, 3).map((a, i) => (
                              <div key={a.id} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                                style={{ zIndex: 10 - i, backgroundColor: AGENT_COLORS[i % AGENT_COLORS.length] }} title={`${a.first_name} ${a.last_name}`}>
                                {a.first_name[0]}{a.last_name[0]}
                              </div>
                            ))}
                            {task.assigned_agents.length > 3 && (
                              <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm" style={{ zIndex: 6 }}>
                                +{task.assigned_agents.length - 3}
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); openAssignModal(task); }} 
                            className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:border-[#1557FF] hover:text-[#1557FF] transition-colors" 
                            title="Assigner un agent">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const atts = task.attachments || [];
                            if (atts.length > 0) {
                              setSelectedTaskImages(atts);
                              setIsGalleryOpen(true);
                            } else {
                              toast('Aucune pièce jointe', { icon: '📎' });
                            }
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                            (task.attachments?.length || 0) > 0 
                              ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-900/40 cursor-pointer' 
                              : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed'
                          }`}>
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{task.attachments?.length || 0}</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex justify-end w-full">
                        <button
                          onClick={e => { e.stopPropagation(); openAssignModal(task); }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black shadow transition-all">
                          <RefreshCw className="w-3.5 h-3.5" /> Réassigner
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {assigningTask && (
        <AddAgentModal
          decl={assigningTask}
          agents={agents}
          onClose={() => setAssigningTask(null)}
          onDone={() => { fetchTasks(); setAssigningTask(null); }}
        />
      )}

      {isGalleryOpen && (
        <ImageGalleryModal 
          images={selectedTaskImages} 
          onClose={() => { setIsGalleryOpen(false); setSelectedTaskImages([]); }} 
        />
      )}

      {/* Shared Detail Drawer — opens on card click */}
      {selectedId && (
        <DetailDrawer
          declId={selectedId}
          agents={agents}
          onClose={() => setSelectedId(null)}
          onRefreshed={() => {
            // Refresh tasks immediately without closing the drawer
            // so the chef sees the updated status in real time
            fetchTasks();
          }}
        />
      )}
    </ChefLayout>
  );
}