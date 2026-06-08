import React from 'react';

// ─── Priority Badge ────────────────────────────────────────────────────────────
const PRIORITY_MAP: Record<string, { label: string; dotColor: string; bg: string; text: string }> = {
  critique: { label: 'Critique', dotColor: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-400' },
  elevee:   { label: 'Élevée',   dotColor: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-600 dark:text-orange-400' },
  haute:    { label: 'Haute',    dotColor: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-600 dark:text-orange-400' },
  moyenne:  { label: 'Moyenne',  dotColor: 'bg-yellow-500', bg: 'bg-yellow-550 dark:bg-yellow-950/20', text: 'text-yellow-700 dark:text-yellow-400' },
  basse:    { label: 'Basse',    dotColor: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400' },
  faible:   { label: 'Faible',   dotColor: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400' },
};

export function PriorityBadge({ p }: { p: string }) {
  const cfg = PRIORITY_MAP[(p || '').toLowerCase()] ?? { label: p || '—', dotColor: 'bg-slate-400', bg: 'bg-slate-50 dark:bg-slate-900', text: 'text-slate-500 dark:text-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.text} whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}

// ─── Status Pill ───────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; dotColor: string; bg: string; text: string }> = {
  soumise:        { label: 'Soumise',        dotColor: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-450' },
  assignee_chef:  { label: 'Chef assigné',   dotColor: 'bg-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-600 dark:text-violet-400' },
  assignee_agent: { label: 'À accepter',     dotColor: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400' },
  en_cours:       { label: 'En cours',       dotColor: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-600 dark:text-orange-400' },
  resolue:        { label: 'Résolue',        dotColor: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400' },
  cloturee:       { label: 'Clôturée',       dotColor: 'bg-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/40', text: 'text-slate-500 dark:text-slate-400' },
  refusee_chef:   { label: 'Refusée',        dotColor: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-400' },
  refusee_agent:  { label: 'Refusée',        dotColor: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-400' },
};

export function StatusPill({ s }: { s: string }) {
  const cfg = STATUS_MAP[s] ?? { label: s, dotColor: 'bg-slate-400', bg: 'bg-slate-50 dark:bg-slate-900', text: 'text-slate-500 dark:text-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.text} whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}

// ─── Type Badge ────────────────────────────────────────────────────────────────
export function TypeBadge({ t }: { t: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-850 whitespace-nowrap">
      {t || '—'}
    </span>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850 p-5 shadow-sm">
      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1.5">
        {label}
      </div>
      <div className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{value}</div>
      {sub && <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{sub}</div>}
    </div>
  );
}

// ─── Button ────────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
}

export function Btn({ variant = 'outline', size = 'md', className = '', children, ...rest }: BtnProps) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl cursor-pointer font-bold transition-all duration-150 border-none outline-none";
  const sizeCls = size === 'sm' ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-2.5 text-xs';
  
  const variantCls = {
    primary: 'bg-emerald-500 hover:bg-emerald-650 text-white shadow-sm',
    danger:  'bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-655 dark:text-red-400 border border-red-100 dark:border-red-900/30',
    outline: 'bg-white hover:bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
    ghost:   'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
  }[variant];

  return (
    <button className={`${base} ${sizeCls} ${variantCls} ${className}`} {...rest}>
      {children}
    </button>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  agent:     { bg: 'bg-blue-100 dark:bg-blue-950/20', text: 'text-blue-750 dark:text-blue-400' },
  chef:      { bg: 'bg-purple-100 dark:bg-purple-950/20', text: 'text-purple-750 dark:text-purple-400' },
  president: { bg: 'bg-yellow-100 dark:bg-yellow-950/20', text: 'text-yellow-800 dark:text-yellow-450' },
  citizen:   { bg: 'bg-slate-100 dark:bg-slate-950', text: 'text-slate-500 dark:text-slate-400' },
};

export function Avatar({ initiales, role, size = 36 }: { initiales: string; role: string; size?: number }) {
  const cfg = AVATAR_COLORS[role] ?? { bg: 'bg-slate-100 dark:bg-slate-950', text: 'text-slate-500 dark:text-slate-400' };
  return (
    <div 
      className={`rounded-full flex-shrink-0 flex items-center justify-center font-bold tracking-tight ${cfg.bg} ${cfg.text}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.35),
      }}
    >
      {(initiales || '?').toUpperCase().slice(0, 2)}
    </div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────
export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3.5 my-5">
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-850" />
      <span className="text-[10px] text-slate-450 dark:text-slate-500 font-black uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-850" />
    </div>
  );
}
