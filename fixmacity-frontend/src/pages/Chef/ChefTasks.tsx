import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChefLayout from '../../layouts/ChefLayout';
import { Download, Paperclip, Search, Plus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  rawStatus: string;
  category: string;
  ref_citoyen: string;
  created_at: string;
  assigned_agents: Agent[];
  priority: string;
  has_image: boolean;
}

const mapStatusToColumn = (rawStatus: string): 'todo' | 'in_progress' | 'done' => {
  if (['assignee_chef'].includes(rawStatus)) return 'todo';
  if (['assignee_agent', 'en_cours'].includes(rawStatus)) return 'in_progress';
  if (['resolue', 'evaluee', 'cloturee'].includes(rawStatus)) return 'done';
  return 'todo'; // fallback
};

const getStatusColorConfig = (status: string) => {
  switch (status) {
    case 'todo': 
      return { 
        border: 'border-l-purple-500', 
        bg: 'bg-purple-50 dark:bg-purple-500/10', 
        text: 'text-purple-600 dark:text-purple-400',
        label: 'En attente',
        progress: 0
      };
    case 'in_progress': 
      return { 
        border: 'border-l-cyan-400', 
        bg: 'bg-cyan-50 dark:bg-cyan-400/10', 
        text: 'text-cyan-600 dark:text-cyan-400',
        label: 'En cours',
        progress: 50
      };
    case 'done': 
      return { 
        border: 'border-l-emerald-500', 
        bg: 'bg-emerald-50 dark:bg-emerald-500/10', 
        text: 'text-emerald-600 dark:text-emerald-400',
        label: 'Évaluée / Clôturée',
        progress: 100
      };
    default: 
      return { border: 'border-l-slate-400', bg: 'bg-slate-50', text: 'text-slate-600', label: 'Inconnu', progress: 0 };
  }
};

const getPriorityConfig = (priority: string) => {
  const p = (priority || '').toLowerCase();
  if (['haute', 'urgente', 'high'].includes(p)) {
    return { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-500', label: 'Priorité Haute' };
  }
  if (['basse', 'low'].includes(p)) {
    return { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500', label: 'Priorité Basse' };
  }
  return { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-500', label: 'Priorité Moyenne' };
};

export default function ChefTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'Tous' | 'En attente' | 'En cours' | 'Clôturée'>('Tous');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('fmc_token');
      const res = await fetch(`${API_URL}/chef/declarations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erreur');
      
      const resData = await res.json();
      const declarationsArray = resData.declarations ? resData.declarations : (Array.isArray(resData) ? resData : []);
      
      const activeDeclarations = declarationsArray.filter((d: any) => 
        !['soumise', 'rejetee', 'assignee_chef', 'refusee_chef'].includes(d.status)
      );

      const mappedTasks: Task[] = activeDeclarations.map((d: any) => ({
        id: d.id,
        title: d.title || d.category || 'Sans titre',
        description: d.description,
        status: mapStatusToColumn(d.status),
        rawStatus: d.status,
        category: d.category,
        ref_citoyen: d.ref_citoyen,
        created_at: d.created_at,
        assigned_agents: d.assigned_agents || [],
        priority: d.priority || 'moyenne',
        has_image: !!d.image_url
      }));

      setTasks(mappedTasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const counts = {
    Tous: tasks.length,
    'En attente': tasks.filter(t => t.status === 'todo').length,
    'En cours': tasks.filter(t => t.status === 'in_progress').length,
    'Clôturée': tasks.filter(t => t.status === 'done').length,
  };

  const displayedTasks = tasks.filter(t => {
    if (filter === 'Tous') return true;
    if (filter === 'En attente') return t.status === 'todo';
    if (filter === 'En cours') return t.status === 'in_progress';
    if (filter === 'Clôturée') return t.status === 'done';
    return true;
  });

  return (
    <ChefLayout title="Mes Missions">
      <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8">
        
        {/* Header & Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <h1 className="text-3xl font-black text-[#0A1628] dark:text-white tracking-tight">
            Mes Missions
          </h1>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 w-full lg:w-auto">
            {/* Tabs */}
            <div className="flex items-center gap-1 border-b-2 border-transparent">
              {(['Tous', 'En attente', 'En cours', 'Clôturée'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-all ${
                    filter === tab 
                      ? 'border-[#1557FF] text-[#1557FF]' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <span className="text-sm font-bold">{tab}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    filter === tab 
                      ? 'bg-[#1557FF] text-white' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {counts[tab]}
                  </span>
                </button>
              ))}
            </div>

            {/* Download Button */}
            <button className="flex items-center gap-2 bg-[#dcfce7] dark:bg-emerald-500/20 text-[#16a34a] dark:text-emerald-400 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#bbf7d0] transition-colors">
              <Download className="w-4 h-4" />
              Télécharger le rapport
            </button>
          </div>
        </div>

        {/* Grid Container */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1557FF]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayedTasks.map(task => {
              const statusCfg = getStatusColorConfig(task.status);
              const prioCfg = getPriorityConfig(task.priority);
              
              // Calculate a mock due date (7 days after creation)
              const startDate = new Date(task.created_at);
              const dueDate = new Date(startDate);
              dueDate.setDate(dueDate.getDate() + 7);
              
              const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <div 
                  key={task.id}
                  onClick={() => navigate(`/chef/declarations/${task.id}`)}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/60 hover:shadow-md transition-shadow cursor-pointer border-l-4 ${statusCfg.border}`}
                >
                  {/* Top Pills */}
                  <div className="flex items-center gap-3 mb-5">
                    <span className={`px-3 py-1 rounded-md text-[11px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
                      {statusCfg.label}
                    </span>
                    <span className={`px-3 py-1 rounded-md text-[11px] font-bold ${prioCfg.bg} ${prioCfg.text}`}>
                      {prioCfg.label}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="text-lg font-bold text-[#0A1628] dark:text-white mb-2 line-clamp-1">
                    {task.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-5 min-h-[40px]">
                    {task.description || "Aucune description fournie pour cette tâche. Veuillez consulter les détails."}
                  </p>

                  {/* Progress Stepper */}
                  <div className="mb-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5">
                      Statut d'avancement
                    </p>
                    {(() => {
                      const steps = ['Assigné', 'En cours', 'Évaluée', 'Clôturée'];
                      let currentIndex = -1;
                      if (['assignee_agent'].includes(task.rawStatus)) currentIndex = 0;
                      if (['en_cours'].includes(task.rawStatus)) currentIndex = 1;
                      if (['resolue', 'evaluee'].includes(task.rawStatus)) currentIndex = 2;
                      if (['cloturee'].includes(task.rawStatus)) currentIndex = 3;

                      return (
                        <div className="flex items-center justify-between gap-1.5">
                          {steps.map((label, idx) => {
                            const isCompleted = idx < currentIndex || (idx === 3 && currentIndex === 3);
                            const isCurrent = idx === currentIndex && idx !== 3;
                            
                            return (
                              <div key={label} className="flex-1 flex flex-col gap-1.5">
                                <div className={`h-1.5 rounded-full transition-all duration-300 ${
                                  isCompleted ? 'bg-emerald-500' : 
                                  isCurrent ? 'bg-[#1557FF]' : 
                                  'bg-slate-100 dark:bg-slate-800'
                                }`} />
                                <span className={`text-[9px] font-bold text-center truncate ${
                                  isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 
                                  isCurrent ? 'text-[#1557FF]' : 
                                  'text-slate-400 dark:text-slate-500'
                                }`}>
                                  {label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Dates */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium mb-1">Créée le</p>
                      <p className="text-xs font-bold text-[#0A1628] dark:text-white">{fmtDate(startDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400 font-medium mb-1">Date butoir</p>
                      <p className="text-xs font-bold text-[#0A1628] dark:text-white">{fmtDate(dueDate)}</p>
                    </div>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {task.assigned_agents.length > 0 ? (
                        task.assigned_agents.slice(0, 3).map((agent, i) => (
                          <div 
                            key={agent.id}
                            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 z-10"
                            style={{ zIndex: 10 - i }}
                            title={`${agent.first_name} ${agent.last_name}`}
                          >
                            {agent.first_name[0]}{agent.last_name[0]}
                          </div>
                        ))
                      ) : (
                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                          <Plus className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      )}
                      {task.assigned_agents.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-600 z-0">
                          +{task.assigned_agents.length - 3}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f0f9ff] dark:bg-sky-900/20 text-[#0ea5e9] rounded-lg">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{task.has_image ? 1 : 0}</span>
                    </div>
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ChefLayout>
  );
}