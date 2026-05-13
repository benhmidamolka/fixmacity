const supabase = require('../config/db');
const { validationResult } = require('express-validator');
const { logStatusChange } = require('../services/statusHistory.service');
const { notifyStatusChange } = require('../services/notification.service');

/* ──────────── GET /api/agent/declarations ──────────── */
exports.listDeclarations = async (req, res) => {
  try {
    const deptId = req.user.department_id;
    if (!deptId) return res.status(400).json({ error: 'Aucun département associé.' });

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let q = supabase.from('declarations')
      .select('*', { count: 'exact' })
      .eq('department_id', deptId)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) q = q.eq('status', status);

    const { data, error, count } = await q;
    if (error) return res.status(500).json({ error: 'Erreur serveur.' });
    return res.status(200).json({ declarations: data, total: count, page: +page, limit: +limit });
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── GET /api/agent/declarations/:id ──────────── */
exports.getDeclarationDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const deptId = req.user.department_id;

    if (!deptId) return res.status(400).json({ error: 'Aucun département associé.' });

    // 1. Fetch declaration (must be in agent's department)
    const { data: decl, error } = await supabase
      .from('declarations')
      .select(`
        *,
        citizen:users!citizen_id(id, first_name, last_name, email, phone)
      `)
      .eq('id', id)
      .eq('department_id', deptId)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .single();

    if (error || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable ou hors département.' });
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

    return res.status(200).json({
      declaration: decl,
      photos: photos || [],
      history: history || []
    });
  } catch (e) {
    console.error('[Agent] getDeclarationDetail error:', e);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/agent/declarations/:id/accept ──────────── */
exports.acceptDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const { date_debut } = req.body;

    const { data: decl } = await supabase.from('declarations')
      .select('id, status, department_id')
      .eq('id', id).is('deleted_at', null).eq('is_deleted', false).single();

    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id)
      return res.status(403).json({ error: 'Hors département.' });
    if (decl.status !== 'assignee_agent')
      return res.status(400).json({ error: 'Statut invalide pour acceptation agent.' });

    const { data: updated, error } = await supabase.from('declarations')
      .update({
        status:            'en_cours',
        agent_id:          req.user.id,
        started_at:        date_debut ? new Date(date_debut).toISOString() : new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      })
      .eq('id', id).select('*').single();

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    await logStatusChange(id, 'assignee_agent', 'en_cours', req.user.id);
    await notifyStatusChange(req.app, updated, updated.citizen_id, 'en_cours');
    return res.status(200).json({ declaration: updated });
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── POST /api/agent/declarations/:id/refuse ──────────── */
exports.refuseDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim())
      return res.status(400).json({ error: 'Le motif de refus est obligatoire.' });

    const { data: decl } = await supabase.from('declarations')
      .select('id, status, department_id')
      .eq('id', id).is('deleted_at', null).eq('is_deleted', false).single();

    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id)
      return res.status(403).json({ error: 'Hors département.' });
    if (decl.status !== 'assignee_agent')
      return res.status(400).json({ error: 'Statut invalide pour refus agent.' });

    const { data: updated, error } = await supabase.from('declarations')
      .update({ status: 'refusee_agent', updated_at: new Date().toISOString() })
      .eq('id', id).select('*').single();

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    await logStatusChange(id, 'assignee_agent', 'refusee_agent', req.user.id, reason.trim());
    await notifyStatusChange(req.app, updated, updated.citizen_id, 'refusee_agent');
    return res.status(200).json({ declaration: updated });
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── POST /api/agent/declarations/:id/photo ──────────── */
exports.uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const path   = require('path');
    const fs     = require('fs');

    const { data: decl } = await supabase.from('declarations')
      .select('id, department_id, status')
      .eq('id', id).is('deleted_at', null).eq('is_deleted', false).single();

    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id)
      return res.status(403).json({ error: 'Hors département.' });

    if (!req.file)
      return res.status(400).json({ error: 'Aucun fichier envoyé.' });

    // ── Write memory buffer to disk ──────────────────────────
    const UPLOAD_DIR   = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const ext       = path.extname(req.file.originalname) || '.jpg';
    const filename  = `photo_${id}_${Date.now()}${ext}`;
    const destPath  = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(destPath, req.file.buffer);

    const baseUrl    = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const publicUrl  = `${baseUrl}/uploads/${filename}`;

    const { error } = await supabase.from('declaration_photos').insert({
      declaration_id: id,
      url:            publicUrl,
      public_id:      filename,
      uploaded_by:    req.user.id
    });

    if (error) {
      // Clean up orphaned file if DB insert fails
      try { fs.unlinkSync(destPath); } catch (_) {}
      console.error('[Agent] Photo DB insert error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    return res.status(201).json({
      message: 'Photo téléversée.',
      photo:   { url: publicUrl, public_id: filename },
    });
  } catch (e) {
    console.error('[Agent] uploadPhoto error:', e);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/agent/declarations/:id/resolve ──────────── */
exports.resolveDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const { date_fin, rapport_interne } = req.body;

    const { data: decl } = await supabase.from('declarations')
      .select('id, status, department_id')
      .eq('id', id).is('deleted_at', null).eq('is_deleted', false).single();

    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id)
      return res.status(403).json({ error: 'Hors département.' });
    if (decl.status !== 'en_cours')
      return res.status(400).json({ error: 'Statut invalide pour résolution.' });

    // BUSINESS RULE: at least 1 proof photo required
    const { count: photoCount } = await supabase.from('declaration_photos')
      .select('id', { count: 'exact', head: true })
      .eq('declaration_id', id);

    if (!photoCount || photoCount === 0)
      return res.status(403).json({ error: 'Impossible de résoudre : aucune photo preuve n\'a été téléversée.' });

    const { data: updated, error } = await supabase.from('declarations')
      .update({ 
        status: 'resolue', 
        resolved_at: date_fin ? new Date(date_fin).toISOString() : new Date().toISOString(), 
        rapport_interne: rapport_interne || null,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id).select('*').single();

    if (error) {
      // If rapport_interne column doesn't exist, try updating without it
      if (error.code === '42703') {
        const { data: u2, error: e2 } = await supabase.from('declarations')
          .update({ 
            status: 'resolue', 
            resolved_at: date_fin ? new Date(date_fin).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString() 
          })
          .eq('id', id).select('*').single();
        if (e2) return res.status(500).json({ error: 'Erreur serveur.' });
        return res.status(200).json({ declaration: u2 });
      }
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    await logStatusChange(id, 'en_cours', 'resolue', req.user.id);
    await notifyStatusChange(req.app, updated, updated.citizen_id, 'resolue');
    return res.status(200).json({ declaration: updated });
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── GET /api/agent/declarations/:id/comments ──────────── */
exports.listComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { channel } = req.query;

    const { data: decl } = await supabase.from('declarations')
      .select('department_id').eq('id', id).is('deleted_at', null).eq('is_deleted', false).single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id)
      return res.status(403).json({ error: 'Hors département.' });

    // Agent can see chef_agent (messages from chef) and agent_citizen (messages to citizen)
    let query = supabase.from('internal_comments')
      .select('*')
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    if (channel) {
      query = query.eq('channel', channel);
    } else {
      query = query.in('channel', ['chef_agent', 'agent_citizen']);
    }

    let { data, error } = await query;
    if (error) {
      // Fallback if channel column doesn't exist
      const { data: d2 } = await supabase.from('internal_comments')
        .select('*').eq('declaration_id', id).order('created_at', { ascending: true });
      data = (d2 || []).map(c => ({ ...c, channel: 'chef_agent' }));
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
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};

/* ──────────── POST /api/agent/declarations/:id/comments ──────────── */
exports.addComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { content, channel = 'agent_citizen' } = req.body;

    // Agent can write to chef_agent (reply to chef) or agent_citizen (message to citizen/owner)
    const allowedChannels = ['chef_agent', 'agent_citizen'];
    if (!allowedChannels.includes(channel)) {
      return res.status(403).json({ error: 'Canal non autorisé.' });
    }

    const { data: decl } = await supabase.from('declarations')
      .select('department_id').eq('id', id).is('deleted_at', null).eq('is_deleted', false).single();
    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.department_id !== req.user.department_id)
      return res.status(403).json({ error: 'Hors département.' });

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
  } catch (e) { return res.status(500).json({ error: 'Erreur serveur.' }); }
};