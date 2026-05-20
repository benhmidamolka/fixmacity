// ════════════════════════════════════════════════════════════════════
// chef.controller.js  — FULL REPLACEMENT
// Fixes:
//   1. 'soumis' → 'soumise' (enum crash fix throughout)
//   2. dashboard now returns kpis, status_chart, priority_chart,
//      urgent_declarations, recent_declarations, agent_workload
//      so ChefDashboard.tsx gets exactly what it expects
// ════════════════════════════════════════════════════════════════════

'use strict';

const supabase = require('../config/db');
const { validationResult } = require('express-validator');
const { logStatusChange }    = require('../services/statusHistory.service');
const { notifyStatusChange, notifyAgentAssigned } = require('../services/notification.service');
const priorityService        = require('../services/priority.service');

// ─── Correct enum values ──────────────────────────────────────────────────────
const VALID_STATUSES = [
  'soumise',          // ← was 'soumis' — that's the bug
  'assignee_chef',
  'assignee_agent',
  'en_cours',
  'resolue',
  'cloturee',
  'refusee_chef',
  'refusee_agent',
];

/* ──────────── GET /api/chef/declarations ──────────── */
exports.listDeclarations = async (req, res) => {
  try {
    const deptId = req.user.department_id;
    if (!deptId) return res.status(400).json({ error: 'Aucun département associé à votre compte.' });

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Guard: never pass an invalid status value to PostgreSQL
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Statut invalide: "${status}". Valeurs acceptées: ${VALID_STATUSES.join(', ')}` });
    }

    let q = supabase
      .from('declarations')
      .select('*', { count: 'exact' })
      .eq('department_id', deptId)
      .eq('is_deleted', false)
      .order('priority_score', { ascending: false })
      .order('created_at',     { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status) q = q.eq('status', status);

    let { data, error, count } = await q;
    if (error) {
      console.error('[Chef] listDeclarations error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    // Enrich with citizen name
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(d => d.citizen_id || d.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase.from('users')
          .select('id, first_name, last_name').in('id', userIds);
        const uMap = {};
        if (usersData) usersData.forEach(u => uMap[u.id] = u);
        data = data.map(d => ({ ...d, citizen: uMap[d.citizen_id || d.user_id] || null }));
      }
    }

    return res.status(200).json({ declarations: data || [], total: count || 0, page: +page, limit: +limit });
  } catch (e) {
    console.error('[Chef] listDeclarations exception:', e);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/chef/declarations/:id ──────────── */
exports.getDeclarationDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const deptId = req.user.department_id;
    if (!deptId) return res.status(400).json({ error: 'Aucun département associé.' });

    const { data: decl, error } = await supabase
      .from('declarations').select('*')
      .eq('id', id).eq('department_id', deptId)
      .eq('is_deleted', false).single();

    if (error || !decl) return res.status(404).json({ error: 'Déclaration introuvable ou hors département.' });

    // Enrich users
    const userIds = [decl.citizen_id, decl.agent_id].filter(Boolean);
    const userMap = {};
    if (userIds.length) {
      const { data: uD } = await supabase.from('users')
        .select('id, first_name, last_name, email, phone').in('id', userIds);
      if (uD) uD.forEach(u => userMap[u.id] = u);
    }

    const fullDecl = { ...decl, citizen: userMap[decl.citizen_id] || null, assigned_agent: userMap[decl.agent_id] || null };

    const [photosRes, historyRes, commentsRes] = await Promise.all([
      supabase.from('declaration_photos').select('*').eq('declaration_id', id),
      supabase.from('status_history').select('*').eq('declaration_id', id).order('created_at', { ascending: false }),
      supabase.from('internal_comments').select('*').eq('declaration_id', id)
        .in('channel', ['president_chef', 'chef_agent']).order('created_at', { ascending: true }),
    ]);

    // Enrich history with user info
    let history = historyRes.data || [];
    const hUserIds = [...new Set(history.map(h => h.user_id).filter(Boolean))];
    if (hUserIds.length) {
      const { data: hUsers } = await supabase.from('users').select('id, first_name, last_name, role').in('id', hUserIds);
      const hMap = {};
      if (hUsers) hUsers.forEach(u => hMap[u.id] = u);
      history = history.map(h => ({ ...h, user: hMap[h.user_id] || null }));
    }

    // Enrich comments
    let comments = commentsRes.data || [];
    const cUserIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))];
    if (cUserIds.length) {
      const { data: cUsers } = await supabase.from('users').select('id, first_name, last_name, role').in('id', cUserIds);
      const cMap = {};
      if (cUsers) cUsers.forEach(u => cMap[u.id] = u);
      comments = comments.map(c => ({ ...c, user: cMap[c.user_id] || null }));
    }

    return res.status(200).json({
      declaration: fullDecl,
      ...fullDecl,  // backward compat root fields
      photos:   photosRes.data  || [],
      history,
      comments,
    });
  } catch (e) {
    console.error('[Chef] getDeclarationDetail error:', e);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/chef/declarations/:id/priority-score ──────────── */
exports.getPriorityScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: decl, error } = await supabase
      .from('declarations')
      .select('*')
      .eq('id', id)
      .eq('department_id', req.user.department_id)
      .single();

    if (error || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable ou hors département.' });
    }

    // Compute priority score live to get the detailed breakdown
    const priorityData = await priorityService.computePriorityScore(decl);
    return res.status(200).json(priorityData);
  } catch (err) {
    console.error('[Chef] getPriorityScore error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/chef/declarations/:id/accept ──────────── */
exports.acceptDeclaration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { agent_id } = req.body;

    const { data: decl, error: fetchErr } = await supabase.from('declarations')
      .select('id, status, department_id, citizen_id').eq('id', id).eq('is_deleted', false).single();
    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id) return res.status(403).json({ error: 'Hors département.' });
    if (decl.status !== 'assignee_chef') return res.status(400).json({ error: `Statut actuel "${decl.status}" — impossible d'accepter.` });

    let hasSurcharge = false;
    if (agent_id) {
      const { data: agent } = await supabase.from('users')
        .select('id, department_id, role, is_active').eq('id', agent_id).single();
      if (!agent || agent.role !== 'agent') return res.status(400).json({ error: 'Agent invalide.' });
      if (!agent.is_active)                 return res.status(403).json({ error: 'Agent désactivé.' });
      if (agent.department_id !== req.user.department_id) return res.status(403).json({ error: 'Agent hors département.' });

      const { count: activeCount } = await supabase.from('declarations')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent_id).in('status', ['assignee_agent', 'en_cours']).eq('is_deleted', false);
      hasSurcharge = (activeCount || 0) >= 5;
    }

    const { data: updated, error: updateErr } = await supabase.from('declarations')
      .update({ status: 'assignee_agent', agent_id: agent_id || null, updated_at: new Date().toISOString() })
      .eq('id', id).select('*').single();
    if (updateErr) return res.status(500).json({ error: 'Erreur serveur.' });

    await logStatusChange(id, 'assignee_chef', 'assignee_agent', req.user.id);
    await notifyStatusChange(req.app, updated, updated.citizen_id, 'assignee_agent');
    if (agent_id) await notifyAgentAssigned(req.app, updated, agent_id);

    return res.status(200).json({
      declaration: updated,
      warning: hasSurcharge ? 'Cet agent a déjà beaucoup de missions actives.' : null,
    });
  } catch (err) {
    console.error('[Chef] acceptDeclaration error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/chef/declarations/:id/refuse ──────────── */
exports.refuseDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'Le motif est obligatoire.' });

    const { data: decl, error: fetchErr } = await supabase.from('declarations')
      .select('id, status, department_id, citizen_id').eq('id', id).eq('is_deleted', false).single();
    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id) return res.status(403).json({ error: 'Hors département.' });
    if (decl.status !== 'assignee_chef') return res.status(400).json({ error: `Statut actuel "${decl.status}" — impossible de refuser.` });

    const { data: updated, error: updateErr } = await supabase.from('declarations')
      .update({ status: 'refusee_chef', updated_at: new Date().toISOString() })
      .eq('id', id).select('*').single();
    if (updateErr) return res.status(500).json({ error: 'Erreur serveur.' });

    await logStatusChange(id, 'assignee_chef', 'refusee_chef', req.user.id, reason.trim());
    await notifyStatusChange(req.app, updated, updated.citizen_id, 'refusee_chef');
    return res.status(200).json({ declaration: updated });
  } catch (err) {
    console.error('[Chef] refuseDeclaration error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/chef/agents ──────────── */
exports.listAgents = async (req, res) => {
  try {
    const departmentId = req.user.department_id;
    const { data: agents, error } = await supabase.from('users')
      .select('id, email, first_name, last_name, is_active, created_at')
      .eq('role', 'agent').eq('department_id', departmentId).order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    const agentsWithWorkload = await Promise.all((agents || []).map(async (agent) => {
      const [{ count: activeCount }, { count: resolvedCount }] = await Promise.all([
        supabase.from('declarations').select('id', { count: 'exact', head: true })
          .eq('agent_id', agent.id).in('status', ['assignee_agent', 'en_cours']).eq('is_deleted', false),
        supabase.from('declarations').select('id', { count: 'exact', head: true })
          .eq('agent_id', agent.id).in('status', ['resolue', 'cloturee']).eq('is_deleted', false),
      ]);
      return { ...agent, workload: activeCount || 0, resolved_count: resolvedCount || 0, is_overloaded: (activeCount || 0) >= 5 };
    }));

    return res.status(200).json({ agents: agentsWithWorkload });
  } catch (err) {
    console.error('[Chef] listAgents error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/chef/agents ──────────── */
exports.addAgent = async (req, res) => {
  try {
    const { email, first_name, last_name, password } = req.body;
    if (!email || !first_name || !last_name || !password) return res.status(400).json({ error: 'Tous les champs sont requis.' });

    const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé.' });

    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(password, 12);
    const { data: agent, error } = await supabase.from('users').insert({
      email: email.toLowerCase().trim(), password_hash: hash,
      first_name: first_name.trim(), last_name: last_name.trim(),
      role: 'agent', department_id: req.user.department_id, is_active: true,
    }).select('id, email, first_name, last_name, is_active').single();

    if (error) return res.status(500).json({ error: 'Erreur lors de la création.' });
    return res.status(201).json({ agent });
  } catch (err) {
    console.error('[Chef] addAgent error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PUT /api/chef/agents/:id ──────────── */
exports.updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email } = req.body;

    const { data: existing } = await supabase.from('users').select('id, department_id').eq('id', id).single();
    if (!existing || existing.department_id !== req.user.department_id) return res.status(403).json({ error: 'Accès refusé.' });

    const updates = { updated_at: new Date().toISOString() };
    if (first_name) updates.first_name = first_name.trim();
    if (last_name)  updates.last_name  = last_name.trim();
    if (email)      updates.email      = email.toLowerCase().trim();

    const { data: updated, error } = await supabase.from('users').update(updates).eq('id', id)
      .select('id, email, first_name, last_name, is_active').single();
    if (error) return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    return res.status(200).json({ agent: updated });
  } catch (err) {
    console.error('[Chef] updateAgent error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PATCH /api/chef/agents/:id/deactivate ──────────── */
exports.deactivateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: agent, error: fetchErr } = await supabase.from('users')
      .select('id, is_active, department_id').eq('id', id).single();
    if (fetchErr || !agent) return res.status(404).json({ error: 'Agent introuvable.' });
    if (agent.department_id !== req.user.department_id) return res.status(403).json({ error: 'Accès refusé.' });

    if (agent.is_active) {
      const { count: active } = await supabase.from('declarations')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', id).in('status', ['assignee_agent', 'en_cours']).eq('is_deleted', false);
      if ((active || 0) > 0) return res.status(400).json({ error: 'Impossible de désactiver un agent avec des missions en cours.' });
    }

    const { data: updated, error: updateErr } = await supabase.from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id).select('id, is_active').single();
    if (updateErr) return res.status(500).json({ error: 'Erreur serveur.' });
    return res.status(200).json({ agent: updated });
  } catch (err) {
    console.error('[Chef] deactivateAgent error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ══════════════════════════════════════════════════════════════════
   GET /api/chef/dashboard  — REBUILT
   Returns exactly what ChefDashboard.tsx expects:
   { kpis, status_chart, priority_chart,
     urgent_declarations, recent_declarations, agent_workload }
══════════════════════════════════════════════════════════════════ */
exports.dashboard = async (req, res) => {
  try {
    const deptId = req.user?.department_id;
    if (!deptId) return res.status(400).json({ error: 'Département non trouvé.' });

    // ── Counts per status (use correct enum values!) ──────────────
    const statusCounts = {};
    await Promise.all(VALID_STATUSES.map(async (s) => {
      const { count } = await supabase.from('declarations')
        .select('id', { count: 'exact', head: true })
        .eq('department_id', deptId).eq('status', s).eq('is_deleted', false);
      statusCounts[s] = count || 0;
    }));

    const total    = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const pending  = statusCounts['assignee_chef'] || 0;
    const en_cours = (statusCounts['assignee_agent'] || 0) + (statusCounts['en_cours'] || 0);
    const resolved = (statusCounts['resolue'] || 0) + (statusCounts['cloturee'] || 0);
    const refused  = (statusCounts['refusee_chef'] || 0) + (statusCounts['refusee_agent'] || 0);

    // ── Active agents ──────────────────────────────────────────────
    const { count: activeAgents } = await supabase.from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'agent').eq('department_id', deptId).eq('is_active', true);

    // ── Average resolution time ────────────────────────────────────
    const { data: avgData } = await supabase.pool.query(`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric, 1) AS avg_hours
      FROM declarations
      WHERE department_id = $1 AND resolved_at IS NOT NULL AND is_deleted = false
    `, [deptId]).catch(() => ({ rows: [{ avg_hours: 0 }] }));
    const avg_hours = parseFloat((avgData?.rows?.[0]?.avg_hours) || 0);

    // ── Priority distribution ──────────────────────────────────────
    const [{ count: urgentCount }, { count: normalCount }, { count: faibleCount }] = await Promise.all([
      supabase.from('declarations').select('id', { count: 'exact', head: true })
        .eq('department_id', deptId).eq('priority', 'haute').eq('is_deleted', false),
      supabase.from('declarations').select('id', { count: 'exact', head: true })
        .eq('department_id', deptId).eq('priority', 'moyenne').eq('is_deleted', false),
      supabase.from('declarations').select('id', { count: 'exact', head: true })
        .eq('department_id', deptId).eq('priority', 'basse').eq('is_deleted', false),
    ]);

    // ── Urgent declarations (pending, high priority) ───────────────
    const { data: urgentDecls } = await supabase.from('declarations')
      .select('id, ref_citoyen, ref_service, title, category, priority, status, created_at, delegation_id, votes_count, image_url, photo_avant')
      .eq('department_id', deptId).eq('status', 'assignee_chef').eq('is_deleted', false)
      .order('priority_score', { ascending: false }).limit(6);

    // Enrich with delegation name
    let urgentEnriched = urgentDecls || [];
    const delIds = [...new Set(urgentEnriched.map(d => d.delegation_id).filter(Boolean))];
    if (delIds.length) {
      const { data: dels } = await supabase.from('delegations').select('id, name').in('id', delIds);
      const delMap = {};
      if (dels) dels.forEach(d => delMap[d.id] = d.name);
      urgentEnriched = urgentEnriched.map(d => ({ ...d, delegation_name: delMap[d.delegation_id] || '', image_url: d.image_url || d.photo_avant }));
    }

    // ── Recent declarations (last 8) ───────────────────────────────
    const { data: recentDecls } = await supabase.from('declarations')
      .select('id, ref_citoyen, title, category, priority, status, created_at, delegation_id, votes_count, citizen_id, agent_id, image_url, photo_avant')
      .eq('department_id', deptId).eq('is_deleted', false)
      .order('created_at', { ascending: false }).limit(8);

    let recentEnriched = recentDecls || [];
    if (recentEnriched.length) {
      // Delegation names
      const rDelIds = [...new Set(recentEnriched.map(d => d.delegation_id).filter(Boolean))];
      const rCitIds = [...new Set(recentEnriched.map(d => d.citizen_id).filter(Boolean))];
      const [delsRes, citsRes] = await Promise.all([
        rDelIds.length ? supabase.from('delegations').select('id, name').in('id', rDelIds) : { data: [] },
        rCitIds.length ? supabase.from('users').select('id, first_name, last_name').in('id', rCitIds) : { data: [] },
      ]);
      const dMap = {};
      if (delsRes.data) delsRes.data.forEach(d => dMap[d.id] = d.name);
      const cMap = {};
      if (citsRes.data) citsRes.data.forEach(u => cMap[u.id] = `${u.first_name} ${u.last_name}`);
      recentEnriched = recentEnriched.map(d => ({
        ...d,
        delegation_name: dMap[d.delegation_id] || '',
        citizen_name:    cMap[d.citizen_id]    || '',
        image_url:       d.image_url || d.photo_avant,
      }));
    }

    // ── Agent workload ─────────────────────────────────────────────
    const { data: agentRows } = await supabase.from('users')
      .select('id, first_name, last_name, is_active')
      .eq('role', 'agent').eq('department_id', deptId);

    const agentWorkload = await Promise.all((agentRows || []).map(async (a) => {
      const [{ count: active }, { count: resolvedA }] = await Promise.all([
        supabase.from('declarations').select('id', { count: 'exact', head: true })
          .eq('agent_id', a.id).in('status', ['assignee_agent', 'en_cours']).eq('is_deleted', false),
        supabase.from('declarations').select('id', { count: 'exact', head: true })
          .eq('agent_id', a.id).in('status', ['resolue', 'cloturee']).eq('is_deleted', false),
      ]);
      return {
        id:             a.id,
        name:           `${a.first_name} ${a.last_name}`,
        initials:       `${a.first_name?.[0] || '?'}${a.last_name?.[0] || '?'}`.toUpperCase(),
        active_tasks:   active   || 0,
        resolved_count: resolvedA || 0,
        avg_rating:     0,
        is_active:      a.is_active,
      };
    }));

    return res.status(200).json({
      kpis: {
        total,
        pending,
        en_cours,
        resolved,
        refused,
        active_agents:         activeAgents || 0,
        resolution_rate:       total > 0 ? Math.round((resolved / total) * 100) : 0,
        avg_resolution_hours:  avg_hours,
      },
      status_chart: [
        { name: 'En attente',   value: pending,  color: '#8B5CF6' },
        { name: 'En cours',     value: en_cours, color: '#3B82F6' },
        { name: 'Résolues',     value: resolved, color: '#10B981' },
        { name: 'Refusées',     value: refused,  color: '#EF4444' },
      ].filter(s => s.value > 0),
      priority_chart: [
        { name: 'Faible',  value: faibleCount  || 0, color: '#10B981' },
        { name: 'Normal',  value: normalCount  || 0, color: '#F59E0B' },
        { name: 'Urgent',  value: urgentCount  || 0, color: '#EF4444' },
      ],
      urgent_declarations: urgentEnriched,
      recent_declarations: recentEnriched,
      agent_workload:      agentWorkload,
    });
  } catch (err) {
    console.error('[Chef] dashboard error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/chef/export ──────────── */
exports.exportData = async (req, res) => {
  try {
    const { data, error } = await supabase.from('declarations')
      .select('ref_citoyen, ref_service, title, category, status, created_at, assigned_at, resolved_at')
      .eq('department_id', req.user.department_id).eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    const hdrs = ['ref_citoyen','ref_service','title','category','status','created_at','assigned_at','resolved_at'];
    const rows = [hdrs.join(',')];
    (data || []).forEach(r => rows.push(hdrs.map(h => `"${(r[h] ?? '').toString().replace(/"/g,'""')}"`).join(',')));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=department_export.csv');
    return res.status(200).send('\uFEFF' + rows.join('\n'));
  } catch (err) {
    console.error('[Chef] exportData error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/chef/declarations/:id/comments ──────────── */
exports.listComments = async (req, res) => {
  try {
    const { id } = req.params;
    const deptId = req.user.department_id;

    const { data: decl } = await supabase.from('declarations')
      .select('department_id').eq('id', id).eq('is_deleted', false).single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== deptId) return res.status(403).json({ error: 'Hors département.' });

    let { data, error } = await supabase.from('internal_comments')
      .select('*').eq('declaration_id', id)
      .in('channel', ['president_chef', 'chef_agent']).order('created_at', { ascending: true });

    if (error) {
      // Fallback if channel column missing
      const { data: d2 } = await supabase.from('internal_comments')
        .select('*').eq('declaration_id', id).order('created_at', { ascending: true });
      data = (d2 || []).map(c => ({ ...c, channel: 'president_chef' }));
    }

    if (data?.length) {
      const uIds = [...new Set(data.map(d => d.user_id).filter(Boolean))];
      if (uIds.length) {
        const { data: uD } = await supabase.from('users').select('id, first_name, last_name, role').in('id', uIds);
        const uMap = {};
        if (uD) uD.forEach(u => uMap[u.id] = u);
        data = data.map(d => ({ ...d, user: uMap[d.user_id] || null }));
      }
    }

    return res.status(200).json({ comments: data || [] });
  } catch (err) {
    console.error('[Chef] listComments error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/chef/declarations/:id/comments ──────────── */
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, channel = 'president_chef' } = req.body;
    const deptId = req.user.department_id;

    if (!content?.trim()) return res.status(400).json({ error: 'Contenu requis.' });
    if (!['president_chef','chef_agent'].includes(channel)) return res.status(403).json({ error: 'Canal non autorisé.' });

    const { data: decl } = await supabase.from('declarations')
      .select('department_id').eq('id', id).eq('is_deleted', false).single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== deptId) return res.status(403).json({ error: 'Hors département.' });

    const { data: comment, error } = await supabase.from('internal_comments')
      .insert({ declaration_id: id, user_id: req.user.id, content: content.trim(), channel })
      .select('*').single();

    if (error) {
      if (error.code === '42703') {
        // channel column missing — insert without it
        const { data: c2, error: e2 } = await supabase.from('internal_comments')
          .insert({ declaration_id: id, user_id: req.user.id, content: content.trim() })
          .select('*').single();
        if (e2) return res.status(500).json({ error: 'Erreur serveur.' });
        return res.status(201).json({ comment: { ...c2, channel } });
      }
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    return res.status(201).json({ comment });
  } catch (err) {
    console.error('[Chef] addComment error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};