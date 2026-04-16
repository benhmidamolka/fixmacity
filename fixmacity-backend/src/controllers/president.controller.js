const bcrypt = require('bcrypt');
const supabase = require('../config/db');
const { validationResult } = require('express-validator');
const { generateRefService } = require('../services/refGenerator.service');
const { logStatusChange } = require('../services/statusHistory.service');
const {
  notifyStatusChange,
  notifyChefAssigned,
} = require('../services/notification.service');

const SALT_ROUNDS = 12;

async function firstActiveChefId(departmentId) {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'chef')
    .eq('department_id', departmentId)
    .eq('is_active', true)
    .limit(1);
  return data?.[0]?.id || null;
}

/* ──────────── GET /api/president/declarations ──────────── */
exports.listDeclarations = async (req, res) => {
  try {
    const { status, delegation_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('declarations')
      .select('id, status, title, category, ref_citoyen, ref_service, created_at, delegation_id, department_id, citizen_id, agent_id', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status) query = query.eq('status', status);
    if (delegation_id) query = query.eq('delegation_id', delegation_id);

    const { data, error, count } = await query;
    if (error) { console.error('[President] ListDecl error:', error.message); return res.status(500).json({ error: 'Erreur serveur.' }); }
    return res.status(200).json({ declarations: data, total: count, page: +page, limit: +limit });
  } catch (err) { console.error('[President] ListDecl error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── POST /api/president/declarations/:id/assign ──────────── */
exports.assignDeclaration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { department_id } = req.body;

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations').select('id, status').eq('id', id).is('deleted_at', null).single();
    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.status !== 'soumise') return res.status(400).json({ error: 'Seules les déclarations au statut soumise peuvent être affectées.' });

    const refService = await generateRefService(department_id);

    const { data: updated, error: updateErr } = await supabase
      .from('declarations')
      .update({ status: 'assignee_chef', department_id, ref_service: refService, assigned_at: new Date().toISOString() })
      .eq('id', id).select('*').single();

    if (updateErr) { console.error('[President] Assign error:', updateErr.message); return res.status(500).json({ error: "Erreur lors de l'affectation." }); }

    await logStatusChange(id, 'soumise', 'assignee_chef', req.user.id);
    const chefId = await firstActiveChefId(department_id);
    if (chefId) await notifyChefAssigned(req.app, updated, chefId).catch(() => { });
    await notifyStatusChange(req.app, updated, updated.user_id, 'assignee_chef').catch(() => { });

    return res.status(200).json({ declaration: updated });
  } catch (err) { console.error('[President] Assign error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── POST /api/president/declarations/:id/reassign ──────────── */
exports.reassignDeclaration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { department_id } = req.body;

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations').select('id, status').eq('id', id).is('deleted_at', null).single();
    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (!['refusee_chef', 'refusee_agent'].includes(decl.status))
      return res.status(400).json({ error: 'Seules les déclarations refusées peuvent être réaffectées.' });

    const refService = await generateRefService(department_id);
    const oldStatus = decl.status;

    const { data: updated, error: updateErr } = await supabase
      .from('declarations')
      .update({ status: 'assignee_chef', department_id, ref_service: refService, assigned_at: new Date().toISOString() })
      .eq('id', id).select('*').single();

    if (updateErr) { console.error('[President] Reassign error:', updateErr.message); return res.status(500).json({ error: 'Erreur lors de la réaffectation.' }); }

    await logStatusChange(id, oldStatus, 'assignee_chef', req.user.id, 'Réaffectation par le président');
    const chefId = await firstActiveChefId(department_id);
    if (chefId) await notifyChefAssigned(req.app, updated, chefId).catch(() => { });
    await notifyStatusChange(req.app, updated, updated.user_id, 'assignee_chef').catch(() => { });

    return res.status(200).json({ declaration: updated });
  } catch (err) { console.error('[President] Reassign error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── GET /api/president/users ──────────── */
exports.listUsers = async (req, res) => {
  try {
    const { role, department_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, role, delegation_id, department_id, is_active, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (role) query = query.eq('role', role);
    if (department_id) query = query.eq('department_id', department_id);

    const { data, error, count } = await query;
    if (error) { console.error('[President] ListUsers error:', error.message); return res.status(500).json({ error: 'Erreur serveur.' }); }
    return res.status(200).json({ users: data, total: count, page: +page, limit: +limit });
  } catch (err) { console.error('[President] ListUsers error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── POST /api/president/users ──────────── */
exports.createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, first_name, last_name, role, department_id, delegation_id } = req.body;

    if (!['agent', 'chef'].includes(role))
      return res.status(400).json({ error: 'Le président ne peut créer que des comptes agent ou chef.' });

    const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: hashedPassword,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        role,
        department_id: department_id || null,
        delegation_id: delegation_id || null,
        is_active: true,
      })
      .select('id, email, first_name, last_name, role, department_id, delegation_id, is_active')
      .single();

    if (error) { console.error('[President] CreateUser error:', error.message); return res.status(500).json({ error: 'Erreur lors de la création du compte.' }); }
    return res.status(201).json({ user });
  } catch (err) { console.error('[President] CreateUser error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── PATCH /api/president/users/:id ──────────── */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const { role, department_id, is_active, delegation_id } = req.body;

    if (role !== undefined) updates.role = role;
    if (department_id !== undefined) updates.department_id = department_id;
    if (delegation_id !== undefined) updates.delegation_id = delegation_id;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' });

    const { data: user, error } = await supabase
      .from('users').update(updates).eq('id', id)
      .select('id, email, first_name, last_name, role, department_id, delegation_id, is_active').single();

    if (error) { console.error('[President] UpdateUser error:', error.message); return res.status(500).json({ error: 'Erreur lors de la mise à jour.' }); }
    return res.status(200).json({ user });
  } catch (err) { console.error('[President] UpdateUser error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── DELETE /api/president/users/:id ──────────── */
exports.deleteUser = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users').update({ is_active: false }).eq('id', req.params.id)
      .select('id, email, is_active').single();

    if (error) { console.error('[President] DeleteUser error:', error.message); return res.status(500).json({ error: 'Erreur serveur.' }); }
    return res.status(200).json({ message: 'Utilisateur désactivé.', user });
  } catch (err) { console.error('[President] DeleteUser error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── GET /api/president/departments ──────────── */
exports.listDepartments = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, name_fr, name_ar, name_en, code, description, is_active')
      .order('name_fr', { ascending: true });

    if (error) { console.error('[President] ListDept error:', error.message); return res.status(500).json({ error: 'Erreur serveur.' }); }
    return res.status(200).json({ departments: data });
  } catch (err) { console.error('[President] ListDept error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── POST /api/president/departments ──────────── */
exports.createDepartment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name_fr, name_ar, name_en, code, description } = req.body;

    const { data: existing } = await supabase
      .from('services').select('id').eq('code', code.toUpperCase().trim()).maybeSingle();
    if (existing) return res.status(409).json({ error: 'Ce code de département est déjà utilisé.' });

    const { data, error } = await supabase
      .from('services')
      .insert({
        name_fr: name_fr.trim(),
        name_ar: name_ar?.trim() || null,
        name_en: name_en?.trim() || null,
        code: code.toUpperCase().trim(),
        description: description?.trim() || null,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) { console.error('[President] CreateDept error:', error.message); return res.status(500).json({ error: 'Erreur serveur.' }); }
    return res.status(201).json({ department: data });
  } catch (err) { console.error('[President] CreateDept error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── PATCH /api/president/departments/:id ──────────── */
exports.updateDepartment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { name_fr, name_ar, name_en, description, is_active } = req.body;

    const updates = {};
    if (name_fr !== undefined) updates.name_fr = name_fr.trim();
    if (name_ar !== undefined) updates.name_ar = name_ar?.trim() || null;
    if (name_en !== undefined) updates.name_en = name_en?.trim() || null;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' });

    const { data, error } = await supabase
      .from('services').update(updates).eq('id', id)
      .select('id, name_fr, name_ar, name_en, code, description, is_active').single();

    if (error) { console.error('[President] UpdateDept error:', error.message); return res.status(500).json({ error: 'Erreur serveur.' }); }
    return res.status(200).json({ department: data });
  } catch (err) { console.error('[President] UpdateDept error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── DELETE /api/president/departments/:id ──────────── */
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const { count: activeDecls } = await supabase
      .from('declarations')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', id)
      .not('status', 'in', '(resolue,cloturee)')
      .is('deleted_at', null);

    if (activeDecls && activeDecls > 0) {
      return res.status(409).json({
        error: `Impossible de désactiver : ${activeDecls} déclaration(s) active(s) dans ce département.`,
      });
    }

    const { data, error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', id)
      .select('id, name_fr, is_active')
      .single();

    if (error) { console.error('[President] DeleteDept error:', error.message); return res.status(500).json({ error: 'Erreur serveur.' }); }
    return res.status(200).json({ message: 'Département désactivé.', department: data });
  } catch (err) { console.error('[President] DeleteDept error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── POST /api/president/propositions ──────────── */
exports.createProposition = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, start_date, end_date } = req.body;

    const { data: prop, error } = await supabase
      .from('propositions')
      .insert({ title: title.trim(), description: description.trim(), start_date: start_date || null, end_date: end_date || null, created_by: req.user.id })
      .select('*').single();

    if (error) { console.error('[President] CreateProp error:', error.message); return res.status(500).json({ error: 'Erreur serveur.' }); }
    return res.status(201).json({ proposition: prop });
  } catch (err) { console.error('[President] CreateProp error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── GET /api/president/dashboard ──────────── */
exports.dashboard = async (req, res) => {
  try {
    const { count: totalDecl } = await supabase
      .from('declarations').select('id', { count: 'exact', head: true }).is('deleted_at', null);

    const statusRes = await supabase.pool.query(
      'SELECT status, COUNT(*) as count FROM declarations WHERE deleted_at IS NULL GROUP BY status'
    );
    const byStatus = {};
    const statuses = ['soumise', 'assignee_chef', 'assignee_agent', 'en_cours', 'resolue', 'cloturee', 'refusee_chef', 'refusee_agent'];
    statuses.forEach(s => byStatus[s] = 0);
    statusRes.rows.forEach(r => { byStatus[r.status] = parseInt(r.count, 10); });

    const delRes = await supabase.pool.query(
      'SELECT delegation_id, COUNT(*) as count FROM declarations WHERE deleted_at IS NULL GROUP BY delegation_id'
    );
    const delegationCounts = {};
    delRes.rows.forEach(r => { delegationCounts[r.delegation_id] = parseInt(r.count, 10); });

    const { count: totalUsers } = await supabase.from('users').select('id', { count: 'exact', head: true });

    const avgRes = await supabase.pool.query('SELECT AVG(score) as avg FROM ratings');
    const avgRating = avgRes.rows[0]?.avg ? parseFloat(avgRes.rows[0].avg).toFixed(2) : null;

    return res.status(200).json({
      total_declarations: totalDecl || 0,
      by_status: byStatus,
      by_delegation: delegationCounts,
      total_users: totalUsers || 0,
      average_rating: avgRating,
    });
  } catch (err) { console.error('[President] Dashboard error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── GET /api/president/export ──────────── */
exports.exportData = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    const { data, error } = await supabase
      .from('declarations')
      .select('ref_citoyen, ref_service, title, category, status, delegation_id, department_id, created_at, assigned_at, resolved_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) { console.error('[President] Export error:', error.message); return res.status(500).json({ error: 'Erreur serveur.' }); }

    if (format === 'csv') {
      const headers = ['ref_citoyen', 'ref_service', 'title', 'category', 'status', 'delegation_id', 'department_id', 'created_at', 'assigned_at', 'resolved_at'];
      const csvRows = [headers.join(',')];
      (data || []).forEach(row => { csvRows.push(headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')); });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=declarations_export.csv');
      return res.status(200).send(csvRows.join('\n'));
    }

    return res.status(200).json({ data });
  } catch (err) { console.error('[President] Export error:', err); return res.status(500).json({ error: 'Erreur serveur.' }); }
};
