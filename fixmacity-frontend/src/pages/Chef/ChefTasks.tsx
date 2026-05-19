import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChefLayout from '../../layouts/ChefLayout';
import { Download, Paperclip, Plus, X, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const tok = () => localStorage.getItem('fmc_token') || '';
const jsonH = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });

interface Agent { id: string; first_name: string; last_name: string; active_tasks?: number; }
interface Task {
  id: string; title: string; description: string | null;
  status: 'todo' | 'in_progress' | 'evaluee' | 'cloturee' | 'rejected';
  rawStatus: string; category: string; ref_citoyen: string;
  created_at: string; assigned_agents: Agent[];
  priority: string; has_image: boolean; refusal_reason?: string;
}

const mapStatus = (s: string): Task['status'] => {
  const normalized = s?.toLowerCase();
  if (['assignee_agent', 'en_cours'].includes(normalized)) return 'in_progress';
  if (['resolue', 'evaluee'].includes(normalized)) return 'evaluee';
  if (normalized === 'cloturee') return 'cloturee';
  if (normalized === 'refusee_agent') return 'rejected';
  return 'todo';
};

const statusCfg = (s: Task['status']) => {
  const map = {
    todo:        { border: 'border-l-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', label: 'En attente' },
    in_progress: { border: 'border-l-blue-600',   bg: 'bg-blue-50 dark:bg-blue-500/10',     text: 'text-blue-600 dark:text-blue-400',     label: 'En cours' },
    evaluee:     { border: 'border-l-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Évaluée' },
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

// ── Reassign Modal ─────────────────────────────────────────────────────────────
function ReassignModal({ task, onClose, onDone }: { task: Task; onClose: () => void; onDone: () => void }) {
  const [agents, setAgents]   = useState<Agent[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading]  = useState(false);
  const maxTasks = parseInt(localStorage.getItem('fmc_max_tasks') || '5');

  useEffect(() => {
    fetch(`${API_URL}/chef/agents`, { headers: { Authorization: `Bearer ${tok()}` } })
      .then(r => r.json())
      .then(d => {
        const raw: any[] = d.agents || d || [];
        setAgents(raw.map((a: any) => ({
          id: a.id,
          first_name: a.first_name,
          last_name: a.last_name,
          active_tasks: a.workload ?? a.active_tasks ?? 0,
        })));
      });
  }, []);

  const doReassign = async () => {
    if (!selected) return toast.error('Choisissez un agent');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/chef/declarations/${task.id}/accept`, {
        method: 'POST', headers: jsonH(),
        body: JSON.stringify({ agent_id: selected }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      toast.success('Mission réassignée ✓');
      onDone(); onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-orange-500 mb-1">Réassignation requise</p>
            <h2 className="text-xl font-black text-[#0A1628] dark:text-white">Choisir un Autre Agent</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{task.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        {/* Motif banner */}
        {task.refusal_reason && (
          <div className="mx-8 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-2xl flex gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-0.5">Motif du rejet</p>
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">{task.refusal_reason}</p>
            </div>
          </div>
        )}

        {/* Agent list */}
        <div className="px-8 py-5 space-y-2 max-h-64 overflow-y-auto">
          {agents.filter(a => a.id !== (task.assigned_agents[0]?.id)).map((a, i) => {
            const isSel = selected === a.id;
            const pct   = Math.min(((a.active_tasks || 0) / maxTasks) * 100, 100);
            const bCol  = (a.active_tasks || 0) >= maxTasks ? '#EF4444' : (a.active_tasks || 0) >= Math.ceil(maxTasks / 2) ? '#3B82F6' : '#10B981';
            const sLabel = (a.active_tasks || 0) >= maxTasks ? 'Surchargé' : (a.active_tasks || 0) >= Math.ceil(maxTasks / 2) ? 'En mission' : 'Disponible';
            return (
              <button key={a.id} onClick={() => setSelected(a.id)}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 text-left transition-all ${isSel ? 'border-[#1557FF] bg-blue-50/40 dark:bg-blue-500/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 bg-slate-50/50 dark:bg-slate-800/30'}`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shadow flex-shrink-0"
                  style={{ background: AGENT_COLORS[i % AGENT_COLORS.length] }}>
                  {a.first_name[0]}{a.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-black text-[#0A1628] dark:text-white truncate">{a.first_name} {a.last_name}</p>
                    <span className="text-[9px] font-black ml-2" style={{ color: bCol }}>{sLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: bCol }} />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 flex-shrink-0">{a.active_tasks || 0}/{maxTasks}</span>
                  </div>
                </div>
                {isSel && <CheckCircle2 className="w-5 h-5 text-[#1557FF] flex-shrink-0" />}
              </button>
            );
          })}
          {agents.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">Chargement des agents...</p>
          )}
        </div>

        <div className="px-8 pb-8 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Annuler</button>
          <button onClick={doReassign} disabled={!selected || loading}
            className="flex-[2] py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-black shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4" />Confirmer la Réassignation</>}
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'Tous' | 'En attente' | 'En cours' | 'Évaluée' | 'Clôturée' | 'Rejetée'>('Tous');
  const [reassigning, setReassigning] = useState<Task | null>(null);

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/chef/declarations`, {
        headers: { Authorization: `Bearer ${tok()}` }
      });
      if (!res.ok) throw new Error('Erreur');
      const resData = await res.json();
      const arr: any[] = resData.declarations ?? (Array.isArray(resData) ? resData : []);

      // Include active + rejected-by-agent; exclude pure incoming / chef-refused
      const filtered = arr.filter((d: any) =>
        !['soumise', 'rejetee', 'assignee_chef', 'refusee_chef'].includes(d.status)
      );

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
        refusal_reason: d.refusal_reason || d.agent_refusal_reason || null,
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const counts = {
    Tous: tasks.length,
    'En attente': tasks.filter(t => t.status === 'todo').length,
    'En cours':   tasks.filter(t => t.status === 'in_progress').length,
    'Évaluée':    tasks.filter(t => t.status === 'evaluee').length,
    'Clôturée':   tasks.filter(t => t.status === 'cloturee').length,
    'Rejetée':    tasks.filter(t => t.status === 'rejected').length,
  };

  const displayed = tasks.filter(t => {
    if (filter === 'Tous')       return true;
    if (filter === 'En attente') return t.status === 'todo';
    if (filter === 'En cours')   return t.status === 'in_progress';
    if (filter === 'Évaluée')    return t.status === 'evaluee';
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
          <h1 className="text-3xl font-black text-[#0A1628] dark:text-white tracking-tight">Mes Missions</h1>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 w-full lg:w-auto">
            <div className="flex items-center gap-1 flex-wrap">
              {(['Tous', 'En attente', 'En cours', 'Évaluée', 'Clôturée', 'Rejetée'] as const).map(tab => (
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
            <button className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors">
              <Download className="w-4 h-4" /> Rapport
            </button>
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
                  onClick={() => !isRejected && navigate(`/chef/declarations/${task.id}`)}>

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

                  {/* Rejection motif box (only for rejected) */}
                  {isRejected && task.refusal_reason && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Motif du rejet</p>
                      <p className="text-xs text-red-700 dark:text-red-300 font-medium">{task.refusal_reason}</p>
                    </div>
                  )}

                  {/* Progress stepper (non-rejected) */}
                  {!isRejected && (
                    <div className="mb-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Avancement</p>
                      {(() => {
                        const steps = ['Assigné', 'En cours', 'Évaluée', 'Clôturée'];
                        let cur = -1;
                        if (task.rawStatus === 'assignee_agent') cur = 0;
                        if (task.rawStatus === 'en_cours') cur = 1;
                        if (['resolue', 'evaluee'].includes(task.rawStatus)) cur = 2;
                        if (task.rawStatus === 'cloturee') cur = 3;
                        return (
                          <div className="flex items-center justify-between gap-1.5">
                            {steps.map((label, idx) => {
                              const done = idx < cur || (idx === 3 && cur === 3);
                              const active = idx === cur && idx !== 3;
                              return (
                                <div key={label} className="flex-1 flex flex-col gap-1.5">
                                  <div className={`h-1.5 rounded-full transition-all ${done ? 'bg-emerald-500' : active ? 'bg-[#1557FF]' : 'bg-slate-100 dark:bg-slate-800'}`} />
                                  <span className={`text-[9px] font-bold text-center truncate ${done ? 'text-emerald-600' : active ? 'text-[#1557FF]' : 'text-slate-400'}`}>{label}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

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

                  {/* Bottom row */}
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {task.assigned_agents.slice(0, 3).map((a, i) => (
                        <div key={a.id} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300"
                          style={{ zIndex: 10 - i }} title={`${a.first_name} ${a.last_name}`}>
                          {a.first_name[0]}{a.last_name[0]}
                        </div>
                      ))}
                      {task.assigned_agents.length === 0 && (
                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                          <Plus className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {isRejected ? (
                      <button
                        onClick={e => { e.stopPropagation(); setReassigning(task); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black shadow transition-all">
                        <RefreshCw className="w-3.5 h-3.5" /> Réassigner
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 dark:bg-sky-900/20 text-sky-500 rounded-lg">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{task.has_image ? 1 : 0}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reassigning && (
        <ReassignModal
          task={reassigning}
          onClose={() => setReassigning(null)}
          onDone={() => { fetchTasks(); setReassigning(null); }}
        />
      )}
    </ChefLayout>
  );
}