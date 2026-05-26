import React, { useState, useEffect } from 'react';
import type { Declaration, DeclarationStatus, Comment, HistoryEvent, AgentInfo } from '../../types/agent.types';
import { PriorityBadge, StatusPill, TypeBadge, Avatar, Btn, SectionDivider } from '../ui';
import { ROLE_CFG, HISTORY_CFG } from '../../styles/tokens';
import { toast } from 'react-hot-toast';
import { Loader2, X, Upload, MessageSquare, Clock, MapPin, Eye, FileText, Users } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const tok = () => localStorage.getItem('fmc_token') || '';
const hdr = () => ({ Authorization: `Bearer ${tok()}` });
const hjson = () => ({ ...hdr(), 'Content-Type': 'application/json' });

interface DetailPageProps {
  tacheId: string;
  onClose: () => void;
  onAccepted: () => void;
  onRejected: () => void;
}

type Tab = 'info' | 'comments' | 'history' | 'actions';

export default function AgentDeclarationDetail({
  tacheId, onClose, onAccepted, onRejected
}: DetailPageProps) {
  const [decl, setDecl] = useState<Declaration | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [newComment, setNewComment] = useState('');
  const [statusSel, setStatusSel] = useState<DeclarationStatus>('en_cours');
  const [motif, setMotif] = useState('');
  const [showMotif, setShowMotif] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [photoAvantUrl, setPhotoAvantUrl] = useState<string | null>(null);
  const [photoApresUrl, setPhotoApresUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [localHistory, setLocalHistory] = useState<HistoryEvent[]>([]);
  const [localAgents, setLocalAgents] = useState<AgentInfo[]>([]);

  const mapComments = (backendComments: any[]): Comment[] => {
    return (backendComments || []).map((c: any) => {
      const author = c.author || {};
      const firstName = author.first_name || '';
      const lastName = author.last_name || '';
      const name = `${firstName} ${lastName}`.trim() || 'Utilisateur';
      const init = firstName && lastName ? `${firstName[0]}${lastName[0]}` : firstName ? firstName.slice(0, 2) : 'UI';
      return {
        auteur: name,
        role: author.role || 'user',
        initiales: init.toUpperCase(),
        heure: c.created_at ? new Date(c.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : 'À l\'instant',
        text: c.content || '',
      };
    });
  };

  const mapHistory = (backendHistory: any[]): HistoryEvent[] => {
    return (backendHistory || []).map((h: any) => {
      const user = h.changed_by_user || {};
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Système';
      const statusMap: Record<string, string> = {
        soumise: 'Soumise',
        assignee_chef: 'Assignée au Chef',
        assignee_agent: 'Assignée à l\'Agent',
        en_cours: 'En cours',
        resolue: 'Résolue',
        cloturee: 'Clôturée',
        refusee_chef: 'Refusée par le Chef',
        refusee_agent: 'Refusée par l\'Agent',
      };
      const oldLbl = statusMap[h.old_status] || h.old_status || 'Inconnu';
      const newLbl = statusMap[h.new_status] || h.new_status || 'Inconnu';
      
      let color: 'green' | 'blue' | 'orange' | 'red' | 'gray' = 'blue';
      if (h.new_status === 'resolue') color = 'green';
      else if (h.new_status === 'en_cours') color = 'orange';
      else if (h.new_status === 'refusee_agent' || h.new_status === 'refusee_chef') color = 'red';
      else if (h.new_status === 'cloturee') color = 'gray';

      const actionText = h.raison ? ` — "${h.raison}"` : '';

      return {
        titre: `${name} a changé le statut de [${oldLbl}] à [${newLbl}]${actionText}`,
        heure: h.created_at ? new Date(h.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : 'À l\'instant',
        color,
      };
    });
  };

  const mapAgents = (data: any): AgentInfo[] => {
    const list: AgentInfo[] = [];
    
    // current assigned agent
    if (data.agent) {
      list.push({
        nom: `${data.agent.first_name || ''} ${data.agent.last_name || ''}`.trim() || 'Agent Assigné',
        dept: data.department?.name_fr || 'Votre Département',
      });
    } else {
      list.push({
        nom: 'Non Assigné',
        dept: data.department?.name_fr || 'Votre Département',
      });
    }

    // other co-assignments
    if (data.other_assignments && Array.isArray(data.other_assignments)) {
      data.other_assignments.forEach((oa: any) => {
        const name = oa.agent 
          ? `${oa.agent.first_name || ''} ${oa.agent.last_name || ''}`.trim() 
          : 'Non Assigné';
        list.push({
          nom: name,
          dept: oa.department?.name_fr || 'Autre Département',
        });
      });
    }

    return list;
  };

  useEffect(() => {
    const fetchDecl = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/agent/declarations/${tacheId}`, { headers: hdr() });
        if (!res.ok) {
           throw new Error();
        }
        
        const data = await res.json();
        
        // Find avant and intervention photos
        const beforePhoto = data.photos?.find((p: any) => p.photo_type === 'avant')?.url || data.photo_avant || null;
        const afterPhoto = data.photos?.find((p: any) => p.photo_type === 'intervention')?.url || null;
        
        setPhotoAvantUrl(beforePhoto);
        setPhotoApresUrl(afterPhoto);
        setPhotoUploaded(!!afterPhoto);

        const mapped: Declaration = {
             id: data.id,
             ref_citoyen: data.ref_citoyen || `#${data.id.slice(-4)}`,
             titre: data.title || data.titre,
             description: data.description,
             statut: data.status || data.statut,
             priorite: data.priority || data.priorite,
             type: data.category || data.type,
             dateAssignation: data.assigned_at ? new Date(data.assigned_at).toLocaleDateString('fr-FR') : '—',
             dateSubmission: data.created_at ? new Date(data.created_at).toLocaleDateString('fr-FR') : '—',
             arrondissement: data.address || 'Non spécifié',
             gps: data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : 'Non spécifié',
             photoSignalement: !!beforePhoto,
             photoPreuve: !!afterPhoto,
             citoyen: data.citizen ? {
               nom: `${data.citizen.first_name || ''} ${data.citizen.last_name || ''}`.trim() || 'Citoyen',
               email: data.citizen.email || 'Non renseigné',
               phone: data.citizen.phone || 'Non renseigné',
               initiales: data.citizen.first_name ? `${data.citizen.first_name[0]}${data.citizen.last_name?.[0] || ''}`.toUpperCase() : 'CI',
             } : { nom: 'Citoyen Anonyme', email: '—', phone: '—', initiales: 'CA' },
             agents: mapAgents(data),
             history: mapHistory(data.history),
             comments: mapComments(data.comments),
        };
        
        setDecl(mapped);
        setStatusSel(mapped.statut);
        setLocalComments(mapped.comments);
        setLocalHistory(mapped.history);
        setLocalAgents(mapped.agents);
        // Auto-focus the decision tab for pending missions
        if (mapped.statut === 'assignee_agent') setActiveTab('actions');
      } catch {
        toast.error('Impossible de charger les détails');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchDecl();
  }, [tacheId]);

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', padding: 40, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
           <Loader2 className="animate-spin text-emerald-600" size={36} style={{ marginBottom: 16 }} />
           <p style={{ fontWeight: 700, color: '#0F172A', fontSize: 15 }}>Chargement des détails de la mission...</p>
        </div>
      </div>
    );
  }

  if (!decl) return null;

  const isPending = decl.statut === 'assignee_agent';
  const isEditable = ['assignee_agent', 'en_cours'].includes(decl.statut);

  const onAccept = async () => {
    try {
      const res = await fetch(`${API}/agent/declarations/${decl.id}/accept`, { method: 'POST', headers: hjson() });
      if (!res.ok) throw new Error();
      toast.success('Mission acceptée');
      onAccepted();
    } catch {
      toast.error('Erreur lors de l\'acceptation');
    }
  };

  const onRefuse = async () => {
    if (!motif.trim()) { setFeedback('⚠ Motif de refus obligatoire.'); return; }
    try {
      const res = await fetch(`${API}/agent/declarations/${decl.id}/refuse`, { 
        method: 'POST', 
        headers: hjson(),
        body: JSON.stringify({ reason: motif })
      });
      if (!res.ok) throw new Error();
      toast.success('Mission refusée');
      onRejected();
    } catch {
      toast.error('Erreur lors du refus');
    }
  };

  const onStatusChange = async (status: DeclarationStatus) => {
    if (status === 'resolue' && !photoUploaded) {
      setFeedback('⚠ Uploadez une photo preuve avant de marquer comme résolu.');
      return;
    }
    
    if (status === 'cloturee') {
      try {
        const res = await fetch(`${API}/agent/declarations/${decl.id}/close`, {
          method: 'POST',
          headers: hjson(),
        });
        if (!res.ok) throw new Error();
        toast.success('Mission clôturée');
        setFeedback('✓ Mission clôturée avec succès.');
        onAccepted();
        return;
      } catch {
        toast.error('Erreur lors de la clôture');
        return;
      }
    }

    try {
      const res = await fetch(`${API}/agent/declarations/${decl.id}/resolve`, {
        method: 'POST',
        headers: hjson(),
        body: JSON.stringify({ rapport_interne: 'Changement de statut via panel détails' })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Statut mis à jour (Résolu)');
      setFeedback('✓ Statut mis à jour avec succès.');
      onAccepted(); // refresh parent
    } catch (err: any) {
      toast.error(err.message || 'Erreur de mise à jour');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`${API}/agent/declarations/${decl.id}/comments`, {
        method: 'POST',
        headers: hjson(),
        body: JSON.stringify({ content: newComment.trim(), channel: 'chef_agent' })
      });
      if (!res.ok) throw new Error();
      const newCommentData = await res.json();
      
      const mapped = mapComments([newCommentData])[0];
      setLocalComments(prev => [...prev, mapped]);
      setNewComment('');
      toast.success('Commentaire ajouté');
    } catch {
      toast.error('Erreur d\'envoi du commentaire');
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('photo', file);

    try {
      setFeedback('Téléversement de la photo de preuve...');
      const res = await fetch(`${API}/agent/declarations/${decl.id}/photo`, {
        method: 'POST',
        headers: hdr(),
        body: fd
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur lors du téléversement');
      }
      const data = await res.json();
      setPhotoApresUrl(data.url);
      setPhotoUploaded(true);
      setFeedback('✓ Photo de preuve téléversée avec succès. Vous pouvez maintenant résoudre.');
      toast.success('Photo de preuve enregistrée');
    } catch (err: any) {
      setFeedback(`⚠ ${err.message}`);
      toast.error(err.message || 'Erreur lors du téléversement');
    }
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode; locked?: boolean }[] = [
    { key: 'info',     label: 'Informations', icon: <FileText size={14} /> },
    { key: 'comments', label: isPending ? '🔒 Commentaires' : `Commentaires (${localComments.length})`, icon: <MessageSquare size={14} />, locked: isPending },
    { key: 'history',  label: 'Historique', icon: <Clock size={14} /> },
    ...(isEditable ? [{ key: 'actions' as Tab, label: isPending ? '⚡ Décision' : 'Statut & Actions', icon: <Upload size={14} /> }] : []),
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#F8FAFC', width: '100%', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto', borderRadius: 20, position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0' }}>
        
        {/* Close Button */}
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: '50%', background: '#fff', border: '1px solid #E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <X size={18} color="#64748B" />
        </button>

        <div style={{ padding: 30 }}>
          {/* ─── Header card ─── */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '24px 28px', marginBottom: 20, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#94A3B8', fontWeight: 600, background: '#F1F5F9', padding: '2px 8px', borderRadius: 6 }}>
                    {decl.ref_citoyen}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                    Assigné le {decl.dateAssignation}
                  </span>
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px', marginBottom: 12, lineHeight: 1.35 }}>
                  {decl.titre}
                </h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <PriorityBadge p={decl.priorite} />
                  <TypeBadge t={decl.type} />
                  <StatusPill s={decl.statut} />
                </div>
              </div>
              
              {/* Quick actions for pending */}
              {isPending && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Btn variant="danger" onClick={() => { setShowMotif(true); setActiveTab('actions'); }}>✕ Refuser</Btn>
                  <Btn variant="primary" onClick={() => onAccept()}>✓ Accepter la mission</Btn>
                </div>
              )}
            </div>
          </div>

          {/* ─── Tab strip ─── */}
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', border: '1px solid #E2E8F0', borderBottom: 'none' }}>
            <div style={{ display: 'flex', padding: '0 12px' }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => { if (!t.locked) setActiveTab(t.key); }} style={{
                  padding: '16px 20px', fontSize: 13, cursor: t.locked ? 'not-allowed' : 'pointer',
                  border: 'none', background: 'none', fontFamily: 'inherit',
                  color: t.locked ? '#CBD5E1' : activeTab === t.key ? '#10B981' : '#64748B',
                  fontWeight: activeTab === t.key ? 700 : 500,
                  borderBottom: activeTab === t.key ? '3px solid #10B981' : '3px solid transparent',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: t.locked ? 0.5 : 1,
                }}>
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Tab content ─── */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0 0 16px 16px', padding: '28px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.02)' }}>

            {/* INFO TAB */}
            {activeTab === 'info' && (
              <div>
                {/* Images row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  {/* Photo Signalement */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Photo du signalement</div>
                    {photoAvantUrl ? (
                      <div style={{ width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                        <img src={photoAvantUrl} alt="Signalement" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: 180, borderRadius: 12, background: '#F8FAFC', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12 }}>
                        Aucune photo fournie par le citoyen
                      </div>
                    )}
                  </div>
                  {/* Photo Intervention */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Preuve d'intervention</div>
                    {photoApresUrl ? (
                      <div style={{ width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                        <img src={photoApresUrl} alt="Intervention" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: 180, borderRadius: 12, background: '#F8FAFC', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12 }}>
                        Pas encore de photo de preuve soumise
                      </div>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                  {[
                    ['Arrondissement',   decl.arrondissement],
                    ['Date de soumission', decl.dateSubmission],
                    ['Coordonnées GPS',  decl.gps],
                    ["Date d'assignation", decl.dateAssignation],
                  ].map(([label, val]) => (
                    <div key={label} style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 10, border: '1px solid #F1F5F9' }}>
                      <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontWeight: 700 }}>{label}</div>
                      <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 600, fontFamily: label === 'Coordonnées GPS' ? "'JetBrains Mono', monospace" : 'inherit' }}>{val}</div>
                    </div>
                  ))}
                  <div style={{ gridColumn: '1 / -1', background: '#F8FAFC', padding: '16px', borderRadius: 10, border: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontWeight: 700 }}>Description du citoyen</div>
                    <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, fontWeight: 500 }}>{decl.description}</div>
                  </div>
                </div>

                {/* Citizen */}
                <SectionDivider label="Citoyen déclarant" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#F8FAFC', borderRadius: 12, padding: '14px 18px', marginBottom: 24, border: '1px solid #F1F5F9' }}>
                  <Avatar initiales={decl.citoyen.initiales} role="citizen" size={44} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{decl.citoyen.nom}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap', fontWeight: 500 }}>
                      <span>✉ {decl.citoyen.email}</span>
                      <span>📞 {decl.citoyen.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Agents */}
                <SectionDivider label="Coordination & Agents affectés" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {localAgents.map((a, i) => (
                    <span key={i} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      color: '#065F46',
                      boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.02)'
                    }}>
                      <Users size={14} />
                      {a.nom} <span style={{ opacity: 0.6, fontSize: 10 }}>({a.dept})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* COMMENTS TAB */}
            {activeTab === 'comments' && (
              <div>
                {isPending ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94A3B8' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Canal de communication verrouillé</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>Acceptez la mission pour débloquer la messagerie interne avec votre Chef de Service.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                      {localComments.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8', fontSize: 13, fontWeight: 500 }}>
                          Aucun commentaire interne pour l'instant sur ce canal agent-chef.
                        </div>
                      )}
                      {localComments.map((c, i) => {
                        const roleCfg = ROLE_CFG[c.role] ?? ROLE_CFG.agent;
                        const isMe = c.role === 'agent';
                        return (
                          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <Avatar initiales={c.initiales} role={c.role} size={34} />
                            <div style={{ flex: 1, background: isMe ? '#ECFDF5' : '#F8FAFC', borderRadius: '0 12px 12px 12px', padding: '12px 16px', border: isMe ? '1px solid #D1FAE5' : '1px solid #F1F5F9' }}>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{c.auteur}</span>
                                <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, background: roleCfg.bg, color: roleCfg.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.role}</span>
                                <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{c.heure}</span>
                              </div>
                              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.55, fontWeight: 500 }}>{c.text}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: 20 }}>
                      <Avatar initiales="AM" role="agent" size={34} />
                      <textarea value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} placeholder="Envoyer un message au chef de service ou autres agents..." rows={2} style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px', fontSize: 13, fontFamily: 'inherit', color: '#0F172A', resize: 'none', minHeight: 46, outline: 'none', fontWeight: 500 }} />
                      <Btn variant="primary" onClick={handleAddComment} style={{ height: 46, padding: '0 18px', borderRadius: 10 }}>➤</Btn>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {localHistory.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8', fontSize: 13 }}>
                    Aucun historique d'état enregistré.
                  </div>
                )}
                {localHistory.map((h, i) => {
                  const cfg = HISTORY_CFG[h.color];
                  const isLast = i === localHistory.length - 1;
                  return (
                    <li key={i} style={{ display: 'flex', gap: 16, paddingBottom: isLast ? 0 : 26, position: 'relative' }}>
                      {!isLast && (
                        <div style={{ position: 'absolute', left: 16, top: 32, width: 2, height: 'calc(100% - 12px)', background: '#F1F5F9' }} />
                      )}
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: cfg?.bg || '#F1F5F9', color: cfg?.color || '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                        boxShadow: '0 2px 4px 0 rgb(0 0 0 / 0.02)',
                        border: '1px solid #F1F5F9'
                      }}>
                        ●
                      </div>
                      <div style={{ paddingTop: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', lineHeight: 1.4 }}>{h.titre}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: 500 }}>{h.heure}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* ACTIONS TAB — Pending: show Accept/Reject decision panel */}
            {activeTab === 'actions' && isPending && (
              <div style={{ maxWidth: 580 }}>
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '18px 22px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 22 }}>⚡</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#92400E', marginBottom: 4 }}>Mission en attente de votre décision</div>
                    <div style={{ fontSize: 12, color: '#A16207', fontWeight: 500 }}>Vous avez été assigné à ce dossier. Acceptez pour démarrer l'intervention ou refusez avec un motif justifié.</div>
                  </div>
                </div>

                {/* ACCEPT */}
                <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#065F46', marginBottom: 6 }}>✅ Accepter la mission</div>
                  <div style={{ fontSize: 12, color: '#047857', fontWeight: 500, marginBottom: 14 }}>La mission passera en "En cours" et apparaîtra sur le Kanban. La messagerie interne sera débloquée.</div>
                  <Btn variant="primary" onClick={onAccept} style={{ width: '100%', justifyContent: 'center', padding: '13px' }}>
                    ✓ Accepter et démarrer l'intervention
                  </Btn>
                </div>

                {/* REJECT */}
                <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 14, padding: '20px 24px' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#C53030', marginBottom: 6 }}>✕ Refuser la mission</div>
                  <div style={{ fontSize: 12, color: '#E53E3E', fontWeight: 500, marginBottom: 14 }}>Le refus sera transmis à votre Chef de Service. Un motif complet est obligatoire.</div>
                  {!showMotif ? (
                    <Btn variant="danger" style={{ width: '100%', justifyContent: 'center', padding: '13px' }} onClick={() => setShowMotif(true)}>
                      ✕ Déclarer un refus d'affectation
                    </Btn>
                  ) : (
                    <>
                      <textarea
                        value={motif}
                        onChange={e => setMotif(e.target.value)}
                        placeholder="Ex : Matériel manquant, zone inaccessible, compétence hors voirie..."
                        style={{ width: '100%', border: '1px solid #FEB2B2', borderRadius: 10, padding: '12px 14px', fontSize: 13, fontFamily: 'inherit', resize: 'none', minHeight: 88, marginBottom: 12, color: '#2D3748', outline: 'none', fontWeight: 500, background: '#fff', boxSizing: 'border-box' }}
                      />
                      {feedback && <div style={{ marginBottom: 10, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{feedback}</div>}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => { setShowMotif(false); setMotif(''); setFeedback(''); }} style={{ flex: 1, padding: '10px', border: '1px solid #E2E8F0', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Annuler</button>
                        <Btn variant="danger" style={{ flex: 1, justifyContent: 'center', background: '#E53E3E', padding: '10px' }} onClick={onRefuse}>Confirmer le refus</Btn>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ACTIONS TAB — Accepted: status change + photo upload */}
            {activeTab === 'actions' && !isPending && (
              <div style={{ maxWidth: 580 }}>
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Changer le statut de la mission</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select value={statusSel} onChange={e => setStatusSel(e.target.value as DeclarationStatus)} style={{ padding: '10px 16px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0F172A', background: '#fff', outline: 'none', fontWeight: 600, cursor: 'pointer' }}>
                      <option value="en_cours">En cours d'intervention</option>
                      <option value="resolue">{`Évaluée / Résolue${!photoUploaded ? ' (photo requise)' : ''}`}</option>
                    </select>
                    <Btn variant="primary" onClick={() => onStatusChange(statusSel)}>Mettre à jour</Btn>
                  </div>
                  {feedback && <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: feedback.startsWith('⚠') ? '#DC2626' : '#059669', padding: '10px 14px', borderRadius: 10, background: feedback.startsWith('⚠') ? '#FEF2F2' : '#ECFDF5', border: feedback.startsWith('⚠') ? '1px solid #FEE2E2' : '1px solid #D1FAE5' }}>{feedback}</div>}
                  <div style={{ marginTop: 10, fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>ℹ Marquer comme "Évaluée / Résolue" exige une photo de preuve.</div>
                </div>

                <SectionDivider label="Photo preuve d'intervention" />
                {photoUploaded ? (
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ padding: '12px 16px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, color: '#065F46', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, marginBottom: 12 }}>✅ Photo de preuve validée et enregistrée.</div>
                    {photoApresUrl && <div style={{ width: '100%', maxWidth: 280, height: 160, borderRadius: 12, overflow: 'hidden', border: '1px solid #E2E8F0' }}><img src={photoApresUrl} alt="Preuve" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                  </div>
                ) : (
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ border: '2px dashed #CBD5E1', borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer', color: '#64748B', fontSize: 13, display: 'block', transition: 'all 0.2s', background: '#F8FAFC' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.background = '#ECFDF5'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}>
                      <input type="file" accept="image/*" onChange={handlePhotoFileChange} style={{ display: 'none' }} />
                      <div style={{ fontSize: 32, marginBottom: 10 }}>☁</div>
                      <div style={{ fontWeight: 700, color: '#334155' }}>Importer une photo de preuve</div>
                      <div style={{ fontSize: 11, marginTop: 6, color: '#94A3B8', fontWeight: 500 }}>JPEG / PNG / WebP — Max. 10 Mo</div>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}