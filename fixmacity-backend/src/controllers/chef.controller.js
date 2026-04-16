const supabase = require('../config/db');
const { validationResult } = require('express-validator');
const { logStatusChange } = require('../services/statusHistory.service');
const {
  notifyStatusChange,
  notifyAgentAssigned,
  notifyChefRejected,
} = require('../services/notification.service');

/* ──────────── GET /api/chef/declarations ──────────── */
exports.listDeclarations = async (req, res) => {
  try {
    const deptId = req.user.department_id;
    if (!deptId) return res.status(400).json({ error: 'Aucun département associé.' });

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let q = supabase.from('declarations')
      .select('id, status, title, category, ref_citoyen, ref_service, created_at, delegation_id, department_id, citizen_id, agent_id', { count: 'exact' })
      .eq('department_id', deptId).is('deleted_at', null)
      .order('created_at', { ascending: false }).range(offset, offset + Number(limit) - 1);
    if (status) q = q.eq('status', status);

    const { data, error, count } = await q;
    if (error) return res.status(500).json({ error: 'Erreur serveur.' });
    return res.status(200).json({ declarations: data, total: count, page: +page, limit: +limit });
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── POST /api/chef/declarations/:id/accept ──────────── */
exports.acceptDeclaration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { agent_id } = req.body;

    const { data: decl } = await supabase.from('declarations').select('id, status, department_id').eq('id', id).is('deleted_at', null).single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id) return res.status(403).json({ error: 'Hors département.' });
    if (decl.status !== 'assignee_chef') return res.status(400).json({ error: 'Statut invalide.' });

    if (agent_id) {
      const { data: agent } = await supabase.from('users').select('id, department_id, role, is_active').eq('id', agent_id).single();
      if (!agent || agent.role !== 'agent' || !agent.is_active || agent.department_id !== req.user.department_id)
        return res.status(400).json({ error: 'Agent invalide.' });
    }

    const { data: updated, error } = await supabase.from('declarations')
      .update({ status: 'assignee_agent', agent_id: agent_id || null }).eq('id', id).select('*').single();
    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    await logStatusChange(id, 'assignee_chef', 'assignee_agent', req.user.id);
    await notifyStatusChange(req.app, updated, updated.user_id, 'assignee_agent').catch(() => { });
    if (agent_id) await notifyAgentAssigned(req.app, updated, agent_id).catch(() => { });

    return res.status(200).json({ declaration: updated });
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── POST /api/chef/declarations/:id/refuse ──────────── */
exports.refuseDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) return res.status(400).json({ error: 'Le motif de refus est obligatoire.' });

    const { data: decl } = await supabase.from('declarations').select('id, status, department_id').eq('id', id).is('deleted_at', null).single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id) return res.status(403).json({ error: 'Hors département.' });
    if (decl.status !== 'assignee_chef') return res.status(400).json({ error: 'Statut invalide.' });

    const { data: updated, error } = await supabase.from('declarations').update({ status: 'refusee_chef' }).eq('id', id).select('*').single();
    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    await logStatusChange(id, 'assignee_chef', 'refusee_chef', req.user.id, reason.trim());
    await notifyChefRejected(req.app, updated, reason.trim()).catch(() => { });
    await notifyStatusChange(req.app, updated, updated.user_id, 'refusee_chef').catch(() => { });

    return res.status(200).json({ declaration: updated });
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── GET /api/chef/agents ──────────── */
exports.listAgents = async (req, res) => {
  try {
    const { data: agents, error } = await supabase.from('users')
      .select('id, email, first_name, last_name, is_active, created_at')
      .eq('role', 'agent').eq('department_id', req.user.department_id).order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    const agentIds = (agents || []).map(a => a.id);
    let workloads = {};
    if (agentIds.length > 0) {
      const wlRes = await supabase.pool.query(
        `SELECT agent_id, COUNT(*) as count FROM declarations 
         WHERE agent_id = ANY($1) AND status IN ('assignee_agent', 'en_cours') AND deleted_at IS NULL 
         GROUP BY agent_id`,
        [agentIds]
      );
      wlRes.rows.forEach(r => { workloads[r.agent_id] = parseInt(r.count, 10); });
    }
    const result = (agents || []).map(a => ({ ...a, workload: workloads[a.id] || 0 }));
    return res.status(200).json({ agents: result });
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── PATCH /api/chef/agents/:id/deactivate ──────────── */
exports.deactivateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: agent } = await supabase.from('users').select('id, role, department_id').eq('id', id).single();
    if (!agent) return res.status(404).json({ error: 'Agent introuvable.' });
    if (agent.role !== 'agent') return res.status(400).json({ error: 'Pas un agent.' });
    if (agent.department_id !== req.user.department_id) return res.status(403).json({ error: 'Hors département.' });

    const OPEN_STATUSES = ['assignee_agent', 'en_cours'];
    const { data: openDecls } = await supabase
      .from('declarations')
      .select('id, status')
      .eq('agent_id', id)
      .in('status', OPEN_STATUSES)
      .is('deleted_at', null);

    if (openDecls && openDecls.length > 0) {
      for (const decl of openDecls) {
        await supabase.from('declarations')
          .update({ status: 'assignee_chef', agent_id: null })
          .eq('id', decl.id);
        await logStatusChange(
          decl.id, decl.status, 'assignee_chef', req.user.id,
          'Agent désactivé — déclaration réaffectée au chef de service.',
        ).catch(() => { });
      }
    }

    const { data: updated, error } = await supabase.from('users').update({ is_active: false }).eq('id', id)
      .select('id, email, first_name, last_name, is_active').single();
    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    return res.status(200).json({
      message: 'Agent désactivé.',
      agent: updated,
      declarations_reassigned: openDecls ? openDecls.length : 0,
    });
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── GET /api/chef/department ──────────── */
exports.getDepartment = async (req, res) => {
  try {
    const deptId = req.user.department_id;
    if (!deptId) return res.status(400).json({ error: 'Aucun département associé.' });

    const { data, error } = await supabase
      .from('services')
      .select('id, name_fr, name_ar, name_en, code, description, is_active')
      .eq('id', deptId)
      .single();

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });
    return res.status(200).json({ department: data });
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── PATCH /api/chef/department ──────────── */
exports.updateDepartment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const deptId = req.user.department_id;
    if (!deptId) return res.status(400).json({ error: 'Aucun département associé.' });

    const { name_fr, name_ar, name_en, description } = req.body;

    const updates = {};
    if (name_fr !== undefined) updates.name_fr = name_fr.trim();
    if (name_ar !== undefined) updates.name_ar = name_ar?.trim() || null;
    if (name_en !== undefined) updates.name_en = name_en?.trim() || null;
    if (description !== undefined) updates.description = description?.trim() || null;

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' });

    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', deptId)
      .select('id, name_fr, name_ar, name_en, code, description, is_active')
      .single();

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });
    return res.status(200).json({ department: data });
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── GET /api/chef/dashboard ──────────── */
exports.dashboard = async (req, res) => {
  try {
    const deptId = req.user.department_id;
    const { count: total } = await supabase.from('declarations').select('id', { count: 'exact', head: true }).eq('department_id', deptId).is('deleted_at', null);

    const statuses = ['assignee_chef', 'assignee_agent', 'en_cours', 'resolue', 'cloturee', 'refusee_chef', 'refusee_agent'];
    const statusRes = await supabase.pool.query(
      'SELECT status, COUNT(*) as count FROM declarations WHERE department_id = $1 AND deleted_at IS NULL GROUP BY status',
      [deptId]
    );
    const byStatus = {};
    statuses.forEach(s => byStatus[s] = 0);
    statusRes.rows.forEach(r => { byStatus[r.status] = parseInt(r.count, 10); });

    const { count: activeAgents } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'agent').eq('department_id', deptId).eq('is_active', true);
    return res.status(200).json({ total_declarations: total || 0, by_status: byStatus, active_agents: activeAgents || 0 });
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── GET /api/chef/export ──────────── */
exports.exportData = async (req, res) => {
  try {
    const { data, error } = await supabase.from('declarations')
      .select('ref_citoyen, ref_service, title, category, status, created_at, assigned_at, resolved_at')
      .eq('department_id', req.user.department_id).is('deleted_at', null).order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    const hdrs = ['ref_citoyen', 'ref_service', 'title', 'category', 'status', 'created_at', 'assigned_at', 'resolved_at'];
    const rows = [hdrs.join(',')];
    (data || []).forEach(r => rows.push(hdrs.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=department_export.csv');
    return res.status(200).send(rows.join('\n'));
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};
