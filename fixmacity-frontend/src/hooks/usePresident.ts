// src/hooks/usePresident.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  declarationService, dashboardService, personnelService,
  type Declaration, type AppUser,
} from '../lib/supabase';
import { supabase } from '../lib/supabase';

// ─── useDashboard ─────────────────────────────────────────────────────────────
export function useDashboard() {
  const [kpis,     setKpis]     = useState<Record<string,number> | null>(null);
  const [status,   setStatus]   = useState<any[]>([]);
  const [monthly,  setMonthly]  = useState<any[]>([]);
  const [depts,    setDepts]    = useState<any[]>([]);
  const [critical, setCritical] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [k, s, m, d, c, a] = await Promise.all([
        dashboardService.getKpis(),
        dashboardService.getStatusDistribution(),
        dashboardService.getMonthlyTrend(),
        dashboardService.getDeptPerformance(),
        dashboardService.getTopCritical(),
        dashboardService.getRecentActivity(),
      ]);
      setKpis(k as any);
      setStatus(s);
      setMonthly(m);
      setDepts(d);
      setCritical(c);
      setActivity(a);
    } catch (e: any) {
      setError(e.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30_000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetch]);

  return { kpis, status, monthly, depts, critical, activity, loading, error, refresh: fetch };
}

// ─── useAllDeclarations ───────────────────────────────────────────────────────
export function useAllDeclarations(filters?: {
  status?: string; service_id?: string; search?: string;
}) {
  const { user } = useAuth();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [page,    setPage]    = useState(0);
  const limit = 20;

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, count } = await declarationService.listAll({
        ...filters, limit, offset: page * limit,
      });
      setDeclarations(data);
      setTotal(count);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [filters?.status, filters?.service_id, filters?.search, page]);

  useEffect(() => { fetch(); }, [fetch]);

  // Real-time
  useEffect(() => {
    const ch = supabase.channel('all-decls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'declarations' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  const changeStatus = async (id: string, newStatus: any, raison?: string) => {
    if (!user) return;
    await declarationService.changeStatus(id, newStatus, user.id, raison);
    await fetch();
  };

  const assignService = async (id: string, serviceId: string) => {
    if (!user) return;
    await declarationService.assignService(id, serviceId, user.id);
    await fetch();
  };

  // Derived stats (safe division)
  const stats = useMemo(() => {
    const resolved = declarations.filter(d => ['resolue','cloturee'].includes(d.status)).length;
    return {
      total:    declarations.length,
      soumises: declarations.filter(d => d.status === 'soumise').length,
      enCours:  declarations.filter(d => ['assignee_chef','assignee_agent','en_cours'].includes(d.status)).length,
      resolues: resolved,
      tauxResolution: declarations.length > 0 ? Math.round(resolved / declarations.length * 100) : 0,
    };
  }, [declarations]);

  return {
    declarations, total, loading, error, stats,
    page, setPage, totalPages: Math.ceil(total / limit),
    fetch, changeStatus, assignService,
  };
}

// ─── usePersonnel ─────────────────────────────────────────────────────────────
export function usePersonnel() {
  const [staff,   setStaff]   = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try { setStaff(await personnelService.listStaff()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Computed from real data (no hardcoding)
  const stats = useMemo(() => {
    const agents = staff.filter(u => u.role === 'agent');
    const chefs  = staff.filter(u => u.role === 'chef');
    return {
      totalAgents:  agents.length,
      activeAgents: agents.filter(u => u.is_active).length,
      totalChefs:   chefs.length,
      activeChefs:  chefs.filter(u => u.is_active).length,
      totalStaff:   staff.length,
      activeStaff:  staff.filter(u => u.is_active).length,
    };
  }, [staff]);

  const toggleActive = async (id: string, is_active: boolean) => {
    const updated = await personnelService.toggleActive(id, is_active);
    setStaff(prev => prev.map(u => u.id === id ? updated as AppUser : u));
  };

  const update = async (id: string, payload: Partial<AppUser>) => {
    const updated = await personnelService.update(id, payload);
    setStaff(prev => prev.map(u => u.id === id ? updated as AppUser : u));
  };

  return { staff, loading, error, stats, fetch, toggleActive, update };
}

// ─── usePresidentPropositions (fixes all CodeRabbit issues) ──────────────────
import { usePropositions } from './useCitizen';
import { computeMonthlyTrend, computeGrowthRate, validatePropositionForm, type PropositionForm } from '../utils/presidentHelpers';

export function usePresidentPropositions() {
  const base = usePropositions();
  const [formError, setFormError] = useState<string | null>(null);

  // ✅ Real trend (no Math.random)
  const trendData = useMemo(
    () => computeMonthlyTrend(base.propositions, 6),
    [base.propositions]
  );

  // ✅ Real growth (no hardcoded "+12%")
  const growthRate = useMemo(
    () => computeGrowthRate(base.propositions),
    [base.propositions]
  );

  // ✅ Validated create (date range validation)
  const createValidated = async (form: PropositionForm) => {
    const err = validatePropositionForm(form);
    if (err) { setFormError(err); throw new Error(err); }
    setFormError(null);
    return base.create({
      title_fr:        form.title_fr,
      description_fr:  form.description_fr,
      start_date:      form.start_date,
      end_date:        form.end_date,
      deadline:        form.end_date, // deadline = end_date
      status:          form.status ?? 'active',
    });
  };

  const updateValidated = async (id: string, form: PropositionForm) => {
    const err = validatePropositionForm(form);
    if (err) { setFormError(err); throw new Error(err); }
    setFormError(null);
    return base.update(id, {
      title_fr:       form.title_fr,
      description_fr: form.description_fr,
      start_date:     form.start_date,
      end_date:       form.end_date,
      deadline:       form.end_date,
      status:         form.status ?? 'active',
    });
  };

  return {
    ...base,
    trendData,
    growthRate,
    formError,
    setFormError,
    createValidated,
    updateValidated,
  };
}