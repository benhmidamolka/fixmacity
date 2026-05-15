const bcrypt   = require('bcrypt');
const supabase = require('../config/db');
const { validationResult } = require('express-validator');
const { generateRefService } = require('../services/refGenerator.service');
const { logStatusChange } = require('../services/statusHistory.service');
const { notifyStatusChange, notifyChefAssigned } = require('../services/notification.service');

const SALT_ROUNDS = 12;

/* ──────────── GET /api/president/declarations ──────────── */
exports.listDeclarations = async (req, res) => {
  try {
    const { status, delegation_id, department_id, service_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('declarations')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status)        query = query.eq('status', status);
    if (delegation_id) query = query.eq('delegation_id', delegation_id);
    if (department_id) query = query.eq('department_id', department_id);
    if (service_id)    query = query.eq('service_id', service_id);

    let { data, error, count } = await query;

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(d => d.user_id || d.citizen_id).filter(Boolean))];
      const agentIds = [...new Set(data.map(d => d.agent_id).filter(Boolean))];
      const allUserIds = [...new Set([...userIds, ...agentIds])];

      const delegIds = [...new Set(data.map(d => d.delegation_id).filter(Boolean))];

      let userMap = {};
      if (allUserIds.length > 0) {
        const { data: usersData } = await supabase.from('users')
          .select('id, first_name, last_name, email')
          .in('id', allUserIds);
        if (usersData) usersData.forEach(u => userMap[u.id] = u);
      }

      let delegMap = {};
      if (delegIds.length > 0) {
        const { data: delegData } = await supabase.from('delegations').select('id, name').in('id', delegIds);
        if (delegData) delegData.forEach(d => delegMap[d.id] = d.name);
      }
      
      data = data.map(d => {
        const agent = d.agent_id ? userMap[d.agent_id] : null;
        return {
          ...d,
          users: userMap[d.user_id || d.citizen_id] || null,
          agent_name: agent ? `${agent.first_name} ${agent.last_name}` : null,
          delegation_name: d.delegation_id ? (delegMap[d.delegation_id] || 'Sousse Nord') : 'Sousse Nord',
          arrondissement_name: d.delegation_id ? (delegMap[d.delegation_id] || 'Sousse Nord') : 'Sousse Nord',
          delegations: d.delegation_id ? { name: delegMap[d.delegation_id] } : null
        };
      });
    }

    if (error) {
      console.error('[President] ListDecl error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    return res.status(200).json({ declarations: data, total: count, page: +page, limit: +limit });
  } catch (e) {
    console.error('[President] listDeclarations error:', e);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/president/declarations/:id ──────────── */
exports.getDeclarationDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch declaration with joins
    const { data: decl, error } = await supabase
      .from('declarations')
      .select(`
        *,
        citizen:users!citizen_id(id, first_name, last_name, email, phone),
        department:services!department_id(id, name_fr, code),
        agent:users!agent_id(id, first_name, last_name)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      
      .single();

    if (error || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }

    // 1b. Normalize department name field
    if (decl.department) {
      decl.department.name = decl.department.name_fr || decl.department.name;
    }

    // 1c. Fetch the chef de service via users.department_id
    let chef = null;
    if (decl.department_id) {
      const { data: chefData } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('role', 'chef')
        .eq('department_id', decl.department_id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      chef = chefData || null;
    }

    // 2. Fetch photos
    const { data: photos } = await supabase
      .from('declaration_photos')
      .select('*')
      .eq('declaration_id', id);

    // 3. Fetch history
    const { data: history } = await supabase
      .from('status_history')
      .select(`
        *,
        user:users(id, first_name, last_name, role)
      `)
      .eq('declaration_id', id)
      .order('created_at', { ascending: false });

    // 4. Fetch comments
    const { data: comments } = await supabase
      .from('internal_comments')
      .select(`
        *,
        user:users(id, first_name, last_name, role)
      `)
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    return res.status(200).json({
      declaration: { ...decl, chef },
      photos: photos || [],
      history: history || [],
      comments: comments || []
    });
  } catch (e) {
    console.error('[President] getDeclarationDetail error:', e);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/declarations/:id/assign ──────────── */
exports.assignDeclaration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id }            = req.params;
    const { department_id, priority, planned_start, planned_end } = req.body; 
    
    let priority_score = 4;
    if (priority === 'High') priority_score = 8;
    if (priority === 'Low') priority_score = 1;

    // Fetch declaration
    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, status')
      .eq('id', id)
      .is('deleted_at', null)
      
      .single();

    if (fetchErr || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }

    if (decl.status !== 'soumise') {
      return res.status(400).json({ error: 'Seules les déclarations au statut soumise peuvent être affectées.' });
    }

    // Look up service code for ref_service generation
    const { data: service } = await supabase
      .from('services')
      .select('id, code')
      .eq('id', department_id)
      .single();

    if (!service || !service.code) {
      return res.status(400).json({ error: 'Département/service invalide.' });
    }

    const refService = await generateRefService(service.code);

    const { data: updated, error: updateErr } = await supabase
      .from('declarations')
      .update({
        status:        'assignee_chef',
        department_id,
        service_id:    department_id,
        ref_service:   refService,
        priority_score: priority_score,
        planned_start: planned_start || null,
        planned_end:   planned_end || null,
        assigned_at:   new Date().toISOString(),
        updated_at:    new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      console.error('[President] Assign error:', updateErr.message);
      return res.status(500).json({ error: 'Erreur lors de l\'affectation.' });
    }

    await logStatusChange(id, 'soumise', 'assignee_chef', req.user.id);
    await notifyStatusChange(req.app, updated, updated.citizen_id, 'assignee_chef');

    const { data: chef } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'chef')
      .eq('department_id', department_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (chef) {
      await notifyChefAssigned(req.app, updated, chef.id);
    }

    return res.status(200).json({ declaration: updated });
  } catch (err) {
    console.error('[President] Assign error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/declarations/:id/reassign ──────────── */
exports.reassignDeclaration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id }            = req.params;
    const { department_id, priority, planned_start, planned_end } = req.body;

    let priority_score = 4;
    if (priority === 'High') priority_score = 8;
    if (priority === 'Low') priority_score = 1;

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, status')
      .eq('id', id)
      .is('deleted_at', null)
      
      .single();

    if (fetchErr || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }

    if (!['refusee_chef', 'refusee_agent', 'assignee_chef', 'assignee_agent', 'en_cours'].includes(decl.status)) {
      return res.status(400).json({ error: 'Seules les déclarations non résolues ou refusées peuvent être réaffectées.' });
    }

    const { data: service } = await supabase
      .from('services')
      .select('id, code')
      .eq('id', department_id)
      .single();

    if (!service || !service.code) {
      return res.status(400).json({ error: 'Département/service invalide.' });
    }

    const refService = await generateRefService(service.code);
    const oldStatus  = decl.status;

    const { data: updated, error: updateErr } = await supabase
      .from('declarations')
      .update({
        status:        'assignee_chef',
        department_id,
        service_id:    department_id,
        agent_id:      null,
        ref_service:   refService,
        priority_score: priority_score,
        planned_start: planned_start || null,
        planned_end:   planned_end || null,
        assigned_at:   new Date().toISOString(),
        updated_at:    new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      console.error('[President] Reassign error:', updateErr.message);
      return res.status(500).json({ error: 'Erreur lors de la réaffectation.' });
    }

    await logStatusChange(id, oldStatus, 'assignee_chef', req.user.id, 'Réaffectation par le président');
    await notifyStatusChange(req.app, updated, updated.citizen_id, 'assignee_chef');

    const { data: chef } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'chef')
      .eq('department_id', department_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (chef) {
      await notifyChefAssigned(req.app, updated, chef.id);
    }

    return res.status(200).json({ declaration: updated });
  } catch (err) {
    console.error('[President] Reassign error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/president/users ──────────── */
exports.listUsers = async (req, res) => {
  try {
    const { role, department_id, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, role, delegation_id, department_id, is_active, created_at, phone', { count: 'exact' })
      .order('role', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (role)          query = query.eq('role', role);
    if (department_id) query = query.eq('department_id', department_id);

    const { data, error, count } = await query;

    if (error) {
      console.error('[President] ListUsers error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    // 1. Fetch counts from declarations for agents and departments
    const agentCountsRes = await supabase.pool.query(`
      SELECT agent_id, COUNT(*) as count 
      FROM declarations 
      WHERE agent_id IS NOT NULL AND deleted_at IS NULL
      GROUP BY agent_id
    `);
    const agentCounts = {};
    agentCountsRes.rows.forEach(r => agentCounts[r.agent_id] = parseInt(r.count, 10));

    const deptCountsRes = await supabase.pool.query(`
      SELECT department_id, COUNT(*) as count 
      FROM declarations 
      WHERE department_id IS NOT NULL AND deleted_at IS NULL
      GROUP BY department_id
    `);
    const deptCounts = {};
    deptCountsRes.rows.forEach(r => deptCounts[r.department_id] = parseInt(r.count, 10));

    // Enrich with department name and code
    let enrichedData = data || [];
    if (enrichedData.length > 0) {
      const deptIds = [...new Set(enrichedData.map(u => u.department_id).filter(Boolean))];
      const delegIds = [...new Set(enrichedData.map(u => u.delegation_id).filter(Boolean))];
      
      let serviceMap = {};
      if (deptIds.length > 0) {
        const { data: services } = await supabase
          .from('services')
          .select('id, name_fr, code')
          .in('id', deptIds);
        if (services) services.forEach(s => serviceMap[s.id] = s);
      }

      let delegMap = {};
      if (delegIds.length > 0) {
        const { data: delegs } = await supabase
          .from('delegations')
          .select('id, name')
          .in('id', delegIds);
        if (delegs) delegs.forEach(d => delegMap[d.id] = d.name);
      }

      enrichedData = enrichedData.map(u => ({
        ...u,
        department_name: u.department_id ? (serviceMap[u.department_id]?.name_fr || 'Service') : 'N/A',
        department_code: u.department_id ? (serviceMap[u.department_id]?.code || '??') : '??',
        location: u.delegation_id ? (delegMap[u.delegation_id] || 'Sousse') : 'Sousse',
        total_tasks: u.role === 'agent' ? (agentCounts[u.id] || 0) : (deptCounts[u.department_id] || 0)
      }));
    }

    return res.status(200).json({ users: enrichedData, total: count, page: +page, limit: +limit });
  } catch (err) {
    console.error('[President] ListUsers error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/users ──────────── */
exports.createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name, role, department_id, delegation_id } = req.body;

    // DB enum uses 'agent' and 'chef' (not 'chef_service')
    if (!['agent', 'chef'].includes(role)) {
      return res.status(400).json({ error: 'Le président ne peut créer que des comptes agent ou chef.' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email:         email.toLowerCase().trim(),
        password_hash: hashedPassword,
        first_name:    first_name.trim(),
        last_name:     last_name.trim(),
        role,
        department_id: department_id || null,
        delegation_id: delegation_id || null,
        is_active:     true,
      })
      .select('id, email, first_name, last_name, role, department_id, delegation_id, is_active')
      .single();

    if (error) {
      console.error('[President] CreateUser error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la création du compte.' });
    }

    return res.status(201).json({ user });
  } catch (err) {
    console.error('[President] CreateUser error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PATCH /api/president/users/:id ──────────── */
exports.updateUser = async (req, res) => {
  try {
    const { id }    = req.params;
    const updates   = {};
    const { role, department_id, is_active, delegation_id } = req.body;

    if (role !== undefined)          updates.role          = role;
    if (department_id !== undefined) updates.department_id = department_id;
    if (delegation_id !== undefined) updates.delegation_id = delegation_id;
    if (is_active !== undefined)     updates.is_active     = is_active;

    if (is_active === false) {
      // Check for missions in progress
      const { count: activeMissions } = await supabase
        .from('declarations')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', id)
        .in('status', ['assignee_agent', 'en_cours'])
        .is('deleted_at', null)
        ;

      if ((activeMissions || 0) > 0) {
        return res.status(400).json({ error: 'Impossible de désactiver un agent ayant des missions en cours' });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' });
    }

    updates.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, email, first_name, last_name, role, department_id, delegation_id, is_active')
      .single();

    if (error) {
      console.error('[President] UpdateUser error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error('[President] UpdateUser error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── DELETE /api/president/users/:id ──────────── */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Exception 3: Impossible de désactiver ou supprimer un agent ayant des missions en cours
    const { count: activeMissions } = await supabase
      .from('declarations')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', id)
      .in('status', ['assignee_agent', 'en_cours'])
      .is('deleted_at', null)
      ;

    if ((activeMissions || 0) > 0) {
      return res.status(400).json({ error: 'Impossible de désactiver un agent ayant des missions en cours' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, email, is_active')
      .single();

    if (error) {
      console.error('[President] DeleteUser error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    return res.status(200).json({ message: 'Utilisateur désactivé.', user });
  } catch (err) {
    console.error('[President] DeleteUser error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/president/departments ──────────── */
exports.listDepartments = async (req, res) => {
  try {
    // Fetch all services/departments
    const { data: services, error } = await supabase
      .from('services')
      .select('id, name_fr, name_ar, name_en, code, is_active, created_at, updated_at')
      .order('name_fr', { ascending: true });

    if (error) {
      console.error('[President] ListDept error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    // Fetch chefs linked to each department via users.department_id
    const deptIds = (services || []).map(s => s.id);
    let chefMap = {};
    if (deptIds.length > 0) {
      const { data: chefs } = await supabase
        .from('users')
        .select('id, first_name, last_name, department_id')
        .eq('role', 'chef')
        .eq('is_active', true)
        .in('department_id', deptIds);
      if (chefs) {
        chefs.forEach(c => {
          if (!chefMap[c.department_id]) chefMap[c.department_id] = c;
        });
      }
    }

    // Fetch declaration counts per department
    const { data: countsRes } = await supabase.rpc('count_declarations_per_department');
    // If RPC doesn't exist, we fallback to a manual count or skip. 
    // Let's do a manual join/count if RPC fails or just use a query.
    const countsMap = {};
    const { data: declCounts } = await supabase
      .from('declarations')
      .select('department_id, count:id.count()')
      .is('deleted_at', null)
      .not('department_id', 'is', null);
      
    if (declCounts) {
      declCounts.forEach(d => {
        countsMap[d.department_id] = d.count;
      });
    }

    const departments = (services || []).map(dept => {
      const chef = chefMap[dept.id] || null;
      const total = countsMap[dept.id] || 0;
      
      // Determine a mock status based on activity for the UI
      let status = 'Stable';
      if (total > 15) status = 'Surcharge';
      if (total < 5) status = 'Optimal';

      return {
        ...dept,
        name: dept.name_fr,
        chef_name: chef ? `${chef.first_name} ${chef.last_name}` : null,
        chef_id: chef?.id || null,
        total: total,
        status: status
      };
    });

    return res.status(200).json({ departments, success: true });
  } catch (err) {
    console.error('[President] ListDept error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/propositions ──────────── */
exports.createProposition = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, start_date, end_date, category } = req.body;

    const { data: prop, error } = await supabase
      .from('propositions')
      .insert({
        title:       title.trim(),
        description: description.trim(),
        category:    category || 'Général',
        start_date:  start_date || null,
        end_date:    end_date || null,
        created_by:  req.user.id,
        status:      'active',
      })
      .select('*')
      .single();

    if (error) {
      console.error('[President] CreateProp error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    return res.status(201).json({ proposition: prop });
  } catch (err) {
    console.error('[President] CreateProp error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/president/propositions ──────────── */
exports.listPropositions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('propositions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;

    if (error) {
      console.error('[President] ListProp error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    // Join with users to check role
    const userIds = [...new Set(data.map(p => p.created_by))];
    const { data: userData } = await supabase.from('users').select('id, role, first_name, last_name').in('id', userIds);
    const userMap = {};
    if (userData) userData.forEach(u => userMap[u.id] = u);

    const structured = data.map(p => ({
      ...p,
      is_presidential: userMap[p.created_by]?.role === 'president',
      citizen: userMap[p.created_by] ? `${userMap[p.created_by].first_name} ${userMap[p.created_by].last_name}` : 'Anonyme',
      category: p.category || 'Général',
      pour: p.votes_pour || 0,
      contre: p.votes_contre || 0,
      total: (p.votes_pour || 0) + (p.votes_contre || 0)
    }));

    return res.status(200).json({ 
      success: true,
      propositions: structured, 
      presidential: structured.filter(p => p.is_presidential),
      citizen:      structured.filter(p => !p.is_presidential),
      total: count 
    });
  } catch (err) {
    console.error('[President] ListProp error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/president/dashboard ──────────── */
exports.dashboard = async (req, res) => {
  try {
    const { period, status, department_id, delegation_id } = req.query;

    let baseQuery = supabase
      .from('declarations')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      ;

    let sqlFilter = ` AND d.deleted_at IS NULL`;

    if (period && period !== 'all') {
      const days = parseInt(period, 10);
      if (!isNaN(days)) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        baseQuery = baseQuery.gte('created_at', dateLimit.toISOString());
        sqlFilter += ` AND d.created_at >= NOW() - INTERVAL '${days} days'`;
      }
    }
    if (status && status !== 'all') {
      baseQuery = baseQuery.eq('status', status);
      const validStatuses = ['soumise', 'assignee_chef', 'assignee_agent', 'en_cours', 'resolue', 'cloturee', 'refusee_chef', 'refusee_agent'];
      if (validStatuses.includes(status)) {
        sqlFilter += ` AND d.status = '${status}'`;
      }
    }
    if (department_id && department_id !== 'all') {
      baseQuery = baseQuery.eq('department_id', department_id);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(department_id)) {
        sqlFilter += ` AND d.department_id = '${department_id}'`;
      }
    }
    if (delegation_id && delegation_id !== 'all') {
      baseQuery = baseQuery.eq('delegation_id', delegation_id);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(delegation_id)) {
        sqlFilter += ` AND d.delegation_id = '${delegation_id}'`;
      }
    }

    // -- Total Declarations --
    const { count: totalDecl } = await baseQuery;

    // -- Status Counts --
    const statusCountsRes = await supabase.pool.query(`
      SELECT d.status, COUNT(*) as count
      FROM declarations d
      WHERE 1=1 ${sqlFilter}
      GROUP BY d.status
    `);
    const byStatus = {
      soumise: 0, assignee_chef: 0, assignee_agent: 0,
      en_cours: 0, resolue: 0, cloturee: 0,
      refusee_chef: 0, refusee_agent: 0
    };
    statusCountsRes.rows.forEach(r => {
      if (byStatus.hasOwnProperty(r.status)) {
        byStatus[r.status] = parseInt(r.count, 10);
      }
    });

    // -- Arrondissement (Delegation) Counts --
    const delegCountsRes = await supabase.pool.query(`
      SELECT dg.id, dg.name, COUNT(d.id) as count
      FROM delegations dg
      LEFT JOIN declarations d ON d.delegation_id = dg.id ${sqlFilter}
      GROUP BY dg.id, dg.name
    `);
    const byArrondissement = {};
    delegCountsRes.rows.forEach(r => {
      byArrondissement[r.id] = { name: r.name, count: parseInt(r.count, 10) };
    });

    // -- Total Users --
    const { count: totalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    // -- Average Rating --
    const { data: avgData } = await supabase
      .from('ratings')
      .select('score');

    const avgRating = avgData && avgData.length > 0
      ? (avgData.reduce((sum, r) => sum + (r.score || 0), 0) / avgData.length).toFixed(2)
      : null;

    // ── Trend Data (Last 6 Months) ──
    const trendRes = await supabase.pool.query(`
      WITH months AS (
        SELECT to_char(date_trunc('month', (current_date - interval '5 months') + (n || ' months')::interval), 'MON') as name,
               date_trunc('month', (current_date - interval '5 months') + (n || ' months')::interval) as m_start
        FROM generate_series(0, 5) n
      )
      SELECT 
        m.name,
        COUNT(d.id) FILTER (WHERE d.created_at >= m.m_start AND d.created_at < m.m_start + interval '1 month') as reports,
        COUNT(d.id) FILTER (WHERE d.status IN ('resolue', 'cloturee') AND d.resolved_at >= m.m_start AND d.resolved_at < m.m_start + interval '1 month') as resolved
      FROM months m
      LEFT JOIN declarations d ON 1=1 ${sqlFilter}
      GROUP BY m.name, m.m_start
      ORDER BY m.m_start ASC;
    `);
    const trendData = trendRes.rows.map(r => ({
      name: r.name,
      reports: parseInt(r.reports, 10),
      resolved: parseInt(r.resolved, 10)
    }));

    // ── Department Performance ──
    const deptRes = await supabase.pool.query(`
      SELECT 
        s.name_fr as name,
        s.id,
        s.code,
        COUNT(d.id) as total,
        COUNT(d.id) FILTER (WHERE d.status IN ('resolue', 'cloturee')) as resolved
      FROM services s
      LEFT JOIN declarations d ON d.department_id = s.id ${sqlFilter}
      GROUP BY s.id, s.name_fr, s.code
      ORDER BY total DESC
    `);
    
    const byDepartment = deptRes.rows.map(r => ({
      name: r.name,
      code: r.code,
      total: parseInt(r.total, 10),
      resolved: parseInt(r.resolved, 10),
      perf: r.total > 0 ? Math.round((parseInt(r.resolved, 10) / parseInt(r.total, 10)) * 100) : 0
    }));

    // ── Recent Declarations ──
    let recentQuery = supabase
      .from('declarations')
      .select('id, ref_citoyen, status, description, created_at, citizen_id')
      .is('deleted_at', null)
      
      .order('created_at', { ascending: false })
      .limit(5);

    let crucialQuery = supabase
      .from('declarations')
      .select('id, ref_citoyen, title, status, description, created_at, citizen_id')
      .is('deleted_at', null)
      
      .in('status', ['soumise', 'assignee_chef', 'assignee_agent', 'en_cours'])
      .order('created_at', { ascending: true })
      .limit(5);

    if (period && period !== 'all') {
      const days = parseInt(period, 10);
      if (!isNaN(days)) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        recentQuery = recentQuery.gte('created_at', dateLimit.toISOString());
        crucialQuery = crucialQuery.gte('created_at', dateLimit.toISOString());
      }
    }
    if (status && status !== 'all') {
      recentQuery = recentQuery.eq('status', status);
      // If filtering by a resolved status, crucial cases might naturally be empty.
      crucialQuery = crucialQuery.eq('status', status);
    }
    if (department_id && department_id !== 'all') {
      recentQuery = recentQuery.eq('department_id', department_id);
      crucialQuery = crucialQuery.eq('department_id', department_id);
    }
    if (delegation_id && delegation_id !== 'all') {
      recentQuery = recentQuery.eq('delegation_id', delegation_id);
      crucialQuery = crucialQuery.eq('delegation_id', delegation_id);
    }

    const { data: recentDecl } = await recentQuery;
    
    // Enrich recent with citizen names
    const citizenIds = [...new Set((recentDecl || []).map(d => d.citizen_id).filter(Boolean))];
    let citizenMap = {};
    if (citizenIds.length > 0) {
      const { data: citizens } = await supabase
        .from('users').select('id, first_name, last_name').in('id', citizenIds);
      (citizens || []).forEach(c => { citizenMap[c.id] = `${c.first_name} ${c.last_name}`; });
    }

    const { data: crucialCases } = await crucialQuery;
    // ── Top Voted Propositions ──
    const { data: moneyVotes } = await supabase
      .from('propositions')
      .select('*')
      .order('votes_pour', { ascending: false })
      .limit(5);

    return res.status(200).json({
      success: true,
      // Aliases matching the frontend field names
      total:             totalDecl || 0,
      total_declarations: totalDecl || 0,
      byStatus:          byStatus,
      by_status:         byStatus,
      byArrondissement:  byArrondissement,
      by_arrondissement: byArrondissement,
      byDepartment:      byDepartment,
      by_department:     byDepartment,
      totalUsers:        totalUsers || 0,
      total_users:       totalUsers || 0,
      avgRating:         avgRating ? parseFloat(avgRating) : 0,
      average_rating:    avgRating,
      trendData,
      recentDeclarations: (recentDecl || []).map(d => ({
        ...d,
        citizen_name: citizenMap[d.citizen_id] || 'Anonyme'
      })),
      crucialCases: (crucialCases || []).map(d => ({
        ...d,
        citizen_name: citizenMap[d.citizen_id] || 'Anonyme'
      })),
      moneyVotes: moneyVotes || []
    });
  } catch (err) {
    console.error('[President] Dashboard error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
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

    if (error) {
      console.error('[President] Export error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    if (format === 'csv') {
      const headers = ['ref_citoyen', 'ref_service', 'title', 'category', 'status', 'delegation_id', 'department_id', 'created_at', 'assigned_at', 'resolved_at'];
      const csvRows = [headers.join(',')];

      (data || []).forEach(row => {
        csvRows.push(headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','));
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=declarations_export.csv');
      return res.status(200).send(csvRows.join('\n'));
    }

    return res.status(200).json({ data });
  } catch (err) {
    console.error('[President] Export error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PATCH /api/president/departments/:id/status ──────────── */
exports.updateDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabase
      .from('services')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    console.error('[President] Update department status error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/propositions/:id/confirmer ──────────── */
exports.confirmProposition = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('propositions')
      .update({ status: 'confirmed' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[President] ConfirmProp error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/propositions/:id/retenu ──────────── */
exports.retainProposition = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('propositions')
      .update({ status: 'retained' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[President] RetainProp error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/president/declarations/:id/comments ──────────── */
exports.listComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { channel } = req.query; // 'president_chef' | 'chef_agent' | 'agent_citizen'

    // Verify declaration exists
    const { data: decl } = await supabase
      .from('declarations')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      
      .single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });

    let query = supabase
      .from('internal_comments')
      .select('*')
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    if (channel) query = query.eq('channel', channel);

    let { data, error } = await query;
    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    // Enrich with user info
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(d => d.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users').select('id, first_name, last_name, role').in('id', userIds);
        const userMap = {};
        if (usersData) usersData.forEach(u => userMap[u.id] = u);
        data = data.map(d => ({ ...d, user: userMap[d.user_id] || null }));
      }
    }

    return res.status(200).json({ comments: data || [] });
  } catch (err) {
    console.error('[President] listComments error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/president/declarations/:id/comments ──────────── */
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, channel = 'president_chef' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Contenu requis.' });
    }

    // Only president can write to president_chef channel
    const allowedChannels = ['president_chef'];
    if (!allowedChannels.includes(channel)) {
      return res.status(403).json({ error: 'Canal non autorisé pour ce rôle.' });
    }

    const { data: decl } = await supabase
      .from('declarations')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      
      .single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });

    const { data: comment, error } = await supabase
      .from('internal_comments')
      .insert({
        declaration_id: id,
        user_id:        req.user.id,
        content:        content.trim(),
        channel:        channel
      })
      .select('*')
      .single();

    if (error) {
      // If 'channel' column doesn't exist yet, insert without it
      if (error.code === '42703') {
        const { data: c2, error: e2 } = await supabase
          .from('internal_comments')
          .insert({ declaration_id: id, user_id: req.user.id, content: content.trim() })
          .select('*').single();
        if (e2) return res.status(500).json({ error: 'Erreur serveur.' });
        return res.status(201).json({ comment: { ...c2, channel: 'president_chef' } });
      }
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    return res.status(201).json({ comment });
  } catch (err) {
    console.error('[President] addComment error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PATCH /api/president/propositions/:id/respond ──────────── */
exports.respondToProposition = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, president_response } = req.body;

    const { data, error } = await supabase
      .from('propositions')
      .update({ 
        status, 
        president_response,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[President] RespondToProp error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la réponse.' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[President] RespondToProp error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/president/propositions/:id/summary ──────────── */
exports.getPropositionSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.rpc('get_proposition_summary', { p_proposition_id: id });

    if (error) {
      console.error('[President] GetPropSummary error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la récupération du résumé.' });
    }

    return res.status(200).json({ success: true, summary: data[0] || null });
  } catch (err) {
    console.error('[President] GetPropSummary error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};