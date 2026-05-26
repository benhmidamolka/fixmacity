import React from 'react';

// ─── Priority Badge ────────────────────────────────────────────────────────────
const PRIORITY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  critique: { label: 'Critique', color: '#DC2626', bg: '#FEF2F2' },
  elevee:   { label: 'Élevée',   color: '#EA580C', bg: '#FFF7ED' },
  haute:    { label: 'Haute',    color: '#EA580C', bg: '#FFF7ED' },
  moyenne:  { label: 'Moyenne',  color: '#CA8A04', bg: '#FEFCE8' },
  basse:    { label: 'Basse',    color: '#16A34A', bg: '#F0FDF4' },
  faible:   { label: 'Faible',   color: '#16A34A', bg: '#F0FDF4' },
};

export function PriorityBadge({ p }: { p: string }) {
  const cfg = PRIORITY_MAP[(p || '').toLowerCase()] ?? { label: p || '—', color: '#64748B', bg: '#F1F5F9' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, display: 'inline-block', flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// ─── Status Pill ───────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  soumise:        { label: 'Soumise',        color: '#D97706', bg: '#FFFBEB' },
  assignee_chef:  { label: 'Chef assigné',   color: '#7C3AED', bg: '#EDE9FE' },
  assignee_agent: { label: 'À accepter',     color: '#1D4ED8', bg: '#DBEAFE' },
  en_cours:       { label: 'En cours',       color: '#C2410C', bg: '#FFEDD5' },
  resolue:        { label: 'Résolue',        color: '#15803D', bg: '#DCFCE7' },
  cloturee:       { label: 'Clôturée',       color: '#475569', bg: '#F1F5F9' },
  refusee_chef:   { label: 'Refusée',        color: '#DC2626', bg: '#FEE2E2' },
  refusee_agent:  { label: 'Refusée',        color: '#DC2626', bg: '#FEE2E2' },
};

export function StatusPill({ s }: { s: string }) {
  const cfg = STATUS_MAP[s] ?? { label: s, color: '#64748B', bg: '#F1F5F9' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, display: 'inline-block', flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// ─── Type Badge ────────────────────────────────────────────────────────────────
export function TypeBadge({ t }: { t: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
      background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0',
      whiteSpace: 'nowrap',
    }}>
      {t || '—'}
    </span>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #F1F5F9',
      padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.04)',
    }}>
      <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ─── Button ────────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
}

export function Btn({ variant = 'outline', size = 'md', style, children, ...rest }: BtnProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
    fontWeight: 600, transition: 'opacity 0.12s', border: 'none',
    padding: size === 'sm' ? '5px 12px' : '8px 16px',
    fontSize: size === 'sm' ? 12 : 13,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: '#16A34A', color: '#fff' },
    danger:  { background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' },
    outline: { background: '#fff', color: '#64748B', border: '1px solid #E2E8F0' },
    ghost:   { background: 'transparent', color: '#64748B' },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS: Record<string, { bg: string; color: string }> = {
  agent:     { bg: '#DBEAFE', color: '#1D4ED8' },
  chef:      { bg: '#EDE9FE', color: '#7C3AED' },
  president: { bg: '#FEF9C3', color: '#854D0E' },
  citizen:   { bg: '#F1F5F9', color: '#475569' },
};

export function Avatar({ initiales, role, size = 36 }: { initiales: string; role: string; size?: number }) {
  const cfg = AVATAR_COLORS[role] ?? { bg: '#F1F5F9', color: '#475569' };
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: cfg.bg, color: cfg.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.35), fontWeight: 700, letterSpacing: '-0.5px',
    }}>
      {(initiales || '?').toUpperCase().slice(0, 2)}
    </div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────
export function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 14px' }}>
      <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
      <span style={{
        fontSize: 10, color: '#94A3B8', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
    </div>
  );
}
