export const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  dot: string;
}> = {
  soumise: {
    label: 'Soumise',
    color: '#d97706',
    bg: '#fef3c7',
    dot: '#f59e0b',
  },
  soumis: {
    label: 'Soumise',
    color: '#d97706',
    bg: '#fef3c7',
    dot: '#f59e0b',
  },
  assignee_chef: {
    label: 'Assignée (Chef)',
    color: '#7c3aed',
    bg: '#ede9fe',
    dot: '#8b5cf6',
  },
  assignee_agent: {
    label: 'Assignée (Agent)',
    color: '#1d4ed8',
    bg: '#dbeafe',
    dot: '#3b82f6',
  },
  en_cours: {
    label: 'En cours',
    color: '#c2410c',
    bg: '#ffedd5',
    dot: '#f97316',
  },
  resolue: {
    label: 'Résolue',
    color: '#15803d',
    bg: '#dcfce7',
    dot: '#22c55e',
  },
  cloturee: {
    label: 'Clôturée',
    color: '#475569',
    bg: '#f1f5f9',
    dot: '#94a3b8',
  },
  refusee: {
    label: 'Refusée',
    color: '#dc2626',
    bg: '#fee2e2',
    dot: '#ef4444',
  },
  refusee_chef: {
    label: 'Refusée (Chef)',
    color: '#dc2626',
    bg: '#fee2e2',
    dot: '#ef4444',
  },
  refusee_agent: {
    label: 'Refusée (Agent)',
    color: '#b91c1c',
    bg: '#fee2e2',
    dot: '#ef4444',
  },
};

export const PRIORITY_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
}> = {
  haute: {
    label: 'Urgent',
    color: '#dc2626',
    bg: '#fee2e2',
  },
  high: {
    label: 'Urgent',
    color: '#dc2626',
    bg: '#fee2e2',
  },
  urgent: {
    label: 'Urgent',
    color: '#dc2626',
    bg: '#fee2e2',
  },
  urgente: {
    label: 'Urgent',
    color: '#dc2626',
    bg: '#fee2e2',
  },
  moyenne: {
    label: 'Normal',
    color: '#d97706',
    bg: '#fef3c7',
  },
  medium: {
    label: 'Normal',
    color: '#d97706',
    bg: '#fef3c7',
  },
  basse: {
    label: 'Faible',
    color: '#16a34a',
    bg: '#dcfce7',
  },
  low: {
    label: 'Faible',
    color: '#16a34a',
    bg: '#dcfce7',
  },
};
