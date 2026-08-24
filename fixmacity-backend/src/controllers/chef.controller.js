// ════════════════════════════════════════════════════════════════════
// chef.controller.js  — FULL REPLACEMENT
// Fixes:const { notifyStatusChange, notifyAgentAssigned } = require('../services/notification.service');
//   1. 'soumis' → 'soumise' (enum crash fix throughout)
//   2. dashboard now returns kpis, status_chart, priority_chart,
//      urgent_declarations, recent_declarations, agent_workload
//      so ChefDashboard.tsx gets exactly what it expects
// ════════════════════════════════════════════════════════════════════

'use strict';
const { notifyStatusChange, notifyAgentAssigned, notifyChefRejected, notify, TYPES } = require('../services/notification.service');
const supabase = require('../config/db');
const { validationResult } = require('express-validator');
const { logStatusChange } = require('../services/statusHistory.service');
const { cloudinary } = require('../config/cloudinary');

const priorityService = require('../services/priority.service');

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

    const { data: dsRows, error: dsErr } = await supabase
      .from('declaration_services')
      .select('declaration_id')
      .eq('service_id', deptId);

    if (dsErr) {
      console.error('[Chef] listDeclarations dsErr:', dsErr.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    const assignedDeclIds = dsRows.map(r => r.declaration_id);

    if (assignedDeclIds.length === 0) {
      return res.status(200).json({ declarations: [], total: 0, page: +page, limit: +limit });
    }

    let q = supabase
      .from('declarations')
      .select('*', { count: 'exact' })
      .in('id', assignedDeclIds)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
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

    // Enrich with assigned agents (for Mes Missions avatar display)
    if (data && data.length > 0) {
      const declIds = data.map(d => d.id);
      const { data: dsRows } = await supabase
        .from('declaration_services')
        .select('id, declaration_id')
        .in('declaration_id', declIds)
        .eq('service_id', deptId);

      const dsIdToDeclId = {};
      const dsIds = [];
      (dsRows || []).forEach(r => { dsIdToDeclId[r.id] = r.declaration_id; dsIds.push(r.id); });

      let agentsByDecl = {};
      if (dsIds.length > 0) {
        const { data: dsaRows } = await supabase
          .from('declaration_service_agents')
          .select('declaration_service_id, agent_id')
          .in('declaration_service_id', dsIds);

        const agentIds = [...new Set((dsaRows || []).map(r => r.agent_id).filter(Boolean))];
        let agentMap = {};
        if (agentIds.length) {
          const { data: agentUsers } = await supabase.from('users')
            .select('id, first_name, last_name').in('id', agentIds);
          (agentUsers || []).forEach(a => agentMap[a.id] = a);
        }

        (dsaRows || []).forEach(r => {
          const declId = dsIdToDeclId[r.declaration_service_id];
          if (!declId) return;
          if (!agentsByDecl[declId]) agentsByDecl[declId] = [];
          if (agentMap[r.agent_id]) agentsByDecl[declId].push(agentMap[r.agent_id]);
        });
      }

      data = data.map(d => ({ ...d, assigned_agents: agentsByDecl[d.id] || [] }));
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
      .eq('id', id)
      .or('is_deleted.eq.false,is_deleted.is.null').single();

    if (error || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });

    // Verify the department is assigned to this declaration
    const { data: checkDs } = await supabase
      .from('declaration_services')
      .select('id')
      .eq('declaration_id', id)
      .eq('service_id', deptId)
      .maybeSingle();

    if (!checkDs) return res.status(403).json({ error: 'Hors de votre département.' });

    // Enrich users
    const userIds = [decl.citizen_id].filter(Boolean);
    const userMap = {};
    if (userIds.length) {
      const { data: uD } = await supabase.from('users')
        .select('id, first_name, last_name, email, phone').in('id', userIds);
      if (uD) uD.forEach(u => userMap[u.id] = u);
    }

    const fullDecl = { ...decl, citizen: userMap[decl.citizen_id] || null, assigned_agent: null };

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

    // ── other_services: other departments also assigned to this declaration ──
    let other_services = [];
    const { data: dsRows } = await supabase
      .from('declaration_services')
      .select('service_id, chef_id, status')
      .eq('declaration_id', id)
      .neq('service_id', deptId);

    if (dsRows && dsRows.length > 0) {
      const svcIds = [...new Set(dsRows.map(r => r.service_id).filter(Boolean))];
      const chefIds = [...new Set(dsRows.map(r => r.chef_id).filter(Boolean))];
      const [svcsRes, chefsRes] = await Promise.all([
        svcIds.length ? supabase.from('services').select('id, name_fr').in('id', svcIds) : { data: [] },
        chefIds.length ? supabase.from('users').select('id, first_name, last_name').in('id', chefIds) : { data: [] },
      ]);
      const svcMap = {};
      const chefMap = {};
      if (svcsRes.data) svcsRes.data.forEach(s => svcMap[s.id] = s.name_fr);
      if (chefsRes.data) chefsRes.data.forEach(u => chefMap[u.id] = `${u.first_name} ${u.last_name}`);
      other_services = dsRows.map(r => ({
        service_id: r.service_id,
        service_name: svcMap[r.service_id] || r.service_id,
        chef_name: chefMap[r.chef_id] || '—',
        status: r.status,
      }));
    }

    // ── assigned_agents: agents on THIS chef's declaration_services row ──────
    let assigned_agents = [];
    const { data: dsOwnRow } = await supabase
      .from('declaration_services')
      .select('id')
      .eq('declaration_id', id)
      .eq('service_id', deptId)
      .maybeSingle();

    if (dsOwnRow) {
      const { data: dsaRows } = await supabase
        .from('declaration_service_agents')
        .select('agent_id')
        .eq('declaration_service_id', dsOwnRow.id);
      if (dsaRows && dsaRows.length > 0) {
        const agentIds = dsaRows.map(r => r.agent_id).filter(Boolean);
        if (agentIds.length) {
          const { data: agentUsers } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .in('id', agentIds);
          assigned_agents = agentUsers || [];
        }
      }
    }

    return res.status(200).json({
      declaration: fullDecl,
      ...fullDecl,  // backward compat root fields
      // sensitive_places is already part of fullDecl spread above
      photos: photosRes.data || [],
      history,
      comments,
      other_services,
      assigned_agents,
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
    // Support both old single agent_id and new agent_ids array
    let { agent_id, agent_ids } = req.body;
    const deptId = req.user.department_id;

    // Normalize to array
    if (!agent_ids && agent_id) agent_ids = [agent_id];
    if (!agent_ids) agent_ids = [];

    const { data: decl, error: fetchErr } = await supabase.from('declarations')
      .select('id, status, department_id, service_id, citizen_id').eq('id', id).or('is_deleted.eq.false,is_deleted.is.null').single();
    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.service_id !== deptId) return res.status(403).json({ error: 'Hors département.' });
    if (!['assignee_chef', 'assignee_agent'].includes(decl.status)) {
      return res.status(400).json({ error: `Statut actuel "${decl.status}" — impossible d'accepter ou d'assigner.` });
    }

    // ── Case 1: "Assigner plus tard" — accept with no agent ──────────────────
    if (agent_ids.length === 0) {
      // Upsert a declaration_services row so this chef "owns" the declaration
      await supabase.from('declaration_services')
        .upsert(
          { declaration_id: id, service_id: deptId, chef_id: req.user.id, status: 'assignee_agent', updated_at: new Date().toISOString() },
          { onConflict: 'declaration_id,service_id' }
        );

      // Declaration becomes assignee_agent (chef accepted, waiting to assign agent)
      const { data: updated, error: updateErr } = await supabase.from('declarations')
        .update({ status: 'assignee_agent', updated_at: new Date().toISOString() })
        .eq('id', id).select('*').single();
      if (updateErr) return res.status(500).json({ error: 'Erreur serveur.' });

      if (decl.status === 'assignee_chef') {
        await logStatusChange(id, 'assignee_chef', 'assignee_agent', req.user.id, 'Accepté — agent à assigner');
        await notifyStatusChange(req.app, updated, updated.citizen_id, 'assignee_agent');
      }
      return res.status(200).json({ declaration: updated, deferred: true });
    }

    // ── Case 2: Accept & assign agent(s) ─────────────────────────────────────
    // Validate agents
    const { data: agentUsers, error: agentErr } = await supabase.from('users')
      .select('id, first_name, last_name, department_id, role, is_active')
      .in('id', agent_ids);
    const invalid = (agentUsers || []).filter(a => a.role !== 'agent' || !a.is_active || a.department_id !== deptId);
    if (invalid.length > 0) return res.status(400).json({ error: `Agent(s) invalides: ${invalid.map(a => `${a.first_name} ${a.last_name}`).join(', ')}` });

    // Upsert declaration_services
    const { data: dsRow, error: dsErr } = await supabase.from('declaration_services')
      .upsert(
        { declaration_id: id, service_id: deptId, chef_id: req.user.id, status: 'assignee_agent', updated_at: new Date().toISOString() },
        { onConflict: 'declaration_id,service_id' }
      ).select('id').single();
    if (dsErr) return res.status(500).json({ error: 'Erreur lors de l\'assignation du service.' });

    // Replace agent assignments
    await supabase.from('declaration_service_agents').delete().eq('declaration_service_id', dsRow.id);
    const insertRows = agent_ids.map(aid => ({ declaration_service_id: dsRow.id, agent_id: aid, assigned_at: new Date().toISOString() }));
    if (insertRows.length) await supabase.from('declaration_service_agents').insert(insertRows);

    // Update declaration
    const { data: updated, error: updateErr } = await supabase.from('declarations')
      .update({ status: 'assignee_agent', agent_id: agent_ids[0], updated_at: new Date().toISOString() })
      .eq('id', id).select('*').single();
    if (updateErr) return res.status(500).json({ error: 'Erreur serveur.' });

    await logStatusChange(id, decl.status, 'assignee_agent', req.user.id,
      `Assigné à ${(agentUsers || []).map(a => `${a.first_name} ${a.last_name}`).join(', ')}`);

    if (decl.status === 'assignee_chef') {
      await notifyStatusChange(req.app, updated, updated.citizen_id, 'assignee_agent');
    }
    for (const aid of agent_ids) {
      await notifyAgentAssigned(req.app, updated, aid).catch((err) => {
        console.error('[Chef] Error notifying agent:', err);
      });
    }

    return res.status(200).json({ declaration: updated, assigned_agents: agentUsers || [] });
  } catch (err) {
    console.error('[Chef] acceptDeclaration error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/chef/declarations/:id/refuse ──────────── */
exports.refuseDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, motif } = req.body;
    const refusalReason = motif || reason;
    if (!refusalReason || refusalReason.trim().length < 10) return res.status(400).json({ error: 'Le motif de refus est obligatoire' });

    const { data: decl, error: fetchErr } = await supabase.from('declarations')
      .select('id, status, department_id, service_id, citizen_id').eq('id', id).or('is_deleted.eq.false,is_deleted.is.null').single();
    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.service_id !== req.user.department_id) return res.status(403).json({ error: 'Hors département.' });
    if (decl.status !== 'assignee_chef') return res.status(400).json({ error: `Statut actuel "${decl.status}" — impossible de refuser.` });

    const { data: updated, error: updateErr } = await supabase.from('declarations')
      .update({ status: 'refusee_chef', updated_at: new Date().toISOString() })
      .eq('id', id).select('*').single();
    if (updateErr) return res.status(500).json({ error: 'Erreur serveur.' });

    await logStatusChange(id, 'assignee_chef', 'refusee_chef', req.user.id, refusalReason.trim());
    await notifyStatusChange(req.app, updated, updated.citizen_id, 'refusee_chef');
    await notifyChefRejected(req.app, updated, refusalReason.trim());
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
          .eq('agent_id', agent.id).in('status', ['assignee_agent', 'en_cours']).or('is_deleted.eq.false,is_deleted.is.null'),
        supabase.from('declarations').select('id', { count: 'exact', head: true })
          .eq('agent_id', agent.id).in('status', ['resolue', 'cloturee']).or('is_deleted.eq.false,is_deleted.is.null'),
      ]);
      return { ...agent, workload: activeCount || 0, resolved_count: resolvedCount || 0, is_overloaded: (activeCount || 0) >= 3 };
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

    if (!email?.trim()) return res.status(400).json({ error: "Le champ 'Email' est obligatoire." });
    if (!first_name?.trim()) return res.status(400).json({ error: "Le champ 'Prénom' est obligatoire." });
    if (!last_name?.trim()) return res.status(400).json({ error: "Le champ 'Nom' est obligatoire." });
    if (!password) return res.status(400).json({ error: "Le champ 'Mot de passe' est obligatoire." });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Adresse e-mail invalide.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
    if (existing) return res.status(409).json({ error: "L'adresse e-mail est déjà utilisée." });

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
    if (last_name) updates.last_name = last_name.trim();
    if (email) updates.email = email.toLowerCase().trim();

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
        .eq('agent_id', id).in('status', ['assignee_agent', 'en_cours']).or('is_deleted.eq.false,is_deleted.is.null');
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
        .eq('department_id', deptId).eq('status', s).or('is_deleted.eq.false,is_deleted.is.null');
      statusCounts[s] = count || 0;
    }));

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const pending = statusCounts['assignee_chef'] || 0;
    const en_cours = (statusCounts['assignee_agent'] || 0) + (statusCounts['en_cours'] || 0);
    const resolved = (statusCounts['resolue'] || 0) + (statusCounts['cloturee'] || 0);
    const refused = (statusCounts['refusee_chef'] || 0) + (statusCounts['refusee_agent'] || 0);

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
        .eq('department_id', deptId).eq('priority', 'haute').or('is_deleted.eq.false,is_deleted.is.null'),
      supabase.from('declarations').select('id', { count: 'exact', head: true })
        .eq('department_id', deptId).eq('priority', 'moyenne').or('is_deleted.eq.false,is_deleted.is.null'),
      supabase.from('declarations').select('id', { count: 'exact', head: true })
        .eq('department_id', deptId).eq('priority', 'basse').or('is_deleted.eq.false,is_deleted.is.null'),
    ]);

    // ── Urgent declarations (pending, high priority) ───────────────
    const { data: urgentDecls } = await supabase.from('declarations')
      .select('id, ref_citoyen, ref_service, title, category, priority, status, created_at, delegation_id, votes_count, image_url, photo_avant')
      .eq('department_id', deptId).eq('status', 'assignee_chef').or('is_deleted.eq.false,is_deleted.is.null')
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
      .eq('department_id', deptId).or('is_deleted.eq.false,is_deleted.is.null')
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
        citizen_name: cMap[d.citizen_id] || '',
        image_url: d.image_url || d.photo_avant,
      }));
    }

    // ── Agent workload ─────────────────────────────────────────────
    const { data: agentRows } = await supabase.from('users')
      .select('id, first_name, last_name, is_active')
      .eq('role', 'agent').eq('department_id', deptId);

    const agentWorkload = await Promise.all((agentRows || []).map(async (a) => {
      const [{ count: active }, { count: resolvedA }] = await Promise.all([
        supabase.from('declarations').select('id', { count: 'exact', head: true })
          .eq('agent_id', a.id).in('status', ['assignee_agent', 'en_cours']).or('is_deleted.eq.false,is_deleted.is.null'),
        supabase.from('declarations').select('id', { count: 'exact', head: true })
          .eq('agent_id', a.id).in('status', ['resolue', 'cloturee']).or('is_deleted.eq.false,is_deleted.is.null'),
      ]);
      return {
        id: a.id,
        name: `${a.first_name} ${a.last_name}`,
        initials: `${a.first_name?.[0] || '?'}${a.last_name?.[0] || '?'}`.toUpperCase(),
        active_tasks: active || 0,
        resolved_count: resolvedA || 0,
        avg_rating: 0,
        is_active: a.is_active,
      };
    }));

    return res.status(200).json({
      kpis: {
        total,
        pending,
        en_cours,
        resolved,
        refused,
        active_agents: activeAgents || 0,
        resolution_rate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        avg_resolution_hours: avg_hours,
      },
      status_chart: [
        { name: 'En attente', value: pending, color: '#8B5CF6' },
        { name: 'En cours', value: en_cours, color: '#3B82F6' },
        { name: 'Résolues', value: resolved, color: '#10B981' },
        { name: 'Refusées', value: refused, color: '#EF4444' },
      ].filter(s => s.value > 0),
      priority_chart: [
        { name: 'Faible', value: faibleCount || 0, color: '#10B981' },
        { name: 'Normal', value: normalCount || 0, color: '#F59E0B' },
        { name: 'Urgent', value: urgentCount || 0, color: '#EF4444' },
      ],
      urgent_declarations: urgentEnriched,
      recent_declarations: recentEnriched,
      agent_workload: agentWorkload,
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
      .eq('department_id', req.user.department_id).or('is_deleted.eq.false,is_deleted.is.null')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    const hdrs = ['ref_citoyen', 'ref_service', 'title', 'category', 'status', 'created_at', 'assigned_at', 'resolved_at'];
    const rows = [hdrs.join(',')];
    (data || []).forEach(r => rows.push(hdrs.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')));

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
      .select('department_id, service_id').eq('id', id).or('is_deleted.eq.false,is_deleted.is.null').single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.service_id !== deptId) return res.status(403).json({ error: 'Hors département.' });

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
    if (!['president_chef', 'chef_agent'].includes(channel)) return res.status(403).json({ error: 'Canal non autorisé.' });

    const { data: decl } = await supabase.from('declarations')
      .select('department_id, service_id, agent_id').eq('id', id).or('is_deleted.eq.false,is_deleted.is.null').single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.service_id !== deptId) return res.status(403).json({ error: 'Hors département.' });

    let finalComment;
    const { data: comment, error } = await supabase.from('internal_comments')
      .insert({ declaration_id: id, user_id: req.user.id, content: content.trim(), channel })
      .select('*').single();

    if (error) {
      if (error.code === '42703') {
        const { data: c2, error: e2 } = await supabase.from('internal_comments')
          .insert({ declaration_id: id, user_id: req.user.id, content: content.trim() })
          .select('*').single();
        if (e2) return res.status(500).json({ error: 'Erreur serveur.' });
        finalComment = { ...c2, channel };
      } else {
        return res.status(500).json({ error: 'Erreur serveur.' });
      }
    } else {
      finalComment = comment;
    }

    // Send notifications
    try {
      const chefName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Chef de Service';
      if (channel === 'president_chef') {
        const { data: pres } = await supabase.from('users').select('id').eq('role', 'president').eq('is_active', true).limit(1).maybeSingle();
        if (pres?.id) {
          await notify(req.app, {
            userId: pres.id,
            type: TYPES.INTERNAL_COMMENT || 'INTERNAL_COMMENT',
            title: 'Nouveau message d\'un Chef',
            body: `${chefName}: ${content.trim().substring(0, 80)}`,
            declarationId: id,
          });
        }
      } else if (channel === 'chef_agent') {
        if (decl.agent_id) {
          await notify(req.app, {
            userId: decl.agent_id,
            type: TYPES.INTERNAL_COMMENT || 'INTERNAL_COMMENT',
            title: 'Nouveau message de votre Chef',
            body: `${chefName}: ${content.trim().substring(0, 80)}`,
            declarationId: id,
          });
        }
      }
    } catch (notifErr) {
      console.error('[Chef] addComment notification error:', notifErr);
    }

    return res.status(201).json({ comment: finalComment });
  } catch (err) {
    console.error('[Chef] addComment error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};


/* ──────────── POST /api/chef/declarations/:id/secondary-departments ──────────── */
exports.addSecondaryDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_id, reason } = req.body;
    const deptId = req.user.department_id;

    if (!department_id) return res.status(400).json({ error: 'department_id requis.' });

    const { data: decl, error: declErr } = await supabase
      .from('declarations')
      .select('id, department_id')
      .eq('id', id)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .single();

    if (declErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== deptId) return res.status(403).json({ error: 'Hors département.' });

    const { data: inserted, error: insertErr } = await supabase
      .from('declaration_secondary_departments')
      .insert({
        declaration_id: id,
        department_id,
        reason,
        added_by: req.user.id
      })
      .select('*')
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') return res.status(409).json({ error: 'Département déjà ajouté.' });
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    return res.status(201).json({ message: 'Département secondaire ajouté.', data: inserted });
  } catch (err) {
    console.error('[Chef] addSecondaryDepartment error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/chef/departments ──────────── */
exports.listDepartments = async (req, res) => {
  try {
    const { data: departments, error } = await supabase
      .from('departments')
      .select('id, name_fr, name_ar')
      .eq('is_active', true)
      .neq('id', req.user.department_id)
      .order('name_fr');

    if (error) throw error;
    res.json({ departments: departments || [] });
  } catch (error) {
    console.error('[Chef listDepartments] error:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des départements' });
  }
};

/* ──────────── POST /api/chef/declarations/:id/photo ──────────── */
exports.uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const chefId = req.user.id;
    const deptId = req.user.department_id;

    if (!req.file) return res.status(450).json({ error: 'Aucun fichier fourni.' });

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, status, department_id')
      .eq('id', id)
      .eq('department_id', deptId)
      .single();

    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable ou hors département.' });
    if (decl.status === 'cloturee') {
      return res.status(403).json({ error: 'Photos interdites après clôture.' });
    }

    const fs = require('fs');
    const path = require('path');
    let photoUrl, publicId = null;

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `fixmacity/interventions/${id}`, resource_type: 'image' },
          (err, r) => (err ? reject(err) : resolve(r))
        );
        stream.end(req.file.buffer);
      });
      photoUrl = result.secure_url;
      publicId = result.public_id;
    } else {
      const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `intervention_${chefId}_${Date.now()}${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
      const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5005}`;
      photoUrl = `${base}/uploads/${filename}`;
    }

    const { error: insertErr } = await supabase
      .from('declaration_photos')
      .insert({
        declaration_id: id,
        url: photoUrl,
        public_id: publicId,
        uploaded_by: chefId,
        photo_type: 'after'
      });

    if (insertErr) throw insertErr;

    res.status(201).json({ url: photoUrl, message: 'Photo téléversée avec succès.' });
  } catch (err) {
    console.error('[Chef] uploadPhoto:', err.message);
    res.status(500).json({ error: 'Erreur lors du téléversement.' });
  }
};

