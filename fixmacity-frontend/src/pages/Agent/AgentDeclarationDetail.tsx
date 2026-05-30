import React, { useState, useEffect, useRef } from 'react';
import type { Declaration, DeclarationStatus, Comment, HistoryEvent, AgentInfo } from '../../types/agent.types';
import { PriorityBadge, StatusPill, TypeBadge, Avatar, Btn, SectionDivider } from '../ui';
import { ROLE_CFG } from '../../styles/tokens';
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

// ─── Status progression config (Dark theme optimized) ────────────────────────
const STATUS_STEPS = [
  { key: 'soumise', label: 'Soumise', color: '#F59E0B', bg: '#F59E0B20' },
  { key: 'assignee_chef', label: 'Chef assigné', color: '#8B5CF6', bg: '#8B5CF620' },
  { key: 'assignee_agent', label: 'Assignée', color: '#3B82F6', bg: '#3B82F620' },
  { key: 'en_cours', label: 'En cours', color: '#F97316', bg: '#F9731620' },
  { key: 'resolue', label: 'Évaluée', color: '#10B981', bg: '#10B98120' },
  { key: 'cloturee', label: 'Clôturée', color: '#64748B', bg: '#64748B20' },
];

const REFUSED_STATUSES = ['refusee_chef', 'refusee_agent'];

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

// ─── Status stepper (Dark theme optimized) ───────────────────────────────────
function StatusStepper({ current }: { current: string }) {
  const isRefused = REFUSED_STATUSES.includes(current);
  const activeIdx = STATUS_STEPS.findIndex(s => s.key === current);

  if (isRefused) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12 }}>
        <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>Mission refusée</div>
          <div style={{ fontSize: 11, color: '#F87171', marginTop: 2 }}>
            {current === 'refusee_agent' ? 'Refus transmis au Chef de Service.' : 'Refus validé par le Chef de Service.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
      {STATUS_STEPS.map((step, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 64 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: done ? '#10B981' : active ? step.bg : '#090d16',
                border: `2px solid ${done ? '#10B981' : active ? step.color : '#1e293b'}`,
                transition: 'all 0.2s',
              }}>
                {done
                  ? <CheckCircle2 size={14} color="#fff" />
                  : <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? step.color : '#475569', display: 'block' }} />
                }
              </div>
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: done ? '#10B981' : active ? '#f8fafc' : '#64748B', textAlign: 'center', lineHeight: 1.3, maxWidth: 56 }}>
                {step.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#10B981' : '#1e293b', marginBottom: 14, transition: 'background 0.2s', minWidth: 8 }} />
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
    <div style={{ textAlign: 'center', padding: '52px 24px', color: '#94A3B8' }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#090d16', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <Lock size={20} color="#475569" />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>Canal verrouillé</div>
      <div style={{ fontSize: 12, fontWeight: 500, maxWidth: 320, margin: '0 auto', lineHeight: 1.65, color: '#94a3b8' }}>{message}</div>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#090d16', border: '1px solid #1e293b', padding: 40, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}>
        <Loader2 className="animate-spin text-emerald-500" size={36} style={{ marginBottom: 16 }} />
        <p style={{ fontWeight: 700, color: '#f8fafc', fontSize: 15 }}>Chargement de la mission...</p>
      </div>
    </div>
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
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#090d16', width: '100%', maxWidth: 940, borderRadius: 20, position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid #1e293b', margin: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, width: 34, height: 34, borderRadius: '50%', background: '#131c31', border: '1px solid #1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 2px 8px rgb(0 0 0 / 0.3)' }}>
          <X size={16} color="#94a3b8" />
        </button>

        <div style={{ padding: '26px 28px', maxHeight: '90vh', overflowY: 'auto' }}>

          {/* ── Header ── */}
          <div style={{ background: '#101726', borderRadius: 16, border: '1px solid #1e293b', padding: '20px 24px', marginBottom: 18, boxShadow: '0 2px 6px rgb(0 0 0 / 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <code style={{ fontSize: 11, color: '#94A3B8', background: '#090d16', padding: '2px 8px', borderRadius: 5, border: '1px solid #1e293b' }}>{decl.ref_citoyen}</code>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>· Assigné le {decl.dateAssignation}</span>
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.3px', marginBottom: 10, lineHeight: 1.3 }}>{decl.titre}</h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <PriorityBadge p={decl.priorite} />
                  <TypeBadge t={decl.type} />
                  <StatusPill s={decl.statut} />
                </div>
              </div>
              {isPending && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Btn variant="danger" onClick={() => { setShowMotifForm(true); setActiveTab('actions'); }}>✕ Refuser</Btn>
                  <Btn variant="primary" onClick={handleAccept} disabled={accepting}>{accepting ? '...' : '✓ Accepter'}</Btn>
                </div>
              )}
            </div>

            {/* ── STATUS STEPPER (current state, always visible) ── */}
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
              <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 12 }}>
                Progression de la mission
              </div>
              <StatusStepper current={decl.statut} />
            </div>
          </div>

          {/* ── Tabs strip ── */}
          <div style={{ background: '#101726', borderRadius: '14px 14px 0 0', border: '1px solid #1e293b', borderBottom: 'none' }}>
            <div style={{ display: 'flex', padding: '0 6px', overflowX: 'auto' }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => { if (!t.locked) setActiveTab(t.key); }} title={t.locked ? 'Acceptez la mission pour déverrouiller' : undefined}
                  style={{ padding: '13px 16px', fontSize: 13, cursor: t.locked ? 'not-allowed' : 'pointer', border: 'none', background: 'none', fontFamily: 'inherit', color: t.locked ? '#475569' : activeTab === t.key ? '#34d399' : '#94a3b8', fontWeight: activeTab === t.key ? 700 : 500, borderBottom: activeTab === t.key ? '3px solid #34d399' : '3px solid transparent', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 7, opacity: t.locked ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab content ── */}
          <div style={{ background: '#101726', border: '1px solid #1e293b', borderRadius: '0 0 14px 14px', padding: '24px 26px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>

            {/* ═══ INFO TAB — now shows CURRENT STATE, not just static details ═══ */}
            {activeTab === 'info' && (
              <div>
                {/* Photo pair */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>📷 Photo du signalement (citoyen)</div>
                    {photoAvantUrl
                      ? <div style={{ width: '100%', height: 170, borderRadius: 10, overflow: 'hidden', border: '1px solid #1e293b' }}><img src={photoAvantUrl} alt="Signalement" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                      : <div style={{ width: '100%', height: 170, borderRadius: 10, background: '#090d16', border: '1.5px dashed #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 12, gap: 8 }}><span style={{ fontSize: 26 }}>📷</span>Aucune photo du citoyen</div>
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      🔍 Preuve d'intervention{isLocked ? ' 🔒' : ''}
                    </div>
                    {photoApresUrl
                      ? <div style={{ width: '100%', height: 170, borderRadius: 10, overflow: 'hidden', border: '1.5px solid #10B981' }}><img src={photoApresUrl} alt="Preuve" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                      : <div style={{ width: '100%', height: 170, borderRadius: 10, background: '#090d16', border: `1.5px dashed #334155`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 12, gap: 6 }}>
                        {isLocked ? <Lock size={22} color="#475569" /> : <span style={{ fontSize: 26 }}>☁</span>}
                        {isLocked ? 'Disponible après acceptation' : 'Pas encore de photo de preuve'}
                      </div>
                    }
                  </div>
                </div>

                {/* Current status info-cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                  <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={10} /> Arrondissement
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>{decl.arrondissement}</div>
                  </div>
                  <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={10} /> Soumis le
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>{decl.dateSubmission}</div>
                  </div>
                  <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={10} /> Assigné le
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>{decl.dateAssignation}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1', background: '#090d16', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>📍 GPS</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', fontFamily: 'monospace' }}>{decl.gps}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1', background: '#090d16', border: '1px solid #1e293b', borderRadius: 10, padding: '14px' }}>
                    <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>📝 Description</div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.65, fontWeight: 500 }}>{decl.description || 'Aucune description fournie.'}</div>
                  </div>
                </div>

                {/* Citizen */}
                <SectionDivider label="Citoyen déclarant" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#090d16', borderRadius: 12, padding: '14px 18px', marginBottom: 20, border: '1px solid #1e293b' }}>
                  <Avatar initiales={decl.citoyen.initiales} role="citizen" size={42} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{decl.citoyen.nom}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap', fontWeight: 500 }}>
                      <span>✉ {decl.citoyen.email}</span>
                      <span>📞 {decl.citoyen.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Agents */}
                <SectionDivider label="Agents affectés" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {localAgents.map((a, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'rgba(6, 95, 70, 0.2)', border: '1px solid rgba(6, 95, 70, 0.8)', color: '#34D399' }}>
                      <Users size={12} />{a.nom}<span style={{ opacity: 0.6, fontSize: 10 }}>({a.dept})</span>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18, maxHeight: 360, overflowY: 'auto' }}>
                      {localComments.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: 13 }}>Aucun commentaire pour l'instant. Commencez la discussion.</div>
                      )}
                      {localComments.map((c, i) => {
                        const rc = ROLE_CFG[c.role] ?? ROLE_CFG.agent;
                        return (
                          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <Avatar initiales={c.initiales} role={c.role} size={32} />
                            <div style={{ flex: 1, background: c.role === 'agent' ? 'rgba(6, 95, 70, 0.15)' : '#090d16', borderRadius: '0 10px 10px 10px', padding: '10px 14px', border: c.role === 'agent' ? '1px solid rgba(6, 95, 70, 0.6)' : '1px solid #1e293b' }}>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{c.auteur}</span>
                                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: rc.bg, color: rc.color, fontWeight: 700, textTransform: 'uppercase' }}>{c.role}</span>
                                <span style={{ fontSize: 11, color: '#64748b' }}>{c.heure}</span>
                              </div>
                              <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.55 }}>{c.text}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', borderTop: '1px solid #1e293b', paddingTop: 16 }}>
                      <Avatar initiales="AM" role="agent" size={32} />
                      <textarea value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} placeholder="Message au Chef ou aux agents co-assignés... (Entrée pour envoyer)" rows={2}
                        style={{ flex: 1, border: '1px solid #1e293b', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', color: '#f8fafc', resize: 'none', outline: 'none', background: '#090d16' }} />
                      <Btn variant="primary" onClick={handleAddComment} style={{ height: 42, padding: '0 16px', borderRadius: 10 }}>➤</Btn>
                    </div>
                  </>
                )
            )}


            {/* ═══ ACTIONS — PENDING ═══ */}
            {activeTab === 'actions' && isPending && (
              <div style={{ maxWidth: 560 }}>
                <div style={{ background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>⚡</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#FBBF24', marginBottom: 3 }}>Mission en attente de votre décision</div>
                    <div style={{ fontSize: 12, color: '#F59E0B', lineHeight: 1.6 }}>Acceptez pour démarrer — la messagerie et l'upload photo seront débloqués. Un refus exige un motif détaillé.</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#34D399', marginBottom: 4 }}>✅ Accepter la mission</div>
                  <div style={{ fontSize: 12, color: '#a7f3d0', marginBottom: 14, lineHeight: 1.6 }}>La mission passe en "En cours" et apparaît sur le Kanban. Messagerie et photo de preuve débloquées.</div>
                  <Btn variant="primary" onClick={handleAccept} disabled={accepting} style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: 10 }}>
                    {accepting ? '⏳ Acceptation...' : '✓ Accepter et démarrer l\'intervention'}
                  </Btn>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: '18px 20px' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#fca5a5', marginBottom: 4 }}>✕ Refuser la mission</div>
                  <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 14, lineHeight: 1.6 }}>Le refus sera transmis au Chef de Service. Un motif complet est obligatoire (min. 10 caractères).</div>
                  {!showMotifForm
                    ? <Btn variant="danger" style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: 10 }} onClick={() => setShowMotifForm(true)}>✕ Déclarer un refus</Btn>
                    : <>
                      <textarea value={motif} onChange={e => { setMotif(e.target.value); setMotifError(''); }} placeholder="Raison précise du refus (ex: zone inaccessible, matériel insuffisant...)" style={{ width: '100%', border: `1px solid ${motifError ? '#EF4444' : '#1e293b'}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', minHeight: 90, marginBottom: 8, color: '#f8fafc', outline: 'none', background: '#090d16', boxSizing: 'border-box', lineHeight: 1.6 }} />
                      {motifError && <div style={{ marginBottom: 10, fontSize: 12, color: '#F87171', fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '7px 12px', borderRadius: 8 }}>{motifError}</div>}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => { setShowMotifForm(false); setMotif(''); setMotifError(''); }} style={{ flex: 1, padding: '10px', border: '1px solid #1e293b', borderRadius: 10, background: '#090d16', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#94a3b8', fontFamily: 'inherit' }}>Annuler</button>
                        <Btn variant="danger" style={{ flex: 1, justifyContent: 'center', padding: '10px', borderRadius: 10 }} disabled={refusing} onClick={handleRefuse}>
                          {refusing ? '⏳...' : 'Confirmer le refus'}
                        </Btn>
                      </div>
                    </>
                  }
                </div>
              </div>
            )}

            {/* ═══ ACTIONS — ACCEPTED ═══ */}
            {activeTab === 'actions' && !isPending && (
              <div style={{ maxWidth: 560 }}>
                {!isClosed && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Changer le statut</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <select value={statusSel} onChange={e => setStatusSel(e.target.value as DeclarationStatus)} style={{ padding: '9px 14px', border: '1px solid #1e293b', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#f8fafc', background: '#090d16', outline: 'none', fontWeight: 600, cursor: 'pointer' }}>
                        <option value="en_cours">En cours d'intervention</option>
                        <option value="resolue">{`Évaluée${!photoUploaded ? ' (photo preuve requise)' : ''}`}</option>
                      </select>
                      <Btn variant="primary" onClick={handleStatusChange}>Mettre à jour</Btn>
                    </div>
                    {statusFeedback && <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: statusFeedback.startsWith('⚠') ? '#F87171' : '#34D399', padding: '10px 14px', borderRadius: 10, background: statusFeedback.startsWith('⚠') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', border: statusFeedback.startsWith('⚠') ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)' }}>{statusFeedback}</div>}
                    <div style={{ marginTop: 8, fontSize: 11, color: '#94A3B8' }}>ℹ "Évaluée" exige une photo de preuve.</div>
                  </div>
                )}

                {isClosed && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, fontSize: 13, fontWeight: 600, color: '#34D399' }}>
                    ✅ Mission {decl.statut === 'cloturee' ? 'clôturée' : 'évaluée'}.
                  </div>
                )}

                <SectionDivider label="Photo preuve d'intervention" />
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />

                {photoUploaded ? (
                  <div>
                    <div style={{ padding: '11px 15px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 10, color: '#34D399', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>✅ Photo de preuve validée.</div>
                    {photoApresUrl && <div style={{ width: '100%', maxWidth: 300, height: 170, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(16, 185, 129, 0.5)' }}><img src={photoApresUrl} alt="Preuve" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                    {!isClosed && <button onClick={() => fileInputRef.current?.click()} style={{ marginTop: 10, fontSize: 12, color: '#94a3b8', background: 'none', border: '1px solid #1e293b', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Remplacer la photo</button>}
                  </div>
                ) : uploading ? (
                  <div style={{ border: '2px dashed rgba(16, 185, 129, 0.5)', borderRadius: 12, padding: 32, textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)' }}>
                    <Loader2 className="animate-spin" size={26} style={{ margin: '0 auto 8px', color: '#10B981', display: 'block' }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#34D399' }}>Téléversement...</div>
                  </div>
                ) : (
                  <label style={{ border: '2px dashed #334155', borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer', color: '#cbd5e1', fontSize: 13, display: 'block', background: '#090d16', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#090d16'; }}>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    <div style={{ fontSize: 30, marginBottom: 8 }}>☁</div>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>Importer une photo de preuve</div>
                    <div style={{ fontSize: 11, marginTop: 5, color: '#64748b' }}>JPEG / PNG / WebP — Max. 10 Mo</div>
                  </label>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}