import React, { useState, useEffect, useRef } from 'react';
import type { Declaration, DeclarationStatus, Comment, HistoryEvent, AgentInfo } from '../../types/agent.types';
import { PriorityBadge, StatusPill, TypeBadge, Avatar, Btn, SectionDivider } from '../ui';
import { toast } from 'react-hot-toast';
import {
  Loader2, X, Upload, MessageSquare,
  FileText, Users, Lock, CheckCircle2, AlertCircle,
  MapPin, Calendar
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const tok = () => localStorage.getItem('fmc_token') || '';
const hdr = () => ({ Authorization: `Bearer ${tok()}` });
const hjson = () => ({ ...hdr(), 'Content-Type': 'application/json' });

interface DetailPageProps {
  tacheId: string;
  onClose: () => void;
  onAccepted: () => void;
  onRejected: () => void;
  initialTab?: Tab;
  forceShowMotif?: boolean;
}

type Tab = 'info' | 'comments' | 'actions';

// ─── Status progression config ────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: 'soumise', label: 'Soumise' },
  { key: 'assignee_chef', label: 'Chef assigné' },
  { key: 'assignee_agent', label: 'Assignée' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'resolue', label: 'Évaluée' },
  { key: 'cloturee', label: 'Clôturée' },
];

const REFUSED_STATUSES = ['refusee_chef', 'refusee_agent'];

const ROLE_BADGE: Record<string, string> = {
  agent: 'bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400',
  chef: 'bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400',
  president: 'bg-yellow-100 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-450',
  citizen: 'bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mapComments(raw: any[]): Comment[] {
  return (raw || []).map((c: any) => {
    const a = c.author || {};
    const first = a.first_name || '', last = a.last_name || '';
    const name = `${first} ${last}`.trim() || 'Utilisateur';
    const init = first && last ? `${first[0]}${last[0]}` : first ? first.slice(0, 2) : 'UI';
    return {
      auteur: name,
      role: a.role || 'user',
      initiales: init.toUpperCase(),
      heure: c.created_at
        ? new Date(c.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
        : 'À l\'instant',
      text: c.content || '',
    };
  });
}

function mapHistory(raw: any[]): HistoryEvent[] {
  const lbl: Record<string, string> = {
    soumise: 'Soumise', assignee_chef: 'Chef assigné', assignee_agent: 'Agent assigné',
    en_cours: 'En cours', resolue: 'Évaluée', cloturee: 'Clôturée',
    refusee_chef: 'Refusée (chef)', refusee_agent: 'Refusée (agent)',
  };
  return (raw || []).map((h: any) => {
    const user = h.changed_by_user || {};
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Système';
    let color: HistoryEvent['color'] = 'blue';
    if (h.new_status === 'resolue') color = 'green';
    else if (h.new_status === 'en_cours') color = 'orange';
    else if ((h.new_status || '').startsWith('refusee')) color = 'red';
    else if (h.new_status === 'cloturee') color = 'gray';
    return {
      titre: `${name} — [${lbl[h.old_status] || h.old_status || '?'}] → [${lbl[h.new_status] || h.new_status || '?'}]${h.raison ? ` — "${h.raison}"` : ''}`,
      heure: h.created_at
        ? new Date(h.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
        : 'À l\'instant',
      color,
    };
  });
}

function mapAgents(data: any): AgentInfo[] {
  const list: AgentInfo[] = [];
  if (data.agent) {
    list.push({ nom: `${data.agent.first_name || ''} ${data.agent.last_name || ''}`.trim() || 'Agent Assigné', dept: data.department?.name_fr || '—' });
  } else {
    list.push({ nom: 'Non Assigné', dept: data.department?.name_fr || '—' });
  }
  (data.other_assignments || []).forEach((oa: any) => {
    const nom = oa.agent ? `${oa.agent.first_name || ''} ${oa.agent.last_name || ''}`.trim() : 'Non Assigné';
    list.push({ nom, dept: oa.department?.name_fr || 'Autre département' });
  });
  return list;
}

// ─── Status stepper ──────────────────────────────────────────────────────────
function StatusStepper({ current }: { current: string }) {
  const isRefused = REFUSED_STATUSES.includes(current);
  const activeIdx = STATUS_STEPS.findIndex(s => s.key === current);

  if (isRefused) {
    return (
      <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/20 rounded-xl">
        <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
        <div>
          <div className="text-xs font-bold text-red-600 dark:text-red-400">Mission refusée</div>
          <div className="text-[11px] text-red-500 dark:text-red-400/80 mt-0.5">
            {current === 'refusee_agent' ? 'Refus transmis au Chef de Service.' : 'Refus validé par le Chef de Service.'}
          </div>
        </div>
      </div>
    );
  }

  const STEP_COLORS: Record<string, { bgActive: string; borderActive: string; dotActive: string; textActive: string }> = {
    soumise: {
      bgActive: 'bg-amber-50 dark:bg-amber-950/20',
      borderActive: 'border-amber-500',
      dotActive: 'bg-amber-500',
      textActive: 'text-amber-600 dark:text-amber-400',
    },
    assignee_chef: {
      bgActive: 'bg-violet-50 dark:bg-violet-950/20',
      borderActive: 'border-violet-500',
      dotActive: 'bg-violet-500',
      textActive: 'text-violet-600 dark:text-violet-400',
    },
    assignee_agent: {
      bgActive: 'bg-blue-50 dark:bg-blue-950/20',
      borderActive: 'border-blue-500',
      dotActive: 'bg-blue-500',
      textActive: 'text-blue-600 dark:text-blue-400',
    },
    en_cours: {
      bgActive: 'bg-orange-50 dark:bg-orange-950/20',
      borderActive: 'border-orange-500',
      dotActive: 'bg-orange-500',
      textActive: 'text-orange-600 dark:text-orange-400',
    },
    resolue: {
      bgActive: 'bg-emerald-50 dark:bg-emerald-950/20',
      borderActive: 'border-emerald-500',
      dotActive: 'bg-emerald-500',
      textActive: 'text-emerald-600 dark:text-emerald-400',
    },
    cloturee: {
      bgActive: 'bg-slate-100 dark:bg-slate-800',
      borderActive: 'border-slate-500',
      dotActive: 'bg-slate-500',
      textActive: 'text-slate-600 dark:text-slate-400',
    },
  };

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-none">
      {STATUS_STEPS.map((step, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        const colorCfg = STEP_COLORS[step.key] ?? STEP_COLORS.cloturee;
        
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 border-2 ${
                done 
                  ? 'bg-emerald-500 border-emerald-500' 
                  : active 
                    ? `${colorCfg.bgActive} ${colorCfg.borderActive}` 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                {done ? (
                  <CheckCircle2 size={14} className="text-white" />
                ) : (
                  <span className={`w-2 h-2 rounded-full block ${
                    active ? colorCfg.dotActive : 'bg-slate-300 dark:bg-slate-700'
                  }`} />
                )}
              </div>
              <span className={`text-[9px] text-center leading-tight max-w-[56px] ${
                done 
                  ? 'text-emerald-600 dark:text-emerald-450 font-bold' 
                  : active 
                    ? `${colorCfg.textActive} font-bold` 
                    : 'text-slate-450 dark:text-slate-500 font-medium'
              }`}>
                {step.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`flex-grow h-0.5 mb-3.5 transition-all duration-200 min-w-[8px] ${
                done ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Locked placeholder ───────────────────────────────────────────────────────
function LockedPane({ message }: { message: string }) {
  return (
    <div className="text-center py-12 px-6 text-slate-400 dark:text-slate-500">
      <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 flex items-center justify-center mx-auto mb-3.5 shadow-sm">
        <Lock size={20} className="text-slate-400 dark:text-slate-550" />
      </div>
      <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5">Canal verrouillé</div>
      <div className="text-xs font-semibold max-w-xs mx-auto leading-relaxed text-slate-500 dark:text-slate-400">{message}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AgentDeclarationDetail({
  tacheId,
  onClose,
  onAccepted,
  onRejected,
  initialTab,
  forceShowMotif,
}: DetailPageProps) {
  const [decl, setDecl] = useState<Declaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab || 'info');

  const [newComment, setNewComment] = useState('');
  const [statusSel, setStatusSel] = useState<DeclarationStatus>('en_cours');
  const [motif, setMotif] = useState('');
  const [motifError, setMotifError] = useState('');
  const [showMotifForm, setShowMotifForm] = useState(forceShowMotif || false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [photoAvantUrl, setPhotoAvantUrl] = useState<string | null>(null);
  const [photoApresUrl, setPhotoApresUrl] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [localAgents, setLocalAgents] = useState<AgentInfo[]>([]);
  const [accepting, setAccepting] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const go = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/agent/declarations/${tacheId}`, { headers: hdr() });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (cancelled) return;

        const beforePhoto = data.photos?.find((p: any) => p.photo_type === 'avant')?.url || data.photo_avant || null;
        const afterPhoto = data.photos?.find((p: any) => ['intervention', 'apres', 'after'].includes(p.photo_type))?.url || null;
        setPhotoAvantUrl(beforePhoto);
        setPhotoApresUrl(afterPhoto);
        setPhotoUploaded(!!afterPhoto);

        const mapped: Declaration = {
          id: data.id,
          ref_citoyen: data.ref_citoyen || `#${data.id?.slice(-4) || '????'}`,
          titre: data.title || data.titre || 'Sans titre',
          description: data.description || '',
          statut: data.status || data.statut || 'assignee_agent',
          priorite: data.priority || data.priorite || 'moyenne',
          type: data.category || data.type || '—',
          dateAssignation: data.assigned_at
            ? new Date(data.assigned_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
            : '—',
          dateSubmission: data.created_at
            ? new Date(data.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
            : '—',
          arrondissement: data.address || 'Non spécifié',
          gps: data.latitude && data.longitude
            ? `${Number(data.latitude).toFixed(4)}° N, ${Number(data.longitude).toFixed(4)}° E`
            : 'Non spécifié',
          photoSignalement: !!beforePhoto,
          photoPreuve: !!afterPhoto,
          citoyen: data.citizen
            ? {
              nom: `${data.citizen.first_name || ''} ${data.citizen.last_name || ''}`.trim() || 'Citoyen',
              email: data.citizen.email || '—',
              phone: data.citizen.phone || '—',
              initiales: data.citizen.first_name
                ? `${data.citizen.first_name[0]}${data.citizen.last_name?.[0] || ''}`.toUpperCase()
                : 'CI',
            }
            : { nom: 'Citoyen Anonyme', email: '—', phone: '—', initiales: 'CA' },
          agents: mapAgents(data),
          history: mapHistory(data.history),
          comments: mapComments(data.comments),
        };

        setDecl(mapped);
        setStatusSel(mapped.statut === 'assignee_agent' ? 'en_cours' : mapped.statut === 'resolue' ? 'resolue' : 'en_cours');
        setLocalComments(mapped.comments);
        setLocalAgents(mapped.agents);
        if (mapped.statut === 'assignee_agent') setActiveTab('actions');
      } catch {
        if (!cancelled) { toast.error('Impossible de charger les détails'); onClose(); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    go();
    return () => { cancelled = true; };
  }, [tacheId]);

  if (loading) return (
    <>
      {/* Drawer backdrop while loading */}
      <div className="fixed inset-0 z-[900] bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-[901] w-[680px] max-w-full bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="animate-spin text-emerald-500" size={36} />
          <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Chargement de la mission...</p>
        </div>
      </div>
    </>
  );

  if (!decl) return null;

  const isPending = decl.statut === 'assignee_agent';
  const isLocked = isPending || REFUSED_STATUSES.includes(decl.statut);
  const isEditable = ['assignee_agent', 'en_cours'].includes(decl.statut);
  const isClosed = ['cloturee', 'resolue'].includes(decl.statut);

  // ── Accept ────────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    try {
      setAccepting(true);
      const res = await fetch(`${API}/agent/declarations/${decl.id}/accept`, { method: 'POST', headers: hjson() });
      if (!res.ok) throw new Error();
      toast.success('✅ Mission acceptée — Intervention démarrée');
      onAccepted();
    } catch { toast.error("Erreur lors de l'acceptation"); }
    finally { setAccepting(false); }
  };

  // ── Refuse ────────────────────────────────────────────────────────────────
  const handleRefuse = async () => {
    if (!motif.trim()) { setMotifError('⚠ Le motif de refus est obligatoire.'); return; }
    if (motif.trim().length < 10) { setMotifError('⚠ Motif trop court (min. 10 caractères).'); return; }
    try {
      setRefusing(true);
      const res = await fetch(`${API}/agent/declarations/${decl.id}/refuse`, {
        method: 'POST', headers: hjson(), body: JSON.stringify({ raison: motif.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success('Mission refusée — Motif transmis au Chef de Service');
      onRejected();
    } catch { toast.error('Erreur lors du refus'); }
    finally { setRefusing(false); }
  };

  // ── Status change ─────────────────────────────────────────────────────────
  const handleStatusChange = async () => {
    if (decl?.statut === 'cloturee') {
      toast.error("Action interdite : le signalement est déjà clôturé.");
      return;
    }
    if (statusSel === 'resolue' && !photoUploaded) {
      setStatusFeedback('⚠ Uploadez une photo de preuve avant d\'évaluer.');
      return;
    }
    try {
      const endpoint = statusSel === 'resolue'
        ? `${API}/agent/declarations/${decl.id}/resolve`
        : `${API}/agent/declarations/${decl.id}/accept`;
      const res = await fetch(endpoint, {
        method: 'POST', headers: hjson(),
        body: JSON.stringify({ rapport_interne: 'Mise à jour via panneau détails' }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Erreur'); }
      toast.success('✅ Statut mis à jour');
      setStatusFeedback('✓ Statut mis à jour avec succès.');
      onAccepted();
    } catch (err: any) {
      const m = err.message || 'Erreur';
      setStatusFeedback(`⚠ ${m}`);
      toast.error(m);
    }
  };

  // ── Comment ───────────────────────────────────────────────────────────────
  const handleAddComment = async () => {
    if (decl?.statut === 'cloturee') {
      toast.error("Action interdite : impossible d'ajouter un commentaire après clôture.");
      return;
    }
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`${API}/agent/declarations/${decl.id}/comments`, {
        method: 'POST', headers: hjson(),
        body: JSON.stringify({ content: newComment.trim(), channel: 'chef_agent' }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLocalComments(prev => [...prev, mapComments([data])[0]]);
      setNewComment('');
      toast.success('Commentaire envoyé');
    } catch { toast.error("Erreur d'envoi"); }
  };

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (decl?.statut === 'cloturee') {
      toast.error("Action interdite : impossible d'ajouter une photo après clôture.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    try {
      setUploading(true);
      setStatusFeedback('Téléversement...');
      const res = await fetch(`${API}/agent/declarations/${decl.id}/photo`, { method: 'POST', headers: hdr(), body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Erreur de téléversement'); }
      const data = await res.json();
      setPhotoApresUrl(data.url);
      setPhotoUploaded(true);
      setStatusFeedback('✓ Photo enregistrée. Vous pouvez maintenant évaluer.');
      toast.success('📷 Photo de preuve enregistrée');
    } catch (err: any) {
      setStatusFeedback(`⚠ ${err.message}`);
      toast.error(err.message || 'Erreur');
    } finally { setUploading(false); }
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const TABS: { key: Tab; label: string; icon: React.ReactNode; locked?: boolean }[] = [
    { key: 'info', label: 'État & Détails', icon: <FileText size={14} /> },
    { key: 'comments', label: isLocked ? '🔒 Commentaires' : `Commentaires (${localComments.length})`, icon: <MessageSquare size={14} />, locked: isLocked },
    ...(isEditable || isClosed ? [{ key: 'actions' as Tab, label: isPending ? '⚡ Décision' : 'Actions & Preuve', icon: <Upload size={14} /> }] : []),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[900] bg-slate-950/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 bottom-0 z-[901] w-[700px] max-w-full bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col">

        {/* Drawer top-bar: ref + close */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <code className="text-[10px] font-mono bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">{decl.ref_citoyen}</code>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">· Assigné le {decl.dateAssignation}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:border-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">

          {/* ── Header ── */}
          <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-855 p-5 mb-4 shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-3 leading-tight">{decl.titre}</h1>
                  <div className="flex gap-2 flex-wrap items-center">
                    <PriorityBadge p={decl.priorite} />
                    <TypeBadge t={decl.type} />
                    <StatusPill s={decl.statut} />
                  </div>
                </div>
                {isPending && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Btn variant="danger" onClick={() => { setShowMotifForm(true); setActiveTab('actions'); }}>✕ Refuser</Btn>
                    <Btn variant="primary" onClick={handleAccept} disabled={accepting}>{accepting ? '...' : '✓ Accepter'}</Btn>
                  </div>
                )}
              </div>

            {/* ── STATUS STEPPER (current state, always visible) ── */}
            <div className="mt-4 pt-4 border-t border-slate-150 dark:border-slate-850">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider mb-3">
                Progression de la mission
              </div>
              <StatusStepper current={decl.statut} />
            </div>
            </div>{/* end flex-col gap-3 */}
          </div>

          {/* ── Tabs strip ── */}
          <div className="bg-slate-50 dark:bg-slate-950 rounded-t-2xl border border-slate-150 dark:border-slate-855 border-b-0">
            <div className="flex px-1.5 overflow-x-auto scrollbar-none">
              {TABS.map(t => (
                <button 
                  key={t.key} 
                  onClick={() => { if (!t.locked) setActiveTab(t.key); }} 
                  title={t.locked ? 'Acceptez la mission pour déverrouiller' : undefined}
                  className={`px-4 py-3.5 text-xs font-bold transition-all duration-155 flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
                    t.locked 
                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50 border-transparent' 
                      : activeTab === t.key 
                        ? 'text-emerald-500 dark:text-emerald-450 border-emerald-500' 
                        : 'text-slate-450 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-transparent'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab content ── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 rounded-b-2xl p-5 md:p-6 shadow-sm">

            {/* ═══ INFO TAB — now shows CURRENT STATE, not just static details ═══ */}
            {activeTab === 'info' && (
              <div>
                {/* Photo pair */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-505 font-black uppercase tracking-wider mb-2">📷 Photo du signalement (citoyen)</div>
                    {photoAvantUrl
                      ? <div className="w-full h-[170px] rounded-xl overflow-hidden border border-slate-150 dark:border-slate-800"><img src={photoAvantUrl} alt="Signalement" className="w-full h-full object-cover" /></div>
                      : <div className="w-full h-[170px] rounded-xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs gap-2"><span className="text-2xl">📷</span>Aucune photo du citoyen</div>
                    }
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-505 font-black uppercase tracking-wider mb-2">
                      🔍 Preuve d'intervention{isLocked ? ' 🔒' : ''}
                    </div>
                    {photoApresUrl
                      ? <div className="w-full h-[170px] rounded-xl overflow-hidden border border-emerald-500/40"><img src={photoApresUrl} alt="Preuve" className="w-full h-full object-cover" /></div>
                      : <div className="w-full h-[170px] rounded-xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-450 dark:text-slate-500 text-xs gap-1.5">
                        {isLocked ? <Lock size={20} className="text-slate-400 dark:text-slate-550" /> : <span className="text-2xl">☁</span>}
                        {isLocked ? 'Disponible après acceptation' : 'Pas encore de photo de preuve'}
                      </div>
                    }
                  </div>
                </div>

                {/* Current status info-cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-5">
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl p-3">
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-black">
                      <MapPin size={10} /> Arrondissement
                    </div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{decl.arrondissement}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl p-3">
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-black">
                      <Calendar size={10} /> Soumis le
                    </div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{decl.dateSubmission}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl p-3">
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-black">
                      <Calendar size={10} /> Assigné le
                    </div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{decl.dateAssignation}</div>
                  </div>
                  <div className="md:col-span-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl p-3">
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 font-black">📍 GPS</div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">{decl.gps}</div>
                  </div>
                  <div className="md:col-span-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl p-4">
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 font-black">📝 Description</div>
                    <div className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">{decl.description || 'Aucune description fournie.'}</div>
                  </div>
                </div>

                {/* Citizen */}
                <SectionDivider label="Citoyen déclarant" />
                <div className="flex items-center gap-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl p-4 mb-5 border border-slate-150 dark:border-slate-850">
                  <Avatar initiales={decl.citoyen.initiales} role="citizen" size={42} />
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{decl.citoyen.nom}</div>
                    <div className="text-xs text-slate-450 dark:text-slate-400 mt-1 flex gap-3.5 flex-wrap font-semibold">
                      <span>✉ {decl.citoyen.email}</span>
                      <span>📞 {decl.citoyen.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Agents */}
                <SectionDivider label="Agents affectés" />
                <div className="flex flex-wrap gap-2">
                  {localAgents.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-450">
                      <Users size={12} className="flex-shrink-0" />
                      {a.nom}
                      <span className="opacity-60 text-[10px]">({a.dept})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ COMMENTS ═══ */}
            {activeTab === 'comments' && (
              isLocked
                ? <LockedPane message="Acceptez la mission pour débloquer la messagerie interne avec votre Chef de Service, le Président et les autres agents co-assignés." />
                : (
                  <>
                    <div className="flex flex-col gap-3 mb-4.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                      {localComments.length === 0 && (
                        <div className="text-center py-9 text-slate-400 dark:text-slate-550 text-xs font-semibold">Aucun commentaire pour l'instant. Commencez la discussion.</div>
                      )}
                      {localComments.map((c, i) => {
                        const badgeCls = ROLE_BADGE[c.role] ?? ROLE_BADGE.agent;
                        const isMe = c.role === 'agent';
                        return (
                          <div key={i} className="flex gap-2.5 items-start">
                            <Avatar initiales={c.initiales} role={c.role} size={32} />
                            <div className={`flex-grow rounded-r-xl rounded-bl-xl p-3 border ${
                              isMe 
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100/70 dark:border-emerald-900/20' 
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850'
                            }`}>
                              <div className="flex gap-2 items-center mb-1.5 flex-wrap">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200">{c.auteur}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${badgeCls}`}>{c.role}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-550 font-semibold">{c.heure}</span>
                              </div>
                              <div className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-medium">{c.text}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2.5 items-end border-t border-slate-100 dark:border-slate-850 pt-4">
                      <Avatar initiales="AM" role="agent" size={32} />
                      <textarea 
                        value={newComment} 
                        onChange={e => setNewComment(e.target.value)} 
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} 
                        placeholder="Message au Chef ou aux agents co-assignés... (Entrée pour envoyer)" 
                        rows={2}
                        className="flex-grow border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 resize-none outline-none bg-slate-50 dark:bg-slate-950 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 font-medium"
                      />
                      <Btn variant="primary" onClick={handleAddComment} className="h-[38px] px-4 rounded-xl">➤</Btn>
                    </div>
                  </>
                )
            )}

            {/* ═══ ACTIONS — PENDING ═══ */}
            {activeTab === 'actions' && isPending && (
              <div className="max-w-[560px]">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/30 rounded-xl p-4 mb-5 flex gap-3 items-start">
                  <span className="text-xl flex-shrink-0">⚡</span>
                  <div>
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">Mission en attente de votre décision</div>
                    <div className="text-xs text-amber-500 dark:text-amber-400/80 leading-relaxed font-medium">Acceptez pour démarrer — la messagerie et l'upload photo seront débloqués. Un refus exige un motif détaillé.</div>
                  </div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 rounded-xl p-5 mb-3.5">
                  <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mb-1">✅ Accepter la mission</div>
                  <div className="text-xs text-emerald-500 dark:text-emerald-450/80 mb-3.5 leading-relaxed font-semibold">La mission passe en "En cours" et apparaît sur le Kanban. Messagerie et photo de preuve débloquées.</div>
                  <Btn variant="primary" onClick={handleAccept} disabled={accepting} className="w-full justify-center py-3 rounded-xl">
                    {accepting ? '⏳ Acceptation...' : '✓ Accepter et démarrer l\'intervention'}
                  </Btn>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/20 rounded-xl p-5">
                  <div className="text-xs font-black text-red-655 dark:text-red-400 mb-1">✕ Refuser la mission</div>
                  <div className="text-xs text-red-500 dark:text-red-400/80 mb-3.5 leading-relaxed font-semibold">Le refus sera transmis au Chef de Service. Un motif complet est obligatoire (min. 10 caractères).</div>
                  {!showMotifForm ? (
                    <Btn variant="danger" className="w-full justify-center py-3 rounded-xl" onClick={() => setShowMotifForm(true)}>✕ Déclarer un refus</Btn>
                  ) : (
                    <>
                      <textarea 
                        value={motif} 
                        onChange={e => { setMotif(e.target.value); setMotifError(''); }} 
                        placeholder="Raison précise du refus (ex: zone inaccessible, matériel insuffisant...)" 
                        className={`w-full border ${motifError ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-800'} rounded-xl p-3 text-xs resize-y min-h-[90px] mb-2 text-slate-800 dark:text-slate-100 outline-none bg-slate-50 dark:bg-slate-950 focus:ring-1 focus:ring-emerald-500/20 box-border leading-relaxed font-semibold`}
                      />
                      {motifError && (
                        <div className="mb-2.5 text-xs text-red-550 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 p-2.5 rounded-lg">
                          {motifError}
                        </div>
                      )}
                      <div className="flex gap-2.5">
                        <button 
                          onClick={() => { setShowMotifForm(false); setMotif(''); setMotifError(''); }} 
                          className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold cursor-pointer text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-700 dark:hover:text-slate-250 transition-colors"
                        >
                          Annuler
                        </button>
                        <Btn variant="danger" className="flex-1 justify-center py-2.5 rounded-xl" disabled={refusing} onClick={handleRefuse}>
                          {refusing ? '⏳...' : 'Confirmer le refus'}
                        </Btn>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ═══ ACTIONS — ACCEPTED ═══ */}
            {activeTab === 'actions' && !isPending && (
              <div className="max-w-[560px]">
                {!isClosed && (
                  <div className="mb-6">
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider mb-2.5">Changer le statut</div>
                    <div className="flex gap-2.5 flex-wrap items-center">
                      <select 
                        value={statusSel} 
                        onChange={e => setStatusSel(e.target.value as DeclarationStatus)} 
                        className="px-3.5 py-2 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 outline-none font-bold cursor-pointer focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="en_cours">En cours d'intervention</option>
                        <option value="resolue">{`Évaluée${!photoUploaded ? ' (photo preuve requise)' : ''}`}</option>
                      </select>
                      <Btn variant="primary" onClick={handleStatusChange}>Mettre à jour</Btn>
                    </div>
                    {statusFeedback && (
                      <div className={`mt-3 text-xs font-bold p-3 rounded-xl border ${
                        statusFeedback.startsWith('⚠') 
                          ? 'text-red-550 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/20' 
                          : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/20'
                      }`}>
                        {statusFeedback}
                      </div>
                    )}
                    <div className="mt-2.5 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">ℹ "Évaluée" exige une photo de preuve.</div>
                  </div>
                )}

                {isClosed && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 rounded-xl p-3.5 mb-6 text-xs font-black text-emerald-600 dark:text-emerald-450">
                    ✅ Mission {decl.statut === 'cloturee' ? 'clôturée' : 'évaluée'}.
                  </div>
                )}

                <SectionDivider label="Photo preuve d'intervention" />
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />

                {photoUploaded ? (
                  <div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-black mb-3">✅ Photo de preuve validée.</div>
                    {photoApresUrl && <div className="w-full max-w-[300px] h-[170px] rounded-xl overflow-hidden border border-emerald-500/30"><img src={photoApresUrl} alt="Preuve" className="w-full h-full object-cover" /></div>}
                    {!isClosed && (
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="mt-2.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-205 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-205 dark:border-slate-800 px-3 py-1.5 rounded-lg cursor-pointer font-bold transition-all"
                      >
                        Remplacer la photo
                      </button>
                    )}
                  </div>
                ) : uploading ? (
                  <div className="border-2 border-dashed border-emerald-500/40 rounded-xl p-8 text-center bg-emerald-50/10 dark:bg-emerald-950/10">
                    <Loader2 className="animate-spin mx-auto mb-2 text-emerald-500 block" size={26} />
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Téléversement...</div>
                  </div>
                ) : (
                  <label 
                    className="border-2 border-dashed border-slate-205 hover:border-emerald-500 dark:border-slate-800 dark:hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer text-slate-450 dark:text-slate-400 text-xs block bg-slate-50 dark:bg-slate-950 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/15 transition-all duration-200"
                  >
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    <div className="text-3xl mb-2">☁</div>
                    <div className="font-black text-slate-800 dark:text-slate-100">Importer une photo de preuve</div>
                    <div className="text-[10px] mt-1 text-slate-400 dark:text-slate-500 font-semibold">JPEG / PNG / WebP — Max. 10 Mo</div>
                  </label>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}