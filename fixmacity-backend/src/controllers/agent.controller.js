'use strict';
// src/controllers/agent.controller.js
const supabase = require('../config/db');
const { logStatusChange } = require('../services/statusHistory.service');
const { notifyStatusChange } = require('../services/notification.service');
const { cloudinary } = require('../config/cloudinary');

// ─── helpers ──────────────────────────────────────────────────────────────────
const agentScope = (req) => req.user.department_id;

const VALID_STATUSES = [
  'assignee_agent', 'en_cours', 'resolue', 'refusee_agent', 'cloturee',
];

// ─── GET /api/agent/stats ─────────────────────────────────────────────────────
// Returns KPI counts for the dashboard header cards
exports.getStats = async (req, res) => {
  try {
    const agentId = req.user.id;
    const deptId = agentScope(req);

    // Query 1: declarations assigned directly to this agent
    const { data: mine } = await supabase
      .from('declarations')
      .select('id, status, agent_id')
      .eq('department_id', deptId)
      .eq('agent_id', agentId)
      .is('deleted_at', null)
      .eq('is_deleted', false);

    // Query 2: unassigned declarations pending agent pick-up in this dept
    const { data: unassigned } = await supabase
      .from('declarations')
      .select('id, status, agent_id')
      .eq('department_id', deptId)
      .eq('status', 'assignee_agent')
      .is('agent_id', null)
      .is('deleted_at', null)
      .eq('is_deleted', false);

    // Merge & deduplicate by id
    const seen = new Set();
    const rows = [...(mine || []), ...(unassigned || [])].filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    const pending = rows.filter(r => r.status === 'assignee_agent').length;
    const active = rows.filter(r => r.status === 'en_cours').length;
    const resolved = rows.filter(r => ['resolue', 'cloturee'].includes(r.status)).length;
    const refused = rows.filter(r => r.status === 'refusee_agent').length;
    const total = rows.length;
    const successRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    res.json({ pending, active, resolved, refused, total, successRate });
  } catch (err) {
    console.error('[Agent] getStats:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── GET /api/agent/declarations ─────────────────────────────────────────────
// Full filtering: status, priority, search, sort, multi-dept, multi-agent, page/limit
exports.getDeclarations = async (req, res) => {
  try {
    const {
      status,
      priority,
      search,
      sort = 'desc',
      filter_multi_dept,
      filter_multi_agent,
      page = 1,
      limit = 25,
    } = req.query;

    const agentId = req.user.id;
    const deptId = agentScope(req);
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const SELECT_FIELDS = `id, ref_citoyen, ref_service, title, description, category, status,
         priority, priority_score, is_sensitive, sensitive_type,
         created_at, assigned_at, started_at, resolved_at, votes_count,
         address, latitude, longitude, photo_avant,
         agent_id, department_id,
         delegations:delegation_id (name, code),
         citizen:citizen_id (id, first_name, last_name, email, phone)`;

    // Run two separate queries to avoid broken compound .or() syntax
    // Query A: declarations explicitly assigned to this agent
    let qA = supabase
      .from('declarations')
      .select(SELECT_FIELDS)
      .eq('department_id', deptId)
      .eq('agent_id', agentId)
      .is('deleted_at', null)
      .eq('is_deleted', false);

    // Query B: unassigned declarations in pending state within this dept
    let qB = supabase
      .from('declarations')
      .select(SELECT_FIELDS)
      .eq('department_id', deptId)
      .eq('status', 'assignee_agent')
      .is('agent_id', null)
      .is('deleted_at', null)
      .eq('is_deleted', false);

    // ── Apply status filter ──
    if (status && VALID_STATUSES.includes(status)) {
      qA = qA.eq('status', status);
      // qB only returns assignee_agent; skip it entirely if filtering for another status
      if (status !== 'assignee_agent') qB = null;
    }

    // ── Priority filter ──
    if (priority && ['critique', 'elevee', 'moyenne', 'basse'].includes(priority)) {
      qA = qA.eq('priority', priority);
      if (qB) qB = qB.eq('priority', priority);
    }

    // ── Search filter ──
    if (search && search.trim()) {
      const s = search.trim();
      const orClause = `title.ilike.%${s}%,description.ilike.%${s}%,category.ilike.%${s}%,address.ilike.%${s}%,ref_citoyen.ilike.%${s}%,ref_service.ilike.%${s}%`;
      qA = qA.or(orClause);
      if (qB) qB = qB.or(orClause);
    }

    // ── Execute both queries in parallel ──
    const [resA, resB] = await Promise.all([
      qA,
      qB ? qB : Promise.resolve({ data: [] }),
    ]);

    if (resA.error) throw resA.error;

    // Merge and deduplicate by id
    const seen = new Set();
    let declarations = [...(resA.data || []), ...(resB.data || [])].filter(d => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });

    // ── Sort in JS (priority_score DESC, then created_at) ──
    const asc = sort.toLowerCase() === 'asc';
    declarations.sort((a, b) => {
      const scoreDiff = (b.priority_score || 0) - (a.priority_score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const tA = new Date(a.created_at).getTime();
      const tB = new Date(b.created_at).getTime();
      return asc ? tA - tB : tB - tA;
    });

    const total = declarations.length;

    // ── Paginate in JS ──
    declarations = declarations.slice(offset, offset + parseInt(limit));

    // ── Co-assignments ──
    const refCitoyens = [...new Set(declarations.map(d => d.ref_citoyen).filter(Boolean))];
    let coAssignmentsMap = {};
    if (refCitoyens.length > 0) {
      try {
        const { data: allDecls } = await supabase
          .from('declarations')
          .select('id, ref_citoyen, agent_id, department_id')
          .in('ref_citoyen', refCitoyens)
          .is('deleted_at', null)
          .eq('is_deleted', false);

        if (allDecls) {
          allDecls.forEach(d => {
            if (!coAssignmentsMap[d.ref_citoyen]) coAssignmentsMap[d.ref_citoyen] = [];
            coAssignmentsMap[d.ref_citoyen].push(d);
          });
        }
      } catch (e) {
        console.error('[Agent] co-assignments fetch error:', e.message);
      }
    }

    res.json({
      declarations: declarations.map(d => {
        const others = coAssignmentsMap[d.ref_citoyen] || [];
        const sameDeptOthers = others.filter(o => o.id !== d.id && o.department_id === d.department_id);
        const diffDeptOthers = others.filter(o => o.department_id !== d.department_id);
        
        let assignment_type = 'agent_unique';
        if (diffDeptOthers.length > 0) {
          assignment_type = 'inter_departement';
        } else if (sameDeptOthers.length > 0) {
          assignment_type = 'multi_agents';
        }

        return {
          ...d,
          priority: d.priority || 'moyenne',
          priority_score: d.priority_score ?? 0,
          is_sensitive: d.is_sensitive || false,
          sensitive_type: d.sensitive_type || 'none',
          co_assignments_count: others.filter(o => o.id !== d.id).length,
          assignment_type,
        };
      }),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[Agent] getDeclarations:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── GET /api/agent/declarations/:id ─────────────────────────────────────────
exports.getDeclarationById = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = req.user.id;
    const deptId = agentScope(req);

    // Try to find the declaration assigned to this agent, or unassigned in their dept
    // Run two queries to avoid broken compound .or() syntax
    let data = null;

    // First: try the one explicitly assigned to this agent
    const { data: mine, error: mineErr } = await supabase
      .from('declarations')
      .select(`
        *,
        delegations:delegation_id (name, code),
        department:department_id (name_fr, name_ar, code),
        citizen:citizen_id (id, first_name, last_name, email, phone),
        agent:agent_id (id, first_name, last_name, email)
      `)
      .eq('id', id)
      .eq('department_id', deptId)
      .eq('agent_id', agentId)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .maybeSingle();

    if (mine) {
      data = mine;
    } else {
      // Second: look for an unassigned pending one (agent is viewing before accepting)
      const { data: unassigned } = await supabase
        .from('declarations')
        .select(`
          *,
          delegations:delegation_id (name, code),
          department:department_id (name_fr, name_ar, code),
          citizen:citizen_id (id, first_name, last_name, email, phone),
          agent:agent_id (id, first_name, last_name, email)
        `)
        .eq('id', id)
        .eq('department_id', deptId)
        .eq('status', 'assignee_agent')
        .is('agent_id', null)
        .is('deleted_at', null)
        .eq('is_deleted', false)
        .maybeSingle();
      data = unassigned;
    }

    if (!data) {
      return res.status(404).json({ error: 'Déclaration introuvable ou accès refusé.' });
    }

    // Photos (before + after intervention)
    const { data: photos } = await supabase
      .from('declaration_photos')
      .select('id, url, public_id, uploaded_by, uploaded_at, photo_type')
      .eq('declaration_id', id)
      .order('uploaded_at', { ascending: true });

    // Status history with user info
    const { data: history } = await supabase
      .from('status_history')
      .select(`
        id, old_status, new_status, raison, created_at,
        changed_by_user:changed_by (first_name, last_name, role)
      `)
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    // Internal comments (chef ↔ agent channel)
    const { data: comments } = await supabase
      .from('internal_comments')
      .select(`
        id, content, channel, created_at,
        author:user_id (id, first_name, last_name, role)
      `)
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    // Fetch other declarations with the same ref_citoyen to find other assigned agents or departments
    let other_assignments = [];
    if (data && data.ref_citoyen) {
      const { data: others, error: othersError } = await supabase
        .from('declarations')
        .select(`
          id,
          status,
          department_id,
          agent_id,
          department:department_id (name_fr, name_ar, code),
          agent:agent_id (id, first_name, last_name, email)
        `)
        .eq('ref_citoyen', data.ref_citoyen)
        .neq('id', id)
        .is('deleted_at', null)
        .eq('is_deleted', false);

      if (!othersError && others) {
        other_assignments = others;
      }
    }

    res.json({
      ...data,
      photos: photos || [],
      history: history || [],
      comments: comments || [],
      other_assignments: other_assignments || [],
    });
  } catch (err) {
    console.error('[Agent] getDeclarationById:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── POST /api/agent/declarations/:id/accept ─────────────────────────────────
exports.acceptDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = req.user.id;
    const deptId = agentScope(req);

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, ref_citoyen, status, citizen_id, agent_id')
      .eq('id', id)
      .eq('department_id', deptId)
      .is('deleted_at', null)
      .single();

    if (fetchErr || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }
    if (decl.status !== 'assignee_agent') {
      return res.status(400).json({
        error: `Statut "${decl.status}" ne permet pas l'acceptation. Seul "assignee_agent" est accepté.`,
      });
    }

    const { error: updateErr } = await supabase
      .from('declarations')
      .update({
        status: 'en_cours',
        agent_id: agentId,
        started_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    await logStatusChange(id, 'assignee_agent', 'en_cours', agentId, 'Acceptée par l\'agent');
    if (decl.citizen_id) {
      await notifyStatusChange(req.app, decl, decl.citizen_id, 'en_cours');
    }

    res.json({ message: 'Mission acceptée — intervention démarrée.', status: 'en_cours' });
  } catch (err) {
    console.error('[Agent] acceptDeclaration:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── POST /api/agent/declarations/:id/refuse ─────────────────────────────────
exports.refuseDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = req.user.id;
    const deptId = agentScope(req);
    const raison = (req.body.raison || req.body.reason || '').trim();

    if (!raison) {
      return res.status(400).json({ error: 'Le motif de refus est obligatoire.' });
    }

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, ref_citoyen, status, citizen_id')
      .eq('id', id)
      .eq('department_id', deptId)
      .single();

    if (fetchErr || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }
    if (decl.status !== 'assignee_agent') {
      return res.status(400).json({
        error: `Statut "${decl.status}" ne peut pas être refusé. Seul "assignee_agent" est refusable.`,
      });
    }

    const { error: updateErr } = await supabase
      .from('declarations')
      .update({ status: 'refusee_agent', agent_id: null })
      .eq('id', id);

    if (updateErr) throw updateErr;

    await logStatusChange(id, 'assignee_agent', 'refusee_agent', agentId, raison);
    if (decl.citizen_id) {
      await notifyStatusChange(req.app, decl, decl.citizen_id, 'refusee_agent');
    }

    // Also notify chef de service so they can reassign
    const chefEmit = req.app.get('emitToUser');
    if (chefEmit && req.user.department_id) {
      // Emit to department channel — chef will be listening
      chefEmit(`dept_${req.user.department_id}`, {
        type: 'DECLARATION_REFUSED_BY_AGENT',
        title: 'Mission refusée par un agent',
        body: `${decl.ref_citoyen} — Motif : ${raison}`,
        declarationId: id,
      });
    }

    res.json({ message: 'Mission refusée — retour au Chef de Service.', status: 'refusee_agent' });
  } catch (err) {
    console.error('[Agent] refuseDeclaration:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── POST /api/agent/declarations/:id/photo ──────────────────────────────────
exports.uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = req.user.id;

    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni.' });

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, status, agent_id, department_id')
      .eq('id', id)
      .eq('department_id', agentScope(req))
      .single();

    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.status !== 'en_cours') {
      return res.status(403).json({ error: 'Photos autorisées uniquement lors d\'une intervention en cours.' });
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
      const filename = `intervention_${agentId}_${Date.now()}${ext}`;
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
        uploaded_by: agentId,
        photo_type: 'intervention',
      });

    if (insertErr) throw insertErr;

    res.status(201).json({ url: photoUrl, message: 'Photo téléversée avec succès.' });
  } catch (err) {
    console.error('[Agent] uploadPhoto:', err.message);
    res.status(500).json({ error: 'Erreur lors du téléversement.' });
  }
};

// ─── POST /api/agent/declarations/:id/resolve ────────────────────────────────
exports.resolveDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = req.user.id;
    const { rapport_interne, date_fin } = req.body;

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, ref_citoyen, status, citizen_id, started_at, agent_id')
      .eq('id', id)
      .eq('department_id', agentScope(req))
      .eq('agent_id', agentId)
      .single();

    if (fetchErr || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable ou non assignée à vous.' });
    }
    if (decl.status !== 'en_cours') {
      return res.status(400).json({ error: 'Seules les missions en cours peuvent être résolues.' });
    }

    // Date validation
    if (decl.started_at && date_fin) {
      if (new Date(date_fin) < new Date(decl.started_at)) {
        return res.status(400).json({ error: 'La date de fin ne peut pas être antérieure à la date de début.' });
      }
    }

    // Proof photo required
    const { data: photos } = await supabase
      .from('declaration_photos')
      .select('id')
      .eq('declaration_id', id)
      .eq('photo_type', 'intervention')
      .limit(1);

    if (!photos || photos.length === 0) {
      return res.status(400).json({ error: 'Une photo de preuve d\'intervention est obligatoire avant de résoudre.' });
    }

    const { error: updateErr } = await supabase
      .from('declarations')
      .update({
        status: 'resolue',
        resolved_at: new Date().toISOString(),
        internal_intervention_report: rapport_interne?.trim() || null,
        intervention_ended_at: date_fin || new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    await logStatusChange(id, 'en_cours', 'resolue', agentId, rapport_interne || 'Résolution confirmée par l\'agent');
    if (decl.citizen_id) {
      await notifyStatusChange(req.app, decl, decl.citizen_id, 'resolue');
    }

    res.json({ message: 'Mission résolue avec succès. En attente de clôture par le Chef de Service.', status: 'resolue' });
  } catch (err) {
    console.error('[Agent] resolveDeclaration:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── GET /api/agent/declarations/:id/comments ────────────────────────────────
exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('internal_comments')
      .select(`
        id, content, channel, created_at,
        author:user_id (id, first_name, last_name, role)
      `)
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ comments: data || [] });
  } catch (err) {
    console.error('[Agent] getComments:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── POST /api/agent/declarations/:id/comments ───────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, channel = 'chef_agent' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Le contenu du commentaire est requis.' });
    }

    const { data, error } = await supabase
      .from('internal_comments')
      .insert({
        declaration_id: id,
        user_id: req.user.id,
        content: content.trim(),
        channel,
      })
      .select(`id, content, channel, created_at, author:user_id (id, first_name, last_name, role)`)
      .single();

    if (error) throw error;

    // Notify chef if the agent sends a comment
    const chefEmit = req.app.get('emitToUser');
    if (chefEmit) {
      chefEmit(`dept_${req.user.department_id}`, {
        type: 'NEW_AGENT_COMMENT',
        title: 'Nouveau commentaire d\'un agent',
        body: content.trim().substring(0, 80),
        declarationId: id,
      });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('[Agent] addComment:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── POST /api/agent/declarations/:id/close ──────────────────────────────────
exports.closeDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = req.user.id;

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, ref_citoyen, status, citizen_id, agent_id')
      .eq('id', id)
      .eq('department_id', agentScope(req))
      .eq('agent_id', agentId)
      .single();

    if (fetchErr || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable ou non assignée à vous.' });
    }

    const { error: updateErr } = await supabase
      .from('declarations')
      .update({
        status: 'cloturee',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    await logStatusChange(id, decl.status, 'cloturee', agentId, 'Clôturée par l\'agent via le Board');
    if (decl.citizen_id) {
      await notifyStatusChange(req.app, decl, decl.citizen_id, 'cloturee');
    }

    res.json({ message: 'Mission clôturée avec succès.', status: 'cloturee' });
  } catch (err) {
    console.error('[Agent] closeDeclaration:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};