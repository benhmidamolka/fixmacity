export const ROLE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  agent: { label: 'Agent', color: '#1D4ED8', bg: '#DBEAFE' },
  chef: { label: 'Chef de Service', color: '#7C3AED', bg: '#EDE9FE' },
  president: { label: 'Président', color: '#854D0E', bg: '#FEF9C3' },
  citoyen: { label: 'Citoyen', color: '#475569', bg: '#F1F5F9' },
  admin: { label: 'Admin', color: '#0F172A', bg: '#F8FAFC' }
};

export const HISTORY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  blue: { label: 'Information', color: '#1D4ED8', bg: '#DBEAFE' },
  green: { label: 'Succès', color: '#15803D', bg: '#DCFCE7' },
  orange: { label: 'Attention', color: '#C2410C', bg: '#FFEDD5' },
  red: { label: 'Erreur', color: '#DC2626', bg: '#FEE2E2' },
  gray: { label: 'Neutre', color: '#475569', bg: '#F1F5F9' }
};
