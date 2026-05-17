// src/hooks/useCitizen.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  declarationService, propositionService, notificationService,
  serviceService, type Declaration, type Proposition, type Notification, type Service,
} from '../lib/supabase';
import { supabase } from '../lib/supabase';

// ─── useDeclarations ──────────────────────────────────────────────────────────
export function useMyDeclarations() {
  const { user } = useAuth();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const data = await declarationService.listMine(user.id);
      setDeclarations(data);
    } catch (e: any) {
      setError(e.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  // Real-time updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`decls:${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'declarations',
        filter: `citizen_id=eq.${user.id}`,
      }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetch]);

  const create = async (payload: Parameters<typeof declarationService.create>[1]) => {
    if (!user) throw new Error('Non authentifié');
    const decl = await declarationService.create(user.id, payload);
    setDeclarations(prev => [decl, ...prev]);
    return decl;
  };

  const update = async (id: string, payload: Parameters<typeof declarationService.updateOwn>[1]) => {
    const updated = await declarationService.updateOwn(id, payload);
    setDeclarations(prev => prev.map(d => d.id === id ? { ...d, ...updated } : d));
    return updated;
  };

  const remove = async (id: string) => {
    await declarationService.deleteOwn(id);
    setDeclarations(prev => prev.filter(d => d.id !== id));
  };

  const vote = async (declarationId: string) => {
    if (!user) throw new Error('Non authentifié');
    const action = await declarationService.vote(declarationId, user.id);
    setDeclarations(prev => prev.map(d =>
      d.id === declarationId
        ? { ...d, votes_count: action === 'added' ? d.votes_count + 1 : Math.max(d.votes_count - 1, 0) }
        : d
    ));
    return action;
  };

  const rate = async (declarationId: string, score: number, comment?: string) => {
    if (!user) throw new Error('Non authentifié');
    const rating = await declarationService.rate(declarationId, user.id, score, comment);
    setDeclarations(prev => prev.map(d =>
      d.id === declarationId ? { ...d, my_rating: score } : d
    ));
    return rating;
  };

  // Stats derived safely (no division by zero)
  const stats = {
    total:    declarations.length,
    soumises: declarations.filter(d => d.status === 'soumise').length,
    enCours:  declarations.filter(d => ['assignee_chef','assignee_agent','en_cours'].includes(d.status)).length,
    resolues: declarations.filter(d => d.status === 'resolue').length,
    cloturees:declarations.filter(d => d.status === 'cloturee').length,
    tauxResolution: declarations.length > 0
      ? Math.round(declarations.filter(d => ['resolue','cloturee'].includes(d.status)).length / declarations.length * 100)
      : 0,
  };

  return { declarations, loading, error, stats, fetch, create, update, remove, vote, rate };
}

// ─── useDeclarationDetail ─────────────────────────────────────────────────────
export function useDeclarationDetail(id: string | null) {
  const [data,    setData]    = useState<Awaited<ReturnType<typeof declarationService.getById>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try { setData(await declarationService.getById(id)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

// ─── usePropositions ──────────────────────────────────────────────────────────
export function usePropositions() {
  const { user } = useAuth();
  const [propositions, setPropositions] = useState<Proposition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await propositionService.list(user?.id);
      setPropositions(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  // Real-time
  useEffect(() => {
    const ch = supabase.channel('propositions:all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'propositions' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposition_votes' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  const vote = async (propositionId: string, voteType: 'pour' | 'contre') => {
    if (!user) throw new Error('Connectez-vous pour voter');
    await propositionService.vote(propositionId, user.id, voteType);
    await fetch(); // refetch to get accurate counts
  };

  // President CRUD
  const create = async (payload: Parameters<typeof propositionService.create>[1]) => {
    if (!user) throw new Error('Non authentifié');
    const prop = await propositionService.create(user.id, payload);
    setPropositions(prev => [prop, ...prev]);
    return prop;
  };

  const update = async (id: string, payload: Partial<Proposition>) => {
    const updated = await propositionService.update(id, payload);
    setPropositions(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  };

  const remove = async (id: string) => {
    await propositionService.delete(id);
    setPropositions(prev => prev.filter(p => p.id !== id));
  };

  return { propositions, loading, error, fetch, vote, create, update, remove };
}

// ─── useNotifications ────────────────────────────────────────────────────────
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread,  setUnread]  = useState(0);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [data, count] = await Promise.all([
        notificationService.list(user.id),
        notificationService.unreadCount(user.id),
      ]);
      setNotifications(data);
      setUnread(count);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const ch = notificationService.subscribe(user.id, (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnread(prev => prev + 1);
    });
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markRead = async (id: string) => {
    await notificationService.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(prev - 1, 0));
  };

  const markAllRead = async () => {
    if (!user) return;
    await notificationService.markAllRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  };

  return { notifications, loading, unread, markRead, markAllRead, refetch: fetch };
}

// ─── useServices ─────────────────────────────────────────────────────────────
export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    serviceService.list()
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return { services, loading };
}