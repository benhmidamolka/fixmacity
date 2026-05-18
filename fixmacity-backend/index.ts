export type UserRole = 'citizen' | 'agent' | 'chef' | 'president';
export type LangCode = 'fr' | 'ar' | 'en';
export type DeclarationStatus =
  | 'soumise' | 'assignee_chef' | 'assignee_agent'
  | 'en_cours' | 'refusee_chef' | 'refusee_agent'
  | 'resolue' | 'cloturee';
export type TaskStatus = 'en_attente' | 'en_cours' | 'terminee' | 'annulee';
export type VoteValue = 'pour' | 'contre';
export type AttachmentType = 'photo_avant' | 'photo_apres' | 'document' | 'pdf';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone?: string;
  lang_pref: LangCode;
  is_active: boolean;
  address?: string;
  birth_date?: string;
  delegation_id?: string;
  department_id?: string;
  is_available?: boolean;
  speciality?: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name_fr: string;
  name_ar: string;
  name_en: string;
  description?: string;
  chef_id?: string;
  icon?: string;
  code?: string;
  is_active: boolean;
  created_at: string;
}

export interface Declaration {
  id: string;
  citizen_id: string;
  service_id: string;
  title: string;
  description?: string;
  category?: string;
  type_probleme?: string;
  photo_avant_url?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  delegation_id?: string;
  status: DeclarationStatus;
  priority_score: number;
  votes_count: number;
  ref_citoyen?: string;
  ref_service?: string;
  assigned_chef_id?: string;
  assigned_agent_id?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tache {
  id: string;
  declaration_id: string;
  agent_id?: string;
  assigned_by_chef?: string;
  date_assignation: string;
  date_resolution?: string;
  rapport_interne?: string;
  photo_apres_url?: string;
  statut_tache: TaskStatus;
  motif_refus?: string;
  created_at: string;
  updated_at: string;
}

export interface Proposition {
  id: string;
  title: string;
  title_fr?: string;
  title_ar?: string;
  title_en?: string;
  description?: string;
  created_by: string;
  deadline?: string;
  status: 'active' | 'closed' | 'archived';
  votes_pour: number;
  votes_contre: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body?: string;
  type?: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

// Express augmented request
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}