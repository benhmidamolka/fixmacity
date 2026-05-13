const supabase = require('../config/db');
const { validationResult } = require('express-validator');
const { logStatusChange } = require('../services/statusHistory.service');
const { notifyStatusChange } = require('../services/notification.service');

/* ──────────── GET /api/chef/declarations ──────────── */
exports.listDeclarations = async (req, res) => {
  try {
    const deptId = req.user.department_id;
    if (!deptId) return res.status(400).json({ error: 'Aucun département associé à votre compte.' });

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let q = supabase
      .from('declarations')
      .select('*', { count: 'exact' })
      .eq('department_id', deptId)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) q = q.eq('status', status);

    let { data, error, count } = await q;

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(d => d.user_id || d.citizen_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase.from('users')
          .select('id, first_name, last_name')
          .in('id', userIds);
        
        const userMap = {};
        if (usersData) {
          usersData.forEach(u => userMap[u.id] = { first_name: u.first_name, last_name: u.last_name });
        }
        
        data = data.map(d => ({
          ...d,
          users: userMap[d.user_id || d.citizen_id] || null
        }));
      }
    }
    if (error) {
      console.error('[Chef] ListDecl error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    return res.status(200).json({ declarations: data, total: count, page: +page, limit: +limit });
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── GET /api/chef/declarations/:id ──────────── */
exports.getDeclarationDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const deptId = req.user.department_id;

    if (!deptId) return res.status(400).json({ error: 'Aucun département associé.' });

    // 1. Fetch declaration (must be in chef's department)
    const { data: decl, error } = await supabase
      .from('declarations')
      .select('*')
      .eq('id', id)
      .eq('department_id', deptId)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .single();

    if (error || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable ou hors département.' });
    }

    const userIds = [decl.citizen_id, decl.agent_id].filter(Boolean);
    const userMap = {};
    if (userIds.length > 0) {
      const { data: usersData } = await supabase.from('users').select('id, first_name, last_name, email, phone').in('id', userIds);
      if (usersData) usersData.forEach(u => userMap[u.id] = u);
    }

    const fullDecl = {
      ...decl,
      citizen: userMap[decl.citizen_id] || null,
      assigned_agent: userMap[decl.agent_id] || null
    };

    // 2. Fetch photos
    const { data: photos } = await supabase
      .from('declaration_photos')
      .select('*')
      .eq('declaration_id', id);

    // 3. Fetch history
    const { data: historyData } = await supabase
      .from('status_history')
      .select('*')
      .eq('declaration_id', id)
      .order('created_at', { ascending: false });

    let history = [];
    if (historyData) {
      const uIds = [...new Set(historyData.map(h => h.user_id).filter(Boolean))];
      const uMap = {};
      if (uIds.length > 0) {
        const { data: uD } = await supabase.from('users').select('id, first_name, last_name, role').in('id', uIds);
        if (uD) uD.forEach(u => uMap[u.id] = u);
      }
      history = historyData.map(h => ({ ...h, user: uMap[h.user_id] || null }));
    }

    // 4. Fetch comments
    const { data: commentsData } = await supabase
      .from('internal_comments')
      .select('*')
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    let comments = [];
    if (commentsData) {
      const uIds = [...new Set(commentsData.map(c => c.user_id).filter(Boolean))];
      const uMap = {};
      if (uIds.length > 0) {
        const { data: uD } = await supabase.from('users').select('id, first_name, last_name, role').in('id', uIds);
        if (uD) uD.forEach(u => uMap[u.id] = u);
      }
      comments = commentsData.map(c => ({ ...c, user: uMap[c.user_id] || null }));
    }

    console.log('[Chef] getDeclarationDetail result:', { 
      id: fullDecl.id, 
      status: fullDecl.status, 
      hasAgent: !!fullDecl.assigned_agent,
      agentName: fullDecl.assigned_agent ? `${fullDecl.assigned_agent.first_name} ${fullDecl.assigned_agent.last_name}` : 'NONE'
    });

    return res.status(200).json({
      declaration: fullDecl, // Wrapping in 'declaration' for consistency with other endpoints
      ...fullDecl, // Keeping root fields for backward compatibility
      photos: photos || [],
      history: history || [],
      comments: comments || []
    });
  } catch (e) {
    console.error('[Chef] getDeclarationDetail error:', e);
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

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, status, department_id')
      .eq('id', id)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .single();

    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });

    // Department isolation
    if (decl.department_id !== req.user.department_id) {
      return res.status(403).json({ error: 'Cette déclaration n\'appartient pas à votre département.' });
    }

    if (decl.status !== 'assignee_chef') {
      return res.status(400).json({ error: 'Cette déclaration n\'est pas au statut assignee_chef.' });
    }

    // Verify agent belongs to same department
    if (agent_id) {
      const { data: agent } = await supabase
        .from('users')
        .select('id, department_id, role, is_active')
        .eq('id', agent_id)
        .single();

      if (!agent || agent.role !== 'agent' || !agent.is_active) {
        return res.status(400).json({ error: 'Agent invalide ou inactif.' });
      }
      if (agent.department_id !== req.user.department_id) {
        return res.status(403).json({ error: 'Cet agent n\'appartient pas à votre département.' });
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from('declarations')
      .update({
        status:           'assignee_agent',
        agent_id:          agent_id || null,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      console.error('[Chef] Accept error:', updateErr.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    await logStatusChange(id, 'assignee_chef', 'assignee_agent', req.user.id);
    await notifyStatusChange(req.app, updated, updated.citizen_id, 'assignee_agent');
    
    // Notify the assigned agent
    const { notifyAgentAssigned } = require('../services/notification.service');
    if (agent_id) {
      await notifyAgentAssigned(req.app, updated, agent_id);
    }
    
    return res.status(200).json({ declaration: updated });
  } catch (err) {
    console.error('[Chef] Accept error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/chef/declarations/:id/refuse ──────────── */
exports.refuseDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Le motif de refus est obligatoire.' });
    }

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, status, department_id')
      .eq('id', id)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .single();

    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });

    if (decl.department_id !== req.user.department_id) {
      return res.status(403).json({ error: 'Cette déclaration n\'appartient pas à votre département.' });
    }

    if (decl.status !== 'assignee_chef') {
      return res.status(400).json({ error: 'Cette déclaration n\'est pas au statut assignee_chef.' });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('declarations')
      .update({ status: 'refusee_chef', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      console.error('[Chef] Refuse error:', updateErr.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    await logStatusChange(id, 'assignee_chef', 'refusee_chef', req.user.id, reason.trim());
    await notifyStatusChange(req.app, updated, updated.citizen_id, 'refusee_chef');
    return res.status(200).json({ declaration: updated });
  } catch (err) {
    console.error('[Chef] Refuse error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/chef/agents ──────────── */
exports.listAgents = async (req, res) => {
  try {
    const departmentId = req.user.department_id;

    const { data: agents, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, is_active, created_at')
      .eq('role', 'agent')
      .eq('department_id', departmentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Chef] ListAgents error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    // Add workload count for each agent
    const agentsWithWorkload = await Promise.all(
      (agents || []).map(async (agent) => {
        const { count } = await supabase
          .from('declarations')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agent.id)
          .in('status', ['assignee_agent', 'en_cours'])
          .is('deleted_at', null)
          .eq('is_deleted', false);

        return { ...agent, workload: count || 0 };
      })
    );

    return res.status(200).json({ agents: agentsWithWorkload });
  } catch (err) {
    console.error('[Chef] ListAgents error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/chef/agents ──────────── */
exports.addAgent = async (req, res) => {
  try {
    const { email, first_name, last_name, password } = req.body;
    const departmentId = req.user.department_id;

    if (!email || !first_name || !last_name || !password) {
      return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    // Check if email already exists
    const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: agent, error } = await supabase.from('users').insert({
      email: email.toLowerCase().trim(),
      password_hash: hashedPassword,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      role: 'agent',
      department_id: departmentId,
      is_active: true
    }).select('id, email, first_name, last_name, is_active').single();

    if (error) {
      console.error('[Chef] AddAgent error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la création de l\'agent.' });
    }

    return res.status(201).json({ agent });
  } catch (err) {
    console.error('[Chef] AddAgent error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PUT /api/chef/agents/:id ──────────── */
exports.updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email } = req.body;
    const departmentId = req.user.department_id;

    const { data: existingAgent } = await supabase.from('users').select('id, department_id').eq('id', id).single();
    if (!existingAgent || existingAgent.department_id !== departmentId) {
      return res.status(403).json({ error: 'Accès refusé ou agent introuvable.' });
    }

    const updates = {};
    if (first_name) updates.first_name = first_name.trim();
    if (last_name) updates.last_name = last_name.trim();
    if (email) updates.email = email.toLowerCase().trim();
    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase.from('users')
      .update(updates)
      .eq('id', id)
      .select('id, email, first_name, last_name, is_active')
      .single();

    if (error) return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });

    return res.status(200).json({ agent: updated });
  } catch (err) {
    console.error('[Chef] UpdateAgent error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PATCH /api/chef/agents/:id/toggle-status ──────────── */
exports.toggleAgentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const departmentId = req.user.department_id;

    const { data: agent, error: fetchErr } = await supabase
      .from('users')
      .select('id, is_active, department_id')
      .eq('id', id)
      .single();

    if (fetchErr || !agent) return res.status(404).json({ error: 'Agent introuvable.' });
    if (agent.department_id !== departmentId) return res.status(403).json({ error: 'Accès refusé.' });

    const { data: updated, error: updateErr } = await supabase
      .from('users')
      .update({ is_active: !agent.is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, is_active')
      .single();

    if (updateErr) return res.status(500).json({ error: 'Erreur serveur.' });

    return res.status(200).json({ agent: updated });
  } catch (err) {
    console.error('[Chef] ToggleAgentStatus error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/chef/dashboard ──────────── */
exports.dashboard = async (req, res) => {
  try {
    const deptId = req.user?.department_id;
    if (!deptId) {
      return res.status(400).json({ error: 'Département non trouvé pour cet utilisateur.' });
    }

    // Total
    const { count: total } = await supabase
      .from('declarations')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', deptId)
      .is('deleted_at', null);

    // By Status
    const statuses = ['soumis', 'assignee_chef', 'assignee_agent', 'en_cours', 'resolue', 'refusee_chef'];
    const counts = { total: total || 0 };
    
    for (const s of statuses) {
      const { count } = await supabase
        .from('declarations')
        .select('id', { count: 'exact', head: true })
        .eq('department_id', deptId)
        .eq('status', s)
        .is('deleted_at', null);
      counts[s] = count || 0;
    }

    // Agents Count
    const { count: activeAgents } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'agent')
      .eq('department_id', deptId)
      .eq('is_active', true);

    // Pending Urgent (for dashboard table)
    const { data: pendingUrgent, error: puErr } = await supabase
      .from('declarations')
      .select('id, ref_service, ref_citoyen, title, priority_score, created_at, category')
      .eq('department_id', deptId)
      .eq('status', 'assignee_chef')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (puErr) console.error('[Chef Dashboard] pendingUrgent error:', puErr.message);

    return res.status(200).json({
      counts: {
        total: total || 0,
        en_attente: counts['assignee_chef'] || 0,
        en_cours: counts['en_cours'] || 0,
        resolue: counts['resolue'] || 0,
        refusees: counts['refusee_chef'] || 0,
        assignee_agent: counts['assignee_agent'] || 0,
      },
      active_agents: activeAgents || 0,
      pending_urgent: pendingUrgent || []
    });
  } catch (err) {
    console.error('[Chef] Dashboard error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/chef/export ──────────── */
exports.exportData = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('declarations')
      .select('ref_citoyen, ref_service, title, category, status, created_at, assigned_at, resolved_at')
      .eq('department_id', req.user.department_id)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Chef] Export error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    const hdrs = ['ref_citoyen', 'ref_service', 'title', 'category', 'status', 'created_at', 'assigned_at', 'resolved_at'];
    const rows = [hdrs.join(',')];
    (data || []).forEach(r => rows.push(hdrs.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=department_export.csv');
    return res.status(200).send(rows.join('\n'));
  } catch (err) {
    console.error('[Chef] Export error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/chef/declarations/:id/comments ──────────── */
exports.listComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { channel } = req.query;
    const deptId = req.user.department_id;

    const { data: decl } = await supabase
      .from('declarations')
      .select('department_id')
      .eq('id', id).is('deleted_at', null).eq('is_deleted', false).single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== deptId) return res.status(403).json({ error: 'Hors département.' });

    // Chef can see president_chef and chef_agent channels
    let query = supabase
      .from('internal_comments')
      .select('*')
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    if (channel) {
      query = query.eq('channel', channel);
    } else {
      query = query.in('channel', ['president_chef', 'chef_agent']);
    }

    let { data, error } = await query;
    if (error) {
      // Fallback if channel column doesn't exist
      const { data: d2 } = await supabase.from('internal_comments')
        .select('*').eq('declaration_id', id).order('created_at', { ascending: true });
      data = (d2 || []).map(c => ({ ...c, channel: 'president_chef' }));
    }

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(d => d.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase.from('users')
          .select('id, first_name, last_name, role').in('id', userIds);
        const userMap = {};
        if (usersData) usersData.forEach(u => userMap[u.id] = u);
        data = data.map(d => ({ ...d, user: userMap[d.user_id] || null }));
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

    if (!content || !content.trim()) return res.status(400).json({ error: 'Contenu requis.' });

    // Chef can write to president_chef (reply to president) or chef_agent (message to agent)
    const allowedChannels = ['president_chef', 'chef_agent'];
    if (!allowedChannels.includes(channel)) {
      return res.status(403).json({ error: 'Canal non autorisé.' });
    }

    const { data: decl } = await supabase.from('declarations')
      .select('department_id').eq('id', id).is('deleted_at', null).eq('is_deleted', false).single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== deptId) return res.status(403).json({ error: 'Hors département.' });

    const { data: comment, error } = await supabase.from('internal_comments')
      .insert({ declaration_id: id, user_id: req.user.id, content: content.trim(), channel })
      .select('*').single();

    if (error) {
      if (error.code === '42703') {
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
