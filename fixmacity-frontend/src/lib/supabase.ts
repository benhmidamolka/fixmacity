// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('[FixMaCity] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing from .env — Supabase features disabled.')
}

export const supabase = createClient<any>(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ─── TYPES ───────────────────────────────────────────────────────────────────
export type UserRole = 'citizen' | 'agent' | 'chef' | 'president';

export type DeclarationStatus =
  | 'soumise' | 'assignee_chef' | 'assignee_agent'
  | 'en_cours' | 'refusee_chef' | 'refusee_agent'
  | 'resolue' | 'cloturee';

export interface AppUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  lang_pref: 'fr' | 'ar' | 'en';
  address?: string;
  birth_date?: string;
  delegation_id?: string;
  department_id?: string;
  speciality?: string;
  created_at: string;
  updated_at: string;
}

export interface Declaration {
  id: string;
  citizen_id: string;
  service_id?: string;
  type_probleme?: string;
  title: string;
  description?: string;
  photo_avant_url?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  status: DeclarationStatus;
  priority_score: number;
  votes_count: number;
  assigned_chef_id?: string;
  assigned_agent_id?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  // joined
  service_name?: string;
  service_icon?: string;
  my_rating?: number;
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

export interface Proposition {
  id: string;
  title_fr: string;
  title_ar?: string;
  description_fr?: string;
  description_ar?: string;
  created_by: string;
  published_at?: string;
  deadline: string;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'closed' | 'archived';
  votes_pour: number;
  votes_contre: number;
  image_url?: string;
  tags?: string[];
  president_response?: string;
  created_at: string;
  updated_at: string;
  // computed
  my_vote?: 'pour' | 'contre' | null;
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

export interface Rating {
  id: string;
  declaration_id: string;
  citizen_id: string;
  score: number;
  comment?: string;
  rated_at: string;
}

// ─── AUTH SERVICE ─────────────────────────────────────────────────────────────
export const authService = {
  /** Register a new citizen */
  async register(data: {
    email: string; password: string;
    first_name: string; last_name: string; phone?: string;
  }): Promise<AppUser> {
    // 1. Create auth user
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (authErr) throw authErr;
    if (!authData.user) throw new Error('Registration failed');

    // 2. Insert into public.users
    const { data: user, error: userErr } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: data.email,
        password_hash: 'managed_by_auth', // auth handles actual hash
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone ?? null,
        role: 'citizen',
      })
      .select()
      .single();

    if (userErr) throw userErr;
    return user as AppUser;
  },

  /** Login */
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  /** Logout */
  async logout() {
    await supabase.auth.signOut();
  },

  /** Get current session user profile */
  async getProfile(): Promise<AppUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) return null;
    return data as AppUser;
  },

  /** Update profile */
  async updateProfile(id: string, updates: Partial<AppUser>) {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AppUser;
  },

  /** Subscribe to auth state */
  onAuthStateChange(callback: (user: AppUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (_: any, session: any) => {
      if (!session) { callback(null); return; }
      const profile = await authService.getProfile();
      callback(profile);
    });
  },
};

// ─── DECLARATIONS SERVICE ─────────────────────────────────────────────────────
export const declarationService = {
  /** Citizen: list own declarations */
  async listMine(citizenId: string): Promise<Declaration[]> {
    const { data, error } = await supabase
      .from('v_citizen_declarations')
      .select('*')
      .eq('citizen_id', citizenId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Declaration[];
  },

  /** President: list all declarations with filters */
  async listAll(filters?: {
    status?: string; service_id?: string;
    search?: string; limit?: number; offset?: number;
  }): Promise<{ data: Declaration[]; count: number }> {
    let q = supabase
      .from('declarations')
      .select(`*, services(name_fr,icon)`, { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (filters?.status)     q = q.eq('status', filters.status);
    if (filters?.service_id) q = q.eq('service_id', filters.service_id);
    if (filters?.search)     q = q.ilike('title', `%${filters.search}%`);
    if (filters?.offset !== undefined) {
      q = q.range(filters.offset, filters.offset + (filters.limit ?? 20) - 1);
    } else if (filters?.limit !== undefined) {
      q = q.limit(filters.limit);
    }

    const { data, error, count } = await q;
    if (error) throw error;
    return { data: (data ?? []) as Declaration[], count: count ?? 0 };
  },

  /** Get one declaration with photos and history */
  async getById(id: string) {
    const [decl, photos, history] = await Promise.all([
      supabase.from('declarations')
        .select(`*, services(name_fr,icon), users!declarations_citizen_id_fkey(first_name,last_name,email,phone)`)
        .eq('id', id).single(),
      supabase.from('declaration_photos').select('*').eq('declaration_id', id).order('created_at'),
      supabase.from('status_history').select(`*, users(first_name,last_name,role)`)
        .eq('declaration_id', id).order('created_at'),
    ]);
    if (decl.error) throw decl.error;
    return { declaration: decl.data, photos: photos.data ?? [], history: history.data ?? [] };
  },

  /** Citizen: create declaration */
  async create(citizenId: string, payload: {
    title: string; description?: string; type_probleme?: string;
    address?: string; latitude?: number; longitude?: number;
    service_id?: string; photo_avant_url?: string;
  }): Promise<Declaration> {
    const { data, error } = await supabase
      .from('declarations')
      .insert({ citizen_id: citizenId, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data as Declaration;
  },

  /** Citizen: update own declaration (only if soumise) */
  async updateOwn(id: string, payload: Partial<Pick<Declaration, 'title'|'description'|'address'|'latitude'|'longitude'>>) {
    const { data, error } = await supabase
      .from('declarations')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .in('status', ['soumise'])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Citizen: soft-delete own declaration */
  async deleteOwn(id: string) {
    const { error } = await supabase
      .from('declarations')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id)
      .in('status', ['soumise']);
    if (error) throw error;
  },

  /** President/Chef: change status */
  async changeStatus(id: string, newStatus: DeclarationStatus, changedBy: string, raison?: string) {
    // Get current status
    const { data: decl, error: e1 } = await supabase
      .from('declarations').select('status').eq('id', id).single();
    if (e1) throw e1;

    const updates: Record<string, unknown> = {
      status: newStatus, updated_at: new Date().toISOString(),
    };
    if (newStatus === 'resolue') updates.resolved_at = new Date().toISOString();
    if (newStatus === 'cloturee') updates.closed_at = new Date().toISOString();
    if (newStatus === 'en_cours') updates.started_at = new Date().toISOString();

    const [upd, hist] = await Promise.all([
      supabase.from('declarations').update(updates).eq('id', id).select().single(),
      supabase.from('status_history').insert({
        declaration_id: id,
        old_status: decl!.status,
        new_status: newStatus,
        changed_by: changedBy,
        raison: raison ?? null,
      }),
    ]);
    if (upd.error) throw upd.error;
    if (hist.error) throw hist.error;
    return upd.data;
  },

  /** Assign to service */
  async assignService(id: string, serviceId: string, changedBy: string) {
    const { data: decl, error: declErr } = await supabase.from('declarations').select('status').eq('id', id).single();
    if (declErr) throw declErr;

    const { data, error } = await supabase
      .from('declarations')
      .update({ service_id: serviceId, status: 'assignee_chef', assigned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    await supabase.from('status_history').insert({ declaration_id: id, old_status: decl.status, new_status: 'assignee_chef', changed_by: changedBy });
    return data;
  },

  /** Vote on a declaration */
  async vote(declarationId: string, citizenId: string): Promise<'added' | 'removed'> {
    const { data, error } = await supabase.rpc('toggle_vote', { decl_id: declarationId, citizen_id: citizenId });
    if (error) throw error;
    return data as 'added' | 'removed';
  },

  /** Check if citizen voted */
  async hasVoted(declarationId: string, citizenId: string): Promise<boolean> {
    const { data } = await supabase
      .from('votes').select('id').eq('declaration_id', declarationId).eq('citizen_id', citizenId).single();
    return !!data;
  },

  /** Submit rating */
  async rate(declarationId: string, citizenId: string, score: number, comment?: string) {
    const { data, error } = await supabase
      .from('ratings')
      .upsert({ declaration_id: declarationId, citizen_id: citizenId, score, comment: comment ?? null })
      .select().single();
    if (error) throw error;
    return data;
  },
};

// ─── PROPOSITIONS SERVICE ─────────────────────────────────────────────────────
export const propositionService = {
  /** List all active propositions with user's vote status */
  async list(citizenId?: string): Promise<Proposition[]> {
    const { data, error } = await supabase
      .from('propositions')
      .select('*')
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    if (error) throw error;

    if (!citizenId || !data) return (data ?? []) as Proposition[];

    // Fetch user's votes
    const { data: myVotes } = await supabase
      .from('proposition_votes')
      .select('proposition_id, vote_type')
      .eq('citizen_id', citizenId);

    const voteMap = new Map((myVotes ?? []).map((v: any) => [v.proposition_id, v.vote_type]));
    return data.map((p: any) => ({ ...p, my_vote: voteMap.get(p.id) ?? null })) as Proposition[];
  },

  /** President: create proposition */
  async create(presidentId: string, payload: {
    title_fr: string; description_fr?: string;
    start_date: string; end_date: string;
    deadline: string; status?: string; image_url?: string; tags?: string[];
  }): Promise<Proposition> {
    const { data, error } = await supabase
      .from('propositions')
      .insert({ created_by: presidentId, ...payload })
      .select().single();
    if (error) throw error;
    return data as Proposition;
  },

  /** President: update */
  async update(id: string, payload: Partial<Proposition>): Promise<Proposition> {
    const { id: _, created_by: __, created_at: ___, votes_pour: ____, votes_contre: _____, ...rest } = payload as any;
    const { data, error } = await supabase
      .from('propositions')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data as Proposition;
  },

  /** President: delete */
  async delete(id: string) {
    const { error } = await supabase.from('propositions').delete().eq('id', id);
    if (error) throw error;
  },

  /** Citizen: vote pour/contre */
  async vote(propositionId: string, citizenId: string, voteType: 'pour' | 'contre'): Promise<void> {
    const { error } = await supabase.rpc('toggle_proposition_vote', { proposition_id: propositionId, citizen_id: citizenId, vote_type: voteType });
    if (error) throw error;
  },
};

// ─── NOTIFICATIONS SERVICE ────────────────────────────────────────────────────
export const notificationService = {
  async list(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as Notification[];
  },

  async markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  async markAllRead(userId: string) {
    await supabase.from('notifications')
      .update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  },

  async unreadCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('is_read', false);
    return count ?? 0;
  },

  /** Real-time subscription */
  subscribe(userId: string, onNew: (notif: Notification) => void) {
    return supabase.channel(`notifs:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => onNew(payload.new as Notification))
      .subscribe();
  },
};

// ─── SERVICES (municipal) ─────────────────────────────────────────────────────
export const serviceService = {
  async list(): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services').select('*').eq('is_active', true).order('name_fr');
    if (error) throw error;
    return (data ?? []) as Service[];
  },
};

// ─── DASHBOARD SERVICE ────────────────────────────────────────────────────────
export const dashboardService = {
  async getKpis() {
    const { data, error } = await supabase.from('v_dashboard_kpis').select('*').single();
    if (error) throw error;
    return data;
  },
  async getStatusDistribution() {
    const { data, error } = await supabase.from('v_status_distribution').select('*');
    if (error) throw error;
    return data ?? [];
  },
  async getMonthlyTrend() {
    const { data, error } = await supabase.from('v_monthly_trend').select('*').order('mois_date');
    if (error) throw error;
    return data ?? [];
  },
  async getDeptPerformance() {
    const { data, error } = await supabase.from('v_dept_performance').select('*');
    if (error) throw error;
    return data ?? [];
  },
  async getTopCritical() {
    const { data, error } = await supabase.from('v_top_critical').select('*');
    if (error) throw error;
    return data ?? [];
  },
  async getRecentActivity() {
    const { data, error } = await supabase.from('v_recent_activity').select('*');
    if (error) throw error;
    return data ?? [];
  },
};

// ─── PRESIDENT PERSONNEL SERVICE ─────────────────────────────────────────────
export const personnelService = {
  async listStaff(): Promise<AppUser[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['chef', 'agent'])
      .order('role').order('first_name');
    if (error) throw error;
    return (data ?? []) as AppUser[];
  },

  async createStaff(payload: {
    email: string; password_hash: string;
    first_name: string; last_name: string;
    role: 'chef' | 'agent'; phone?: string; speciality?: string; department_id?: string;
  }): Promise<AppUser> {
    const { data, error } = await supabase
      .from('users').insert({ ...payload, is_active: true }).select().single();
    if (error) throw error;
    return data as AppUser;
  },

  async toggleActive(id: string, is_active: boolean) {
    const { data, error } = await supabase
      .from('users').update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Partial<AppUser>) {
    const { data, error } = await supabase
      .from('users').update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};