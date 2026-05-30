export type DeclarationStatus =
  | 'soumise'
  | 'assignee_chef'
  | 'assignee_agent'
  | 'en_cours'
  | 'resolue'
  | 'cloturee'
  | 'refusee_chef'
  | 'refusee_agent';

export interface Comment {
  auteur: string;
  role: string;
  initiales: string;
  heure: string;
  text: string;
}

export interface HistoryEvent {
  titre: string;
  heure: string;
  color: 'green' | 'blue' | 'orange' | 'red' | 'gray';
}

export interface AgentInfo {
  nom: string;
  dept: string;
}

export interface Citoyen {
  nom: string;
  email: string;
  phone: string;
  initiales: string;
}

export interface Declaration {
  id: string;
  ref_citoyen: string;
  titre: string;
  description: string;
  statut: DeclarationStatus;
  priorite: string;
  type: string;
  dateAssignation: string;
  dateSubmission: string;
  arrondissement: string;
  gps: string;
  photoSignalement: boolean;
  photoPreuve: boolean;
  citoyen: Citoyen;
  agents: AgentInfo[];
  history: HistoryEvent[];
  comments: Comment[];
  // API compatibility fields
  title?: string;
  category?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

/** Raw shape returned directly from the backend API */
export interface RawDeclaration {
  id: string;
  ref_citoyen?: string;
  title?: string;
  description?: string;
  status: DeclarationStatus;
  priority?: string;
  category?: string;
  address?: string;
  assigned_at?: string;
  created_at?: string;
  latitude?: number;
  longitude?: number;
  department_id?: string;
  other_assignments?: any[];
  [key: string]: any;
}
