import React, { useState, useEffect } from 'react';
import AgentLayout from '../../layouts/AgentLayout';
import AgentDeclarationDetail from './AgentDeclarationDetail';
import type { Declaration, DeclarationStatus } from '../../types/agent.types';
import { PriorityBadge, StatusPill, TypeBadge, StatCard, Btn } from '../ui';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
const tok = () => localStorage.getItem('fmc_token') || '';
const hdr = () => ({ Authorization: `Bearer ${tok()}` });
const hjson = () => ({ ...hdr(), 'Content-Type': 'application/json' });

const FILTERS: { key: 'all' | DeclarationStatus; label: string }[] = [
  { key: 'all',            label: 'Toutes' },
  { key: 'assignee_agent', label: 'En attente' },
  { key: 'en_cours',       label: 'En cours' },
  { key: 'resolue',        label: 'Résolues' },
  { key: 'refusee_agent',  label: 'Rejetées' },
];

export default function AgentDashboard() {
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | DeclarationStatus>('all');
  const [selectedDecl, setSelectedDecl] = useState<string | null>(null);
  const [stats, setStats] = useState({ pending: 0, active: 0, resolved: 0, refused: 0, total: 0, successRate: 0 });

  const fetchDecls = async () => {
    try {
      setLoading(true);
      const [resDecls, resStats] = await Promise.all([
        fetch(`${API}/agent/declarations`, { headers: hdr() }),
        fetch(`${API}/agent/stats`, { headers: hdr() })
      ]);
      
      if (!resDecls.ok || !resStats.ok) throw new Error();
      
      const dataDecls = await resDecls.json();
      const dataStats = await resStats.json();
      
      setDeclarations(dataDecls.declarations || (Array.isArray(dataDecls) ? dataDecls : []));
      setStats(dataStats);
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
  const filtered = filter === 'all' ? safeDeclarations : safeDeclarations.filter(d => d.statut === filter || (d as any).status === filter);

  const statsCards = [
    { label: 'Total reçues',  value: stats.total,       sub: 'toutes missions confondues' },
    { label: 'En attente',    value: stats.pending,     sub: 'nouvelles assignations' },
    { label: 'En cours',      value: stats.active,      sub: 'interventions actives' },
    { label: 'Résolues (Taux)', value: `${stats.resolved} (${stats.successRate}%)`, sub: 'missions terminées' },
  ];

  const onQuickAccept = async (id: string) => {
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/accept`, {
        method: 'POST',
        headers: hjson(),
      });
      if (!res.ok) throw new Error();
      toast.success('Mission acceptée');
      fetchDecls();
    } catch {
      toast.error("Erreur lors de l'acceptation");
    }
  };

  const onQuickRefuse = async (id: string) => {
    try {
      const res = await fetch(`${API}/agent/declarations/${id}/refuse`, {
        method: 'POST',
        headers: hjson(),
        body: JSON.stringify({ reason: 'Refus rapide depuis le dashboard' })
      });
      if (!res.ok) throw new Error();
      toast.success('Mission refusée');
      fetchDecls();
    } catch {
      toast.error("Erreur lors du refus");
    }
  };

  return (
    <AgentLayout>
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 24 }}>Tableau de Bord</h1>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {statsCards.map(s => <StatCard key={s.label} label={s.label} value={s.value} sub={s.sub} />)}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {FILTERS.map(f => {
            const count = safeDeclarations.filter(d => d.statut === f.key || (d as any).status === f.key).length;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12,
                border: filter === f.key ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                background: filter === f.key ? '#F0FDF4' : '#fff',
                color: filter === f.key ? '#15803D' : '#64748B',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: filter === f.key ? 600 : 400,
                transition: 'all 0.12s',
              }}>
                {f.label}
                {f.key !== 'all' && (
                  <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.7 }}>
                    ({count})
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #F1F5F9', overflow: 'hidden' }}>
          {loading ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#94A3B8' }}>
               <Loader2 size={32} className="animate-spin mb-4 text-emerald-600" />
               <p style={{ fontSize: 13, fontWeight: 600 }}>Chargement des données...</p>
             </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Titre / Réf.', 'Description', 'Priorité', 'Type', 'Date assignation', 'État', 'Actions'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '11px 16px',
                      fontSize: 10, color: '#94A3B8', textTransform: 'uppercase',
                      letterSpacing: '0.05em', fontWeight: 600,
                      borderBottom: '1px solid #F1F5F9',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8', fontSize: 13 }}>
                      Aucune déclaration pour ce filtre
                    </td>
                  </tr>
                )}
                {filtered.map((d, i) => (
                  <TableRow
                    key={d.id}
                    decl={d}
                    isLast={i === filtered.length - 1}
                    onView={() => setSelectedDecl(d.id)}
                    onAccept={() => onQuickAccept(d.id)}
                    onRefuse={() => onQuickRefuse(d.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
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

// ─── Table Row ────────────────────────────────────────────────────────────────
interface RowProps {
  decl: any;
  isLast: boolean;
  onView: () => void;
  onAccept: () => void;
  onRefuse: () => void;
}
function TableRow({ decl, isLast, onView, onAccept, onRefuse }: RowProps) {
  const [hover, setHover] = useState(false);
  const status = decl.statut || decl.status;
  const isPending = status === 'assignee_agent';
  const border = isLast ? 'none' : '1px solid #F8FAFC';

  return (
    <tr
      onClick={onView}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: hover ? '#FAFAFA' : '#fff', cursor: 'pointer', transition: 'background 0.1s' }}
    >
      <td style={{ padding: '13px 16px', borderBottom: border }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 3 }}>{decl.titre || decl.title}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#CBD5E1' }}>{decl.ref_citoyen || `#${decl.id.slice(-4)}`}</div>
      </td>
      <td style={{ padding: '13px 16px', borderBottom: border, maxWidth: 200 }}>
        <div style={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {decl.description || 'Aucune description'}
        </div>
      </td>
      <td style={{ padding: '13px 16px', borderBottom: border }}>
        <PriorityBadge p={decl.priorite || decl.priority} />
      </td>
      <td style={{ padding: '13px 16px', borderBottom: border }}>
        <TypeBadge t={decl.type || decl.category} />
      </td>
      <td style={{ padding: '13px 16px', borderBottom: border, fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>
        {decl.dateAssignation || (decl.assigned_at ? new Date(decl.assigned_at).toLocaleDateString('fr-FR') : '—')}
      </td>
      <td style={{ padding: '13px 16px', borderBottom: border }}>
        <StatusPill s={status} />
      </td>
      <td style={{ padding: '13px 16px', borderBottom: border }} onClick={e => e.stopPropagation()}>
        {isPending ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="primary" size="sm" onClick={onAccept}>✓ Accepter</Btn>
            <Btn variant="danger" size="sm" onClick={onRefuse}>✕ Refuser</Btn>
          </div>
        ) : (
          <Btn variant="outline" size="sm" onClick={onView}>Détails →</Btn>
        )}
      </td>
    </tr>
  );
}